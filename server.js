const express = require("express");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const mm = require("music-metadata");
const { randomUUID } = require("crypto");

const app = express();

// Config via env
const PORT = process.env.PORT || 3000;
const MUSIC_ROOT = process.env.MUSIC_ROOT || "/music";
const FFMPEG_PATH = process.env.FFMPEG_PATH || "/usr/bin/ffmpeg";
const PLAYLISTS_FILE =
  process.env.PLAYLISTS_FILE || path.join("/data", "playlists.json");

ffmpeg.setFfmpegPath(FFMPEG_PATH);

const AUDIO_EXT = [".mp3", ".flac", ".wav", ".ogg", ".m4a"];

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- Helpers: paths ----------

function safeTrackPath(relFile) {
  if (!relFile || relFile.includes("..")) return null;
  const abs = path.join(MUSIC_ROOT, relFile);
  if (!abs.startsWith(MUSIC_ROOT)) return null;
  return abs;
}

// ---------- Metadata helpers ----------

async function readCommonTags(absPath) {
  try {
    const metadata = await mm.parseFile(absPath, { duration: false });
    return metadata.common || {};
  } catch (err) {
    console.error("Metadata error:", absPath, err.message);
    return {};
  }
}

// ---------- Scan library ----------

async function walkMusicDir(dir, basePath = "") {
  let tracks = [];

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.error("Error reading music dir:", dir, err.message);
    return tracks;
  }

  for (const entry of entries) {
    const relPath = path.join(basePath, entry.name);
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const childTracks = await walkMusicDir(fullPath, relPath);
      tracks = tracks.concat(childTracks);
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!AUDIO_EXT.includes(ext)) continue;

    const relNorm = relPath.replace(/\\/g, "/");
    const parts = relNorm.split("/");

    let albumPath = parts.length >= 2 ? parts[parts.length - 2] : "Unknown";
    let artistPath =
      parts.length >= 3 ? parts[parts.length - 3] : albumPath || "Unknown";

    let addedAt = 0;
    try {
      const stat = fs.statSync(fullPath);
      addedAt = stat.mtimeMs || stat.ctimeMs || 0;
    } catch {
      addedAt = 0;
    }

    const baseTrack = {
      id: null,
      title: path.basename(entry.name, ext),
      artist: artistPath,
      album: albumPath,
      file: relNorm,
      addedAt,
      genres: [],
      genre: null
    };

    const common = await readCommonTags(fullPath);

    if (common.title) baseTrack.title = common.title;
    const tagArtist = common.albumartist || common.artist;
    if (tagArtist) baseTrack.artist = tagArtist;
    if (common.album) baseTrack.album = common.album;

    let genres = [];
    if (Array.isArray(common.genre) && common.genre.length > 0) {
      genres = common.genre;
    } else if (typeof common.genre === "string") {
      genres = [common.genre];
    }

    baseTrack.genres = genres;
    baseTrack.genre = genres.length > 0 ? genres[0] : null;

    tracks.push(baseTrack);
  }

  return tracks;
}

async function listTracks() {
  const tracks = await walkMusicDir(MUSIC_ROOT);
  return tracks.map((t, index) => ({
    ...t,
    id: index
  }));
}

// ---------- Cover art (folder file or embedded) ----------

function findCoverPath(trackFile) {
  const absTrack = safeTrackPath(trackFile);
  if (!absTrack) return null;
  const dir = path.dirname(absTrack);

  const candidates = [
    "cover.jpg",
    "folder.jpg",
    "Cover.jpg",
    "Folder.jpg",
    "album.jpg",
    "Album.jpg",
    "cover.png",
    "folder.png",
    "Cover.png",
    "Folder.png",
    "Album.png"
  ];

  for (const name of candidates) {
    const full = path.join(dir, name);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

app.get("/api/cover", async (req, res) => {
  const file = req.query.file;
  if (!file || file.includes("..")) return res.status(400).end();

  const coverPath = findCoverPath(file);
  if (coverPath) {
    return res.sendFile(coverPath);
  }

  const absTrack = safeTrackPath(file);
  if (!absTrack || !fs.existsSync(absTrack)) {
    return res.status(404).end();
  }

  try {
    const metadata = await mm.parseFile(absTrack, { duration: false });
    const pictures = metadata.common && metadata.common.picture;
    if (pictures && pictures.length > 0) {
      const pic = pictures[0];
      const mime = pic.format || "image/jpeg";
      res.setHeader("Content-Type", mime);
      return res.send(pic.data);
    }
  } catch (err) {
    console.error("Error reading embedded artwork:", err.message);
  }

  return res.status(404).end();
});

// ---------- PLAYLIST STORAGE ----------

let playlistsCache = null;

function ensurePlaylistsDir() {
  const dir = path.dirname(PLAYLISTS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadPlaylistsFromDisk() {
  try {
    ensurePlaylistsDir();
    if (!fs.existsSync(PLAYLISTS_FILE)) {
      playlistsCache = [];
      return playlistsCache;
    }
    const raw = fs.readFileSync(PLAYLISTS_FILE, "utf8");
    const data = JSON.parse(raw);
    playlistsCache = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to load playlists:", err.message);
    playlistsCache = [];
  }
  return playlistsCache;
}

function savePlaylistsToDisk() {
  try {
    ensurePlaylistsDir();
    fs.writeFileSync(
      PLAYLISTS_FILE,
      JSON.stringify(playlistsCache || [], null, 2)
    );
  } catch (err) {
    console.error("Failed to save playlists:", err.message);
  }
}

function getPlaylists() {
  if (!playlistsCache) return loadPlaylistsFromDisk();
  return playlistsCache;
}

// Special built-in playlist for likes
function ensureLikedPlaylist() {
  const playlists = getPlaylists();
  let liked = playlists.find((p) => p.id === "liked");
  if (!liked) {
    liked = {
      id: "liked",
      name: "Liked Songs",
      trackIds: [],
      createdAt: Date.now(),
      system: true
    };
    playlists.push(liked);
    savePlaylistsToDisk();
  }
  return liked;
}

// ---------- PLAYLIST API ----------

// Get all playlists (including Liked Songs)
app.get("/api/playlists", (req, res) => {
  const playlists = getPlaylists();
  ensureLikedPlaylist();
  res.json({ playlists });
});

// Create playlist
app.post("/api/playlists", (req, res) => {
  const name = req.body && req.body.name ? String(req.body.name).trim() : "";
  if (!name) return res.status(400).json({ error: "Name required" });

  const playlists = getPlaylists();
  const playlist = {
    id: randomUUID(),
    name,
    trackIds: [],
    createdAt: Date.now()
  };
  playlists.push(playlist);
  savePlaylistsToDisk();
  res.status(201).json(playlist);
});

// Add track to playlist (no-op if already there)
app.post("/api/playlists/:id/tracks", (req, res) => {
  const playlists = getPlaylists();
  const playlist = playlists.find((p) => p.id === req.params.id);
  if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  // Accept numeric or numeric-string trackId values
  let trackId = null;
  if (req.body && req.body.trackId !== undefined && req.body.trackId !== null) {
    const maybe = Number(req.body.trackId);
    if (!Number.isNaN(maybe)) trackId = maybe;
  }
  if (trackId === null)
    return res.status(400).json({ error: "trackId (number) required" });

  if (!playlist.trackIds.includes(trackId)) {
    playlist.trackIds.push(trackId);
    savePlaylistsToDisk();
  }

  res.json(playlist);
});

// Toggle track in playlist (used for Liked Songs)
app.post("/api/playlists/:id/tracks/toggle", (req, res) => {
  const playlists = getPlaylists();
  const playlist = playlists.find((p) => p.id === req.params.id);
  if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  // Accept numeric or numeric-string trackId values
  let trackId = null;
  if (req.body && req.body.trackId !== undefined && req.body.trackId !== null) {
    const maybe = Number(req.body.trackId);
    if (!Number.isNaN(maybe)) trackId = maybe;
  }
  if (trackId === null)
    return res.status(400).json({ error: "trackId (number) required" });

  const ids = playlist.trackIds || [];
  const idx = ids.indexOf(trackId);
  if (idx === -1) {
    ids.push(trackId); // like
    console.log(`Playlist toggle: added track ${trackId} to playlist ${playlist.id}`);
  } else {
    ids.splice(idx, 1); // unlike
    console.log(`Playlist toggle: removed track ${trackId} from playlist ${playlist.id}`);
  }
  playlist.trackIds = ids;
  savePlaylistsToDisk();
  // return the updated playlist
  res.json(playlist);
});

// Delete playlist
app.delete("/api/playlists/:id", (req, res) => {
  const playlists = getPlaylists();
  const idx = playlists.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Playlist not found" });
  // Don't allow Liked Songs to be deleted
  if (playlists[idx].id === "liked") {
    return res.status(400).json({ error: "Cannot delete liked playlist" });
  }
  playlists.splice(idx, 1);
  savePlaylistsToDisk();
  res.status(204).end();
});

// Update playlist (rename)
app.put("/api/playlists/:id", (req, res) => {
  const name = req.body && typeof req.body.name === "string" ? String(req.body.name).trim() : "";
  if (!name) return res.status(400).json({ error: "Name required" });

  const playlists = getPlaylists();
  const playlist = playlists.find((p) => p.id === req.params.id);
  if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  if (playlist.id === "liked") return res.status(400).json({ error: "Cannot rename liked playlist" });

  playlist.name = name;
  savePlaylistsToDisk();
  res.json(playlist);
});

// ---------- Tracks API ----------

app.get("/api/tracks", async (req, res) => {
  try {
    const tracks = await listTracks();
    res.json(tracks);
  } catch (err) {
    console.error("Error listing tracks:", err);
    res.status(500).json({ error: "Failed to list tracks" });
  }
});

// ---------- Stream API ----------

app.get("/api/stream", (req, res) => {
  const file = req.query.file;
  if (!file) return res.status(400).json({ error: "Missing file param" });
  if (file.includes("..")) return res.status(400).json({ error: "Invalid path" });

  const absPath = safeTrackPath(file);
  if (!absPath || !fs.existsSync(absPath)) {
    console.error("File not found or invalid:", absPath);
    return res.status(404).json({ error: "File not found" });
  }

  const ext = path.extname(absPath).toLowerCase();
  console.log("Streaming:", absPath, "ext:", ext);

  // Direct for mp3/m4a/wav
  if (ext === ".mp3" || ext === ".m4a" || ext === ".wav") {
    try {
      const stat = fs.statSync(absPath);
      const range = req.headers.range;

      let contentType = "audio/mpeg";
      if (ext === ".m4a") contentType = "audio/mp4";
      if (ext === ".wav") contentType = "audio/wav";

      if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
        const start = parseInt(startStr, 10);
        const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": contentType
        });

        fs.createReadStream(absPath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": stat.size,
          "Content-Type": contentType
        });
        fs.createReadStream(absPath).pipe(res);
      }
    } catch (err) {
      console.error("Direct stream error:", err.message);
      if (!res.headersSent) res.status(500).end();
    }
    return;
  }

  // Transcode others (flac/ogg/etc) to AAC ADTS
  res.setHeader("Content-Type", "audio/aac");

  const command = ffmpeg(absPath)
    .audioCodec("aac")
    .audioBitrate("192k")
    .format("adts")
    .on("start", (cmd) => console.log("ffmpeg start:", cmd))
    .on("error", (err) => {
      console.error("ffmpeg error:", err.message);
      if (!res.headersSent) res.status(500).end();
    });

  command.pipe(res, { end: true });
});

// ---------- AI DJ placeholder ----------

app.get("/api/dj/intro", (req, res) => {
  res.json({
    message: "Hey, this is Madify AI DJ. Let me spin you some tracks.",
    mood: "chill"
  });
});

// ---------- Start ----------

app.listen(PORT, () => {
  console.log(`Madify listening on port ${PORT}`);
  console.log(`Using music root: ${MUSIC_ROOT}`);
  console.log(`Playlists file: ${PLAYLISTS_FILE}`);
});

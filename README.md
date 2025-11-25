# Madify

Madify is a self-hosted, Spotify-style web music player designed to run on Unraid (or any Docker host).  
It scans your local music library, pulls embedded metadata and album art, and serves a mobile-first web UI that works great in Safari on iOS (including lock screen and CarPlay controls via the Media Session API).

---

## Features

- 🎧 **Self-hosted music streaming**
  - Scans a local directory mounted at `/music`
  - Supports `mp3`, `flac`, `wav`, `ogg`, `m4a`
- 🧠 **Smart playback**
  - Direct streaming for browser-friendly formats
  - On-the-fly transcoding for others using `ffmpeg` (e.g. FLAC → AAC)
- 🖼️ **Album art**
  - Uses `cover.jpg/folder.jpg/album.jpg` if present in the album folder
  - Falls back to embedded artwork from tags (via `music-metadata`)
- 📱 **Mobile-first UI**
  - Dark orange/black theme
  - Optimized for iOS Safari
  - Lock screen / CarPlay show title, artist, album art & media controls
- ❤️ **Liked songs**
  - Built-in **Liked Songs** playlist (stored on disk)
  - Heart button on each track & in the now-playing bar
- 🎛️ **User playlists**
  - Create playlists from the UI
  - Add tracks via the “+” button on any song
  - All playlist data persisted in a volume so it survives rebuilds
- 🤖 **AI DJ placeholder**
  - UI + API stub for a future AI DJ feature

---

## Tech stack

- **Backend:** Node.js, Express  
- **Transcoding:** [`ffmpeg`](https://ffmpeg.org/) via [`fluent-ffmpeg`](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)  
- **Metadata / art:** [`music-metadata`](https://github.com/Borewit/music-metadata)  
- **Frontend:** Vanilla HTML + CSS + JavaScript  
- **Media controls:** Media Session API (for lock screen & CarPlay)  
- **Container:** Docker, published to GitHub Container Registry (GHCR)

---

## API overview

### `GET /api/tracks`

Returns the scanned library as JSON.

Each track:

```jsonc
{
  "id": 0,
  "title": "When I'm Gone",
  "artist": "3 Doors Down",
  "album": "Away From the Sun",
  "file": "3 Doors Down/Away From the Sun/1. When I'm Gone.flac",
  "addedAt": 1700000000000,
  "genres": ["Rock"],
  "genre": "Rock"
}
GET /api/stream?file=<relative-path>
Streams audio for a given file in /music.

For .mp3, .m4a, .wav → streamed directly with range support.

For others (.flac, .ogg, etc.) → transcoded with ffmpeg to AAC (ADTS).

GET /api/cover?file=<relative-path>
Returns album art for a track:

Looks for cover.jpg, folder.jpg, album.jpg, etc. in the same folder.

If none found, attempts to extract embedded artwork from tags.

Playlist APIs
All playlist data is stored in a JSON file in /data (see env below).

GET /api/playlists
Returns all playlists (including the built-in "liked" playlist).

POST /api/playlists

json
Copy code
{
  "name": "My Playlist"
}
POST /api/playlists/:id/tracks

json
Copy code
{
  "trackId": 12
}
POST /api/playlists/:id/tracks/toggle

Used by the “Liked Songs” feature (id = "liked"):

json
Copy code
{
  "trackId": 12
}
DELETE /api/playlists/:id
Deletes a playlist (except the built-in "liked" playlist).

Environment variables
Variable	Default	Description
PORT	3000	HTTP server port inside the container
MUSIC_ROOT	/music	Root directory where your music library is mounted
FFMPEG_PATH	/usr/bin/ffmpeg	Path to ffmpeg binary inside the container
PLAYLISTS_FILE	/data/playlists.json	Path for persisted playlist JSON file

Running locally (without Docker)
Install dependencies:

bash
Copy code
npm install
Make sure ffmpeg is installed on your system and on your PATH.

Set env and run:

bash
Copy code
export MUSIC_ROOT=/path/to/your/music
export PLAYLISTS_FILE=./data/playlists.json   # or wherever you want it

npm start
# or:
node server.js
Then open:

text
Copy code
http://localhost:3000
Running with Docker
Build locally
From the project root (where the Dockerfile lives):

bash
Copy code
docker build -t ghcr.io/grantm28/madify:latest .
Run locally
bash
Copy code
docker run -d \
  --name madify \
  -p 8085:3000 \
  -v /absolute/path/to/music:/music:ro \
  -v /absolute/path/to/madify-playlists:/data \
  ghcr.io/grantm28/madify:latest
Then open:

text
Copy code
http://localhost:8085
Example Unraid configuration
Repository:

text
Copy code
ghcr.io/grantm28/madify:latest
Port mapping:

Container port 3000 → Host port 8085 (or whatever you prefer)

Volume mappings:

text
Copy code
/mnt/user/appdata/MusicBrainzPicard/Music  -> /music (read-only)
/mnt/user/appdata/madify-playlists         -> /data
Environment variables via the template (optional):

TZ=America/Chicago

Once configured, you can update Madify simply by pushing a new image to GHCR and clicking Update on the container in Unraid.

Development workflow
Edit code in VS Code.

Commit to Git:

bash
Copy code
git add .
git commit -m "Describe your change"
git push
Build & push a new container image:

bash
Copy code
docker build -t ghcr.io/grantm28/madify:latest .
docker push ghcr.io/grantm28/madify:latest
On Unraid, update the container to pull the new image.
// ----- DOM refs -----
const homeRecentEl = document.getElementById("homeRecent");
const homePlaylistsEl = document.getElementById("homePlaylists");
const libraryTrackListEl = document.getElementById("libraryTrackList");
const playlistListEl = document.getElementById("playlistList");
const searchInput = document.getElementById("searchInput");

const newPlaylistNameInput = document.getElementById("newPlaylistName");
const btnCreatePlaylist = document.getElementById("btnCreatePlaylist");

const player = document.getElementById("player");
const nowTitleEl = document.getElementById("nowTitle");
const nowArtistEl = document.getElementById("nowArtist");
const djButton = document.getElementById("djButton");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const npCover = document.getElementById("npCover");
const npCoverPlaceholder = document.getElementById("npCoverPlaceholder");

const btnShuffle = document.getElementById("btnShuffle");
const btnPrev = document.getElementById("btnPrev");
const btnPlayPause = document.getElementById("btnPlayPause");
const btnNext = document.getElementById("btnNext");
const seekBar = document.getElementById("seekBar");
const timeCurrentEl = document.getElementById("timeCurrent");
const timeTotalEl = document.getElementById("timeTotal");
const iconPlayPause = document.getElementById("iconPlayPause");

const btnLikeNow = document.getElementById("btnLikeNow");
const iconLikeNow = document.getElementById("iconLikeNow");

const views = {
  home: document.getElementById("view-home"),
  library: document.getElementById("view-library"),
  playlists: document.getElementById("view-playlists"),
  dj: document.getElementById("view-dj")
};

let allTracks = [];
let trackById = new Map();
let playlists = [];
let likedTrackIds = new Set();

let currentTrack = null;
let playQueue = null;
let queueIndex = -1;
let shuffleEnabled = false;

// ---------- Helpers ----------

function formatTime(seconds) {
  if (!isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(seconds / 60);
  return `${m}:${s}`;
}

function setNowPlaying(track, coverUrl) {
  if (!track) {
    nowTitleEl.textContent = "Nothing playing";
    nowArtistEl.textContent = "";
    npCover.style.display = "none";
    npCoverPlaceholder.style.display = "block";
    document.title = "Madify";
    timeCurrentEl.textContent = "0:00";
    timeTotalEl.textContent = "0:00";
    seekBar.value = 0;
    updateMediaSession(null, null);
    syncLikeNowButton();
    return;
  }
  nowTitleEl.textContent = track.title;
  nowArtistEl.textContent = track.artist
    ? `${track.artist}${track.album ? " • " + track.album : ""}`
    : track.album || "";
  document.title = `${track.title} – ${track.artist || "Madify"}`;

  if (coverUrl) {
    npCover.src = coverUrl;
    npCover.style.display = "block";
    npCoverPlaceholder.style.display = "none";
  } else {
    npCover.style.display = "none";
    npCoverPlaceholder.style.display = "block";
  }

  updateMediaSession(track, coverUrl);
  syncLikeNowButton();
}

function getCoverUrl(track) {
  return `/api/cover?file=${encodeURIComponent(track.file)}`;
}

// Media Session / lock-screen metadata
function updateMediaSession(track, coverUrl) {
  if (!("mediaSession" in navigator)) return;

  if (!track) {
    navigator.mediaSession.metadata = null;
    return;
  }

  const artwork = coverUrl
    ? [
        {
          src: coverUrl,
          sizes: "512x512",
          type: "image/jpeg"
        }
      ]
    : [];

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist || "",
    album: track.album || "",
    artwork
  });

  navigator.mediaSession.setActionHandler("play", () => player.play());
  navigator.mediaSession.setActionHandler("pause", () => player.pause());
  navigator.mediaSession.setActionHandler("previoustrack", () =>
    playPreviousInQueue()
  );
  navigator.mediaSession.setActionHandler("nexttrack", () =>
    playNextInQueueOrShuffle()
  );
}

// ---------- Like helpers ----------

function syncLikeNowButton() {
  if (!btnLikeNow || !iconLikeNow) return;
  if (!currentTrack) {
    btnLikeNow.disabled = true;
    btnLikeNow.classList.remove("liked");
    iconLikeNow.classList.remove("fa-solid");
    iconLikeNow.classList.add("fa-regular");
    return;
  }
  btnLikeNow.disabled = false;
  const liked = likedTrackIds.has(currentTrack.id);
  btnLikeNow.classList.toggle("liked", liked);
  iconLikeNow.classList.toggle("fa-solid", liked);
  iconLikeNow.classList.toggle("fa-regular", !liked);
}

// ---------- Playback ----------

function playTrackCore(track) {
  currentTrack = track;
  const url = `/api/stream?file=${encodeURIComponent(track.file)}`;
  const cover = getCoverUrl(track);

  player.src = url;
  player.play().catch((err) => console.error("Play error:", err));
  setNowPlaying(track, cover);
}

function playTrackStandalone(track) {
  playQueue = null;
  queueIndex = -1;
  playTrackCore(track);
}

function startPlaylist(tracks) {
  if (!tracks || tracks.length === 0) return;
  playQueue = tracks.slice();
  queueIndex = 0;
  playTrackCore(playQueue[queueIndex]);
}

function playNextInQueue() {
  if (!playQueue) return;
  const nextIndex = queueIndex + 1;
  if (nextIndex < playQueue.length) {
    queueIndex = nextIndex;
    playTrackCore(playQueue[queueIndex]);
  }
}

function playPreviousInQueue() {
  if (!playQueue) return;
  const prevIndex = queueIndex - 1;
  if (prevIndex >= 0) {
    queueIndex = prevIndex;
    playTrackCore(playQueue[queueIndex]);
  }
}

function playRandomTrackFromAll() {
  if (!allTracks.length) return;
  const idx = Math.floor(Math.random() * allTracks.length);
  playTrackStandalone(allTracks[idx]);
}

function playNextInQueueOrShuffle() {
  if (playQueue) {
    if (queueIndex + 1 < playQueue.length) {
      playNextInQueue();
    } else if (shuffleEnabled) {
      playRandomTrackFromAll();
    }
  } else if (shuffleEnabled) {
    playRandomTrackFromAll();
  }
}

player.addEventListener("ended", () => {
  if (shuffleEnabled && !playQueue) {
    playRandomTrackFromAll();
  } else {
    playNextInQueue();
  }
});

// Keep play/pause icon in sync
player.addEventListener("play", () => {
  if (!iconPlayPause) return;
  iconPlayPause.classList.remove("fa-play");
  iconPlayPause.classList.add("fa-pause");
});

player.addEventListener("pause", () => {
  if (!iconPlayPause) return;
  iconPlayPause.classList.remove("fa-pause");
  iconPlayPause.classList.add("fa-play");
});

// Time + seek
player.addEventListener("loadedmetadata", () => {
  timeTotalEl.textContent = formatTime(player.duration || 0);
});

player.addEventListener("timeupdate", () => {
  if (player.duration) {
    const pct = (player.currentTime / player.duration) * 100;
    seekBar.value = pct;
    timeCurrentEl.textContent = formatTime(player.currentTime);
    timeTotalEl.textContent = formatTime(player.duration);
  }
});

seekBar.addEventListener("input", () => {
  if (!player.duration) return;
  const pct = parseFloat(seekBar.value) / 100;
  player.currentTime = pct * player.duration;
});

// ---------- Rendering tracks ----------

function renderTrackList(container, tracks) {
  container.innerHTML = "";

  tracks.forEach((track) => {
    const row = document.createElement("div");
    row.className = "track-row";

    const cover = document.createElement("img");
    cover.className = "track-cover";
    cover.src = getCoverUrl(track);
    cover.onerror = () => {
      cover.style.display = "none";
    };

    const meta = document.createElement("div");
    meta.className = "track-meta";

    const title = document.createElement("div");
    title.className = "track-title";
    title.textContent = track.title;

    const artist = document.createElement("div");
    artist.className = "track-artist";
    artist.textContent = track.artist
      ? `${track.artist}${track.album ? " • " + track.album : ""}`
      : track.album || "";

    meta.appendChild(title);
    meta.appendChild(artist);

    const actions = document.createElement("div");
    actions.className = "track-actions";

    // Play button
    const playBtn = document.createElement("button");
    playBtn.className = "play-pill";
    playBtn.textContent = "Play";
    playBtn.onclick = (e) => {
      e.stopPropagation();
      playTrackStandalone(track);
    };

    // Like button
    const likeBtn = document.createElement("button");
    likeBtn.className = "add-pill like-pill";
    const likeIcon = document.createElement("i");
    const liked = likedTrackIds.has(track.id);
    likeIcon.className = liked ? "fa-solid fa-heart" : "fa-regular fa-heart";
    likeBtn.classList.toggle("liked", liked);
    likeBtn.appendChild(likeIcon);
    likeBtn.onclick = (e) => {
      e.stopPropagation();
      toggleLike(track);
    };

    // Add-to-playlist button
    const addBtn = document.createElement("button");
    addBtn.className = "add-pill";
    addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
    addBtn.onclick = (e) => {
      e.stopPropagation();
      openAddToPlaylist(track);
    };

    actions.appendChild(playBtn);
    actions.appendChild(likeBtn);
    actions.appendChild(addBtn);

    row.appendChild(cover);
    row.appendChild(meta);
    row.appendChild(actions);

    row.onclick = () => {
      playTrackStandalone(track);
    };

    container.appendChild(row);
  });
}

// ---------- Playlists ----------

function resolvePlaylistTracks(pl) {
  return (pl.trackIds || [])
    .map((id) => trackById.get(id))
    .filter(Boolean);
}

function renderPlaylistCards(container) {
  container.innerHTML = "";

  if (!playlists.length) {
    container.innerHTML =
      '<div class="muted">No playlists yet. Create one and add songs with the + button.</div>';
    return;
  }

  const sorted = playlists
    .slice()
    .sort((a, b) => {
      if (a.id === "liked" && b.id !== "liked") return -1;
      if (b.id === "liked" && a.id !== "liked") return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  sorted.forEach((pl) => {
    const tracks = resolvePlaylistTracks(pl);

    const card = document.createElement("div");
    card.className = "playlist-card";

    const title = document.createElement("div");
    title.className = "playlist-title";
    title.textContent = pl.name;

    const subtitle = document.createElement("div");
    subtitle.className = "playlist-subtitle";
    subtitle.textContent = `${tracks.length} track${
      tracks.length !== 1 ? "s" : ""
    }`;

    const chip = document.createElement("div");
    chip.className = "playlist-chip";
    chip.textContent = pl.id === "liked" ? "Liked songs" : "Your playlist";

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(chip);

    card.onclick = () => {
      if (!tracks.length) return;
      startPlaylist(tracks);
    };

    container.appendChild(card);
  });
}

function renderAllPlaylistsUI() {
  if (homePlaylistsEl) renderPlaylistCards(homePlaylistsEl);
  if (playlistListEl) renderPlaylistCards(playlistListEl);
}

async function createPlaylistOnServer(name) {
  const res = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error("Failed to create playlist");
  const pl = await res.json();
  return pl;
}

async function addTrackToPlaylistOnServer(playlistId, trackId) {
  const res = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackId })
  });
  if (!res.ok) throw new Error("Failed to add track");
  const pl = await res.json();
  const idx = playlists.findIndex((p) => p.id === pl.id);
  if (idx !== -1) playlists[idx] = pl;
  else playlists.push(pl);
  return pl;
}

// Toggle like via special playlist "liked"
async function toggleLike(track) {
  try {
    const res = await fetch(
      "/api/playlists/liked/tracks/toggle",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: track.id })
      }
    );
    if (!res.ok) throw new Error("Failed to toggle like");
    const pl = await res.json();

    const idx = playlists.findIndex((p) => p.id === pl.id);
    if (idx !== -1) playlists[idx] = pl;
    else playlists.push(pl);

    likedTrackIds = new Set(pl.trackIds || []);
    renderAllPlaylistsUI();
    refreshTrackViews();
    syncLikeNowButton();
  } catch (err) {
    console.error(err);
    alert("Failed to update liked songs.");
  }
}

function refreshTrackViews() {
  if (!allTracks.length) return;
  const sortedByRecent = [...allTracks].sort(
    (a, b) => (b.addedAt || 0) - (a.addedAt || 0)
  );
  const recent = sortedByRecent.slice(0, 10);
  if (homeRecentEl) renderTrackList(homeRecentEl, recent);
  if (libraryTrackListEl) renderTrackList(libraryTrackListEl, allTracks);
}

// Prompt-based "Add to playlist" flow
async function openAddToPlaylist(track) {
  try {
    const nonSystemPlaylists = playlists.filter((p) => p.id !== "liked");

    if (!nonSystemPlaylists.length) {
      const name = prompt(
        "Create a new playlist and add this song.\n\nEnter playlist name:"
      );
      if (!name) return;
      const pl = await createPlaylistOnServer(name.trim());
      playlists.push(pl);
      await addTrackToPlaylistOnServer(pl.id, track.id);
      renderAllPlaylistsUI();
      return;
    }

    const choice = prompt(
      "Add to playlist:\n" +
        nonSystemPlaylists
          .map((p, idx) => `${idx + 1}. ${p.name}`)
          .join("\n") +
        "\n\nType a number, or type a new name to create another playlist."
    );

    if (!choice) return;

    const num = parseInt(choice, 10);
    if (!isNaN(num) && num >= 1 && num <= nonSystemPlaylists.length) {
      const pl = nonSystemPlaylists[num - 1];
      await addTrackToPlaylistOnServer(pl.id, track.id);
    } else {
      const name = choice.trim();
      if (!name) return;
      const pl = await createPlaylistOnServer(name);
      playlists.push(pl);
      await addTrackToPlaylistOnServer(pl.id, track.id);
    }

    renderAllPlaylistsUI();
  } catch (err) {
    console.error(err);
    alert("Failed to update playlist.");
  }
}

// ---------- Views / nav ----------

function switchView(viewId) {
  Object.entries(views).forEach(([key, el]) => {
    if (!el) return;
    if (key === viewId) {
      el.classList.add("view-active");
    } else {
      el.classList.remove("view-active");
    }
  });
}

menuToggle.addEventListener("click", () => {
  sidebar.classList.add("open");
  overlay.classList.add("open");
});

overlay.addEventListener("click", () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("open");
});

document.querySelectorAll(".nav-item").forEach((btn) => {
  const view = btn.dataset.view;
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".nav-item")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    switchView(view);

    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  });
});

// ---------- Search ----------

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    let filtered = allTracks;
    if (q.length > 0) {
      filtered = allTracks.filter((t) => {
        const haystack = `${t.title} ${t.artist} ${t.album}`.toLowerCase();
        return haystack.includes(q);
      });
    }
    renderTrackList(libraryTrackListEl, filtered);
  });
}

// ---------- Playlist create button ----------

if (btnCreatePlaylist && newPlaylistNameInput) {
  btnCreatePlaylist.addEventListener("click", async () => {
    const name = newPlaylistNameInput.value.trim();
    if (!name) return;
    try {
      const pl = await createPlaylistOnServer(name);
      playlists.push(pl);
      newPlaylistNameInput.value = "";
      renderAllPlaylistsUI();
    } catch (err) {
      console.error(err);
      alert("Failed to create playlist.");
    }
  });
}

// ---------- AI DJ button (stub) ----------

djButton.addEventListener("click", async () => {
  try {
    const res = await fetch("/api/dj/intro");
    const data = await res.json();
    alert(`AI DJ says: ${data.message}`);
  } catch (err) {
    console.error(err);
  }
});

// ---------- Player button wiring ----------

btnPlayPause.addEventListener("click", () => {
  if (player.paused) {
    player.play().catch((err) => console.error("Play error:", err));
  } else {
    player.pause();
  }
});

btnPrev.addEventListener("click", () => {
  if (playQueue) {
    playPreviousInQueue();
  }
});

btnNext.addEventListener("click", () => {
  playNextInQueueOrShuffle();
});

btnShuffle.addEventListener("click", () => {
  shuffleEnabled = !shuffleEnabled;
  btnShuffle.classList.toggle("player-btn-active", shuffleEnabled);
});

// Like button in now-playing bar
if (btnLikeNow) {
  btnLikeNow.addEventListener("click", () => {
    if (!currentTrack) return;
    toggleLike(currentTrack);
  });
}

// ---------- Init ----------

async function loadTracks() {
  const res = await fetch("/api/tracks");
  if (!res.ok) {
    if (libraryTrackListEl) {
      libraryTrackListEl.innerHTML = "<div>Failed to load tracks</div>";
    }
    if (homeRecentEl) {
      homeRecentEl.innerHTML = "<div>Failed to load tracks</div>";
    }
    return;
  }
  const tracks = await res.json();
  allTracks = tracks;
  trackById = new Map();
  tracks.forEach((t) => trackById.set(t.id, t));
}

async function loadPlaylists() {
  const res = await fetch("/api/playlists");
  if (!res.ok) {
    playlists = [];
    renderAllPlaylistsUI();
    return;
  }
  const data = await res.json();
  playlists = data.playlists || [];

  const liked = playlists.find((p) => p.id === "liked");
  likedTrackIds = new Set(liked ? liked.trackIds || [] : []);
  renderAllPlaylistsUI();
}

async function init() {
  player.volume = 1;
  setNowPlaying(null, null);
  await loadTracks();
  await loadPlaylists();
  refreshTrackViews();
}

init().catch(console.error);

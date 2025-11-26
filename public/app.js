// DOM refs
const homeRecentEl = document.getElementById("homeRecent");
const homePlaylistsEl = document.getElementById("homePlaylists");
const libraryTrackListEl = document.getElementById("libraryTrackList");
const playlistListEl = document.getElementById("playlistList");
const searchInput = document.getElementById("searchInput");

const player = document.getElementById("player");
const miniPlayer = document.getElementById("miniPlayer");
const miniCover = document.getElementById("miniCover");
const miniTitle = document.getElementById("miniTitle");
const miniArtist = document.getElementById("miniArtist");
const miniProgress = document.getElementById("miniProgress");
const miniPlayPause = document.getElementById("miniPlayPause");
const miniPlayIcon = document.getElementById("miniPlayIcon");

const nowFull = document.getElementById("nowFull");
const nowFullArt = document.getElementById("nowFullArt");
const nowFullTitle = document.getElementById("nowFullTitle");
const nowFullArtist = document.getElementById("nowFullArtist");
const nowFullClose = document.getElementById("nowFullClose");

const btnShuffle = document.getElementById("btnShuffle");
const btnPrev = document.getElementById("btnPrev");
const btnPlayPause = document.getElementById("btnPlayPause");
const btnNext = document.getElementById("btnNext");
const btnRepeat = document.getElementById("btnRepeat");
const btnLikeNow = document.getElementById("btnLikeNow");
const btnAddToQueue = document.getElementById("btnAddToQueue");
const iconLikeNow = document.getElementById("iconLikeNow");
const iconPlayPause = document.getElementById("iconPlayPause");

const seekBar = document.getElementById("seekBar");
const volumeSlider = document.getElementById("volumeSlider");
const timeCurrentEl = document.getElementById("timeCurrent");
const timeTotalEl = document.getElementById("timeTotal");

const btnQueue = document.getElementById("btnQueue");
const queueCount = document.getElementById("queueCount");
const queueModal = document.getElementById("queueModal");
const queueModalClose = document.getElementById("queueModalClose");
const queueModalBackdrop = document.getElementById("queueModalBackdrop");
const queueList = document.getElementById("queueList");
const queueSubtitle = document.getElementById("queueSubtitle");
const nowPlayingTrack = document.getElementById("nowPlayingTrack");
const btnClearQueue = document.getElementById("btnClearQueue");

const contextMenu = document.getElementById("contextMenu");
const toastContainer = document.getElementById("toastContainer");

const libraryPlayAll = document.getElementById("libraryPlayAll");
const libraryShuffleAll = document.getElementById("libraryShuffleAll");

const totalTracks = document.getElementById("totalTracks");
const totalLiked = document.getElementById("totalLiked");
const totalPlaylists = document.getElementById("totalPlaylists");

const views = {
  home: document.getElementById("view-home"),
  library: document.getElementById("view-library"),
  playlists: document.getElementById("view-playlists")
};

const libraryBackBtn = document.getElementById("libraryBackBtn");
const libraryHeaderBar = document.getElementById("libraryHeaderBar");
const libraryTitle = document.getElementById("libraryTitle");
const librarySubtitle = document.getElementById("librarySubtitle");

let allTracks = [];
let trackById = new Map();
let playlists = [];
let likedTrackIds = new Set();

let currentTrack = null;
let playQueue = [];
let queueIndex = -1;
let shuffleEnabled = false;
let repeatMode = 0; // 0 = off, 1 = all, 2 = one

// ---------- Helpers ----------

function formatTime(seconds) {
  if (!isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(seconds / 60);
  return `${m}:${s}`;
}

function getCoverUrl(track) {
  return `/api/cover?file=${encodeURIComponent(track.file)}`;
}

function showToast(message, icon = "fa-check") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <div class="toast-message">${message}</div>
  `;
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ---------- Mini Player ----------

function updateMiniPlayer(track) {
  if (!track) {
    miniTitle.textContent = "Nothing playing";
    miniArtist.textContent = "";
    miniCover.src = "";
    miniPlayer.style.display = "none";
    return;
  }
  
  miniPlayer.style.display = "block";
  miniTitle.textContent = track.title;
  miniArtist.textContent = track.artist || track.album || "";
  miniCover.src = getCoverUrl(track);
}

function syncMiniPlayButton() {
  if (player.paused) {
    miniPlayIcon.classList.remove("fa-pause");
    miniPlayIcon.classList.add("fa-play");
  } else {
    miniPlayIcon.classList.remove("fa-play");
    miniPlayIcon.classList.add("fa-pause");
  }
}

// ---------- Full Player ----------

function openFullPlayer() {
  nowFull.setAttribute("aria-hidden", "false");
  if (currentTrack) {
    nowFullTitle.textContent = currentTrack.title;
    nowFullArtist.textContent = currentTrack.artist || currentTrack.album || "Unknown Artist";
    nowFullArt.src = getCoverUrl(currentTrack);
  }
  syncPlayButton();
  syncLikeButton();
  syncRepeatButton();
}

function closeFullPlayer() {
  nowFull.setAttribute("aria-hidden", "true");
}

function syncPlayButton() {
  if (player.paused) {
    iconPlayPause.classList.remove("fa-pause");
    iconPlayPause.classList.add("fa-play");
  } else {
    iconPlayPause.classList.remove("fa-play");
    iconPlayPause.classList.add("fa-pause");
  }
}

function syncLikeButton() {
  if (!currentTrack || !btnLikeNow) return;
  const liked = likedTrackIds.has(currentTrack.id);
  if (liked) {
    iconLikeNow.classList.remove("fa-regular");
    iconLikeNow.classList.add("fa-solid");
    btnLikeNow.classList.add("active");
  } else {
    iconLikeNow.classList.remove("fa-solid");
    iconLikeNow.classList.add("fa-regular");
    btnLikeNow.classList.remove("active");
  }
}

function syncRepeatButton() {
  const icon = btnRepeat.querySelector("i");
  btnRepeat.classList.toggle("active", repeatMode > 0);
  
  if (repeatMode === 0) {
    icon.className = "fa-solid fa-repeat";
    btnRepeat.title = "Repeat Off";
  } else if (repeatMode === 1) {
    icon.className = "fa-solid fa-repeat";
    btnRepeat.title = "Repeat All";
  } else {
    icon.className = "fa-solid fa-repeat-1";
    btnRepeat.title = "Repeat One";
  }
}

function syncShuffleButton() {
  btnShuffle.classList.toggle("active", shuffleEnabled);
}

// ---------- Queue Management ----------

function updateQueueUI() {
  queueCount.textContent = playQueue.length;
  queueSubtitle.textContent = `${playQueue.length} tracks`;
  
  // Now playing
  nowPlayingTrack.innerHTML = "";
  if (currentTrack) {
    const trackEl = createTrackElement(currentTrack, false);
    nowPlayingTrack.appendChild(trackEl);
  }
  
  // Queue
  queueList.innerHTML = "";
  const upcoming = playQueue.slice(queueIndex + 1);
  
  if (upcoming.length === 0) {
    queueList.innerHTML = '<div class="muted" style="padding: 20px; text-align: center;">No tracks in queue</div>';
  } else {
    upcoming.forEach((track, idx) => {
      const trackEl = createTrackElement(track, true, idx);
      queueList.appendChild(trackEl);
    });
  }
}

function createTrackElement(track, showRemove = false, queueIdx = -1) {
  const row = document.createElement("div");
  row.className = "track-row";

  const cover = document.createElement("img");
  cover.className = "track-cover";
  cover.src = getCoverUrl(track);
  cover.onerror = () => { cover.style.display = "none"; };

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

  if (showRemove) {
    const removeBtn = document.createElement("button");
    removeBtn.className = "add-pill";
    removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      removeFromQueue(queueIdx);
    };
    actions.appendChild(removeBtn);
  }

  row.appendChild(cover);
  row.appendChild(meta);
  row.appendChild(actions);

  if (showRemove) {
    row.onclick = () => {
      jumpToQueueIndex(queueIndex + 1 + queueIdx);
    };
  }

  return row;
}

function addToQueue(track) {
  playQueue.push(track);
  updateQueueUI();
  showToast(`Added ${track.title} to queue`, "fa-list");
}

function removeFromQueue(idx) {
  const actualIdx = queueIndex + 1 + idx;
  if (actualIdx < playQueue.length) {
    playQueue.splice(actualIdx, 1);
    updateQueueUI();
    showToast("Removed from queue", "fa-trash");
  }
}

function clearQueue() {
  const current = currentTrack;
  playQueue = current ? [current] : [];
  queueIndex = current ? 0 : -1;
  updateQueueUI();
  showToast("Queue cleared", "fa-trash");
}

function jumpToQueueIndex(idx) {
  if (idx >= 0 && idx < playQueue.length) {
    queueIndex = idx;
    playTrackCore(playQueue[queueIndex]);
  }
}

// ---------- Media Session ----------

function updateMediaSession(track, coverUrl) {
  if (!("mediaSession" in navigator)) return;

  if (!track) {
    navigator.mediaSession.metadata = null;
    return;
  }

  const artwork = coverUrl
    ? [{ src: coverUrl, sizes: "512x512", type: "image/jpeg" }]
    : [];

  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist || "",
    album: track.album || "",
    artwork
  });

  navigator.mediaSession.setActionHandler("play", () => player.play());
  navigator.mediaSession.setActionHandler("pause", () => player.pause());
  navigator.mediaSession.setActionHandler("previoustrack", () => playPreviousInQueue());
  navigator.mediaSession.setActionHandler("nexttrack", () => playNextInQueueOrShuffle());
}

// ---------- Playback ----------

function playTrackCore(track) {
  currentTrack = track;
  const url = `/api/stream?file=${encodeURIComponent(track.file)}`;
  const cover = getCoverUrl(track);

  // Avoid resetting the source if the same file is already loaded and playing
  try {
    const absoluteUrl = new URL(url, window.location.origin).href;
    if (player.src && player.src === absoluteUrl) {
      // same source — just ensure UI is synced and resume if paused
      updateMiniPlayer(track);
      updateMediaSession(track, cover);
      updateQueueUI();
      document.title = `${track.title} – ${track.artist || "Madify"}`;
      if (player.paused) player.play().catch((err) => console.error("Play error:", err));
      return;
    }
  } catch (e) {
    // fallback: continue and set src normally
  }

  player.src = url;
  player.play().catch((err) => console.error("Play error:", err));
  
  updateMiniPlayer(track);
  updateMediaSession(track, cover);
  updateQueueUI();
  document.title = `${track.title} – ${track.artist || "Madify"}`;
}

function playTrackStandalone(track) {
  playQueue = [track];
  queueIndex = 0;
  playTrackCore(track);
}

function startPlaylist(tracks) {
  if (!tracks || tracks.length === 0) return;
  playQueue = tracks.slice();
  queueIndex = 0;
  playTrackCore(playQueue[queueIndex]);
}

function playNextInQueue() {
  if (!playQueue.length) return;
  
  if (repeatMode === 2) {
    // Repeat one
    player.currentTime = 0;
    player.play();
    return;
  }
  
  const nextIndex = queueIndex + 1;
  if (nextIndex < playQueue.length) {
    queueIndex = nextIndex;
    playTrackCore(playQueue[queueIndex]);
  } else if (repeatMode === 1) {
    // Repeat all - go back to start
    queueIndex = 0;
    playTrackCore(playQueue[queueIndex]);
  } else if (shuffleEnabled) {
    playRandomTrackFromAll();
  }
}

function playPreviousInQueue() {
  if (!playQueue.length) return;
  
  if (player.currentTime > 3) {
    player.currentTime = 0;
    return;
  }
  
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
  playNextInQueue();
}

// ---------- Player Events ----------

player.addEventListener("ended", () => {
  playNextInQueue();
});

player.addEventListener("play", () => {
  syncPlayButton();
  syncMiniPlayButton();
});

player.addEventListener("pause", () => {
  syncPlayButton();
  syncMiniPlayButton();
});

player.addEventListener("loadedmetadata", () => {
  // Prefer the player's reported duration, but fall back to the currentTrack.duration
  const effectiveDuration = Number.isFinite(player.duration) && player.duration > 0
    ? player.duration
    : (currentTrack && currentTrack.duration) || 0;

  timeTotalEl.textContent = formatTime(effectiveDuration || 0);
  // initialize seek bar visual
  try {
    const pct = effectiveDuration ? (player.currentTime / effectiveDuration) * 100 : 0;
    if (seekBar && seekBar.style) seekBar.style.background = `linear-gradient(90deg, var(--accent) ${pct}%, var(--separator) ${pct}%)`;
    if (seekBar && typeof seekBar.value !== 'undefined') seekBar.value = pct;
  } catch (e) {}
});

player.addEventListener("timeupdate", () => {
  // Use player.duration when finite, otherwise fall back to track-provided duration
  const effectiveDuration = Number.isFinite(player.duration) && player.duration > 0
    ? player.duration
    : (currentTrack && currentTrack.duration) || 0;

  const pct = effectiveDuration ? (player.currentTime / effectiveDuration) * 100 : 0;
  if (seekBar && typeof seekBar.value !== 'undefined') seekBar.value = pct;
  timeCurrentEl.textContent = formatTime(player.currentTime);
  timeTotalEl.textContent = formatTime(effectiveDuration || 0);
  // update visual progress background for the range input
  try {
    if (seekBar && seekBar.style) seekBar.style.background = `linear-gradient(90deg, var(--accent) ${pct}%, var(--separator) ${pct}%)`;
  } catch (e) {}

  if (miniProgress) {
    miniProgress.style.width = `${pct}%`;
  }
});

seekBar.addEventListener("input", () => {
  // Seek using the best available duration. If the player doesn't expose a
  // finite duration, we fall back to the track's duration (from server).
  const effectiveDuration = Number.isFinite(player.duration) && player.duration > 0
    ? player.duration
    : (currentTrack && currentTrack.duration) || 0;
  if (!effectiveDuration) return;
  const pct = parseFloat(seekBar.value) / 100;
  player.currentTime = pct * effectiveDuration;
  // reflect seeking visually
  try { const v = parseFloat(seekBar.value) || 0; if (seekBar && seekBar.style) seekBar.style.background = `linear-gradient(90deg, var(--accent) ${v}%, var(--separator) ${v}%)`; } catch (e) {}
});

volumeSlider.addEventListener("input", () => {
  player.volume = parseFloat(volumeSlider.value) / 100;
});

// ---------- Track Rendering ----------

function renderTrackList(container, tracks) {
  container.innerHTML = "";

  if (!tracks.length) {
    container.innerHTML = '<div class="muted" style="padding: 20px; text-align: center;">No tracks found</div>';
    return;
  }

  tracks.forEach((track) => {
    const row = document.createElement("div");
    row.className = "track-row";

    const cover = document.createElement("img");
    cover.className = "track-cover";
    cover.src = getCoverUrl(track);
    cover.onerror = () => { cover.style.display = "none"; };

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

    // Like button
    const likeBtn = document.createElement("button");
    likeBtn.className = "like-pill";
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
    const inAny = playlists.some((p) => p.id !== "liked" && (p.trackIds || []).some((id) => id == track.id));
    if (inAny) {
      addBtn.classList.add("in-playlist");
      addBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else {
      addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
    }
    addBtn.onclick = (e) => {
      e.stopPropagation();
      openAddToPlaylist(track);
    };

    actions.appendChild(likeBtn);
    actions.appendChild(addBtn);

    row.appendChild(cover);
    row.appendChild(meta);
    row.appendChild(actions);

    row.onclick = () => {
      playTrackStandalone(track);
    };

    // Right-click context menu
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showContextMenu(e, track);
    });

    container.appendChild(row);
  });
}

// ---------- Context Menu ----------

let contextMenuTrack = null;

function showContextMenu(e, track) {
  contextMenuTrack = track;
  contextMenu.style.display = "block";
  contextMenu.style.left = `${Math.min(e.pageX, window.innerWidth - 220)}px`;
  contextMenu.style.top = `${Math.min(e.pageY, window.innerHeight - 200)}px`;
}

function hideContextMenu() {
  contextMenu.style.display = "none";
  contextMenuTrack = null;
}

document.addEventListener("click", (e) => {
  if (!contextMenu.contains(e.target)) {
    hideContextMenu();
  }
});

document.querySelectorAll(".context-menu-item").forEach((item) => {
  item.addEventListener("click", () => {
    const action = item.dataset.action;
    if (!contextMenuTrack) return;
    
    switch (action) {
      case "play":
        playTrackStandalone(contextMenuTrack);
        break;
      case "addToQueue":
        addToQueue(contextMenuTrack);
        break;
      case "addToPlaylist":
        openAddToPlaylist(contextMenuTrack);
        break;
      case "like":
        toggleLike(contextMenuTrack);
        break;
    }
    
    hideContextMenu();
  });
});

// ---------- Library Categories ----------

let currentLibraryView = null;
let currentLibraryData = null;

function renderLibraryCategory(category) {
  currentLibraryView = category;
  libraryHeaderBar.style.display = "none";

  if (category === "songs") {
    renderTrackList(libraryTrackListEl, allTracks);
  } else if (category === "artists") {
    const map = new Map();
    allTracks.forEach((t) => {
      const key = t.artist || "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    const artists = Array.from(map.keys()).sort();
    libraryTrackListEl.innerHTML = "";
    artists.forEach((artist) => {
      const card = document.createElement("div");
      card.className = "playlist-card";
      const title = document.createElement("div");
      title.className = "playlist-title";
      title.textContent = artist;
      const subtitle = document.createElement("div");
      subtitle.className = "playlist-subtitle";
      subtitle.textContent = `${map.get(artist).length} tracks`;
      card.appendChild(title);
      card.appendChild(subtitle);
      card.onclick = () => {
        showLibraryDetail(artist, map.get(artist));
      };
      libraryTrackListEl.appendChild(card);
    });
  } else if (category === "albums") {
    const map = new Map();
    allTracks.forEach((t) => {
      const key = (t.album || "Unknown") + "|" + (t.artist || "");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    const albums = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    libraryTrackListEl.innerHTML = "";
    
    const grid = document.createElement("div");
    grid.className = "playlist-grid";
    libraryTrackListEl.appendChild(grid);
    
    albums.forEach(([key, tracks]) => {
      const [album, artist] = key.split("|");
      const card = document.createElement("div");
      card.className = "playlist-card";
      
      const art = document.createElement("img");
      art.className = "album-art";
      art.src = getCoverUrl(tracks[0]);
      art.onerror = () => { art.style.display = "none"; };
      
      const title = document.createElement("div");
      title.className = "playlist-title";
      title.textContent = album;
      
      const subtitle = document.createElement("div");
      subtitle.className = "playlist-subtitle";
      subtitle.textContent = artist || "Various Artists";
      
      card.appendChild(art);
      card.appendChild(title);
      card.appendChild(subtitle);
      
      card.onclick = () => {
        showLibraryDetail(album, tracks);
      };
      
      grid.appendChild(card);
    });
  } else if (category === "genres") {
    const map = new Map();
    allTracks.forEach((t) => {
      const g = t.genre || (t.genres && t.genres[0]) || "Unknown";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(t);
    });
    const genres = Array.from(map.keys()).sort();
    libraryTrackListEl.innerHTML = "";
    genres.forEach((genre) => {
      const card = document.createElement("div");
      card.className = "playlist-card";
      const title = document.createElement("div");
      title.className = "playlist-title";
      title.textContent = genre;
      const subtitle = document.createElement("div");
      subtitle.className = "playlist-subtitle";
      subtitle.textContent = `${map.get(genre).length} tracks`;
      card.appendChild(title);
      card.appendChild(subtitle);
      card.onclick = () => {
        showLibraryDetail(genre, map.get(genre));
      };
      libraryTrackListEl.appendChild(card);
    });
  }
}

function showLibraryDetail(name, tracks) {
  currentLibraryData = { name, tracks };
  libraryHeaderBar.style.display = "flex";
  libraryTitle.textContent = name;
  librarySubtitle.textContent = `${tracks.length} tracks`;
  renderTrackList(libraryTrackListEl, tracks);
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
    container.innerHTML = '<div class="muted" style="padding: 20px; text-align: center;">No playlists yet</div>';
    return;
  }

  const sorted = playlists.slice().sort((a, b) => {
    if (a.id === "liked" && b.id !== "liked") return -1;
    if (b.id === "liked" && a.id !== "liked") return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  sorted.forEach((pl) => {
    const tracks = resolvePlaylistTracks(pl);
    const card = document.createElement("div");
    card.className = "playlist-card";
    card.dataset.plId = pl.id;

    const title = document.createElement("div");
    title.className = "playlist-title";
    title.textContent = pl.name;

    const subtitle = document.createElement("div");
    subtitle.className = "playlist-subtitle";
    subtitle.textContent = `${tracks.length} tracks`;

    const chip = document.createElement("div");
    chip.className = "playlist-chip";
    chip.textContent = pl.id === "liked" ? "Liked" : "Playlist";

    card.appendChild(title);
    card.appendChild(subtitle);
    card.appendChild(chip);

    card.onclick = () => {
      openPlaylistDetail(pl);
    };

    container.appendChild(card);
  });
}

let currentOpenedPlaylist = null;

function openPlaylistDetail(pl) {
  const detail = document.getElementById("playlistDetail");
  const nameEl = document.getElementById("playlistDetailName");
  const countEl = document.getElementById("playlistDetailCount");
  const listEl = document.getElementById("playlistDetailTrackList");
  const playBtn = document.getElementById("playlistDetailPlay");
  const shuffleBtn = document.getElementById("playlistDetailShuffle");
  const backBtn = document.getElementById("playlistDetailBack");

  if (!detail) return;

  currentOpenedPlaylist = pl;
  detail.style.display = "block";
  nameEl.textContent = pl.name;
  
  const tracks = resolvePlaylistTracks(pl);
  countEl.textContent = `${tracks.length} tracks`;
  
  renderTrackList(listEl, tracks);

  if (playBtn) {
    playBtn.onclick = (e) => {
      e.stopPropagation();
      if (tracks && tracks.length) {
        startPlaylist(tracks);
        closePlaylistDetail();
      }
    };
  }

  if (shuffleBtn) {
    shuffleBtn.onclick = (e) => {
      e.stopPropagation();
      if (!tracks || !tracks.length) return;
      const shuffled = tracks.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      startPlaylist(shuffled);
      closePlaylistDetail();
    };
  }

  if (backBtn) {
    backBtn.onclick = (e) => {
      e.stopPropagation();
      closePlaylistDetail();
    };
  }

  // Wire the top-right "more" button to show Edit/Delete actions
  const moreBtn = document.getElementById("playlistDetailMore");
  if (moreBtn) {
    // remove any previous handler to avoid duplicates
    moreBtn.onclick = (e) => {
      e.stopPropagation();
      showPlaylistDetailMenu(pl, moreBtn);
    };
  }
}

function closePlaylistDetail() {
  const detail = document.getElementById("playlistDetail");
  if (!detail) return;
  detail.style.display = "none";
  currentOpenedPlaylist = null;
}

// Small anchored menu for playlist detail actions (Edit / Delete)
function showPlaylistDetailMenu(pl, anchorEl) {
  // remove any existing menu
  const existing = document.getElementById('playlist-detail-menu');
  if (existing) existing.remove();

  const rect = anchorEl.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.id = 'playlist-detail-menu';
  menu.style.position = 'absolute';
  menu.style.zIndex = 1200;
  menu.style.left = `${Math.min(window.innerWidth - 160, rect.right - 150)}px`;
  menu.style.top = `${rect.bottom + 8 + window.scrollY}px`;
  menu.style.width = '140px';
  menu.style.background = 'var(--bg-card)';
  menu.style.border = '1px solid var(--separator)';
  menu.style.borderRadius = '8px';
  menu.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
  menu.style.overflow = 'hidden';

  const btn = (text, icon, onClick) => {
    const it = document.createElement('button');
    it.className = 'context-menu-item';
    it.style.display = 'flex';
    it.style.alignItems = 'center';
    it.style.gap = '8px';
    it.style.width = '100%';
    it.style.padding = '10px 12px';
    it.style.background = 'transparent';
    it.style.border = 'none';
    it.style.color = 'var(--text)';
    it.style.cursor = 'pointer';
    it.innerHTML = `<i class="fa-solid ${icon}" style="width:18px;text-align:center;"></i><span style="flex:1;text-align:left">${text}</span>`;
    it.addEventListener('click', async (e) => {
      e.stopPropagation();
      try { await onClick(); } catch (err) { console.error(err); }
      menu.remove();
    });
    return it;
  };

  // Edit -> prompt for new name then call PUT /api/playlists/:id
  const editBtn = btn('Edit', 'fa-pen', async () => {
    const newName = window.prompt('Rename playlist', pl.name);
    if (!newName || !newName.trim()) return;
    const name = newName.trim();
    const res = await fetch(`/api/playlists/${encodeURIComponent(pl.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error('Rename failed: ' + txt);
    }
    await loadPlaylists();
    renderAllPlaylistsUI();
    // update sheet title
    const nameEl = document.getElementById('playlistDetailName');
    if (nameEl) nameEl.textContent = name;
    showToast('Renamed playlist', 'fa-pen');
  });

  // Delete -> confirm then call DELETE /api/playlists/:id
  const delBtn = btn('Delete', 'fa-trash', async () => {
    if (!confirm('Delete this playlist? This cannot be undone.')) return;
    const res = await fetch(`/api/playlists/${encodeURIComponent(pl.id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error('Delete failed: ' + txt);
    }
    await loadPlaylists();
    renderAllPlaylistsUI();
    closePlaylistDetail();
    showToast('Playlist deleted', 'fa-trash');
  });

  menu.appendChild(editBtn);
  menu.appendChild(delBtn);
  document.body.appendChild(menu);

  // Dismiss on outside click
  const onDocClick = (e) => {
    if (!menu.contains(e.target) && e.target !== anchorEl) {
      menu.remove();
      document.removeEventListener('click', onDocClick);
    }
  };
  setTimeout(() => document.addEventListener('click', onDocClick), 0);
}

async function createPlaylistOnServer(name) {
  const res = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!res.ok) {
    throw new Error("Failed to create playlist");
  }
  const pl = await res.json();
  await loadPlaylists();
  renderAllPlaylistsUI();
  showToast(`Created playlist: ${name}`, "fa-plus");
  return pl;
}

async function addTrackToPlaylistOnServer(playlistId, trackId) {
  try {
    const res = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId })
    });
    if (!res.ok) {
      throw new Error("Failed to add track");
    }
    await loadPlaylists();
    renderAllPlaylistsUI();
    refreshTrackViews();
  } catch (err) {
    console.error("addTrackToPlaylistOnServer error:", err);
    throw err;
  }
}

async function toggleLike(track) {
  try {
    const res = await fetch("/api/playlists/liked/tracks/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: track.id })
    });
    if (!res.ok) {
      throw new Error("Failed to toggle like");
    }
    const pl = await res.json();

    const idx = playlists.findIndex((p) => p.id === pl.id);
    if (idx !== -1) playlists[idx] = pl;
    else playlists.push(pl);

    likedTrackIds = new Set(pl.trackIds || []);
    renderAllPlaylistsUI();
    refreshTrackViews();
    syncLikeButton();
    updateStats();
    
    const action = likedTrackIds.has(track.id) ? "Liked" : "Unliked";
    showToast(`${action}: ${track.title}`, "fa-heart");
  } catch (err) {
    console.error(err);
  }
}

function refreshTrackViews() {
  if (!allTracks.length) return;
  const sortedByRecent = [...allTracks].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  const recent = sortedByRecent.slice(0, 15);
  if (homeRecentEl) renderTrackList(homeRecentEl, recent);
  
  if (currentLibraryView) {
    renderLibraryCategory(currentLibraryView);
  }
}

async function openAddToPlaylist(track) {
  if (!track) return;
  openPlaylistModal(track);
}

function closePlaylistModal() {
  const playlistModal = document.getElementById("playlistModal");
  const playlistModalList = document.getElementById("playlistModalList");
  const playlistModalNewName = document.getElementById("playlistModalNewName");
  if (!playlistModal) return;
  playlistModal.setAttribute("aria-hidden", "true");
  playlistModalList.innerHTML = "";
  playlistModalNewName.value = "";
}

function openPlaylistModal(track) {
  const playlistModal = document.getElementById("playlistModal");
  const playlistModalList = document.getElementById("playlistModalList");
  if (!playlistModal) return;
  playlistModal.setAttribute("aria-hidden", "false");
  playlistModalList.innerHTML = "";

  const nonSystemPlaylists = playlists.filter((p) => p.id !== "liked");

  if (nonSystemPlaylists.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.style.padding = "20px";
    empty.style.textAlign = "center";
    empty.textContent = "No playlists yet – create one below";
    playlistModalList.appendChild(empty);
  } else {
    nonSystemPlaylists.forEach((pl) => {
      const item = document.createElement("div");
      item.className = "modal-item";
      
      const nameWrap = document.createElement("div");
      nameWrap.textContent = pl.name;
      
      const already = (pl.trackIds || []).some((id) => id == track.id);
      const statusIcon = document.createElement("i");
      if (already) {
        statusIcon.className = "fa-solid fa-check";
        item.classList.add("in-playlist");
      } else {
        statusIcon.className = "fa-solid fa-plus";
      }

      item.appendChild(nameWrap);
      item.appendChild(statusIcon);

      if (!already) {
        item.addEventListener("click", async () => {
          try {
            await addTrackToPlaylistOnServer(pl.id, track.id);
            statusIcon.className = "fa-solid fa-check";
            item.classList.add("in-playlist");
            showToast(`Added to ${pl.name}`, "fa-check");
          } catch (err) {
            console.error(err);
          }
        });
      }

      playlistModalList.appendChild(item);
    });
  }
}

function renderAllPlaylistsUI() {
  if (homePlaylistsEl) renderPlaylistCards(homePlaylistsEl);
  if (playlistListEl) renderPlaylistCards(playlistListEl);
  updateStats();
}

function updateStats() {
  totalTracks.textContent = allTracks.length;
  totalLiked.textContent = likedTrackIds.size;
  totalPlaylists.textContent = playlists.filter(p => p.id !== "liked").length;
}

// ---------- Views / Nav ----------

function switchView(viewId) {
  Object.entries(views).forEach(([key, el]) => {
    if (!el) return;
    if (key === viewId) {
      el.classList.add("view-active");
    } else {
      el.classList.remove("view-active");
    }
  });

  if (viewId !== "library") {
    currentLibraryView = null;
    currentLibraryData = null;
    if (libraryHeaderBar) libraryHeaderBar.style.display = "none";
  }
  
  if (viewId !== "playlists") {
    closePlaylistDetail();
  }
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  const view = btn.dataset.view;
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    switchView(view);
  });
});

document.querySelectorAll(".category-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const category = btn.dataset.lib;
    renderLibraryCategory(category);
  });
});

if (libraryBackBtn) {
  libraryBackBtn.addEventListener("click", () => {
    if (currentLibraryView) {
      renderLibraryCategory(currentLibraryView);
    }
  });
}

if (libraryPlayAll) {
  libraryPlayAll.addEventListener("click", () => {
    if (currentLibraryData && currentLibraryData.tracks) {
      startPlaylist(currentLibraryData.tracks);
      showToast("Playing all tracks", "fa-play");
    }
  });
}

if (libraryShuffleAll) {
  libraryShuffleAll.addEventListener("click", () => {
    if (currentLibraryData && currentLibraryData.tracks) {
      const shuffled = currentLibraryData.tracks.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      startPlaylist(shuffled);
      showToast("Shuffling all tracks", "fa-shuffle");
    }
  });
}

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
    if (homeRecentEl) renderTrackList(homeRecentEl, filtered);
  });
}

// ---------- Create Playlist ----------

const btnCreatePlaylistTop = document.getElementById("btnCreatePlaylistTop");
const createPlaylistModal = document.getElementById("createPlaylistModal");
const createPlaylistBackdrop = document.getElementById("createPlaylistBackdrop");
const createPlaylistClose = document.getElementById("createPlaylistClose");
const newPlaylistNameInput = document.getElementById("newPlaylistName");
const btnCreatePlaylist = document.getElementById("btnCreatePlaylist");

if (btnCreatePlaylistTop) {
  btnCreatePlaylistTop.addEventListener("click", () => {
    if (createPlaylistModal) createPlaylistModal.setAttribute("aria-hidden", "false");
  });
}

if (createPlaylistClose) {
  createPlaylistClose.addEventListener("click", () => {
    if (createPlaylistModal) createPlaylistModal.setAttribute("aria-hidden", "true");
  });
}

if (createPlaylistBackdrop) {
  createPlaylistBackdrop.addEventListener("click", () => {
    if (createPlaylistModal) createPlaylistModal.setAttribute("aria-hidden", "true");
  });
}

if (btnCreatePlaylist && newPlaylistNameInput) {
  btnCreatePlaylist.addEventListener("click", async () => {
    const name = newPlaylistNameInput.value.trim();
    if (!name) return;
    try {
      await createPlaylistOnServer(name);
      newPlaylistNameInput.value = "";
      if (createPlaylistModal) createPlaylistModal.setAttribute("aria-hidden", "true");
    } catch (err) {
      console.error(err);
    }
  });
}

// ---------- Playlist Modal ----------

const playlistModalClose = document.getElementById("playlistModalClose");
const playlistModalBackdrop = document.getElementById("playlistModalBackdrop");
const playlistModalCreate = document.getElementById("playlistModalCreate");
const playlistModalNewName = document.getElementById("playlistModalNewName");

if (playlistModalClose) playlistModalClose.addEventListener("click", closePlaylistModal);
if (playlistModalBackdrop) playlistModalBackdrop.addEventListener("click", closePlaylistModal);

if (playlistModalCreate) {
  playlistModalCreate.addEventListener("click", async () => {
    const name = playlistModalNewName.value && playlistModalNewName.value.trim();
    if (!name) return;
    try {
      const pl = await createPlaylistOnServer(name);
      if (contextMenuTrack) await addTrackToPlaylistOnServer(pl.id, contextMenuTrack.id);
      closePlaylistModal();
    } catch (err) {
      console.error(err);
    }
  });
}

// ---------- Queue Modal ----------

if (btnQueue) {
  btnQueue.addEventListener("click", () => {
    queueModal.setAttribute("aria-hidden", "false");
    updateQueueUI();
  });
}

if (queueModalClose) {
  queueModalClose.addEventListener("click", () => {
    queueModal.setAttribute("aria-hidden", "true");
  });
}

if (queueModalBackdrop) {
  queueModalBackdrop.addEventListener("click", () => {
    queueModal.setAttribute("aria-hidden", "true");
  });
}

if (btnClearQueue) {
  btnClearQueue.addEventListener("click", clearQueue);
}

// ---------- Player Controls ----------

if (miniPlayer) {
  miniPlayer.addEventListener("click", openFullPlayer);
}

if (miniPlayPause) {
  miniPlayPause.addEventListener("click", (e) => {
    e.stopPropagation();
    if (player.paused) {
      player.play().catch((err) => console.error("Play error:", err));
    } else {
      player.pause();
    }
  });
}

if (nowFullClose) {
  nowFullClose.addEventListener("click", closeFullPlayer);
}

if (btnPlayPause) {
  btnPlayPause.addEventListener("click", () => {
    if (player.paused) {
      player.play().catch((err) => console.error("Play error:", err));
    } else {
      player.pause();
    }
  });
}

if (btnPrev) {
  btnPrev.addEventListener("click", () => {
    playPreviousInQueue();
  });
}

if (btnNext) {
  btnNext.addEventListener("click", () => {
    playNextInQueueOrShuffle();
  });
}

if (btnShuffle) {
  btnShuffle.addEventListener("click", () => {
    shuffleEnabled = !shuffleEnabled;
    syncShuffleButton();
    showToast(`Shuffle ${shuffleEnabled ? "on" : "off"}`, "fa-shuffle");
  });
}

if (btnRepeat) {
  btnRepeat.addEventListener("click", () => {
    repeatMode = (repeatMode + 1) % 3;
    syncRepeatButton();
    const modes = ["off", "all", "one"];
    showToast(`Repeat ${modes[repeatMode]}`, "fa-repeat");
  });
}

if (btnLikeNow) {
  btnLikeNow.addEventListener("click", () => {
    if (!currentTrack) return;
    toggleLike(currentTrack);
  });
}

if (btnAddToQueue) {
  btnAddToQueue.addEventListener("click", () => {
    if (!currentTrack) return;
    addToQueue(currentTrack);
  });
}

// ---------- Keyboard Shortcuts ----------

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  
  switch (e.key) {
    case " ":
      e.preventDefault();
      if (player.paused) {
        player.play();
      } else {
        player.pause();
      }
      break;
    case "ArrowLeft":
      e.preventDefault();
      player.currentTime = Math.max(0, player.currentTime - 5);
      break;
    case "ArrowRight":
      e.preventDefault();
      player.currentTime = Math.min(player.duration, player.currentTime + 5);
      break;
    case "ArrowUp":
      e.preventDefault();
      player.volume = Math.min(1, player.volume + 0.1);
      volumeSlider.value = player.volume * 100;
      break;
    case "ArrowDown":
      e.preventDefault();
      player.volume = Math.max(0, player.volume - 0.1);
      volumeSlider.value = player.volume * 100;
      break;
    case "n":
      playNextInQueueOrShuffle();
      break;
    case "p":
      playPreviousInQueue();
      break;
    case "l":
      if (currentTrack) toggleLike(currentTrack);
      break;
  }
});

// ---------- Init ----------

async function loadTracks() {
  const res = await fetch("/api/tracks");
  if (!res.ok) {
    console.error("Failed to load tracks");
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
  volumeSlider.value = 100;
  miniPlayer.style.display = "none";
  // Playback debug logging (helps diagnose mid-track restarts)
  try {
    const DBG = true;
    if (DBG) {
      const ev = (name) => (e) => {
        console.log(`[player:${name}] time=${player.currentTime.toFixed(2)} dur=${player.duration} readyState=${player.readyState} networkState=${player.networkState}`, e && (e.type || e));
      };

      ["play","playing","pause","ended","stalled","waiting","suspend","abort","error","seeking","seeked","loadeddata","loadedmetadata","progress"].forEach((n) => {
        player.addEventListener(n, ev(n));
      });

      player.addEventListener("error", () => {
        console.error("Audio error", player.error);
      });

      // Detect abrupt socket/connection close
      player.addEventListener("emptied", () => console.warn("player emptied event"));
    }
  } catch (e) { console.error("playback debug setup failed", e); }
  await loadTracks();
  await loadPlaylists();
  refreshTrackViews();
  syncShuffleButton();
  syncRepeatButton();
  updateStats();
}

init().catch(console.error);
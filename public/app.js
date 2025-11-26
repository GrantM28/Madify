// DOM refs
const homeRecentEl = document.getElementById("homeRecent");
const homeRecentlyPlayedEl = document.getElementById("homeRecentlyPlayed");
const homeMostPlayedEl = document.getElementById("homeMostPlayed");
const homeSuggestedEl = document.getElementById("homeSuggested");
const homeMoodsEl = document.getElementById("homeMoods");
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

const btnSettings = document.getElementById("btnSettings");
const settingsModal = document.getElementById("settingsModal");
const settingsModalClose = document.getElementById("settingsModalClose");
const settingsModalBackdrop = document.getElementById("settingsModalBackdrop");
const optPreTranscode = document.getElementById("optPreTranscode");
const btnRescanLibrary = document.getElementById("btnRescanLibrary");
const optQualitySelect = document.getElementById("optQualitySelect");
const qualityNote = document.getElementById("qualityNote");

const libraryPlayAll = document.getElementById("libraryPlayAll");
const libraryShuffleAll = document.getElementById("libraryShuffleAll");

// Library controls refs
const libraryControls = document.getElementById("libraryControls");
const libSortSelect = document.getElementById("libSortSelect");
const libFilterSelect = document.getElementById("libFilterSelect");
const libGenreSelect = document.getElementById("libGenreSelect");
const libGenreWrap = document.getElementById("libGenreWrap");

const totalTracks = document.getElementById("totalTracks");
const totalLiked = document.getElementById("totalLiked");
const totalPlaylists = document.getElementById("totalPlaylists");

const views = {
  home: document.getElementById("view-home"),
  library: document.getElementById("view-library"),
  playlists: document.getElementById("view-playlists"),
  artist: document.getElementById("view-artist"),
  album: document.getElementById("view-album")
};

const libraryBackBtn = document.getElementById("libraryBackBtn");
const libraryHeaderBar = document.getElementById("libraryHeaderBar");
const libraryTitle = document.getElementById("libraryTitle");
const librarySubtitle = document.getElementById("librarySubtitle");
const libraryCategoriesEl = document.querySelector('.library-categories');

// Artist view refs
const artistBackBtn = document.getElementById("artistBackBtn");
const artistNameEl = document.getElementById("artistName");
const artistSubtitle = document.getElementById("artistSubtitle");
const artistTopSongsEl = document.getElementById("artistTopSongs");
const artistAlbumsEl = document.getElementById("artistAlbums");
const artistBioEl = document.getElementById("artistBio");
const artistRelatedEl = document.getElementById("artistRelated");

// Album view refs
const albumBackBtn = document.getElementById("albumBackBtn");
const albumTitleEl = document.getElementById("albumTitle");
const albumSubtitleEl = document.getElementById("albumSubtitle");
const albumReleaseYearEl = document.getElementById("albumReleaseYear");
const albumTrackCountEl = document.getElementById("albumTrackCount");
const albumTracklistEl = document.getElementById("albumTracklist");
const albumOtherAlbumsEl = document.getElementById("albumOtherAlbums");
const albumPlayBtn = document.getElementById("albumPlayBtn");
const albumShuffleBtn = document.getElementById("albumShuffleBtn");

let allTracks = [];
let trackById = new Map();
let playlists = [];
let likedTrackIds = new Set();

let currentTrack = null;
let playQueue = [];
let queueIndex = -1;
let shuffleEnabled = false;
let repeatMode = 0; // 0 = off, 1 = all, 2 = one

// Playback history and counts (persisted)
let playHistory = []; // [{ id, at }]
let playCounts = {}; // { [id]: count }

// ---------- Helpers ----------

function formatTime(seconds) {
  if (!isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(seconds / 60);
  return `${m}:${s}`;
}

// Playback persistence helpers
function loadPlaybackState() {
  try {
    const rawHist = localStorage.getItem('mf_playHistory');
    const rawCounts = localStorage.getItem('mf_playCounts');
    if (rawHist) playHistory = JSON.parse(rawHist) || [];
    if (rawCounts) playCounts = JSON.parse(rawCounts) || {};
  } catch (e) {
    console.error('Failed to load playback state', e);
    playHistory = [];
    playCounts = {};
  }
}

// Settings persistence (stream quality)
let selectedQuality = '320k';
function loadSettings() {
  try {
    const q = localStorage.getItem('mf_streamQuality');
    if (q) selectedQuality = q;
    if (optQualitySelect) optQualitySelect.value = selectedQuality;
  } catch (e) {
    console.error('Failed to load settings', e);
  }
}

function saveSettings() {
  try {
    if (optQualitySelect) selectedQuality = optQualitySelect.value;
    localStorage.setItem('mf_streamQuality', selectedQuality);
  } catch (e) { console.error('Failed to save settings', e); }
}

function updateQualityOptionsVisibility() {
  // show/hide Lossless option depending on whether any FLAC files exist
  if (!optQualitySelect) return;
  const hasFlac = allTracks && allTracks.some(t => (t.file||'').toLowerCase().endsWith('.flac'));
  const opt = Array.from(optQualitySelect.options).find(o => o.value === 'lossless');
  if (opt) opt.style.display = hasFlac ? 'block' : 'none';
  if (!hasFlac && optQualitySelect.value === 'lossless') {
    optQualitySelect.value = '320k';
    selectedQuality = '320k';
    saveSettings();
  }
  if (qualityNote) qualityNote.textContent = hasFlac ? 'Lossless available on server' : 'Lossless not available';
}

function savePlaybackState() {
  try {
    localStorage.setItem('mf_playHistory', JSON.stringify(playHistory.slice(0, 200)));
    localStorage.setItem('mf_playCounts', JSON.stringify(playCounts || {}));
  } catch (e) { console.error('Failed to save playback state', e); }
}

function recordPlay(track) {
  if (!track) return;
  const now = Date.now();
  playHistory.unshift({ id: track.id, at: now });
  // dedupe history by trimming duplicates beyond first occurrence when rendering
  // increment playCounts
  const key = String(track.id);
  playCounts[key] = (playCounts[key] || 0) + 1;
  // cap history length
  if (playHistory.length > 200) playHistory.length = 200;
  savePlaybackState();
  // refresh homepage sections
  renderHomeSections();
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

  // record play for history/analytics
  try { recordPlay(track); } catch (e) { console.error('recordPlay failed', e); }

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
    // show library controls for songs
    if (libraryControls) libraryControls.style.display = "flex";
    // ensure genres are populated for genre filter
    populateGenreOptions();
    // show header for All Songs
    if (libraryHeaderBar) libraryHeaderBar.style.display = 'flex';
    if (libraryTitle) libraryTitle.textContent = 'All Songs';
    if (librarySubtitle) librarySubtitle.textContent = `${allTracks.length} tracks`;
    // hide the category hero buttons when viewing All Songs
    if (libraryCategoriesEl) libraryCategoriesEl.style.display = 'none';
    renderSongsLibraryView();
  } else if (category === "artists") {
    if (libraryControls) libraryControls.style.display = "none";
    // hide category hero buttons when viewing a subcategory
    if (libraryCategoriesEl) libraryCategoriesEl.style.display = 'none';
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
          showArtistPage(artist, map.get(artist));
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
    if (libraryCategoriesEl) libraryCategoriesEl.style.display = 'none';
    
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
        showAlbumPage(album, tracks);
      };
      
      grid.appendChild(card);
    });
    // wire album card clicks to open album page
  } else if (category === "genres") {
    if (libraryCategoriesEl) libraryCategoriesEl.style.display = 'none';
    // Build genre -> tracks map
    const map = new Map();
    allTracks.forEach((t) => {
      const g = t.genre || (t.genres && t.genres[0]) || "Unknown";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(t);
    });

    // Top genres (hero cards)
    const genresByCount = Array.from(map.entries()).map(([k, v]) => ({ genre: k, count: v.length, tracks: v }));
    genresByCount.sort((a, b) => b.count - a.count);
    const topGenres = genresByCount.slice(0, 8);

    libraryTrackListEl.innerHTML = "";

    const heroesWrap = document.createElement('div');
    heroesWrap.className = 'genre-heroes genre-section';
    topGenres.forEach((g) => {
      const card = document.createElement('div');
      card.className = 'hero-genre-card';
      const title = document.createElement('div'); title.className = 'playlist-title'; title.textContent = g.genre;
      const subtitle = document.createElement('div'); subtitle.className = 'playlist-subtitle'; subtitle.textContent = `${g.count} tracks`;
      const actions = document.createElement('div'); actions.className = 'hero-genre-actions';
      const playBtn = document.createElement('button'); playBtn.className = 'action-btn primary'; playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      const radioBtn = document.createElement('button'); radioBtn.className = 'action-btn'; radioBtn.innerHTML = '<i class="fa-solid fa-broadcast-tower"></i>';
      const openBtn = document.createElement('button'); openBtn.className = 'action-btn'; openBtn.innerHTML = '<i class="fa-solid fa-ellipsis"></i>';

      playBtn.addEventListener('click', (e) => { e.stopPropagation(); const tracks = g.tracks.slice(); startPlaylist(tracks); });
      radioBtn.addEventListener('click', (e) => { e.stopPropagation(); const tracks = g.tracks.slice(); for (let i = tracks.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[tracks[i],tracks[j]]=[tracks[j],tracks[i]];} startPlaylist(tracks); shuffleEnabled = true; syncShuffleButton(); });
      openBtn.addEventListener('click', (e) => { e.stopPropagation(); showLibraryDetail(g.genre, g.tracks); });

      actions.appendChild(playBtn); actions.appendChild(radioBtn); actions.appendChild(openBtn);
      card.appendChild(title); card.appendChild(subtitle); card.appendChild(actions);
      card.addEventListener('click', () => showLibraryDetail(g.genre, g.tracks));
      heroesWrap.appendChild(card);
    });
    libraryTrackListEl.appendChild(heroesWrap);

    // Mood themes (re-use simple heuristics)
    const moodSection = document.createElement('div'); moodSection.className = 'genre-section';
    const moodTitle = document.createElement('h3'); moodTitle.className = 'section-heading'; moodTitle.textContent = 'Mood Themes';
    moodSection.appendChild(moodTitle);
    const moodsWrap = document.createElement('div'); moodsWrap.className = 'playlist-grid';
    const moods = [
      { name: 'Chill', filter: (t)=> (t.genre||'').toLowerCase().includes('ambient') || (t.genre||'').toLowerCase().includes('chill') || (t.genre||'').toLowerCase().includes('acoustic') },
      { name: 'Energetic', filter: (t)=> (t.genre||'').toLowerCase().includes('rock') || (t.genre||'').toLowerCase().includes('electronic') || (t.genre||'').toLowerCase().includes('dance') },
      { name: 'Focus', filter: (t)=> (t.genre||'').toLowerCase().includes('classical') || (t.genre||'').toLowerCase().includes('ambient') },
      { name: 'Party', filter: (t)=> (t.genre||'').toLowerCase().includes('hip') || (t.genre||'').toLowerCase().includes('pop') || (t.genre||'').toLowerCase().includes('dance') }
    ];
    moods.forEach((m) => {
      const matches = allTracks.filter(m.filter).slice(0, 12);
      const card = document.createElement('div'); card.className = 'playlist-card';
      const title = document.createElement('div'); title.className = 'playlist-title'; title.textContent = m.name;
      const subtitle = document.createElement('div'); subtitle.className = 'playlist-subtitle'; subtitle.textContent = `${matches.length} tracks`;
      const play = document.createElement('button'); play.className = 'action-btn'; play.innerHTML = '<i class="fa-solid fa-play"></i>';
      play.addEventListener('click', (e) => { e.stopPropagation(); if (matches.length) { const s = matches.slice(); for (let i=s.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s[i],s[j]]=[s[j],s[i]];} startPlaylist(s); } });
      card.appendChild(title); card.appendChild(subtitle); card.appendChild(play);
      card.addEventListener('click', () => { showLibraryDetail(m.name, matches); });
      moodsWrap.appendChild(card);
    });
    moodSection.appendChild(moodsWrap);
    libraryTrackListEl.appendChild(moodSection);

    // See all genres toggle
    const moreWrap = document.createElement('div'); moreWrap.style.marginTop = '12px';
    const moreBtn = document.createElement('button'); moreBtn.className = 'action-btn'; moreBtn.textContent = 'See all genres';
    let showingAll = false;
    const allGenresGrid = document.createElement('div'); allGenresGrid.className = 'playlist-grid'; allGenresGrid.style.marginTop = '12px';
    moreBtn.addEventListener('click', () => {
      showingAll = !showingAll;
      if (showingAll) {
        moreBtn.textContent = 'Hide genres';
        // populate full list
        allGenresGrid.innerHTML = '';
        genresByCount.forEach(g => {
          const card = document.createElement('div'); card.className = 'playlist-card';
          const t = document.createElement('div'); t.className = 'playlist-title'; t.textContent = g.genre;
          const s = document.createElement('div'); s.className = 'playlist-subtitle'; s.textContent = `${g.count} tracks`;
          const play = document.createElement('button'); play.className = 'action-btn'; play.innerHTML = '<i class="fa-solid fa-play"></i>';
          play.addEventListener('click', (e) => { e.stopPropagation(); const tracks = g.tracks.slice(); startPlaylist(tracks); });
          card.appendChild(t); card.appendChild(s); card.appendChild(play);
          card.addEventListener('click', () => showLibraryDetail(g.genre, g.tracks));
          allGenresGrid.appendChild(card);
        });
        libraryTrackListEl.appendChild(allGenresGrid);
      } else {
        moreBtn.textContent = 'See all genres';
        allGenresGrid.remove();
      }
    });
    moreWrap.appendChild(moreBtn);
    libraryTrackListEl.appendChild(moreWrap);
  }
}

function populateGenreOptions() {
  if (!libGenreSelect) return;
  const set = new Set();
  allTracks.forEach(t => {
    if (t.genre) set.add(t.genre);
    if (t.genres && Array.isArray(t.genres)) t.genres.forEach(g => { if (g) set.add(g); });
  });
  const genres = Array.from(set).sort((a,b) => String(a).localeCompare(b));
  libGenreSelect.innerHTML = '';
  const optAll = document.createElement('option'); optAll.value = ''; optAll.textContent = 'Select genre'; libGenreSelect.appendChild(optAll);
  genres.forEach(g => {
    const o = document.createElement('option'); o.value = g; o.textContent = g; libGenreSelect.appendChild(o);
  });
}

function renderSongsLibraryView() {
  if (!allTracks) return;
  let tracks = allTracks.slice();
  // filter
  const filter = libFilterSelect ? libFilterSelect.value : 'all';
  if (filter === 'liked') {
    tracks = tracks.filter(t => likedTrackIds.has(t.id));
  } else if (filter === 'downloaded') {
    tracks = tracks.filter(t => !!t.file);
  } else if (filter === 'genre') {
    const g = libGenreSelect ? libGenreSelect.value : '';
    if (g) {
      const low = g.toLowerCase();
      tracks = tracks.filter(t => ((t.genre||'').toLowerCase() === low) || (t.genres && t.genres.map(x => (x||'').toLowerCase()).includes(low)) );
    }
  }

  // sort
  const sort = libSortSelect ? libSortSelect.value : 'alpha';
  if (sort === 'alpha') {
    tracks.sort((a,b) => (a.title||'').localeCompare(b.title||''));
  } else if (sort === 'date') {
    tracks.sort((a,b) => (b.addedAt||0) - (a.addedAt||0));
  } else if (sort === 'pop') {
    tracks.sort((a,b) => ( (playCounts[String(b.id)]||0) - (playCounts[String(a.id)]||0) ));
  }

  libraryTrackListEl.innerHTML = '';
  renderTrackList(libraryTrackListEl, tracks);
}

function showLibraryDetail(name, tracks) {
  currentLibraryData = { name, tracks };
  libraryHeaderBar.style.display = "flex";
  libraryTitle.textContent = name;
  librarySubtitle.textContent = `${tracks.length} tracks`;
  renderTrackList(libraryTrackListEl, tracks);
}

let currentArtist = null;

let currentAlbum = null;

function showAlbumPage(albumName, tracks) {
  currentAlbum = { name: albumName };
  albumTitleEl.textContent = albumName;
  albumSubtitleEl.textContent = `${tracks.length} tracks`;
  albumTrackCountEl.textContent = `${tracks.length} tracks`;

  // Try to determine release year from tags or fallback to earliest addedAt
  let year = null;
  for (const t of tracks) {
    if (t.year) { year = t.year; break; }
    if (t.date) { try { year = new Date(t.date).getFullYear(); break; } catch(e){} }
  }
  if (!year && tracks.length) {
    const m = tracks.map(t => t.addedAt || 0).filter(Boolean);
    if (m.length) year = new Date(Math.min(...m)).getFullYear();
  }
  albumReleaseYearEl.textContent = `Year: ${year || 'Unknown'}`;

  // Render tracklist
  albumTracklistEl.innerHTML = '';
  if (tracks.length) {
    renderTrackList(albumTracklistEl, tracks);
  } else {
    albumTracklistEl.innerHTML = '<div class="muted" style="padding:12px;text-align:center;">No tracks</div>';
  }

  // Other albums by same artist
  albumOtherAlbumsEl.innerHTML = '';
  const artist = tracks[0] && tracks[0].artist;
  if (artist) {
    const map = new Map();
    allTracks.forEach(t => {
      if ((t.artist||'') !== artist) return;
      const a = t.album || 'Unknown';
      if (!map.has(a)) map.set(a, []);
      map.get(a).push(t);
    });
    for (const [a, trs] of map.entries()) {
      if (a === albumName) continue;
      const card = document.createElement('div');
      card.className = 'playlist-card';
      const art = document.createElement('img'); art.className = 'album-art'; art.src = getCoverUrl(trs[0]); art.onerror = () => { art.style.display = 'none'; };
      const title = document.createElement('div'); title.className = 'playlist-title'; title.textContent = a;
      const subtitle = document.createElement('div'); subtitle.className = 'playlist-subtitle'; subtitle.textContent = `${trs.length} tracks`;
      card.appendChild(art); card.appendChild(title); card.appendChild(subtitle);
      card.onclick = () => { showAlbumPage(a, trs); };
      albumOtherAlbumsEl.appendChild(card);
    }
  }

  // Wire play/shuffle
  if (albumPlayBtn) albumPlayBtn.onclick = () => { startPlaylist(tracks); };
  if (albumShuffleBtn) albumShuffleBtn.onclick = () => { const shuffled = tracks.slice(); for (let i = shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];} startPlaylist(shuffled); };

  switchView('album');
}

function showArtistPage(name, tracks) {
  currentArtist = name;
  // title and subtitle
  artistNameEl.textContent = name;
  artistSubtitle.textContent = `${tracks.length} tracks`;

  // Top songs: sort by playCounts then addedAt
  const ranked = tracks.slice().map(t => ({ t, c: playCounts[String(t.id)] || 0 })).sort((a,b) => (b.c - a.c) || ((b.t.addedAt||0) - (a.t.addedAt||0)) ).map(x=>x.t).slice(0,5);
  artistTopSongsEl.innerHTML = '';
  if (ranked.length) renderTrackList(artistTopSongsEl, ranked);
  else artistTopSongsEl.innerHTML = '<div class="muted" style="padding:12px;text-align:center;">No top songs yet</div>';

  // Albums
  const albumMap = new Map();
  tracks.forEach(t => {
    const key = t.album || 'Unknown';
    if (!albumMap.has(key)) albumMap.set(key, []);
    albumMap.get(key).push(t);
  });
  artistAlbumsEl.innerHTML = '';
  const albums = Array.from(albumMap.entries()).slice(0, 20);
  albums.forEach(([album, trs]) => {
    const card = document.createElement('div');
    card.className = 'playlist-card';
    const art = document.createElement('img');
    art.className = 'album-art';
    art.src = getCoverUrl(trs[0]);
    art.onerror = () => { art.style.display = 'none'; };
    const title = document.createElement('div');
    title.className = 'playlist-title';
    title.textContent = album;
    const subtitle = document.createElement('div');
    subtitle.className = 'playlist-subtitle';
    subtitle.textContent = `${trs.length} tracks`;
    card.appendChild(art);
    card.appendChild(title);
    card.appendChild(subtitle);
    card.onclick = () => { showLibraryDetail(album, trs); switchView('library'); };
    artistAlbumsEl.appendChild(card);
  });

  // Bio (placeholder)
  artistBioEl.textContent = `${name} — Short bio placeholder. This section can be expanded with real artist info later.`;

  // Related artists: simple heuristic by shared genres
  artistRelatedEl.innerHTML = '';
  const genreSet = new Set();
  tracks.forEach(t => { if (t.genre) genreSet.add((t.genre||'').toLowerCase()); if (t.genres) t.genres.forEach(g=>genreSet.add((g||'').toLowerCase())); });
  // build artist lists
  const otherMap = new Map();
  allTracks.forEach(t => {
    if ((t.artist||'') === name) return;
    const a = t.artist || 'Unknown';
    if (!otherMap.has(a)) otherMap.set(a, []);
    otherMap.get(a).push(t);
  });
  const scored = [];
  for (const [a, trs] of otherMap.entries()) {
    let score = 0;
    for (const tr of trs) {
      const g = (tr.genre||'').toLowerCase();
      if (g && genreSet.has(g)) score += 1;
      if (tr.genres) for (const gg of tr.genres) if (genreSet.has((gg||'').toLowerCase())) score += 1;
    }
    scored.push({ artist: a, count: trs.length, score });
  }
  scored.sort((a,b) => b.score - a.score || b.count - a.count);
  const related = scored.slice(0, 8).map(s => s.artist);
  if (related.length === 0) {
    artistRelatedEl.innerHTML = '<div class="muted" style="padding:12px;text-align:center;">No related artists</div>';
  } else {
    related.forEach((ra) => {
      const card = document.createElement('div');
      card.className = 'playlist-card';
      const title = document.createElement('div');
      title.className = 'playlist-title';
      title.textContent = ra;
      const subtitle = document.createElement('div');
      subtitle.className = 'playlist-subtitle';
      subtitle.textContent = `${otherMap.get(ra).length} tracks`;
      card.appendChild(title);
      card.appendChild(subtitle);
      card.onclick = () => { showArtistPage(ra, otherMap.get(ra)); };
      artistRelatedEl.appendChild(card);
    });
  }

  switchView('artist');
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
  menu.style.left = `${Math.min(window.innerWidth - 260, rect.right - 220)}px`;
  menu.style.top = `${rect.bottom + 10 + window.scrollY}px`;
  menu.style.width = '220px';
  menu.style.background = 'var(--bg-card)';
  menu.style.border = '1px solid var(--separator)';
  menu.style.borderRadius = '12px';
  menu.style.boxShadow = '0 12px 32px rgba(0,0,0,0.6)';
  menu.style.overflow = 'hidden';
  menu.style.fontSize = '15px';

  const btn = (text, icon, onClick) => {
    const it = document.createElement('button');
    it.className = 'context-menu-item';
    it.style.display = 'flex';
    it.style.alignItems = 'center';
    it.style.gap = '10px';
    it.style.width = '100%';
    it.style.padding = '14px 16px';
    it.style.background = 'transparent';
    it.style.border = 'none';
    it.style.color = 'var(--text)';
    it.style.cursor = 'pointer';
    it.style.fontSize = '15px';
    it.innerHTML = `<i class="fa-solid ${icon}" style="width:22px;text-align:center;font-size:18px;"></i><span style="flex:1;text-align:left">${text}</span>`;
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
    if (currentLibraryView === 'songs') renderSongsLibraryView();
    
    const action = likedTrackIds.has(track.id) ? "Liked" : "Unliked";
    showToast(`${action}: ${track.title}`, "fa-heart");
  } catch (err) {
    console.error(err);
  }
}

function refreshTrackViews() {
  if (!allTracks.length) return;
  const sortedByRecent = [...allTracks].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  const recent = sortedByRecent.slice(0, 3);
  if (homeRecentEl) renderTrackList(homeRecentEl, recent);
  
  if (currentLibraryView) {
    renderLibraryCategory(currentLibraryView);
  }

  // also render homepage sections that rely on playback state
  renderHomeSections();
}

function renderHomeSections() {
  // Recently Played: dedupe keeping most recent occurrence
  if (homeRecentlyPlayedEl) {
    const seen = new Set();
    const list = [];
    for (const entry of playHistory) {
      if (list.length >= 12) break;
      if (!entry || entry.id === undefined) continue;
      const id = entry.id;
      if (seen.has(id)) continue;
      const track = trackById.get(id);
      if (track) { list.push(track); seen.add(id); }
    }
    if (list.length) renderTrackList(homeRecentlyPlayedEl, list);
    else homeRecentlyPlayedEl.innerHTML = '<div class="muted" style="padding:20px;text-align:center;">No recently played</div>';
  }

  // Most Played
  if (homeMostPlayedEl) {
    const counts = Object.entries(playCounts || {}).map(([id, c]) => ({ id: Number(id), c }));
    counts.sort((a, b) => b.c - a.c);
    const list = counts.slice(0, 12).map((it) => trackById.get(it.id)).filter(Boolean);
    if (list.length) renderTrackList(homeMostPlayedEl, list);
    else homeMostPlayedEl.innerHTML = '<div class="muted" style="padding:20px;text-align:center;">No play data</div>';
  }

  // Suggested: mix of top played not recently played + random
  if (homeSuggestedEl) {
    const recentIds = new Set(playHistory.slice(0, 40).map((h) => h.id));
    const suggestions = [];
    // top played not in recent
    const top = Object.entries(playCounts || {}).map(([id, c]) => ({ id: Number(id), c })).sort((a,b)=>b.c-a.c);
    for (const t of top) {
      if (suggestions.length >= 8) break;
      if (recentIds.has(t.id)) continue;
      const tr = trackById.get(t.id);
      if (tr) suggestions.push(tr);
    }
    // fill with random if needed (limit suggestions to 5)
    const SUGGEST_LIMIT = 5;
    const pool = allTracks.filter((t) => !recentIds.has(t.id) && !suggestions.includes(t));
    while (suggestions.length < SUGGEST_LIMIT && pool.length) {
      const idx = Math.floor(Math.random() * pool.length);
      suggestions.push(pool.splice(idx,1)[0]);
    }
    if (suggestions.length) renderTrackList(homeSuggestedEl, suggestions);
    else homeSuggestedEl.innerHTML = '<div class="muted" style="padding:20px;text-align:center;">No suggestions yet</div>';
  }

  // Moods: build a few heuristic mood buckets based on genre
  if (homeMoodsEl) {
    homeMoodsEl.innerHTML = '';
    const moods = [
      { name: 'Chill', filter: (t)=> (t.genre||'').toLowerCase().includes('ambient') || (t.genre||'').toLowerCase().includes('chill') || (t.genre||'').toLowerCase().includes('acoustic') },
      { name: 'Energetic', filter: (t)=> (t.genre||'').toLowerCase().includes('rock') || (t.genre||'').toLowerCase().includes('electronic') || (t.genre||'').toLowerCase().includes('dance') },
      { name: 'Focus', filter: (t)=> (t.genre||'').toLowerCase().includes('classical') || (t.genre||'').toLowerCase().includes('ambient') },
      { name: 'Party', filter: (t)=> (t.genre||'').toLowerCase().includes('hip') || (t.genre||'').toLowerCase().includes('pop') || (t.genre||'').toLowerCase().includes('dance') }
    ];

    for (const mood of moods) {
      const matches = allTracks.filter(mood.filter).slice(0, 12);
      const card = document.createElement('div');
      card.className = 'playlist-card';
      const title = document.createElement('div');
      title.className = 'playlist-title';
      title.textContent = mood.name;
      const subtitle = document.createElement('div');
      subtitle.className = 'playlist-subtitle';
      subtitle.textContent = `${matches.length} tracks`;
      if (matches[0]) {
        const art = document.createElement('img');
        art.className = 'album-art';
        art.src = getCoverUrl(matches[0]);
        art.onerror = () => { art.style.display = 'none'; };
        card.appendChild(art);
      }
      card.appendChild(title);
      card.appendChild(subtitle);
      card.onclick = () => {
        showLibraryDetail(mood.name, matches.length ? matches : allTracks.slice(0,20));
        switchView('library');
      };
      homeMoodsEl.appendChild(card);
    }
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
    // ensure the library category heroes are hidden when leaving library
    if (libraryCategoriesEl) libraryCategoriesEl.style.display = 'grid';
  } else {
    // entering library root: show category hero cards when no specific subview selected
    if (!currentLibraryView) {
      if (libraryCategoriesEl) libraryCategoriesEl.style.display = 'grid';
      if (libraryTrackListEl) libraryTrackListEl.innerHTML = '';
      if (libraryHeaderBar) libraryHeaderBar.style.display = 'none';
    }
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
      return;
    }
    if (currentArtist) {
      // go back to library view
      currentArtist = null;
      switchView('library');
    }
  });
}

if (artistBackBtn) {
  artistBackBtn.addEventListener('click', () => {
    currentArtist = null;
    switchView('library');
  });
}

if (albumBackBtn) {
  albumBackBtn.addEventListener('click', () => {
    currentAlbum = null;
    switchView('library');
  });
}

// Library controls event wiring
if (libSortSelect) libSortSelect.addEventListener('change', () => renderSongsLibraryView());
if (libFilterSelect) libFilterSelect.addEventListener('change', () => {
  if (libFilterSelect.value === 'genre') {
    if (libGenreWrap) libGenreWrap.style.display = 'flex';
    populateGenreOptions();
  } else {
    if (libGenreWrap) libGenreWrap.style.display = 'none';
  }
  renderSongsLibraryView();
});
if (libGenreSelect) libGenreSelect.addEventListener('change', () => renderSongsLibraryView());

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

// Settings modal handlers
if (btnSettings && settingsModal) {
  btnSettings.addEventListener('click', () => {
    settingsModal.setAttribute('aria-hidden', 'false');
  });
}

if (settingsModalClose) {
  settingsModalClose.addEventListener('click', () => {
    settingsModal.setAttribute('aria-hidden', 'true');
  });
}

if (settingsModalBackdrop) {
  settingsModalBackdrop.addEventListener('click', () => {
    settingsModal.setAttribute('aria-hidden', 'true');
  });
}

// wire quality select changes
if (optQualitySelect) {
  optQualitySelect.addEventListener('change', () => {
    saveSettings();
  });
}

if (btnRescanLibrary) {
  btnRescanLibrary.addEventListener('click', async () => {
    try {
      // quick UX: reload tracks from server
      await loadTracks();
      updateQualityOptionsVisibility();
      refreshTrackViews();
      showToast('Library rescanned', 'fa-check');
    } catch (e) {
      console.error('Rescan failed', e);
      showToast('Rescan failed', 'fa-xmark');
    }
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
  // update quality option visibility when tracks load
  try { updateQualityOptionsVisibility(); } catch (e) {}
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
  // restore persisted playback history and counts so homepage sections survive reload
  loadPlaybackState();
  // restore settings
  loadSettings();
  refreshTrackViews();
  syncShuffleButton();
  syncRepeatButton();
  updateStats();
}

init().catch(console.error);
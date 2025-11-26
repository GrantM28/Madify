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
const btnLikeNow = document.getElementById("btnLikeNow");
const iconLikeNow = document.getElementById("iconLikeNow");
const iconPlayPause = document.getElementById("iconPlayPause");

const seekBar = document.getElementById("seekBar");
const timeCurrentEl = document.getElementById("timeCurrent");
const timeTotalEl = document.getElementById("timeTotal");

const btnCreatePlaylistTop = document.getElementById("btnCreatePlaylistTop");
const createPlaylistModal = document.getElementById("createPlaylistModal");
const createPlaylistBackdrop = document.getElementById("createPlaylistBackdrop");
const createPlaylistClose = document.getElementById("createPlaylistClose");
const newPlaylistNameInput = document.getElementById("newPlaylistName");
const btnCreatePlaylist = document.getElementById("btnCreatePlaylist");

const playlistModal = document.getElementById("playlistModal");
const playlistModalList = document.getElementById("playlistModalList");
const playlistModalClose = document.getElementById("playlistModalClose");
const playlistModalBackdrop = document.getElementById("playlistModalBackdrop");
const playlistModalNewName = document.getElementById("playlistModalNewName");
const playlistModalCreate = document.getElementById("playlistModalCreate");

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

function getCoverUrl(track) {
  return `/api/cover?file=${encodeURIComponent(track.file)}`;
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
  } else {
    iconLikeNow.classList.remove("fa-solid");
    iconLikeNow.classList.add("fa-regular");
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

  player.src = url;
  player.play().catch((err) => console.error("Play error:", err));
  
  updateMiniPlayer(track);
  updateMediaSession(track, cover);
  document.title = `${track.title} – ${track.artist || "Madify"}`;
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

// ---------- Player Events ----------

player.addEventListener("ended", () => {
  if (shuffleEnabled && !playQueue) {
    playRandomTrackFromAll();
  } else {
    playNextInQueue();
  }
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
  timeTotalEl.textContent = formatTime(player.duration || 0);
});

player.addEventListener("timeupdate", () => {
  if (player.duration) {
    const pct = (player.currentTime / player.duration) * 100;
    seekBar.value = pct;
    timeCurrentEl.textContent = formatTime(player.currentTime);
    timeTotalEl.textContent = formatTime(player.duration);
    
    // Update mini player progress
    if (miniProgress) {
      miniProgress.style.width = `${pct}%`;
    }
  }
});

seekBar.addEventListener("input", () => {
  if (!player.duration) return;
  const pct = parseFloat(seekBar.value) / 100;
  player.currentTime = pct * player.duration;
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

    container.appendChild(row);
  });
}

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
}

function closePlaylistDetail() {
  const detail = document.getElementById("playlistDetail");
  if (!detail) return;
  detail.style.display = "none";
  currentOpenedPlaylist = null;
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
  if (!playlistModal) return;
  playlistModal.setAttribute("aria-hidden", "true");
  playlistModalList.innerHTML = "";
  playlistModalNewName.value = "";
}

function openPlaylistModal(track) {
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

  // Reset library view when switching away
  if (viewId !== "library") {
    currentLibraryView = null;
    currentLibraryData = null;
    if (libraryHeaderBar) libraryHeaderBar.style.display = "none";
  }
  
  // Close playlist detail when switching views
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

// Library category buttons
document.querySelectorAll(".category-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const category = btn.dataset.lib;
    renderLibraryCategory(category);
  });
});

// Library back button
if (libraryBackBtn) {
  libraryBackBtn.addEventListener("click", () => {
    if (currentLibraryView) {
      renderLibraryCategory(currentLibraryView);
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

if (playlistModalClose) playlistModalClose.addEventListener("click", closePlaylistModal);
if (playlistModalBackdrop) playlistModalBackdrop.addEventListener("click", closePlaylistModal);

if (playlistModalCreate) {
  playlistModalCreate.addEventListener("click", async () => {
    const name = playlistModalNewName.value && playlistModalNewName.value.trim();
    if (!name) return;
    try {
      const pl = await createPlaylistOnServer(name);
      if (currentTrack) await addTrackToPlaylistOnServer(pl.id, currentTrack.id);
      closePlaylistModal();
    } catch (err) {
      console.error(err);
    }
  });
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
    if (playQueue) {
      playPreviousInQueue();
    }
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
    btnShuffle.style.color = shuffleEnabled ? "var(--accent)" : "var(--text)";
  });
}

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
  miniPlayer.style.display = "none";
  await loadTracks();
  await loadPlaylists();
  refreshTrackViews();
}

init().catch(console.error);
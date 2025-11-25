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
const btnAddNow = document.getElementById("btnAddNow");

// Modal elements
const playlistModal = document.getElementById("playlistModal");
const playlistModalList = document.getElementById("playlistModalList");
const playlistModalClose = document.getElementById("playlistModalClose");
const playlistModalBackdrop = document.getElementById("playlistModalBackdrop");
const playlistModalNewName = document.getElementById("playlistModalNewName");
const playlistModalCreate = document.getElementById("playlistModalCreate");

const views = {
  home: document.getElementById("view-home"),
  library: document.getElementById("view-library"),
  playlists: document.getElementById("view-playlists"),
  dj: document.getElementById("view-dj")
};

// Library header elements
const libraryBackBtn = document.getElementById('libraryBackBtn');
const libraryTitle = document.getElementById('libraryTitle');
const librarySubtitle = document.getElementById('librarySubtitle');
const libraryCount = document.getElementById('libraryCount');

// Library submenu / state
const navLibraryBtn = document.getElementById("navLibraryBtn");
const librarySubmenu = document.getElementById("librarySubmenu");
let currentLibrarySection = "recent"; // default when opening library

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

// Simple toast/snackbar helper
function showToast(message, type = "info", duration = 3000) {
  try {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<div class="toast-icon">${
      type === "success" ? '<i class="fa-solid fa-check"></i>' : type === "error" ? '<i class="fa-solid fa-circle-exclamation"></i>' : '<i class="fa-solid fa-info"></i>'
    }</div><div class="toast-text">${message}</div>`;
    container.appendChild(el);
    // animate in
    requestAnimationFrame(() => el.classList.add("show"));
    const t = setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 220);
    }, duration);
    el.addEventListener("click", () => {
      clearTimeout(t);
      el.classList.remove("show");
      setTimeout(() => el.remove(), 120);
    });
  } catch (e) {
    console.warn("Toast error", e);
  }
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
  if (btnPlayPause) btnPlayPause.classList.add('playing');
});

player.addEventListener("pause", () => {
  if (!iconPlayPause) return;
  iconPlayPause.classList.remove("fa-pause");
  iconPlayPause.classList.add("fa-play");
  if (btnPlayPause) btnPlayPause.classList.remove('playing');
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
    // indicate if this track exists in any playlist
    const inAny = playlists.some((p) => (p.trackIds || []).some((id) => id == track.id));
    if (inAny) {
      addBtn.classList.add('in-playlist');
      addBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
      addBtn.title = 'Already in a playlist';
    } else {
      addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
      addBtn.title = 'Add to playlist';
    }
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

// Render helpers for Library categories
function renderLibrarySection(section) {
  // ensure library view is visible
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
  if (navLibraryBtn) navLibraryBtn.classList.add('active');
  switchView('library');

  currentLibrarySection = section;
  if (!libraryTrackListEl) return;
  if (section === 'recent') {
    const sorted = [...allTracks].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    const list = sorted.slice(0, 200);
    setLibraryHeader('Recently Added', 'Newest tracks', list.length, false);
    renderTrackList(libraryTrackListEl, list);
  } else if (section === 'songs') {
    setLibraryHeader('Songs', 'All songs', allTracks.length, false);
    renderTrackList(libraryTrackListEl, allTracks);
  } else if (section === 'artists') {
    // group by artist
    const map = new Map();
    allTracks.forEach((t) => {
      const key = t.artist || 'Unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    const artists = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
    libraryTrackListEl.innerHTML = '';
    setLibraryHeader('Artists', 'Browse by artist', artists.length, false);
    artists.forEach((artist) => {
      const item = document.createElement('div');
      item.className = 'playlist-card';
      const title = document.createElement('div');
      title.className = 'playlist-title';
      title.textContent = artist;
      const subtitle = document.createElement('div');
      subtitle.className = 'playlist-subtitle';
      subtitle.textContent = `${map.get(artist).length} track${map.get(artist).length !== 1 ? 's' : ''}`;
      item.appendChild(title);
      item.appendChild(subtitle);
      item.onclick = () => {
        setLibraryHeader(artist, `${map.get(artist).length} track${map.get(artist).length !== 1 ? 's' : ''}`, map.get(artist).length, true, () => renderLibrarySection('artists'));
        renderTrackList(libraryTrackListEl, map.get(artist));
      };
      libraryTrackListEl.appendChild(item);
    });
  } else if (section === 'albums') {
    const map = new Map();
    allTracks.forEach((t) => {
      const key = (t.album || 'Unknown') + '|' + (t.artist || '');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    const albums = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    libraryTrackListEl.innerHTML = '';
    setLibraryHeader('Albums', 'Browse by album', albums.length, false);
    albums.forEach(([key, tracks]) => {
      const [album, artist] = key.split('|');
      const item = document.createElement('div');
      item.className = 'playlist-card';
      // album art (from first track)
      const art = document.createElement('img');
      art.className = 'album-art';
      art.src = getCoverUrl(tracks[0]);
      art.onerror = () => { art.style.display = 'none'; };
      item.appendChild(art);
      const title = document.createElement('div');
      title.className = 'playlist-title';
      title.textContent = album;
      const subtitle = document.createElement('div');
      subtitle.className = 'playlist-subtitle';
      subtitle.textContent = artist ? artist : 'Various Artists';
      const chip = document.createElement('div');
      chip.className = 'playlist-chip';
      chip.textContent = `${tracks.length} track${tracks.length !== 1 ? 's' : ''}`;
      item.appendChild(title);
      item.appendChild(subtitle);
      item.appendChild(chip);
      item.onclick = () => {
        setLibraryHeader(album, `${tracks.length} track${tracks.length !== 1 ? 's' : ''}`, tracks.length, true, () => renderLibrarySection('albums'));
        renderTrackList(libraryTrackListEl, tracks);
      };
      libraryTrackListEl.appendChild(item);
    });
  } else if (section === 'genres') {
    const map = new Map();
    allTracks.forEach((t) => {
      const g = (t.genre || (t.genres && t.genres[0]) || 'Unknown');
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(t);
    });
    const genres = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
    libraryTrackListEl.innerHTML = '';
    setLibraryHeader('Genres', 'Browse by genre', genres.length, false);
    genres.forEach((g) => {
      const item = document.createElement('div');
      item.className = 'playlist-card';
      const title = document.createElement('div');
      title.className = 'playlist-title';
      title.textContent = g;
      const subtitle = document.createElement('div');
      subtitle.className = 'playlist-subtitle';
      subtitle.textContent = `${map.get(g).length} track${map.get(g).length !== 1 ? 's' : ''}`;
      item.appendChild(title);
      item.appendChild(subtitle);
      item.onclick = () => {
        setLibraryHeader(g, `${map.get(g).length} track${map.get(g).length !== 1 ? 's' : ''}`, map.get(g).length, true, () => renderLibrarySection('genres'));
        renderTrackList(libraryTrackListEl, map.get(g));
      };
      libraryTrackListEl.appendChild(item);
    });
  }
}

// library header helper
let libraryBackCallback = null;
function setLibraryHeader(title, subtitle, count, showBack, backCb) {
  if (libraryTitle) libraryTitle.textContent = title || 'Library';
  if (librarySubtitle) librarySubtitle.textContent = subtitle || '';
  if (libraryCount) libraryCount.textContent = count ? `${count} item${count !== 1 ? 's' : ''}` : '';
  if (libraryBackBtn) {
    if (showBack) {
      libraryBackBtn.style.display = 'inline-flex';
      libraryBackCallback = backCb || null;
      libraryBackBtn.onclick = () => { if (libraryBackCallback) libraryBackCallback(); };
    } else {
      libraryBackBtn.style.display = 'none';
      libraryBackCallback = null;
      libraryBackBtn.onclick = null;
    }
  }
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    showToast(err && err.error ? err.error : "Failed to create playlist", "error");
    throw new Error("Failed to create playlist");
  }
  const pl = await res.json();
  // reload playlists and update UI so the new playlist appears everywhere
  await loadPlaylists();
  renderAllPlaylistsUI();
  showToast(`Playlist "${pl.name}" created`, "success");
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
      const err = await res.json().catch(() => ({}));
      showToast(err && err.error ? err.error : "Failed to add track", "error");
      throw new Error("Failed to add track");
    }
    const pl = await res.json();
    // update local cache and UI
    await loadPlaylists();
    renderAllPlaylistsUI();
    refreshTrackViews();
    showToast("Added to playlist", "success");
    return pl;
  } catch (err) {
    console.error("addTrackToPlaylistOnServer error:", err);
    throw err;
  }
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err && err.error ? err.error : "Failed to toggle like", "error");
      return null;
    }
    const pl = await res.json();

    const idx = playlists.findIndex((p) => p.id === pl.id);
    if (idx !== -1) playlists[idx] = pl;
    else playlists.push(pl);

    likedTrackIds = new Set(pl.trackIds || []);
    renderAllPlaylistsUI();
    refreshTrackViews();
    syncLikeNowButton();
    const liked = likedTrackIds.has(track.id);
    showToast(liked ? "Added to Liked Songs" : "Removed from Liked Songs", liked ? "success" : "info");
    return pl;
  } catch (err) {
    console.error(err);
    showToast("Failed to update liked songs.", "error");
    return null;
  }
}

function refreshTrackViews() {
  if (!allTracks.length) return;
  const sortedByRecent = [...allTracks].sort(
    (a, b) => (b.addedAt || 0) - (a.addedAt || 0)
  );
  const recent = sortedByRecent.slice(0, 10);
  if (homeRecentEl) renderTrackList(homeRecentEl, recent);
  // Re-render the current library section so UI updates (likes, playlist markers)
  if (libraryTrackListEl) renderLibrarySection(currentLibrarySection || 'songs');
}

// Prompt-based "Add to playlist" flow
async function openAddToPlaylist(track) {
  // Open modal-based playlist picker
  if (!track) return;
  openPlaylistModal(track);
}

function closePlaylistModal() {
  if (!playlistModal) return;
  playlistModal.classList.remove("open");
  playlistModal.setAttribute("aria-hidden", "true");
  playlistModalList.innerHTML = "";
  playlistModalNewName.value = "";
}

function openPlaylistModal(track) {
  if (!playlistModal) return;
  playlistModal.classList.add("open");
  playlistModal.setAttribute("aria-hidden", "false");
  playlistModalList.innerHTML = "";

  const nonSystemPlaylists = playlists.filter((p) => p.id !== "liked");

  if (nonSystemPlaylists.length === 0) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.textContent = "No playlists yet — create one below.";
    playlistModalList.appendChild(empty);
  } else {
    nonSystemPlaylists.forEach((pl) => {
      const item = document.createElement("div");
      item.className = "modal-item";
      const nameWrap = document.createElement('div');
      nameWrap.textContent = pl.name;
      const right = document.createElement("div");
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '0.6rem';

      const count = document.createElement("div");
      count.className = "muted";
      count.style.fontSize = "0.85rem";
      count.textContent = `${(pl.trackIds || []).length} track${(pl.trackIds || []).length !== 1 ? "s" : ""}`;

      const already = (pl.trackIds || []).some((id) => id == track.id);
      const statusIcon = document.createElement('i');
      statusIcon.style.width = '18px';
      if (already) {
        statusIcon.className = 'fa-solid fa-check';
        item.classList.add('in-playlist');
      } else {
        statusIcon.className = 'fa-solid fa-circle-plus';
      }

      right.appendChild(count);
      right.appendChild(statusIcon);

      item.appendChild(nameWrap);
      item.appendChild(right);

      if (!already) {
        item.addEventListener("click", async () => {
          try {
            await addTrackToPlaylistOnServer(pl.id, track.id);
            // update UI: mark as added
            statusIcon.className = 'fa-solid fa-check';
            item.classList.add('in-playlist');
            // refresh playlists and tracks UI
            renderAllPlaylistsUI();
            refreshTrackViews();
          } catch (err) {
            console.error(err);
            showToast("Failed to add track to playlist.", "error");
          }
        });
      }

      playlistModalList.appendChild(item);
    });
  }
}

// Wire modal controls
if (playlistModalClose) playlistModalClose.addEventListener("click", closePlaylistModal);
if (playlistModalBackdrop) playlistModalBackdrop.addEventListener("click", closePlaylistModal);
if (playlistModalCreate) {
  playlistModalCreate.addEventListener("click", async () => {
    const name = playlistModalNewName.value && playlistModalNewName.value.trim();
    if (!name) return;
    try {
      const pl = await createPlaylistOnServer(name);
      playlists.push(pl);
      // if modal was opened, assume user wants to add current track
      if (currentTrack) await addTrackToPlaylistOnServer(pl.id, currentTrack.id);
      renderAllPlaylistsUI();
      closePlaylistModal();
    } catch (err) {
      console.error(err);
      showToast("Failed to create playlist.", "error");
    }
  });
}

if (btnAddNow) {
  btnAddNow.addEventListener("click", () => {
    if (!currentTrack) return;
    openPlaylistModal(currentTrack);
  });
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

// Library submenu wiring
if (navLibraryBtn && librarySubmenu) {
  navLibraryBtn.addEventListener('click', (e) => {
    // toggle submenu
    const open = navLibraryBtn.classList.toggle('active');
    // toggle nav-group class to show submenu (CSS uses .nav-group.open)
    const group = navLibraryBtn.parentElement;
    if (group && group.classList) group.classList.toggle('open', open);
    // default open to recently added when activating
    if (open) renderLibrarySection(currentLibrarySection || 'recent');
    else switchView('home');
  });

  librarySubmenu.querySelectorAll('.submenu-item').forEach((it) => {
    it.addEventListener('click', (e) => {
      const section = it.dataset.lib;
      renderLibrarySection(section);
      // close submenu after selection
      navLibraryBtn.classList.remove('active');
      const group = navLibraryBtn.parentElement;
      if (group && group.classList) group.classList.remove('open');
    });
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
  refreshTrackViews();
}

async function init() {
  player.volume = 1;
  setNowPlaying(null, null);
  await loadTracks();
  await loadPlaylists();
  refreshTrackViews();
}

init().catch(console.error);

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

// ---------- Fullscreen Now Playing ----------
function updateFullScreenNowPlaying(track, coverUrl) {
  const art = document.getElementById('nowFullArt');
  const title = document.getElementById('nowFullTitle');
  const artist = document.getElementById('nowFullArtist');
  const playIcon = document.getElementById('nowFullPlayIcon');
  if (!title || !artist) return;
  if (!track) {
    title.textContent = 'Nothing playing';
    artist.textContent = '';
    if (art) art.src = '';
    if (playIcon) { playIcon.classList.remove('fa-pause'); playIcon.classList.add('fa-play'); }
    return;
  }
  title.textContent = track.title;
  artist.textContent = track.artist || track.album || '';
  if (art && coverUrl) art.src = coverUrl;
  // sync play icon
  if (playIcon) {
    if (player && !player.paused) { playIcon.classList.remove('fa-play'); playIcon.classList.add('fa-pause'); }
    else { playIcon.classList.remove('fa-pause'); playIcon.classList.add('fa-play'); }
  }
}

function renderFullQueue() {
  const el = document.getElementById('nowFullQueueList');
  if (!el) return;
  el.innerHTML = '';
  if (!playQueue || !playQueue.length) {
    el.innerHTML = '<div class="muted">Queue is empty</div>';
    return;
  }
  playQueue.forEach((t, idx) => {
    const row = document.createElement('div');
    row.className = 'track-row';
    row.style.padding = '0.4rem';
    const title = document.createElement('div');
    title.textContent = `${t.title}`;
    title.style.flex = '1';
    const play = document.createElement('button');
    play.className = 'play-pill';
    play.textContent = 'Play';
    play.onclick = (e) => { e.stopPropagation(); queueIndex = idx; startPlaylist(playQueue); closeNowPlayingFull('other'); };
    row.appendChild(title);
    row.appendChild(play);
    el.appendChild(row);
  });
}

let _nowFullTouch = { startY: 0, currentY: 0, dragging: false };
function openNowPlayingFull() {
  const wrap = document.getElementById('nowFull');
  const content = document.getElementById('nowFullContent');
  if (!wrap || !content) return;
  // Only open full-screen when there is an active playing track
  if (!currentTrack) return;
  if (player && player.paused) return;
  updateFullScreenNowPlaying(currentTrack, currentTrack ? getCoverUrl(currentTrack) : null);
  renderFullQueue();
  wrap.classList.add('open');
  wrap.setAttribute('aria-hidden', 'false');

  // hide the mini player while full screen is visible
  try { const mini = document.querySelector('footer.player-bar'); if (mini) mini.style.display = 'none'; } catch (e) {}

  // touch handlers for swipe down
  content.addEventListener('touchstart', _nowFullTouchStart, { passive: true });
  content.addEventListener('touchmove', _nowFullTouchMove, { passive: false });
  content.addEventListener('touchend', _nowFullTouchEnd);
  // pointer fallback
  content.addEventListener('pointerdown', _nowFullPointerDown);
}

function closeNowPlayingFull(reason = 'other') {
  const wrap = document.getElementById('nowFull');
  const content = document.getElementById('nowFullContent');
  if (!wrap || !content) return;
  wrap.classList.remove('open');
  wrap.setAttribute('aria-hidden', 'true');
  content.style.transform = '';
  content.classList.remove('dragging');
  // remove handlers
  content.removeEventListener('touchstart', _nowFullTouchStart);
  content.removeEventListener('touchmove', _nowFullTouchMove);
  content.removeEventListener('touchend', _nowFullTouchEnd);
  content.removeEventListener('pointerdown', _nowFullPointerDown);

  // show mini player only when dismissed via swipe
  try {
    const mini = document.querySelector('footer.player-bar');
    if (mini) {
      if (reason === 'swipe') mini.style.display = '';
      else mini.style.display = 'none';
    }
  } catch (e) { console.error('closeNowPlayingFull display toggle', e); }
}

function _nowFullTouchStart(ev) {
  const t = ev.touches[0];
  _nowFullTouch.startY = t.clientY;
  _nowFullTouch.currentY = t.clientY;
  _nowFullTouch.dragging = true;
}

function _nowFullTouchMove(ev) {
  if (!_nowFullTouch.dragging) return;
  const t = ev.touches[0];
  _nowFullTouch.currentY = t.clientY;
  const dy = Math.max(0, _nowFullTouch.currentY - _nowFullTouch.startY);
  const content = document.getElementById('nowFullContent');
  if (content) {
    content.classList.add('dragging');
    content.style.transform = `translateY(${dy}px)`;
    if (dy > 10) ev.preventDefault();
  }
}

function _nowFullTouchEnd() {
  if (!_nowFullTouch.dragging) return;
  const dy = Math.max(0, _nowFullTouch.currentY - _nowFullTouch.startY);
  _nowFullTouch.dragging = false;
  const content = document.getElementById('nowFullContent');
  if (content) {
    content.classList.remove('dragging');
    content.style.transform = '';
  }
  if (dy > 120) {
    closeNowPlayingFull('swipe');
  }
}

function _nowFullPointerDown(ev) {
  const content = document.getElementById('nowFullContent');
  if (!content) return;
  let startY = ev.clientY;
  const onMove = (e) => {
    const dy = Math.max(0, e.clientY - startY);
    content.classList.add('dragging');
    content.style.transform = `translateY(${dy}px)`;
  };
  const onUp = (e) => {
    const dy = Math.max(0, e.clientY - startY);
    content.classList.remove('dragging');
    content.style.transform = '';
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (dy > 120) closeNowPlayingFull('swipe');
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp, { once: true });
}

// wire fullscreen controls after DOM ready
function setupFullScreenHandlers() {
  const art = document.getElementById('nowFullArt');
  const play = document.getElementById('nowFullPlay');
  const prev = document.getElementById('nowFullPrev');
  const next = document.getElementById('nowFullNext');
  const close = document.getElementById('nowFullClose');
  const queueBtn = document.getElementById('nowFullQueue');
  const shuffleBtn = document.getElementById('nowFullShuffle');
  const queueList = document.getElementById('nowFullQueueList');

  if (art) art.addEventListener('click', () => openNowPlayingFull());
  if (play) play.addEventListener('click', (e) => {
    e.stopPropagation();
    if (player.paused) player.play(); else player.pause();
  });
  if (prev) prev.addEventListener('click', (e) => { e.stopPropagation(); playPreviousInQueue(); });
  if (next) next.addEventListener('click', (e) => { e.stopPropagation(); playNextInQueueOrShuffle(); });
  if (close) close.addEventListener('click', (e) => { e.stopPropagation(); closeNowPlayingFull('other'); });
  if (queueBtn) queueBtn.addEventListener('click', (e) => { e.stopPropagation(); if (!queueList) return; queueList.style.display = (queueList.style.display === 'none' || !queueList.style.display) ? 'block' : 'none'; renderFullQueue(); });
  if (shuffleBtn) shuffleBtn.addEventListener('click', (e) => { e.stopPropagation(); shuffleEnabled = !shuffleEnabled; shuffleBtn.classList.toggle('player-btn-active', shuffleEnabled); });
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
  // show mini player only when a track is playing
  try {
    const mini = document.querySelector('footer.player-bar');
    if (mini) {
      if (track && player && !player.paused) mini.style.display = '';
      else mini.style.display = 'none';
    }
  } catch (e) {}
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

// Toasts removed — no-op for user preference

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
  // sync fullscreen play icon
  const fIcon = document.getElementById('nowFullPlayIcon');
  if (fIcon) { fIcon.classList.remove('fa-play'); fIcon.classList.add('fa-pause'); }
  // show mini player when playback starts (if fullscreen isn't open)
  try {
    const wrap = document.getElementById('nowFull');
    const mini = document.querySelector('footer.player-bar');
    if (mini && (!wrap || !wrap.classList.contains('open'))) mini.style.display = '';
  } catch (e) {}
});

player.addEventListener("pause", () => {
  if (!iconPlayPause) return;
  iconPlayPause.classList.remove("fa-pause");
  iconPlayPause.classList.add("fa-play");
  if (btnPlayPause) btnPlayPause.classList.remove('playing');
  const fIcon = document.getElementById('nowFullPlayIcon');
  if (fIcon) { fIcon.classList.remove('fa-pause'); fIcon.classList.add('fa-play'); }
  // hide mini player when paused
  try { const mini = document.querySelector('footer.player-bar'); if (mini) mini.style.display = 'none'; } catch (e) {}
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
    // update visual progress background
    if (seekBar && seekBar.style) {
      seekBar.style.background = `linear-gradient(90deg, var(--accent) ${pct}%, #333 ${pct}%)`;
    }
  }
});

seekBar.addEventListener("input", () => {
  if (!player.duration) return;
  const pct = parseFloat(seekBar.value) / 100;
  player.currentTime = pct * player.duration;
  // reflect seeking visually
  const v = parseFloat(seekBar.value) || 0;
  if (seekBar && seekBar.style) seekBar.style.background = `linear-gradient(90deg, var(--accent) ${v}%, #333 ${v}%)`;
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
    // indicate if this track exists in any non-system playlist (exclude 'liked')
    const inAny = playlists.some((p) => p.id !== 'liked' && (p.trackIds || []).some((id) => id == track.id));
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

  // If rendering for the home view, show only a few playlists (preview)
  const isHome = container && container.id === 'homePlaylists';
  const display = isHome ? sorted.slice(0, 6) : sorted;

  display.forEach((pl) => {
    const tracks = resolvePlaylistTracks(pl);

    const card = document.createElement("div");
    card.className = "playlist-card";
    // attach playlist id for delegated event handling
    card.dataset.plId = pl.id;

    // header: title + more button
    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.alignItems = 'center';

    const title = document.createElement("div");
    title.className = "playlist-title";
    title.textContent = pl.name;

    const moreBtn = document.createElement('button');
    moreBtn.className = 'more-btn';
    moreBtn.innerHTML = '<i class="fa-solid fa-ellipsis"></i>';

    headerRow.appendChild(title);
    headerRow.appendChild(moreBtn);
    card.appendChild(headerRow);

    // menu (hidden by default)
    const menu = document.createElement('div');
    menu.className = 'playlist-menu';
    menu.style.display = 'none';
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    // hide edit/delete for system playlist 'liked'
    if (pl.id === 'liked') {
      editBtn.disabled = true;
      delBtn.disabled = true;
      editBtn.style.opacity = '0.5';
      delBtn.style.opacity = '0.5';
    }
    menu.appendChild(editBtn);
    menu.appendChild(delBtn);
    card.appendChild(menu);

    const subtitle = document.createElement("div");
    subtitle.className = "playlist-subtitle";
    subtitle.textContent = `${tracks.length} track${tracks.length !== 1 ? "s" : ""}`;

    const chip = document.createElement("div");
    chip.className = "playlist-chip";
    chip.textContent = pl.id === "liked" ? "Liked songs" : "Your Playlist";

    card.appendChild(subtitle);
    card.appendChild(chip);

    card.onclick = () => {
      if (!tracks.length) return;
      // Open playlist detail view instead of auto-playing
      openPlaylistDetail(pl);
    };

    container.appendChild(card);
  });
}

// Handle menu actions: edit & delete
function setupPlaylistCardActions() {
  // Use delegated event handling attached once to document to improve reliability (mobile/touch)
  if (window._playlistDelegationInitialized) return;
  window._playlistDelegationInitialized = true;

  document.addEventListener('click', async (e) => {
    const more = e.target.closest('.more-btn');
    const menuBtn = e.target.closest('.playlist-menu button');
    const card = e.target.closest('.playlist-card');

    // Handle more button toggle
    if (more) {
      e.stopPropagation();
      const cardEl = more.closest('.playlist-card');
      if (!cardEl) return;
      const menu = cardEl.querySelector('.playlist-menu');
      if (!menu) return;
      // hide other menus
      document.querySelectorAll('.playlist-menu').forEach((m) => {
        if (m !== menu) m.style.display = 'none';
      });
      menu.style.display = (menu.style.display === 'flex') ? 'none' : 'flex';
      return;
    }

    // Handle clicks on menu buttons (Edit / Delete)
    if (menuBtn) {
      e.stopPropagation();
      const menu = menuBtn.closest('.playlist-menu');
      const cardEl = menuBtn.closest('.playlist-card');
      if (!cardEl || !menu) return;
      const plId = cardEl.dataset.plId;
      const pl = playlists.find((p) => p.id === plId);
      // determine which button (index) was clicked
      const buttons = Array.from(menu.querySelectorAll('button'));
      const idx = buttons.indexOf(menuBtn);
      menu.style.display = 'none';

      // Edit
      if (idx === 0) {
        if (!pl || pl.id === 'liked') return;
        const titleEl = cardEl.querySelector('.playlist-title');
        if (!titleEl) return;
        const input = document.createElement('input');
        input.className = 'edit-input';
        input.value = pl.name;
        titleEl.replaceWith(input);
        const actions = document.createElement('div');
        actions.className = 'edit-actions';
        const save = document.createElement('button');
        save.className = 'create-button';
        save.textContent = 'Save';
        const cancel = document.createElement('button');
        cancel.className = 'create-button';
        cancel.textContent = 'Cancel';
        actions.appendChild(save);
        actions.appendChild(cancel);
        cardEl.insertBefore(actions, cardEl.querySelector('.playlist-subtitle'));

        cancel.addEventListener('click', () => {
          const restored = document.createElement('div');
          restored.className = 'playlist-title';
          restored.textContent = pl.name;
          input.replaceWith(restored);
          actions.remove();
        });

        save.addEventListener('click', async () => {
          const newName = input.value && input.value.trim();
          if (!newName) return;
          try {
            const res = await fetch(`/api/playlists/${encodeURIComponent(pl.id)}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newName })
            });
            if (!res.ok) {
              console.error('Failed to rename playlist');
              return;
            }
            await loadPlaylists();
            renderAllPlaylistsUI();
          } catch (err) {
            console.error(err);
          }
        });
      }

      // Delete
      if (idx === 1) {
        if (!pl || pl.id === 'liked') return;
        if (!confirm(`Delete playlist "${pl.name}"? This cannot be undone.`)) return;
        try {
          const res = await fetch(`/api/playlists/${encodeURIComponent(pl.id)}`, { method: 'DELETE' });
          if (!res.ok) {
            console.error('Failed to delete playlist');
            return;
          }
          await loadPlaylists();
          renderAllPlaylistsUI();
          if (currentOpenedPlaylist && currentOpenedPlaylist.id === pl.id) closePlaylistDetail();
        } catch (err) {
          console.error(err);
        }
      }
      return;
    }

    // Click outside any playlist-card -> close open menus
    if (!card) {
      document.querySelectorAll('.playlist-menu').forEach((m) => (m.style.display = 'none'));
      return;
    }

    // Click on playlist card body (not the more button) -> open playlist detail
    const plId = card.dataset.plId;
    const pl = playlists.find((p) => p.id === plId);
    if (!pl) return;
    const tracks = resolvePlaylistTracks(pl);
    if (!tracks || !tracks.length) return;
    openPlaylistDetail(pl);
  });
}

function renderAllPlaylistsUI() {
  if (homePlaylistsEl) renderPlaylistCards(homePlaylistsEl);
  if (playlistListEl) renderPlaylistCards(playlistListEl);
}

// ensure menu handlers attached after playlists render
function renderAllPlaylistsUIWithActions() {
  renderAllPlaylistsUI();
  // attach menu actions (safe to call multiple times)
  try { setupPlaylistCardActions(); } catch (e) { console.error('setupPlaylistCardActions error', e); }
}

// Playlist detail state
let currentOpenedPlaylist = null;

function openPlaylistDetail(pl) {
  const detail = document.getElementById('playlistDetail');
  const nameEl = document.getElementById('playlistDetailName');
  const countEl = document.getElementById('playlistDetailCount');
  const listEl = document.getElementById('playlistDetailTrackList');
  const playBtn = document.getElementById('playlistDetailPlay');
  const shuffleBtn = document.getElementById('playlistDetailShuffle');
  const backBtn = document.getElementById('playlistDetailBack');
  if (!detail || !nameEl || !countEl || !listEl) return;

  currentOpenedPlaylist = pl;
  // show panel
  detail.style.display = 'block';
  // set title/count
  nameEl.textContent = pl.name;
  const tracks = resolvePlaylistTracks(pl);
  countEl.textContent = `${tracks.length} track${tracks.length !== 1 ? 's' : ''}`;
  // render tracks into detail list
  listEl.innerHTML = '';
  // reuse renderTrackList logic but it renders full rows; create a copy of rows
  if (tracks && tracks.length) renderTrackList(listEl, tracks);

  // wire controls
  if (playBtn) {
    playBtn.onclick = (e) => {
      e.stopPropagation();
      if (tracks && tracks.length) startPlaylist(tracks);
    };
  }
  if (shuffleBtn) {
    shuffleBtn.onclick = (e) => {
      e.stopPropagation();
      if (!tracks || !tracks.length) return;
      // simple Fisher-Yates shuffle
      const shuffled = tracks.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      startPlaylist(shuffled);
    };
  }
  if (backBtn) {
    backBtn.onclick = (e) => {
      e.stopPropagation();
      closePlaylistDetail();
    };
  }
  // switch to playlists view to show the panel
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
  // mark playlists nav active
  const nav = document.querySelector('.nav-item[data-view="playlists"]');
  if (nav) nav.classList.add('active');
  switchView('playlists');
}

function closePlaylistDetail() {
  const detail = document.getElementById('playlistDetail');
  if (!detail) return;
  detail.style.display = 'none';
  currentOpenedPlaylist = null;
}

async function createPlaylistOnServer(name) {
  const res = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(err && err.error ? err.error : "Failed to create playlist");
    throw new Error("Failed to create playlist");
  }
  const pl = await res.json();
  // reload playlists and update UI so the new playlist appears everywhere
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
      const err = await res.json().catch(() => ({}));
      console.error(err && err.error ? err.error : "Failed to add track");
      throw new Error("Failed to add track");
    }
    const pl = await res.json();
    // update local cache and UI
    await loadPlaylists();
    renderAllPlaylistsUI();
    refreshTrackViews();
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
      console.error(err && err.error ? err.error : "Failed to toggle like");
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
    return pl;
  } catch (err) {
    console.error(err);
    console.error("Failed to update liked songs.");
    return null;
  }
}

function refreshTrackViews() {
  if (!allTracks.length) return;
  const sortedByRecent = [...allTracks].sort(
    (a, b) => (b.addedAt || 0) - (a.addedAt || 0)
  );
  // Home preview: show a modest number of recent tracks
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
  // ensure delegated playlist handlers are attached
  try { setupPlaylistCardActions(); } catch (e) { console.error('setupPlaylistCardActions init error', e); }
  try { setupFullScreenHandlers(); } catch (e) { console.error('setupFullScreenHandlers init error', e); }
}

init().catch(console.error);

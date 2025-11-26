# Changelog

All notable changes to **Madify** will be documented in this file.

The format is:

- `Added` – for new features  
- `Changed` – for changes in existing functionality  
- `Fixed` – for bug fixes  
- `Removed` – for removed features  

---

## [0.4.5] - 2025-11-25

### Changed

## Major UI Updates
- Changed the whole look of the UI to be more minimalist and user friendly.
- Menu options are now on the bottom with bigger buttons.
- Fullscreen now playing section now displays fullscreen as an overlay.

## [0.4.4] - 2025-11-25

### Changed

- Changed the playlist section to show a playlist card when clicking on a playlist instead of just playing the songs.
- Users will now be able to open the playlist to view what songs it contains.
- Playlist cards also include a play and shuffle button.
- You can now edit and delete playlists.

### Added

- Added fullscreen now playing screen with swipe to dismiss.

## [0.4.3] - 2025-11-25

### Fixed

- Robust like/unlike handling: server now accepts numeric-string `trackId` values and logs playlist toggle actions so clients that stringify IDs (or send numbers) work reliably.

## [0.4.2] - 2025-11-25

### Changed

- UI & Library Improvment

- Library submenu polished: categories (Recently Added, Artists, Albums, Songs, Genres) stay the same, 
 - but now auto-close after selection on both desktop and mobile.

- Added a library header with title, subtitle, item count, and a back/breadcrumb-style button when viewing a specific artist,
 - album, or genre.

- Library sections now auto-refresh when playlists or likes change so the current view always reflects the latest state.

- Improved add-to-playlist UX: 
 - track rows show a checked “+” state when already in any playlist, 
 - and the playlist picker modal shows which playlists contain the track and updates instantly without closing.

- Verified like/unlike flow so heart toggles update /api/playlists/liked/tracks/toggle

- Fixed main play/pause button styling so it clearly shows orange when playing and grey when paused.

- Album cards now display cover art when available via the /api/cover endpoint, with a graceful fallback when no art exists.

## [0.4.1] - 2025-11-25

### Fixed

- Fixed an issue where you couldn't unlike a song.
- Added the "+" icon to the now playing section to add a song to a playlist.

## [0.4.1] – 2025-11-25

### Added

- Liked Songs playlist that appears alongside other playlists and can be played like a normal playlist.
- Heart toggle in the bottom now-playing bar to quickly like/unlike the current track.
- Heart and “+” buttons on every track row to:
  - Like/unlike individual songs.
  - Add tracks to any existing playlist or create a new playlist on the fly.


## [0.4.0] – 2025-11-25

### Added

- GitHub / GHCR workflow:
  - Project structured for development in VS Code.
  - Docker image tagged as `ghcr.io/grantm28/madify:latest`.
  - Documentation on running Madify with Docker and on Unraid.
- Documentation:
  - Initial `README.md` and `CHANGELOG.md`.

### Changed

- Container is now intended to be pulled from GHCR instead of being built directly on Unraid.

---

## [0.3.0] – 2025-11-25

### Added

- Media Session API integration:
  - Lock screen & CarPlay now show title, artist, album, and artwork.
  - Native play / pause / next / previous hooked into the web player.
- Album art extraction improvements:
  - Fallback to embedded artwork from tags using `music-metadata` when no cover image file is present.

### Changed

- Player bar redesigned for mobile:
  - Larger circular Play/Pause, Next, Previous, Shuffle controls.
  - Restyled seek bar, removed volume slider on mobile.

---

## [0.2.0] – 2025-11-25

### Added

- Playlist system:
  - REST endpoints for creating playlists and adding tracks.
  - Playlists stored on disk via `PLAYLISTS_FILE` in `/data` so they survive container rebuilds.
  - Home view shows user playlists.
- “Liked Songs” feature:
  - Special built-in playlist with `id = "liked"`.
  - Heart icon per track and in the now-playing bar to toggle liked state.
- Library view:
  - Search bar to filter songs by title, artist, or album.
  - Dedicated Library and Playlists views in the UI.

### Changed

- Home screen layout:
  - Removed earlier “smart” mixes based on artists/genres.
  - Replaced with user-controlled playlists and a “Recently added” section.
- Metadata handling:
  - Better extraction of artist / album / genre from tags with fallback to folder structure.

---

## [0.1.0] – 2025-11-25

### Added

- Initial Madify backend:
  - Node.js + Express server.
  - Scans `/music` directory for audio files (`mp3`, `flac`, `wav`, `ogg`, `m4a`).
  - `GET /api/tracks` to list tracks.
  - `GET /api/stream` to stream:
    - Direct for `mp3/m4a/wav`.
    - ffmpeg-based transcoding for other formats.
- Initial frontend:
  - Spotify-style dark (orange/black) UI focused on mobile.
  - Track list with Play button per song.
  - Basic bottom audio player showing current track info.
- Dockerization:
  - Dockerfile to build a self-contained image.
  - App listens on port `3000` inside the container.

---

## Unreleased

Planned / ideas:

- Full AI DJ implementation (voice intros + smart queueing).
- Better playlist management (rename, delete, manual ordering).
- User settings for themes and playback preferences.
- Optional authentication for remote / public setups.

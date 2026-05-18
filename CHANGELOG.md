# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-05-18

### Added
- Microphone button in the message composer (post editor action)
- Recording modal with timer, progress bar, and stop/cancel controls
- Web Audio API preview player (CSP-compatible – no `<audio src="blob:">`)
- Re-record capability before sending
- Custom voice-note post type with in-line audio player and seekable timeline
- Download button for voice notes
- Channel permission checks on all API endpoints
- `Authorization: Bearer` + `X-Requested-With` headers for authenticated uploads
- channelId resolved from Mattermost Redux store as fallback when prop is undefined
- Configurable max recording duration (default: 5 minutes)
- Configurable max file size (default: 50 MB)
- WebM/Opus audio format via native browser `MediaRecorder` API
- Compatible with Mattermost 10.0.0+
- Desktop App: informational tooltip with URL copy when microphone access is unavailable

### Known limitations
- **Mattermost Desktop App (Electron)**: microphone access is blocked for all third-party plugins by the Desktop App's `permissionRequestHandler`. Recording requires using Mattermost in a browser (Chrome, Firefox, Edge). Playback works in the Desktop App.
- **Mobile apps**: not supported (platform limitation for all Mattermost plugins).
- **Audio stored client-side until sent**: the recorded blob lives only in browser RAM. If the tab is closed or the page reloaded before clicking Send, the recording is lost permanently.
- **File retention on post deletion**: when a voice note post is deleted, the audio file remains in Mattermost file storage (standard Mattermost behaviour for all attachments). Automatic cleanup requires Mattermost Enterprise Data Retention. Community Edition users can use the SQL query documented in README to identify and manually remove orphaned files.

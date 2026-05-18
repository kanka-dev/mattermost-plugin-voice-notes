# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-05-18

### Added
- Initial release
- Microphone button in the message composer (post editor action)
- Recording modal with timer, progress bar, and stop/cancel controls
- Preview + re-record capability before sending
- Custom voice-note post type with in-line audio player
- Seekable playback timeline
- Download button for voice notes
- Channel permission checks on all API endpoints
- Configurable max recording duration (default: 5 minutes)
- Configurable max file size (default: 50 MB)
- WebM/Opus audio format via native browser MediaRecorder API
- Compatible with Mattermost 10.0.0+

# Mattermost Voice Notes Plugin

Record and share voice messages directly in Mattermost channels — no third-party services, no mobile app required.

![Voice Notes Plugin](assets/icon.svg)

## Features

- 🎙️ **One-click recording** – Microphone button directly in the message composer
- 👂 **Pre-send preview** – Listen to your recording before sending it (Web Audio API, no browser CSP issues)
- 🔄 **Re-record** – Discard and start over before sending
- ▶️ **In-line playback** – Custom audio player inside the post with seekable timeline and download button
- ⏱️ **Configurable limits** – Admins can set max duration and max file size
- 🔒 **Secure** – Channel permission checks on every audio request; files served via Mattermost's own file storage
- 🗑️ **Privacy** – Audio lives only in browser RAM until Send is clicked; nothing is uploaded until then

## Supported Clients

| Client | Status | Notes |
|---|---|---|
| Web browser (Chrome, Firefox, Edge) | ✅ Full support | Recommended |
| Desktop App (Windows / macOS / Linux) | ❌ Recording not supported | Playback works; see below |
| Mobile apps (iOS / Android) | ❌ Not supported | Platform limitation |

### Desktop App – recording not supported

**Voice recording does not work in the Mattermost Desktop App.** The Desktop App (Electron) blocks all microphone access for third-party plugins — this is a hard limitation of the Desktop App itself, not something this plugin can fix.

What works in the Desktop App:
- ▶️ **Playback** of existing voice notes
- ⬇️ **Download** of voice notes

What does not work:
- 🎙️ **Recording** — microphone access is blocked entirely

**To record voice notes:** open your Mattermost server directly in a browser (Chrome, Firefox, or Edge). The microphone icon in the Desktop App shows a tooltip with the server URL so you can copy it quickly.

**Technical background:** The Desktop App's `permissionRequestHandler` returns `denied` for all `media` requests originating from plugin webviews, regardless of OS microphone permissions. We tested every available approach:
- Direct `getUserMedia` in the plugin webview
- Standalone popup windows (separate Electron `BrowserWindow`)
- Pre-requesting permissions before opening the recording dialog

All fail with `NotAllowedError`. A fix requires a change in the [Mattermost Desktop repository](https://github.com/mattermost/desktop).

## Audio Format & Storage

Voice notes are recorded in **WebM/Opus** using the browser's native `MediaRecorder` API. No WebAssembly or external encoder required.

**Before sending:** the audio blob exists only in the browser's memory (JavaScript heap). It is never written to disk or sent to the server until the user clicks **Send**. Closing the tab or reloading the page discards the recording permanently.

**After sending:** the file is stored in Mattermost's configured file storage (local disk or S3 — whatever your server uses). It is served exclusively through the plugin's authenticated `/api/v1/audio` route and is subject to the same channel permission checks as the original post.

### File retention & cleanup

When a voice note post is **deleted** by a user, the audio file remains in Mattermost file storage. This is standard Mattermost behaviour for all file attachments — the server does not automatically purge files on post deletion.

**Mattermost Enterprise:** use [Data Retention Policies](https://docs.mattermost.com/comply/data-retention-policy.html) to automatically delete files after a configurable period.

**Mattermost Community Edition (self-hosted):** files must be cleaned up manually. If you need to reclaim storage after many posts have been deleted, run the following SQL query to identify orphaned voice note files:

```sql
-- Files whose posts have been soft-deleted
SELECT fi.id, fi.path, fi.name, fi.create_at
FROM fileinfo fi
INNER JOIN posts p ON p.id = fi.post_id
WHERE fi.name LIKE 'voice-note-%.webm'
  AND p.deleteat > 0
ORDER BY fi.create_at;
```

Then remove the corresponding files from your data directory (default: `<mattermost_data>/<YYYYMMDD>/teams/noteam/channels/<channelId>/users/nouser/<fileId>/`). Always take a backup before bulk-deleting files.

## Installation

1. Download the latest `.tar.gz` (`dev.kanka.voice-notes-<version>.tar.gz`) from the [Releases](https://github.com/kanka-dev/mattermost-plugin-voice-notes/releases) page.
2. In Mattermost: **System Console → Plugins → Plugin Management → Upload Plugin**.
3. Enable the plugin.

## Configuration

Go to **System Console → Plugins → Voice Notes**:

| Setting | Default | Description |
|---|---|---|
| Max Recording Duration | 300s (5 min) | Maximum length of a single voice note |
| Max File Size (MB) | 50 MB | Maximum upload size |

## Development

### Prerequisites

- Go 1.23+
- Node.js 22+ (via [nvm](https://nvm.sh))
- `make`

### Setup

```bash
git clone https://github.com/kanka-dev/mattermost-plugin-voice-notes.git
cd mattermost-plugin-voice-notes
```

### Build

```bash
make dist
```

The compiled plugin bundle is placed in `dist/dev.kanka.voice-notes-<version>.tar.gz`.

### Deploy to a running Mattermost server

```bash
export MM_SERVICESETTINGS_SITEURL=https://your-mattermost.example.com
export MM_ADMIN_USERNAME=admin
export MM_ADMIN_PASSWORD=yourpassword
make deploy
```

### Live webapp development

```bash
# Terminal 1 – watch & rebuild webapp on changes
make watch

# Terminal 2 – deploy server once, or again after Go changes
make deploy
```

## Contributing

Bug reports and pull requests are welcome on [GitHub](https://github.com/kanka-dev/mattermost-plugin-voice-notes/issues).

When reporting a bug, please include:
- Mattermost server version
- Browser name and version
- Steps to reproduce
- Any relevant browser console errors

## License

[MIT](LICENSE) © 2026 kanka-dev

This plugin is not affiliated with, endorsed by, or supported by Mattermost, Inc.

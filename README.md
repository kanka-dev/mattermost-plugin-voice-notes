# Mattermost Voice Notes Plugin

Record and share voice messages directly in Mattermost channels — no third-party services, no mobile app required.

![Voice Notes Plugin](assets/icon.svg)

## Features

- 🎙️ **One-click recording** – Microphone button directly in the message composer
- ▶️ **In-line playback** – Native audio player inside the post, no page navigation needed
- ⬇️ **Download** – Users can download voice notes as `.webm` files
- ⏱️ **Configurable limits** – Admins can set max duration and max file size
- 🔒 **Secure** – Channel permission checks on every audio request; files served via Mattermost's own file storage

## Supported Clients

| Client | Supported |
|---|---|
| Web browser (Chrome, Firefox, Edge) | ✅ |
| Desktop App (Electron/Chromium) | ✅ |
| Mobile apps (iOS / Android) | ❌ |

> Mobile is not supported — this is a Mattermost platform limitation for plugins.

## Audio Format

Voice notes are recorded in **WebM/Opus** using the browser's native `MediaRecorder` API. No WebAssembly or external encoder required.

## Installation

1. Download the latest `.tar.gz` from the [Releases](https://github.com/kanka-dev/mattermost-plugin-voice-notes/releases) page.
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

The compiled plugin bundle is placed in `dist/com.kanka-dev.voice-notes-<version>.tar.gz`.

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

## License

[MIT](LICENSE)

## Author

Developed by [kanka-dev](https://github.com/kanka-dev).

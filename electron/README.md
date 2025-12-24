# Electron + MPV Player Integration

This directory contains the Electron infrastructure for running Vault UI as a desktop application with native MPV video playback.

## Prerequisites

### 1. Install MPV on Windows

**Option A: Using Chocolatey (Recommended)**
```powershell
choco install mpv
```

**Option B: Manual Installation**
1. Download mpv from https://mpv.io/installation/
2. Extract to a folder (e.g., `C:\Program Files\mpv`)
3. Add the folder to your system PATH

**Verify installation:**
```powershell
mpv --version
```

### 2. Install Dependencies
```bash
npm install
```

## Project Structure

```
electron/
├── main.ts           # Electron main process entry point
├── preload.ts        # Preload script for IPC bridge
├── mpv-controller.ts # MPV player controller (node-mpv wrapper)
├── tsconfig.json     # TypeScript config for Electron files
└── README.md         # This file
```

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron App                              │
├─────────────────────────────────────────────────────────────┤
│  Renderer (React/Vite)                                       │
│  - Uses window.mpvAPI for playback control                   │
│  - Falls back to HTML5 player if mpvAPI not available        │
├─────────────────────────────────────────────────────────────┤
│  Preload Script                                              │
│  - Exposes mpvAPI via contextBridge                          │
│  - IPC communication with main process                       │
├─────────────────────────────────────────────────────────────┤
│  Main Process                                                │
│  - MpvController: manages node-mpv instance                  │
│  - IPC handlers for play/pause/seek/volume                   │
├─────────────────────────────────────────────────────────────┤
│  MPV Process (External Window)                               │
│  - Native video playback via mpv                             │
│  - Controlled via JSON IPC socket                            │
└─────────────────────────────────────────────────────────────┘
```

### Video Flow

1. User clicks "Play" on a container card
2. React app checks if `window.mpvAPI` is available
3. If available (running in Electron):
   - Calls `playWithMpv(fullUrl)`
   - Main process instructs mpv to load the stream URL
   - Video plays in MPV's native window
4. If not available (running in browser):
   - Falls back to HTML5 video player (may not work for TeraBox streams)

## Building the Electron App

### Development Mode

1. Start the web server:
```bash
npm run dev
```

2. In another terminal, run Electron:
```bash
# First, compile the TypeScript files
npx tsc -p electron/tsconfig.json

# Then run Electron
npx electron electron/dist/main.js
```

### Production Build

```bash
# Build the Vite app
npm run build

# Compile Electron files
npx tsc -p electron/tsconfig.json

# Package with electron-builder (install separately)
npm install electron-builder --save-dev
npx electron-builder
```

## API Reference

### window.mpvAPI

Available when running in Electron:

```typescript
interface MpvAPI {
  // Playback control
  load(url: string): Promise<{ success: boolean; error?: string }>;
  play(): Promise<{ success: boolean; error?: string }>;
  pause(): Promise<{ success: boolean; error?: string }>;
  togglePause(): Promise<{ success: boolean; error?: string }>;
  stop(): Promise<{ success: boolean; error?: string }>;
  
  // Seeking
  seek(seconds: number): Promise<{ success: boolean; error?: string }>; // Relative
  seekAbsolute(seconds: number): Promise<{ success: boolean; error?: string }>; // Absolute
  
  // Audio
  setVolume(volume: number): Promise<{ success: boolean; error?: string }>; // 0-100
  toggleMute(): Promise<{ success: boolean; error?: string }>;
  
  // Display
  toggleFullscreen(): Promise<{ success: boolean; error?: string }>;
  
  // Status
  getStatus(): Promise<MpvStatus | null>;
  isRunning(): Promise<boolean>;
  
  // Events
  onTimeUpdate(callback: (position: number) => void): void;
  onStatusChange(callback: (status: MpvStatus) => void): void;
  onPlaybackStarted(callback: () => void): void;
  onPlaybackStopped(callback: () => void): void;
  onPlaybackPaused(callback: () => void): void;
  onPlaybackResumed(callback: () => void): void;
  onError(callback: (error: string) => void): void;
}

interface MpvStatus {
  isPlaying: boolean;
  isPaused: boolean;
  duration: number;
  position: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  filename: string | null;
}
```

## Troubleshooting

### MPV not found
- Ensure mpv is installed and in your PATH
- Try specifying the full path in mpv-controller.ts:
  ```typescript
  this.player = new mpv({
    binary: 'C:\\Program Files\\mpv\\mpv.exe',
    // ...
  });
  ```

### Video not playing
- Check the server logs for streaming errors
- Verify the container has been authenticated (Auth Fetch completed)
- Check if the dlink has expired

### MPV window not appearing
- Ensure the `--force-window=yes` flag is set in mpv-controller.ts
- Check for errors in the Electron DevTools console

## Notes

- MPV uses its own native window for video playback
- The React UI provides controls that communicate with MPV via IPC
- The streaming proxy (`/api/stream/:fileId`) handles TeraBox authentication
- MPV handles download-oriented streams better than Chromium's HTML5 player

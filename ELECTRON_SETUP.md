# Running Vault UI in Electron (Desktop App)

This guide explains how to run Vault UI as a desktop application with native MPV video playback.

## Prerequisites

### 1. Set Up MPV Player

The app looks for MPV in the `bin/` folder at the project root.

**Option A: Copy MPV to bin folder (Recommended)**
1. Download MPV from https://sourceforge.net/projects/mpv-player-windows/files/
2. Extract the archive
3. Copy `mpv.exe` to the `bin/` folder in this project
4. Also copy the required DLLs (if any) to the same folder

**Option B: Install system-wide and copy**
```powershell
choco install mpv
# Then copy from installation location to bin/
copy "C:\ProgramData\chocolatey\lib\mpv\tools\mpv.exe" bin\
```

**Verify the structure:**
```
project-root/
├── bin/
│   └── mpv.exe
├── electron/
├── client/
└── ...
```

### 2. Install Node.js Dependencies

Make sure all dependencies are installed:
```bash
npm install
```

## Running in Development Mode

### Step 1: Start the Web Server

In one terminal, start the development server:
```bash
npm run dev
```

Wait until you see:
```
serving on port 5000
```

### Step 2: Compile Electron TypeScript

In another terminal, compile the Electron files:
```bash
# Compile main process and mpv-controller (ES modules)
npx tsc -p electron/tsconfig.json

# Compile preload script (CommonJS - required by Electron)
npx tsc -p electron/tsconfig.preload.json
```

This creates compiled JavaScript files in `electron/dist/`. 

**Important:** The preload script must be compiled separately as CommonJS because Electron's sandboxed preload context doesn't support ES modules.

### Step 3: Run Electron

```bash
npx electron electron/dist/main.js
```

The Electron app will open and connect to `http://localhost:5000`.

## How Video Playback Works

1. Click "Play" on any container card with video files
2. The app detects if MPV is available (running in Electron)
3. If MPV is available:
   - Video opens in MPV's native window
   - A toast notification confirms playback started
4. If MPV is not available (running in browser):
   - Falls back to HTML5 video player
   - Note: HTML5 may not work for TeraBox streams due to download headers

## Troubleshooting

### MPV not found
- Ensure `mpv.exe` is in your system PATH
- Test with `mpv --version` in a new terminal
- Restart your terminal after adding to PATH

### Video doesn't play
1. Make sure the container is authenticated (run "Auth Fetch")
2. Check if the dlink has expired
3. Look at the Electron DevTools console for errors (opens automatically in dev mode)

### Electron won't start
- Make sure the web server is running on port 5000
- Check that TypeScript compiled without errors
- Verify `electron/dist/main.js` exists

## File Structure

```
electron/
├── main.ts           # Main process (app lifecycle, IPC handlers)
├── preload.ts        # Preload script (exposes mpvAPI to renderer)
├── mpv-controller.ts # MPV player controller
├── tsconfig.json     # TypeScript config
└── dist/             # Compiled JavaScript (generated)
```

## For Windows Local Testing with Chrome Profile

Set these environment variables before running:
```powershell
$env:CHROME_USER_DATA = "C:\Users\YourName\AppData\Local\Google\Chrome\User Data"
$env:CHROME_PROFILE_DIR = "Default"
```

Then close Chrome completely before clicking "Auth" in the app.

## Building for Distribution

### Step 1: Install electron-builder

```bash
npm install --save-dev electron-builder
```

### Step 2: Add build configuration to package.json

Add this to your `package.json`:

```json
{
  "build": {
    "appId": "com.vault.ui",
    "productName": "Vault UI",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "electron/dist/**/*",
      "client/dist/**/*",
      "server/**/*",
      "shared/**/*",
      "bin/**/*",
      "package.json"
    ],
    "extraResources": [
      {
        "from": "bin",
        "to": "bin",
        "filter": ["**/*"]
      }
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

### Step 3: Build the app

```bash
# 1. Build the frontend (Vite)
npm run build

# 2. Compile Electron TypeScript
npx tsc -p electron/tsconfig.json
npx tsc -p electron/tsconfig.preload.json

# 3. Package with electron-builder
npx electron-builder --win
```

The packaged app will be in `dist-electron/`.

### Step 4: Include MPV in the bundle

Make sure `bin/mpv.exe` (and any DLLs) are in the `bin/` folder before building. The `extraResources` config will copy them into the packaged app.

### Running the packaged app

After building:
1. Navigate to `dist-electron/`
2. Run the installer (e.g., `Vault UI Setup.exe`)
3. The app will be installed and ready to use

### Notes for Production

1. **Server bundling**: For a true standalone app, you'll need to bundle the Express server into the Electron main process or use a build tool like `pkg` to create a standalone server binary.

2. **Database**: The SQLite database file should be stored in a user-writable location like `app.getPath('userData')`.

3. **Auto-updates**: Consider adding `electron-updater` for automatic updates.

4. **Code signing**: For distribution, sign your app with a code signing certificate to avoid security warnings.

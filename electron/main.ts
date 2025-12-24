import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { fileURLToPath } from "url";
import { MpvController } from "./mpv-controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let mpvController: MpvController | null = null;

const isDev = !app.isPackaged;

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.js");
  console.log("[Electron] Preload path:", preloadPath);
  console.log("[Electron] __dirname:", __dirname);
  console.log("[Electron] isDev:", isDev);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#0a0a0f",
    show: false,
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5000");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../client/dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Create controller but DON'T initialize MPV yet - wait for user to play
  mpvController = new MpvController(mainWindow);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (mpvController) {
    mpvController.quit();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (mpvController) {
    mpvController.quit();
  }
});

// === MPV IPC HANDLERS ===

// Playback controls
ipcMain.handle("mpv:load", async (_event, url: string) => {
  if (!mpvController || !mainWindow) return { success: false, error: "MPV not available" };
  await mpvController.initialize();
  return mpvController.load(url);
});

// Helper to ensure MPV is initialized before operations
async function ensureMpvInitialized(): Promise<boolean> {
  if (!mpvController) return false;
  if (!mpvController.isRunning()) {
    // Don't auto-initialize for control commands - only load() should initialize
    return false;
  }
  return true;
}

ipcMain.handle("mpv:play", async () => {
  if (!await ensureMpvInitialized()) return { success: false, error: "MPV not running" };
  return mpvController!.play();
});

ipcMain.handle("mpv:pause", async () => {
  if (!await ensureMpvInitialized()) return { success: false, error: "MPV not running" };
  return mpvController!.pause();
});

ipcMain.handle("mpv:togglePause", async () => {
  if (!await ensureMpvInitialized()) return { success: false, error: "MPV not running" };
  return mpvController!.togglePause();
});

ipcMain.handle("mpv:stop", async () => {
  if (!await ensureMpvInitialized()) return { success: false, error: "MPV not running" };
  return mpvController!.stop();
});

ipcMain.handle("mpv:seek", async (_event, seconds: number) => {
  if (!await ensureMpvInitialized()) return { success: false, error: "MPV not running" };
  return mpvController!.seek(seconds);
});

ipcMain.handle("mpv:seekAbsolute", async (_event, seconds: number) => {
  if (!await ensureMpvInitialized()) return { success: false, error: "MPV not running" };
  return mpvController!.seekAbsolute(seconds);
});

ipcMain.handle("mpv:setVolume", async (_event, volume: number) => {
  if (!await ensureMpvInitialized()) return { success: false, error: "MPV not running" };
  return mpvController!.setVolume(volume);
});

ipcMain.handle("mpv:toggleMute", async () => {
  if (!await ensureMpvInitialized()) return { success: false, error: "MPV not running" };
  return mpvController!.toggleMute();
});

ipcMain.handle("mpv:toggleFullscreen", async () => {
  if (!await ensureMpvInitialized()) return { success: false, error: "MPV not running" };
  return mpvController!.toggleFullscreen();
});

ipcMain.handle("mpv:quit", async () => {
  if (!mpvController) return;
  return mpvController.quit();
});

// Track selection
ipcMain.handle("mpv:setAudioTrack", async (_event, trackId: number) => {
  if (!mpvController) return { success: false, error: "MPV not initialized" };
  return mpvController.setAudioTrack(trackId);
});

ipcMain.handle("mpv:setSubtitleTrack", async (_event, trackId: number) => {
  if (!mpvController) return { success: false, error: "MPV not initialized" };
  return mpvController.setSubtitleTrack(trackId);
});

// Playback speed
ipcMain.handle("mpv:setSpeed", async (_event, speed: number) => {
  if (!mpvController) return { success: false, error: "MPV not initialized" };
  return mpvController.setSpeed(speed);
});

// Chapter navigation
ipcMain.handle("mpv:goToChapter", async (_event, index: number) => {
  if (!mpvController) return { success: false, error: "MPV not initialized" };
  return mpvController.goToChapter(index);
});

// Status
ipcMain.handle("mpv:getStatus", async () => {
  if (!mpvController) return null;
  return mpvController.getStatus();
});

ipcMain.handle("mpv:isRunning", async () => {
  if (!mpvController) return false;
  return mpvController.isRunning();
});

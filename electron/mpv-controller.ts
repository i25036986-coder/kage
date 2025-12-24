import { BrowserWindow, app } from "electron";
import * as path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const mpv = require("node-mpv");

function getMpvBinaryPath(): string {
  const isDev = !app.isPackaged;
  
  if (isDev) {
    return path.join(process.cwd(), "bin", "mpv.exe");
  } else {
    return path.join(process.resourcesPath, "bin", "mpv.exe");
  }
}

export interface Track {
  id: number;
  type: "audio" | "video" | "sub";
  title: string | null;
  lang: string | null;
  selected: boolean;
  codec: string | null;
  default: boolean;
  external: boolean;
}

export interface Chapter {
  title: string;
  time: number;
}

export interface MpvStatus {
  isPlaying: boolean;
  isPaused: boolean;
  duration: number;
  position: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  filename: string | null;
  mediaTitle: string | null;
  bufferPercent: number;
  speed: number;
  audioTracks: Track[];
  subtitleTracks: Track[];
  chapters: Chapter[];
  currentAudioTrack: number;
  currentSubtitleTrack: number;
  isBuffering: boolean;
}

export class MpvController {
  private player: any = null;
  private mainWindow: BrowserWindow;
  private overlayWindow: BrowserWindow | null = null;
  private status: MpvStatus = {
    isPlaying: false,
    isPaused: false,
    duration: 0,
    position: 0,
    volume: 100,
    isMuted: false,
    isFullscreen: false,
    filename: null,
    mediaTitle: null,
    bufferPercent: 0,
    speed: 1.0,
    audioTracks: [],
    subtitleTracks: [],
    chapters: [],
    currentAudioTrack: 1,
    currentSubtitleTrack: 0,
    isBuffering: false,
  };
  private initialized = false;
  private initializing = false;
  private initPromise: Promise<void> | null = null;
  private statusUpdateThrottle: NodeJS.Timeout | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  setOverlayWindow(overlay: BrowserWindow): void {
    this.overlayWindow = overlay;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (this.initializing && this.initPromise) {
      console.log("[MpvController] Already initializing, waiting...");
      return this.initPromise;
    }
    
    this.initializing = true;
    this.initPromise = this.doInitialize();
    return this.initPromise;
  }
  
  private async doInitialize(): Promise<void> {
    try {
      const mpvPath = getMpvBinaryPath();
      console.log("[MpvController] Using MPV binary:", mpvPath);
      
      // HYBRID MODE: MPV handles video only, no UI (osc=no)
      this.player = new mpv(
        {
          binary: mpvPath,
          audio_only: false,
          time_update: 0.25, // More frequent updates for smooth seekbar
          verbose: false,
          debug: false,
        },
        [
          // Window settings - borderless for overlay
          "--force-window=yes",
          "--keep-open=yes",
          "--title=Vault Media Player",
          "--geometry=1280x720",
          "--autofit-larger=90%x90%",
          // DISABLE built-in UI - we provide our own
          "--osc=no",
          "--osd-level=0",
          "--no-input-default-bindings",
          "--input-vo-keyboard=no",
          // Keep subtitles - styled nicely
          "--sub-auto=fuzzy",
          "--slang=eng,en,hin,hi",
          "--sub-font=Segoe UI Semibold",
          "--sub-font-size=42",
          "--sub-color=#FFFFFFFF",
          "--sub-border-color=#FF000000",
          "--sub-border-size=2.5",
          "--sub-shadow-offset=1",
          "--sub-shadow-color=#80000000",
          "--sub-margin-y=80", // Leave room for our controls
          "--sub-blur=0.2",
          // Audio preferences
          "--audio-display=no",
          "--audio-file-auto=fuzzy",
          "--alang=eng,en,jpn,ja,hin,hi",
          // Buffering and cache
          "--cache=yes",
          "--cache-secs=120",
          "--demuxer-max-bytes=150M",
          "--demuxer-max-back-bytes=75M",
          "--demuxer-readahead-secs=60",
          // Video output
          "--vo=gpu",
          "--hwdec=auto-safe",
          "--gpu-api=auto",
          // Cursor always visible (we handle UI)
          "--cursor-autohide=no",
        ]
      );

      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.initialized = true;
      this.initializing = false;
      console.log("[MpvController] MPV initialized (HYBRID MODE - no OSC)");

      this.setupEventListeners();
    } catch (error) {
      console.error("[MpvController] Failed to initialize MPV:", error);
      this.sendError(`Failed to initialize MPV: ${error}`);
      this.initializing = false;
      this.initPromise = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.player) return;

    // Time position - throttled for performance
    this.player.on("timeposition", (seconds: number) => {
      this.status.position = seconds;
      this.throttledStatusUpdate();
    });

    this.player.on("started", async () => {
      console.log("[MpvController] Playback started");
      this.status.isPlaying = true;
      this.status.isPaused = false;
      this.status.isBuffering = false;
      
      // Fetch track and chapter info
      await this.refreshTrackInfo();
      
      this.sendToRenderer("mpv:playbackStarted");
      this.sendStatusUpdate();
    });

    this.player.on("stopped", () => {
      console.log("[MpvController] Playback stopped");
      this.status.isPlaying = false;
      this.status.isPaused = false;
      this.sendToRenderer("mpv:playbackStopped");
      this.sendStatusUpdate();
    });

    this.player.on("paused", () => {
      console.log("[MpvController] Playback paused");
      this.status.isPaused = true;
      this.sendToRenderer("mpv:playbackPaused");
      this.sendStatusUpdate();
    });

    this.player.on("resumed", () => {
      console.log("[MpvController] Playback resumed");
      this.status.isPaused = false;
      this.sendToRenderer("mpv:playbackResumed");
      this.sendStatusUpdate();
    });

    this.player.on("statuschange", async (status: any) => {
      if (status.duration !== undefined) {
        this.status.duration = status.duration;
      }
      if (status.volume !== undefined) {
        this.status.volume = status.volume;
      }
      if (status.mute !== undefined) {
        this.status.isMuted = status.mute;
      }
      if (status.fullscreen !== undefined) {
        this.status.isFullscreen = status.fullscreen;
        this.sendToRenderer("mpv:fullscreenChange", status.fullscreen);
      }
      if (status.filename !== undefined) {
        this.status.filename = status.filename;
      }
      if (status["media-title"] !== undefined) {
        this.status.mediaTitle = status["media-title"];
      }
      if (status.speed !== undefined) {
        this.status.speed = status.speed;
      }
      this.throttledStatusUpdate();
    });

    // Buffering state
    this.player.on("seek", () => {
      this.status.isBuffering = true;
      this.sendStatusUpdate();
    });

    this.player.on("crashed", () => {
      console.error("[MpvController] MPV crashed");
      this.sendError("MPV crashed");
      this.resetState();
    });

    this.player.on("quit", () => {
      console.log("[MpvController] MPV quit - ready for new session");
      this.resetState();
      this.sendToRenderer("mpv:quit");
    });
  }

  private resetState(): void {
    this.initialized = false;
    this.initializing = false;
    this.initPromise = null;
    this.player = null;
    this.status = {
      isPlaying: false,
      isPaused: false,
      duration: 0,
      position: 0,
      volume: 100,
      isMuted: false,
      isFullscreen: false,
      filename: null,
      mediaTitle: null,
      bufferPercent: 0,
      speed: 1.0,
      audioTracks: [],
      subtitleTracks: [],
      chapters: [],
      currentAudioTrack: 1,
      currentSubtitleTrack: 0,
      isBuffering: false,
    };
  }

  private async refreshTrackInfo(): Promise<void> {
    if (!this.player) return;

    try {
      // Get track list
      const trackCount = await this.player.getProperty("track-list/count");
      const audioTracks: Track[] = [];
      const subtitleTracks: Track[] = [];

      for (let i = 0; i < trackCount; i++) {
        const type = await this.player.getProperty(`track-list/${i}/type`);
        const track: Track = {
          id: await this.player.getProperty(`track-list/${i}/id`),
          type: type,
          title: await this.player.getProperty(`track-list/${i}/title`).catch(() => null),
          lang: await this.player.getProperty(`track-list/${i}/lang`).catch(() => null),
          selected: await this.player.getProperty(`track-list/${i}/selected`).catch(() => false),
          codec: await this.player.getProperty(`track-list/${i}/codec`).catch(() => null),
          default: await this.player.getProperty(`track-list/${i}/default`).catch(() => false),
          external: await this.player.getProperty(`track-list/${i}/external`).catch(() => false),
        };

        if (type === "audio") {
          audioTracks.push(track);
          if (track.selected) this.status.currentAudioTrack = track.id;
        } else if (type === "sub") {
          subtitleTracks.push(track);
          if (track.selected) this.status.currentSubtitleTrack = track.id;
        }
      }

      this.status.audioTracks = audioTracks;
      this.status.subtitleTracks = subtitleTracks;

      // Get chapters
      const chapterCount = await this.player.getProperty("chapter-list/count").catch(() => 0);
      const chapters: Chapter[] = [];
      
      for (let i = 0; i < chapterCount; i++) {
        chapters.push({
          title: await this.player.getProperty(`chapter-list/${i}/title`).catch(() => `Chapter ${i + 1}`),
          time: await this.player.getProperty(`chapter-list/${i}/time`).catch(() => 0),
        });
      }
      
      this.status.chapters = chapters;

      console.log(`[MpvController] Found ${audioTracks.length} audio tracks, ${subtitleTracks.length} subtitle tracks, ${chapters.length} chapters`);
    } catch (error) {
      console.error("[MpvController] Error refreshing track info:", error);
    }
  }

  private throttledStatusUpdate(): void {
    if (this.statusUpdateThrottle) return;
    
    this.statusUpdateThrottle = setTimeout(() => {
      this.statusUpdateThrottle = null;
      this.sendStatusUpdate();
    }, 100); // 10 fps update rate
  }

  private sendToRenderer(channel: string, data?: any): void {
    try {
      // Send to main window
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(channel, data);
      }
      // Send to overlay window (if separate overlay is used)
      if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
        this.overlayWindow.webContents.send(channel, data);
      }
    } catch (error) {
      console.error("[MpvController] Error sending to renderer:", error);
    }
  }

  private sendStatusUpdate(): void {
    this.sendToRenderer("mpv:statusChange", this.status);
  }

  private sendError(error: string): void {
    this.sendToRenderer("mpv:error", error);
  }

  // === PLAYBACK CONTROLS ===

  async load(url: string): Promise<{ success: boolean; error?: string }> {
    if (!this.player || !this.initialized) {
      await this.initialize();
    }

    try {
      console.log("[MpvController] Loading:", url);
      this.status.isBuffering = true;
      this.sendStatusUpdate();
      await this.player.load(url);
      return { success: true };
    } catch (error) {
      const errorMsg = `Failed to load: ${error}`;
      console.error("[MpvController]", errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  async play(): Promise<{ success: boolean; error?: string }> {
    if (!this.player) return { success: false, error: "MPV not initialized" };
    try {
      await this.player.play();
      return { success: true };
    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  async pause(): Promise<{ success: boolean; error?: string }> {
    if (!this.player) return { success: false, error: "MPV not initialized" };
    try {
      await this.player.pause();
      return { success: true };
    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  async togglePause(): Promise<{ success: boolean; error?: string }> {
    if (!this.player) return { success: false, error: "MPV not initialized" };
    try {
      await this.player.togglePause();
      return { success: true };
    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  async stop(): Promise<{ success: boolean; error?: string }> {
    if (!this.player) return { success: false, error: "MPV not initialized" };
    try {
      await this.player.stop();
      return { success: true };
    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  async seek(seconds: number): Promise<{ success: boolean; error?: string }> {
    if (!this.player) return { success: false, error: "MPV not initialized" };
    try {
      this.status.isBuffering = true;
      this.sendStatusUpdate();
      await this.player.seek(seconds);
      return { success: true };
    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  async seekAbsolute(seconds: number): Promise<{ success: boolean; error?: string }> {
    if (!this.player) return { success: false, error: "MPV not initialized" };
    try {
      this.status.isBuffering = true;
      this.sendStatusUpdate();
      await this.player.goToPosition(seconds);
      return { success: true };
    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  async setVolume(volume: number): Promise<{ success: boolean; error?: string }> {
    if (!this.player) return { success: false, error: "MPV not initialized" };
    try {
      const v = Math.max(0, Math.min(100, volume));
      await this.player.volume(v);
      this.status.volume = v;
      this.sendStatusUpdate();
      return { success: true };
    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  async toggleMute(): Promise<{ success: boolean; error?: string }> {
    if (!this.player) return { success: false, error: "MPV not initialized" };
    try {
      if (this.status.isMuted) {
        await this.player.unmute();
      } else {
        await this.player.mute();
      }
      this.status.isMuted = !this.status.isMuted;
      this.sendStatusUpdate();
      return { success: true };
    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  async toggleFullscreen(): Promise<{ success: boolean; error?: string }> {
    if (!this.player) return { success: false, error: "MPV not initialized" };
    try {
      await this.player.fullscreen();
      return { success: true };
    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  // === TRACK SELECTION ===

  async setAudioTrack(trackId: number): Promise<{ success: boolean; error?: string }> {
    if (!this.player) return { success: false, error: "MPV not initialized" };
    try {
      await this.player.setProperty("aid", trackId);
      this.status.currentAudioTrack = trackId;
      this.sendStatusUpdate();
      return { success: true };
    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  async setSubtitleTrack(trackId: number): Promise<{ success: boolean; error?: string }> {
    if (!this.player) return { success: false, error: "MPV not initialized" };
    try {
      // trackId 0 means disable subtitles
      await this.player.setProperty("sid", trackId === 0 ? "no" : trackId);
      this.status.currentSubtitleTrack = trackId;
      this.sendStatusUpdate();
      return { success: true };
    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  // === PLAYBACK SPEED ===

  async setSpeed(speed: number): Promise<{ success: boolean; error?: string }> {
    if (!this.player) return { success: false, error: "MPV not initialized" };
    try {
      const s = Math.max(0.25, Math.min(4.0, speed));
      await this.player.setProperty("speed", s);
      this.status.speed = s;
      this.sendStatusUpdate();
      return { success: true };
    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  // === CHAPTER NAVIGATION ===

  async goToChapter(index: number): Promise<{ success: boolean; error?: string }> {
    if (!this.player) return { success: false, error: "MPV not initialized" };
    try {
      await this.player.setProperty("chapter", index);
      return { success: true };
    } catch (error) {
      return { success: false, error: `${error}` };
    }
  }

  // === STATUS ===

  getStatus(): MpvStatus {
    return { ...this.status };
  }

  isRunning(): boolean {
    return this.initialized && this.player !== null;
  }

  async quit(): Promise<void> {
    if (this.player) {
      try {
        await this.player.quit();
      } catch (error) {
        console.error("[MpvController] Error quitting MPV:", error);
      }
      this.resetState();
    }
  }
}

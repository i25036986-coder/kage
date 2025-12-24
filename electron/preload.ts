import { contextBridge, ipcRenderer } from "electron";

console.log("[Preload] Loading preload script...");

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

export interface MpvAPI {
  // Playback controls
  load: (url: string) => Promise<{ success: boolean; error?: string }>;
  play: () => Promise<{ success: boolean; error?: string }>;
  pause: () => Promise<{ success: boolean; error?: string }>;
  togglePause: () => Promise<{ success: boolean; error?: string }>;
  stop: () => Promise<{ success: boolean; error?: string }>;
  seek: (seconds: number) => Promise<{ success: boolean; error?: string }>;
  seekAbsolute: (seconds: number) => Promise<{ success: boolean; error?: string }>;
  setVolume: (volume: number) => Promise<{ success: boolean; error?: string }>;
  toggleMute: () => Promise<{ success: boolean; error?: string }>;
  toggleFullscreen: () => Promise<{ success: boolean; error?: string }>;
  quit: () => Promise<void>;
  
  // Track selection
  setAudioTrack: (trackId: number) => Promise<{ success: boolean; error?: string }>;
  setSubtitleTrack: (trackId: number) => Promise<{ success: boolean; error?: string }>;
  
  // Playback speed
  setSpeed: (speed: number) => Promise<{ success: boolean; error?: string }>;
  
  // Chapter navigation
  goToChapter: (index: number) => Promise<{ success: boolean; error?: string }>;
  
  // Status
  getStatus: () => Promise<MpvStatus | null>;
  isRunning: () => Promise<boolean>;
  
  // Events
  onTimeUpdate: (callback: (position: number) => void) => () => void;
  onStatusChange: (callback: (status: MpvStatus) => void) => () => void;
  onPlaybackStarted: (callback: () => void) => () => void;
  onPlaybackStopped: (callback: () => void) => () => void;
  onPlaybackPaused: (callback: () => void) => () => void;
  onPlaybackResumed: (callback: () => void) => () => void;
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => () => void;
  onQuit: (callback: () => void) => () => void;
  onError: (callback: (error: string) => void) => () => void;
}

const mpvAPI: MpvAPI = {
  // Playback controls
  load: (url: string) => ipcRenderer.invoke("mpv:load", url),
  play: () => ipcRenderer.invoke("mpv:play"),
  pause: () => ipcRenderer.invoke("mpv:pause"),
  togglePause: () => ipcRenderer.invoke("mpv:togglePause"),
  stop: () => ipcRenderer.invoke("mpv:stop"),
  seek: (seconds: number) => ipcRenderer.invoke("mpv:seek", seconds),
  seekAbsolute: (seconds: number) => ipcRenderer.invoke("mpv:seekAbsolute", seconds),
  setVolume: (volume: number) => ipcRenderer.invoke("mpv:setVolume", volume),
  toggleMute: () => ipcRenderer.invoke("mpv:toggleMute"),
  toggleFullscreen: () => ipcRenderer.invoke("mpv:toggleFullscreen"),
  quit: () => ipcRenderer.invoke("mpv:quit"),
  
  // Track selection
  setAudioTrack: (trackId: number) => ipcRenderer.invoke("mpv:setAudioTrack", trackId),
  setSubtitleTrack: (trackId: number) => ipcRenderer.invoke("mpv:setSubtitleTrack", trackId),
  
  // Playback speed
  setSpeed: (speed: number) => ipcRenderer.invoke("mpv:setSpeed", speed),
  
  // Chapter navigation
  goToChapter: (index: number) => ipcRenderer.invoke("mpv:goToChapter", index),
  
  // Status
  getStatus: () => ipcRenderer.invoke("mpv:getStatus"),
  isRunning: () => ipcRenderer.invoke("mpv:isRunning"),
  
  // Events with cleanup functions
  onTimeUpdate: (callback) => {
    const handler = (_event: any, position: number) => callback(position);
    ipcRenderer.on("mpv:timeUpdate", handler);
    return () => ipcRenderer.removeListener("mpv:timeUpdate", handler);
  },
  onStatusChange: (callback) => {
    const handler = (_event: any, status: MpvStatus) => callback(status);
    ipcRenderer.on("mpv:statusChange", handler);
    return () => ipcRenderer.removeListener("mpv:statusChange", handler);
  },
  onPlaybackStarted: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("mpv:playbackStarted", handler);
    return () => ipcRenderer.removeListener("mpv:playbackStarted", handler);
  },
  onPlaybackStopped: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("mpv:playbackStopped", handler);
    return () => ipcRenderer.removeListener("mpv:playbackStopped", handler);
  },
  onPlaybackPaused: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("mpv:playbackPaused", handler);
    return () => ipcRenderer.removeListener("mpv:playbackPaused", handler);
  },
  onPlaybackResumed: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("mpv:playbackResumed", handler);
    return () => ipcRenderer.removeListener("mpv:playbackResumed", handler);
  },
  onFullscreenChange: (callback) => {
    const handler = (_event: any, isFullscreen: boolean) => callback(isFullscreen);
    ipcRenderer.on("mpv:fullscreenChange", handler);
    return () => ipcRenderer.removeListener("mpv:fullscreenChange", handler);
  },
  onQuit: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("mpv:quit", handler);
    return () => ipcRenderer.removeListener("mpv:quit", handler);
  },
  onError: (callback) => {
    const handler = (_event: any, error: string) => callback(error);
    ipcRenderer.on("mpv:error", handler);
    return () => ipcRenderer.removeListener("mpv:error", handler);
  },
};

contextBridge.exposeInMainWorld("mpvAPI", mpvAPI);
console.log("[Preload] mpvAPI exposed to window successfully");

declare global {
  interface Window {
    mpvAPI: MpvAPI;
  }
}

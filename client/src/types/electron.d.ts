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
  
  // Events - return cleanup functions
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

declare global {
  interface Window {
    mpvAPI?: MpvAPI;
  }
}

export {};

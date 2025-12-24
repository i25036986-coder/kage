import { useState, useEffect, useCallback } from "react";
import type { MpvStatus, MpvAPI } from "@/types/electron";

export type { MpvStatus };

const defaultStatus: MpvStatus = {
  isPlaying: false,
  isPaused: false,
  duration: 0,
  position: 0,
  volume: 100,
  isMuted: false,
  isFullscreen: false,
  filename: null,
};

function getMpvAPI(): MpvAPI | null {
  if (typeof window !== "undefined" && window.mpvAPI) {
    return window.mpvAPI;
  }
  return null;
}

export function useMpv() {
  const [status, setStatus] = useState<MpvStatus>(defaultStatus);
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = getMpvAPI();
    setIsAvailable(api !== null);

    if (!api) {
      console.log("[useMpv] mpvAPI not available (not running in Electron)");
      return;
    }

    api.onTimeUpdate((position: number) => {
      setStatus((prev) => ({ ...prev, position }));
    });

    api.onStatusChange((newStatus: MpvStatus) => {
      setStatus(newStatus);
    });

    api.onPlaybackStarted(() => {
      setStatus((prev) => ({ ...prev, isPlaying: true, isPaused: false }));
      setError(null);
    });

    api.onPlaybackStopped(() => {
      setStatus((prev) => ({ ...prev, isPlaying: false, isPaused: false }));
    });

    api.onPlaybackPaused(() => {
      setStatus((prev) => ({ ...prev, isPaused: true }));
    });

    api.onPlaybackResumed(() => {
      setStatus((prev) => ({ ...prev, isPaused: false }));
    });

    api.onError((err: string) => {
      setError(err);
      console.error("[useMpv] Error:", err);
    });
  }, []);

  const load = useCallback(async (url: string) => {
    const api = getMpvAPI();
    if (!api) {
      console.warn("[useMpv] Cannot load - mpvAPI not available");
      return { success: false, error: "MPV not available (not in Electron)" };
    }
    setError(null);
    return api.load(url);
  }, []);

  const play = useCallback(async () => {
    const api = getMpvAPI();
    if (!api) return { success: false, error: "MPV not available" };
    return api.play();
  }, []);

  const pause = useCallback(async () => {
    const api = getMpvAPI();
    if (!api) return { success: false, error: "MPV not available" };
    return api.pause();
  }, []);

  const togglePause = useCallback(async () => {
    const api = getMpvAPI();
    if (!api) return { success: false, error: "MPV not available" };
    return api.togglePause();
  }, []);

  const stop = useCallback(async () => {
    const api = getMpvAPI();
    if (!api) return { success: false, error: "MPV not available" };
    return api.stop();
  }, []);

  const seek = useCallback(async (seconds: number) => {
    const api = getMpvAPI();
    if (!api) return { success: false, error: "MPV not available" };
    return api.seek(seconds);
  }, []);

  const seekAbsolute = useCallback(async (seconds: number) => {
    const api = getMpvAPI();
    if (!api) return { success: false, error: "MPV not available" };
    return api.seekAbsolute(seconds);
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    const api = getMpvAPI();
    if (!api) return { success: false, error: "MPV not available" };
    return api.setVolume(volume);
  }, []);

  const toggleMute = useCallback(async () => {
    const api = getMpvAPI();
    if (!api) return { success: false, error: "MPV not available" };
    return api.toggleMute();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const api = getMpvAPI();
    if (!api) return { success: false, error: "MPV not available" };
    return api.toggleFullscreen();
  }, []);

  return {
    status,
    isAvailable,
    error,
    load,
    play,
    pause,
    togglePause,
    stop,
    seek,
    seekAbsolute,
    setVolume,
    toggleMute,
    toggleFullscreen,
  };
}

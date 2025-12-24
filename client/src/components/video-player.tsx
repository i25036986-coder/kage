import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAppState } from "@/lib/app-state";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoPlayer() {
  const { currentVideoUrl, isVideoPlayerOpen, closeVideoPlayer } = useAppState();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Track URL changes - reset state
  useEffect(() => {
    console.log("[VideoPlayer] URL changed:", currentVideoUrl);
    if (!currentVideoUrl) return;
    
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    
    // If video element is already mounted, load the new URL
    if (videoRef.current) {
      console.log("[VideoPlayer] Video already mounted, loading new URL");
      videoRef.current.src = currentVideoUrl;
      videoRef.current.load();
    }
  }, [currentVideoUrl]);

  // Callback ref - called when video element mounts/unmounts
  const videoCallbackRef = useCallback((video: HTMLVideoElement | null) => {
    console.log("[VideoPlayer] Video callback ref called, video:", !!video, "url:", currentVideoUrl);
    videoRef.current = video;
    
    if (video && currentVideoUrl) {
      console.log("[VideoPlayer] Video element mounted, loading URL:", currentVideoUrl);
      console.log("[VideoPlayer] Video networkState before:", video.networkState);
      video.src = currentVideoUrl;
      video.load();
      console.log("[VideoPlayer] Video networkState after load():", video.networkState);
    }
  }, [currentVideoUrl]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => {
      console.log("[VideoPlayer] Duration changed:", video.duration);
      setDuration(video.duration);
    };
    const handlePlay = () => {
      console.log("[VideoPlayer] Play event");
      setIsPlaying(true);
    };
    const handlePause = () => {
      console.log("[VideoPlayer] Pause event");
      setIsPlaying(false);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleLoadStart = () => {
      console.log("[VideoPlayer] LoadStart event - starting to load");
      setIsLoading(true);
    };
    const handleCanPlay = () => {
      console.log("[VideoPlayer] CanPlay event - ready to play!");
      setIsLoading(false);
    };
    const handleCanPlayThrough = () => {
      console.log("[VideoPlayer] CanPlayThrough event - fully buffered");
    };
    const handleWaiting = () => {
      console.log("[VideoPlayer] Waiting event - buffering...");
    };
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        console.log(`[VideoPlayer] Progress: buffered ${bufferedEnd.toFixed(1)}s`);
      }
    };
    const handleLoadedMetadata = () => {
      console.log(`[VideoPlayer] LoadedMetadata: duration=${video.duration}, videoWidth=${video.videoWidth}, videoHeight=${video.videoHeight}`);
    };
    const handleLoadedData = () => {
      console.log("[VideoPlayer] LoadedData event - first frame ready");
    };
    const handleStalled = () => {
      console.log("[VideoPlayer] Stalled event - download stalled");
    };
    const handleSuspend = () => {
      console.log("[VideoPlayer] Suspend event - download suspended");
    };
    const handleError = () => {
      const errorCode = video.error?.code;
      const errorMessage = video.error?.message;
      console.error(`[VideoPlayer] Error event: code=${errorCode}, message=${errorMessage}`);
      setIsLoading(false);
      setError("Failed to load video. The link may have expired. Please run Auth Fetch again.");
      toast({
        title: "Video playback failed",
        description: "The stream link may have expired. Run Auth Fetch to get fresh links.",
        variant: "destructive",
      });
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("canplaythrough", handleCanPlayThrough);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("progress", handleProgress);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("stalled", handleStalled);
    video.addEventListener("suspend", handleSuspend);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("canplaythrough", handleCanPlayThrough);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("progress", handleProgress);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("stalled", handleStalled);
      video.removeEventListener("suspend", handleSuspend);
      video.removeEventListener("error", handleError);
    };
  }, [currentVideoUrl, toast]);

  // Keyboard shortcuts (YouTube-style)
  useEffect(() => {
    if (!isVideoPlayerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          if (isPlaying) {
            video.pause();
          } else {
            video.play();
          }
          break;
        case "ArrowLeft":
        case "j":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case "ArrowRight":
        case "l":
          e.preventDefault();
          video.currentTime = Math.min(duration, video.currentTime + 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((v) => Math.min(1, v + 0.1));
          video.volume = Math.min(1, volume + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((v) => Math.max(0, v - 0.1));
          video.volume = Math.max(0, volume - 0.1);
          break;
        case "m":
          e.preventDefault();
          setIsMuted((m) => !m);
          video.muted = !video.muted;
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          e.preventDefault();
          const percent = parseInt(e.key) / 10;
          video.currentTime = duration * percent;
          break;
      }
      resetControlsTimer();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVideoPlayerOpen, isPlaying, duration, volume, resetControlsTimer]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      await container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  if (!currentVideoUrl) return null;

  return (
    <Dialog open={isVideoPlayerOpen} onOpenChange={(open) => !open && closeVideoPlayer()}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black">
        <DialogTitle className="sr-only">Video Player</DialogTitle>
        <div
          ref={containerRef}
          className="relative w-full aspect-video bg-black"
          onMouseMove={resetControlsTimer}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {/* Loading overlay */}
          {isLoading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
              <Loader2 className="h-12 w-12 text-white animate-spin" />
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-white gap-4 p-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-center max-w-sm">{error}</p>
              <Button variant="outline" onClick={closeVideoPlayer}>
                Close
              </Button>
            </div>
          )}

          <video
            ref={videoCallbackRef}
            className="w-full h-full"
            onClick={togglePlay}
            preload="metadata"
          />

          {/* Controls overlay */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Close button */}
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 text-white hover:bg-white/20"
              onClick={closeVideoPlayer}
              data-testid="button-close-player"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Center play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Button
                size="icon"
                variant="ghost"
                className="h-16 w-16 text-white hover:bg-white/20"
                onClick={togglePlay}
                data-testid="button-play-center"
              >
                {isPlaying ? (
                  <Pause className="h-10 w-10" />
                ) : (
                  <Play className="h-10 w-10" />
                )}
              </Button>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
              {/* Progress bar */}
              <Slider
                value={[currentTime]}
                min={0}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSeek}
                className="cursor-pointer"
                data-testid="slider-progress"
              />

              {/* Control buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={togglePlay}
                  data-testid="button-play"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => skip(-10)}
                  data-testid="button-skip-back"
                >
                  <SkipBack className="h-5 w-5" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={() => skip(10)}
                  data-testid="button-skip-forward"
                >
                  <SkipForward className="h-5 w-5" />
                </Button>

                <div className="flex items-center gap-2 w-32">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                    onClick={toggleMute}
                    data-testid="button-mute"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="w-20"
                    data-testid="slider-volume"
                  />
                </div>

                <span className="text-white text-sm ml-2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <div className="flex-1" />

                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  onClick={toggleFullscreen}
                  data-testid="button-fullscreen"
                >
                  {isFullscreen ? (
                    <Minimize className="h-5 w-5" />
                  ) : (
                    <Maximize className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

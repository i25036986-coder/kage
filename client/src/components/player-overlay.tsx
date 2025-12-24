import { useState, useEffect, useCallback, useRef } from "react";
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
  Languages,
  Music,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Track, MpvStatus } from "@/types/electron";

interface PlayerOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getTrackLabel(track: Track): string {
  const parts: string[] = [];
  if (track.title) parts.push(track.title);
  if (track.lang) parts.push(`[${track.lang.toUpperCase()}]`);
  if (track.codec) parts.push(`(${track.codec})`);
  if (track.default) parts.push("*");
  if (track.external) parts.push("[EXT]");
  return parts.length > 0 ? parts.join(" ") : `Track ${track.id}`;
}

export function PlayerOverlay({ isVisible, onClose }: PlayerOverlayProps) {
  const [status, setStatus] = useState<MpvStatus | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Subscribe to MPV events
  useEffect(() => {
    if (!window.mpvAPI || !isVisible) return;

    const cleanups: (() => void)[] = [];

    cleanups.push(window.mpvAPI.onStatusChange((newStatus) => {
      setStatus(newStatus);
    }));

    cleanups.push(window.mpvAPI.onQuit(() => {
      onClose();
    }));

    // Get initial status
    window.mpvAPI.getStatus().then((s) => {
      if (s) setStatus(s);
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [isVisible, onClose]);

  // Auto-hide controls
  const resetHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    setShowControls(true);
    hideTimeoutRef.current = setTimeout(() => {
      if (status?.isPlaying && !status?.isPaused) {
        setShowControls(false);
      }
    }, 3000);
  }, [status?.isPlaying, status?.isPaused]);

  useEffect(() => {
    if (status?.isPaused || !status?.isPlaying) {
      setShowControls(true);
    } else {
      resetHideTimeout();
    }
  }, [status?.isPaused, status?.isPlaying, resetHideTimeout]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!window.mpvAPI) return;
      
      resetHideTimeout();

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          window.mpvAPI.togglePause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          window.mpvAPI.seek(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          window.mpvAPI.seek(5);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (status) {
            window.mpvAPI.setVolume(Math.min(100, status.volume + 5));
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (status) {
            window.mpvAPI.setVolume(Math.max(0, status.volume - 5));
          }
          break;
        case "m":
          e.preventDefault();
          window.mpvAPI.toggleMute();
          break;
        case "f":
          e.preventDefault();
          window.mpvAPI.toggleFullscreen();
          break;
        case "Escape":
          e.preventDefault();
          if (status?.isFullscreen) {
            window.mpvAPI.toggleFullscreen();
          } else {
            window.mpvAPI.quit();
            onClose();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, status, resetHideTimeout, onClose]);

  const handleSeekStart = () => {
    setIsSeeking(true);
    if (status) setSeekPosition(status.position);
  };

  const handleSeekChange = (value: number[]) => {
    setSeekPosition(value[0]);
  };

  const handleSeekEnd = (value: number[]) => {
    setIsSeeking(false);
    if (window.mpvAPI) {
      window.mpvAPI.seekAbsolute(value[0]);
    }
  };

  if (!isVisible || !status) return null;

  const currentPosition = isSeeking ? seekPosition : status.position;
  const progress = status.duration > 0 ? (currentPosition / status.duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-50 bg-black/90 flex flex-col justify-end transition-opacity",
        showControls ? "cursor-default" : "cursor-none"
      )}
      onMouseMove={resetHideTimeout}
      onClick={resetHideTimeout}
      data-testid="player-overlay"
    >
      {/* Buffering indicator */}
      {status.isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-12 w-12 animate-spin text-white/80" />
            <span className="text-white/60 text-sm">Buffering...</span>
          </div>
        </div>
      )}

      {/* Title bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-white text-lg font-medium truncate">
            {status.mediaTitle || status.filename || "Playing..."}
          </h2>
          <Button
            size="icon"
            variant="ghost"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => {
              window.mpvAPI?.quit();
              onClose();
            }}
            data-testid="button-close-player"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Center play/pause button (click to toggle) */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            window.mpvAPI?.togglePause();
          }
        }}
      >
        {!status.isPlaying && !status.isBuffering && (
          <Button
            size="icon"
            variant="ghost"
            className="h-20 w-20 rounded-full bg-white/10 hover:bg-white/20 text-white"
            onClick={() => window.mpvAPI?.play()}
            data-testid="button-center-play"
          >
            <Play className="h-10 w-10" />
          </Button>
        )}
      </div>

      {/* Controls bar */}
      <div
        className={cn(
          "p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Seekbar */}
        <div className="mb-3 px-1">
          <Slider
            value={[currentPosition]}
            min={0}
            max={status.duration || 100}
            step={0.1}
            onPointerDown={handleSeekStart}
            onValueChange={handleSeekChange}
            onValueCommit={handleSeekEnd}
            className="cursor-pointer"
            data-testid="slider-seek"
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left controls */}
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => window.mpvAPI?.togglePause()}
              data-testid="button-play-pause"
            >
              {status.isPaused ? (
                <Play className="h-5 w-5" />
              ) : (
                <Pause className="h-5 w-5" />
              )}
            </Button>

            {/* Skip back */}
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => window.mpvAPI?.seek(-10)}
              data-testid="button-skip-back"
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            {/* Skip forward */}
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => window.mpvAPI?.seek(10)}
              data-testid="button-skip-forward"
            >
              <SkipForward className="h-5 w-5" />
            </Button>

            {/* Volume */}
            <div className="flex items-center gap-2 ml-2">
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => window.mpvAPI?.toggleMute()}
                data-testid="button-mute"
              >
                {status.isMuted || status.volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <Slider
                value={[status.isMuted ? 0 : status.volume]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => window.mpvAPI?.setVolume(v[0])}
                className="w-24"
                data-testid="slider-volume"
              />
            </div>

            {/* Time display */}
            <span className="text-white/80 text-sm ml-4 font-mono">
              {formatTime(currentPosition)} / {formatTime(status.duration)}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            {/* Audio tracks */}
            {status.audioTracks.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                    data-testid="button-audio-tracks"
                  >
                    <Music className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Audio Track</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={String(status.currentAudioTrack)}
                    onValueChange={(v) => window.mpvAPI?.setAudioTrack(parseInt(v))}
                  >
                    {status.audioTracks.map((track) => (
                      <DropdownMenuRadioItem
                        key={track.id}
                        value={String(track.id)}
                        data-testid={`audio-track-${track.id}`}
                      >
                        {getTrackLabel(track)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Subtitle tracks */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                  data-testid="button-subtitle-tracks"
                >
                  <Languages className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Subtitles</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={String(status.currentSubtitleTrack)}
                  onValueChange={(v) => window.mpvAPI?.setSubtitleTrack(parseInt(v))}
                >
                  <DropdownMenuRadioItem value="0" data-testid="subtitle-off">
                    Off
                  </DropdownMenuRadioItem>
                  {status.subtitleTracks.map((track) => (
                    <DropdownMenuRadioItem
                      key={track.id}
                      value={String(track.id)}
                      data-testid={`subtitle-track-${track.id}`}
                    >
                      {getTrackLabel(track)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Playback speed */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/10 px-2"
                  data-testid="button-speed"
                >
                  {status.speed}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Speed</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={String(status.speed)}
                  onValueChange={(v) => window.mpvAPI?.setSpeed(parseFloat(v))}
                >
                  {SPEED_OPTIONS.map((speed) => (
                    <DropdownMenuRadioItem
                      key={speed}
                      value={String(speed)}
                      data-testid={`speed-${speed}`}
                    >
                      {speed}x
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Fullscreen */}
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => window.mpvAPI?.toggleFullscreen()}
              data-testid="button-fullscreen"
            >
              {status.isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

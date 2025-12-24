import { useMpv } from "@/hooks/use-mpv";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  AlertCircle,
} from "lucide-react";

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function MpvPlayerControls() {
  const {
    status,
    isAvailable,
    error,
    togglePause,
    stop,
    seek,
    seekAbsolute,
    setVolume,
    toggleMute,
    toggleFullscreen,
  } = useMpv();

  if (!isAvailable) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            MPV Player
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            MPV player is only available in the Electron desktop app.
          </p>
        </CardContent>
      </Card>
    );
  }

  const progress = status.duration > 0 ? (status.position / status.duration) * 100 : 0;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate">
            {status.filename || "No file loaded"}
          </span>
          {status.isPlaying && (
            <span className="text-xs text-green-500">Playing</span>
          )}
          {status.isPaused && (
            <span className="text-xs text-yellow-500">Paused</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={([value]) => {
              if (status.duration > 0) {
                const newPosition = (value / 100) * status.duration;
                seekAbsolute(newPosition);
              }
            }}
            className="cursor-pointer"
            data-testid="slider-progress"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(status.position)}</span>
            <span>{formatTime(status.duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => seek(-10)}
            data-testid="button-seek-back"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="default"
            onClick={togglePause}
            data-testid="button-play-pause"
          >
            {status.isPaused || !status.isPlaying ? (
              <Play className="h-5 w-5" />
            ) : (
              <Pause className="h-5 w-5" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={stop}
            data-testid="button-stop"
          >
            <Square className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => seek(10)}
            data-testid="button-seek-forward"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleMute}
            data-testid="button-mute"
          >
            {status.isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[status.isMuted ? 0 : status.volume]}
            max={100}
            step={1}
            onValueChange={([value]) => setVolume(value)}
            className="flex-1"
            data-testid="slider-volume"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleFullscreen}
            data-testid="button-fullscreen"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

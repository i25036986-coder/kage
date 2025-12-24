import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppState } from "@/lib/app-state";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  Download,
  ImageIcon,
  Save,
  Lock,
  Unlock,
  Clock,
  File,
  AlertCircle,
} from "lucide-react";
import type { MediaFile } from "@shared/schema";

interface FileDetailPanelProps {
  file: MediaFile | null;
  onPlay?: () => void;
  onDownload?: () => void;
  onChangeThumbnail?: () => void;
  onSaveThumbnail?: () => void;
  onToggleVault?: () => void;
  isVaultLocked?: boolean;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "N/A";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getTimeUntilExpiry(expiry: Date | null): string {
  if (!expiry) return "N/A";
  const now = new Date();
  const diff = new Date(expiry).getTime() - now.getTime();
  if (diff <= 0) return "Expired";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function FileDetailPanel({
  file,
  onDownload,
  onChangeThumbnail,
  onSaveThumbnail,
  onToggleVault,
  isVaultLocked,
}: FileDetailPanelProps) {
  const { openVideoPlayer, isMpvAvailable, playWithMpv } = useAppState();
  const { toast } = useToast();

  if (!file) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <File className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">
          Select a file to view details
        </p>
      </div>
    );
  }

  const isPlayable = file.type === "video" || file.type === "audio";
  const isImage = file.type === "image";
  const isLinkValid = file.linkExpiry ? new Date(file.linkExpiry) > new Date() : true;
  const isExpired = file.linkExpiry ? new Date(file.linkExpiry) <= new Date() : false;

  const hasPlayableUrl = file.downloadUrl || file.dlink;

  const handlePlay = async () => {
    if (!hasPlayableUrl) return;
    
    const streamUrl = `/api/stream/${file.id}`;
    
    console.log("[FileDetailPanel] Playing video:", {
      fileId: file.id,
      hasDlink: !!file.dlink,
      hasDownloadUrl: !!file.downloadUrl,
      useMpv: isMpvAvailable,
    });

    if (isMpvAvailable) {
      const baseUrl = window.location.origin;
      const fullUrl = `${baseUrl}${streamUrl}`;
      const result = await playWithMpv(fullUrl);
      if (!result.success) {
        toast({
          title: "Playback failed",
          description: result.error || "Failed to start MPV player",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Playing in MPV",
          description: file.name,
        });
      }
    } else {
      openVideoPlayer(streamUrl);
    }
  };

  const handleDownload = () => {
    if (hasPlayableUrl) {
      // Use the download proxy for cookie forwarding
      window.open(`/api/download/${file.id}`, "_blank");
    }
    onDownload?.();
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
          {file.thumbnail ? (
            <img
              src={file.thumbnail}
              alt={file.name}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          
          {!isLinkValid && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Preview unavailable</p>
              </div>
            </div>
          )}

          {/* Play button overlay for videos */}
          {isPlayable && hasPlayableUrl && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer hover:bg-black/40 transition-colors"
              onClick={handlePlay}
            >
              <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="h-8 w-8 text-black ml-1" />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">File name</p>
            <p className="text-sm font-medium break-all">{file.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Type</p>
              <p className="text-sm font-medium capitalize">{file.type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Size</p>
              <p className="text-sm font-medium">{formatFileSize(file.size)}</p>
            </div>
          </div>

          {file.duration && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Duration</p>
              <p className="text-sm font-medium">{formatDuration(file.duration)}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-1">Path</p>
            <p className="text-xs font-mono text-muted-foreground break-all">{file.path}</p>
          </div>
        </div>

        <Separator />

        <Card className="p-4 space-y-2 bg-muted/50">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Link Status</span>
          </div>
          
          {isExpired ? (
            <div className="flex items-center gap-2 text-destructive">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              <span className="text-sm">Download link expired</span>
            </div>
          ) : file.linkExpiry ? (
            <div className="flex items-center gap-2 text-green-500">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">Expires in: {getTimeUntilExpiry(file.linkExpiry)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-muted-foreground" />
              <span className="text-sm">No expiry information</span>
            </div>
          )}

          {isExpired && (
            <p className="text-xs text-muted-foreground mt-2">
              Authentication required to generate a new link
            </p>
          )}
        </Card>

        <Separator />

        <div className="space-y-2">
          {isPlayable && hasPlayableUrl && (
            <Button
              className="w-full gap-2"
              onClick={handlePlay}
              data-testid="button-play"
            >
              <Play className="h-4 w-4" />
              Play Video
            </Button>
          )}

          {isImage && hasPlayableUrl && (
            <Button
              className="w-full gap-2"
              onClick={handlePlay}
              data-testid="button-view"
            >
              <ImageIcon className="h-4 w-4" />
              View Fullscreen
            </Button>
          )}

          {hasPlayableUrl && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleDownload}
              data-testid="button-download"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          )}

          {!hasPlayableUrl && (
            <p className="text-xs text-muted-foreground text-center">
              Run Auth Fetch to get playable links
            </p>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onChangeThumbnail}
            data-testid="button-change-thumbnail"
          >
            <ImageIcon className="h-4 w-4" />
            Change Thumbnail
          </Button>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onSaveThumbnail}
            data-testid="button-save-thumbnail"
          >
            <Save className="h-4 w-4" />
            Save Thumbnail Locally
          </Button>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onToggleVault}
            data-testid="button-vault-toggle"
          >
            {isVaultLocked ? (
              <>
                <Unlock className="h-4 w-4" />
                Unlock Vault
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Lock Vault
              </>
            )}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Image, 
  Video, 
  Music, 
  FileText, 
  File,
  Clock,
} from "lucide-react";
import type { MediaFile } from "@shared/schema";

interface FileCardProps {
  file: MediaFile;
  onClick?: () => void;
  onDoubleClick?: () => void;
  isSelected?: boolean;
}

function getTypeIcon(type: string) {
  switch (type) {
    case "image":
      return Image;
    case "video":
      return Video;
    case "audio":
      return Music;
    case "document":
      return FileText;
    default:
      return File;
  }
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function FileCard({ file, onClick, onDoubleClick, isSelected }: FileCardProps) {
  const TypeIcon = getTypeIcon(file.type);
  const hasSize = file.size !== null && file.size > 0;
  const hasDuration = file.duration !== null && file.duration > 0;
  const isVideo = file.type === "video";

  return (
    <Card
      className={`group relative overflow-visible cursor-pointer transition-all hover-elevate active-elevate-2 ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      data-testid={`card-file-${file.id}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-t-lg bg-muted">
        {file.thumbnail ? (
          <img
            src={file.thumbnail}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <TypeIcon className="h-10 w-10 text-muted-foreground/50" />
          </div>
        )}

        <div className="absolute right-2 top-2">
          <Badge variant="secondary" className="p-1">
            <TypeIcon className="h-3 w-3" />
          </Badge>
        </div>

        {(hasSize || hasDuration) && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            {hasDuration && (
              <Badge variant="secondary" className="gap-1 text-xs bg-background/80 backdrop-blur-sm">
                <Clock className="h-3 w-3" />
                {formatDuration(file.duration)}
              </Badge>
            )}
            {hasSize && !hasDuration && (
              <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
                {formatFileSize(file.size)}
              </Badge>
            )}
          </div>
        )}

        {/* Video indicator overlay */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-10 w-10 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Video className="h-5 w-5 text-white" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-medium truncate" title={file.name}>
          {file.name}
        </p>
        {hasSize && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatFileSize(file.size)}
          </p>
        )}
      </div>
    </Card>
  );
}

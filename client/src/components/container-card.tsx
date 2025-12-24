import type { MouseEvent } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  File, 
  FolderOpen, 
  Files, 
  HelpCircle,
  Lock,
  AlertCircle,
  Globe,
  Key,
  Loader2,
  Play,
  Download,
  Trash2
} from "lucide-react";
import type { VirtualContainer } from "@shared/schema";

interface ContainerCardProps {
  container: VirtualContainer;
  onClick?: () => void;
  onPublicFetch?: () => void;
  onAuthFetch?: () => void;
  onPlay?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  isPublicFetching?: boolean;
  isAuthFetching?: boolean;
  isDeleting?: boolean;
  isSelected?: boolean;
  hasPlayableFiles?: boolean;
}

function getTypeIcon(type: string) {
  switch (type) {
    case "single":
      return File;
    case "multiple":
      return Files;
    case "folder":
      return FolderOpen;
    default:
      return HelpCircle;
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case "single":
      return "Single file";
    case "multiple":
      return "Multiple files";
    case "folder":
      return "Folder";
    default:
      return "Unknown";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "authenticated":
      return "bg-green-500/20 text-green-400";
    case "expanded":
      return "bg-blue-500/20 text-blue-400";
    case "expired":
      return "bg-red-500/20 text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "basic":
      return "Public info only";
    case "authenticated":
      return "Ready for auth fetch";
    case "expanded":
      return "Expanded";
    case "expired":
      return "Session expired";
    default:
      return "Unknown status";
  }
}

export function ContainerCard({ 
  container, 
  onClick, 
  onPublicFetch, 
  onAuthFetch,
  onPlay,
  onDownload,
  onDelete,
  isPublicFetching,
  isAuthFetching,
  isDeleting,
  isSelected,
  hasPlayableFiles
}: ContainerCardProps) {
  const TypeIcon = getTypeIcon(container.type);
  const isExpired = container.status === "expired";
  const isBasic = container.status === "basic";
  const isExpanded = container.status === "expanded";
  const canAuthFetch = !isExpanded;
  const canPlay = isExpanded && hasPlayableFiles;

  const handlePublicFetch = (e: MouseEvent) => {
    e.stopPropagation();
    onPublicFetch?.();
  };

  const handleAuthFetch = (e: MouseEvent) => {
    e.stopPropagation();
    onAuthFetch?.();
  };

  const handlePlay = (e: MouseEvent) => {
    e.stopPropagation();
    onPlay?.();
  };

  const handleDownload = (e: MouseEvent) => {
    e.stopPropagation();
    onDownload?.();
  };

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <Card
      className={`group relative overflow-visible cursor-pointer transition-all hover-elevate active-elevate-2 ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onClick}
      data-testid={`card-container-${container.id}`}
    >
      <div className="relative aspect-video overflow-hidden rounded-t-lg bg-muted">
        {container.thumbnail ? (
          <img
            src={container.thumbnail}
            alt={container.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <TypeIcon className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        
        {isBasic && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40">
            <Lock className="h-8 w-8 text-muted-foreground/70" />
          </div>
        )}

        {isExpired && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        )}

        <div className="absolute right-2 top-2">
          <Badge variant="secondary" className="gap-1 text-xs">
            <TypeIcon className="h-3 w-3" />
            {getTypeLabel(container.type)}
          </Badge>
        </div>

        <div className="absolute left-2 top-2 invisible group-hover:visible transition-opacity">
          <Button
            size="icon"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            data-testid={`button-delete-${container.id}`}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-medium text-sm truncate" title={container.title}>
          {container.title}
        </h3>
        
        <p className="text-xs text-muted-foreground font-mono truncate" title={container.url}>
          {container.url}
        </p>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md ${getStatusColor(container.status)}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {getStatusLabel(container.status)}
          </span>
        </div>

        {container.fileCount !== null && container.fileCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {container.fileCount} file{container.fileCount !== 1 ? "s" : ""}
          </p>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          {canPlay ? (
            <>
              <Button
                size="sm"
                variant="default"
                className="flex-1 gap-1"
                onClick={handlePlay}
                data-testid={`button-play-${container.id}`}
              >
                <Play className="h-3 w-3" />
                Play
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1"
                onClick={handleDownload}
                data-testid={`button-download-${container.id}`}
              >
                <Download className="h-3 w-3" />
                Download
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 gap-1"
                onClick={handlePublicFetch}
                disabled={isPublicFetching}
                data-testid={`button-public-fetch-${container.id}`}
              >
                {isPublicFetching ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Globe className="h-3 w-3" />
                )}
                Public
              </Button>
              <Button
                size="sm"
                variant={canAuthFetch ? "outline" : "ghost"}
                className="flex-1 gap-1"
                onClick={handleAuthFetch}
                disabled={isAuthFetching || isExpanded}
                data-testid={`button-auth-fetch-${container.id}`}
              >
                {isAuthFetching ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Key className="h-3 w-3" />
                )}
                Auth
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

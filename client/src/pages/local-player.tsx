import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  ArrowLeft,
  PlayCircle,
  FolderSearch,
  Video,
  RefreshCw,
  Clock,
  HardDrive,
  Loader2,
} from "lucide-react";

interface LocalMediaFile {
  filename: string;
  path: string;
  url: string;
  size: number;
  extension: string;
  createdAt: string;
}

interface ScanResult {
  scanPath: string;
  count: number;
  files: LocalMediaFile[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function LocalPlayer() {
  const [, navigate] = useLocation();
  const [selectedFile, setSelectedFile] = useState<LocalMediaFile | null>(null);

  const { data: scanResult, isLoading, refetch, isFetching } = useQuery<ScanResult>({
    queryKey: ["/api/local-media/scan"],
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const handlePlay = (file: LocalMediaFile) => {
    setSelectedFile(file);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Local Player</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
          data-testid="button-scan"
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Scan for Videos
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r flex flex-col">
          <div className="p-3 border-b bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FolderSearch className="h-4 w-4" />
              <span className="truncate text-xs">{scanResult?.scanPath || "data/local-media"}</span>
            </div>
            {scanResult && (
              <div className="mt-1 text-xs text-muted-foreground">
                {scanResult.count} video{scanResult.count !== 1 ? "s" : ""} found
              </div>
            )}
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-md" />
                ))}
              </div>
            ) : !scanResult || scanResult.count === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={Video}
                  title="No videos found"
                  description="Place video files in data/local-media folder and click 'Scan for Videos'"
                />
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {scanResult.files.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => handlePlay(file)}
                    className={`w-full text-left p-3 rounded-md hover-elevate transition-colors ${
                      selectedFile?.path === file.path
                        ? "bg-accent"
                        : ""
                    }`}
                    data-testid={`button-video-${file.filename}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <Video className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{file.filename}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {file.extension.replace(".", "").toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedFile ? (
            <>
              <div className="flex-1 bg-black flex items-center justify-center">
                <video
                  key={selectedFile.url}
                  controls
                  autoPlay
                  className="max-h-full max-w-full"
                  data-testid="video-player"
                >
                  <source src={selectedFile.url} />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="p-4 border-t bg-muted/30">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-semibold truncate">{selectedFile.filename}</h2>
                    <p className="text-sm text-muted-foreground truncate">{selectedFile.path}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-4 w-4" />
                      {formatFileSize(selectedFile.size)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(selectedFile.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={PlayCircle}
                title="No video selected"
                description="Select a video from the list to start playing"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

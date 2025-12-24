import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  ExternalLink,
  Lock,
  Unlock,
  ImageIcon,
  Save,
  FolderOpen,
  Clock,
  AlertCircle,
  File,
  Files,
  Loader2,
} from "lucide-react";
import type { VirtualContainer } from "@shared/schema";

function getTypeIcon(type: string) {
  switch (type) {
    case "single":
      return File;
    case "multiple":
      return Files;
    case "folder":
      return FolderOpen;
    default:
      return File;
  }
}

export default function ContainerDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: container, isLoading, error } = useQuery<VirtualContainer>({
    queryKey: ["/api/containers", id],
  });

  const unlockMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/containers/${id}/unlock`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/containers"] });
      toast({
        title: "Container unlocked",
        description: "You can now view files inside this container",
      });
      navigate(`/container/${id}/folder`);
    },
    onError: () => {
      toast({
        title: "Failed to unlock",
        description: "There was an error unlocking the container",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-6 max-w-3xl mx-auto w-full space-y-6">
          <Skeleton className="aspect-video rounded-lg" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !container) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium mb-2">Container not found</p>
        <p className="text-sm text-muted-foreground mb-4">
          The container you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate("/")} data-testid="button-go-back">
          Back to Library
        </Button>
      </div>
    );
  }

  const TypeIcon = getTypeIcon(container.type);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold truncate">{container.title}</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-3xl mx-auto space-y-6">
          <Card className="overflow-hidden">
            <div className="relative aspect-video bg-muted">
              {container.thumbnail ? (
                <img
                  src={container.thumbnail}
                  alt={container.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <TypeIcon className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}

              {container.status === "basic" && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                  <div className="text-center">
                    <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Content locked</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{container.title}</h2>
              <div className="flex items-center gap-2 mt-2">
                <a
                  href={container.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground font-mono hover:text-foreground transition-colors flex items-center gap-1"
                  data-testid="link-url"
                >
                  {container.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <TypeIcon className="h-3 w-3" />
                {container.type === "single" && "Single file"}
                {container.type === "multiple" && "Multiple files"}
                {container.type === "folder" && "Folder"}
                {container.type === "unknown" && "Unknown"}
              </Badge>
              {container.genre && (
                <Badge variant="outline" className="capitalize">
                  {container.genre}
                </Badge>
              )}
            </div>

            <Separator />

            <Card className="p-4 space-y-3 bg-muted/50">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Container Status</span>
              </div>

              <div className="space-y-2">
                {container.status === "basic" ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Basic information available
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-500">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">File count: Unknown</span>
                    </div>
                  </>
                ) : container.status === "authenticated" ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm">Authenticated</span>
                  </div>
                ) : container.status === "expanded" ? (
                  <div className="flex items-center gap-2 text-blue-500">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-sm">Expanded - {container.fileCount} files</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-500">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-sm">Authentication expired</span>
                  </div>
                )}
              </div>

              {container.status === "basic" && (
                <p className="text-sm text-muted-foreground pt-2 border-t border-border">
                  Files inside this container are not listed yet. Authenticate to view and access files.
                </p>
              )}
            </Card>

            <Separator />

            <div className="space-y-3">
              {container.status === "basic" || container.status === "expired" ? (
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => unlockMutation.mutate()}
                  disabled={unlockMutation.isPending}
                  data-testid="button-unlock"
                >
                  {unlockMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      Authenticate / Unlock to view files
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => navigate(`/container/${id}/folder`)}
                  data-testid="button-view-files"
                >
                  <FolderOpen className="h-4 w-4" />
                  View Files
                </Button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="gap-2" data-testid="button-change-thumbnail">
                  <ImageIcon className="h-4 w-4" />
                  Change Thumbnail
                </Button>
                <Button variant="outline" className="gap-2" data-testid="button-save-thumbnail">
                  <Save className="h-4 w-4" />
                  Save Locally
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

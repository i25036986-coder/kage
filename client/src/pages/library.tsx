import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ContainerCard } from "@/components/container-card";
import { EmptyState } from "@/components/empty-state";
import { PanelBackgroundLayer } from "@/components/panel-background";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppState } from "@/lib/app-state";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Search, LayoutGrid, List, FolderOpen, AlertCircle } from "lucide-react";
import type { VirtualContainer, MediaFile, AppSettings } from "@shared/schema";

type ViewMode = "grid" | "list";
type SortOption = "name" | "date" | "type" | "status";

export default function Library() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fetchingPublic, setFetchingPublic] = useState<Set<string>>(new Set());
  const [fetchingAuth, setFetchingAuth] = useState<Set<string>>(new Set());
  const [deletingContainers, setDeletingContainers] = useState<Set<string>>(new Set());

  const { ratingFilter, openVideoPlayer, isMpvAvailable, playWithMpv } = useAppState();
  const { toast } = useToast();

  // Fetch settings for panel background
  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
    staleTime: 1000 * 60,
  });

  // Cache for container files to determine playability
  const [containerFiles, setContainerFiles] = useState<Record<string, MediaFile[]>>({});

  const publicFetchMutation = useMutation({
    mutationFn: async (containerId: string) => {
      setFetchingPublic(prev => new Set(prev).add(containerId));
      const response = await apiRequest("POST", `/api/containers/${containerId}/public-fetch`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers"] });
      toast({
        title: "Public Fetch Complete",
        description: `Updated metadata for ${data.container?.title || "container"}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Public Fetch Failed",
        description: error instanceof Error ? error.message : "Could not fetch public metadata",
        variant: "destructive",
      });
    },
    onSettled: (_, __, containerId) => {
      setFetchingPublic(prev => {
        const next = new Set(prev);
        next.delete(containerId);
        return next;
      });
    },
  });

  const authFetchMutation = useMutation({
    mutationFn: async (containerId: string) => {
      setFetchingAuth(prev => new Set(prev).add(containerId));
      const response = await apiRequest("POST", `/api/containers/${containerId}/auth-fetch`);
      return { ...(await response.json()), containerId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers"] });
      // Invalidate cached files to refresh playable links
      setContainerFiles(prev => {
        const next = { ...prev };
        delete next[data.containerId];
        return next;
      });
      toast({
        title: "Auth Fetch Complete",
        description: `Found ${data.count || 0} files with playable links`,
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Could not fetch authenticated metadata";
      if (message.includes("No active authentication")) {
        toast({
          title: "Authentication Required",
          description: "Please use the Auth button in the header to authenticate first",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Auth Fetch Failed",
          description: message,
          variant: "destructive",
        });
      }
    },
    onSettled: (_, __, containerId) => {
      setFetchingAuth(prev => {
        const next = new Set(prev);
        next.delete(containerId);
        return next;
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (containerId: string) => {
      setDeletingContainers(prev => new Set(prev).add(containerId));
      const response = await apiRequest("DELETE", `/api/containers/${containerId}`);
      if (!response.ok) throw new Error("Failed to delete container");
      return containerId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers"] });
      toast({
        title: "Container Deleted",
        description: "The container has been removed from your library",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Could not delete container",
        variant: "destructive",
      });
    },
    onSettled: (containerId) => {
      if (containerId) {
        setDeletingContainers(prev => {
          const next = new Set(prev);
          next.delete(containerId);
          return next;
        });
      }
    },
  });

  const { data: containers = [], isLoading, error } = useQuery<VirtualContainer[]>({
    queryKey: ["/api/containers", { rating: ratingFilter }],
    queryFn: async () => {
      const res = await fetch(`/api/containers?rating=${ratingFilter}`);
      if (!res.ok) throw new Error("Failed to fetch containers");
      return res.json();
    },
  });

  const filteredContainers = containers.filter(container =>
    container.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    container.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedContainers = [...filteredContainers].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.title.localeCompare(b.title);
      case "date":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "type":
        return a.type.localeCompare(b.type);
      case "status":
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  const handleContainerClick = (container: VirtualContainer) => {
    setSelectedId(container.id);
    if (container.isExpanded) {
      navigate(`/container/${container.id}/folder`);
    } else {
      navigate(`/container/${container.id}`);
    }
  };

  const handlePublicFetch = (container: VirtualContainer) => {
    publicFetchMutation.mutate(container.id);
  };

  const handleAuthFetch = (container: VirtualContainer) => {
    authFetchMutation.mutate(container.id);
  };

  const handleDelete = (container: VirtualContainer) => {
    deleteMutation.mutate(container.id);
  };

  // Fetch files for a container and cache them
  const fetchContainerFiles = async (containerId: string): Promise<MediaFile[]> => {
    if (containerFiles[containerId]) {
      return containerFiles[containerId];
    }
    const res = await fetch(`/api/containers/${containerId}/files`);
    if (!res.ok) return [];
    const files = await res.json();
    setContainerFiles(prev => ({ ...prev, [containerId]: files }));
    return files;
  };

  // Get first playable video file
  const getPlayableFile = (files: MediaFile[]): MediaFile | null => {
    const videoExtensions = /\.(mp4|mkv|avi|mov|webm|m4v|flv|wmv|3gp)$/i;
    return files.find(f => 
      f.type === "video" || videoExtensions.test(f.name)
    ) || files.find(f => f.downloadUrl || f.dlink) || null;
  };

  const handlePlay = async (container: VirtualContainer) => {
    const files = await fetchContainerFiles(container.id);
    const playableFile = getPlayableFile(files);
    
    if (!playableFile) {
      toast({
        title: "No playable files",
        description: "This container has no video files to play",
        variant: "destructive",
      });
      return;
    }

    if (!playableFile.downloadUrl && !playableFile.dlink) {
      toast({
        title: "Auth Fetch required",
        description: "Run Auth Fetch to get playable links",
        variant: "destructive",
      });
      return;
    }

    // Build the stream URL
    const streamUrl = `/api/stream/${playableFile.id}`;
    
    console.log("[Library] Playing video:", {
      fileId: playableFile.id,
      fileName: playableFile.name,
      hasDlink: !!playableFile.dlink,
      hasDownloadUrl: !!playableFile.downloadUrl,
      useMpv: isMpvAvailable,
    });

    // Use MPV when running in Electron, otherwise fall back to HTML5 player
    if (isMpvAvailable) {
      // For MPV, we need the full URL including the server base
      const baseUrl = window.location.origin;
      const fullUrl = `${baseUrl}${streamUrl}`;
      console.log("[Library] Playing with MPV:", fullUrl);
      
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
          description: playableFile.name,
        });
      }
    } else {
      // Fall back to HTML5 video player (may not work for TeraBox streams)
      openVideoPlayer(streamUrl);
    }
  };

  const handleDownload = async (container: VirtualContainer) => {
    const files = await fetchContainerFiles(container.id);
    const downloadableFile = files.find(f => f.downloadUrl || f.dlink);
    
    if (!downloadableFile) {
      toast({
        title: "No downloadable files",
        description: "Run Auth Fetch to get download links",
        variant: "destructive",
      });
      return;
    }

    // Open download in new tab
    window.open(`/api/download/${downloadableFile.id}`, "_blank");
  };

  // Check if container has playable files
  const hasPlayableFiles = (container: VirtualContainer): boolean => {
    if (!container.isExpanded || container.status !== "expanded") return false;
    const files = containerFiles[container.id];
    if (!files) {
      // Trigger async fetch for next render
      fetchContainerFiles(container.id);
      return false;
    }
    return files.some(f => f.downloadUrl || f.dlink);
  };

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium mb-2">Failed to load containers</p>
        <p className="text-sm text-muted-foreground">
          Unable to fetch data from the server. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search containers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-36" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date added</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="type">Type</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            data-testid="button-view-grid"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button onClick={() => navigate("/add")} className="gap-2" data-testid="button-add-new">
            <Plus className="h-4 w-4" />
            Add New
          </Button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {settings?.mainPanelBackground && settings.mainPanelBackground.mode !== "default" && (
          <PanelBackgroundLayer background={settings.mainPanelBackground} />
        )}
        <ScrollArea className="h-full relative z-10 bg-transparent">
        {isLoading ? (
          <div className={`p-4 ${
            viewMode === "grid" 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
              : "space-y-2"
          }`}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : sortedContainers.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No containers found"
            description={searchQuery 
              ? "Try adjusting your search terms" 
              : `No ${ratingFilter} content. Add your first container to get started.`
            }
            action={!searchQuery ? {
              label: "Add New Container",
              onClick: () => navigate("/add"),
            } : undefined}
          />
        ) : (
          <div className={`p-4 ${
            viewMode === "grid" 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
              : "space-y-2"
          }`}>
            {sortedContainers.map(container => (
              <ContainerCard
                key={container.id}
                container={container}
                onClick={() => handleContainerClick(container)}
                onPublicFetch={() => handlePublicFetch(container)}
                onAuthFetch={() => handleAuthFetch(container)}
                onPlay={() => handlePlay(container)}
                onDownload={() => handleDownload(container)}
                onDelete={() => handleDelete(container)}
                isPublicFetching={fetchingPublic.has(container.id)}
                isAuthFetching={fetchingAuth.has(container.id)}
                isDeleting={deletingContainers.has(container.id)}
                isSelected={selectedId === container.id}
                hasPlayableFiles={hasPlayableFiles(container)}
              />
            ))}
          </div>
        )}
        </ScrollArea>
      </div>
    </div>
  );
}

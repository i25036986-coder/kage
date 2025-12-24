import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ContainerCard } from "@/components/container-card";
import { EmptyState } from "@/components/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Rocket, TreeDeciduous, Building2, Tag, AlertCircle } from "lucide-react";
import type { VirtualContainer } from "@shared/schema";

const genreInfo: Record<string, { title: string; icon: typeof Rocket }> = {
  "sci-fi": { title: "Sci-Fi", icon: Rocket },
  "nature": { title: "Nature", icon: TreeDeciduous },
  "architecture": { title: "Architecture", icon: Building2 },
};

export default function Genre() {
  const { genre } = useParams<{ genre: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [fetchingPublic, setFetchingPublic] = useState<Set<string>>(new Set());
  const [fetchingAuth, setFetchingAuth] = useState<Set<string>>(new Set());

  const info = genreInfo[genre || ""] || { title: genre, icon: Tag };
  const Icon = info.icon;

  const publicFetchMutation = useMutation({
    mutationFn: async (containerId: string) => {
      setFetchingPublic(prev => new Set(prev).add(containerId));
      const response = await apiRequest("POST", `/api/containers/${containerId}/public-fetch`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers/genre", genre] });
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
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers/genre", genre] });
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

  const { data: containers = [], isLoading, error } = useQuery<VirtualContainer[]>({
    queryKey: ["/api/containers/genre", genre],
  });

  const handleContainerClick = (container: VirtualContainer) => {
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

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium mb-2">Failed to load containers</p>
        <p className="text-sm text-muted-foreground">
          Unable to fetch data from the server.
        </p>
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">{info.title}</h1>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : containers.length === 0 ? (
          <EmptyState
            icon={Icon}
            title={`No ${info.title} containers`}
            description={`Add containers with the ${info.title} genre to see them here.`}
            action={{
              label: "Add Container",
              onClick: () => navigate("/add"),
            }}
          />
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {containers.map(container => (
              <ContainerCard
                key={container.id}
                container={container}
                onClick={() => handleContainerClick(container)}
                onPublicFetch={() => handlePublicFetch(container)}
                onAuthFetch={() => handleAuthFetch(container)}
                isPublicFetching={fetchingPublic.has(container.id)}
                isAuthFetching={fetchingAuth.has(container.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

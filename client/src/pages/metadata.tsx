import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Tags, 
  Plus, 
  Trash2, 
  Palette,
  Loader2,
  FolderOpen
} from "lucide-react";
import type { Tag, Genre, VirtualContainer } from "@shared/schema";

const colorOptions = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#a855f7", // purple
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#8b5cf6", // violet
];

export default function Metadata() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(colorOptions[0]);
  const [newGenreName, setNewGenreName] = useState("");
  const [newGenreColor, setNewGenreColor] = useState(colorOptions[1]);

  const { data: tags = [], isLoading: tagsLoading } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  const { data: genres = [], isLoading: genresLoading } = useQuery<Genre[]>({
    queryKey: ["/api/genres"],
  });

  const { data: containers = [], isLoading: containersLoading } = useQuery<VirtualContainer[]>({
    queryKey: ["/api/containers"],
  });

  const createTagMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const response = await apiRequest("POST", "/api/tags", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create tag");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setNewTagName("");
      toast({
        title: "Tag created",
        description: "The new tag has been added",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      toast({
        title: "Tag deleted",
        description: "The tag has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete tag",
        description: "There was an error deleting the tag",
        variant: "destructive",
      });
    },
  });

  const createGenreMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const response = await apiRequest("POST", "/api/genres", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create genre");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/genres"] });
      setNewGenreName("");
      toast({
        title: "Genre created",
        description: "The new genre has been added",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create genre",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteGenreMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/genres/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/genres"] });
      toast({
        title: "Genre deleted",
        description: "The genre has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete genre",
        description: "There was an error deleting the genre",
        variant: "destructive",
      });
    },
  });

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor });
  };

  const handleCreateGenre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGenreName.trim()) return;
    createGenreMutation.mutate({ name: newGenreName.trim(), color: newGenreColor });
  };

  const isLoading = tagsLoading || containersLoading || genresLoading;

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
        <h1 className="text-lg font-semibold">Metadata Management</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-3xl mx-auto space-y-6">
          {/* Tags Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" />
                Tags
              </CardTitle>
              <CardDescription>
                Create and manage tags for organizing your containers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create new tag */}
              <form onSubmit={handleCreateTag} className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="tag-name">Tag Name</Label>
                    <Input
                      id="tag-name"
                      placeholder="Enter tag name..."
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      data-testid="input-tag-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-1">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`h-9 w-9 rounded-md transition-all ${
                            newTagColor === color ? "ring-2 ring-offset-2 ring-primary" : ""
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewTagColor(color)}
                          data-testid={`button-tag-color-${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={createTagMutation.isPending || !newTagName.trim()}
                  data-testid="button-create-tag"
                >
                  {createTagMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create Tag
                </Button>
              </form>

              {/* Existing tags */}
              <div className="space-y-2">
                <Label>Existing Tags</Label>
                {isLoading ? (
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-24" />
                    ))}
                  </div>
                ) : tags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tags created yet</p>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        className="gap-2 pr-1"
                        style={{ backgroundColor: tag.color }}
                        data-testid={`badge-tag-${tag.id}`}
                      >
                        {tag.name}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 hover:bg-white/20"
                          onClick={() => deleteTagMutation.mutate(tag.id)}
                          disabled={deleteTagMutation.isPending}
                          data-testid={`button-delete-tag-${tag.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Genres Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Genres
              </CardTitle>
              <CardDescription>
                Create and manage genres for categorizing your containers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create new genre */}
              <form onSubmit={handleCreateGenre} className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="genre-name">Genre Name</Label>
                    <Input
                      id="genre-name"
                      placeholder="Enter genre name..."
                      value={newGenreName}
                      onChange={(e) => setNewGenreName(e.target.value)}
                      data-testid="input-genre-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-1">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`h-9 w-9 rounded-md transition-all ${
                            newGenreColor === color ? "ring-2 ring-offset-2 ring-primary" : ""
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewGenreColor(color)}
                          data-testid={`button-genre-color-${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={createGenreMutation.isPending || !newGenreName.trim()}
                  data-testid="button-create-genre"
                >
                  {createGenreMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create Genre
                </Button>
              </form>

              {/* Existing genres */}
              <div className="space-y-2">
                <Label>Existing Genres</Label>
                {isLoading ? (
                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-24" />
                    ))}
                  </div>
                ) : genres.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No genres created yet</p>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {genres.map((genre) => (
                      <Badge
                        key={genre.id}
                        className="gap-2 pr-1 capitalize"
                        style={{ backgroundColor: genre.color }}
                        data-testid={`badge-genre-${genre.id}`}
                      >
                        {genre.name}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 hover:bg-white/20"
                          onClick={() => deleteGenreMutation.mutate(genre.id)}
                          disabled={deleteGenreMutation.isPending}
                          data-testid={`button-delete-genre-${genre.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Container Tags Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Container Tag Usage
              </CardTitle>
              <CardDescription>
                See which tags are applied to your containers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : containers.filter(c => c.tags && c.tags.length > 0).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No containers have tags assigned yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {containers
                    .filter(c => c.tags && c.tags.length > 0)
                    .slice(0, 10)
                    .map((container) => (
                      <div
                        key={container.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        data-testid={`container-tags-${container.id}`}
                      >
                        <span className="text-sm font-medium truncate flex-1">
                          {container.title}
                        </span>
                        <div className="flex gap-1 ml-4">
                          {container.tags.map((tagName) => {
                            const tag = tags.find(t => t.name === tagName);
                            return (
                              <Badge
                                key={tagName}
                                variant="secondary"
                                className="text-xs"
                                style={tag ? { backgroundColor: tag.color } : {}}
                              >
                                {tagName}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

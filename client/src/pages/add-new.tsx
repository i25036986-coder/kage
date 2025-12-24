import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Link2, 
  Plus, 
  Loader2, 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  ListTodo,
  Globe,
  Trash2
} from "lucide-react";
import type { ContentRating, PublicFetchQueueItem } from "@shared/schema";

export default function AddNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Single URL state
  const [url, setUrl] = useState("");
  const [genre, setGenre] = useState("");
  const [rating, setRating] = useState<ContentRating>("regular");

  // Bulk upload state
  const [bulkUrls, setBulkUrls] = useState("");
  const [bulkGenre, setBulkGenre] = useState("");
  const [bulkRating, setBulkRating] = useState<ContentRating>("regular");

  // Fetching state
  const [fetchingItems, setFetchingItems] = useState<Set<string>>(new Set());

  // Fetch queue
  const { data: queueItems = [], refetch: refetchQueue } = useQuery<PublicFetchQueueItem[]>({
    queryKey: ["/api/queue"],
    refetchInterval: 5000,
  });

  const addToQueueMutation = useMutation({
    mutationFn: async (data: { urls: string[]; genre?: string; rating?: ContentRating; tags?: string[] }) => {
      const response = await apiRequest("POST", "/api/queue", data);
      return response.json();
    },
    onSuccess: (items) => {
      refetchQueue();
      toast({
        title: "Added to queue",
        description: `${items.length} URL(s) added to fetch queue`,
      });
      setUrl("");
      setBulkUrls("");
    },
    onError: () => {
      toast({
        title: "Failed to add to queue",
        description: "There was an error adding URLs to the queue",
        variant: "destructive",
      });
    },
  });

  const publicFetchMutation = useMutation({
    mutationFn: async (queueId: string) => {
      setFetchingItems(prev => new Set(prev).add(queueId));
      const response = await apiRequest("POST", `/api/queue/${queueId}/public-fetch`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/containers"] });
      refetchQueue();
      toast({
        title: "Public Fetch Complete",
        description: `Container "${data.container?.title || "Unknown"}" created successfully`,
      });
    },
    onError: (error) => {
      refetchQueue();
      toast({
        title: "Public Fetch Failed",
        description: error instanceof Error ? error.message : "Could not fetch public metadata",
        variant: "destructive",
      });
    },
    onSettled: (_, __, queueId) => {
      setFetchingItems(prev => {
        const next = new Set(prev);
        next.delete(queueId);
        return next;
      });
    },
  });

  const removeFromQueueMutation = useMutation({
    mutationFn: async (queueId: string) => {
      await apiRequest("DELETE", `/api/queue/${queueId}`);
    },
    onSuccess: () => {
      refetchQueue();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    addToQueueMutation.mutate({
      urls: [url.trim()],
      genre: genre || undefined,
      rating,
    });
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const urls = bulkUrls
      .split("\n")
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urls.length === 0) {
      toast({
        title: "No URLs provided",
        description: "Please enter at least one URL",
        variant: "destructive",
      });
      return;
    }

    addToQueueMutation.mutate({
      urls,
      genre: bulkGenre || undefined,
      rating: bulkRating,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBulkUrls(content);
    };
    reader.readAsText(file);
  };

  const handleFetchAll = async () => {
    const pending = queueItems.filter(item => item.status === "pending" || item.status === "failed");
    for (const item of pending) {
      publicFetchMutation.mutate(item.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "fetching":
        return <Badge variant="default" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Fetching</Badge>;
      case "success":
        return <Badge variant="default" className="bg-green-500/20 text-green-400">Success</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
        <h1 className="text-lg font-semibold">Add New Container</h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="single" data-testid="tab-single">
                <Link2 className="h-4 w-4 mr-2" />
                Single URL
              </TabsTrigger>
              <TabsTrigger value="bulk" data-testid="tab-bulk">
                <FileText className="h-4 w-4 mr-2" />
                Bulk Upload
              </TabsTrigger>
              <TabsTrigger value="queue" data-testid="tab-queue">
                <ListTodo className="h-4 w-4 mr-2" />
                Queue ({queueItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Add URL
                  </CardTitle>
                  <CardDescription>
                    Add a TeraBox URL to the fetch queue. Public fetch will retrieve basic metadata.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="url">URL *</Label>
                      <Input
                        id="url"
                        type="url"
                        placeholder="https://terabox.com/s/..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="font-mono text-sm"
                        data-testid="input-url"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="genre">Genre</Label>
                        <Select value={genre} onValueChange={setGenre}>
                          <SelectTrigger id="genre" data-testid="select-genre">
                            <SelectValue placeholder="Select genre" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                            <SelectItem value="nature">Nature</SelectItem>
                            <SelectItem value="architecture">Architecture</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rating">Rating</Label>
                        <Select value={rating} onValueChange={(v) => setRating(v as ContentRating)}>
                          <SelectTrigger id="rating" data-testid="select-rating">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="adult">Adult</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/")}
                        className="flex-1"
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 gap-2"
                        disabled={addToQueueMutation.isPending}
                        data-testid="button-submit"
                      >
                        {addToQueueMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Add to Queue
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bulk">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Mass URL Upload
                  </CardTitle>
                  <CardDescription>
                    Add multiple TeraBox URLs to the queue. Enter one URL per line or upload a .txt file.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBulkSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="bulk-urls">URLs (one per line)</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-2"
                          data-testid="button-upload-file"
                        >
                          <Upload className="h-4 w-4" />
                          Upload .txt file
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt"
                          onChange={handleFileUpload}
                          className="hidden"
                          data-testid="input-file"
                        />
                      </div>
                      <Textarea
                        id="bulk-urls"
                        placeholder="https://terabox.com/s/abc123&#10;https://terabox.com/s/def456&#10;https://terabox.com/s/ghi789"
                        value={bulkUrls}
                        onChange={(e) => setBulkUrls(e.target.value)}
                        className="font-mono text-sm min-h-[200px]"
                        data-testid="textarea-bulk-urls"
                      />
                      <p className="text-xs text-muted-foreground">
                        {bulkUrls.split("\n").filter(u => u.trim()).length} URLs detected
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bulk-genre">Genre (apply to all)</Label>
                        <Select value={bulkGenre} onValueChange={setBulkGenre}>
                          <SelectTrigger id="bulk-genre" data-testid="select-bulk-genre">
                            <SelectValue placeholder="Select genre" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                            <SelectItem value="nature">Nature</SelectItem>
                            <SelectItem value="architecture">Architecture</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bulk-rating">Rating (apply to all)</Label>
                        <Select value={bulkRating} onValueChange={(v) => setBulkRating(v as ContentRating)}>
                          <SelectTrigger id="bulk-rating" data-testid="select-bulk-rating">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="adult">Adult</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/")}
                        className="flex-1"
                        data-testid="button-bulk-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 gap-2"
                        disabled={addToQueueMutation.isPending}
                        data-testid="button-bulk-submit"
                      >
                        {addToQueueMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Add All to Queue
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="queue">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ListTodo className="h-5 w-5" />
                        Public Fetch Queue
                      </CardTitle>
                      <CardDescription>
                        URLs waiting to be fetched. Click "Fetch" to retrieve public metadata.
                      </CardDescription>
                    </div>
                    {queueItems.length > 0 && (
                      <Button
                        onClick={handleFetchAll}
                        disabled={queueItems.every(q => fetchingItems.has(q.id) || q.status === "fetching")}
                        className="gap-2"
                        data-testid="button-fetch-all"
                      >
                        <Globe className="h-4 w-4" />
                        Fetch All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {queueItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No URLs in queue</p>
                      <p className="text-sm">Add URLs using the Single URL or Bulk Upload tabs</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {queueItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                            data-testid={`queue-item-${item.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-mono truncate">{item.url}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusBadge(item.status)}
                                {item.genre && <Badge variant="outline">{item.genre}</Badge>}
                                {item.rating === "adult" && <Badge variant="outline">Adult</Badge>}
                                {item.attemptCount > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {item.attemptCount} attempt(s)
                                  </span>
                                )}
                              </div>
                              {item.lastError && (
                                <p className="text-xs text-destructive mt-1 truncate">{item.lastError}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => publicFetchMutation.mutate(item.id)}
                                disabled={fetchingItems.has(item.id) || item.status === "fetching"}
                                data-testid={`button-fetch-${item.id}`}
                              >
                                {fetchingItems.has(item.id) || item.status === "fetching" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Globe className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFromQueueMutation.mutate(item.id)}
                                data-testid={`button-remove-${item.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

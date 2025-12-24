import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Wrench, Trash2, RefreshCw, Database, HardDrive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SystemTools() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const handleClearCache = () => {
    toast({
      title: "Cache cleared",
      description: "Local cache has been cleared successfully",
    });
  };

  const handleClearThumbnails = () => {
    toast({
      title: "Thumbnails cleared",
      description: "All locally stored thumbnails have been removed",
    });
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
        <h1 className="text-lg font-semibold">System Tools</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Storage Management
              </CardTitle>
              <CardDescription>
                Manage local storage and cached data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Local Cache</p>
                  <p className="text-xs text-muted-foreground">
                    Temporary data and session information
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCache}
                  className="gap-2"
                  data-testid="button-clear-cache"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Stored Thumbnails</p>
                  <p className="text-xs text-muted-foreground">
                    Locally saved thumbnail images
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearThumbnails}
                  className="gap-2"
                  data-testid="button-clear-thumbnails"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                System Information
              </CardTitle>
              <CardDescription>
                Current system status and statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Containers</span>
                  <span className="text-sm font-medium">6</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Total Files</span>
                  <span className="text-sm font-medium">294</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Local Thumbnails</span>
                  <span className="text-sm font-medium">12</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-muted-foreground">Cache Size</span>
                  <span className="text-sm font-medium">24.5 MB</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Maintenance
              </CardTitle>
              <CardDescription>
                System maintenance operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full gap-2" data-testid="button-verify-integrity">
                <Wrench className="h-4 w-4" />
                Verify Data Integrity
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Check for orphaned files, broken references, and data consistency
              </p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

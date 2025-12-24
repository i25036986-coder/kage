import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppState } from "@/lib/app-state";
import {
  ArrowLeft,
  Shield,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
} from "lucide-react";
import type { AppSettings, VirtualContainer } from "@shared/schema";

export default function Vault() {
  const [, navigate] = useLocation();
  const { isVaultOpen, openVault, closeVault } = useAppState();

  const { data: settings, isLoading: settingsLoading } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: containers = [], isLoading: containersLoading } = useQuery<VirtualContainer[]>({
    queryKey: ["/api/containers"],
  });

  const adultContainers = containers.filter((c) => c.rating === "adult");
  const isLoading = settingsLoading || containersLoading;

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
        <h1 className="text-lg font-semibold">Vault</h1>
        <div className="ml-auto">
          {isVaultOpen ? (
            <Badge className="gap-1 bg-green-600">
              <Unlock className="h-3 w-3" />
              Unlocked
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Locked
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Vault Status
              </CardTitle>
              <CardDescription>
                Control access to adult-rated content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  {isVaultOpen ? (
                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Unlock className="h-5 w-5 text-green-500" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">
                      Vault is {isVaultOpen ? "Unlocked" : "Locked"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isVaultOpen
                        ? "Adult content is visible"
                        : "Adult content is hidden"}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={isVaultOpen ? closeVault : openVault}
                  variant={isVaultOpen ? "outline" : "default"}
                  className="gap-2"
                  data-testid="button-vault-action"
                >
                  {isVaultOpen ? (
                    <>
                      <Lock className="h-4 w-4" />
                      Lock Vault
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      Unlock Vault
                    </>
                  )}
                </Button>
              </div>

              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Keyboard shortcut: Ctrl + Shift + S
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isVaultOpen ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
                Protected Content
              </CardTitle>
              <CardDescription>
                Adult-rated containers that are protected by the vault
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : adultContainers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No adult-rated content in your library</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">
                    {adultContainers.length} container{adultContainers.length !== 1 ? "s" : ""} protected
                  </p>
                  {adultContainers.map((container) => (
                    <div
                      key={container.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      data-testid={`vault-container-${container.id}`}
                    >
                      {isVaultOpen ? (
                        container.thumbnail ? (
                          <img
                            src={container.thumbnail}
                            alt=""
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <Shield className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {isVaultOpen ? container.title : "Hidden content"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {container.fileCount
                            ? `${container.fileCount} files`
                            : "Unknown files"}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Adult
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {settings?.vaultEnabled === false && (
            <Card className="border-amber-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="h-5 w-5" />
                  Vault Disabled
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The vault feature is currently disabled in settings. Enable it to
                  protect adult-rated content.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate("/settings")}
                  data-testid="button-goto-settings"
                >
                  Go to Settings
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

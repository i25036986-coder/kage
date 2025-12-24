import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Key, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuthSession {
  sessionId: string;
  status: "pending" | "waiting_for_login" | "capturing" | "success" | "failed" | "none";
  message: string;
}

interface AuthTokenStatus {
  hasToken: boolean;
  provider?: string;
  capturedAt?: string;
  status?: string;
  lastUsedAt?: string;
}

export function AuthButton() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const { data: tokenStatus, refetch: refetchToken } = useQuery<AuthTokenStatus>({
    queryKey: ["/api/auth/token"],
  });

  const startAuthMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/start");
      return res.json();
    },
    onSuccess: (data: AuthSession) => {
      setIsPolling(true);
      toast({
        title: "Browser Launched",
        description: "Please log in to TeraBox in the browser window",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to start auth",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const closeAuthMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/close");
      return res.json();
    },
    onSuccess: () => {
      setIsPolling(false);
      refetchToken();
    },
  });

  const invalidateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/invalidate");
      return res.json();
    },
    onSuccess: () => {
      refetchToken();
      toast({
        title: "Token Invalidated",
        description: "You will need to authenticate again",
      });
    },
  });

  useEffect(() => {
    if (!isPolling) return;

    const pollStatus = async () => {
      try {
        const res = await fetch("/api/auth/status");
        const data: AuthSession = await res.json();

        if (data.status === "success") {
          setIsPolling(false);
          refetchToken();
          toast({
            title: "Authentication Successful",
            description: "TeraBox tokens have been captured and saved",
          });
          setIsDialogOpen(false);
        } else if (data.status === "failed") {
          setIsPolling(false);
          toast({
            title: "Authentication Failed",
            description: data.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error polling auth status:", error);
      }
    };

    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [isPolling, refetchToken, toast]);

  const handleStartAuth = () => {
    setIsDialogOpen(true);
    startAuthMutation.mutate();
  };

  const handleClose = () => {
    if (isPolling) {
      closeAuthMutation.mutate();
    }
    setIsDialogOpen(false);
  };

  return (
    <>
      <Button
        variant={tokenStatus?.hasToken ? "outline" : "default"}
        size="sm"
        onClick={handleStartAuth}
        data-testid="button-global-auth"
        className="gap-1"
      >
        <Key className="h-4 w-4" />
        <span className="hidden sm:inline">Auth</span>
        {tokenStatus?.hasToken && (
          <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
            <CheckCircle className="h-3 w-3" />
          </Badge>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              TeraBox Authentication
            </DialogTitle>
            <DialogDescription>
              Log in to TeraBox in the browser window to capture authentication tokens.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {startAuthMutation.isPending && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Launching browser...
              </div>
            )}

            {isPolling && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting for login...
                </div>
                <p className="text-sm text-muted-foreground">
                  A browser window has opened. Please log in to TeraBox and navigate to any share link.
                  Tokens will be captured automatically.
                </p>
              </div>
            )}

            {tokenStatus?.hasToken && !isPolling && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Authenticated
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Provider: {tokenStatus.provider}</p>
                  <p>Captured: {tokenStatus.capturedAt ? new Date(tokenStatus.capturedAt).toLocaleString() : "Unknown"}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startAuthMutation.mutate()}
                  >
                    Re-authenticate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => invalidateMutation.mutate()}
                  >
                    Invalidate Token
                  </Button>
                </div>
              </div>
            )}

            {!tokenStatus?.hasToken && !isPolling && !startAuthMutation.isPending && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  Not authenticated
                </div>
                <Button onClick={() => startAuthMutation.mutate()}>
                  Start Authentication
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

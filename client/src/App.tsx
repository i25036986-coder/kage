import { useEffect, useRef } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppStateProvider, useAppState } from "@/lib/app-state";
import { ThemeToggle } from "@/components/theme-toggle";
import { RatingToggle } from "@/components/rating-toggle";
import { VaultButton } from "@/components/vault-button";
import { AuthButton } from "@/components/auth-button";
import { VideoPlayer } from "@/components/video-player";
import { PlayerOverlay } from "@/components/player-overlay";
import { BackgroundProvider } from "@/components/background-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import type { AppSettings } from "@shared/schema";

import Library from "@/pages/library";
import AddNew from "@/pages/add-new";
import ContainerDetail from "@/pages/container-detail";
import FolderView from "@/pages/folder-view";
import Settings from "@/pages/settings";
import Downloads from "@/pages/downloads";
import HistoryPage from "@/pages/history";
import Duplicates from "@/pages/duplicates";
import LocalPlayer from "@/pages/local-player";
import Metadata from "@/pages/metadata";
import SystemTools from "@/pages/system-tools";
import Genre from "@/pages/genre";
import Vault from "@/pages/vault";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Library} />
      <Route path="/add" component={AddNew} />
      <Route path="/container/:id" component={ContainerDetail} />
      <Route path="/container/:id/folder" component={FolderView} />
      <Route path="/settings" component={Settings} />
      <Route path="/downloads" component={Downloads} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/duplicates" component={Duplicates} />
      <Route path="/player" component={LocalPlayer} />
      <Route path="/metadata" component={Metadata} />
      <Route path="/tools" component={SystemTools} />
      <Route path="/genre/:genre" component={Genre} />
      <Route path="/vault" component={Vault} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PanicOverlay() {
  const { isPanicMode, deactivatePanicMode } = useAppState();

  if (!isPanicMode) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background flex items-center justify-center cursor-pointer"
      onClick={deactivatePanicMode}
      data-testid="panic-overlay"
    >
      <div className="text-center">
        <p className="text-lg text-muted-foreground">Press Tab to resume</p>
      </div>
    </div>
  );
}

function AutoHideSidebarHandler() {
  const { setOpen } = useSidebar();
  const { isSidebarAutoHide } = useAppState();
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMouseOverSidebarRef = useRef(false);

  // Clear any pending timeout
  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    // Always clear timeout when effect runs or feature is disabled
    clearHideTimeout();

    if (!isSidebarAutoHide) {
      return undefined;
    }

    const EDGE_THRESHOLD = 20;

    // Get sidebar width from CSS variable or use default
    const getSidebarWidth = (): number => {
      const root = document.documentElement;
      const sidebarWidth = getComputedStyle(root).getPropertyValue("--sidebar-width").trim();
      if (sidebarWidth) {
        const match = sidebarWidth.match(/^(\d+(?:\.\d+)?)(rem|px)?$/);
        if (match) {
          const value = parseFloat(match[1]);
          const unit = match[2] || "rem";
          if (unit === "rem") {
            const rootFontSize = parseFloat(getComputedStyle(root).fontSize) || 16;
            return value * rootFontSize;
          }
          return value;
        }
      }
      return 256; // Default fallback
    };

    const handleMouseMove = (e: MouseEvent) => {
      const sidebarWidth = getSidebarWidth();

      if (e.clientX <= EDGE_THRESHOLD) {
        clearHideTimeout();
        isMouseOverSidebarRef.current = true;
        setOpen(true);
      } else if (e.clientX <= sidebarWidth) {
        isMouseOverSidebarRef.current = true;
        clearHideTimeout();
      } else {
        if (isMouseOverSidebarRef.current && !hideTimeoutRef.current) {
          hideTimeoutRef.current = setTimeout(() => {
            setOpen(false);
            hideTimeoutRef.current = null;
          }, 500);
        }
        isMouseOverSidebarRef.current = false;
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      clearHideTimeout();
    };
  }, [isSidebarAutoHide, setOpen]);

  return null;
}

function AppContent() {
  const { isPanicMode, isPlayerOverlayVisible, closePlayerOverlay } = useAppState();
  
  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
    staleTime: 1000 * 60,
  });

  const hasGlobalBackground = settings?.backgroundMode !== "default";
  
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <>
      <SidebarProvider style={sidebarStyle}>
        <AutoHideSidebarHandler />
        <div className={`flex h-screen w-full ${isPanicMode ? "blur-xl" : ""}`}>
          <AppSidebar transparent={hasGlobalBackground} />
          <SidebarInset className={`flex flex-col flex-1 ${hasGlobalBackground ? "!bg-transparent" : ""}`}>
            <header className={`flex h-12 items-center justify-between gap-4 border-b px-4 ${hasGlobalBackground ? "bg-background/70 backdrop-blur-sm" : ""}`}>
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-1">
                <AuthButton />
                <VaultButton />
                <RatingToggle />
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1 overflow-hidden">
              <Router />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <VideoPlayer />
      <PlayerOverlay isVisible={isPlayerOverlayVisible} onClose={closePlayerOverlay} />
      <PanicOverlay />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <AppStateProvider>
          <TooltipProvider>
            <BackgroundProvider>
              <AppContent />
            </BackgroundProvider>
          </TooltipProvider>
        </AppStateProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

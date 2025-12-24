import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { ContentRating } from "@shared/schema";

interface AppState {
  // Rating filter (R for Regular, A for Adult)
  ratingFilter: ContentRating;
  setRatingFilter: (rating: ContentRating) => void;
  toggleRatingFilter: () => void;

  // Panic mode
  isPanicMode: boolean;
  activatePanicMode: () => void;
  deactivatePanicMode: () => void;

  // Vault state
  isVaultOpen: boolean;
  openVault: () => void;
  closeVault: () => void;
  toggleVault: () => void;

  // Sidebar auto-hide
  isSidebarAutoHide: boolean;
  setSidebarAutoHide: (enabled: boolean) => void;

  // Video player (HTML5 - fallback)
  currentVideoUrl: string | null;
  isVideoPlayerOpen: boolean;
  openVideoPlayer: (url: string) => void;
  closeVideoPlayer: () => void;

  // MPV player (Electron native)
  isMpvAvailable: boolean;
  isPlayerOverlayVisible: boolean;
  playWithMpv: (url: string) => Promise<{ success: boolean; error?: string }>;
  closePlayerOverlay: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ratingFilter, setRatingFilter] = useState<ContentRating>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("ratingFilter") as ContentRating) || "regular";
    }
    return "regular";
  });

  const [isPanicMode, setIsPanicMode] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isSidebarAutoHide, setIsSidebarAutoHide] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebarAutoHide") === "true";
    }
    return false;
  });
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const [isMpvAvailable, setIsMpvAvailable] = useState(false);
  const [isPlayerOverlayVisible, setIsPlayerOverlayVisible] = useState(false);

  // Check if MPV is available (running in Electron)
  useEffect(() => {
    const available = typeof window !== "undefined" && "mpvAPI" in window;
    setIsMpvAvailable(available);
    if (available) {
      console.log("[AppState] MPV player available (running in Electron)");
    }
  }, []);

  // Persist sidebar auto-hide preference
  useEffect(() => {
    localStorage.setItem("sidebarAutoHide", isSidebarAutoHide.toString());
  }, [isSidebarAutoHide]);

  // Persist rating filter
  useEffect(() => {
    localStorage.setItem("ratingFilter", ratingFilter);
  }, [ratingFilter]);

  const toggleRatingFilter = useCallback(() => {
    setRatingFilter((prev) => (prev === "regular" ? "adult" : "regular"));
  }, []);

  const activatePanicMode = useCallback(() => {
    setIsPanicMode(true);
    setIsVaultOpen(false);
    closeVideoPlayer();
  }, []);

  const deactivatePanicMode = useCallback(() => {
    setIsPanicMode(false);
  }, []);

  const openVault = useCallback(() => {
    if (!isPanicMode) {
      setIsVaultOpen(true);
    }
  }, [isPanicMode]);

  const closeVault = useCallback(() => {
    setIsVaultOpen(false);
  }, []);

  const toggleVault = useCallback(() => {
    if (isVaultOpen) {
      closeVault();
    } else {
      openVault();
    }
  }, [isVaultOpen, closeVault, openVault]);

  const openVideoPlayer = useCallback((url: string) => {
    if (!isPanicMode) {
      setCurrentVideoUrl(url);
      setIsVideoPlayerOpen(true);
    }
  }, [isPanicMode]);

  const closeVideoPlayer = useCallback(() => {
    setCurrentVideoUrl(null);
    setIsVideoPlayerOpen(false);
  }, []);

  const closePlayerOverlay = useCallback(() => {
    setIsPlayerOverlayVisible(false);
  }, []);

  const playWithMpv = useCallback(async (url: string): Promise<{ success: boolean; error?: string }> => {
    if (isPanicMode) {
      return { success: false, error: "Panic mode is active" };
    }
    
    if (!isMpvAvailable || !window.mpvAPI) {
      console.warn("[AppState] MPV not available, cannot play");
      return { success: false, error: "MPV not available (not in Electron)" };
    }

    console.log("[AppState] Playing with MPV:", url);
    setIsPlayerOverlayVisible(true);
    return window.mpvAPI.load(url);
  }, [isPanicMode, isMpvAvailable]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab for panic mode
      if (e.key === "Tab" && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        // Only trigger if not in an input field
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          if (isPanicMode) {
            deactivatePanicMode();
          } else {
            activatePanicMode();
          }
        }
      }

      // Ctrl+Shift+S to open vault
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        toggleVault();
      }

      // Escape to close video player
      if (e.key === "Escape" && isVideoPlayerOpen) {
        closeVideoPlayer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPanicMode, isVideoPlayerOpen, activatePanicMode, deactivatePanicMode, toggleVault, closeVideoPlayer]);

  return (
    <AppStateContext.Provider
      value={{
        ratingFilter,
        setRatingFilter,
        toggleRatingFilter,
        isPanicMode,
        activatePanicMode,
        deactivatePanicMode,
        isVaultOpen,
        openVault,
        closeVault,
        toggleVault,
        isSidebarAutoHide,
        setSidebarAutoHide: (value: boolean) => setIsSidebarAutoHide(value),
        currentVideoUrl,
        isVideoPlayerOpen,
        openVideoPlayer,
        closeVideoPlayer,
        isMpvAvailable,
        isPlayerOverlayVisible,
        playWithMpv,
        closePlayerOverlay,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
}

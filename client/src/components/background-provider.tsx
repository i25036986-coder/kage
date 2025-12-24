import { useQuery } from "@tanstack/react-query";
import { useAppState } from "@/lib/app-state";
import type { AppSettings } from "@shared/schema";

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const { isPanicMode } = useAppState();
  
  const { data: settings } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
    staleTime: 1000 * 60,
  });

  const renderBackground = () => {
    if (!settings || settings.backgroundMode === "default" || isPanicMode) {
      return null;
    }

    const opacity = settings.backgroundOpacity / 100;

    if (settings.backgroundMode === "color") {
      return (
        <div
          className="fixed inset-0 -z-10 pointer-events-none"
          style={{
            backgroundColor: settings.backgroundColor,
            opacity,
          }}
        />
      );
    }

    if (settings.backgroundMode === "image" && settings.backgroundImage) {
      return (
        <div
          className="fixed inset-0 -z-10 pointer-events-none bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${settings.backgroundImage})`,
            opacity,
          }}
        />
      );
    }

    if (settings.backgroundMode === "video" && settings.backgroundVideo) {
      return (
        <div
          className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
          style={{ opacity }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute min-w-full min-h-full w-auto h-auto object-cover"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <source src={settings.backgroundVideo} />
          </video>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {renderBackground()}
      {children}
    </>
  );
}

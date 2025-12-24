import type { PanelBackground } from "@shared/schema";

interface PanelBackgroundProps {
  background: PanelBackground;
  className?: string;
}

export function PanelBackgroundLayer({ background, className = "" }: PanelBackgroundProps) {
  if (background.mode === "default") {
    return null;
  }

  const opacity = background.opacity / 100;

  if (background.mode === "color") {
    return (
      <div
        className={`absolute inset-0 z-0 pointer-events-none ${className}`}
        style={{
          backgroundColor: background.color,
          opacity,
        }}
      />
    );
  }

  if (background.mode === "image" && background.image) {
    return (
      <div
        className={`absolute inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat ${className}`}
        style={{
          backgroundImage: `url(${background.image})`,
          opacity,
        }}
      />
    );
  }

  if (background.mode === "video" && background.video) {
    return (
      <div
        className={`absolute inset-0 z-0 pointer-events-none overflow-hidden ${className}`}
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
          <source src={background.video} />
        </video>
      </div>
    );
  }

  return null;
}

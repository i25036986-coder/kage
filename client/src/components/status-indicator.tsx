import { cn } from "@/lib/utils";

type StatusType = "active" | "expired" | "partial" | "unknown";

interface StatusIndicatorProps {
  status: StatusType;
  label: string;
  className?: string;
}

const statusStyles: Record<StatusType, { dot: string; text: string }> = {
  active: {
    dot: "bg-green-500",
    text: "text-green-500",
  },
  expired: {
    dot: "bg-red-500",
    text: "text-red-500",
  },
  partial: {
    dot: "bg-orange-500",
    text: "text-orange-500",
  },
  unknown: {
    dot: "bg-gray-500",
    text: "text-gray-500",
  },
};

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const styles = statusStyles[status];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("h-2 w-2 rounded-full", styles.dot)} />
      <span className={cn("text-sm", styles.text)}>{label}</span>
    </div>
  );
}

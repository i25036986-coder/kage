import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ArrowLeft, Download } from "lucide-react";

export default function Downloads() {
  const [, navigate] = useLocation();

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
        <h1 className="text-lg font-semibold">Downloads</h1>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={Download}
          title="No active downloads"
          description="Downloaded files will appear here. Start a download from any file detail panel."
        />
      </div>
    </div>
  );
}

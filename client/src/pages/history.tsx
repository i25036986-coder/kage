import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ArrowLeft, History } from "lucide-react";

export default function HistoryPage() {
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
        <h1 className="text-lg font-semibold">History</h1>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={History}
          title="No viewing history"
          description="Files you view or play will appear here for quick access."
        />
      </div>
    </div>
  );
}

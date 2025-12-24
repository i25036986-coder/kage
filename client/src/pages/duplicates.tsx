import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Copy, Search, Trash2, EyeOff, AlertTriangle, Link, FileText, Database, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DuplicateRecord, DuplicateRule, VirtualContainer } from "@shared/schema";

const ruleLabels: Record<DuplicateRule, { label: string; icon: typeof Link; color: string }> = {
  exact_url: { label: "Exact URL Match", icon: Link, color: "bg-red-500/20 text-red-400" },
  name_metadata: { label: "Name + Metadata Match", icon: FileText, color: "bg-orange-500/20 text-orange-400" },
  metadata_only: { label: "Metadata Match (Suspicious)", icon: Database, color: "bg-yellow-500/20 text-yellow-400" },
};

function ContainerPreview({ container }: { container?: VirtualContainer }) {
  if (!container) return <div className="text-muted-foreground text-sm">Container not found</div>;
  
  return (
    <div className="flex items-center gap-3">
      {container.thumbnail ? (
        <img 
          src={container.thumbnail} 
          alt={container.title} 
          className="w-12 h-12 rounded object-cover"
        />
      ) : (
        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
          <Copy className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{container.title}</div>
        <div className="text-xs text-muted-foreground">
          {container.fileCount ?? 0} files
        </div>
      </div>
    </div>
  );
}

function DuplicateCard({ duplicate, onIgnore, onDelete }: { 
  duplicate: DuplicateRecord; 
  onIgnore: () => void;
  onDelete: (containerId: string) => void;
}) {
  const rule = ruleLabels[duplicate.rule];
  const RuleIcon = rule.icon;
  
  return (
    <Card className="overflow-visible" data-testid={`duplicate-card-${duplicate.id}`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Badge className={`${rule.color} gap-1`}>
            <RuleIcon className="w-3 h-3" />
            {rule.label}
          </Badge>
          <div className="text-xs text-muted-foreground">
            Detected: {new Date(duplicate.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <ContainerPreview container={duplicate.sourceContainer} />
            {duplicate.sourceContainer && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full gap-1"
                onClick={() => onDelete(duplicate.sourceContainerId)}
                data-testid={`button-delete-source-${duplicate.id}`}
              >
                <Trash2 className="w-3 h-3" />
                Delete This One
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <ContainerPreview container={duplicate.matchContainer} />
            {duplicate.matchContainer && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full gap-1"
                onClick={() => onDelete(duplicate.matchContainerId)}
                data-testid={`button-delete-match-${duplicate.id}`}
              >
                <Trash2 className="w-3 h-3" />
                Delete This One
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1"
            onClick={onIgnore}
            data-testid={`button-ignore-${duplicate.id}`}
          >
            <EyeOff className="w-3 h-3" />
            Ignore (Not a Duplicate)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Duplicates() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: duplicates = [], isLoading, refetch } = useQuery<DuplicateRecord[]>({
    queryKey: ["/api/duplicates"],
  });

  const detectMutation = useMutation({
    mutationFn: () => apiRequest("/api/duplicates/detect", "POST"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
      toast({
        title: "Scan Complete",
        description: `Found ${data.newCount} new duplicate${data.newCount !== 1 ? "s" : ""}. Total: ${data.totalCount}`,
      });
    },
    onError: () => {
      toast({ title: "Failed to detect duplicates", variant: "destructive" });
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/duplicates/${id}`, "PATCH", { status: "ignored" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
      toast({ title: "Marked as not a duplicate" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  const deleteContainerMutation = useMutation({
    mutationFn: ({ duplicateId, containerId }: { duplicateId: string; containerId: string }) =>
      apiRequest(`/api/duplicates/${duplicateId}/delete-container`, "POST", { containerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/containers"] });
      toast({ title: "Container deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete container", variant: "destructive" });
    },
  });

  const pendingDuplicates = duplicates.filter(d => d.status === "pending");
  const exactUrl = pendingDuplicates.filter(d => d.rule === "exact_url");
  const nameMetadata = pendingDuplicates.filter(d => d.rule === "name_metadata");
  const metadataOnly = pendingDuplicates.filter(d => d.rule === "metadata_only");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Duplicates</h1>
          {pendingDuplicates.length > 0 && (
            <Badge variant="secondary">{pendingDuplicates.length} pending</Badge>
          )}
        </div>
        <Button 
          onClick={() => detectMutation.mutate()} 
          disabled={detectMutation.isPending}
          className="gap-2"
          data-testid="button-scan-duplicates"
        >
          {detectMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Scan for Duplicates
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : pendingDuplicates.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-64">
            <EmptyState
              icon={Copy}
              title="No duplicates detected"
              description="Click 'Scan for Duplicates' to check your containers for potential duplicates."
            />
          </div>
        ) : (
          <>
            {exactUrl.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <h2 className="font-semibold text-red-400">Exact URL Matches ({exactUrl.length})</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  These containers have identical URLs and are definitely duplicates.
                </p>
                <div className="space-y-3">
                  {exactUrl.map(d => (
                    <DuplicateCard 
                      key={d.id} 
                      duplicate={d}
                      onIgnore={() => ignoreMutation.mutate(d.id)}
                      onDelete={(containerId) => deleteContainerMutation.mutate({ duplicateId: d.id, containerId })}
                    />
                  ))}
                </div>
              </div>
            )}

            {nameMetadata.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <h2 className="font-semibold text-orange-400">Name + Metadata Matches ({nameMetadata.length})</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  These containers have the same name and metadata. Likely duplicates.
                </p>
                <div className="space-y-3">
                  {nameMetadata.map(d => (
                    <DuplicateCard 
                      key={d.id} 
                      duplicate={d}
                      onIgnore={() => ignoreMutation.mutate(d.id)}
                      onDelete={(containerId) => deleteContainerMutation.mutate({ duplicateId: d.id, containerId })}
                    />
                  ))}
                </div>
              </div>
            )}

            {metadataOnly.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <h2 className="font-semibold text-yellow-400">Suspicious Matches ({metadataOnly.length})</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  These containers have similar metadata. Review to confirm if they are duplicates.
                </p>
                <div className="space-y-3">
                  {metadataOnly.map(d => (
                    <DuplicateCard 
                      key={d.id} 
                      duplicate={d}
                      onIgnore={() => ignoreMutation.mutate(d.id)}
                      onDelete={(containerId) => deleteContainerMutation.mutate({ duplicateId: d.id, containerId })}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

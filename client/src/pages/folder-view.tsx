import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { FolderTree } from "@/components/folder-tree";
import { FileCard } from "@/components/file-card";
import { FileDetailPanel } from "@/components/file-detail-panel";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { EmptyState } from "@/components/empty-state";
import { File as FileIcon } from "lucide-react";
import type { Folder, MediaFile, VirtualContainer } from "@shared/schema";

export default function FolderView() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<string[]>([]);

  const { data: container } = useQuery<VirtualContainer>({
    queryKey: ["/api/containers", id],
  });

  const { data: folders = [], isLoading: foldersLoading } = useQuery<Folder[]>({
    queryKey: ["/api/containers", id, "folders"],
  });

  const { data: allFiles = [], isLoading: filesLoading } = useQuery<MediaFile[]>({
    queryKey: ["/api/containers", id, "files"],
  });

  const isLoading = foldersLoading || filesLoading;

  const filteredFiles = useMemo(() => {
    if (!selectedFolderId) {
      return allFiles;
    }
    const selectedFolder = folders.find(f => f.id === selectedFolderId);
    if (!selectedFolder) {
      return allFiles;
    }
    return allFiles.filter(file => file.path.startsWith(selectedFolder.path));
  }, [allFiles, folders, selectedFolderId]);

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedFile(null);
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      const pathParts = folder.path.split("/").filter(Boolean);
      setBreadcrumbPath(pathParts);
    }
  };

  const handleBreadcrumbNavigate = (index: number) => {
    if (index === -1) {
      setSelectedFolderId(null);
      setBreadcrumbPath([]);
      setSelectedFile(null);
    } else {
      const newPath = breadcrumbPath.slice(0, index + 1);
      setBreadcrumbPath(newPath);
      const targetPath = "/" + newPath.join("/");
      const folder = folders.find(f => f.path === targetPath);
      if (folder) {
        setSelectedFolderId(folder.id);
      }
    }
  };

  const handleFileClick = (file: MediaFile) => {
    setSelectedFile(file);
  };

  const handleFileDoubleClick = (file: MediaFile) => {
    console.log("Play/view file:", file.name);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex-1 flex">
          <div className="w-1/5 border-r p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="w-1/2 p-4 grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
          <div className="w-[30%] border-l p-4 space-y-4">
            <Skeleton className="aspect-video rounded-lg" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          {container && (
            <span className="text-sm text-muted-foreground">{container.title} /</span>
          )}
          <BreadcrumbNav path={breadcrumbPath} onNavigate={handleBreadcrumbNavigate} />
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <div className="h-full border-r bg-sidebar/50">
            <div className="p-3 border-b">
              <h3 className="text-sm font-medium text-muted-foreground">Folders</h3>
            </div>
            <FolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              onFolderSelect={handleFolderSelect}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-medium">
                {selectedFolderId 
                  ? folders.find(f => f.id === selectedFolderId)?.name 
                  : "All Files"
                }
              </h3>
              <span className="text-xs text-muted-foreground">
                {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
              </span>
            </div>
            <ScrollArea className="flex-1">
              {filteredFiles.length === 0 ? (
                <EmptyState
                  icon={FileIcon}
                  title="No files in this folder"
                  description={selectedFolderId 
                    ? "This folder is empty or files haven't been loaded yet" 
                    : "No files found in this container"
                  }
                />
              ) : (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredFiles.map(file => (
                    <FileCard
                      key={file.id}
                      file={file}
                      onClick={() => handleFileClick(file)}
                      onDoubleClick={() => handleFileDoubleClick(file)}
                      isSelected={selectedFile?.id === file.id}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <div className="h-full border-l bg-card/50">
            <div className="p-3 border-b">
              <h3 className="text-sm font-medium text-muted-foreground">Details</h3>
            </div>
            <FileDetailPanel
              file={selectedFile}
              onPlay={() => console.log("Play")}
              onDownload={() => console.log("Download")}
              onChangeThumbnail={() => console.log("Change thumbnail")}
              onSaveThumbnail={() => console.log("Save thumbnail")}
              onToggleVault={() => console.log("Toggle vault")}
              isVaultLocked={false}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Folder as FolderType } from "@shared/schema";

interface FolderTreeProps {
  folders: FolderType[];
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string) => void;
}

interface FolderNodeProps {
  folder: FolderType;
  folders: FolderType[];
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string) => void;
  level: number;
}

function FolderNode({ folder, folders, selectedFolderId, onFolderSelect, level }: FolderNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const children = folders.filter(f => f.parentId === folder.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedFolderId === folder.id;

  return (
    <div>
      <button
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover-elevate ${
          isSelected ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          onFolderSelect(folder.id);
          if (hasChildren) {
            setIsExpanded(!isExpanded);
          }
        }}
        data-testid={`button-folder-${folder.id}`}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-4" />
        )}
        {isSelected ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{folder.name}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {folder.fileCount}
        </span>
      </button>
      
      {hasChildren && isExpanded && (
        <div>
          {children.map(child => (
            <FolderNode
              key={child.id}
              folder={child}
              folders={folders}
              selectedFolderId={selectedFolderId}
              onFolderSelect={onFolderSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({ folders, selectedFolderId, onFolderSelect }: FolderTreeProps) {
  const rootFolders = folders.filter(f => f.parentId === null);

  if (folders.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-sm text-muted-foreground text-center">
          No folders available
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-0.5">
        {rootFolders.map(folder => (
          <FolderNode
            key={folder.id}
            folder={folder}
            folders={folders}
            selectedFolderId={selectedFolderId}
            onFolderSelect={onFolderSelect}
            level={0}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

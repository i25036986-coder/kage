import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbNavProps {
  path: string[];
  onNavigate: (index: number) => void;
}

export function BreadcrumbNav({ path, onNavigate }: BreadcrumbNavProps) {
  const maxVisible = 3;
  const showEllipsis = path.length > maxVisible;
  
  let displayPath = path;
  if (showEllipsis) {
    displayPath = [path[0], "...", ...path.slice(-2)];
  }

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      <button
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => onNavigate(-1)}
        data-testid="button-breadcrumb-root"
      >
        <Home className="h-4 w-4" />
        <span>Root</span>
      </button>

      {displayPath.map((segment, index) => {
        const isLast = index === displayPath.length - 1;
        const isEllipsis = segment === "...";
        
        if (isEllipsis) {
          return (
            <span key={`ellipsis-${index}`} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">...</span>
            </span>
          );
        }

        return (
          <span key={`${segment}-${index}`} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            {isLast ? (
              <span className="font-medium text-foreground">{segment}</span>
            ) : (
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  const actualIndex = showEllipsis && index > 0 
                    ? path.length - (displayPath.length - index)
                    : index;
                  onNavigate(actualIndex);
                }}
                data-testid={`button-breadcrumb-${index}`}
              >
                {segment}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

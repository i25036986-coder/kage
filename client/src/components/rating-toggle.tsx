import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function RatingToggle() {
  const { ratingFilter, toggleRatingFilter } = useAppState();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleRatingFilter}
          className={`font-bold text-sm ${
            ratingFilter === "adult" 
              ? "text-red-500 hover:text-red-400" 
              : "text-muted-foreground"
          }`}
          data-testid="button-rating-toggle"
        >
          {ratingFilter === "regular" ? "R" : "A"}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{ratingFilter === "regular" ? "Regular content" : "Adult content"}</p>
        <p className="text-xs text-muted-foreground">Click to toggle</p>
      </TooltipContent>
    </Tooltip>
  );
}

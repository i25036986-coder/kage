import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppState } from "@/lib/app-state";
import { Lock, Unlock, Shield } from "lucide-react";

export function VaultButton() {
  const [, navigate] = useLocation();
  const { isVaultOpen, toggleVault } = useAppState();

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVault}
            className={isVaultOpen ? "text-green-500" : "text-muted-foreground"}
            data-testid="button-vault-toggle"
          >
            {isVaultOpen ? (
              <Unlock className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isVaultOpen ? "Lock vault (Ctrl+Shift+S)" : "Unlock vault (Ctrl+Shift+S)"}</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/vault")}
            data-testid="button-vault-page"
          >
            <Shield className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Vault settings</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

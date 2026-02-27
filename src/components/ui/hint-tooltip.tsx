"use client";

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HintTooltipProps {
  content: React.ReactNode;
  /** Largeur max du tooltip (défaut : 260px) */
  maxWidth?: number;
}

/**
 * Icône "?" avec tooltip au survol — pour expliquer le vocabulaire financier.
 * Doit être utilisé à l'intérieur d'un <TooltipProvider> (déjà dans le layout).
 */
export function HintTooltip({ content, maxWidth = 260 }: HintTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        asChild
        onClick={(e) => e.stopPropagation()}
      >
        <span className="ml-1 inline-flex cursor-help items-center align-middle">
          <HelpCircle className="h-3 w-3 text-muted-foreground/60 hover:text-muted-foreground" />
        </span>
      </TooltipTrigger>
      <TooltipContent
        style={{ maxWidth }}
        className="text-xs leading-relaxed"
        side="top"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

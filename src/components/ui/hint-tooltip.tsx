"use client";

import { useState } from "react";
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
 * Icône "?" avec tooltip au survol (desktop) et au tap (mobile).
 * Doit être utilisé à l'intérieur d'un <TooltipProvider> (déjà dans le layout).
 */
export function HintTooltip({ content, maxWidth = 260 }: HintTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
        <span
          className="ml-1 inline-flex cursor-help items-center align-middle"
          onPointerDown={(e) => {
            // Sur mobile (touch), on bascule l'ouverture manuellement
            // Sur desktop (mouse), on laisse Radix gérer le hover via onOpenChange
            if (e.pointerType === "touch") {
              e.stopPropagation();
              setOpen((v) => !v);
            }
          }}
        >
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

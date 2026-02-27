"use client";

import { useRef, useState } from "react";
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
 * Sur mobile : un tap ouvre, un second tap (ou tap ailleurs) ferme.
 * Doit être utilisé à l'intérieur d'un <TooltipProvider>.
 */
export function HintTooltip({ content, maxWidth = 260 }: HintTooltipProps) {
  const [open, setOpen] = useState(false);
  // Timestamp du dernier touch-open pour bloquer le onOpenChange(false) de Radix
  const lastTouchMs = useRef(0);

  return (
    <Tooltip
      open={open}
      onOpenChange={(v) => {
        // Sur touch : Radix émet onOpenChange(false) juste après le pointerUp.
        // On ignore cet événement s'il survient dans les 300 ms suivant un tap.
        if (!v && Date.now() - lastTouchMs.current < 300) return;
        setOpen(v);
      }}
    >
      <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
        <span
          className="ml-1 inline-flex cursor-help items-center align-middle"
          onPointerDown={(e) => {
            if (e.pointerType === "touch") {
              e.stopPropagation();
              const wasOpen = open;
              lastTouchMs.current = wasOpen ? 0 : Date.now(); // n'immune pas la fermeture tap
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

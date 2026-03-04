"use client";

import { Loader2, Check, Circle } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type LoadingStep = "catalog" | "quotes" | "metadata" | "scoring" | "complete";

interface StepDef {
  id: LoadingStep;
  label: string;
  activeLabel: (ctx: LoadingContext) => string;
}

export interface LoadingContext {
  step: LoadingStep;
  progress: number;
  loaded: number;
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Définition des étapes
// ─────────────────────────────────────────────────────────────────────────────

const STEPS: StepDef[] = [
  {
    id: "catalog",
    label: "Catalogue ETF chargé",
    activeLabel: () => "Chargement du catalogue ETF éligibles PEA…",
  },
  {
    id: "quotes",
    label: "Cours et historiques récupérés",
    activeLabel: (ctx) =>
      ctx.total > 0
        ? `Récupération des cours en temps réel — ${ctx.loaded}/${ctx.total} ETF`
        : "Récupération des cours en temps réel…",
  },
  {
    id: "metadata",
    label: "Métadonnées vérifiées",
    activeLabel: () => "Vérification des frais (TER) et encours…",
  },
  {
    id: "scoring",
    label: "Scores calculés",
    activeLabel: () => "Calcul des scores et classement…",
  },
];

const STEP_ORDER: LoadingStep[] = ["catalog", "quotes", "metadata", "scoring", "complete"];

function stepIndex(step: LoadingStep): number {
  return STEP_ORDER.indexOf(step);
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  context: LoadingContext;
}

export function LoadingSteps({ context }: Props) {
  const currentIdx = stepIndex(context.step);

  return (
    <div className="mx-auto max-w-lg rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 text-center">
        <h3 className="text-sm font-semibold text-foreground">
          Mise à jour des données
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Première visite — les données sont récupérées et analysées pour vous
          fournir les informations les plus récentes.
        </p>
      </div>

      {/* Étapes */}
      <div className="mb-4 space-y-2.5">
        {STEPS.map((step, i) => {
          const sIdx = stepIndex(step.id);
          const isDone = currentIdx > sIdx;
          const isActive = currentIdx === sIdx;
          const isPending = currentIdx < sIdx;

          return (
            <div key={step.id} className="flex items-start gap-2.5">
              {/* Icône */}
              <div className="mt-0.5 flex-shrink-0">
                {isDone && (
                  <div className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-primary/15">
                    <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                  </div>
                )}
                {isActive && (
                  <Loader2 className="h-4.5 w-4.5 animate-spin text-primary" />
                )}
                {isPending && (
                  <Circle className="h-4.5 w-4.5 text-muted-foreground/40" />
                )}
              </div>

              {/* Texte */}
              <span
                className={`text-sm leading-snug ${
                  isDone
                    ? "text-muted-foreground"
                    : isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground/50"
                }`}
              >
                {isDone
                  ? step.label
                  : isActive
                    ? step.activeLabel(context)
                    : step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Barre de progression */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full bg-primary/60 transition-all duration-700 ease-out"
          style={{ width: `${context.progress}%` }}
        />
      </div>
      <p className="mt-1.5 text-right text-[11px] text-muted-foreground">
        {context.progress}%
      </p>
    </div>
  );
}

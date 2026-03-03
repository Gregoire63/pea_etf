"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import type { ScoreWeights } from "@/hooks/use-score-weights";

const CRITERIA: {
  key: keyof Omit<ScoreWeights, "leveragePenalty">;
  label: string;
  sublabel: string;
  trackColor: string;
  dotColor: string;
  tooltip: string;
}[] = [
  {
    key: "performance",
    label: "Performance",
    sublabel: "Rendement historique 5 ans",
    trackColor: "#3b82f6",
    dotColor: "bg-blue-500",
    tooltip:
      "Rendement annualisé sur 5 ans (ou 3 ans / 1 an si indisponible). Mesure la croissance passée de l'ETF. Favoriser ce critère avantage les ETF ayant le plus progressé.",
  },
  {
    key: "sharpe",
    label: "Ratio de Sharpe",
    sublabel: "Rendement ajusté au risque",
    trackColor: "#8b5cf6",
    dotColor: "bg-violet-500",
    tooltip:
      "Rendement ajusté au risque = (rendement annuel − taux sans risque 3 %) / volatilité annuelle. Un ratio > 1 est excellent. Favoriser ce critère avantage les ETF offrant le meilleur rapport gain/risque.",
  },
  {
    key: "ter",
    label: "TER",
    sublabel: "Frais annuels de gestion",
    trackColor: "#10b981",
    dotColor: "bg-emerald-500",
    tooltip:
      "Total Expense Ratio : frais de gestion annuels prélevés sur l'ETF. Un TER de 0,10 % score parfaitement, 0,60 % score très mal. Favoriser ce critère avantage les ETF peu coûteux.",
  },
  {
    key: "drawdown",
    label: "Max Drawdown",
    sublabel: "Résistance aux crises",
    trackColor: "#f97316",
    dotColor: "bg-orange-500",
    tooltip:
      "Pire chute enregistrée depuis un sommet historique. Un drawdown de −10 % score bien, −70 % score très mal. Favoriser ce critère avantage les ETF les plus résistants aux crises.",
  },
  {
    key: "aum",
    label: "Encours (AUM)",
    sublabel: "Actifs sous gestion",
    trackColor: "#6366f1",
    dotColor: "bg-indigo-500",
    tooltip:
      "Actifs sous gestion. Un encours élevé (> 1 Md €) garantit une meilleure liquidité, un spread bid/ask réduit et un risque de fermeture de fonds quasi nul. Favoriser ce critère avantage les grands fonds.",
  },
];

interface Props {
  weights: ScoreWeights;
  onChange: (weights: ScoreWeights) => void;
  onReset: () => void;
  isCustom: boolean;
}

export function ScoreWeightsConfigurator({ weights, onChange, onReset, isCustom }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // État local pour les sliders : mise à jour instantanée sans re-rendre le tableau
  const [localWeights, setLocalWeights] = useState(weights);
  const propagateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronise si le parent change (ex : reset)
  useEffect(() => { setLocalWeights(weights); }, [weights]);

  const close = useCallback(() => setOpen(false), []);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Click outside (desktop dropdown behaviour)
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    // Delay one tick so the opening click doesn't immediately close
    const id = setTimeout(() => document.addEventListener("pointerdown", onPointer), 0);
    return () => { clearTimeout(id); document.removeEventListener("pointerdown", onPointer); };
  }, [open, close]);

  // Lock scroll on mobile overlay (overflow:hidden seul ne suffit pas sur iOS)
  useEffect(() => {
    if (!open) return;
    if (window.innerWidth >= 1024) return; // desktop : pas d'overlay plein écran

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
      body.style.position = "";
      body.style.top = "";
      body.style.width = "";
      window.scrollTo({ top: scrollY, behavior: "instant" });
    };
  }, [open]);

  const total = useMemo(
    () => localWeights.ter + localWeights.performance + localWeights.aum + localWeights.sharpe + localWeights.drawdown,
    [localWeights]
  );

  function effectivePct(key: keyof Omit<ScoreWeights, "leveragePenalty">) {
    if (total === 0) return 0;
    return Math.round((localWeights[key] / total) * 100);
  }

  function handleChange(key: keyof ScoreWeights, value: number) {
    const next = { ...localWeights, [key]: value };
    setLocalWeights(next);
    if (propagateTimer.current) clearTimeout(propagateTimer.current);
    propagateTimer.current = setTimeout(() => onChange(next), 150);
  }

  const panel = (
    <div
      className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl lg:max-w-none lg:w-[440px] max-h-[min(92dvh,600px)] lg:max-h-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold leading-tight">Pondération du score</p>
          <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
            Déplacez les curseurs pour favoriser certains critères.
            Le classement se met à jour en temps réel.
          </p>
        </div>
        <button
          onClick={close}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Sliders — scrollable sur mobile, hauteur naturelle sur desktop */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1 lg:overflow-y-visible lg:flex-none">
        {CRITERIA.map(({ key, label, sublabel, trackColor, dotColor, tooltip }) => {
          const pct = effectivePct(key);
          const raw = localWeights[key];
          const sliderBg = `linear-gradient(to right, ${trackColor} ${raw}%, var(--color-muted) ${raw}%)`;

          return (
            <div
              key={key}
              className="rounded-xl px-3 py-2 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-sm font-medium leading-none">
                      {label}
                      <HintTooltip content={tooltip} maxWidth={280} />
                    </div>
                    <div className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                      {sublabel}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-right text-base font-bold tabular-nums leading-none">
                  {pct}
                  <span className="text-xs font-normal text-muted-foreground">%</span>
                </span>
              </div>

              <div className="mt-2 px-0.5">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={raw}
                  onChange={(e) => handleChange(key, Number(e.target.value))}
                  style={{ background: sliderBg, touchAction: "none" }}
                  className="
                    h-1.5 w-full cursor-pointer appearance-none rounded-full
                    [&::-webkit-slider-thumb]:h-[18px]
                    [&::-webkit-slider-thumb]:w-[18px]
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:border-2
                    [&::-webkit-slider-thumb]:border-background
                    [&::-webkit-slider-thumb]:bg-foreground
                    [&::-webkit-slider-thumb]:shadow-md
                    [&::-webkit-slider-thumb]:transition-transform
                    [&::-webkit-slider-thumb]:hover:scale-110
                    [&::-moz-range-thumb]:h-[18px]
                    [&::-moz-range-thumb]:w-[18px]
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:border-2
                    [&::-moz-range-thumb]:border-background
                    [&::-moz-range-thumb]:bg-foreground
                    [&::-moz-range-thumb]:shadow-md
                  "
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Malus levier */}
      <div className="shrink-0 border-t px-2 py-1">
        {(() => {
          const lp = localWeights.leveragePenalty;
          const sliderBg = `linear-gradient(to right, #e11d48 ${lp * 2}%, var(--color-muted) ${lp * 2}%)`;
          return (
            <div className="rounded-xl px-3 py-2 transition-colors hover:bg-muted/40">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-sm font-medium leading-none">
                      Malus levier
                      <HintTooltip
                        content="Pénalité appliquée au score des ETF à effet de levier (×2, ×3…). Un malus de 15 % réduit leur score de 15 %. Mettez à 0 % pour ne pas pénaliser le levier."
                        maxWidth={280}
                      />
                    </div>
                    <div className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                      Pénalité ETF à levier
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-right text-base font-bold tabular-nums leading-none">
                  {lp === 0 ? "off" : <>−{lp}<span className="text-xs font-normal text-muted-foreground">%</span></>}
                </span>
              </div>
              <div className="mt-2 px-0.5">
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={lp}
                  onChange={(e) => handleChange("leveragePenalty", Number(e.target.value))}
                  style={{ background: sliderBg, touchAction: "none" }}
                  className="
                    h-1.5 w-full cursor-pointer appearance-none rounded-full
                    [&::-webkit-slider-thumb]:h-[18px]
                    [&::-webkit-slider-thumb]:w-[18px]
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:border-2
                    [&::-webkit-slider-thumb]:border-background
                    [&::-webkit-slider-thumb]:bg-foreground
                    [&::-webkit-slider-thumb]:shadow-md
                    [&::-webkit-slider-thumb]:transition-transform
                    [&::-webkit-slider-thumb]:hover:scale-110
                    [&::-moz-range-thumb]:h-[18px]
                    [&::-moz-range-thumb]:w-[18px]
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:border-2
                    [&::-moz-range-thumb]:border-background
                    [&::-moz-range-thumb]:bg-foreground
                    [&::-moz-range-thumb]:shadow-md
                  "
                />
              </div>
            </div>
          );
        })()}
      </div>

      {/* Distribution bar */}
      <div className="shrink-0 border-t px-4 py-2.5">
        <div className="flex h-2 w-full overflow-hidden rounded-full">
          {CRITERIA.map(({ key, trackColor }) => (
            <div
              key={key}
              style={{ width: `${effectivePct(key)}%`, backgroundColor: trackColor }}
              className="transition-all duration-150"
            />
          ))}
          {total === 0 && <div className="h-full w-full rounded-full bg-muted" />}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {CRITERIA.map(({ key, label, dotColor }) => (
            <span key={key} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t px-4 py-2.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!isCustom}
          className="h-8 gap-1.5 text-xs text-muted-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Réinitialiser
        </Button>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <Button
        variant={isCustom ? "default" : "outline"}
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-2"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Personnaliser le score
        {isCustom && (
          <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-xs font-medium leading-none">
            Modifié
          </span>
        )}
      </Button>

      {open && (
        <>
          {/* Mobile: dark backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={close}
          />

          {/*
            Mobile  → fixed centered overlay  (z-50)
            Desktop → absolute dropdown below button (z-50, top-full)
          */}
          <div
            className="
              fixed inset-0 z-50 flex items-center justify-center p-3 touch-none
              lg:absolute lg:inset-auto lg:top-full lg:right-0 lg:mt-2
              lg:block lg:p-0 lg:touch-auto
            "
          >
            {panel}
          </div>
        </>
      )}
    </div>
  );
}

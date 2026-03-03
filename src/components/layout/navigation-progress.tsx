"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Barre de progression fine en haut de page pendant les navigations.
 * Intercepte les clics sur les liens internes et s'anime
 * jusqu'à la fin du changement de route (détecté via usePathname).
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Intercepte les clics sur les liens internes pour déclencher la barre
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return;

      // Ignore ctrl/cmd+click (nouvel onglet)
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;

      // Lien interne → démarrer la barre
      setState("loading");
    }

    // Intercepte aussi router.push() via l'événement custom
    function handleRouterNav() {
      setState("loading");
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("navigation-start", handleRouterNav);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("navigation-start", handleRouterNav);
    };
  }, []);

  // Quand le pathname change → navigation terminée
  useEffect(() => {
    if (state === "loading") {
      setState("done");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setState("idle"), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Cleanup
  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  if (state === "idle") return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-0.5">
      <div
        className={`h-full bg-primary transition-all ${
          state === "loading"
            ? "duration-[8s] ease-out w-[85%]"
            : "duration-200 ease-in w-full"
        }`}
      />
    </div>
  );
}

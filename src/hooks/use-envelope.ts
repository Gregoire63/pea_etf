"use client";

import { useState, useEffect, useCallback } from "react";
import type { Envelope } from "@/lib/constants";

const STORAGE_KEY = "pea_envelope";

export function useEnvelope() {
  const [envelope, setEnvelope] = useState<Envelope>("pea");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "pea" || saved === "cto") {
        setEnvelope(saved);
      }
    } catch {
      // localStorage non disponible
    }
    setInitialized(true);
  }, []);

  const saveEnvelope = useCallback((e: Envelope) => {
    setEnvelope(e);
    try {
      localStorage.setItem(STORAGE_KEY, e);
    } catch {
      // localStorage non disponible
    }
  }, []);

  return { envelope, saveEnvelope, initialized };
}

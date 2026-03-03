"use client";

import { useState, useEffect, useCallback } from "react";
import type { BrokerId } from "@/types/broker";

const STORAGE_KEY = "pea_broker";

export function useBroker() {
  const [brokerId, setBrokerId] = useState<BrokerId | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setBrokerId(saved as BrokerId);
      }
    } catch {
      // localStorage non disponible
    }
    setInitialized(true);
  }, []);

  const saveBroker = useCallback((id: BrokerId) => {
    setBrokerId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // localStorage non disponible
    }
  }, []);

  const resetBroker = useCallback(() => {
    setBrokerId(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage non disponible
    }
  }, []);

  return { brokerId, saveBroker, resetBroker, initialized };
}

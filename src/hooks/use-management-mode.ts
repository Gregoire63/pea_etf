"use client";

import { useState, useEffect, useCallback } from "react";

export type ManagementMode = "libre" | "profilee";

const STORAGE_KEY = "pea_management_mode";

export function useManagementMode() {
  const [mode, setMode] = useState<ManagementMode>("libre");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "libre" || saved === "profilee") {
        setMode(saved);
      }
    } catch {
      // localStorage non disponible
    }
    setInitialized(true);
  }, []);

  const saveMode = useCallback((m: ManagementMode) => {
    setMode(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      // localStorage non disponible
    }
  }, []);

  return { mode, saveMode, initialized };
}

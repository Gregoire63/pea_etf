"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "pea_user_profile";

export interface UserProfile {
  birthYear: number;
  currentPeaCapital: number;
  monthlyInvestment: number;
  retirementAge: number;
}

export function useUserProfile() {
  // null = jamais configuré par l'utilisateur
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setProfile(JSON.parse(saved) as UserProfile);
      }
    } catch {
      // localStorage non disponible
    }
    setInitialized(true);
  }, []);

  // Sauvegarde explicite : appelée uniquement au clic sur "Enregistrer"
  const saveProfile = useCallback((p: UserProfile) => {
    setProfile(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      // localStorage non disponible
    }
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage non disponible
    }
  }, []);

  return { profile, saveProfile, resetProfile, initialized };
}

"use client";

import { useState, useEffect, useCallback } from "react";

const SESSION_KEY = "pea_user_profile";

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
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        setProfile(JSON.parse(saved) as UserProfile);
      }
    } catch {
      // sessionStorage non disponible
    }
    setInitialized(true);
  }, []);

  // Sauvegarde explicite : appelée uniquement au clic sur "Enregistrer"
  const saveProfile = useCallback((p: UserProfile) => {
    setProfile(p);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(p));
    } catch {
      // sessionStorage non disponible
    }
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // sessionStorage non disponible
    }
  }, []);

  return { profile, saveProfile, resetProfile, initialized };
}

"use client";

import * as React from "react";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Farm, User } from "@/types/database";

interface FarmContextType {
  farms: Farm[];
  currentFarm: Farm | null;
  user: User | null;
  isLoading: boolean;
  setCurrentFarm: (farm: Farm | null) => void;
  setFarms: (farms: Farm[]) => void;
  setUser: (user: User | null) => void;
  refreshFarms: () => Promise<void>;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

interface FarmProviderProps {
  children: React.ReactNode;
  initialFarms?: Farm[];
  initialCurrentFarm?: Farm | null;
  initialUser?: User | null;
}

export function FarmProvider({
  children,
  initialFarms = [],
  initialCurrentFarm = null,
  initialUser = null,
}: FarmProviderProps) {
  const [farms, setFarms] = useState<Farm[]>(initialFarms);
  const [currentFarm, setCurrentFarm] = useState<Farm | null>(initialCurrentFarm);
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(false);

  // Sync user when server re-renders with updated data
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    }
  }, [initialUser]);

  // Store current farm in localStorage AND cookie for persistence
  // Cookie is needed for Server Components to read the current farm
  useEffect(() => {
    if (currentFarm) {
      localStorage.setItem("currentFarmId", currentFarm.id);
      // Set cookie for server-side access (expires in 1 year)
      document.cookie = `currentFarmId=${currentFarm.id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
  }, [currentFarm]);

  // Restore current farm from localStorage on mount
  useEffect(() => {
    const storedFarmId = localStorage.getItem("currentFarmId");
    if (storedFarmId && farms.length > 0 && !currentFarm) {
      const storedFarm = farms.find((f) => f.id === storedFarmId);
      if (storedFarm) {
        setCurrentFarm(storedFarm);
      } else {
        // Default to first farm if stored farm not found
        setCurrentFarm(farms[0]);
      }
    } else if (farms.length > 0 && !currentFarm) {
      // Default to first farm if no stored farm
      setCurrentFarm(farms[0]);
    }
  }, [farms, currentFarm]);

  const refreshFarms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/farms");
      if (response.ok) {
        const data = await response.json();
        setFarms(data.farms || []);
      }
    } catch (error) {
      console.error("Failed to refresh farms:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <FarmContext.Provider
      value={{
        farms,
        currentFarm,
        user,
        isLoading,
        setCurrentFarm,
        setFarms,
        setUser,
        refreshFarms,
      }}
    >
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const context = useContext(FarmContext);
  if (context === undefined) {
    throw new Error("useFarm must be used within a FarmProvider");
  }
  return context;
}

export function useCurrentFarm() {
  const { currentFarm } = useFarm();
  return currentFarm;
}

export function useUser() {
  const { user } = useFarm();
  return user;
}

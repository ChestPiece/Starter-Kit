"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface PrimaryContextType {
  // Add any global state you need here
  isInitialized: boolean;
  setIsInitialized: (initialized: boolean) => void;
}

const PrimaryContext = createContext<PrimaryContextType | undefined>(undefined);

interface PrimaryProviderProps {
  children: ReactNode;
}

export function PrimaryProvider({ children }: PrimaryProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  const value: PrimaryContextType = {
    isInitialized,
    setIsInitialized,
  };

  return (
    <PrimaryContext.Provider value={value}>{children}</PrimaryContext.Provider>
  );
}

export function usePrimary() {
  const context = useContext(PrimaryContext);
  if (context === undefined) {
    throw new Error("usePrimary must be used within a PrimaryProvider");
  }
  return context;
}

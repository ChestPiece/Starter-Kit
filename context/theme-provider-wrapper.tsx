"use client";

import { ReactNode } from "react";
import { ThemeProvider } from "@/context/ThemeContext";

export function ThemeProviderWrapper({ children }: { children: ReactNode }) {
  // Mock settings for theme (no authentication required)
  const mockSettings = {
    appearance_theme: "light",
    primary_color: "220 90% 56%",
    secondary_color: "160 90% 44%",
  };

  return <ThemeProvider initialSettings={mockSettings}>{children}</ThemeProvider>;
}

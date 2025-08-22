"use client";

import React, { useEffect, useState } from "react";
import { ProfileSettings } from "./profile-settings";
import { AppearanceSettings } from "./appearance-settings";
import { OrganizationSettings } from "./organization-settings";
import { settingsService, Settings } from "@/modules/settings";
import { Settings as ServiceSettings } from "@/modules/settings/services/setting-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/loader";
import { User, Palette, Building2 } from "lucide-react";
import { logger } from '@/lib/services/logger';

// Helper function to convert service settings to model settings
const convertServiceToModelSettings = (
  serviceSettings: ServiceSettings | null
): Settings | null => {
  if (!serviceSettings) return null;

  return {
    id: serviceSettings.id?.toString() || "",
    site_name: serviceSettings.site_name,
    site_description: serviceSettings.site_description,
    site_image: serviceSettings.site_image,
    appearance_theme: serviceSettings.appearance_theme,
    primary_color: serviceSettings.primary_color,
    secondary_color: serviceSettings.secondary_color,
    logo_url: serviceSettings.logo_url,
    logo_horizontal_url: serviceSettings.logo_horizontal_url,
    favicon_url: serviceSettings.favicon_url,
    meta_keywords: serviceSettings.meta_keywords,
    meta_description: serviceSettings.meta_description,
    contact_email: serviceSettings.contact_email,
    social_links: serviceSettings.social_links,
    created_at: serviceSettings.created_at,
    updated_at: serviceSettings.updated_at,
    logo_setting: serviceSettings.logo_setting,
  };
};

const sections = [
  { name: "Profile", icon: User },
  { name: "Organization", icon: Building2 },
  { name: "Appearance", icon: Palette },
] as const;

export function ComprehensiveSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [active, setActive] =
    useState<(typeof sections)[number]["name"]>("Profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Add timeout to prevent hanging on Supabase connection issues
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout")), 10000);
        });

        const settingsPromise = settingsService.getSettingsById();

        const settingsData = (await Promise.race([
          settingsPromise,
          timeoutPromise,
        ])) as any;
        setSettings(convertServiceToModelSettings(settingsData));
      } catch (err) {
        logger.error("Failed to fetch settings:", { error: err instanceof Error ? err.message : String(err) });

        // Set default settings to prevent infinite loading
        const defaultSettings: Settings = {
          id: "default",
          site_name: "Starter Kit",
          site_description: "A modern application starter kit",
          primary_color: "#0070f3",
          secondary_color: "#00ff88",
          favicon_url: "/favicon.ico",
          logo_url:
            "https://res.cloudinary.com/dlzlfasou/image/upload/v1741345507/logo-01_kp2j8x.png",
          logo_horizontal_url: undefined,
          logo_setting: "square",
          appearance_theme: "light",
          meta_keywords: "",
          meta_description: "",
          contact_email: "",
          social_links: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setSettings(defaultSettings);
        setError(
          "Using default settings. Database connection may be unavailable."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Listen for settings updates to refresh data
  useEffect(() => {
    const handleSettingsUpdate = async () => {
      try {
        const updatedSettings = await settingsService.getSettingsById();
        setSettings(convertServiceToModelSettings(updatedSettings));
      } catch (err) {
        logger.error("Failed to refresh settings:", { error: err instanceof Error ? err.message : String(err) });
      }
    };

    window.addEventListener("settings-update", handleSettingsUpdate);
    return () => {
      window.removeEventListener("settings-update", handleSettingsUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader className="mx-auto" />
            <p className="text-sm text-foreground/70">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Error Loading Settings
          </h3>
          <p className="text-sm text-foreground/70">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-56 shrink-0">
          {/* Mobile Navigation */}
          <div className="lg:hidden mb-6">
            <div className="flex space-x-1 p-1 bg-muted rounded-lg overflow-x-auto">
              {sections.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setActive(item.name)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium cursor-pointer ${
                    active === item.name
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground bg-transparent hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:block">
            <nav className="space-y-2">
              {sections.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setActive(item.name)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-left cursor-pointer ${
                    active === item.name
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground bg-transparent hover:bg-muted"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <main className="flex-1 min-w-0">
          <div className="max-w-4xl">
            {active === "Profile" && <ProfileSettings />}
            {active === "Organization" && (
              <OrganizationSettings settings={settings || undefined} />
            )}
            {active === "Appearance" && (
              <AppearanceSettings settings={settings || undefined} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

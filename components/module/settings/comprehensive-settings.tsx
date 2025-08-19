"use client";

import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "./profile-settings";
import { AppearanceSettings } from "./appearance-settings";
import { OrganizationSettings } from "./organization-settings";
import { settingsService, Settings } from "@/modules/settings";
import { Settings as ServiceSettings } from "@/modules/settings/services/setting-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/loader";
import { User, Palette, Building2 } from "lucide-react";

// Helper function to convert service settings to model settings
const convertServiceToModelSettings = (
  serviceSettings: ServiceSettings | null
): Settings | null => {
  if (!serviceSettings) return null;

  return {
    id: serviceSettings.id?.toString() || "", // Convert number to string
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

export function ComprehensiveSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        // Add timeout to prevent hanging on Supabase connection issues
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout")), 10000); // 10 second timeout
        });

        const settingsPromise = settingsService.getSettingsById();

        const settingsData = (await Promise.race([
          settingsPromise,
          timeoutPromise,
        ])) as any;
        setSettings(convertServiceToModelSettings(settingsData));
      } catch (err) {
        console.error("Failed to fetch settings:", err);

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
        console.error("Failed to refresh settings:", err);
      }
    };

    window.addEventListener("settings-update", handleSettingsUpdate);
    return () => {
      window.removeEventListener("settings-update", handleSettingsUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
        </div>
        <Card className="w-full">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader className="mx-auto" />
              <p className="text-sm text-muted-foreground">
                Loading settings...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
        </div>
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <AppearanceSettings settings={settings || undefined} />
        </TabsContent>

        <TabsContent value="organization" className="space-y-6">
          <OrganizationSettings settings={settings || undefined} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

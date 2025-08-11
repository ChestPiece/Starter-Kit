"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  User,
  Building,
  Paintbrush,
  MessageCircle,
  Link as LinkIcon,
  Ban,
  Shield,
  AlertTriangle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { ProfileSettings } from "@/components/module/settings/profile-settings";
import { OrganizationSettings } from "@/components/module/settings/organization-settings";
import { AppearanceSettings } from "@/components/module/settings/appearance-settings";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/components/auth/user-context";
import { UserRoles } from "@/types/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsDialog() {
  const { user: currentUser } = useUser();
  const [activeSection, setActiveSection] = useState("Profile");
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab");

  // Give all users full access - no role checking needed
  const isAdmin = true; // All users have admin access
  const isManager = true; // All users have manager access

  // State for dynamic settings from database
  const [settings, setSettings] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      setSettingsLoading(true);
      try {
        const settingsService = (
          await import("@/modules/settings/services/setting-service")
        ).default;
        const data = await settingsService.getSettingsById();
        setSettings(data);
      } catch (error) {
        console.error("Error loading settings:", error);
        // Fallback to default settings
        setSettings({
          id: "fallback-settings-id",
          site_name: "Demo App",
          site_description: "This is a demo of the main application",
          primary_color: "#3B82F6",
          secondary_color: "#10B981",
          appearance_theme: "light" as const,
          site_image: "",
          logo_url:
            "https://res.cloudinary.com/dlzlfasou/image/upload/v1741345507/logo-01_kp2j8x.png",
          logo_horizontal_url: "",
          favicon_url: "",
          meta_keywords: "",
          meta_description: "",
          contact_email: "",
          social_links: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          logo_setting: "square" as const,
        });
      } finally {
        setSettingsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Navigation data - all users have access to all settings
  const data = {
    nav: [
      {
        name: "Profile",
        icon: User,
      },
      {
        name: "Organization",
        icon: Building,
      },
      {
        name: "Appearance",
        icon: Paintbrush,
      },
    ],
  };

  // Function to handle tab switching with URL updates
  const handleTabSwitch = (tabName: string) => {
    setActiveSection(tabName);
    // Update URL to reflect the active tab
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", tabName.toLowerCase());
    router.push(`/settings?${newSearchParams.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (tab) {
      const tabName = tab.charAt(0).toUpperCase() + tab.slice(1);
      // Check if this is a valid tab
      const validTab = data.nav.some((item) => item.name === tabName);
      if (validTab) {
        setActiveSection(tabName);
      } else {
        setActiveSection("Profile"); // Fallback to Profile
      }
    } else {
      setActiveSection("Profile");
    }
  }, [tab, data.nav]);

  // Render different setting sections - all users have access
  const renderSettingsContent = () => {
    // Show loading state while settings are being loaded
    if (
      settingsLoading &&
      (activeSection === "Organization" || activeSection === "Appearance")
    ) {
      return (
        <div key="loading" className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading settings...</p>
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case "Profile":
        return (
          <div key="profile">
            <ProfileSettings />
          </div>
        );
      case "Organization":
        return (
          <div key="organization">
            <OrganizationSettings settings={settings} />
          </div>
        );
      case "Appearance":
        return (
          <div key="appearance">
            <AppearanceSettings settings={settings} />
          </div>
        );
      default:
        return (
          <div key="default">
            <ProfileSettings />
          </div>
        );
    }
  };

  return (
    <div className="pt-6">
      {/* Settings Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Configure all system settings, preferences, and personal information
          </p>
        </div>
        <Badge
          variant={
            isAdmin ? "destructive" : isManager ? "secondary" : "default"
          }
        >
          <Shield className="h-3 w-3 mr-1" />
          {currentUser?.roles?.name || "user"}
        </Badge>
      </div>

      <div className="">
        <SidebarProvider className="items-start min-h-auto">
          <Sidebar collapsible="none" className="hidden md:flex ">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {data.nav.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <button
                          onClick={() => handleTabSwitch(item.name)}
                          className={`w-full flex items-center gap-3 h-9 rounded-md px-3 py-2 text-left font-medium cursor-pointer transition-colors ${
                            item.name === activeSection
                              ? "bg-primary/20 text-primary border-l-2 border-primary"
                              : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground"
                          }`}
                        >
                          {item.icon && (
                            <item.icon
                              className={`h-5 w-5 ${item.name === activeSection ? "text-primary" : "text-muted-foreground"}`}
                              aria-hidden="true"
                            />
                          )}
                          <span>{item.name}</span>
                        </button>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <main className="flex flex-col w-full">
            {/* Active Section Header */}
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                {(() => {
                  const activeItem = data.nav.find(
                    (item) => item.name === activeSection
                  );
                  const IconComponent = activeItem?.icon;
                  return IconComponent ? (
                    <IconComponent className="h-5 w-5" />
                  ) : null;
                })()}
                {activeSection}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {activeSection === "Profile" &&
                  "Update your personal details and profile picture"}
                {activeSection === "Organization" &&
                  "Manage your organization's branding and information"}
                {activeSection === "Appearance" &&
                  "Customize the look and feel of your application"}
              </p>
            </div>

            <ScrollArea className="h-[calc(100vh-170px)] overflow-y-auto">
              <div className="flex flex-col gap-4 p-6">
                {renderSettingsContent()}
              </div>
            </ScrollArea>
          </main>
        </SidebarProvider>
      </div>
    </div>
  );
}

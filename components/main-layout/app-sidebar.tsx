"use client";

import * as React from "react";
import { useEffect, useState } from "react";

import { NavMain } from "@/components/main-layout/nav-main";
import { NavUser } from "@/components/main-layout/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { getNavData } from "@/components/main-layout/menu-items";
import { usePathname } from "next/navigation";
import Header from "./header";
import { SearchForm } from "../search-form";
import { TeamSwitcher } from "../ui/settings/app-side-bar-logo";
import { Settings } from "@/modules/settings";
import { useUser } from "@/components/auth/user-context";
import { RemixiconComponentType } from "@remixicon/react";
import { LucideIcon } from "lucide-react";

type IconType = LucideIcon | RemixiconComponentType;

interface NavSubItem {
  title: string;
  url: string;
  icon?: IconType;
  isActive?: boolean;
}

interface NavItem {
  title: string;
  url: string;
  icon?: IconType;
  isActive?: boolean;
  items?: NavSubItem[];
}

interface NavSection {
  title: string;
  url: string;
  items: NavItem[];
}

function formatPathname(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  const segments = pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  return lastSegment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function SideBarLayout({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings?: Settings;
}) {
  const [navItems, setNavItems] = useState<NavSection[]>([]);
  const pathname = usePathname();
  const title = formatPathname(pathname);
  const { user, loading } = useUser();

  const data: {
    teams: Array<{
      name: string;
      logo: string;
      logo_horizontal?: string;
      logo_setting: string;
    }>;
  } = {
    teams: [
      {
        name:
          settings?.site_name ||
          process.env.NEXT_PUBLIC_SITE_NAME ||
          "Starter Kit.",
        logo:
          settings?.logo_url ||
          process.env.NEXT_PUBLIC_LOGO_URL ||
          "https://res.cloudinary.com/dlzlfasou/image/upload/v1741345507/logo-01_kp2j8x.png",
        logo_horizontal: settings?.logo_horizontal_url,
        logo_setting:
          settings?.logo_setting ||
          process.env.NEXT_PUBLIC_LOGO_SETTING ||
          "square",
      },
    ],
  };

  // Get navigation data based on user role - updates dynamically when role changes
  useEffect(() => {
    if (user) {
      const userRole = user.roles?.name || "user";
      const navData = getNavData({ roles: user.roles || { name: "user" } });
      setNavItems(navData.navMain as NavSection[]);

      // Only log navigation updates when they actually change
      const currentNavTitles = navItems.map(section => section.title).join(', ');
      const newNavTitles = navData.navMain.map(section => section.title).join(', ');
      
      if (currentNavTitles !== newNavTitles || !navItems.length) {
        console.log(`🧭 Navigation updated for ${userRole.toUpperCase()} role`);
        
        // Show available sections in a clean format
        const sections = navData.navMain.map(section => 
          `${section.title}: ${section.items?.map(item => item.title).join(', ')}`
        ).join(' | ');
        
        console.log(`   📱 Available: ${sections}`);
        
        // Show role-specific permissions
        if (userRole === "admin") {
          console.log("   🔑 Full admin access - all features available");
        } else if (userRole === "manager") {
          console.log("   👔 Manager access - settings available, no user management");
        } else {
          console.log("   👤 Basic access - dashboard only");
        }
      }
    } else {
      setNavItems([]);
      console.log("❌ No user - navigation cleared");
    }
  }, [user, user?.roles?.name, navItems]); // Watch both user and role changes

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <TeamSwitcher teams={data.teams} settings={settings} />
            <hr className="border-t border-border mx-2 -mt-px" />
            <SearchForm className="mt-3" />
          </SidebarHeader>
          <SidebarContent>
            <NavMain items={navItems} user={user || undefined} />
          </SidebarContent>
          <SidebarFooter>
            <NavUser user={user} />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="overflow-hidden ">
          <div className="px-4 md:px-6 lg:px-8">
            <Header title={title} url={pathname} />
          </div>
          <main>{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

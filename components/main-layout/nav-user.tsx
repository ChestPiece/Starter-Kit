"use client";

import {
  ChevronsUpDown,
  LogOut,
  Settings,
  RefreshCw,
  Shield,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";
import { User } from "@/types/types";
import { generateNameAvatar } from "@/utils/generateRandomAvatar";
import { LogoutButton } from "@/components/auth/logout-button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/components/auth/user-context";
import { useState } from "react";

export function NavUser({ user }: { user: User | null }) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { refreshUser } = useUser();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
      console.log("User data refreshed manually");
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="cursor-pointer  data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={
                      user?.profile?.includes("http")
                        ? user?.profile
                        : generateNameAvatar(
                            user?.first_name + " " + user?.last_name
                          )
                    }
                    alt={user?.first_name}
                  />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user?.first_name + " " + user?.last_name}
                  </span>
                  <span className="truncate text-xs">{user?.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width)  rounded-lg "
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={
                        user?.profile?.includes("http")
                          ? user?.profile
                          : generateNameAvatar(
                              user?.first_name + " " + user?.last_name
                            )
                      }
                      alt={user?.first_name}
                    />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user?.first_name + " " + user?.last_name}
                    </span>
                    <span className="truncate text-xs">{user?.email}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge
                        variant={getRoleBadgeVariant(
                          user?.roles?.name || "user"
                        )}
                        className="text-xs px-1 py-0"
                      >
                        <Shield className="h-2 w-2 mr-1" />
                        {user?.roles?.name || "user"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="cursor-pointer"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                {isRefreshing ? "Refreshing..." : "Refresh Role"}
              </DropdownMenuItem>
              <DropdownMenuItem className="p-0">
                <LogoutButton className="w-full justify-start h-auto p-2 bg-transparent hover:bg-accent text-foreground font-normal">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </LogoutButton>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}

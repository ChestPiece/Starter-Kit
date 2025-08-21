"use client";

import * as React from "react";
import { Paintbrush, Settings as SettingsIcon, User } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { ProfileSettings } from "@/components/module/settings/profile-settings";
import { OrganizationSettings } from "@/components/module/settings/organization-settings";
import { AppearanceSettings } from "@/components/module/settings/appearance-settings";

const sections = [
  { name: "Profile", icon: User },
  { name: "Organization", icon: SettingsIcon },
  { name: "Appearance", icon: Paintbrush },
] as const;

type SettingsDialogProps = {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function SettingsDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: SettingsDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [active, setActive] =
    React.useState<(typeof sections)[number]["name"]>("Profile");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          <>{trigger}</>
        ) : (
          <Button size="sm" variant="outline" className="gap-2">
            <SettingsIcon size={16} /> Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 md:max-h-[520px] md:max-w-[900px] lg:max-w-[980px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex w-44">
            <SidebarContent>
              <SidebarGroup className="py-3 px-3">
                <SidebarGroupContent className="border border-border rounded-lg p-2">
                  <SidebarMenu className="gap-1">
                    {sections.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          isActive={active === item.name}
                          onClick={() => setActive(item.name)}
                          size="sm"
                          className="py-2.5 px-3 h-9"
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="font-medium">{item.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[500px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{active}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-2 pt-0">
              {active === "Profile" && <ProfileSettings />}
              {active === "Organization" && (
                <OrganizationSettings settings={null as any} />
              )}
              {active === "Appearance" && (
                <AppearanceSettings settings={null as any} />
              )}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}

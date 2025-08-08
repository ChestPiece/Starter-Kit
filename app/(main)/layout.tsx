"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import SideBarLayout from "@/components/main-layout/app-sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SideBarLayout>
      <ScrollArea className="h-[calc(100vh-73px)]">
        <div className="px-4 md:px-6 lg:px-8">{children}</div>
      </ScrollArea>
    </SideBarLayout>
  );
}

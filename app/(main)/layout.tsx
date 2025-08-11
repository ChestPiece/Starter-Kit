"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import SideBarLayout from "@/components/main-layout/app-sidebar";
import { AuthWrapper } from "@/components/auth/auth-wrapper";
import { AccessDeniedAlert } from "@/components/access-denied";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthWrapper>
      <SideBarLayout>
        <ScrollArea className="h-[calc(100vh-73px)]">
          <div className="px-4 md:px-6 lg:px-8">
            <AccessDeniedAlert />
            {children}
          </div>
        </ScrollArea>
      </SideBarLayout>
    </AuthWrapper>
  );
}

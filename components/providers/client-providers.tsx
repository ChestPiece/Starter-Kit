"use client";

import { UserProvider } from "@/components/auth/user-context";
import { SessionTimeout } from "@/components/auth/session-timeout";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      {children}
      <SessionTimeout />
    </UserProvider>
  );
}

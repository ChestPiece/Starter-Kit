"use client";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth-actions";
import { useTransition } from "react";

interface LogoutButtonProps {
  children?: React.ReactNode;
  className?: string;
}

export function LogoutButton({ children, className }: LogoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await logout();
      } catch (error) {
        console.error("Logout failed:", error);
        // Fallback: redirect to login even if logout fails
        window.location.href = "/auth/login";
      }
    });
  };

  return (
    <Button 
      onClick={handleLogout} 
      variant="outline" 
      className={className}
      disabled={isPending}
    >
      {isPending ? "Signing out..." : (children || "Sign out")}
    </Button>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page by default
    router.replace("/auth/login");
  }, [router]);

  // Redirect happens immediately, no need to show loading state
  return null;
}

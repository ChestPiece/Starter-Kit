"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page by default
    router.replace("/auth/login");
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}

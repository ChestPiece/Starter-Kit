"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SimpleSignupForm } from "@/components/auth/simple-signup-form";
import { SupabaseEmailConfirmation } from "@/components/auth/supabase-email-confirmation";

export default function SignupPage() {
  const [currentView, setCurrentView] = useState<
    "login" | "signup" | "forgot-password" | "email-sent"
  >("signup");
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

  // Set page title dynamically
  useEffect(() => {
    document.title = "Sign Up - Your App";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {currentView === "signup" ? (
          <SimpleSignupForm />
        ) : (
          <SupabaseEmailConfirmation
            email={userEmail}
            onBack={() => router.push("/auth/login")}
          />
        )}
      </div>
    </div>
  );
}

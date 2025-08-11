"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SupabaseAuthForm } from "@/components/auth/supabase-auth-form";
import { SupabaseEmailConfirmation } from "@/components/auth/supabase-email-confirmation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserPlus } from "lucide-react";

export default function SignupPage() {
  const [currentView, setCurrentView] = useState<"signup" | "email-sent">(
    "signup"
  );
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

  // Set page title dynamically
  useEffect(() => {
    document.title = "Sign Up - Your App";
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Message for New Users */}
      <Alert className="mb-4 border-green-200 bg-green-50">
        <UserPlus className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Create your account to get started. Already have an account? You can
          sign in below.
        </AlertDescription>
      </Alert>

      {currentView === "signup" ? (
        <SupabaseAuthForm
          view="signup"
          onViewChange={(view) => {
            if (view === "login") {
              router.push("/auth/login");
            } else if (view === "email-sent") {
              setCurrentView("email-sent");
            }
          }}
          onEmailSet={setUserEmail}
        />
      ) : (
        <SupabaseEmailConfirmation
          email={userEmail}
          onBack={() => router.push("/auth/login")}
        />
      )}
    </div>
  );
}

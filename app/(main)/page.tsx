"use client";

import { useUser } from "@/components/auth/user-context";

// Force dynamic rendering for dashboard that shows user-specific data
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const { user, loading } = useUser();

  // Create display name with fallback logic
  const getDisplayName = () => {
    if (loading) return "...";

    if (!user) return "user";

    // Try first_name + last_name
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }

    // Try just first_name
    if (user.first_name) {
      return user.first_name;
    }

    // Try just last_name
    if (user.last_name) {
      return user.last_name;
    }

    // Try email username (before @)
    if (user.email) {
      const emailUsername = user.email.split("@")[0];
      // Capitalize first letter of email username
      return emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
    }

    // Final fallback
    return "user";
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Welcome back {getDisplayName()}</h1>
      </div>
    </div>
  );
}

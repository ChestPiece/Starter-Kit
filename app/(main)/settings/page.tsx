"use client";

import { ComprehensiveSettings } from "@/components/module/settings/comprehensive-settings";
import { AuthErrorBoundary } from "@/components/error-boundary";
import { withRoleAccess } from "@/hooks/use-role-access";

function SettingsPage() {
  return (
    <AuthErrorBoundary>
      <ComprehensiveSettings />
    </AuthErrorBoundary>
  );
}

// Only admin and manager users can access the Settings page
export default withRoleAccess(SettingsPage, ["admin", "manager"]);

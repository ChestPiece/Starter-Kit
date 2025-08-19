import { ComprehensiveSettings } from "@/components/module/settings/comprehensive-settings";
import { AuthErrorBoundary } from "@/components/error-boundary";

// Force dynamic rendering for settings page that loads user-specific data
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <AuthErrorBoundary>
      <ComprehensiveSettings />
    </AuthErrorBoundary>
  );
}

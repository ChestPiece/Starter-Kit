import UserComponent from "@/components/(main)/user";
import { DashboardErrorBoundary } from "@/components/error-boundary";

// Force dynamic rendering for users page that loads user-specific data
export const dynamic = "force-dynamic";

function UsersContent() {
  return (
    <DashboardErrorBoundary>
      <UserComponent type="users" />
    </DashboardErrorBoundary>
  );
}

export default function UsersPage() {
  return <UsersContent />;
}

"use client";

import UserComponent from "@/components/(main)/user";
import { DashboardErrorBoundary } from "@/components/error-boundary";
import { withRoleAccess } from "@/hooks/use-role-access";

function UsersContent() {
  return (
    <DashboardErrorBoundary>
      <UserComponent type="users" />
    </DashboardErrorBoundary>
  );
}

function UsersPage() {
  return <UsersContent />;
}

// Only admin users can access the Users page
export default withRoleAccess(UsersPage, "admin");

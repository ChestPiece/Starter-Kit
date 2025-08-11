import UserManagementPage from "@/components/(main)/user";
import { RolePageGuard } from "@/components/role-page-guard";

function UsersContent() {
    return (
        <div className="py-4">
            <UserManagementPage type="users" />
        </div>
    )
}

export default function UsersPage() {
    return (
        <RolePageGuard requiredRole="admin" currentPath="/users">
            <UsersContent />
        </RolePageGuard>
    );
}

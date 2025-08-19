"use client";
import { useState, useEffect, useCallback } from "react";

import { getUserColumns } from "@/components/data-table/columns/column-user";
import { UserDataTableToolbar } from "@/components/data-table/toolbars/user-toolbar";
import { DataTable } from "@/components/data-table/data-table";
import { usersService } from "@/modules/users/services/users-service";
import { User, UserRoles } from "@/types/types";
import { rolesService } from "@/modules/roles/services/roles-service";
import { Role } from "@/modules/roles/models/role";
import { useDebounce } from "@/hooks/use-debounce";
import { useUser } from "@/components/auth/user-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, AlertTriangle } from "lucide-react";

export default function UserManagementPage({ type }: { type: string }) {
  const { user: currentUser } = useUser();
  const [listUsers, setListUsers] = useState<User[]>([]);
  const [listRoles, setListRoles] = useState<Role[]>([]);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const debouncedSearchTerm = useDebounce(searchQuery, 500);

  // Proper role checking using current user's role
  const userRole = currentUser?.roles?.name || 'user';
  const isAdmin = userRole === 'admin';
  const isManager = userRole === 'manager' || userRole === 'admin';

  const fetchUsers = useCallback(async () => {
    setIsRefetching(true);
    try {
      const usersResponse: any = await usersService.getUsersPagination(
        debouncedSearchTerm || "",
        pageSize,
        currentPage
      );

      setListUsers(usersResponse.users);
      setRecordCount(usersResponse.totalCount);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsRefetching(false);
    }
  }, [debouncedSearchTerm, pageSize, currentPage]);
  const fetchRoles = async () => {
    const rolesResponse: Role[] = await rolesService.getAllRoles();
    setListRoles(rolesResponse);
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers]);

  const handleGlobalFilterChange = (filter: string) => {
    if (!searchQuery && !filter) {
      setIsRefetching(true);
      fetchUsers();
    } else {
      setSearchQuery(filter);
    }
    setCurrentPage(0);
  };

  const handlePageChange = (pageIndex: number) => {
    setCurrentPage(pageIndex);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(0);
  };

  // Access control - check after all hooks are called
  if (!isManager) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Access Denied
          </CardTitle>
          <CardDescription>
            You don't have permission to access user management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {currentUser?.roles?.name || "user"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Contact an administrator for access.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Admin Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Manage all users, roles, and permissions"
              : "View and manage user accounts (limited access)"}
          </p>
        </div>
        <Badge variant={isAdmin ? "destructive" : "secondary"}>
          <Shield className="h-3 w-3 mr-1" />
          {currentUser?.roles?.name || "user"}
        </Badge>
      </div>

      <DataTable
        data={listUsers || []}
        toolbar={
          <UserDataTableToolbar
            fetchRecords={fetchUsers}
            type={type}
            listRoles={listRoles}
            isAdmin={isAdmin}
            isManager={isManager}
            currentUser={currentUser}
          />
        }
        // @ts-ignore
        columns={getUserColumns(fetchUsers, listRoles as Role[], {
          isAdmin,
          isManager,
        })}
        onGlobalFilterChange={handleGlobalFilterChange}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pageSize={pageSize}
        currentPage={currentPage}
        loading={isRefetching}
        error={""}
        rowCount={recordCount}
        type="users"
      />
    </div>
  );
}

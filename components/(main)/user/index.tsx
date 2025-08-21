"use client";
import { useState, useEffect, useCallback } from "react";

import { getUserColumns } from "@/components/data-table/columns/column-user";
import { UserDataTableToolbar } from "@/components/data-table/toolbars/user-toolbar";
import { DataTable } from "@/components/data-table/data-table";
import { userService } from "@/lib/services/user-service";
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
  const userRole = currentUser?.roles?.name || "user";
  const isAdmin = userRole === "admin";
  const isManager = userRole === "manager" || userRole === "admin";

  const fetchUsers = useCallback(async () => {
    setIsRefetching(true);
    try {
      const usersResponse = await userService.getUsersPagination(
        debouncedSearchTerm || "",
        pageSize,
        currentPage
      );

      setListUsers(usersResponse.users);
      setRecordCount(usersResponse.totalCount);
    } catch (error) {
      console.error("Error fetching users:", error);
      // Set empty state on error
      setListUsers([]);
      setRecordCount(0);
    } finally {
      setIsRefetching(false);
    }
  }, [debouncedSearchTerm, pageSize, currentPage]);

  const fetchRoles = useCallback(async () => {
    try {
      const rolesResponse: Role[] = await rolesService.getAllRoles();
      setListRoles(rolesResponse);
    } catch (error) {
      console.error("Error fetching roles:", error);
      setListRoles([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleGlobalFilterChange = useCallback(
    (filter: string) => {
      if (!searchQuery && !filter) {
        setIsRefetching(true);
        fetchUsers();
      } else {
        setSearchQuery(filter);
      }
      setCurrentPage(0);
    },
    [searchQuery, fetchUsers]
  );

  const handlePageChange = useCallback((pageIndex: number) => {
    setCurrentPage(pageIndex);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(0);
  }, []);

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
            <span className="text-sm text-foreground/70">
              Contact an administrator for access.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4 pt-6">
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

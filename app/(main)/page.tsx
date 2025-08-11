"use client";

import { useUser } from "@/components/auth/user-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRoles } from "@/types/types";
import Link from "next/link";
import {
  Users,
  Settings,
  UserPlus,
  Shield,
  Activity,
  TrendingUp,
  Database,
  Cog,
} from "lucide-react";
import { useEffect, useState } from "react";
import { RoleDebugInfo } from "@/components/role-debug-info";

export default function DashboardPage() {
  const { user, loading } = useUser();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    recentSignups: 0,
    totalRoles: 0,
    pendingPasswordResets: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Role-based access control based on actual user roles
  const userRole = ((user?.roles as any)?.name || "user") as string;
  const isAdmin = userRole === "admin";
  const isManager = userRole === "manager" || userRole === "admin";
  const isUser = userRole === "user";

  // Load real dashboard stats from database
  useEffect(() => {
    const loadDashboardStats = async () => {
      setStatsLoading(true);
      try {
        const { dashboardStatsService } = await import(
          "@/lib/services/dashboard-stats-service"
        );
        const data = await dashboardStatsService.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Error loading dashboard stats:", error);
        // Fallback to basic stats on error
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          adminUsers: 0,
          recentSignups: 0,
          totalRoles: 0,
          pendingPasswordResets: 0,
        });
      } finally {
        setStatsLoading(false);
      }
    };

    if (isManager) {
      loadDashboardStats();
    }
  }, [isManager]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">Loading...</div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            Welcome back, {user?.first_name || "User"}!
          </h1>
          <Badge
            variant={
              isAdmin ? "destructive" : isManager ? "secondary" : "default"
            }
          >
            {user?.roles?.name || "user"}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          {isAdmin
            ? "You have full administrative access: Dashboard, Settings, and Users."
            : isManager
              ? "You have management access: Dashboard and all Settings components."
              : "You have standard access: Dashboard and Profile settings."}
        </p>
      </div>

      {/* Admin/Manager Stats */}
      {isManager && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            // Loading state
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded animate-pulse w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-32"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    +{stats.recentSignups} this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Users
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalUsers > 0
                      ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
                      : 0}
                    % of total users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Admin Users
                  </CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.adminUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    System administrators
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Recent Signups
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.recentSignups}
                  </div>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile Settings - Available to all users */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cog className="h-5 w-5" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Update your profile, change password, and manage personal settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings?tab=profile">
              <Button className="w-full">Manage Profile</Button>
            </Link>
          </CardContent>
        </Card>

        {/* User Management - Admin only */}
        {isAdmin && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage all users, roles, and permissions (Admin only)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/users">
                <Button className="w-full">View All Users</Button>
              </Link>
              <Link href="/users?action=add">
                <Button variant="outline" className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New User
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* System Settings - Admin/Manager only */}
        {isManager && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>
                {isAdmin
                  ? "Configure system-wide settings and preferences"
                  : "View system configuration"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/settings?tab=organization">
                <Button className="w-full">Organization Settings</Button>
              </Link>
              <Link href="/settings?tab=appearance">
                <Button variant="outline" className="w-full">
                  Appearance Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity - All users */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              See what's been happening in your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Last login</span>
                <span className="text-muted-foreground">Just now</span>
              </div>
              <div className="flex justify-between">
                <span>Profile updated</span>
                <span className="text-muted-foreground">2 days ago</span>
              </div>
              {isManager && (
                <div className="flex justify-between">
                  <span>Users managed</span>
                  <span className="text-muted-foreground">1 week ago</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Status - Admin only */}
        {isAdmin && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Status
              </CardTitle>
              <CardDescription>
                Monitor system health and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>Database</span>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    Healthy
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Authentication</span>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    Active
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Email Service</span>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    Online
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Role Debug Info for testing */}
      <div className="flex justify-center">
        <RoleDebugInfo />
      </div>
    </div>
  );
}

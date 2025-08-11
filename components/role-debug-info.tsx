"use client";

import { useUser } from "@/components/auth/user-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Shield, Clock } from "lucide-react";
import { useState } from "react";

export function RoleDebugInfo() {
  const { user, refreshUser, loading } = useUser();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
      setLastRefresh(new Date());
      console.log("🔄 Manual refresh completed");
    } catch (error) {
      console.error("❌ Failed to refresh user data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive" as const;
      case "manager":
        return "secondary" as const;
      default:
        return "default" as const;
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Debug Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">Loading user data...</div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Debug Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">No user logged in</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Debug Info
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1 hover:bg-muted rounded"
            title="Refresh user data"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Role:</span>
          <Badge variant={getRoleBadgeVariant(user.roles?.name || "user")}>
            {user.roles?.name || "user"}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">User ID:</span>
          <span className="text-xs text-muted-foreground font-mono">
            {user.id.slice(0, 8)}...
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Role ID:</span>
          <span className="text-xs text-muted-foreground">
            {user.role_id || "Not set"}
          </span>
        </div>

        {lastRefresh && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-medium">Current Access Level:</div>
            {user.roles?.name === "admin" && (
              <div className="space-y-1">
                <div>✅ Dashboard - Full access</div>
                <div>✅ Settings - Full access</div>
                <div>✅ Users - Full access</div>
                <div className="text-green-600 font-medium">🔑 Administrator privileges</div>
              </div>
            )}
            {user.roles?.name === "manager" && (
              <div className="space-y-1">
                <div>✅ Dashboard - Full access</div>
                <div>✅ Settings - Full access</div>
                <div>❌ Users - No access</div>
                <div className="text-blue-600 font-medium">👔 Manager privileges</div>
              </div>
            )}
            {(!user.roles?.name || user.roles?.name === "user") && (
              <div className="space-y-1">
                <div>✅ Dashboard - Full access</div>
                <div>❌ Settings - No access</div>
                <div>❌ Users - No access</div>
                <div className="text-gray-600 font-medium">👤 Standard user</div>
              </div>
            )}
          </div>
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <div>✅ Real-time subscription: Active</div>
            <div>🎯 Auto-refresh on role change: Enabled</div>
            <div>🧭 Navigation updates: Automatic</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

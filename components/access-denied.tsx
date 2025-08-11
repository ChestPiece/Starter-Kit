"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useUser } from "@/components/auth/user-context";

export function AccessDeniedAlert() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const accessDenied = searchParams.get("access_denied");
    if (accessDenied === "true") {
      setShowAlert(true);

      // Clear the parameter from URL after showing the alert
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete("access_denied");
      window.history.replaceState({}, "", currentUrl.toString());
    }
  }, [searchParams]);

  const handleGoBack = () => {
    const userRole = user?.roles?.name || "user";

    // Redirect based on user role
    switch (userRole) {
      case "admin":
        router.push("/");
        break;
      case "manager":
        router.push("/settings");
        break;
      case "user":
      default:
        router.push("/");
        break;
    }

    setShowAlert(false);
  };

  if (!showAlert) return null;

  const userRole = user?.roles?.name || "user";

  return (
    <Alert variant="destructive" className="mb-6">
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Access Denied</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          You don&apos;t have permission to access this page. Your current role
          is: <strong>{userRole}</strong>
        </p>
        <div className="mb-3">
          <strong>Available pages for your role:</strong>
          <ul className="list-disc list-inside mt-1 ml-2">
            <li>Dashboard</li>
            {userRole === "manager" && <li>Settings</li>}
            {userRole === "admin" && (
              <>
                <li>Settings</li>
                <li>User Management</li>
              </>
            )}
          </ul>
        </div>
        <Button onClick={handleGoBack} size="sm" variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go to Dashboard
        </Button>
      </AlertDescription>
    </Alert>
  );
}

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: "user" | "manager" | "admin";
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders content based on user role
 */
export function RoleGuard({
  children,
  requiredRole,
  fallback,
}: RoleGuardProps) {
  const { user, loading } = useUser();

  if (loading) {
    return <div>Loading...</div>;
  }

  const userRole = user?.roles?.name || "user";

  // Role hierarchy check
  const roleHierarchy = { user: 1, manager: 2, admin: 3 };
  const hasPermission =
    roleHierarchy[userRole as keyof typeof roleHierarchy] >=
    roleHierarchy[requiredRole];

  if (!hasPermission) {
    return (
      fallback || (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            You need {requiredRole} privileges or higher to view this content.
          </AlertDescription>
        </Alert>
      )
    );
  }

  return <>{children}</>;
}

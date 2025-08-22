"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { forceLogoutAndRedirect, validateUserSession } from "@/lib/auth-utils";
import { SESSION_CONFIG, updateLastActivity } from "@/lib/session-config";
import { logger } from '@/lib/services/logger';

interface SessionTimeoutProps {
  /**
   * Whether to show the warning as a dialog (default) or inline alert
   */
  variant?: "dialog" | "alert";
  /**
   * Custom warning time before showing the warning (in milliseconds)
   * If not provided, uses SESSION_CONFIG.SESSION_WARNING_TIME
   */
  warningTime?: number;
}

export function SessionTimeout({
  variant = "dialog",
  warningTime = SESSION_CONFIG.SESSION_WARNING_TIME,
}: SessionTimeoutProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    // Listen for session warning events
    const handleSessionWarning = (event: CustomEvent) => {
      setTimeRemaining(event.detail.timeRemaining);
      setShowWarning(true);
    };

    window.addEventListener(
      "sessionWarning",
      handleSessionWarning as EventListener
    );

    return () => {
      window.removeEventListener(
        "sessionWarning",
        handleSessionWarning as EventListener
      );
    };
  }, []);

  useEffect(() => {
    // Update countdown timer
    if (!showWarning) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          setShowWarning(false);
          // Auto logout when time expires
          forceLogoutAndRedirect("session_timeout");
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showWarning]); // Only depend on showWarning to prevent unnecessary timer recreation

  const handleExtendSession = async () => {
    setIsExtending(true);

    try {
      // Validate current session
      const isValid = await validateUserSession();

      if (isValid) {
        // Update last activity to extend session
        updateLastActivity();
        setShowWarning(false);
        setTimeRemaining(0);

        // Show success notification
        logger.info("Session extended successfully");
      } else {
        // Session is invalid, force logout
        await forceLogoutAndRedirect("invalid_session_on_extend");
      }
    } catch (error) {
      logger.error("Error extending session:", { error: error instanceof Error ? error.message : String(error) });
      await forceLogoutAndRedirect("session_extend_error");
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogoutNow = async () => {
    await forceLogoutAndRedirect("user_initiated_logout");
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!showWarning) return null;

  const content = (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold text-amber-700">Session Expiring Soon</h3>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Your session will expire in{" "}
          <strong className="text-red-600">{formatTime(timeRemaining)}</strong>{" "}
          due to inactivity.
        </p>
        <p className="text-sm text-gray-500">
          Click "Extend Session" to continue working, or you'll be automatically
          logged out for security.
        </p>
      </div>

      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Clock className="h-4 w-4" />
        <span>Auto-logout in {formatTime(timeRemaining)}</span>
      </div>
    </div>
  );

  const actions = (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        onClick={handleLogoutNow}
        disabled={isExtending}
      >
        Logout Now
      </Button>
      <Button
        onClick={handleExtendSession}
        disabled={isExtending}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isExtending ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Extending...
          </>
        ) : (
          "Extend Session"
        )}
      </Button>
    </div>
  );

  if (variant === "alert") {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertDescription>
          <div className="space-y-3">
            {content}
            {actions}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span>Session Timeout Warning</span>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p>
                Your session will expire in{" "}
                <strong className="text-red-600">
                  {formatTime(timeRemaining)}
                </strong>{" "}
                due to inactivity.
              </p>
              <p className="text-sm">
                Click "Extend Session" to continue working, or you'll be
                automatically logged out for security.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 py-2">
          <Clock className="h-4 w-4" />
          <span>Auto-logout in {formatTime(timeRemaining)}</span>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleLogoutNow}
            disabled={isExtending}
          >
            Logout Now
          </Button>
          <Button
            onClick={handleExtendSession}
            disabled={isExtending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isExtending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Extending...
              </>
            ) : (
              "Extend Session"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export as default for dynamic imports
export default SessionTimeout;

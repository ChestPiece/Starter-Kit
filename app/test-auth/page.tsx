"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function TestAuthPage() {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setUser(user);
        setSession(session);
        console.log("Auth check:", { user: !!user, session: !!session });
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [supabase]);

  const handleGoToDashboard = () => {
    router.push("/");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Test</h1>

      <div className="space-y-4">
        <div>
          <strong>User Status:</strong>{" "}
          {user ? "✅ Authenticated" : "❌ Not authenticated"}
        </div>

        <div>
          <strong>Session Status:</strong>{" "}
          {session ? "✅ Active" : "❌ No session"}
        </div>

        {user && (
          <div>
            <strong>User Email:</strong> {user.email}
          </div>
        )}

        {session && (
          <div>
            <strong>Session Expires:</strong>{" "}
            {new Date(session.expires_at * 1000).toLocaleString()}
          </div>
        )}

        <div className="space-x-4 pt-4">
          <button
            onClick={handleGoToDashboard}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </button>

          {user && (
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          )}
        </div>

        <div className="mt-8 p-4 bg-gray-100 rounded">
          <strong>Debug Info:</strong>
          <pre className="text-xs mt-2 overflow-auto">
            {JSON.stringify(
              {
                user: user
                  ? {
                      id: user.id,
                      email: user.email,
                      confirmed: user.email_confirmed_at,
                    }
                  : null,
                session: session
                  ? {
                      expires_at: session.expires_at,
                      access_token:
                        session.access_token?.substring(0, 20) + "...",
                    }
                  : null,
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}



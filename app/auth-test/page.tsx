"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthTestPage() {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const router = useRouter();
  const supabase = createClient();

  const addLog = (message: string) => {
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
    console.log(message);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        addLog("Starting auth check...");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        addLog(`User check: ${user ? `✅ ${user.email}` : "❌ No user"}`);
        addLog(`Session check: ${session ? "✅ Active" : "❌ No session"}`);

        if (userError) addLog(`User error: ${userError.message}`);
        if (sessionError) addLog(`Session error: ${sessionError.message}`);

        setUser(user);
        setSession(session);
      } catch (error) {
        addLog(`Auth check error: ${error}`);
      } finally {
        setLoading(false);
        addLog("Auth check completed");
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      addLog(`Auth event: ${event}`);
      if (session?.user) {
        addLog(`New user session: ${session.user.email}`);
        setUser(session.user);
        setSession(session);
      } else {
        addLog("Session cleared");
        setUser(null);
        setSession(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleTestDashboard = () => {
    addLog("Testing dashboard redirect...");
    router.push("/");
  };

  const handleForceRefresh = () => {
    addLog("Force refreshing page...");
    window.location.reload();
  };

  const handleLogout = async () => {
    addLog("Logging out...");
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2">Loading authentication state...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Authentication Debug</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Auth Status</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={user ? "text-green-600" : "text-red-600"}>
                {user ? "✅" : "❌"}
              </span>
              <span>User: {user ? user.email : "Not authenticated"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={session ? "text-green-600" : "text-red-600"}>
                {session ? "✅" : "❌"}
              </span>
              <span>Session: {session ? "Active" : "None"}</span>
            </div>
            {session && (
              <div className="text-sm text-gray-600">
                Expires: {new Date(session.expires_at * 1000).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-y-2">
            <button
              onClick={handleTestDashboard}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Test Dashboard Access
            </button>

            <button
              onClick={handleForceRefresh}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Force Page Refresh
            </button>

            {user && (
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>
        <div className="bg-gray-100 p-4 rounded max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {log}
              </div>
            ))
          )}
        </div>
        <button
          onClick={() => setLogs([])}
          className="mt-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Clear Logs
        </button>
      </div>

      {user && (
        <div className="mt-6 border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">User Data</h2>
          <pre className="text-xs overflow-auto bg-gray-100 p-4 rounded">
            {JSON.stringify(
              {
                user: {
                  id: user.id,
                  email: user.email,
                  confirmed: user.email_confirmed_at,
                  created: user.created_at,
                },
                session: session
                  ? {
                      expires_at: session.expires_at,
                      token_type: session.token_type,
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
      )}
    </div>
  );
}



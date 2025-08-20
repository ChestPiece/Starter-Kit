"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConfirmDebugPage() {
  const searchParams = useSearchParams();

  const params = {
    code: searchParams.get("code"),
    token_hash: searchParams.get("token_hash"),
    type: searchParams.get("type"),
    confirmed: searchParams.get("confirmed"),
    error: searchParams.get("error"),
  };

  const allParams = Array.from(searchParams.entries());

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Email Confirmation Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">
                Expected Parameters:
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">code:</span>
                  <span
                    className={params.code ? "text-green-600" : "text-red-600"}
                  >
                    {params.code || "missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">token_hash:</span>
                  <span
                    className={
                      params.token_hash ? "text-green-600" : "text-red-600"
                    }
                  >
                    {params.token_hash || "missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">type:</span>
                  <span
                    className={params.type ? "text-green-600" : "text-red-600"}
                  >
                    {params.type || "missing"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">confirmed:</span>
                  <span
                    className={
                      params.confirmed ? "text-green-600" : "text-gray-400"
                    }
                  >
                    {params.confirmed || "not set"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">
                All URL Parameters:
              </h3>
              <div className="bg-gray-50 p-3 rounded text-xs font-mono">
                {allParams.length > 0 ? (
                  <pre>
                    {JSON.stringify(Object.fromEntries(allParams), null, 2)}
                  </pre>
                ) : (
                  <span className="text-gray-500">No parameters found</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">
                Current URL:
              </h3>
              <div className="bg-gray-50 p-3 rounded text-xs font-mono break-all">
                {typeof window !== "undefined"
                  ? window.location.href
                  : "Loading..."}
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded">
              <h4 className="font-semibold text-sm text-blue-800 mb-2">
                Troubleshooting:
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  • Confirmation emails should contain either a `code` or
                  `token_hash` parameter
                </li>
                <li>• If you see this page, the email link may be malformed</li>
                <li>
                  • Try requesting a new confirmation email from the signup page
                </li>
                <li>• Check that your email client isn't breaking long URLs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Report {
  id: string;
  site_id: string;
  report_type: string;
  description?: string;
  country?: string;
  order_value_band?: string;
  status: string;
  created_at: string;
  site?: {
    domain: string;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error("Invalid password");
      }

      setAuthenticated(true);
      loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const response = await fetch("/api/admin/reports");
      if (!response.ok) throw new Error("Failed to load reports");
      const data = await response.json();
      setReports(data);
    } catch (err) {
      console.error("Error loading reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    try {
      const response = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId, status }),
      });

      if (!response.ok) throw new Error("Failed to update report");

      // Reload reports
      await loadReports();
      router.refresh();
    } catch (err) {
      console.error("Error updating report:", err);
      alert("Failed to update report status");
    }
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="mb-6 text-2xl font-bold">Admin Login</h1>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Moderation</h1>
          <button
            onClick={() => setAuthenticated(false)}
            className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            Logout
          </button>
        </div>

        {loadingReports ? (
          <div className="text-center text-gray-500">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
            No reports to review
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Report Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Country
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Order Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td className="whitespace-nowrap px-6 py-4">
                        <a
                          href={`/site/${encodeURIComponent(report.site?.domain || "")}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {report.site?.domain || "N/A"}
                        </a>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {report.report_type.replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {report.description || "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {report.country || "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {report.order_value_band || "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                          {report.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateReportStatus(report.id, "reviewed")}
                            className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200"
                          >
                            Reviewed
                          </button>
                          <button
                            onClick={() => updateReportStatus(report.id, "dismissed")}
                            className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-200"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => updateReportStatus(report.id, "confirmed")}
                            className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-200"
                          >
                            Confirm
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


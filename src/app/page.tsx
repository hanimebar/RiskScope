import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import RiskBadge from "@/components/RiskBadge";
import { supabase } from "@/lib/supabaseClient";
import type { Site } from "@/types";

async function getTopSites(): Promise<Site[]> {
  const { data, error } = await supabase
    .from("sites")
    .select("*")
    .order("risk_score", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching sites:", error);
    return [];
  }

  return data || [];
}

export default async function Home() {
  const topSites = await getTopSites();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <div className="mb-4 flex justify-center gap-4">
            <Link
              href="/claims/check"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Claim Checker
            </Link>
          </div>
          <h1 className="mb-4 text-5xl font-bold text-gray-900">
            Check a site's scam risk before you buy.
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
            RiskScope provides a risk score based on community reports and signals. This is a risk
            assessment tool, not a legal verdict. Always do your own research before making
            purchases.
          </p>
          <div className="flex justify-center">
            <SearchBar />
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-2xl font-semibold">Highest Risk Sites</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Domain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Risk Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Reports
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Last Checked
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {topSites.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No sites found. Be the first to check a domain!
                    </td>
                  </tr>
                ) : (
                  topSites.map((site) => (
                    <tr
                      key={site.id}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <Link
                          href={`/site/${encodeURIComponent(site.domain)}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {site.domain}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <RiskBadge score={site.risk_score} level={site.risk_level} size="sm" />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        <span className="capitalize">{site.risk_level}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {site.total_reports}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {site.last_checked_at
                          ? new Date(site.last_checked_at).toLocaleDateString()
                          : "Never"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


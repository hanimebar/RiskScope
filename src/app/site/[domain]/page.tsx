import { notFound } from "next/navigation";
import Link from "next/link";
import RiskBadge from "@/components/RiskBadge";
import ReportForm from "@/components/ReportForm";
import { supabase } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeDomain } from "@/lib/domainUtils";
import { calculateRiskScore } from "@/lib/riskScore";
import type { Site, RiskSignal, UserReport } from "@/types";

async function getOrCreateSite(domain: string, normalizedDomain: string): Promise<Site> {
  // Try to find existing site
  const { data: existingSite } = await supabase
    .from("sites")
    .select("*")
    .eq("normalized_domain", normalizedDomain)
    .single();

  if (existingSite) {
    return existingSite;
  }

  // Create new site
  const { data: newSite, error } = await supabase
    .from("sites")
    .insert({
      domain,
      normalized_domain: normalizedDomain,
      risk_score: 0,
      risk_level: "low",
      total_signals: 0,
      total_reports: 0,
    })
    .select()
    .single();

  if (error || !newSite) {
    throw new Error("Failed to create site");
  }

  return newSite;
}

async function getSiteData(siteId: string) {
  const [siteResult, signalsResult, reportsResult] = await Promise.all([
    supabase.from("sites").select("*").eq("id", siteId).single(),
    supabase.from("risk_signals").select("*").eq("site_id", siteId).order("created_at", { ascending: false }),
    supabase
      .from("user_reports")
      .select("id, site_id, report_type, description, country, order_value_band, has_evidence, status, created_at")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (siteResult.error || !siteResult.data) {
    throw new Error("Failed to fetch site");
  }

  const site = siteResult.data;
  const signals = signalsResult.data || [];
  const reports = reportsResult.data || [];

  // Calculate risk score
  const { score, level } = calculateRiskScore(signals);

  // Update site if score/level changed (requires admin client to bypass RLS)
  if (score !== site.risk_score || level !== site.risk_level) {
    await supabaseAdmin
      .from("sites")
      .update({
        risk_score: score,
        risk_level: level,
        total_signals: signals.length,
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", siteId);
  }

  return {
    site: { ...site, risk_score: score, risk_level: level, total_signals: signals.length },
    signals,
    reports,
  };
}

function groupSignalsByDimension(signals: RiskSignal[]): Record<string, RiskSignal[]> {
  return signals.reduce((acc, signal) => {
    const dim = signal.dimension || "other";
    if (!acc[dim]) {
      acc[dim] = [];
    }
    acc[dim].push(signal);
    return acc;
  }, {} as Record<string, RiskSignal[]>);
}

export default async function SitePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const decodedDomain = decodeURIComponent(domain);
  const normalizedDomain = normalizeDomain(decodedDomain);

  try {
    const site = await getOrCreateSite(decodedDomain, normalizedDomain);
    const { site: updatedSite, signals, reports } = await getSiteData(site.id);

    const groupedSignals = groupSignalsByDimension(signals);

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Link
            href="/"
            className="mb-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← Back to home
          </Link>

          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h1 className="mb-4 text-4xl font-bold text-gray-900">{updatedSite.domain}</h1>
              <div className="flex items-center gap-4">
                <RiskBadge score={updatedSite.risk_score} level={updatedSite.risk_level} size="lg" />
                <div className="text-sm text-gray-600">
                  <p>Total Signals: {updatedSite.total_signals}</p>
                  <p>Total Reports: {updatedSite.total_reports}</p>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-semibold">Disclaimer:</p>
              <p>
                This risk score is based on community reports and automated signals. It is a risk
                assessment tool, not a legal verdict. Always conduct your own research and
                exercise caution when making purchases online.
              </p>
            </div>
          </div>

          {/* Risk Signals by Dimension */}
          {signals.length > 0 && (
            <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-semibold">Risk Signals</h2>
              <div className="space-y-6">
                {Object.entries(groupedSignals).map(([dimension, dimSignals]) => (
                  <div key={dimension}>
                    <h3 className="mb-2 text-lg font-medium capitalize text-gray-700">
                      {dimension}
                    </h3>
                    <div className="space-y-2">
                      {dimSignals.map((signal) => (
                        <div
                          key={signal.id}
                          className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{signal.type}</p>
                              {signal.description && (
                                <p className="mt-1 text-sm text-gray-600">{signal.description}</p>
                              )}
                              <p className="mt-1 text-xs text-gray-500">
                                Source: {signal.source} • Severity: {signal.severity}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Latest Reports */}
          {reports.length > 0 && (
            <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-semibold">Latest Reports</h2>
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                          {report.report_type.replace(/_/g, " ")}
                        </span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                          {report.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {report.description && (
                      <p className="mb-2 text-sm text-gray-700">{report.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      {report.country && <span>Country: {report.country}</span>}
                      {report.order_value_band && (
                        <span>Order Value: {report.order_value_band}</span>
                      )}
                      {report.has_evidence && (
                        <span className="text-green-600">Has Evidence</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report Form */}
          <ReportForm siteId={updatedSite.id} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading site:", error);
    notFound();
  }
}


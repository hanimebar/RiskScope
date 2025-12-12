'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ClaimCheckResponse {
  product: {
    id: string;
    name: string;
    primaryUrl: string | null;
    iosAppId: string | null;
    androidPackage: string | null;
  };
  claim: {
    id: string;
    claimType: string;
    claimedValue: number;
    currency: string;
    timeframeText: string | null;
    sourceUrl: string | null;
  };
  assessment: {
    verdict: 'verified' | 'plausible' | 'unlikely' | 'no_evidence';
    confidence: number;
    maxPlausibleEstimate: number | null;
    notes: string;
  };
  metrics: Array<{
    source: string;
    metricName: string;
    metricValue: number;
    isVerified?: boolean;
  }>;
  verification: {
    hasVerifiedRevenue: boolean;
    hasStoreMetrics: boolean;
    verifiedRevenue: number | null;
  };
}

const verdictColors = {
  verified: 'bg-green-100 text-green-800 border-green-300',
  plausible: 'bg-blue-100 text-blue-800 border-blue-300',
  unlikely: 'bg-red-100 text-red-800 border-red-300',
  no_evidence: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function ClaimCheckPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimCheckResponse | null>(null);
  const [formData, setFormData] = useState({
    appName: '',
    iosAppId: '',
    androidPackage: '',
    claimedValue: '',
    currency: 'USD',
    sourceUrl: '',
    timeframeText: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/claims/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: formData.appName || undefined,
          iosAppId: formData.iosAppId || undefined,
          androidPackage: formData.androidPackage || undefined,
          claimedValue: Number(formData.claimedValue),
          currency: formData.currency,
          sourceUrl: formData.sourceUrl || undefined,
          timeframeText: formData.timeframeText || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to check claim');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/"
          className="mb-4 inline-block text-blue-600 hover:text-blue-800"
        >
          ← Back to home
        </Link>

        <h1 className="mb-8 text-4xl font-bold text-gray-900">Claim Checker</h1>
        <p className="mb-8 text-gray-600">
          Evaluate revenue claims about mobile apps based on App Store and Play Store metrics.
        </p>

        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-semibold">Check a Claim</h2>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="appName" className="block text-sm font-medium text-gray-700">
                App Name *
              </label>
              <input
                type="text"
                id="appName"
                value={formData.appName}
                onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="iosAppId" className="block text-sm font-medium text-gray-700">
                  iOS App ID
                </label>
                <input
                  type="text"
                  id="iosAppId"
                  value={formData.iosAppId}
                  onChange={(e) => setFormData({ ...formData, iosAppId: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g. 1234567890"
                />
              </div>

              <div>
                <label htmlFor="androidPackage" className="block text-sm font-medium text-gray-700">
                  Android Package
                </label>
                <input
                  type="text"
                  id="androidPackage"
                  value={formData.androidPackage}
                  onChange={(e) => setFormData({ ...formData, androidPackage: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="e.g. com.example.app"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="claimedValue" className="block text-sm font-medium text-gray-700">
                  Claimed Monthly Revenue *
                </label>
                <input
                  type="number"
                  id="claimedValue"
                  step="0.01"
                  min="0"
                  value={formData.claimedValue}
                  onChange={(e) => setFormData({ ...formData, claimedValue: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700">
                Source URL (optional)
              </label>
              <input
                type="url"
                id="sourceUrl"
                value={formData.sourceUrl}
                onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="https://twitter.com/..."
              />
            </div>

            <div>
              <label htmlFor="timeframeText" className="block text-sm font-medium text-gray-700">
                Timeframe (optional)
              </label>
              <input
                type="text"
                id="timeframeText"
                value={formData.timeframeText}
                onChange={(e) => setFormData({ ...formData, timeframeText: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="e.g. per month, after 3 months"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
            >
              {loading ? 'Checking...' : 'Check Claim'}
            </button>
          </form>
        </div>

        {result && (
          <div className="space-y-6">
            {/* Product Info */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-semibold">Product</h2>
              <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{result.product.name}</dd>
                </div>
                {result.product.iosAppId && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">iOS App ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{result.product.iosAppId}</dd>
                  </div>
                )}
                {result.product.androidPackage && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Android Package</dt>
                    <dd className="mt-1 text-sm text-gray-900">{result.product.androidPackage}</dd>
                  </div>
                )}
                {result.product.primaryUrl && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Primary URL</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a
                        href={result.product.primaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {result.product.primaryUrl}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Claim Info */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-semibold">Claim</h2>
              <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Claimed Value</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {result.claim.currency} {result.claim.claimedValue.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{result.claim.claimType}</dd>
                </div>
                {result.claim.timeframeText && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Timeframe</dt>
                    <dd className="mt-1 text-sm text-gray-900">{result.claim.timeframeText}</dd>
                  </div>
                )}
                {result.claim.sourceUrl && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Source</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a
                        href={result.claim.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {result.claim.sourceUrl}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Assessment */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-semibold">Assessment</h2>
              
              {/* Verification Status Badge */}
              <div className="mb-4">
                {result.verification.hasVerifiedRevenue ? (
                  <div className="mb-3 rounded-lg bg-green-50 border border-green-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white">
                        ✓ Verified
                      </span>
                      <span className="text-sm font-medium text-green-800">Payment Data (Stripe)</span>
                    </div>
                    {result.verification.verifiedRevenue !== null && (
                      <p className="text-sm text-green-700">
                        Verified 30-day revenue: <span className="font-semibold">{result.claim.currency} {result.verification.verifiedRevenue.toLocaleString()}</span>
                      </p>
                    )}
                  </div>
                ) : result.verification.hasStoreMetrics ? (
                  <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                        📊 Estimate
                      </span>
                      <span className="text-sm font-medium text-blue-800">Store-based estimates only</span>
                    </div>
                    <p className="mt-1 text-xs text-blue-700">
                      Assessment based on app store metrics (downloads, ratings, price). Not verified with payment data.
                    </p>
                  </div>
                ) : (
                  <div className="mb-3 rounded-lg bg-gray-50 border border-gray-200 p-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-gray-500 px-3 py-1 text-xs font-semibold text-white">
                        ⚠️ No Data
                      </span>
                      <span className="text-sm font-medium text-gray-800">No metrics available yet</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-700">
                      No app store or payment metrics found for this product yet. Run enrichment workers to populate data.
                    </p>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <span
                  className={`inline-flex items-center rounded-lg border px-4 py-2 font-semibold capitalize ${verdictColors[result.assessment.verdict]}`}
                >
                  {result.assessment.verdict}
                </span>
                <span className="ml-4 text-sm text-gray-600">
                  Confidence: {(result.assessment.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mb-4 text-gray-700">{result.assessment.notes}</p>
              {result.assessment.maxPlausibleEstimate !== null && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-700">
                    {result.verification.hasVerifiedRevenue ? 'Verified Revenue' : 'Maximum Plausible Estimate'}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {result.claim.currency}{' '}
                    {result.assessment.maxPlausibleEstimate.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                    /month
                  </p>
                </div>
              )}
            </div>

            {/* Metrics */}
            {result.metrics.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Metrics Used</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Source
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Metric
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {result.metrics.map((metric, idx) => (
                        <tr key={idx}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {metric.source}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {metric.metricName.replace(/_/g, ' ')}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {metric.metricValue.toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            {metric.isVerified ? (
                              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                                ✓ Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                                Estimate
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


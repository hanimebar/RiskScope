"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReportFormProps {
  siteId: string;
}

export default function ReportForm({ siteId }: ReportFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    report_type: "",
    country: "",
    order_value_band: "",
    description: "",
    contact_email: "",
    has_evidence: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          ...formData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit report");
      }

      setSuccess(true);
      setFormData({
        report_type: "",
        country: "",
        order_value_band: "",
        description: "",
        contact_email: "",
        has_evidence: false,
      });

      // Refresh the page after a short delay
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-xl font-semibold">Report an Issue</h3>
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-green-800">
          Report submitted successfully! Thank you for helping keep others safe.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="report_type" className="block text-sm font-medium text-gray-700">
            Report Type *
          </label>
          <select
            id="report_type"
            required
            value={formData.report_type}
            onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Select a type</option>
            <option value="non_delivery">Non-delivery</option>
            <option value="poor_quality">Poor Quality</option>
            <option value="refund_refused">Refund Refused</option>
            <option value="fraud">Fraud</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700">
            Country
          </label>
          <input
            type="text"
            id="country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <label htmlFor="order_value_band" className="block text-sm font-medium text-gray-700">
            Order Value Band
          </label>
          <select
            id="order_value_band"
            value={formData.order_value_band}
            onChange={(e) => setFormData({ ...formData, order_value_band: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Select a range</option>
            <option value="<50">Less than $50</option>
            <option value="50-200">$50 - $200</option>
            <option value="200-1000">$200 - $1,000</option>
            <option value="1000+">$1,000+</option>
          </select>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description *
          </label>
          <textarea
            id="description"
            required
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Describe what happened..."
          />
        </div>

        <div>
          <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
            Contact Email (optional)
          </label>
          <input
            type="email"
            id="contact_email"
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="has_evidence"
            checked={formData.has_evidence}
            onChange={(e) => setFormData({ ...formData, has_evidence: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="has_evidence" className="ml-2 text-sm text-gray-700">
            I have evidence (screenshots, emails, etc.)
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
        >
          {loading ? "Submitting..." : "Submit Report"}
        </button>
      </form>
    </div>
  );
}


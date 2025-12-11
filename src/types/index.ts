export interface Site {
  id: string;
  domain: string;
  normalized_domain: string;
  category?: string;
  country?: string;
  first_seen_at: string;
  last_checked_at?: string;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  total_signals: number;
  total_reports: number;
  manual_legit: boolean;
  manual_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RiskSignal {
  id: string;
  site_id: string;
  type: string;
  dimension: string;
  severity: number;
  source: string;
  description?: string;
  created_at: string;
}

export interface UserReport {
  id: string;
  site_id: string;
  report_type: string;
  description?: string;
  country?: string;
  order_value_band?: string;
  has_evidence: boolean;
  contact_email?: string;
  status: string;
  created_at: string;
}


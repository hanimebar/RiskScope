export interface Product {
  id: string;
  name: string;
  type: string;
  primary_url?: string;
  ios_app_id?: string;
  android_package?: string;
  created_at: string;
  updated_at: string;
}

export interface Claim {
  id: string;
  product_id: string;
  source_url?: string;
  claim_type: string;
  claimed_value: number;
  currency: string;
  timeframe_text?: string;
  raw_text?: string;
  status: 'new' | 'analyzed';
  created_at: string;
}

export interface VerificationMetric {
  id: string;
  product_id: string;
  source: string;
  metric_name: string;
  metric_value: number;
  extra?: Record<string, any>;
  captured_at: string;
}

export interface ClaimAssessment {
  id: string;
  claim_id: string;
  assessment_type: string;
  verdict: 'verified' | 'plausible' | 'unlikely' | 'no_evidence';
  confidence: number;
  max_plausible_estimate?: number;
  notes?: string;
  created_at: string;
}

export interface AppStoreMetrics {
  downloads_lifetime?: number;
  downloads_30d?: number;
  rating_count?: number;
  avg_rating?: number;
  price?: number;
  revenue_estimate?: number;
}


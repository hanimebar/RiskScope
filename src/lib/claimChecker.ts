// src/lib/claimChecker.ts
import { supabaseAdmin } from './supabaseAdmin';

type ClaimInput = {
  appName?: string;
  primaryUrl?: string;
  iosAppId?: string;
  androidPackage?: string;
  claimedValue: number | string;
  currency?: string;
  claimType?: 'mrr' | 'monthly_income';
  timeframeText?: string;
  sourceUrl?: string;
};

export async function runClaimCheck(input: ClaimInput) {
  console.log('runClaimCheck input:', input);

  const numericClaimedValue = Number(input.claimedValue);

  if (!Number.isFinite(numericClaimedValue) || numericClaimedValue <= 0) {
    throw new Error('claimedValue must be a positive number');
  }

  const {
    appName,
    primaryUrl,
    iosAppId,
    androidPackage,
    currency = 'USD',
    claimType = 'mrr',
    timeframeText,
    sourceUrl,
  } = input;

  // 1) Upsert product by ios_app_id / android_package / primary_url
  let product: any = null;

  if (iosAppId) {
    const { data } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('ios_app_id', iosAppId)
      .maybeSingle();
    if (data) product = data;
  }

  if (!product && androidPackage) {
    const { data } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('android_package', androidPackage)
      .maybeSingle();
    if (data) product = data;
  }

  if (!product && primaryUrl) {
    const { data } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('primary_url', primaryUrl)
      .maybeSingle();
    if (data) product = data;
  }

  const name = appName || iosAppId || androidPackage || primaryUrl || 'Unknown app';

  if (!product) {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name,
        type: 'mobile_app',
        primary_url: primaryUrl ?? null,
        ios_app_id: iosAppId ?? null,
        android_package: androidPackage ?? null,
      })
      .select('*')
      .single();

    if (error) throw error;
    product = data;
  }

  // 2) Create claim
  const { data: claim, error: claimError } = await supabaseAdmin
    .from('claims')
    .insert({
      product_id: product.id,
      source_url: sourceUrl ?? null,
      claim_type: claimType,
      claimed_value: numericClaimedValue,
      currency,
      timeframe_text: timeframeText ?? null,
      raw_text: null,
      status: 'new',
    })
    .select('*')
    .single();

  if (claimError) throw claimError;

  // 3) Load metrics from Supabase
  const { data: metrics, error: metricsError } = await supabaseAdmin
    .from('verification_metrics')
    .select('*')
    .eq('product_id', product.id);

  if (metricsError) throw metricsError;

  // 4) Build metrics map
  const metricsMap = new Map<string, number>();
  let hasVerifiedRevenue = false;
  let verifiedRevenue30d = 0;

  for (const m of metrics ?? []) {
    const key = `${m.source}:${m.metric_name}`;
    metricsMap.set(key, m.metric_value);

    if (m.metric_name === 'revenue_30d_verified' && m.is_verified) {
      hasVerifiedRevenue = true;
      verifiedRevenue30d = m.metric_value;
    }
  }

  // 5) Extract store-based estimates
  const downloadsLifetime =
    metricsMap.get('android_store:downloads_lifetime') ??
    metricsMap.get('ios_store:downloads_lifetime') ??
    0;

  const priceUsd =
    metricsMap.get('android_store:price_usd') ??
    metricsMap.get('ios_store:price_usd') ??
    0;

  // 6) Assessment logic
  let maxPlausibleEstimate: number | null = null;
  let verdict: 'verified' | 'plausible' | 'unlikely' | 'no_evidence' = 'no_evidence';
  let confidence = 0.2;
  let notes = 'No app store or payment metrics found for this product yet. Run enrichment workers to populate data.';

  // Check if we have verified revenue
  if (hasVerifiedRevenue && verifiedRevenue30d > 0) {
    const verifiedMonthlyEstimate = verifiedRevenue30d; // Already 30-day revenue
    const ratio = numericClaimedValue / verifiedMonthlyEstimate;
    
    if (ratio >= 0.95 && ratio <= 1.05) {
      verdict = 'verified';
      confidence = 0.95;
      notes = `Claimed revenue ($${numericClaimedValue.toLocaleString()}) matches verified 30-day revenue ($${verifiedMonthlyEstimate.toLocaleString()}).`;
      maxPlausibleEstimate = verifiedMonthlyEstimate;
    } else if (ratio >= 0.8 && ratio < 0.95) {
      verdict = 'plausible';
      confidence = 0.85;
      notes = `Claimed revenue ($${numericClaimedValue.toLocaleString()}) is slightly below verified 30-day revenue ($${verifiedMonthlyEstimate.toLocaleString()}), which is plausible.`;
      maxPlausibleEstimate = verifiedMonthlyEstimate;
    } else if (ratio > 1.05 && ratio <= 1.2) {
      verdict = 'plausible';
      confidence = 0.8;
      notes = `Claimed revenue ($${numericClaimedValue.toLocaleString()}) is slightly above verified 30-day revenue ($${verifiedMonthlyEstimate.toLocaleString()}), which could be plausible with additional revenue streams.`;
      maxPlausibleEstimate = verifiedMonthlyEstimate;
    } else {
      verdict = 'unlikely';
      confidence = 0.9;
      notes = `Claimed revenue ($${numericClaimedValue.toLocaleString()}) significantly differs from verified 30-day revenue ($${verifiedMonthlyEstimate.toLocaleString()}).`;
      maxPlausibleEstimate = verifiedMonthlyEstimate;
    }
  } else if (downloadsLifetime > 0 && priceUsd > 0) {
    // Fall back to store-based estimates
    const est = (downloadsLifetime * 0.05 * priceUsd) / 3; // rough estimate
    maxPlausibleEstimate = est;

    if (numericClaimedValue <= est * 0.5) {
      verdict = 'plausible';
      confidence = 0.7;
      notes = `Based on ~${downloadsLifetime.toLocaleString()} lifetime downloads and price ~$${priceUsd}, a rough upper bound monthly revenue is about $${est.toFixed(
        0
      )}. The claim is below that, so it seems plausible.`;
    } else if (numericClaimedValue > est * 2) {
      verdict = 'unlikely';
      confidence = 0.8;
      notes = `Based on ~${downloadsLifetime.toLocaleString()} lifetime downloads and price ~$${priceUsd}, a rough upper bound monthly revenue is about $${est.toFixed(
        0
      )}. The claim ($${numericClaimedValue.toLocaleString()}) is far above that, so it looks unlikely.`;
    } else {
      verdict = 'plausible';
      confidence = 0.5;
      notes = `The claim is in the same ballpark as a rough estimate based on downloads and price, but the data is noisy.`;
    }
  } else if (metrics && metrics.length === 0) {
    // No metrics at all
    verdict = 'no_evidence';
    confidence = 0.2;
    notes = 'No app store or payment metrics found for this product yet. Run enrichment workers to populate data.';
  }

  const { data: assessment, error: assessError } = await supabaseAdmin
    .from('claim_assessments')
    .insert({
      claim_id: claim.id,
      assessment_type: 'plausibility',
      verdict,
      confidence,
      max_plausible_estimate: maxPlausibleEstimate,
      notes,
    })
    .select('*')
    .single();

  if (assessError) throw assessError;

  // Determine what type of metrics we have
  const hasStoreMetrics = downloadsLifetime > 0 || priceUsd > 0 || (metrics && metrics.some(m => !m.is_verified));
  const verifiedRevenue = hasVerifiedRevenue ? verifiedRevenue30d : null;

  return {
    product: {
      id: product.id,
      name: product.name,
      primaryUrl: product.primary_url,
      iosAppId: product.ios_app_id,
      androidPackage: product.android_package,
    },
    claim: {
      id: claim.id,
      claimType: claim.claim_type,
      claimedValue: claim.claimed_value,
      currency: claim.currency,
      timeframeText: claim.timeframe_text,
      sourceUrl: claim.source_url,
    },
    assessment: {
      verdict: assessment.verdict,
      confidence: assessment.confidence,
      maxPlausibleEstimate: assessment.max_plausible_estimate,
      notes: assessment.notes,
    },
    metrics: (metrics || []).map((m) => ({
      source: m.source,
      metricName: m.metric_name,
      metricValue: m.metric_value,
      isVerified: m.is_verified || false,
    })),
    verification: {
      hasVerifiedRevenue,
      hasStoreMetrics,
      verifiedRevenue,
    },
  };
}


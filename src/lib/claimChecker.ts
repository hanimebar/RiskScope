// src/lib/claimChecker.ts
import { supabaseAdmin } from './supabaseAdmin';
import { fetchStoreMetrics, StoreMetrics } from './storeMetricsAdapter';

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

  // 3) Fetch metrics (dummy for now)
  const storeMetrics: StoreMetrics = await fetchStoreMetrics({ iosAppId, androidPackage });

  const metricsToInsert: Array<{
    product_id: string;
    source: string;
    metric_name: string;
    metric_value: number;
  }> = [];

  const source = iosAppId ? 'ios_store' : androidPackage ? 'android_store' : 'store_unknown';

  if (storeMetrics.downloadsLifetime != null) {
    metricsToInsert.push({
      product_id: product.id,
      source,
      metric_name: 'downloads_lifetime',
      metric_value: storeMetrics.downloadsLifetime,
    });
  }
  if (storeMetrics.downloads30d != null) {
    metricsToInsert.push({
      product_id: product.id,
      source,
      metric_name: 'downloads_30d',
      metric_value: storeMetrics.downloads30d,
    });
  }
  if (storeMetrics.ratingCount != null) {
    metricsToInsert.push({
      product_id: product.id,
      source,
      metric_name: 'rating_count',
      metric_value: storeMetrics.ratingCount,
    });
  }
  if (storeMetrics.avgRating != null) {
    metricsToInsert.push({
      product_id: product.id,
      source,
      metric_name: 'avg_rating',
      metric_value: storeMetrics.avgRating,
    });
  }
  if (storeMetrics.priceUsd != null) {
    metricsToInsert.push({
      product_id: product.id,
      source,
      metric_name: 'price_usd',
      metric_value: storeMetrics.priceUsd,
    });
  }

  if (metricsToInsert.length > 0) {
    const { error: vmError } = await supabaseAdmin
      .from('verification_metrics')
      .insert(metricsToInsert);
    if (vmError) throw vmError;
  }

  // 4) Simple plausibility assessment
  const downloadsLifetime = storeMetrics.downloadsLifetime ?? 0;
  const priceUsd = storeMetrics.priceUsd ?? 0;

  let maxPlausibleEstimate: number | null = null;
  let verdict: 'verified' | 'plausible' | 'unlikely' | 'no_evidence' = 'no_evidence';
  let confidence = 0.3;
  let notes = 'Not enough data to make a strong call.';

  if (downloadsLifetime > 0 && priceUsd > 0) {
    const est = (downloadsLifetime * 0.05 * priceUsd) / 3; // rough as hell
    maxPlausibleEstimate = est;

    if (numericClaimedValue <= est * 0.5) {
      verdict = 'plausible';
      confidence = 0.7;
      notes = `Based on ~${downloadsLifetime} lifetime downloads and price ~$${priceUsd}, a rough upper bound monthly revenue is about $${est.toFixed(
        0
      )}. The claim is below that, so it seems plausible.`;
    } else if (numericClaimedValue > est * 2) {
      verdict = 'unlikely';
      confidence = 0.8;
      notes = `Based on ~${downloadsLifetime} lifetime downloads and price ~$${priceUsd}, a rough upper bound monthly revenue is about $${est.toFixed(
        0
      )}. The claim ($${numericClaimedValue}) is far above that, so it looks unlikely.`;
    } else {
      verdict = 'plausible';
      confidence = 0.5;
      notes = `The claim is in the same ballpark as a rough estimate based on downloads and price, but the data is noisy.`;
    }
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
    metrics: metricsToInsert.map((m) => ({
      source: m.source,
      metricName: m.metric_name,
      metricValue: m.metric_value,
    })),
  };
}


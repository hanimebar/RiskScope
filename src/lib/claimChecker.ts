import { supabaseAdmin } from './supabaseAdmin';
import { fetchStoreMetrics, type StoreMetrics } from './storeMetricsAdapter';
import type {
  Product,
  Claim,
  VerificationMetric,
  ClaimAssessment,
} from '@/types/claims';

interface ProductInput {
  name?: string;
  primaryUrl?: string;
  iosAppId?: string;
  androidPackage?: string;
}

interface ClaimPayload {
  claimType: string;
  claimedValue: number;
  currency?: string;
  timeframeText?: string;
  sourceUrl?: string;
  rawText?: string;
}

interface VerificationMetricInput {
  source: string;
  metricName: string;
  metricValue: number;
  extra?: Record<string, any>;
}

interface AssessmentResult {
  verdict: 'verified' | 'plausible' | 'unlikely' | 'no_evidence';
  confidence: number;
  maxPlausibleEstimate: number | null;
  notes: string;
}

interface ClaimCheckResult {
  product: Product;
  claim: Claim;
  assessment: ClaimAssessment;
  metrics: VerificationMetric[];
}

/**
 * Upsert a product from user input
 */
export async function upsertProductFromInput(
  input: ProductInput
): Promise<Product> {
  const { name, primaryUrl, iosAppId, androidPackage } = input;

  // Try to find existing product by iOS app ID or Android package
  let existingProduct: Product | null = null;

  if (iosAppId) {
    const { data } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('ios_app_id', iosAppId)
      .single();
    if (data) existingProduct = data as Product;
  }

  if (!existingProduct && androidPackage) {
    const { data } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('android_package', androidPackage)
      .single();
    if (data) existingProduct = data as Product;
  }

  if (existingProduct) {
    // Update existing product
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({
        name: name || existingProduct.name,
        primary_url: primaryUrl || existingProduct.primary_url,
        ios_app_id: iosAppId || existingProduct.ios_app_id,
        android_package: androidPackage || existingProduct.android_package,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingProduct.id)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  }

  // Create new product
  if (!name) {
    throw new Error('Product name is required when creating a new product');
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({
      name,
      type: 'mobile_app',
      primary_url: primaryUrl,
      ios_app_id: iosAppId,
      android_package: androidPackage,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Product;
}

/**
 * Create a claim row
 */
export async function createClaim(
  productId: string,
  payload: ClaimPayload
): Promise<Claim> {
  const {
    claimType,
    claimedValue,
    currency = 'USD',
    timeframeText,
    sourceUrl,
    rawText,
  } = payload;

  const { data, error } = await supabaseAdmin
    .from('claims')
    .insert({
      product_id: productId,
      source_url: sourceUrl,
      claim_type: claimType,
      claimed_value: claimedValue,
      currency,
      timeframe_text: timeframeText,
      raw_text: rawText,
      status: 'new',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Claim;
}

/**
 * Fetch metrics for a product using the store metrics adapter
 */
export async function fetchMetricsForProduct(
  product: Product
): Promise<VerificationMetricInput[]> {
  const metrics: VerificationMetricInput[] = [];

  // Fetch store metrics
  const storeMetrics = await fetchStoreMetrics({
    iosAppId: product.ios_app_id || undefined,
    androidPackage: product.android_package || undefined,
  });

  // Convert to metric inputs
  const source = product.ios_app_id ? 'ios_store' : 'android_store';

  if (storeMetrics.downloadsLifetime !== undefined) {
    metrics.push({
      source,
      metricName: 'downloads_lifetime',
      metricValue: storeMetrics.downloadsLifetime,
    });
  }

  if (storeMetrics.downloads30d !== undefined) {
    metrics.push({
      source,
      metricName: 'downloads_30d',
      metricValue: storeMetrics.downloads30d,
    });
  }

  if (storeMetrics.ratingCount !== undefined) {
    metrics.push({
      source,
      metricName: 'rating_count',
      metricValue: storeMetrics.ratingCount,
    });
  }

  if (storeMetrics.avgRating !== undefined) {
    metrics.push({
      source,
      metricName: 'avg_rating',
      metricValue: storeMetrics.avgRating,
    });
  }

  if (storeMetrics.priceUsd !== undefined) {
    metrics.push({
      source,
      metricName: 'price',
      metricValue: storeMetrics.priceUsd,
    });
  }

  return metrics;
}

/**
 * Assess a claim based on metrics
 * Simple heuristic implementation
 */
export async function assessClaim(
  claim: Claim,
  metrics: VerificationMetricInput[]
): Promise<AssessmentResult> {
  // If there are no metrics at all → verdict = 'no_evidence', confidence = 0.3
  if (metrics.length === 0) {
    return {
      verdict: 'no_evidence',
      confidence: 0.3,
      maxPlausibleEstimate: null,
      notes: 'No metrics available to assess this claim.',
    };
  }

  // Extract relevant metrics
  const downloadsLifetime = metrics.find(m => m.metricName === 'downloads_lifetime')?.metricValue;
  const priceUsd = metrics.find(m => m.metricName === 'price')?.metricValue || 0;

  // Estimate max plausible monthly revenue
  // If we have downloadsLifetime, priceUsd, and it looks like a one-time purchase app:
  // assume 5% conversion from download to paid user
  // max monthly revenue ≈ (downloadsLifetime * 0.05 * priceUsd) / lifetime_months_estimate
  // For MVP, just use downloadsLifetime * 0.05 * priceUsd / 3 as a crude 3-month window
  let maxPlausibleEstimate: number | null = null;

  if (downloadsLifetime && priceUsd > 0) {
    // One-time purchase app
    maxPlausibleEstimate = (downloadsLifetime * 0.05 * priceUsd) / 3;
  } else if (downloadsLifetime) {
    // Free app with IAP/ads - rough estimate: $2 per active user per month
    const activeUsers = downloadsLifetime * 0.1; // 10% active users
    maxPlausibleEstimate = activeUsers * 2 / 3; // Rough monthly estimate
  }

  const claimedValue = claim.claimed_value;

  // Determine verdict
  let verdict: 'verified' | 'plausible' | 'unlikely' | 'no_evidence';
  let confidence: number;
  let notes: string;

  if (!maxPlausibleEstimate || maxPlausibleEstimate === 0) {
    verdict = 'no_evidence';
    confidence = 0.3;
    notes = 'Unable to estimate plausible revenue from available metrics.';
  } else if (claimedValue <= 0.5 * maxPlausibleEstimate) {
    verdict = 'plausible';
    confidence = 0.7;
    notes = `Claimed revenue ($${claimedValue.toLocaleString()}/month) is lower than estimated maximum ($${maxPlausibleEstimate.toLocaleString()}/month), which is plausible.`;
  } else if (claimedValue > 2 * maxPlausibleEstimate) {
    verdict = 'unlikely';
    confidence = 0.75;
    notes = `Claimed revenue ($${claimedValue.toLocaleString()}/month) is significantly higher than estimated maximum ($${maxPlausibleEstimate.toLocaleString()}/month) based on available metrics.`;
  } else {
    verdict = 'plausible';
    confidence = 0.65;
    notes = `Claimed revenue ($${claimedValue.toLocaleString()}/month) is within plausible range compared to estimated maximum ($${maxPlausibleEstimate.toLocaleString()}/month).`;
  }

  return {
    verdict,
    confidence,
    maxPlausibleEstimate,
    notes,
  };
}

/**
 * Orchestration function: complete claim check workflow
 */
export async function runClaimCheck(
  productInput: ProductInput,
  claimPayload: ClaimPayload
): Promise<ClaimCheckResult> {
  // 1. Upsert product
  const product = await upsertProductFromInput(productInput);

  // 2. Create claim
  const claim = await createClaim(product.id, claimPayload);

  // 3. Fetch metrics
  const metricInputs = await fetchMetricsForProduct(product);

  // 4. Compute assessment
  const assessmentResult = await assessClaim(claim, metricInputs);

  // 5. Persist verification_metrics
  if (metricInputs.length > 0) {
    const metricsToInsert = metricInputs.map(m => ({
      product_id: product.id,
      source: m.source,
      metric_name: m.metricName,
      metric_value: m.metricValue,
      extra: m.extra || {},
      captured_at: new Date().toISOString(),
    }));

    const { error: metricsError } = await supabaseAdmin
      .from('verification_metrics')
      .insert(metricsToInsert);

    if (metricsError) throw metricsError;
  }

  // 6. Persist claim_assessment
  const { data: assessmentData, error: assessmentError } = await supabaseAdmin
    .from('claim_assessments')
    .insert({
      claim_id: claim.id,
      assessment_type: 'plausibility',
      verdict: assessmentResult.verdict,
      confidence: assessmentResult.confidence,
      max_plausible_estimate: assessmentResult.maxPlausibleEstimate,
      notes: assessmentResult.notes,
    })
    .select()
    .single();

  if (assessmentError) throw assessmentError;

  // 7. Update claim status
  await supabaseAdmin
    .from('claims')
    .update({ status: 'analyzed' })
    .eq('id', claim.id);

  // 8. Fetch stored metrics for response
  const { data: storedMetrics } = await supabaseAdmin
    .from('verification_metrics')
    .select('*')
    .eq('product_id', product.id)
    .order('captured_at', { ascending: false });

  return {
    product,
    claim,
    assessment: assessmentData as ClaimAssessment,
    metrics: (storedMetrics || []) as VerificationMetric[],
  };
}

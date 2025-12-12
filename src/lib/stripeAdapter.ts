/**
 * Stripe integration adapter
 * For now, uses explicit mapping (product_id -> Stripe account/API key)
 * Future: Full OAuth Connect flow
 */

import { supabaseAdmin } from './supabaseAdmin';

export interface StripeMetrics {
  mrr: number; // Monthly Recurring Revenue
  currency: string;
  verifiedAt: string;
}

/**
 * Fetch verified metrics from Stripe
 * Requires explicit mapping in database (products.stripe_account_id or similar)
 */
export async function fetchStripeMetrics(productId: string): Promise<StripeMetrics | null> {
  // Check if product has Stripe mapping
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (!product) return null;

  // For now, check for stripe_account_id in extra JSON field or separate column
  // This is a placeholder - implement actual Stripe API call when ready
  const stripeAccountId = (product as any).stripe_account_id;
  
  if (!stripeAccountId) {
    return null;
  }

  // TODO: Implement actual Stripe API call
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  // const account = await stripe.accounts.retrieve(stripeAccountId);
  // const balance = await stripe.balance.retrieve({ stripeAccount: stripeAccountId });
  // etc.

  // Placeholder return
  return null;
}

/**
 * Store verified Stripe metrics in verification_metrics
 */
export async function storeStripeMetrics(
  productId: string,
  metrics: StripeMetrics
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('verification_metrics')
    .insert({
      product_id: productId,
      source: 'stripe_verified',
      metric_name: 'mrr_verified',
      metric_value: metrics.mrr,
      extra: {
        currency: metrics.currency,
        verified_at: metrics.verifiedAt,
      },
      is_verified: true, // Mark as verified
      captured_at: new Date().toISOString(),
    });

  if (error) throw error;
}


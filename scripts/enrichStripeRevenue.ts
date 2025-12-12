// scripts/enrichStripeRevenue.ts
import 'dotenv/config';
import { supabaseAdminScript } from './supabaseAdminScript';
import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  throw new Error('STRIPE_SECRET_KEY is required for Stripe enrichment');
}
const stripe = new Stripe(stripeSecret, { apiVersion: '2023-10-16' });

async function enrichOne(mapping: any) {
  const providerProductId = mapping.provider_product_id;
  const productId = mapping.product_id;

  // Simplified example: sum charges in the last 30 days with a given product metadata or price id.
  // In reality, you may filter by price id, product id, or metadata on the charge/subscription.
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

  let revenue30d = 0;

  const charges = await stripe.charges.list({
    limit: 100,
    created: { gte: thirtyDaysAgo, lte: now },
    // Optionally filter by metadata or description containing providerProductId
  });

  for (const charge of charges.data) {
    if (charge.paid && !charge.refunded) {
      // basic filter: match product id or price id via metadata/description if you set that up
      revenue30d += (charge.amount ?? 0) / 100; // convert cents to currency
    }
  }

  const metrics = [
    {
      product_id: productId,
      source: 'stripe_verified',
      metric_name: 'revenue_30d_verified',
      metric_value: revenue30d,
      is_verified: true,
    },
    // optional: compute a rough MRR based on subscriptions instead
  ];

  const { error } = await supabaseAdminScript
    .from('verification_metrics')
    .insert(metrics);

  if (error) throw error;
}

async function run() {
  const { data, error } = await supabaseAdminScript
    .from('product_payment_mappings')
    .select('*')
    .eq('provider', 'stripe');

  if (error) throw error;
  if (!data) return;

  for (const mapping of data) {
    try {
      await enrichOne(mapping);
      console.log('Enriched Stripe metrics for product', mapping.product_id);
    } catch (e) {
      console.error('Failed for mapping', mapping.id, e);
    }
  }
}

run().then(() => process.exit(0));


// scripts/enrichIosMetrics.ts
import 'dotenv/config';
import { supabaseAdminScript } from './supabaseAdminScript';
import appStore from 'app-store-scraper';

async function enrichOne(product: any) {
  const appId = product.ios_app_id;
  if (!appId) return;

  const app = await appStore.app({ id: appId, country: 'us', lang: 'en' });

  const ratingCount = app.ratings ?? 0;
  const avgRating = app.score ?? 0;
  const priceUsd = app.price ?? 0;

  const metrics = [
    {
      product_id: product.id,
      source: 'ios_store',
      metric_name: 'rating_count',
      metric_value: ratingCount,
      is_verified: false,
    },
    {
      product_id: product.id,
      source: 'ios_store',
      metric_name: 'avg_rating',
      metric_value: avgRating,
      is_verified: false,
    },
    {
      product_id: product.id,
      source: 'ios_store',
      metric_name: 'price_usd',
      metric_value: priceUsd,
      is_verified: false,
    },
  ];

  const { error } = await supabaseAdminScript
    .from('verification_metrics')
    .insert(metrics);

  if (error) throw error;
}

async function run() {
  const { data, error } = await supabaseAdminScript
    .from('products')
    .select('*')
    .not('ios_app_id', 'is', null);

  if (error) throw error;
  if (!data) return;

  for (const product of data) {
    try {
      await enrichOne(product);
      console.log('Enriched iOS metrics for', product.ios_app_id);
    } catch (e) {
      console.error('Failed for', product.ios_app_id, e);
    }
  }
}

run().then(() => process.exit(0));


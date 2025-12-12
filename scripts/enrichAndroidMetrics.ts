// scripts/enrichAndroidMetrics.ts
import 'dotenv/config';
import { supabaseAdminScript } from './supabaseAdminScript';
import gplay from 'google-play-scraper';

async function enrichOne(product: any) {
  const pkg = product.android_package;
  if (!pkg) return;

  const app = await gplay.app({ appId: pkg, country: 'us', lang: 'en' });

  const installsStr = app.installs ?? '0';
  const installs = Number(installsStr.replace(/[+,]/g, '')) || 0;

  const priceUsd = app.price ?? 0;
  const ratingCount = app.ratings ?? 0;
  const avgRating = app.score ?? 0;

  const metrics = [
    {
      product_id: product.id,
      source: 'android_store',
      metric_name: 'downloads_lifetime',
      metric_value: installs,
      is_verified: false,
    },
    {
      product_id: product.id,
      source: 'android_store',
      metric_name: 'rating_count',
      metric_value: ratingCount,
      is_verified: false,
    },
    {
      product_id: product.id,
      source: 'android_store',
      metric_name: 'avg_rating',
      metric_value: avgRating,
      is_verified: false,
    },
    {
      product_id: product.id,
      source: 'android_store',
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
    .not('android_package', 'is', null);

  if (error) throw error;
  if (!data) return;

  for (const product of data) {
    try {
      await enrichOne(product);
      console.log('Enriched Android metrics for', product.android_package);
    } catch (e) {
      console.error('Failed for', product.android_package, e);
    }
  }
}

run().then(() => process.exit(0));


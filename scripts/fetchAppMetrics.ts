/**
 * Node script to fetch app store metrics and store them in Supabase
 * Intended to run on a separate machine (Ubuntu box / VPS), NOT in Vercel
 * 
 * Usage:
 *   npm run fetch:metrics -- --product-id <uuid>
 *   npm run fetch:metrics -- --ios-app-id <id>
 *   npm run fetch:metrics -- --android-package <package>
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchAndroidMetrics, fetchIOSMetrics } from '../src/lib/storeScrapers';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function fetchAndStoreMetrics(productId: string) {
  // Get product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    throw new Error(`Product not found: ${productId}`);
  }

  console.log(`Fetching metrics for product: ${product.name}`);

  const metricsToInsert: Array<{
    product_id: string;
    source: string;
    metric_name: string;
    metric_value: number;
    is_verified: boolean;
  }> = [];

  // Fetch Android metrics
  if (product.android_package) {
    console.log(`Fetching Android metrics for ${product.android_package}...`);
    const metrics = await fetchAndroidMetrics(product.android_package);
    
    if (metrics) {
      if (metrics.downloadsLifetime != null) {
        metricsToInsert.push({
          product_id: product.id,
          source: 'android_store',
          metric_name: 'downloads_lifetime',
          metric_value: metrics.downloadsLifetime,
          is_verified: false,
        });
      }
      if (metrics.downloads30d != null) {
        metricsToInsert.push({
          product_id: product.id,
          source: 'android_store',
          metric_name: 'downloads_30d',
          metric_value: metrics.downloads30d,
          is_verified: false,
        });
      }
      if (metrics.ratingCount != null) {
        metricsToInsert.push({
          product_id: product.id,
          source: 'android_store',
          metric_name: 'rating_count',
          metric_value: metrics.ratingCount,
          is_verified: false,
        });
      }
      if (metrics.avgRating != null) {
        metricsToInsert.push({
          product_id: product.id,
          source: 'android_store',
          metric_name: 'avg_rating',
          metric_value: metrics.avgRating,
          is_verified: false,
        });
      }
      if (metrics.priceUsd != null) {
        metricsToInsert.push({
          product_id: product.id,
          source: 'android_store',
          metric_name: 'price_usd',
          metric_value: metrics.priceUsd,
          is_verified: false,
        });
      }
      console.log(`✓ Fetched ${metricsToInsert.length} Android metrics`);
    } else {
      console.log(`✗ Failed to fetch Android metrics`);
    }
  }

  // Fetch iOS metrics
  if (product.ios_app_id) {
    console.log(`Fetching iOS metrics for ${product.ios_app_id}...`);
    const metrics = await fetchIOSMetrics(product.ios_app_id);
    
    if (metrics) {
      if (metrics.downloadsLifetime != null) {
        metricsToInsert.push({
          product_id: product.id,
          source: 'ios_store',
          metric_name: 'downloads_lifetime',
          metric_value: metrics.downloadsLifetime,
          is_verified: false,
        });
      }
      if (metrics.downloads30d != null) {
        metricsToInsert.push({
          product_id: product.id,
          source: 'ios_store',
          metric_name: 'downloads_30d',
          metric_value: metrics.downloads30d,
          is_verified: false,
        });
      }
      if (metrics.ratingCount != null) {
        metricsToInsert.push({
          product_id: product.id,
          source: 'ios_store',
          metric_name: 'rating_count',
          metric_value: metrics.ratingCount,
          is_verified: false,
        });
      }
      if (metrics.avgRating != null) {
        metricsToInsert.push({
          product_id: product.id,
          source: 'ios_store',
          metric_name: 'avg_rating',
          metric_value: metrics.avgRating,
          is_verified: false,
        });
      }
      if (metrics.priceUsd != null) {
        metricsToInsert.push({
          product_id: product.id,
          source: 'ios_store',
          metric_name: 'price_usd',
          metric_value: metrics.priceUsd,
          is_verified: false,
        });
      }
      console.log(`✓ Fetched ${metricsToInsert.length} iOS metrics`);
    } else {
      console.log(`✗ Failed to fetch iOS metrics`);
    }
  }

  // Store metrics
  if (metricsToInsert.length > 0) {
    // Delete old metrics for this product (keep verified ones)
    await supabase
      .from('verification_metrics')
      .delete()
      .eq('product_id', product.id)
      .eq('is_verified', false);

    const { error } = await supabase
      .from('verification_metrics')
      .insert(metricsToInsert);

    if (error) throw error;
    console.log(`✓ Stored ${metricsToInsert.length} metrics`);
  } else {
    console.log('No metrics to store');
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const productIdIndex = args.indexOf('--product-id');
const iosAppIdIndex = args.indexOf('--ios-app-id');
const androidPackageIndex = args.indexOf('--android-package');

async function main() {
  try {
    if (productIdIndex !== -1 && args[productIdIndex + 1]) {
      const productId = args[productIdIndex + 1];
      await fetchAndStoreMetrics(productId);
    } else if (iosAppIdIndex !== -1 && args[iosAppIdIndex + 1]) {
      const iosAppId = args[iosAppIdIndex + 1];
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('ios_app_id', iosAppId)
        .single();
      if (!product) throw new Error(`Product not found for iOS app ID: ${iosAppId}`);
      await fetchAndStoreMetrics(product.id);
    } else if (androidPackageIndex !== -1 && args[androidPackageIndex + 1]) {
      const androidPackage = args[androidPackageIndex + 1];
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('android_package', androidPackage)
        .single();
      if (!product) throw new Error(`Product not found for Android package: ${androidPackage}`);
      await fetchAndStoreMetrics(product.id);
    } else {
      console.error('Usage:');
      console.error('  npm run fetch:metrics -- --product-id <uuid>');
      console.error('  npm run fetch:metrics -- --ios-app-id <id>');
      console.error('  npm run fetch:metrics -- --android-package <package>');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();


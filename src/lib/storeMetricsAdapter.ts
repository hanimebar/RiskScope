/**
 * @deprecated This adapter is no longer used.
 * Metrics are now read directly from Supabase in claimChecker.ts
 * This file is kept for backwards compatibility but should not be imported.
 */

export type StoreMetrics = {
  downloadsLifetime?: number;
  downloads30d?: number;
  ratingCount?: number;
  avgRating?: number;
  priceUsd?: number;
};

/**
 * @deprecated Use metrics from Supabase directly
 */
export async function fetchStoreMetrics(_params: {
  iosAppId?: string;
  androidPackage?: string;
}): Promise<StoreMetrics | null> {
  // No longer used - metrics come from Supabase
  return null;
}

// src/lib/storeMetricsAdapter.ts
export type StoreMetrics = {
  downloadsLifetime?: number;
  downloads30d?: number;
  ratingCount?: number;
  avgRating?: number;
  priceUsd?: number;
};

// Dumb stub: returns fixed-but-plausible-ish numbers so the pipeline works.
export async function fetchStoreMetrics(params: {
  iosAppId?: string;
  androidPackage?: string;
}): Promise<StoreMetrics> {
  const { iosAppId, androidPackage } = params;

  // You can customize these a bit so they differ per ID:
  const baseDownloads = iosAppId ? 8000 : androidPackage ? 5000 : 2000;

  return {
    downloadsLifetime: baseDownloads,
    downloads30d: Math.round(baseDownloads * 0.1),
    ratingCount: 25,
    avgRating: 4.2,
    priceUsd: 4.99, // pretend it's a $4.99 app
  };
}


export type StoreMetrics = {
  downloadsLifetime?: number;
  downloads30d?: number;
  ratingCount?: number;
  avgRating?: number;
  priceUsd?: number;
};

/**
 * Fetches store metrics for iOS and/or Android apps
 * TODO: integrate real App Store / Play APIs
 * For now, returns hardcoded or pseudo-random values so the flow works
 */
export async function fetchStoreMetrics(params: {
  iosAppId?: string;
  androidPackage?: string;
}): Promise<StoreMetrics> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Return mock data based on app ID/package
  // In a real implementation, this would call AppTweak, Sensor Tower, etc.
  const seed = params.iosAppId?.length || params.androidPackage?.length || 1000;

  return {
    downloadsLifetime: Math.floor(seed * 1000) + 10000,
    downloads30d: Math.floor(seed * 50) + 1000,
    ratingCount: Math.floor(seed * 10) + 100,
    avgRating: Number((3.5 + (seed % 15) / 10).toFixed(1)), // 3.5 to 5.0
    priceUsd: seed % 3 === 0 ? Number((Math.random() * 10).toFixed(2)) : 0,
  };
}


/**
 * Real app store scrapers
 * These use actual scraping libraries and should run in Node.js environment
 */

export type StoreMetrics = {
  downloadsLifetime?: number;
  downloads30d?: number;
  ratingCount?: number;
  avgRating?: number;
  priceUsd?: number;
};

/**
 * Fetch metrics from Google Play Store
 * Uses google-play-scraper library
 */
export async function fetchAndroidMetrics(packageName: string): Promise<StoreMetrics | null> {
  try {
    // Dynamic import to avoid bundling in Next.js client
    const gplay = await import('google-play-scraper').catch(() => null);
    
    if (!gplay || !gplay.default) {
      console.warn('google-play-scraper not available, returning null');
      return null;
    }

    const app = await gplay.default.app({ appId: packageName });
    
    // Map google-play-scraper response to our StoreMetrics format
    return {
      downloadsLifetime: parseInstalls(app.installs),
      downloads30d: undefined, // google-play-scraper doesn't provide 30d breakdown
      ratingCount: app.reviews,
      avgRating: app.score,
      priceUsd: app.price === 0 ? 0 : parsePrice(app.price),
    };
  } catch (error) {
    console.error(`Error fetching Android metrics for ${packageName}:`, error);
    return null;
  }
}

/**
 * Fetch metrics from Apple App Store
 * Uses app-store-scraper library
 */
export async function fetchIOSMetrics(appId: string): Promise<StoreMetrics | null> {
  try {
    // Dynamic import to avoid bundling in Next.js client
    const appStore = await import('app-store-scraper').catch(() => null);
    
    if (!appStore || !appStore.default) {
      console.warn('app-store-scraper not available, returning null');
      return null;
    }

    const app = await appStore.default.app({ id: appId, country: 'us' });
    
    // Map app-store-scraper response to our StoreMetrics format
    return {
      downloadsLifetime: undefined, // App Store doesn't provide download counts publicly
      downloads30d: undefined,
      ratingCount: app.reviews,
      avgRating: app.score,
      priceUsd: app.price === 0 ? 0 : app.price,
    };
  } catch (error) {
    console.error(`Error fetching iOS metrics for ${appId}:`, error);
    return null;
  }
}

/**
 * Helper: Parse installs string like "1,000,000+" to number
 */
function parseInstalls(installs: string): number | undefined {
  if (!installs) return undefined;
  
  // Remove commas and + signs
  const cleaned = installs.replace(/[,\+]/g, '').trim();
  const num = parseInt(cleaned, 10);
  
  return isNaN(num) ? undefined : num;
}

/**
 * Helper: Parse price string like "$4.99" to number
 */
function parsePrice(price: string | number): number {
  if (typeof price === 'number') return price;
  if (!price) return 0;
  
  // Remove currency symbols and parse
  const cleaned = price.toString().replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? 0 : num;
}


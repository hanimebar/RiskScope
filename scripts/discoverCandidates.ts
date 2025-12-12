import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { URL } from 'node:url';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// this would call something like SerpAPI / Bing API.
// placeholder function:
async function searchWeb(query: string): Promise<string[]> {
  // TODO: plug into a real search API that returns result URLs
  // and return them as strings.
  // Example integration:
  // const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}`);
  // const data = await response.json();
  // return data.organic_results?.map((r: any) => r.link) || [];
  return [];
}

function extractDomain(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

async function runDiscovery() {
  const queries = [
    '"never received my order" "shop"',
    '"is this website legit" "store"',
    '"scam" "online shop"',
  ];

  const domains = new Set<string>();

  for (const q of queries) {
    const urls = await searchWeb(q);
    for (const u of urls) {
      const d = extractDomain(u);
      if (d) domains.add(d);
    }
  }

  const payload = [...domains].map((d) => ({
    domain: d,
    source: 'search_api',
  }));

  if (!payload.length) {
    console.log('No new domains discovered');
    return;
  }

  const { error } = await supabase.from('crawl_queue').insert(payload);
  if (error) throw error;

  console.log(`Inserted ${payload.length} domains into crawl_queue`);
}

runDiscovery()
  .then(() => {
    console.log('Discovery done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Discovery failed', err);
    process.exit(1);
  });


import 'dotenv/config'; // so it reads .env.local or .env
import { createClient } from '@supabase/supabase-js';
import { scrapeAndStoreDomain } from '../src/lib/analyzeDomain';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function processBatch(limit = 20) {
  // 1) grab some pending domains
  const { data: items, error } = await supabase
    .from('crawl_queue')
    .select('*')
    .eq('status', 'pending')
    .order('inserted_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  if (!items || items.length === 0) {
    console.log('No pending items');
    return;
  }

  for (const item of items) {
    const domain = item.domain;
    console.log(`Processing ${domain} (${item.id})`);

    // mark as processing
    await supabase
      .from('crawl_queue')
      .update({
        status: 'processing',
        attempts: item.attempts + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    try {
      await scrapeAndStoreDomain(domain);

      await supabase
        .from('crawl_queue')
        .update({
          status: 'done',
          updated_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', item.id);

      console.log(`✓ Done ${domain}`);
    } catch (err: any) {
      console.error(`✗ Failed ${domain}`, err);

      await supabase
        .from('crawl_queue')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
          last_error: String(err?.message ?? err),
        })
        .eq('id', item.id);
    }
  }
}

processBatch()
  .then(() => {
    console.log('Batch finished');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error', err);
    process.exit(1);
  });


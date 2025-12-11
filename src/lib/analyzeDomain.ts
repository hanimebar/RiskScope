import * as cheerio from 'cheerio';
import { supabaseAdmin } from './supabaseAdmin';
import { normalizeDomain } from './domainUtils';
import { calculateRiskScore } from './riskScore';

type NewSignal = {
  type: string;
  dimension: string;
  severity: number;   // 0–10
  source: string;     // 'system'
  description: string;
};

async function fetchHtml(domain: string): Promise<string> {
  const urls = [`https://${domain}`, `http://${domain}`];
  let lastError: unknown;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: {
          'user-agent': 'RiskScopeBot/1.0; contact: youremail@example.com',
        },
      });

      if (res.ok) {
        return await res.text();
      }

      lastError = new Error(`Got status ${res.status} from ${url}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error('Could not fetch site HTML');
}

function buildSignals(html: string): NewSignal[] {
  const $ = cheerio.load(html);
  const bodyText = $('body').text().toLowerCase().replace(/\s+/g, ' ');
  const signals: NewSignal[] = [];

  const hasContact =
    bodyText.includes('contact') ||
    bodyText.includes('@') ||
    bodyText.includes('email');

  if (!hasContact) {
    signals.push({
      type: 'no_contact_info',
      dimension: 'identity',
      severity: 5,
      source: 'system',
      description: 'No obvious contact info on the page.',
    });
  }

  const hasRefundOrReturns =
    bodyText.includes('refund') ||
    bodyText.includes('returns') ||
    bodyText.includes('return policy');

  if (!hasRefundOrReturns) {
    signals.push({
      type: 'no_refund_policy',
      dimension: 'offer',
      severity: 4,
      source: 'system',
      description: 'No refund/returns policy detected in page text.',
    });
  }

  const hasCrazyDiscounts = /[5-9][0-9]%\s*off/.test(bodyText);
  if (hasCrazyDiscounts) {
    signals.push({
      type: 'aggressive_discounts',
      dimension: 'offer',
      severity: 6,
      source: 'system',
      description: 'Very high discount percentages detected (e.g. 70–90% off).',
    });
  }

  const words = bodyText.split(' ');
  if (words.length < 200) {
    signals.push({
      type: 'very_little_content',
      dimension: 'technical',
      severity: 3,
      source: 'system',
      description: 'Page has very little textual content.',
    });
  }

  return signals;
}

export async function scrapeAndStoreDomain(rawDomain: string) {
  const normalized_domain = normalizeDomain(rawDomain);
  const domain = normalized_domain;

  const html = await fetchHtml(domain);
  const signals = buildSignals(html);
  
  // Use the existing calculateRiskScore function, but we need to convert NewSignal to RiskSignal format
  // For now, we'll calculate manually and then use the existing function for consistency
  // Actually, let's fetch existing signals first, merge with new ones, then recalculate
  const { data: existingSite } = await supabaseAdmin
    .from('sites')
    .select('id')
    .eq('normalized_domain', normalized_domain)
    .single();

  let siteId: string;
  if (existingSite) {
    siteId = existingSite.id;
  } else {
    // Create new site first
    const { data: newSite, error: siteError } = await supabaseAdmin
      .from('sites')
      .insert({
        domain,
        normalized_domain,
        risk_score: 0,
        risk_level: 'low',
        total_signals: 0,
        total_reports: 0,
      })
      .select()
      .single();

    if (siteError || !newSite) {
      throw new Error('Failed to create site');
    }
    siteId = newSite.id;
  }

  // Fetch existing user-generated signals (we don't want to delete those)
  const { data: existingSignals } = await supabaseAdmin
    .from('risk_signals')
    .select('*')
    .eq('site_id', siteId)
    .neq('source', 'system'); // Keep non-system signals

  // Delete old system signals
  await supabaseAdmin
    .from('risk_signals')
    .delete()
    .eq('site_id', siteId)
    .eq('source', 'system');

  // Insert new system signals
  if (signals.length > 0) {
    const insertPayload = signals.map((s) => ({
      ...s,
      site_id: siteId,
    }));

    const { error: signalsError } = await supabaseAdmin
      .from('risk_signals')
      .insert(insertPayload);

    if (signalsError) {
      throw signalsError;
    }
  }

  // Fetch all signals (existing user/admin + new system signals) to recalculate score
  const { data: allSignals } = await supabaseAdmin
    .from('risk_signals')
    .select('*')
    .eq('site_id', siteId);

  // Use the existing calculateRiskScore function
  const { score: risk_score, level: risk_level } = calculateRiskScore(allSignals || []);

  // Update site with new risk score
  const { data: site, error: updateError } = await supabaseAdmin
    .from('sites')
    .update({
      risk_score,
      risk_level,
      total_signals: allSignals?.length || 0,
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  return { site, signals, risk_score, risk_level };
}


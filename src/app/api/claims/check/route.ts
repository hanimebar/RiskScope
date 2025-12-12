import { NextRequest, NextResponse } from 'next/server';
import { runClaimCheck } from '@/lib/claimChecker';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const {
      appName,
      primaryUrl,
      iosAppId,
      androidPackage,
      claimedValue,
      currency = 'USD',
      claimType = 'mrr',
      timeframeText,
      sourceUrl,
    } = body;

    // Validate input
    if (!claimedValue || claimedValue <= 0) {
      return NextResponse.json(
        { error: 'claimedValue is required and must be positive' },
        { status: 400 }
      );
    }

    if (!appName && !iosAppId && !androidPackage) {
      return NextResponse.json(
        { error: 'At least one of appName, iosAppId, or androidPackage is required' },
        { status: 400 }
      );
    }

    // Run claim check
    const result = await runClaimCheck(
      {
        name: appName,
        primaryUrl,
        iosAppId,
        androidPackage,
      },
      {
        claimType,
        claimedValue: Number(claimedValue),
        currency,
        timeframeText,
        sourceUrl,
      }
    );

    // Format response
    return NextResponse.json({
      product: {
        id: result.product.id,
        name: result.product.name,
        primaryUrl: result.product.primary_url,
        iosAppId: result.product.ios_app_id,
        androidPackage: result.product.android_package,
      },
      claim: {
        id: result.claim.id,
        claimType: result.claim.claim_type,
        claimedValue: result.claim.claimed_value,
        currency: result.claim.currency,
        timeframeText: result.claim.timeframe_text,
        sourceUrl: result.claim.source_url,
      },
      assessment: {
        verdict: result.assessment.verdict,
        confidence: result.assessment.confidence,
        maxPlausibleEstimate: result.assessment.max_plausible_estimate,
        notes: result.assessment.notes,
      },
      metrics: result.metrics.map(m => ({
        source: m.source,
        metricName: m.metric_name,
        metricValue: m.metric_value,
      })),
    });
  } catch (error: any) {
    console.error('Error in /api/claims/check:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}


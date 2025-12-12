// src/app/api/claims/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runClaimCheck } from '@/lib/claimChecker';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Claim check body:', body);

    // Let runClaimCheck do the main numeric validation
    if (body.claimedValue === undefined || body.claimedValue === null) {
      return NextResponse.json(
        { error: 'claimedValue is required' },
        { status: 400 }
      );
    }

    const result = await runClaimCheck({
      appName: body.appName,
      primaryUrl: body.primaryUrl,
      iosAppId: body.iosAppId,
      androidPackage: body.androidPackage,
      claimedValue: body.claimedValue,
      currency: body.currency,
      claimType: body.claimType,
      timeframeText: body.timeframeText,
      sourceUrl: body.sourceUrl,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('Claim check error:', err);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { scrapeAndStoreDomain } from '@/lib/analyzeDomain';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const domain = body?.domain as string | undefined;
  const adminPassword = body?.adminPassword as string | undefined;

  if (!domain) {
    return NextResponse.json(
      { error: 'domain is required' },
      { status: 400 }
    );
  }

  const expectedPassword = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
  if (!adminPassword || !expectedPassword || adminPassword !== expectedPassword) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await scrapeAndStoreDomain(domain);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Scrape error', err);
    return NextResponse.json(
      { error: 'Failed to scrape domain', details: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}


# RiskScope - Scam Risk Index

RiskScope is a Next.js application that helps users check a website's scam risk before making purchases. It provides risk scores based on community reports and automated signals.

## Tech Stack

- **Next.js 14** (App Router, src/ directory)
- **TypeScript**
- **TailwindCSS**
- **Supabase** (Postgres + RLS)
- **@supabase/supabase-js** (no ORM)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Copy and paste the contents of `supabase/schema.sql`
4. Run the SQL script to create all tables, indexes, and RLS policies

### 3. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_ADMIN_PASSWORD=your_admin_password_here
```

**Note:** 
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are required for server-side operations that bypass RLS (like updating sites and inserting risk signals). These should be kept secret and never exposed to the client.
- The admin password can also be set as `ADMIN_PASSWORD` (server-side only) for better security, but `NEXT_PUBLIC_ADMIN_PASSWORD` will work for MVP.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses three main tables:

- **sites**: Stores website information and risk scores
- **risk_signals**: Stores individual risk signals for each site
- **user_reports**: Stores user-submitted reports

All tables have Row Level Security (RLS) enabled with appropriate policies for anonymous access.

## Features

### Home Page (`/`)

- Search bar to check any domain
- Leaderboard showing top 20 highest risk sites
- Click on any site to view detailed risk profile

### Site Detail Page (`/site/[domain]`)

- Risk score badge with color-coded levels
- Grouped risk signals by dimension (technical, identity, offer, reputation)
- Latest user reports
- Report form to submit new issues

### Admin Page (`/admin`)

- Password-protected moderation interface
- Review and manage user reports
- Actions: Mark as Reviewed, Dismiss, or Confirm
- Confirming a report adds an admin risk signal and recalculates the site's risk score

## Risk Scoring

Risk scores are calculated by summing the severity values of all risk signals for a site, capped at 100:

- **0-20**: Low risk (green)
- **21-40**: Medium risk (yellow)
- **41-70**: High risk (orange)
- **71-100**: Critical risk (red)

## Admin Access

To access the admin page:

1. Navigate to `/admin`
2. Enter the password set in `NEXT_PUBLIC_ADMIN_PASSWORD` or `ADMIN_PASSWORD`

**Security Note:** For production, consider implementing proper authentication instead of a simple password check.

## Project Structure

```
src/
├── app/
│   ├── admin/          # Admin moderation page
│   ├── api/            # API routes
│   ├── site/[domain]/  # Dynamic site detail pages
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── components/         # React components
├── lib/               # Utility functions
└── types/             # TypeScript type definitions
supabase/
└── schema.sql         # Database schema and RLS policies
```

## Crawl Queue System

The application includes a queue-based system for processing domains in batches.

### Database Setup

The `crawl_queue` table needs to be created. Run the updated `supabase/schema.sql` which includes:

```sql
create table public.crawl_queue (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  source text not null default 'manual',
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Processing Queue

Process pending domains from the queue:

```bash
npm run crawl:queue
```

This script:
- Fetches up to 20 pending domains
- Scrapes and analyzes each domain
- Updates the queue status (done/failed)
- Preserves user/admin signals when scraping

### Discovery Script

Discover new candidate domains from search APIs:

```bash
npm run crawl:discover
```

**Note:** The discovery script includes placeholder code for search API integration. You'll need to:
1. Sign up for a search API provider (e.g., SerpAPI, Bing Search API)
2. Add your API key to `.env.local`
3. Implement the `searchWeb()` function in `scripts/discoverCandidates.ts`

### Manual Queue Seeding

You can manually insert domains into the queue:

```sql
insert into public.crawl_queue (domain, source)
values
  ('dodgyshop123.com', 'seed'),
  ('super-cheap-sneakers.shop', 'seed'),
  ('random-electronics-sale.xyz', 'seed');
```

## Building for Production

```bash
npm run build
npm start
```

## Claim Checker - Hybrid Verification

The Claim Checker evaluates revenue claims about mobile apps using a hybrid approach:

### Architecture

1. **App Store Metrics**: Real metrics from Google Play and App Store (scraped by worker scripts)
2. **Stripe Verification**: Optional verified metrics from Stripe (when founders connect their accounts)
3. **Hybrid Assessment**: Uses verified data when available, falls back to estimated metrics

### Worker Scripts

App store metrics are fetched by separate Node.js scripts that run on a VPS/Ubuntu box (not in Vercel):

```bash
# Fetch metrics for a product
npm run fetch:metrics -- --product-id <uuid>

# Or by app identifier
npm run fetch:metrics -- --ios-app-id <app-id>
npm run fetch:metrics -- --android-package <package-name>
```

The worker script:
- Uses `google-play-scraper` for Android apps
- Uses `app-store-scraper` for iOS apps
- Stores metrics in `verification_metrics` with `is_verified = false`
- Replaces old estimated metrics when new ones are fetched

### Database Schema

Run the migration to add the `is_verified` flag:

```sql
-- Run supabase/schema-claims-migration.sql
alter table public.verification_metrics
add column if not exists is_verified boolean not null default false;
```

### Stripe Integration (Future)

The system supports Stripe verification:
- Products can have a `stripe_account_id` mapping
- Verified MRR from Stripe is stored with `is_verified = true`
- When verified metrics exist, they override estimated assessments

## License

ISC


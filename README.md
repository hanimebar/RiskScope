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

## Building for Production

```bash
npm run build
npm start
```

## License

ISC


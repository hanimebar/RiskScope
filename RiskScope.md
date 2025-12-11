Short answer:
I’d start **fresh** with a new app and Supabase schema and leave AgencyMRR as-is (you might want it later). For working name, I’d go with:

> **Name:** RiskScope
> **Tagline:** “Check a site’s scam risk before you buy.”

We can always rename, but I’ll use **RiskScope** below so Cursor has something concrete.

---

## 1. New Product – RiskScope (TrustMRR but for scam risk)

### 1.1 Product overview

**Working name:** RiskScope
**Tagline:** “Check a site’s scam risk before you buy.”

RiskScope is a public **Scam Risk Index** for websites (shops, services, “get rich” schemes, etc.).
For any domain, RiskScope shows:

* A **risk score** (0–100) and level: Low / Medium / High / Critical
* A breakdown of **why** (signals + user complaints)
* A simple **leaderboard** of the highest-risk domains and “trending risk” sites

It’s explicitly a **risk assessment**, not a legal accusation. You’re showing “this domain triggers X red flags across A/B/C dimensions”.

---

### 1.2 Goals (MVP)

1. Let anyone **search a domain** and see:

   * risk score,
   * risk level,
   * key signals,
   * user reports.
2. Let users **submit a report** for a site:

   * non-delivery, fake product, refund refused, etc.
3. Maintain a **leaderboard**:

   * highest-risk sites overall,
   * highest-risk per category / country.
4. Have a simple **admin UI** to:

   * review reports,
   * mark them as “reviewed / dismissed / confirmed”,
   * optionally override risk if something is clearly wrong.

**Non-goals (MVP)**

* No Stripe/Shopify integrations (that’s for later “Verified Legit” opt-ins).
* No browser extensions yet.
* No fancy crawling infrastructure; technical signals can be manual or stubbed at first.
* No public “this site IS a scam” language – everything is framed as risk.

---

### 1.3 Who it’s for

* **Shoppers / citizens** – “Is this site dodgy before I type my card?”
* **Watchdogs / journalists** – quick snapshot of risk signals.
* **Legit merchants (later)** – can claim their site and prove low risk.

---

## 2. Risk model (how you define “scamminess”)

For MVP, everything is stored as **signals + reports**, then turned into a score.

### 2.1 Dimensions

Each site has risk from 4 dimensions:

1. **Technical & Domain Risk (0–25)**

   * Very new domain (< 3 months).
   * Country mismatch (claims “UK” but hosted elsewhere).
   * Shares infrastructure with other high-risk sites.

2. **Identity & Transparency Risk (0–25)**

   * No company name / registration / address.
   * No Privacy Policy or Terms of Service.
   * Only free email contact (Gmail, etc.).

3. **Offer & Content Risk (0–25)**

   * Extreme discounting (“80% off everything”).
   * Overpromising (“guaranteed profit”, “0 risk”).
   * Fake badges / fake “as seen on” logos.

4. **Reputation & Behaviour Risk (0–25)**

   * Number + severity of user reports:

     * non-delivery,
     * refund refused,
     * counterfeit,
     * payment dispute.

Each signal becomes a row in `risk_signals` with a **severity (0–10)** and type.

### 2.2 Score formula (simple and transparent)

For MVP:

* Each signal contributes `severity` points (0–10).
* Total `raw_score = sum(severity)` but capped at 100.
* Map to **risk_level**:

  * 0–20 → `low`
  * 21–40 → `medium`
  * 41–70 → `high`
  * 71–100 → `critical`

You can tweak weights later without changing DB.

---

## 3. Data model (Supabase)

New project or new schema; keep it lean.

### 3.1 `sites`

Website being evaluated.

```sql
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,         -- e.g. "dodgyshop.com"
  normalized_domain text not null,     -- lowercase, stripped (for searching)
  category text,                       -- "fashion", "crypto", "supplements", etc.
  country text,                        -- best-guess country (optional)
  first_seen_at timestamptz not null default now(),
  last_checked_at timestamptz,
  risk_score integer not null default 0,    -- 0-100
  risk_level text not null default 'low',   -- 'low','medium','high','critical'
  total_signals integer not null default 0,
  total_reports integer not null default 0,
  manual_legit boolean not null default false, -- admin override: "we reviewed and it's legit"
  manual_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.sites (normalized_domain);
create index on public.sites (risk_score desc);
create index on public.sites (risk_level);
```

### 3.2 `risk_signals`

Individual risk indicators.

```sql
create table public.risk_signals (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  type text not null,             -- e.g. 'no_company_address', 'new_domain', 'user_report_non_delivery'
  dimension text not null,        -- 'technical','identity','offer','reputation'
  severity integer not null,      -- 0-10
  source text not null,           -- 'system','user','admin'
  description text,               -- human readable explanation
  created_at timestamptz not null default now()
);

create index on public.risk_signals (site_id);
create index on public.risk_signals (type);
```

### 3.3 `user_reports`

User-submitted complaints.

```sql
create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  report_type text not null,      -- 'non_delivery','poor_quality','refund_refused','fraud','other'
  description text,
  country text,
  order_value_band text,          -- '<50','50-200','200-1000','1000+'
  has_evidence boolean not null default false,
  contact_email text,             -- optional, never shown publicly
  status text not null default 'new', -- 'new','reviewed','dismissed','confirmed'
  created_at timestamptz not null default now()
);

create index on public.user_reports (site_id);
create index on public.user_reports (status);
```

### 3.4 RLS (high level)

* `sites`:

  * **select**: allowed to `anon` (public browse).
  * **insert**: allowed (so user can add a new domain).
  * **update/delete**: only service_role or admin (no public edits).

* `risk_signals`:

  * **select**: allowed to `anon`.
  * **insert**: allowed for system/admin only (for now use service_role or keep it in server actions).
  * **update/delete**: admin only.

* `user_reports`:

  * **insert**: allowed to `anon`.
  * **select**: allowed to `anon`, but in queries we never return `contact_email`.

Cursor can generate the actual SQL policies.

---

## 4. UX / Flows

### 4.1 Flow A – Search & view site risk

1. User lands on `/`.
2. Sees:

   * search bar: “Check a site’s scam risk”
   * some example domains and a leaderboard.
3. Types a domain → `/site/[domain]` route.
4. If site exists:

   * Show risk score, level, breakdown, user reports.
5. If not:

   * Create a new `sites` row with default `risk_score = 0`, run initial scoring function (for MVP maybe just “identity not found” → add some signals), and show page.

### 4.2 Flow B – Submit a report

From `/site/[domain]`:

1. Click “Report your experience”.
2. Opens form:

   * report_type
   * country
   * order_value_band
   * description
   * optional contact_email
   * “I have evidence” checkbox
3. On submit:

   * Insert row into `user_reports`.
   * Add a `risk_signals` entry of type `user_report_<type>`, dimension `reputation`, severity based on report_type.
   * Recalculate `sites.risk_score`, `risk_level`, `total_signals`, `total_reports`.
   * Show updated score.

### 4.3 Flow C – Leaderboard

On `/`:

* Show table of:

  * domain
  * risk_score,
  * risk_level,
  * total_reports,
  * last_checked_at.
* Sort by `risk_score` desc.
* Filters:

  * min risk level (e.g. High+),
  * category,
  * country.

---

## 5. Pages / Routes

For Cursor:

1. `/`

   * Search bar.
   * Top high-risk sites leaderboard.
   * Some copy explaining “risk score != legal verdict”.

2. `/site/[domain]`

   * Server component that:

     * normalises domain,
     * loads or creates `site`,
     * fetches `risk_signals` + `user_reports`,
     * calls a scoring helper to recompute `risk_score` and `risk_level` (or uses stored).
   * Shows:

     * score gauge (simple coloured number badge),
     * risk level,
     * counts,
     * list of top signals (grouped by dimension),
     * list of recent user reports (email hidden),
     * “Report your experience” form.

3. `/admin` (MVP basic)

   * Password-gated (env var `ADMIN_PASSWORD`).
   * Shows list of `user_reports` with `status = 'new'`.
   * Admin can mark as `reviewed` or `dismissed` or `confirmed`.
   * When status changes to `confirmed`, optionally:

     * add another `risk_signals` row,
     * bump risk score again.

---

## 6. Cursor Build Prompt (you can paste this directly)

Here’s the concrete prompt you can give Cursor to build the MVP.

---

### 👉 Cursor Prompt: Build RiskScope Scam Risk Index

> You are an expert full-stack engineer.
> Build a **new** Next.js 14 + TypeScript + TailwindCSS + Supabase app called **RiskScope**.
>
> ### Tech stack
>
> * Next.js 14 (App Router, `src/` directory)
> * TypeScript
> * TailwindCSS
> * Supabase (Postgres + RLS)
> * No ORM, use `@supabase/supabase-js`
>
> ### Environment
>
> Create `src/lib/supabaseClient.ts`:
>
> ```ts
> import { createClient } from "@supabase/supabase-js";
>
> export const supabase = createClient(
>   process.env.NEXT_PUBLIC_SUPABASE_URL!,
>   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
> );
> ```
>
> Assume I will create a fresh Supabase project and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
>
> ### Database schema
>
> Create `supabase/schema.sql` with the following tables and indexes:
>
> 1. `sites` (websites being evaluated):
>
> ```sql
> create table public.sites (
>   id uuid primary key default gen_random_uuid(),
>   domain text not null unique,
>   normalized_domain text not null,
>   category text,
>   country text,
>   first_seen_at timestamptz not null default now(),
>   last_checked_at timestamptz,
>   risk_score integer not null default 0,
>   risk_level text not null default 'low',
>   total_signals integer not null default 0,
>   total_reports integer not null default 0,
>   manual_legit boolean not null default false,
>   manual_notes text,
>   created_at timestamptz not null default now(),
>   updated_at timestamptz not null default now()
> );
>
> create index on public.sites (normalized_domain);
> create index on public.sites (risk_score desc);
> create index on public.sites (risk_level);
> ```
>
> 2. `risk_signals`:
>
> ```sql
> create table public.risk_signals (
>   id uuid primary key default gen_random_uuid(),
>   site_id uuid not null references public.sites(id) on delete cascade,
>   type text not null,
>   dimension text not null,
>   severity integer not null,
>   source text not null,
>   description text,
>   created_at timestamptz not null default now()
> );
>
> create index on public.risk_signals (site_id);
> create index on public.risk_signals (type);
> ```
>
> 3. `user_reports`:
>
> ```sql
> create table public.user_reports (
>   id uuid primary key default gen_random_uuid(),
>   site_id uuid not null references public.sites(id) on delete cascade,
>   report_type text not null,
>   description text,
>   country text,
>   order_value_band text,
>   has_evidence boolean not null default false,
>   contact_email text,
>   status text not null default 'new',
>   created_at timestamptz not null default now()
> );
>
> create index on public.user_reports (site_id);
> create index on public.user_reports (status);
> ```
>
> Enable RLS on all three tables and add policies:
>
> * `sites`:
>
>   * `select` allowed for `anon`.
>   * `insert` allowed for `anon`.
>   * `update`/`delete` only for `service_role` (no public policy).
> * `risk_signals`:
>
>   * `select` allowed for `anon`.
>   * `insert`/`update`/`delete` reserved for `service_role` (no public policy).
> * `user_reports`:
>
>   * `insert` allowed for `anon`.
>   * `select` allowed for `anon`, but remember in the app never to display `contact_email`.
>
> Put all RLS policy SQL into `supabase/schema.sql` after the `create table` statements.
>
> ### Risk scoring helper
>
> Implement a pure helper in `src/lib/riskScore.ts`:
>
> ```ts
> import type { RiskSignal } from "@/types";
>
> export type RiskLevel = "low" | "medium" | "high" | "critical";
>
> export function calculateRiskScore(signals: RiskSignal[]): {
>   score: number;
>   level: RiskLevel;
> } {
>   // sum severity, cap at 100
>   const raw = signals.reduce((sum, s) => sum + (s.severity ?? 0), 0);
>   const score = Math.max(0, Math.min(100, raw));
>
>   let level: RiskLevel = "low";
>   if (score > 70) level = "critical";
>   else if (score > 40) level = "high";
>   else if (score > 20) level = "medium";
>   return { score, level };
> }
> ```
>
> Define a `RiskSignal` type in `src/types/index.ts` that matches the `risk_signals` row shape.
>
> ### Routes & pages
>
> Use the App Router (`src/app`).
>
> #### 1) `/` – Home
>
> * Server component that:
>
>   * shows a centered hero:
>
>     * title: “Check a site’s scam risk before you buy.”
>     * short explanation paragraph:
>
>       * make it clear it’s a risk score, not a legal verdict.
>   * search bar component (client) that lets user type a domain and on submit navigates to `/site/[domain]`.
> * Below that, render a **leaderboard**:
>
>   * fetch top 20 `sites` ordered by `risk_score` desc.
>   * show columns: domain, risk_score, risk_level, total_reports, last_checked_at.
>   * click row → `/site/[domain]`.
>
> #### 2) `/site/[domain]` – Site risk profile
>
> * Dynamic route. `domain` is from the URL (e.g. `dodgyshop.com`).
> * Server component:
>
>   1. Normalise `domain`:
>
>      * lowercase, strip protocol (`http(s)://`) and path, keep hostname only.
>   2. Look up existing `site` by `normalized_domain`.
>
>      * If not found, create a new `sites` row with:
>
>        * `domain` = original hostname
>        * `normalized_domain`
>        * default values for others.
>   3. Fetch:
>
>      * the `site` row
>      * all `risk_signals` for that site
>      * the latest 10 `user_reports` for that site (order by `created_at desc`).
>   4. Call `calculateRiskScore(signals)` and:
>
>      * if the computed score/level differ from stored, update the `sites` row to match.
>   5. Render:
>
>      * domain
>      * big risk score badge (0–100) with color for level.
>      * text label for `risk_level`.
>      * counts: total_signals, total_reports.
>      * grouped list of signals by dimension (`technical`, `identity`, `offer`, `reputation`).
>      * list of latest reports:
>
>        * type, country, order band, description, created_at, status.
>        * **Never show contact_email.**
>      * A disclaimer component about what the score means.
>      * Embedded **Report form** (see below).
> * Add a client `ReportForm` at the bottom:
>
>   * Fields:
>
>     * `report_type` (select: non_delivery, poor_quality, refund_refused, fraud, other)
>     * `country` (text or select)
>     * `order_value_band` (select: `<50`, `50-200`, `200-1000`, `1000+`)
>     * `description` (textarea)
>     * `contact_email` (optional)
>     * `has_evidence` (checkbox)
>   * On submit:
>
>     * call a server action or API route to:
>
>       1. Insert into `user_reports`.
>       2. Insert a corresponding `risk_signals` row:
>
>          * `dimension = 'reputation'`
>          * `type = 'user_report_' + report_type`
>          * `severity`:
>
>            * non_delivery / fraud → 10
>            * refund_refused → 7
>            * poor_quality → 4
>            * other → 3
>          * `source = 'user'`
>       3. Recompute risk_score/level and update the `sites` row.
>     * Refresh the page or update state to show new score and new report.
>   * Show loading/error states and a success message.
>
> #### 3) `/admin` – basic moderation
>
> * Simple password-gated client page:
>
>   * First render a password form:
>
>     * compare against `process.env.NEXT_PUBLIC_ADMIN_PASSWORD` on the client, or better use a server action that checks `ADMIN_PASSWORD`. Either approach is OK for MVP.
>   * Once authed:
>
>     * fetch `user_reports` where `status = 'new'` or `status = 'confirmed'`.
>     * show table: site domain, report_type, created_at, status, description, country, order_value_band.
>     * provide buttons:
>
>       * “Mark reviewed” → set `status = 'reviewed'`
>       * “Dismiss” → set `status = 'dismissed'`
>       * “Confirm” → set `status = 'confirmed'`
>     * When setting to `confirmed`, also:
>
>       * insert an additional `risk_signals` row with:
>
>         * `dimension = 'reputation'`
>         * `type = 'admin_confirmed_report'`
>         * `severity = 5`
>         * `source = 'admin'`
>       * recompute the site’s score based on all signals and update `sites`.
>
> ### UI & styling
>
> * Use Tailwind with a clean, simple layout:
>
>   * max-width container, centered, padding.
>   * risk levels colored:
>
>     * low = green-ish
>     * medium = yellow-ish
>     * high = orange-ish
>     * critical = red-ish
> * Use a reusable `RiskBadge` component for showing score + level.
> * Keep forms accessible and mobile-friendly.
>
> ### Deliverables
>
> * All pages under `src/app`.
> * Components under `src/components`.
> * Supabase schema + policies in `supabase/schema.sql`.
> * Risk scoring helper in `src/lib/riskScore.ts`.
> * Types in `src/types/index.ts`.
>
> At the end, add a short `README.md` explaining:
>
> * how to run DB migrations (schema.sql) in Supabase,
> * which env vars I must set,
> * how to log in to `/admin` (env var name for password).

---

If you want, next step after Cursor runs this is we go through:

* “Does `/site/[domain]` behave how you expect?”
* Adjust the **signals** and **weights** to better match your gut about what “dodgy” looks like.


-- Sites table
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  normalized_domain text not null,
  category text,
  country text,
  first_seen_at timestamptz not null default now(),
  last_checked_at timestamptz,
  risk_score integer not null default 0,
  risk_level text not null default 'low',
  total_signals integer not null default 0,
  total_reports integer not null default 0,
  manual_legit boolean not null default false,
  manual_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.sites (normalized_domain);
create index on public.sites (risk_score desc);
create index on public.sites (risk_level);

-- Risk signals table
create table public.risk_signals (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  type text not null,
  dimension text not null,
  severity integer not null,
  source text not null,
  description text,
  created_at timestamptz not null default now()
);

create index on public.risk_signals (site_id);
create index on public.risk_signals (type);

-- User reports table
create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  report_type text not null,
  description text,
  country text,
  order_value_band text,
  has_evidence boolean not null default false,
  contact_email text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index on public.user_reports (site_id);
create index on public.user_reports (status);

-- Crawl queue table
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

create index on public.crawl_queue (status);
create index on public.crawl_queue (inserted_at);

-- Enable RLS on all tables
alter table public.sites enable row level security;
alter table public.risk_signals enable row level security;
alter table public.user_reports enable row level security;
alter table public.crawl_queue enable row level security;

-- RLS Policies for sites
-- Select allowed for anon
create policy "sites_select_anon" on public.sites
  for select
  using (true);

-- Insert allowed for anon
create policy "sites_insert_anon" on public.sites
  for insert
  with check (true);

-- Update/delete only for service_role (no public policy)
-- These operations will require service_role key

-- RLS Policies for risk_signals
-- Select allowed for anon
create policy "risk_signals_select_anon" on public.risk_signals
  for select
  using (true);

-- Insert/update/delete reserved for service_role (no public policy)

-- RLS Policies for user_reports
-- Insert allowed for anon
create policy "user_reports_insert_anon" on public.user_reports
  for insert
  with check (true);

-- Select allowed for anon (but never display contact_email in app)
create policy "user_reports_select_anon" on public.user_reports
  for select
  using (true);

-- Update/delete reserved for service_role (no public policy)

-- RLS Policies for crawl_queue
-- All operations reserved for service_role (no public policy)
-- This table is managed by backend scripts only


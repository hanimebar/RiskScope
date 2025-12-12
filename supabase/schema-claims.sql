-- Products table
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'mobile_app',
  primary_url text,
  ios_app_id text,
  android_package text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.products (type);
create unique index products_ios_app_id_unique on public.products (ios_app_id) where ios_app_id is not null;
create unique index products_android_package_unique on public.products (android_package) where android_package is not null;

-- Claims table
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source_url text,
  claim_type text not null,
  claimed_value numeric not null,
  currency text not null default 'USD',
  timeframe_text text,
  raw_text text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index on public.claims (product_id);
create index on public.claims (status);

-- Verification metrics table
create table public.verification_metrics (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source text not null,
  metric_name text not null,
  metric_value numeric not null,
  extra jsonb,
  captured_at timestamptz not null default now()
);

create index on public.verification_metrics (product_id, source);
create index on public.verification_metrics (product_id, metric_name);

-- Claim assessments table
create table public.claim_assessments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  assessment_type text not null,
  verdict text not null,
  confidence numeric not null,
  max_plausible_estimate numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index on public.claim_assessments (claim_id);
create index on public.claim_assessments (verdict);

-- Enable RLS on all tables
alter table public.products enable row level security;
alter table public.claims enable row level security;
alter table public.verification_metrics enable row level security;
alter table public.claim_assessments enable row level security;

-- RLS Policies for products
-- Select allowed for anon
create policy "products_select_anon" on public.products
  for select
  using (true);

-- Insert allowed for anon
create policy "products_insert_anon" on public.products
  for insert
  with check (true);

-- Update/delete only for service_role (no public policy)

-- RLS Policies for claims
-- Select allowed for anon
create policy "claims_select_anon" on public.claims
  for select
  using (true);

-- Insert allowed for anon
create policy "claims_insert_anon" on public.claims
  for insert
  with check (true);

-- Update/delete only for service_role (no public policy)

-- RLS Policies for verification_metrics
-- Select allowed for anon
create policy "verification_metrics_select_anon" on public.verification_metrics
  for select
  using (true);

-- Insert/update/delete reserved for service_role (no public policy)

-- RLS Policies for claim_assessments
-- Select allowed for anon
create policy "claim_assessments_select_anon" on public.claim_assessments
  for select
  using (true);

-- Insert/update/delete reserved for service_role (no public policy)


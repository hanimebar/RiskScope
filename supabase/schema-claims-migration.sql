-- Migration: Extend verification_metrics for hybrid verification mode
-- Add is_verified flag to distinguish verified vs estimated metrics

alter table public.verification_metrics
add column if not exists is_verified boolean not null default false;

-- Add index for verified metrics lookups
create index if not exists verification_metrics_is_verified_idx 
on public.verification_metrics (product_id, is_verified) 
where is_verified = true;

-- Add comment for documentation
comment on column public.verification_metrics.is_verified is 
'True if this metric comes from verified source (e.g., Stripe), false for estimated/scraped data';


-- Soft per-user monthly usage meters (not analytics — threads.state remains the transcript source).
create table if not exists public.user_usage_limits (
  user_id text primary key not null references public."user" (id) on delete cascade,
  limit_usd double precision,
  updated_at timestamp default now() not null
);

create table if not exists public.user_usage_periods (
  user_id text not null references public."user" (id) on delete cascade,
  period_key text not null,
  used_usd double precision default 0 not null,
  updated_at timestamp default now() not null,
  primary key (user_id, period_key)
);

create index if not exists user_usage_periods_period_idx
  on public.user_usage_periods using btree (period_key);

-- Idempotency keys for Eve step.completed metering hooks (prevents double-count on retries).
create table if not exists public.usage_meter_events (
  event_id text primary key not null,
  user_id text not null references public."user" (id) on delete cascade,
  period_key text not null,
  cost_usd double precision default 0 not null,
  session_id text,
  turn_id text,
  step_index double precision,
  created_at timestamp default now() not null
);

create index if not exists usage_meter_events_user_period_idx
  on public.usage_meter_events using btree (user_id, period_key);

-- Company-wide default soft monthly cap (admin-editable without redeploy).
create table if not exists public.usage_meter_settings (
  id text primary key not null default 'default',
  default_limit_usd double precision not null,
  updated_at timestamp default now() not null
);

insert into public.usage_meter_settings (id, default_limit_usd)
values ('default', 10)
on conflict (id) do nothing;

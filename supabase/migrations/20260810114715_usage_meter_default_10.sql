-- Lower company default soft monthly cap from $13 to $10.
update public.usage_meter_settings
set default_limit_usd = 10,
    updated_at = now()
where id = 'default'
  and default_limit_usd = 13;

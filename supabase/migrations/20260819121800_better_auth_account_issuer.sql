-- Better Auth 1.7 scopes accounts by (issuer, account_id). Google rows use the
-- OpenID issuer; any leftover provider rows get the synthetic OAuth issuer.
-- Backfill before NOT NULL / unique index so existing data can migrate in place.

alter table public.account
  add column if not exists issuer text;

update public.account
set issuer = 'https://accounts.google.com'
where issuer is null
  and provider_id = 'google';

update public.account
set issuer = 'local:oauth:' || replace(provider_id, '/', '%2F')
where issuer is null;

alter table public.account
  alter column issuer set not null;

create unique index if not exists account_issuer_accountId_uidx
  on public.account using btree (issuer, account_id);

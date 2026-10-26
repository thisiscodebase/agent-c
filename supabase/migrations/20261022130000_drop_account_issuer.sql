-- Better Auth 1.7.3+ identifies accounts by (provider_id, account_id) and no
-- longer writes issuer. The 1.7.0–1.7.2 NOT NULL column rejects every sign-in.
drop index if exists public.account_issuer_accountId_uidx;

alter table public.account
  drop column if exists issuer;

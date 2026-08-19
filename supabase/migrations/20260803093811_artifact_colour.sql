-- Each artifact is "printed" on one of four paper stocks. Purely presentational,
-- but persisted so a document keeps the same colour everywhere it appears.
alter table public.artifacts
  add column if not exists colour text;

update public.artifacts
set colour = (array['white', 'peach', 'green', 'lilac'])[1 + (abs(hashtext(id)) % 4)]
where colour is null;

alter table public.artifacts
  alter column colour set default 'white';

alter table public.artifacts
  alter column colour set not null;

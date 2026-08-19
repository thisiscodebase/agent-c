-- Artifacts: durable markdown outputs the agent synthesizes (Phase 4 first slice).
-- Author-scoped for now; `status` is a lifecycle label, not a visibility control.
create table if not exists public.artifacts (
  id text primary key not null,
  author_id text not null references public."user" (id) on delete cascade,
  thread_id text references public.threads (id) on delete set null,
  type text not null,
  title text not null,
  content_markdown text not null,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp default now() not null,
  updated_at timestamp default now() not null
);

create index if not exists artifacts_author_updated_idx
  on public.artifacts using btree (author_id, updated_at);

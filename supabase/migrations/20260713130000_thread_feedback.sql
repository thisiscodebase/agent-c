-- Thread feedback for prompt-tuning (good/bad highlights from the chat UI).
create table if not exists public.thread_feedback (
  id text primary key not null,
  thread_id text not null references public.threads (id) on delete cascade,
  user_id text not null references public."user" (id) on delete cascade,
  rating text not null,
  comment text,
  message_id text,
  created_at timestamp default now() not null,
  updated_at timestamp default now() not null
);

create unique index if not exists thread_feedback_thread_user_idx
  on public.thread_feedback using btree (thread_id, user_id);

create index if not exists thread_feedback_rating_idx
  on public.thread_feedback using btree (rating, updated_at);

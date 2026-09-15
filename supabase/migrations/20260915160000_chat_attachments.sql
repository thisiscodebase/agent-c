-- Chat file attachments: metadata for objects in private Supabase Storage
-- bucket `chat-attachments`. App auth + service role; not Supabase Auth RLS.

create table if not exists public.chat_attachments (
  id text primary key not null,
  user_id text not null references public."user" (id) on delete cascade,
  thread_id text not null references public.threads (id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  page_count integer,
  row_count integer,
  created_at timestamp default now() not null
);

create index if not exists chat_attachments_user_thread_idx
  on public.chat_attachments using btree (user_id, thread_id);

create index if not exists chat_attachments_thread_idx
  on public.chat_attachments using btree (thread_id);

-- Private storage bucket for chat uploads (idempotent on hosted Supabase).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/csv',
    'application/json',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do nothing;

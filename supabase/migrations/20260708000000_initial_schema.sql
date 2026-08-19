-- Base Agent C schema (ported from Drizzle 0000 for supabase db push).
create extension if not exists vector;

create table if not exists public."user" (
  id text primary key not null,
  name text not null,
  email text not null,
  email_verified boolean default false not null,
  image text,
  created_at timestamp default now() not null,
  updated_at timestamp default now() not null,
  constraint user_email_unique unique (email)
);

create table if not exists public.account (
  id text primary key not null,
  account_id text not null,
  provider_id text not null,
  user_id text not null,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamp,
  refresh_token_expires_at timestamp,
  scope text,
  password text,
  created_at timestamp default now() not null,
  updated_at timestamp default now() not null
);

create table if not exists public.session (
  id text primary key not null,
  expires_at timestamp not null,
  token text not null,
  created_at timestamp default now() not null,
  updated_at timestamp default now() not null,
  ip_address text,
  user_agent text,
  user_id text not null,
  constraint session_token_unique unique (token)
);

create table if not exists public.verification (
  id text primary key not null,
  identifier text not null,
  value text not null,
  expires_at timestamp not null,
  created_at timestamp default now() not null,
  updated_at timestamp default now() not null
);

create table if not exists public.user_memory (
  id text primary key not null,
  user_id text not null,
  category text not null,
  content text not null,
  source text not null,
  created_at timestamp default now() not null,
  updated_at timestamp default now() not null
);

create table if not exists public.user_profiles (
  user_id text primary key not null,
  timezone text default 'UTC' not null,
  locale text default 'en' not null,
  bio text default '' not null,
  updated_at timestamp default now() not null
);

create table if not exists public.slack_link_codes (
  code text primary key not null,
  app_user_id text not null,
  expires_at timestamp not null,
  created_at timestamp default now() not null
);

create table if not exists public.slack_links (
  app_user_id text not null,
  slack_team_id text not null,
  slack_user_id text not null,
  slack_user_name text,
  slack_display_name text,
  slack_email text,
  linked_at timestamp default now() not null,
  constraint slack_links_slack_team_id_slack_user_id_pk primary key (slack_team_id, slack_user_id)
);

create table if not exists public.threads (
  id text primary key not null,
  user_id text not null,
  title text not null,
  state jsonb,
  created_at timestamp default now() not null,
  updated_at timestamp default now() not null
);

alter table public.account
  add constraint account_user_id_user_id_fk
  foreign key (user_id) references public."user"(id) on delete cascade on update no action;

alter table public.session
  add constraint session_user_id_user_id_fk
  foreign key (user_id) references public."user"(id) on delete cascade on update no action;

alter table public.user_memory
  add constraint user_memory_user_id_user_id_fk
  foreign key (user_id) references public."user"(id) on delete cascade on update no action;

alter table public.user_profiles
  add constraint user_profiles_user_id_user_id_fk
  foreign key (user_id) references public."user"(id) on delete cascade on update no action;

alter table public.threads
  add constraint threads_user_id_user_id_fk
  foreign key (user_id) references public."user"(id) on delete cascade on update no action;

create index if not exists "account_userId_idx" on public.account using btree (user_id);
create index if not exists "session_userId_idx" on public.session using btree (user_id);
create index if not exists verification_identifier_idx on public.verification using btree (identifier);
create index if not exists user_memory_user_category_idx on public.user_memory using btree (user_id, category);
create index if not exists slack_link_codes_app_user_idx on public.slack_link_codes using btree (app_user_id);
create unique index if not exists slack_links_app_user_idx on public.slack_links using btree (app_user_id);
create index if not exists threads_user_updated_idx on public.threads using btree (user_id, updated_at);

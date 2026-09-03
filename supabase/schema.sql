-- Capital Forge Phase 2 Supabase schema
-- Run this in a dedicated Capital Forge Supabase project before enabling cloud auth.
-- Security model: all user-owned rows are protected by RLS and owner predicates.

create extension if not exists pgcrypto;

create table if not exists public.capital_forge_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  goals text[] not null default '{}',
  experience_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.capital_forge_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.capital_forge_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  category text not null,
  concept text not null,
  answer text,
  score numeric(5,2) not null check (score >= 0 and score <= 10),
  is_correct boolean not null default false,
  confidence integer not null default 0 check (confidence >= 0 and confidence <= 100),
  time_taken_seconds integer,
  created_at timestamptz not null default now()
);

create table if not exists public.capital_forge_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  collection text not null default 'Review Later',
  created_at timestamptz not null default now(),
  primary key (user_id, question_id, collection)
);

create table if not exists public.capital_forge_question_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text,
  imported_count integer not null default 0,
  rejected_count integer not null default 0,
  import_payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.capital_forge_profiles enable row level security;
alter table public.capital_forge_user_state enable row level security;
alter table public.capital_forge_attempts enable row level security;
alter table public.capital_forge_bookmarks enable row level security;
alter table public.capital_forge_question_imports enable row level security;

grant select, insert, update, delete on public.capital_forge_profiles to authenticated;
grant select, insert, update, delete on public.capital_forge_user_state to authenticated;
grant select, insert, update, delete on public.capital_forge_attempts to authenticated;
grant select, insert, update, delete on public.capital_forge_bookmarks to authenticated;
grant select, insert, update, delete on public.capital_forge_question_imports to authenticated;

create policy "profiles_select_own" on public.capital_forge_profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "profiles_insert_own" on public.capital_forge_profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "profiles_update_own" on public.capital_forge_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "profiles_delete_own" on public.capital_forge_profiles
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_state_select_own" on public.capital_forge_user_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_state_insert_own" on public.capital_forge_user_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_state_update_own" on public.capital_forge_user_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_state_delete_own" on public.capital_forge_user_state
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "attempts_select_own" on public.capital_forge_attempts
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "attempts_insert_own" on public.capital_forge_attempts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "attempts_update_own" on public.capital_forge_attempts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "attempts_delete_own" on public.capital_forge_attempts
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "bookmarks_select_own" on public.capital_forge_bookmarks
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "bookmarks_insert_own" on public.capital_forge_bookmarks
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "bookmarks_update_own" on public.capital_forge_bookmarks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "bookmarks_delete_own" on public.capital_forge_bookmarks
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "imports_select_own" on public.capital_forge_question_imports
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "imports_insert_own" on public.capital_forge_question_imports
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "imports_update_own" on public.capital_forge_question_imports
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "imports_delete_own" on public.capital_forge_question_imports
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists capital_forge_attempts_user_created_idx on public.capital_forge_attempts(user_id, created_at desc);
create index if not exists capital_forge_attempts_user_concept_idx on public.capital_forge_attempts(user_id, concept);
create index if not exists capital_forge_bookmarks_user_idx on public.capital_forge_bookmarks(user_id, created_at desc);

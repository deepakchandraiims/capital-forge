-- Capital Forge Phase 3 Supabase schema
-- Recommended target: a dedicated Supabase project named capital-forge.
-- Security model: every user-owned table has RLS enabled plus owner predicates.

create extension if not exists pgcrypto;

create table if not exists public.capital_forge_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  goals text[] not null default '{}',
  experience_level text,
  target_roles text[] not null default '{}',
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
  import_name text,
  item_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.capital_forge_ai_coach_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text not null,
  feedback text not null,
  score numeric(5,2),
  mode text not null default 'local_or_ai',
  created_at timestamptz not null default now()
);

create table if not exists public.capital_forge_market_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  asset_class text,
  source_url text,
  source_name text,
  payload jsonb not null default '{}'::jsonb,
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.capital_forge_learning_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  export_type text not null default 'json_backup',
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists cfg_attempts_user_created_idx on public.capital_forge_attempts(user_id, created_at desc);
create index if not exists cfg_attempts_category_idx on public.capital_forge_attempts(user_id, category);
create index if not exists cfg_imports_user_created_idx on public.capital_forge_question_imports(user_id, created_at desc);
create index if not exists cfg_reviews_user_created_idx on public.capital_forge_ai_coach_reviews(user_id, created_at desc);
create index if not exists cfg_market_user_created_idx on public.capital_forge_market_challenges(user_id, created_at desc);

alter table public.capital_forge_profiles enable row level security;
alter table public.capital_forge_user_state enable row level security;
alter table public.capital_forge_attempts enable row level security;
alter table public.capital_forge_bookmarks enable row level security;
alter table public.capital_forge_question_imports enable row level security;
alter table public.capital_forge_ai_coach_reviews enable row level security;
alter table public.capital_forge_market_challenges enable row level security;
alter table public.capital_forge_learning_exports enable row level security;

create policy "profiles_select_own" on public.capital_forge_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles_insert_own" on public.capital_forge_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.capital_forge_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "state_select_own" on public.capital_forge_user_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "state_insert_own" on public.capital_forge_user_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "state_update_own" on public.capital_forge_user_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "attempts_select_own" on public.capital_forge_attempts for select to authenticated using ((select auth.uid()) = user_id);
create policy "attempts_insert_own" on public.capital_forge_attempts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "attempts_update_own" on public.capital_forge_attempts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "bookmarks_select_own" on public.capital_forge_bookmarks for select to authenticated using ((select auth.uid()) = user_id);
create policy "bookmarks_insert_own" on public.capital_forge_bookmarks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "bookmarks_delete_own" on public.capital_forge_bookmarks for delete to authenticated using ((select auth.uid()) = user_id);

create policy "imports_select_own" on public.capital_forge_question_imports for select to authenticated using ((select auth.uid()) = user_id);
create policy "imports_insert_own" on public.capital_forge_question_imports for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "reviews_select_own" on public.capital_forge_ai_coach_reviews for select to authenticated using ((select auth.uid()) = user_id);
create policy "reviews_insert_own" on public.capital_forge_ai_coach_reviews for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "market_select_public_or_own" on public.capital_forge_market_challenges for select to authenticated using (user_id is null or (select auth.uid()) = user_id);
create policy "market_insert_own" on public.capital_forge_market_challenges for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "exports_select_own" on public.capital_forge_learning_exports for select to authenticated using ((select auth.uid()) = user_id);
create policy "exports_insert_own" on public.capital_forge_learning_exports for insert to authenticated with check ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

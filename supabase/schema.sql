-- Capital Forge Phase 2 schema starter. Run after creating a Supabase project.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  goals text[] default '{}',
  experience_level text,
  created_at timestamptz default now()
);

create table if not exists questions (
  id text primary key,
  category text not null,
  subcategory text,
  concept text not null,
  title text not null,
  prompt text not null,
  question_type text not null,
  difficulty int not null check (difficulty between 1 and 7),
  role_level text,
  xp int default 10,
  options jsonb default '[]',
  correct_answer text,
  numeric_answer numeric,
  tolerance numeric,
  solution text not null,
  explanation text,
  hints jsonb default '[]',
  rubric jsonb default '[]',
  is_live boolean default false,
  created_at timestamptz default now()
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  question_id text references questions(id),
  answer text,
  score numeric,
  correct boolean,
  confidence int,
  created_at timestamptz default now()
);

create table if not exists mastery (
  user_id uuid references auth.users(id) on delete cascade,
  concept text not null,
  category text not null,
  score int default 40,
  attempts int default 0,
  accuracy int default 0,
  next_review timestamptz,
  primary key(user_id, concept)
);

create table if not exists bookmarks (
  user_id uuid references auth.users(id) on delete cascade,
  question_id text references questions(id),
  created_at timestamptz default now(),
  primary key(user_id, question_id)
);

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  body text not null,
  entry_type text default 'investment_note',
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table attempts enable row level security;
alter table mastery enable row level security;
alter table bookmarks enable row level security;
alter table journal_entries enable row level security;
alter table questions enable row level security;

create policy "profiles own rows" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "attempts own rows" on attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mastery own rows" on mastery for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bookmarks own rows" on bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "journal own rows" on journal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "published questions readable" on questions for select using (true);

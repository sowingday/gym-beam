create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  profile_gender text,
  profile_age integer,
  profile_height numeric,
  profile_weight numeric,
  profile_picture text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  follower_name text,
  following_name text,
  follower_email text,
  following_email text,
  created_at timestamptz not null default now(),
  constraint follows_unique unique (follower_id, following_id)
);

create table if not exists public.workout_shares (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text,
  recipient_name text,
  workout_name text not null,
  workout_data jsonb not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  color text,
  weekday text,
  weekdays jsonb,
  exercises jsonb not null default '[]'::jsonb,
  sort_order integer,
  workout_number integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  color text,
  exercises jsonb not null default '[]'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  date date not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  weight numeric not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.workout_shares enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_templates enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.body_weights enable row level security;

create policy "profiles_select_visible"
on public.profiles
for select
using (true);

create policy "profiles_insert_self"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "profiles_update_self"
on public.profiles
for update
using (auth.uid() = id);

create policy "follows_select_own"
on public.follows
for select
using (auth.uid() = follower_id or auth.uid() = following_id);

create policy "follows_insert_own"
on public.follows
for insert
with check (auth.uid() = follower_id);

create policy "follows_delete_own"
on public.follows
for delete
using (auth.uid() = follower_id);

create policy "workout_shares_select_own"
on public.workout_shares
for select
using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "workout_shares_insert_own"
on public.workout_shares
for insert
with check (auth.uid() = sender_id);

create policy "workout_shares_update_recipient"
on public.workout_shares
for update
using (auth.uid() = recipient_id);

create policy "workouts_select_own"
on public.workouts
for select
using (auth.uid() = user_id);

create policy "workouts_insert_own"
on public.workouts
for insert
with check (auth.uid() = user_id);

create policy "workouts_update_own"
on public.workouts
for update
using (auth.uid() = user_id);

create policy "workouts_delete_own"
on public.workouts
for delete
using (auth.uid() = user_id);

create policy "workout_templates_select_visible"
on public.workout_templates
for select
using (is_public = true or auth.uid() = user_id);

create policy "workout_templates_insert_own"
on public.workout_templates
for insert
with check (auth.uid() = user_id);

create policy "workout_templates_update_own"
on public.workout_templates
for update
using (auth.uid() = user_id);

create policy "workout_templates_delete_own"
on public.workout_templates
for delete
using (auth.uid() = user_id);

create policy "exercise_logs_select_own"
on public.exercise_logs
for select
using (auth.uid() = user_id);

create policy "exercise_logs_insert_own"
on public.exercise_logs
for insert
with check (auth.uid() = user_id);

create policy "exercise_logs_update_own"
on public.exercise_logs
for update
using (auth.uid() = user_id);

create policy "exercise_logs_delete_own"
on public.exercise_logs
for delete
using (auth.uid() = user_id);

create policy "body_weights_select_own"
on public.body_weights
for select
using (auth.uid() = user_id);

create policy "body_weights_insert_own"
on public.body_weights
for insert
with check (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant usage on schema public to anon;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select, insert, update on public.workout_shares to authenticated;
grant select, insert, update, delete on public.workouts to authenticated;
grant select on public.workout_templates to authenticated;
grant select, insert on public.achievements to authenticated;
grant select, insert, update on public.body_weights to authenticated;
grant select, insert on public.exercise_logs to authenticated;

create policy "body_weights_update_own"
on public.body_weights
for update
using (auth.uid() = user_id);

create policy "body_weights_delete_own"
on public.body_weights
for delete
using (auth.uid() = user_id);

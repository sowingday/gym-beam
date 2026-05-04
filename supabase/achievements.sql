create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  exercise_count integer not null default 0,
  training_duration integer not null default 0,
  workout_id uuid references public.workouts(id) on delete set null,
  workout_color text,
  created_at timestamptz not null default now()
);

alter table public.achievements enable row level security;

create policy "achievements_select_own"
on public.achievements
for select
using (auth.uid() = user_id);

create policy "achievements_insert_own"
on public.achievements
for insert
with check (auth.uid() = user_id);

create policy "achievements_update_own"
on public.achievements
for update
using (auth.uid() = user_id);

create policy "achievements_delete_own"
on public.achievements
for delete
using (auth.uid() = user_id);

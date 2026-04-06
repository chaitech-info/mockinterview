-- Mock-interview sessions for the PrepAI report page.
--
-- If you see: column "session_id" does not exist — an older table named
-- interview_sessions likely exists without that column. CREATE TABLE IF NOT EXISTS
-- would skip, then CREATE INDEX (session_id) fails. The DROP below fixes that.

drop table if exists public.interview_sessions cascade;

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  jd_text text,
  extracted jsonb,
  questions jsonb not null default '[]'::jsonb,
  question_scores jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interview_sessions_user_id_idx on public.interview_sessions (user_id);
create index interview_sessions_session_id_idx on public.interview_sessions (session_id);

alter table public.interview_sessions enable row level security;

create policy "interview_sessions_select_own"
  on public.interview_sessions for select
  using (auth.uid() = user_id);

create policy "interview_sessions_insert_own"
  on public.interview_sessions for insert
  with check (auth.uid() = user_id);

create policy "interview_sessions_update_own"
  on public.interview_sessions for update
  using (auth.uid() = user_id);

create policy "interview_sessions_delete_own"
  on public.interview_sessions for delete
  using (auth.uid() = user_id);

-- Plan entitlements + per-user interview usage (calendar month, UTC).
-- Run in Supabase SQL Editor or via CLI after linking the project.

create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free'
    check (plan in ('free', 'plan_3', 'plan_5')),
  updated_at timestamptz not null default now()
);

comment on table public.user_entitlements is
  'Subscription tier: free (default if row missing), plan_3, plan_5. Update via Paddle webhook or Supabase dashboard.';

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  n8n_session_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists interview_sessions_user_month
  on public.interview_sessions (user_id, created_at desc);

comment on table public.interview_sessions is
  'One row each time intake completes successfully; used to enforce monthly interview quotas.';

alter table public.user_entitlements enable row level security;
alter table public.interview_sessions enable row level security;

create policy "Users read own entitlement"
  on public.user_entitlements
  for select
  using (auth.uid () = user_id);

create policy "Users insert own interview session"
  on public.interview_sessions
  for insert
  with check (auth.uid () = user_id);

create policy "Users read own interview sessions"
  on public.interview_sessions
  for select
  using (auth.uid () = user_id);

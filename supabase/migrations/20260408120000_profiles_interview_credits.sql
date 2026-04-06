-- Interview credit balance lives on public.profiles (linked to auth.users).
-- user_entitlements keeps subscription plan only; interview_credits column there is legacy / unused by app after this migration.

-- 1) Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  interview_credits integer not null default 1,
  updated_at timestamptz not null default now()
);

-- If `profiles` already existed (e.g. Supabase starter) without this column:
alter table public.profiles
  add column if not exists interview_credits integer not null default 1;

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

comment on table public.profiles is
  'One row per user; interview_credits is remaining mock-interview starts.';

comment on column public.profiles.interview_credits is
  'Balance decremented when intake registers a session; incremented by Paddle webhooks.';

create index if not exists profiles_updated_at on public.profiles (updated_at desc);

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles
  for select
  using (auth.uid () = id);

-- 2) Backfill from existing user_entitlements + any auth users still missing a profile
insert into public.profiles (id, interview_credits, updated_at)
select e.user_id, greatest(e.interview_credits, 1), now()
from public.user_entitlements e
on conflict (id) do nothing;

insert into public.profiles (id, interview_credits, updated_at)
select u.id, 1, now()
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- 3) Atomic consume → profiles
create or replace function public.consume_interview_credit(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    return false;
  end if;
  update public.profiles
  set
    interview_credits = interview_credits - 1,
    updated_at = now()
  where id = p_user_id
    and interview_credits > 0;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

comment on function public.consume_interview_credit(uuid) is
  'Decrements profiles.interview_credits by 1 if > 0.';

revoke all on function public.consume_interview_credit(uuid) from public;
grant execute on function public.consume_interview_credit(uuid) to authenticated;

-- 4) Lazy bootstrap: profile (1 credit if new) + entitlement row for plan
create or replace function public.ensure_user_entitlements()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return;
  end if;
  insert into public.profiles (id, interview_credits, updated_at)
  values (uid, 1, now())
  on conflict (id) do nothing;

  insert into public.user_entitlements (user_id, plan, interview_credits, updated_at)
  values (uid, 'free', 0, now())
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.ensure_user_entitlements() from public;
grant execute on function public.ensure_user_entitlements() to authenticated;

-- 5) Paddle webhook: credits on profiles, plan on user_entitlements
create or replace function public.grant_purchase_credits(
  p_user_id uuid,
  p_delta integer,
  p_plan text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_delta is null or p_delta <= 0 then
    return;
  end if;
  if p_plan is null or p_plan not in ('free', 'plan_3', 'plan_5') then
    p_plan := 'free';
  end if;

  insert into public.profiles (id, interview_credits, updated_at)
  values (p_user_id, p_delta, now())
  on conflict (id) do update
  set
    interview_credits = public.profiles.interview_credits + p_delta,
    updated_at = now();

  insert into public.user_entitlements (user_id, plan, interview_credits, updated_at)
  values (p_user_id, p_plan, 0, now())
  on conflict (user_id) do update
  set
    plan = excluded.plan,
    updated_at = now();
end;
$$;

revoke all on function public.grant_purchase_credits(uuid, integer, text) from public;
grant execute on function public.grant_purchase_credits(uuid, integer, text) to service_role;

-- 6) New auth user: profile + entitlements row
create or replace function public.handle_new_user_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, interview_credits, updated_at)
  values (new.id, 1, now())
  on conflict (id) do nothing;

  insert into public.user_entitlements (user_id, plan, interview_credits, updated_at)
  values (new.id, 'free', 0, now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Interview credit balance + atomic consume + Paddle idempotency + new-user bootstrap.

-- 1) Balance column (number of mock interviews the user may still start)
alter table public.user_entitlements
  add column if not exists interview_credits integer not null default 0;

comment on column public.user_entitlements.interview_credits is
  'Balance of interview starts remaining; decremented when intake registers a session.';

-- 2) Backfill existing entitlement rows and users missing a row
update public.user_entitlements
set interview_credits = greatest(interview_credits, 1),
    updated_at = now()
where interview_credits < 1;

insert into public.user_entitlements (user_id, plan, interview_credits, updated_at)
select u.id, 'free', 1, now()
from auth.users u
where not exists (select 1 from public.user_entitlements e where e.user_id = u.id)
on conflict (user_id) do nothing;

-- 3) Idempotency for Paddle webhooks (service role only writes)
create table if not exists public.paddle_processed_events (
  id text primary key,
  processed_at timestamptz not null default now()
);

comment on table public.paddle_processed_events is
  'Paddle event or transaction ids already applied (credits granted).';

alter table public.paddle_processed_events enable row level security;

-- 4) Atomic credit consume (called from register-session with user JWT)
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
  update public.user_entitlements
  set
    interview_credits = interview_credits - 1,
    updated_at = now()
  where user_id = p_user_id
    and interview_credits > 0;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

comment on function public.consume_interview_credit(uuid) is
  'Decrements interview_credits by 1 if > 0. Returns true when a row was updated.';

revoke all on function public.consume_interview_credit(uuid) from public;
grant execute on function public.consume_interview_credit(uuid) to authenticated;

-- 4b) Lazy row for legacy accounts (no trigger row yet)
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
  insert into public.user_entitlements (user_id, plan, interview_credits, updated_at)
  values (uid, 'free', 1, now())
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.ensure_user_entitlements() from public;
grant execute on function public.ensure_user_entitlements() to authenticated;

-- 4c) Webhook (service role): add credits and set plan after one-time purchase
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
  insert into public.user_entitlements (user_id, plan, interview_credits, updated_at)
  values (p_user_id, p_plan, p_delta, now())
  on conflict (user_id) do update
  set
    interview_credits = public.user_entitlements.interview_credits + p_delta,
    plan = excluded.plan,
    updated_at = now();
end;
$$;

revoke all on function public.grant_purchase_credits(uuid, integer, text) from public;
grant execute on function public.grant_purchase_credits(uuid, integer, text) to service_role;

-- 5) New sign-up: one free credit row
create or replace function public.handle_new_user_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_entitlements (user_id, plan, interview_credits, updated_at)
  values (new.id, 'free', 1, now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_entitlements on auth.users;
create trigger on_auth_user_created_entitlements
  after insert on auth.users
  for each row
  execute function public.handle_new_user_entitlements();

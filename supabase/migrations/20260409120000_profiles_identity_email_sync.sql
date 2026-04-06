-- Profile identity fields (email, name, avatar) synced from auth.users.
-- auth_email_registered: server-only helper to check if an email is already registered.

alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists full_name text;

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  add column if not exists created_at timestamptz not null default now();

comment on column public.profiles.email is 'Copy of auth.users.email for queries and emails.';
comment on column public.profiles.full_name is 'Display name from OAuth metadata.';
comment on column public.profiles.avatar_url is 'Avatar URL from OAuth metadata.';

create index if not exists profiles_email_lower on public.profiles (lower(email));

-- Backfill from auth.users
update public.profiles p
set
  email = u.email,
  full_name = coalesce(
    nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')), ''),
    p.full_name
  ),
  avatar_url = coalesce(
    nullif(trim(coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', '')), ''),
    p.avatar_url
  ),
  created_at = coalesce(p.created_at, u.created_at, now())
from auth.users u
where u.id = p.id
  and (p.email is distinct from u.email or p.full_name is null or p.avatar_url is null);

-- Server-only: whether an email is already used in auth (for sign-in UX; call from trusted API only).
create or replace function public.auth_email_registered(p_email text)
returns boolean
language sql
stable
security definer
set search_path = auth
as $$
  select exists(
    select 1
    from auth.users
    where lower(trim(email)) = lower(trim(p_email))
  );
$$;

comment on function public.auth_email_registered(text) is
  'Returns true if auth.users has this email. Restrict to service_role / server routes (enumeration risk).';

revoke all on function public.auth_email_registered(text) from public;
grant execute on function public.auth_email_registered(text) to service_role;

-- Sync profile row when auth user metadata or email changes
create or replace function public.handle_auth_user_profile_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_avatar text;
begin
  v_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), '');
  v_avatar := nullif(trim(coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')), '');

  insert into public.profiles (id, email, full_name, avatar_url, interview_credits, created_at, updated_at)
  values (
    new.id,
    new.email,
    v_name,
    v_avatar,
    1,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    avatar_url = coalesce(nullif(excluded.avatar_url, ''), public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated_profile on auth.users;
create trigger on_auth_user_updated_profile
  after update on auth.users
  for each row
  execute function public.handle_auth_user_profile_sync();

-- Replace new-user handler to fill identity columns
create or replace function public.handle_new_user_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_avatar text;
begin
  v_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), '');
  v_avatar := nullif(trim(coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')), '');

  insert into public.profiles (id, email, full_name, avatar_url, interview_credits, created_at, updated_at)
  values (
    new.id,
    new.email,
    v_name,
    v_avatar,
    1,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do nothing;

  insert into public.user_entitlements (user_id, plan, interview_credits, updated_at)
  values (new.id, 'free', 0, now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- ensure_user_entitlements: upsert profile + plan from current session user
create or replace function public.ensure_user_entitlements()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  u_email text;
  v_name text;
  v_avatar text;
begin
  if uid is null then
    return;
  end if;

  select
    au.email,
    nullif(trim(coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')), ''),
    nullif(trim(coalesce(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture', '')), '')
  into u_email, v_name, v_avatar
  from auth.users au
  where au.id = uid;

  insert into public.profiles (id, email, full_name, avatar_url, interview_credits, created_at, updated_at)
  values (uid, u_email, v_name, v_avatar, 1, now(), now())
  on conflict (id) do update
  set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    avatar_url = coalesce(nullif(excluded.avatar_url, ''), public.profiles.avatar_url),
    updated_at = now();

  insert into public.user_entitlements (user_id, plan, interview_credits, updated_at)
  values (uid, 'free', 0, now())
  on conflict (user_id) do nothing;
end;
$$;

-- grant_purchase_credits: merge credits; pull identity from auth if row was missing fields
create or replace function public.grant_purchase_credits(
  p_user_id uuid,
  p_delta integer,
  p_plan text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  u_email text;
  v_name text;
  v_avatar text;
begin
  if p_user_id is null or p_delta is null or p_delta <= 0 then
    return;
  end if;
  if p_plan is null or p_plan not in ('free', 'plan_3', 'plan_5') then
    p_plan := 'free';
  end if;

  select
    au.email,
    nullif(trim(coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '')), ''),
    nullif(trim(coalesce(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture', '')), '')
  into u_email, v_name, v_avatar
  from auth.users au
  where au.id = p_user_id;

  insert into public.profiles (id, email, full_name, avatar_url, interview_credits, created_at, updated_at)
  values (p_user_id, u_email, v_name, v_avatar, p_delta, now(), now())
  on conflict (id) do update
  set
    interview_credits = public.profiles.interview_credits + p_delta,
    email = coalesce(public.profiles.email, excluded.email),
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    avatar_url = coalesce(nullif(public.profiles.avatar_url, ''), excluded.avatar_url),
    updated_at = now();

  insert into public.user_entitlements (user_id, plan, interview_credits, updated_at)
  values (p_user_id, p_plan, 0, now())
  on conflict (user_id) do update
  set
    plan = excluded.plan,
    updated_at = now();
end;
$$;

-- Fix empty profiles.email / full_name / avatar_url on first sign-in.
-- Google OAuth often uses given_name + family_name; email may live only in metadata until updated.

create or replace function public.handle_auth_user_profile_sync()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_name text;
  v_avatar text;
  m jsonb;
begin
  m := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  v_email := coalesce(
    nullif(trim(new.email), ''),
    nullif(trim(m->>'email'), '')
  );

  v_name := nullif(trim(coalesce(
    m->>'full_name',
    m->>'name',
    nullif(
      trim(coalesce(m->>'given_name', '') || ' ' || coalesce(m->>'family_name', '')),
      ''
    )
  )), '');

  v_avatar := nullif(trim(coalesce(
    m->>'avatar_url',
    m->>'picture'
  )), '');

  insert into public.profiles (id, email, full_name, avatar_url, interview_credits, created_at, updated_at)
  values (
    new.id,
    v_email,
    v_name,
    v_avatar,
    1,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update
  set
    email = coalesce(nullif(excluded.email, ''), public.profiles.email),
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    avatar_url = coalesce(nullif(excluded.avatar_url, ''), public.profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

create or replace function public.handle_new_user_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_name text;
  v_avatar text;
  m jsonb;
begin
  m := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  v_email := coalesce(
    nullif(trim(new.email), ''),
    nullif(trim(m->>'email'), '')
  );

  v_name := nullif(trim(coalesce(
    m->>'full_name',
    m->>'name',
    nullif(
      trim(coalesce(m->>'given_name', '') || ' ' || coalesce(m->>'family_name', '')),
      ''
    )
  )), '');

  v_avatar := nullif(trim(coalesce(
    m->>'avatar_url',
    m->>'picture'
  )), '');

  insert into public.profiles (id, email, full_name, avatar_url, interview_credits, created_at, updated_at)
  values (
    new.id,
    v_email,
    v_name,
    v_avatar,
    1,
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update
  set
    email = coalesce(nullif(excluded.email, ''), public.profiles.email),
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    avatar_url = coalesce(nullif(excluded.avatar_url, ''), public.profiles.avatar_url),
    updated_at = now();

  insert into public.user_entitlements (user_id, plan, interview_credits, updated_at)
  values (new.id, 'free', 0, now())
  on conflict (user_id) do nothing;
  return new;
end;
$$;

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
    coalesce(
      nullif(trim(au.email), ''),
      nullif(trim((coalesce(au.raw_user_meta_data, '{}'::jsonb))->>'email'), '')
    ),
    nullif(trim(coalesce(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      nullif(
        trim(
          coalesce(au.raw_user_meta_data->>'given_name', '') || ' ' ||
          coalesce(au.raw_user_meta_data->>'family_name', '')
        ),
        ''
      )
    )), ''),
    nullif(trim(coalesce(
      au.raw_user_meta_data->>'avatar_url',
      au.raw_user_meta_data->>'picture'
    )), '')
  into u_email, v_name, v_avatar
  from auth.users au
  where au.id = uid;

  insert into public.profiles (id, email, full_name, avatar_url, interview_credits, created_at, updated_at)
  values (uid, u_email, v_name, v_avatar, 1, now(), now())
  on conflict (id) do update
  set
    email = coalesce(nullif(excluded.email, ''), public.profiles.email),
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    avatar_url = coalesce(nullif(excluded.avatar_url, ''), public.profiles.avatar_url),
    updated_at = now();

  insert into public.user_entitlements (user_id, plan, interview_credits, updated_at)
  values (uid, 'free', 0, now())
  on conflict (user_id) do nothing;
end;
$$;

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
    coalesce(
      nullif(trim(au.email), ''),
      nullif(trim((coalesce(au.raw_user_meta_data, '{}'::jsonb))->>'email'), '')
    ),
    nullif(trim(coalesce(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      nullif(
        trim(
          coalesce(au.raw_user_meta_data->>'given_name', '') || ' ' ||
          coalesce(au.raw_user_meta_data->>'family_name', '')
        ),
        ''
      )
    )), ''),
    nullif(trim(coalesce(
      au.raw_user_meta_data->>'avatar_url',
      au.raw_user_meta_data->>'picture'
    )), '')
  into u_email, v_name, v_avatar
  from auth.users au
  where au.id = p_user_id;

  insert into public.profiles (id, email, full_name, avatar_url, interview_credits, created_at, updated_at)
  values (p_user_id, u_email, v_name, v_avatar, p_delta, now(), now())
  on conflict (id) do update
  set
    interview_credits = public.profiles.interview_credits + p_delta,
    email = coalesce(nullif(public.profiles.email, ''), excluded.email),
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

-- Backfill rows that were created before identity sync landed
update public.profiles p
set
  email = coalesce(nullif(trim(u.email), ''), nullif(trim((coalesce(u.raw_user_meta_data, '{}'::jsonb))->>'email'), ''), p.email),
  full_name = coalesce(
    nullif(trim(coalesce(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      nullif(
        trim(
          coalesce(u.raw_user_meta_data->>'given_name', '') || ' ' ||
          coalesce(u.raw_user_meta_data->>'family_name', '')
        ),
        ''
      )
    )), ''),
    p.full_name
  ),
  avatar_url = coalesce(
    nullif(trim(coalesce(
      u.raw_user_meta_data->>'avatar_url',
      u.raw_user_meta_data->>'picture'
    )), ''),
    p.avatar_url
  ),
  updated_at = now()
from auth.users u
where u.id = p.id
  and (
    p.email is null
    or trim(p.email) = ''
    or p.full_name is null
    or trim(p.full_name) = ''
    or p.avatar_url is null
    or trim(p.avatar_url) = ''
  );

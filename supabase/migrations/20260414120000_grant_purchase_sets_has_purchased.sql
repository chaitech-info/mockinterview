-- Set has_purchased when credits are granted via Paddle (single source of truth in DB).

alter table public.profiles
add column if not exists has_purchased boolean not null default false;

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

  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    interview_credits,
    has_purchased,
    created_at,
    updated_at
  )
  values (p_user_id, u_email, v_name, v_avatar, p_delta, true, now(), now())
  on conflict (id) do update
  set
    interview_credits = public.profiles.interview_credits + p_delta,
    has_purchased = true,
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

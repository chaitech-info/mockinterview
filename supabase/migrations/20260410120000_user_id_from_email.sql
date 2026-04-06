-- Map purchaser email (from Paddle custom_data) to auth.users.id for webhooks.

create or replace function public.user_id_from_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = auth
as $$
  select id
  from auth.users
  where lower(trim(email)) = lower(trim(p_email))
  limit 1;
$$;

comment on function public.user_id_from_email(text) is
  'Looks up auth user id by email; used when Paddle checkout sends email in custom_data.';

revoke all on function public.user_id_from_email(text) from public;
grant execute on function public.user_id_from_email(text) to service_role;

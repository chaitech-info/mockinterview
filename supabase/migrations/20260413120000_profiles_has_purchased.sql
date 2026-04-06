-- Tracks whether the user has purchased (credits or paid plan) so the mock interview can unlock the full question bank.

alter table public.profiles
add column if not exists has_purchased boolean not null default false;

comment on column public.profiles.has_purchased is 'At least one purchase; unlocks full mock interview question bank.';

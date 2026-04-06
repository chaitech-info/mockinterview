-- Per-question scores for reports (optional if column already exists)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'sessions'
  ) then
    alter table public.sessions
      add column if not exists question_scores jsonb not null default '[]'::jsonb;
  end if;
end $$;

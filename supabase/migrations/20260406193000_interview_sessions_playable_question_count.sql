-- How many questions from questions[] the user may answer; remainder are preview-only (locked in UI).
alter table public.interview_sessions
  add column if not exists playable_question_count integer;

comment on column public.interview_sessions.playable_question_count is
  'Number of leading questions from questions[] that are playable; null means all (legacy rows).';

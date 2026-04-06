-- App stores playable logic client-side only; column is unused.
alter table public.interview_sessions
  drop column if exists playable_question_count;

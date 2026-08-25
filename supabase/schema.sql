create table if not exists public.triage_sessions (
  id text primary key,
  day text not null,
  evaluation_date date,
  evaluator_name text,
  team_name text,
  payload jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  synced_at timestamptz not null default now()
);

create index if not exists triage_sessions_day_idx
  on public.triage_sessions (day);

create index if not exists triage_sessions_evaluation_date_idx
  on public.triage_sessions (evaluation_date);

create index if not exists triage_sessions_updated_at_idx
  on public.triage_sessions (updated_at desc);

create table if not exists public.triage_app_state (
  key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

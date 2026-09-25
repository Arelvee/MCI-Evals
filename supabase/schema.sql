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

-- Only the server's service-role connection can access training records.
alter table public.triage_sessions enable row level security;
alter table public.triage_app_state enable row level security;

-- Atomic under concurrent upserts: reconnecting old devices cannot revert edits.
create or replace function public.keep_newest_triage_session()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.updated_at <= old.updated_at then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists triage_session_version_guard on public.triage_sessions;
create trigger triage_session_version_guard
before update on public.triage_sessions
for each row execute function public.keep_newest_triage_session();

-- Preserve scorebook entries from other devices during a partial upload.
create or replace function public.merge_triage_scorebook()
returns trigger language plpgsql set search_path = public as $$
declare
  entry record;
  merged jsonb := old.payload;
begin
  for entry in select key, value from jsonb_each(new.payload) loop
    if not (merged ? entry.key) or
       coalesce(entry.value->>'updatedAt', '') > coalesce(merged->entry.key->>'updatedAt', '') then
      merged := jsonb_set(merged, array[entry.key], entry.value);
    end if;
  end loop;
  new.payload := merged;
  return new;
end;
$$;

drop trigger if exists triage_scorebook_merge on public.triage_app_state;
create trigger triage_scorebook_merge before update on public.triage_app_state
for each row execute function public.merge_triage_scorebook();

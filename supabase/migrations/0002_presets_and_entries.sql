-- Saved filter-criteria presets the streamer can re-apply from the dashboard.
create table if not exists presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table presets enable row level security;
-- Admin-only feature; all access goes through server routes using the
-- service role key, so no anon policy is needed.

-- Trigger-word entry system (Nightbot-style "type !join to enter"):
-- viewers must post `settings.trigger_word` in chat while entries are open
-- to become eligible for a draw. `entries_session` is bumped every time
-- entries are (re-)opened so old entries from a previous giveaway don't
-- carry over.
alter table settings add column if not exists trigger_word text not null default '!join';
alter table settings add column if not exists entries_open boolean not null default false;
alter table settings add column if not exists entries_session integer not null default 0;

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  session integer not null,
  participant_id uuid not null references participants(id) on delete cascade,
  entered_at timestamptz not null default now(),
  unique (session, participant_id)
);

alter table entries enable row level security;

create index if not exists idx_entries_session on entries (session);

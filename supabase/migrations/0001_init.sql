-- Participants: viewers who linked their Twitch + osu! accounts
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  twitch_id text not null unique,
  twitch_login text not null,
  twitch_display_name text not null,
  osu_id bigint not null unique,
  osu_username text not null,
  linked_at timestamptz not null default now()
);

-- Cached osu! profile stats, refreshed on link (and on-demand before a draw)
create table if not exists osu_stats (
  participant_id uuid primary key references participants(id) on delete cascade,
  global_rank integer,
  country_rank integer,
  country_code text,
  pp numeric,
  accuracy numeric,
  playcount integer,
  top_play_pp numeric,
  top_play_sr numeric,
  updated_at timestamptz not null default now()
);

-- History of winner draws, with the criteria used and how it was triggered
create table if not exists draws (
  id uuid primary key default gen_random_uuid(),
  criteria jsonb not null default '{}'::jsonb,
  winner_participant_id uuid references participants(id) on delete set null,
  triggered_by text not null check (triggered_by in ('dashboard', 'chat')),
  created_at timestamptz not null default now()
);

-- Single-row table holding the streamer's currently configured draw
-- criteria, so the !pickwinner chat command can reuse whatever was last
-- set on the dashboard.
create table if not exists settings (
  id text primary key default 'default',
  criteria jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into settings (id) values ('default') on conflict (id) do nothing;
alter table settings enable row level security;
-- Admin-only table, no anon policy: only the service role (server routes) reads/writes it.

create index if not exists idx_osu_stats_global_rank on osu_stats (global_rank);
create index if not exists idx_osu_stats_country_rank on osu_stats (country_rank);
create index if not exists idx_osu_stats_pp on osu_stats (pp);
create index if not exists idx_draws_created_at on draws (created_at desc);

alter table participants enable row level security;
alter table osu_stats enable row level security;
alter table draws enable row level security;

-- All writes go through server-side routes using the service role key
-- (which bypasses RLS), so only read policies are defined below. None of
-- this data is sensitive -- twitch/osu usernames and osu stats are all
-- public information and the whole point of `draws` is to be displayed
-- live on the streamer's OBS overlay -- so anon (the overlay page, using
-- the public anon key) is allowed read-only SELECT.
create policy "anon can read draws" on draws for select to anon using (true);
create policy "anon can read participants" on participants for select to anon using (true);
create policy "anon can read osu_stats" on osu_stats for select to anon using (true);

alter publication supabase_realtime add table draws;

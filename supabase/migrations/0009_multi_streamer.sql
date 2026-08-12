-- Multi-streamer: every streamer gets their own giveaway state instead of
-- the app serving the single channel named by STREAMER_TWITCH_ID.
--
-- `streamers` is created on first login to /admin (via the streamer OAuth
-- flow, which also collects the `channel:bot` consent the shared bot
-- account needs to post in that channel). Everything that used to be
-- global -- settings, presets, entries, draws -- is scoped to a streamer.
create table if not exists streamers (
  id uuid primary key default gen_random_uuid(),
  twitch_id text not null unique,
  twitch_login text not null,
  twitch_display_name text not null,
  -- Whether the broadcaster granted `channel:bot`, i.e. allowed our bot
  -- account to read/write their chat. Without it, EventSub subscribe and
  -- chat announcements fail.
  bot_scope_granted boolean not null default false,
  -- Id of this channel's channel.chat.message EventSub subscription, kept
  -- so re-subscribing can delete the previous one instead of piling up.
  eventsub_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table streamers enable row level security;
-- Server routes use the service role key. The overlay page resolves a
-- streamer by login server-side, so anon needs no access here.

-- settings: one row per streamer instead of the single id='default' row.
alter table settings add column if not exists streamer_id uuid references streamers(id) on delete cascade;
create unique index if not exists settings_streamer_id_key on settings (streamer_id);
alter table settings alter column id set default gen_random_uuid()::text;

alter table presets add column if not exists streamer_id uuid references streamers(id) on delete cascade;
create index if not exists idx_presets_streamer on presets (streamer_id);

alter table entries add column if not exists streamer_id uuid references streamers(id) on delete cascade;
drop index if exists entries_session_twitch_id_key;
create unique index if not exists entries_streamer_session_twitch_id_key
  on entries (streamer_id, session, twitch_id);
create index if not exists idx_entries_streamer_session on entries (streamer_id, session);

alter table draws add column if not exists streamer_id uuid references streamers(id) on delete cascade;
create index if not exists idx_draws_streamer on draws (streamer_id, created_at desc);

-- The legacy rows (streamer_id is null) belong to whoever STREAMER_TWITCH_ID
-- pointed at. They are claimed at runtime the first time that Twitch account
-- registers as a streamer -- see adoptLegacyRows() in src/lib/streamers.ts --
-- since SQL alone can't tell which login that id belongs to.

-- The bot account row stays global (id='default'): it is now the *app's*
-- shared bot, linked once by the operator, posting into every registered
-- streamer's chat -- rather than something each streamer has to set up
-- with their own account.
comment on table bot_credentials is
  'Single app-wide bot account used to read/post chat in every registered streamer''s channel.';

-- Stores the bot account's Twitch refresh token in the DB (encrypted at
-- rest with SESSION_SECRET) instead of requiring it to be pasted into env
-- vars + a redeploy every time the bot account is (re-)linked.
create table if not exists bot_credentials (
  id text primary key default 'default',
  twitch_bot_user_id text not null,
  refresh_token_encrypted text not null,
  updated_at timestamptz not null default now()
);
alter table bot_credentials enable row level security;
-- Admin-only table, no anon policy: only the service role (server routes) reads/writes it.

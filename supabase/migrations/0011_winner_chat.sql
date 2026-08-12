-- Live chat of the winner, shown in the reveal modal (Nightbot shows the
-- same thing): everything the drawn viewer types *after* being picked.
--
-- Deliberately not a chat log. Nothing is stored until someone wins, only
-- that one person's messages are kept, and capture stops on its own after
-- `chat_capture_until` -- so the app never accumulates the chat history of
-- an audience that never asked to be recorded.

-- Who to capture for lives on `settings` because the EventSub webhook
-- already reads that row for every single chat message. Any other home
-- would mean a second query per message just to answer "is this the
-- winner?" -- the by far most common answer being "no".
alter table settings add column if not exists chat_capture_draw_id uuid;
alter table settings add column if not exists chat_capture_twitch_id text;
alter table settings add column if not exists chat_capture_until timestamptz;

create table if not exists winner_messages (
  id uuid primary key default gen_random_uuid(),
  streamer_id uuid not null references streamers(id) on delete cascade,
  -- Scoped to the draw, so a second draw in the same session starts with a
  -- clean feed instead of inheriting the previous winner's messages.
  draw_id uuid not null references draws(id) on delete cascade,
  twitch_id text not null,
  message text not null,
  sent_at timestamptz not null default now()
);

create index if not exists idx_winner_messages_draw on winner_messages (draw_id, sent_at);

alter table winner_messages enable row level security;
-- No anon policy: unlike `draws`, this is viewer chat. It is read through
-- the session-protected /api/admin/winner route with the service role key,
-- never from the browser.

comment on table winner_messages is
  'Chat messages a drawn winner sent after being picked, kept only for the reveal modal.';

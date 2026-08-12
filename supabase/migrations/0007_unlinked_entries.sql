-- Allows viewers who only typed the trigger word (never linked a Twitch +
-- osu! account) to still be picked when the streamer explicitly wants to
-- ignore osu! criteria for a draw. Previously tryAddEntry silently dropped
-- anyone without a `participants` row, so a plain "!join to enter"
-- giveaway had no way to include them.
alter table entries add column if not exists twitch_id text;
alter table entries add column if not exists twitch_login text;
alter table entries add column if not exists twitch_display_name text;
alter table entries alter column participant_id drop not null;

update entries e
set twitch_id = p.twitch_id, twitch_login = p.twitch_login, twitch_display_name = p.twitch_display_name
from participants p
where e.participant_id = p.id and e.twitch_id is null;

alter table entries alter column twitch_id set not null;
alter table entries alter column twitch_login set not null;
alter table entries alter column twitch_display_name set not null;

alter table entries drop constraint if exists entries_session_participant_id_key;
create unique index if not exists entries_session_twitch_id_key on entries (session, twitch_id);

-- Denormalize the winner's identity onto `draws` itself so history/overlay/
-- the admin winner modal can display a name without joining through
-- `participants` -- which a winner may not even have a row in anymore.
alter table draws add column if not exists winner_twitch_id text;
alter table draws add column if not exists winner_twitch_display_name text;
alter table draws add column if not exists winner_osu_username text;

update draws d
set winner_twitch_id = p.twitch_id,
    winner_twitch_display_name = p.twitch_display_name,
    winner_osu_username = p.osu_username
from participants p
where d.winner_participant_id = p.id and d.winner_twitch_id is null;

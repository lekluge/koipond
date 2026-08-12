-- Nightbot-style giveaway settings, extending the existing settings row.
-- remove_spammers: when true (default), an entry chat message must match
--   the trigger word exactly; when false, the trigger word may appear
--   anywhere in the message (more lenient).
-- unique_winners: when true, participants who already won a past draw are
--   excluded from future draws.
-- chat_announcement: when true, picking a winner from the dashboard also
--   posts the result to Twitch chat via the bot (chat-triggered
--   !pickwinner picks already always announce).
alter table settings add column if not exists remove_spammers boolean not null default true;
alter table settings add column if not exists unique_winners boolean not null default false;
alter table settings add column if not exists chat_announcement boolean not null default true;

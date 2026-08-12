-- Nightbot-style luck modifiers: multiply a viewer's odds of being picked
-- based on their tier. Applied with priority VIP > Subscriber > Regular >
-- Viewer (highest applicable tier wins, not stacked).
alter table settings add column if not exists viewer_luck_modifier numeric not null default 1;
alter table settings add column if not exists regular_luck_modifier numeric not null default 1;
alter table settings add column if not exists subscriber_luck_modifier numeric not null default 1;
alter table settings add column if not exists vip_luck_modifier numeric not null default 1;

-- Manually curated "regulars" list (Twitch logins, one per line) -- Twitch
-- has no native "regular" badge, unlike subscriber/vip which we can read
-- straight off the chatter's badges at entry time.
alter table settings add column if not exists regulars text not null default '';

-- Subscriber/VIP status captured from the chatter's badges at the moment
-- they entered (typed the trigger word), since re-checking later would
-- need extra Twitch API calls/scopes.
alter table entries add column if not exists is_subscriber boolean not null default false;
alter table entries add column if not exists is_vip boolean not null default false;

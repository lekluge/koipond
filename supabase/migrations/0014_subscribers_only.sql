-- "Subscribers only" restricts a draw to entrants who carried a subscriber
-- (or founder) badge when they entered. Like the toggles next to it, it is a
-- giveaway setting rather than a per-click option, so !pickwinner in chat
-- honours it too.
alter table settings add column if not exists subscribers_only boolean not null default false;

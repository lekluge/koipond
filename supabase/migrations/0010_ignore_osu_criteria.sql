-- "Ignore osu! criteria" was a per-click checkbox whose state lived in a
-- URL query parameter, so it was lost on every save and never applied to
-- draws triggered by !pickwinner in chat. It is a giveaway setting like
-- the toggles next to it, so it belongs in the settings row.
alter table settings add column if not exists ignore_osu_criteria boolean not null default false;

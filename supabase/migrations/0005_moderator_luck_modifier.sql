-- Nightbot's giveaway settings actually have five tiers, not four --
-- Moderator was missed in the initial pass.
alter table settings add column if not exists moderator_luck_modifier numeric not null default 1;
alter table entries add column if not exists is_moderator boolean not null default false;

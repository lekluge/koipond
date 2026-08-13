-- Second giveaway mode: instead of drawing from everyone who typed a keyword,
-- the app picks a secret number and the first chatter to guess it wins
-- outright. A channel runs one mode at a time.
alter table settings add column if not exists draw_mode text not null default 'keyword';
alter table settings add constraint settings_draw_mode_check check (draw_mode in ('keyword', 'number'));
alter table settings add column if not exists number_min integer not null default 1;
alter table settings add column if not exists number_max integer not null default 100;
alter table settings add column if not exists number_target integer;
alter table settings add column if not exists number_drawn_at timestamptz;

-- Lets a streamer reveal a winner without putting their rank, pp and top play
-- on screen. Applies to both giveaway types and to both places a winner is
-- shown: the OBS overlay and the dashboard popup.
alter table settings add column if not exists hide_osu_stats boolean not null default false;

-- The draw carries the decision that was in force when it happened, rather
-- than the reveal reading the setting live. An OBS browser source is loaded
-- once and left running for weeks, so a page-load snapshot would keep showing
-- stats long after the streamer switched them off -- failing in exactly the
-- direction this setting exists to prevent. `draws` is already the row both
-- reveals subscribe to, so the flag arrives with the event itself.
alter table draws add column if not exists hide_osu_stats boolean not null default false;

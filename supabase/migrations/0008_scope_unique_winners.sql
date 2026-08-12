-- "Unique Winners" was excluding anyone who had EVER won, in the entire
-- history of the app -- so a streamer drawing multiple winners out of one
-- batch of entries (e.g. 5 winners from 20 people) would run out of
-- eligible candidates after just a couple of picks, with no feedback,
-- because most/all entrants had already won at some earlier point.
-- Scope it to the entries session a draw happened in instead, so it only
-- prevents repeat winners *within the same giveaway round*.
alter table draws add column if not exists session integer;
create index if not exists idx_draws_session on draws (session);

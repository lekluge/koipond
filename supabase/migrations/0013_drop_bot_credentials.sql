-- The bot account is configured through TWITCH_BOT_USER_ID, so the table
-- that used to hold it (and the encrypted refresh token that came with the
-- "Link bot account" flow) has no reader left. Chat is sent with the app
-- access token, which needs no stored token at all.
drop table if exists bot_credentials;

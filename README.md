<div align="center">

# 🎱 Koipond

**Giveaway tool for Twitch streamers, built around osu! profiles.**

[![Live at koipond.live](https://img.shields.io/badge/live-koipond.live-a855f7?style=flat-square)](https://www.koipond.live)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_+_Realtime-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Twitch EventSub](https://img.shields.io/badge/Twitch-EventSub-9146FF?style=flat-square&logo=twitch&logoColor=white)](https://dev.twitch.tv/docs/eventsub/)
[![osu! API v2](https://img.shields.io/badge/osu!-API_v2-FF66AA?style=flat-square&logo=osu&logoColor=white)](https://osu.ppy.sh/docs/index.html)
[![License](https://img.shields.io/badge/license-all_rights_reserved-lightgrey?style=flat-square)](LICENSE)

[Try the demo](#try-it-without-any-setup) · [What it does](#what-it-does) · [Setup](#setup) ·
[Local development](#local-development) · [Deployment](#deployment)

</div>

Viewers link their Twitch and osu! accounts once, then enter a giveaway by typing a keyword in
chat — the way Nightbot works. The streamer draws a random winner from everyone who entered,
optionally filtered by osu! criteria (global rank, pp, top play, accuracy, country, …) and
weighted by role. The result pops up on the dashboard and on a transparent overlay page meant
for OBS.

One installation serves any number of channels. A streamer logs in at `/admin`, which registers
their channel and grants the app's shared bot account permission to read and write in their
chat — so nobody has to run their own bot or sit in their own chat with a second account.
Settings, presets, entries, draws and the overlay are separate per channel.

## Try it without any setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000/demo`. No Supabase, Twitch or osu! credentials needed — a dozen
dummy participants are preloaded, the login steps are simulated, and criteria and draws run
against an in-memory store. Open `/demo/admin` and `/demo/overlay` side by side to see both
ends of it.

The demo store lives in the memory of the running dev server and is not meant for deployment.

## What it does

- **Keyword entries** — every chat message is checked against the channel's trigger word.
  Optionally requires an exact match, so people can't sneak extra text into an entry.
- **osu! criteria** — draw only from players within a rank, pp, accuracy, playcount, top-play
  or country range. Rank-digit presets are built in, custom presets can be saved per channel.
  Criteria can also be ignored entirely to draw from everyone who typed the keyword.
- **Luck modifiers** — give subscribers, VIPs, moderators or a manually kept list of regulars
  more tickets. When several apply to the same person, the highest one counts.
- **Unique winners** — exclude people who already won in the current round.
- **Two ways to draw** — a button on the dashboard, or `!pickwinner` in chat from the streamer
  or a moderator.
- **Live dashboard** — entrants appear as they enter, pushed over Supabase Realtime rather than
  polled.
- **Winner reveal** — who they are on Twitch, how old the account is, what badges they carried
  when they entered, their osu! stats, and their chat messages from the moment they were drawn.
- **Chat panel** — the embedded Twitch chat, plus an alternative view that renders the channel's
  7TV, BetterTTV and FrankerFaceZ emotes, which an embedded iframe cannot do.
- **OBS overlay** — a transparent page per channel showing the most recent winner.

## Built with

Next.js (App Router) · TypeScript · Tailwind · Supabase (Postgres, Realtime) · Twitch EventSub
webhooks · osu! API v2 · deployed on Vercel.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the files in `supabase/migrations/` in order in the SQL editor.
3. From `Settings → API`, note the project URL, the `anon` key and the `service_role` key.

### 2. Twitch application

1. Create an app at [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps).
2. Register two OAuth redirect URLs:
   - `<NEXT_PUBLIC_APP_URL>/api/auth/twitch/callback` — viewer login
   - `<NEXT_PUBLIC_APP_URL>/api/auth/twitch/streamer/callback` — streamer login, including the
     `channel:bot` grant
3. Note the client ID and secret.
4. `TWITCH_EVENTSUB_SECRET`: any long random string. It signs the webhook.
5. `ALLOWED_STREAMER_TWITCH_IDS` (optional): an allowlist, if not every Twitch account should be
   able to register a channel.

### 3. osu! application

1. Create an app at [osu.ppy.sh/home/account/edit#oauth](https://osu.ppy.sh/home/account/edit#oauth).
2. Callback URL: `<NEXT_PUBLIC_APP_URL>/api/auth/osu/callback`.
3. Note the client ID and secret.

### 4. Environment

Copy `.env.example` to `.env.local` and fill it in. `SESSION_SECRET` is any long random string
that signs the session cookies.

### 5. Run it

```bash
npm install
npm run dev
```

- `/link` — public page where viewers connect Twitch and osu!
- `/admin` — the logged-in streamer's dashboard; the first login registers the channel
- `/overlay/<twitch-name>` — transparent page for an OBS browser source

## Local development

### A local database instead of the real one

Once real giveaways run on an installation, local work must not touch its data. The whole
Supabase stack runs in Docker:

```bash
npx supabase start
```

This starts Postgres, PostgREST, Realtime and Studio (`http://127.0.0.1:54323`) and applies
every migration. Point `.env.local` at it:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from the supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from the same output>
```

Twitch and osu! stay the real services — only the data is local. The database starts empty, so
logging in at `/admin` registers the channel again.

- `npx supabase db reset` — drop the database and replay every migration. The honest test for a
  new migration, because it runs the whole chain from scratch.
- `npx supabase stop` — stop the containers, keeping the data.
- `node scripts/simulate-chat.mjs <twitch-login> 20` — send chat messages to the dashboard
  without Twitch, for anything that depends on chat without needing a public URL.

### Receiving real chat locally

Only needed when the webhook path itself is what you are working on; the script above covers the
rest. Twitch delivers events to public https URLs only:

```bash
cloudflared tunnel --url http://localhost:3000
```

Put the resulting URL in `.env.local` as `EVENTSUB_PUBLIC_URL`, restart the dev server, then
click "Connect bot to my chat" at `/admin`. Logins keep using `NEXT_PUBLIC_APP_URL`
(`http://localhost:3000`), and only the webhook goes through the tunnel — so no new OAuth
redirect URL has to be registered with Twitch. Leave `EVENTSUB_PUBLIC_URL` empty in deployments.

Note that this moves that channel's subscription to your machine until you reconnect from the
deployed app: Twitch allows exactly one per channel. Only ever do this with your own test
channel.

## Connecting the bot

**Once, as the operator** — decide which account posts in every channel, the counterpart to
"Nightbot is always @nightbot":

```bash
node scripts/get-bot-token.mjs
```

The script prints a code and a link to `twitch.tv/activate`. Log in there as the bot account and
confirm; this grants the app the `user:bot` scope. What you need from the output is
`TWITCH_BOT_USER_ID`, which goes into the environment. It is the only place the bot is
configured.

Chat messages are sent with the app access token rather than a token of the bot's own — that is
[Twitch's condition for the chatbot badge](https://dev.twitch.tv/docs/chat/#chatbot-badge-and-chat-identity)
and for the account showing up under "Chat Bots" in the viewer list. Twitch also withholds the
badge when bot and broadcaster are the same account, so use a separate account for the bot.

**Per streamer**, done by each streamer: log in at `/admin` and grant `channel:bot`, then click
"Connect bot to my chat". That creates the `channel.chat.message` EventSub subscription for
their channel. From then on `!pickwinner` from the streamer or a moderator triggers a draw, and
every chat message is checked against their trigger word.

## Deployment

Deploys as a standard Next.js app; [Vercel](https://vercel.com/new) is what it runs on. Set the
environment variables from `.env.example`, point `NEXT_PUBLIC_APP_URL` at the final domain, and
update the OAuth redirect URLs accordingly.

Two things worth knowing:

- **Put the functions in the same region as the database.** Every request makes several database
  round trips, and a deployment on another continent pays that distance on each one.
- **After a domain change, every streamer has to click "Connect bot to my chat" again**, so the
  EventSub subscription points at the new callback URL.

## License

All rights reserved. The code is public so it can be read and reviewed, not so it
can be reused — see [LICENSE](LICENSE). Ask if you want to do anything with it.

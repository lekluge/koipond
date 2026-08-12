import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const login = (process.argv[2] ?? "tiggy_dev").toLowerCase();
const count = Number(process.argv[3] ?? 8);
const DELAY_MS = 1000;

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: streamer, error } = await db
  .from("streamers")
  .select("id, twitch_id, twitch_display_name")
  .eq("twitch_login", login)
  .maybeSingle();
if (error) throw error;
if (!streamer) {
  console.error(`No registered streamer with login "${login}".`);
  process.exit(1);
}

const [userRes, globalRes] = await Promise.all([
  fetch(`https://7tv.io/v3/users/twitch/${streamer.twitch_id}`),
  fetch("https://7tv.io/v3/emote-sets/global"),
]);
const channelEmotes = userRes.ok ? ((await userRes.json()).emote_set?.emotes ?? []) : [];
const globalEmotes = globalRes.ok ? ((await globalRes.json()).emotes ?? []) : [];
const emoteNames = [...channelEmotes, ...globalEmotes].map((e) => e.name);
console.log(
  `${streamer.twitch_display_name}: ${channelEmotes.length} channel + ${globalEmotes.length} global 7TV emotes`,
);

const CHATTERS = [
  { login: "moonlightmika", name: "MoonlightMika", color: "#ff69b4", badges: ["subscriber"] },
  { login: "pixel_purr", name: "pixel_purr", color: "#1a1a1a", badges: [] }, // near-black on purpose
  { login: "koifanatic", name: "KoiFanatic", color: "#00ff7f", badges: ["vip", "subscriber"] },
  { login: "rhythmrogue", name: "rhythmrogue", color: null, badges: ["moderator"] },
  { login: login, name: streamer.twitch_display_name, color: "#a970ff", badges: ["broadcaster"] },
];

const TEXTS = [
  "hallo zusammen {e}",
  "{e} {e} {e}",
  "!join",
  "das ist eine laengere nachricht, damit man sieht wie der umbruch aussieht wenn jemand ausholt {e}",
  "gl hf {e}",
  "wer gewinnt? {e} {e}",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const emote = () => (emoteNames.length > 0 ? pick(emoteNames) : "PepePls");

function buildFragments(text) {
  const filled = text.replace(/\{e\}/g, () => emote());
  const fragments = [{ text: filled }];
  if (Math.random() < 0.3) {
    fragments.push({ text: " Kappa", emoteUrl: "https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/2.0" });
  }
  return fragments;
}

const topic = `streamer:${streamer.id}:chat`;
console.log(`Sending ${count} messages to ${topic}\n`);

for (let i = 0; i < count; i++) {
  const chatter = pick(CHATTERS);
  const payload = {
    id: `sim-${Date.now()}-${i}`,
    login: chatter.login,
    name: chatter.name,
    color: chatter.color,
    badges: chatter.badges,
    fragments: buildFragments(pick(TEXTS)),
  };

  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: [{ topic, event: "ping", payload }] }),
  });

  console.log(
    `  ${res.status === 202 ? "ok " : res.status} ${chatter.name}: ${payload.fragments.map((f) => f.text).join("")}`,
  );
  await new Promise((r) => setTimeout(r, DELAY_MS));
}

process.exit(0);

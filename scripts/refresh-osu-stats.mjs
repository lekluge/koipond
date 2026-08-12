import { createClient } from "@supabase/supabase-js";

const API_URL = "https://osu.ppy.sh/api/v2";
const DELAY_MS = 1500;

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OSU_CLIENT_ID",
  "OSU_CLIENT_SECRET",
];

const env = Object.fromEntries(REQUIRED.map((key) => [key, process.env[key]]));

const missing = REQUIRED.filter((key) => !env[key]);
if (missing.length > 0) {
  console.error(
    `Missing ${missing.join(", ")}.\n` +
      "Pass an env file, e.g. `node --env-file=.env.local scripts/refresh-osu-stats.mjs`.",
  );
  process.exit(1);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const tokenRes = await fetch("https://osu.ppy.sh/oauth/token", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({
    client_id: env.OSU_CLIENT_ID,
    client_secret: env.OSU_CLIENT_SECRET,
    grant_type: "client_credentials",
    scope: "public",
  }),
});
const { access_token } = await tokenRes.json();
if (!access_token) {
  console.error("Could not get an osu! app token");
  process.exit(1);
}
const headers = { Authorization: `Bearer ${access_token}` };

const { data: participants, error } = await db
  .from("participants")
  .select("id, osu_id, osu_username")
  .not("osu_id", "is", null);
if (error) throw error;

console.log(`Refreshing ${participants.length} participants on ${new URL(env.NEXT_PUBLIC_SUPABASE_URL).host}…`);
let changed = 0;

for (const [i, p] of participants.entries()) {
  try {
    const [profileRes, bestRes] = await Promise.all([
      fetch(`${API_URL}/users/${p.osu_id}/osu`, { headers }),
      fetch(`${API_URL}/users/${p.osu_id}/scores/best?mode=osu&limit=1`, { headers }),
    ]);
    if (!profileRes.ok) {
      console.warn(`  ${p.osu_username}: profile ${profileRes.status}, skipped`);
      continue;
    }
    const profile = await profileRes.json();
    const stats = profile.statistics ?? {};

    let topPlayPp = null;
    let topPlaySr = null;
    let modLabel = "";
    if (bestRes.ok) {
      const best = (await bestRes.json())[0];
      if (best) {
        topPlayPp = best.pp ?? null;
        topPlaySr = best.beatmap?.difficulty_rating ?? null;
        const mods = (best.mods ?? [])
          .map((m) => (typeof m === "string" ? m : m?.acronym))
          .filter(Boolean);
        if (best.beatmap?.id && mods.length > 0) {
          const attrRes = await fetch(`${API_URL}/beatmaps/${best.beatmap.id}/attributes`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ mods, ruleset: "osu" }),
          });
          if (attrRes.ok) {
            const sr = (await attrRes.json())?.attributes?.star_rating;
            if (typeof sr === "number") {
              modLabel = ` +${mods.join("")} (was ${topPlaySr?.toFixed(2)})`;
              topPlaySr = sr;
              changed++;
            }
          }
        }
      }
    }

    const { error: upsertError } = await db.from("osu_stats").upsert(
      {
        participant_id: p.id,
        global_rank: stats.global_rank ?? null,
        country_rank: stats.country_rank ?? null,
        country_code: profile.country?.code ?? null,
        pp: stats.pp ?? null,
        accuracy: stats.hit_accuracy ?? null,
        playcount: stats.play_count ?? null,
        top_play_pp: topPlayPp,
        top_play_sr: topPlaySr,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "participant_id" },
    );
    if (upsertError) throw upsertError;

    console.log(`  [${i + 1}/${participants.length}] ${p.osu_username}: ${topPlaySr?.toFixed(2) ?? "—"}★${modLabel}`);
  } catch (err) {
    console.warn(`  ${p.osu_username}: failed --`, String(err).slice(0, 120));
  }

  await new Promise((r) => setTimeout(r, DELAY_MS));
}

console.log(`Done. ${changed} of ${participants.length} had a mod-adjusted star rating.`);
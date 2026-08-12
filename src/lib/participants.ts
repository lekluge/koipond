import "server-only";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { fetchOsuStats, type OsuMe } from "@/lib/osu";
import type { Session } from "@/lib/session";

export async function linkParticipant(session: Session, osu: OsuMe) {
  const db = supabaseAdmin();

  const { data: participant, error } = await db
    .from("participants")
    .upsert(
      {
        twitch_id: session.twitchId,
        twitch_login: session.twitchLogin,
        twitch_display_name: session.twitchDisplayName,
        osu_id: osu.id,
        osu_username: osu.username,
      },
      { onConflict: "twitch_id" },
    )
    .select()
    .single();

  if (error) throw error;

  const stats = await fetchOsuStats(osu.id);

  const { error: statsError } = await db.from("osu_stats").upsert(
    {
      participant_id: participant.id,
      global_rank: stats.globalRank,
      country_rank: stats.countryRank,
      country_code: stats.countryCode,
      pp: stats.pp,
      accuracy: stats.accuracy,
      playcount: stats.playcount,
      top_play_pp: stats.topPlayPp,
      top_play_sr: stats.topPlaySr,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "participant_id" },
  );

  if (statsError) throw statsError;

  return participant;
}

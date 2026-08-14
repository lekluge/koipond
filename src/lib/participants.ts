import "server-only";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { fetchOsuStats, type OsuMe, type OsuStats } from "@/lib/osu";
import type { Session } from "@/lib/session";

export async function countLinkedParticipants(): Promise<number | null> {
  try {
    const { count, error } = await supabaseAdmin()
      .from("participants")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return count ?? null;
  } catch (err) {
    console.error("Counting linked participants failed", err);
    return null;
  }
}

export async function saveOsuStats(participantId: string, stats: OsuStats) {
  const { error } = await supabaseAdmin().from("osu_stats").upsert(
    {
      participant_id: participantId,
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
  if (error) throw error;
}

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

  await saveOsuStats(participant.id, await fetchOsuStats(osu.id));

  return participant;
}

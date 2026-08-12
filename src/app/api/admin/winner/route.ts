import { NextResponse, type NextRequest } from "next/server";
import { getSessionStreamer } from "@/lib/streamers";
import { getDraw } from "@/lib/draw";
import { getEntryFlagsFor } from "@/lib/entries";
import { getWinnerMessages } from "@/lib/winnerChat";
import { getTwitchProfile } from "@/lib/twitch";

export async function GET(req: NextRequest) {
  const streamer = await getSessionStreamer();
  if (!streamer) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  const drawId = req.nextUrl.searchParams.get("drawId");
  if (!drawId) {
    return NextResponse.json({ error: "drawId required" }, { status: 400 });
  }
  const since = req.nextUrl.searchParams.get("since") ?? undefined;

  const draw = await getDraw(streamer.id, drawId);
  if (!draw || !draw.winner_twitch_id) {
    return NextResponse.json({ error: "unknown draw" }, { status: 404 });
  }

  const [profile, flags, messages] = await Promise.all([
    getTwitchProfile(draw.winner_twitch_id).catch((err) => {
      console.error("Winner profile lookup failed", err);
      return null;
    }),
    getEntryFlagsFor(streamer.id, draw.session, draw.winner_twitch_id),
    getWinnerMessages(streamer.id, drawId, since),
  ]);

  return NextResponse.json({
    displayName: draw.winner_twitch_display_name,
    osuUsername: draw.winner_osu_username,
    drawnAt: draw.created_at,
    profile,
    badges: flags,
    messages,
  });
}

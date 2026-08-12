import { NextResponse } from "next/server";
import { getSessionStreamer } from "@/lib/streamers";
import { getEntrants, getEntrySettings } from "@/lib/entries";
import { getPastWinnerIds } from "@/lib/draw";

export async function GET() {
  const streamer = await getSessionStreamer();
  if (!streamer) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  const settings = await getEntrySettings(streamer.id);
  const [entrants, pastWinners] = await Promise.all([
    getEntrants(streamer.id, settings),
    getPastWinnerIds(streamer.id, settings.entriesSession),
  ]);

  return NextResponse.json({
    triggerWord: settings.triggerWord,
    entriesOpen: settings.entriesOpen,
    uniqueWinners: settings.uniqueWinners,
    entrants,
    pastWinnerTwitchIds: Array.from(pastWinners),
  });
}

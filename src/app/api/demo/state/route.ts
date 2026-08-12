import { NextResponse } from "next/server";
import {
  getChatLog,
  getDraws,
  getEntryState,
  getLatestDraw,
  getParticipants,
  getPastWinnerTwitchIds,
  getSettings,
  loadCriteria,
} from "@/lib/demoStore";
import { demoEnabled } from "@/lib/demo";

export async function GET() {
  if (!demoEnabled()) return NextResponse.json({ error: "demo mode is disabled" }, { status: 404 });

  const entryState = getEntryState();
  const settings = getSettings();
  const pastWinnerTwitchIds = settings.uniqueWinners
    ? Array.from(getPastWinnerTwitchIds(entryState.entriesSession))
    : [];

  return NextResponse.json({
    participants: getParticipants(),
    criteria: loadCriteria(),
    latestDraw: getLatestDraw(),
    draws: getDraws(),
    entryState,
    settings,
    pastWinnerTwitchIds,
    chatLog: getChatLog(),
  });
}

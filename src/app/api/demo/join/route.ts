import { NextRequest, NextResponse } from "next/server";
import { addParticipant } from "@/lib/demoStore";
import { demoEnabled } from "@/lib/demo";

export async function POST(req: NextRequest) {
  if (!demoEnabled()) return NextResponse.json({ error: "demo mode is disabled" }, { status: 404 });

  const { twitchDisplayName, osuUsername } = (await req.json()) as {
    twitchDisplayName: string;
    osuUsername: string;
  };
  if (!twitchDisplayName?.trim() || !osuUsername?.trim()) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const participant = addParticipant(twitchDisplayName.trim(), osuUsername.trim());
  return NextResponse.json(participant);
}

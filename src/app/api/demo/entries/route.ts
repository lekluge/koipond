import { NextRequest, NextResponse } from "next/server";
import { getEntryState, getSettings, updateSettings, startEntries, stopEntries, type GiveawaySettings } from "@/lib/demoStore";
import { demoEnabled } from "@/lib/demo";

export async function GET() {
  if (!demoEnabled()) return NextResponse.json({ error: "demo mode is disabled" }, { status: 404 });

  return NextResponse.json({ entryState: getEntryState(), settings: getSettings() });
}

export async function POST(req: NextRequest) {
  if (!demoEnabled()) return NextResponse.json({ error: "demo mode is disabled" }, { status: 404 });

  const body = (await req.json()) as
    | { action: "start" | "stop" }
    | { action: "saveSettings"; settings: Partial<GiveawaySettings> };

  if (body.action === "start") startEntries();
  else if (body.action === "stop") stopEntries();
  else if (body.action === "saveSettings") updateSettings(body.settings);

  return NextResponse.json({ entryState: getEntryState(), settings: getSettings() });
}

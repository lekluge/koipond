import { NextRequest, NextResponse } from "next/server";
import { pickWinner, saveCriteria, updateSettings, type DemoCriteria, type GiveawaySettings } from "@/lib/demoStore";
import { demoEnabled } from "@/lib/demo";

export async function POST(req: NextRequest) {
  if (!demoEnabled()) return NextResponse.json({ error: "demo mode is disabled" }, { status: 404 });

  const body = (await req.json()) as {
    criteria: DemoCriteria;
    ignoreOsuCriteria: boolean;
    settings: Partial<GiveawaySettings>;
  };

  updateSettings(body.settings);
  saveCriteria(body.criteria);
  const result = pickWinner(body.criteria, "dashboard", body.ignoreOsuCriteria);
  return NextResponse.json(result);
}

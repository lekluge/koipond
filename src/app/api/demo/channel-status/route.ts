import { NextResponse } from "next/server";
import { getChannelStatus } from "@/lib/demoStore";
import { demoEnabled } from "@/lib/demo";

export async function GET() {
  if (!demoEnabled()) return NextResponse.json({ error: "demo mode is disabled" }, { status: 404 });
  return NextResponse.json(getChannelStatus());
}

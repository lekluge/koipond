import { NextResponse } from "next/server";
import { resetDemo } from "@/lib/demoStore";
import { demoEnabled } from "@/lib/demo";

export async function POST() {
  if (!demoEnabled()) return NextResponse.json({ error: "demo mode is disabled" }, { status: 404 });

  resetDemo();
  return NextResponse.json({ ok: true });
}

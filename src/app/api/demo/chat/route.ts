import { NextRequest, NextResponse } from "next/server";
import { simulateChatMessage } from "@/lib/demoStore";
import { demoEnabled } from "@/lib/demo";

export async function POST(req: NextRequest) {
  if (!demoEnabled()) return NextResponse.json({ error: "demo mode is disabled" }, { status: 404 });

  const body = (await req.json()) as {
    participantId?: string;
    guestName?: string;
    text: string;
    isSubscriber?: boolean;
    isVip?: boolean;
    isModerator?: boolean;
  };
  return NextResponse.json(simulateChatMessage(body));
}

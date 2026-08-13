import { NextResponse } from "next/server";
import { getSessionStreamer } from "@/lib/streamers";
import { getChannelStatus } from "@/lib/channelStatus";

export const dynamic = "force-dynamic";

export async function GET() {
  const streamer = await getSessionStreamer();
  if (!streamer) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  return NextResponse.json(await getChannelStatus(streamer));
}

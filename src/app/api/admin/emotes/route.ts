import { NextResponse } from "next/server";
import { getSessionStreamer } from "@/lib/streamers";
import { getChatEmotes } from "@/lib/chatEmotes";

export async function GET() {
  const streamer = await getSessionStreamer();
  if (!streamer) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  try {
    const emotes = await getChatEmotes(streamer.twitchId);
    return NextResponse.json({ emotes });
  } catch (err) {
    console.error("Emote lookup failed", err);
    return NextResponse.json({ emotes: {} });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isDuplicateMessage, isFreshMessage, verifyEventSubSignature } from "@/lib/eventsubVerify";
import { sendTwitchChatMessage } from "@/lib/twitch";
import { loadCriteria, pickWinner, recordNumberWinner } from "@/lib/draw";
import { claimSecretNumber, getEntrySettings, parseGuess, tryAddEntry } from "@/lib/entries";
import { captureWinnerMessage } from "@/lib/winnerChat";
import { broadcastToStreamer } from "@/lib/realtimeBroadcast";
import { getStreamerByTwitchId } from "@/lib/streamers";

type MessageFragment = {
  type: string;
  text: string;
  emote?: { id: string };
};

type ChatMessageEvent = {
  broadcaster_user_id: string;
  chatter_user_id: string;
  chatter_user_login: string;
  chatter_user_name: string;
  message_id?: string;
  message: { text: string; fragments?: MessageFragment[] };
  color?: string;
  badges: { set_id: string }[];
};

function chatPayload(event: ChatMessageEvent) {
  const fragments = (event.message.fragments ?? [{ type: "text", text: event.message.text }]).map(
    (fragment) => ({
      text: fragment.text,
      emoteUrl: fragment.emote?.id
        ? `https://static-cdn.jtvnw.net/emoticons/v2/${fragment.emote.id}/default/dark/2.0`
        : undefined,
    }),
  );

  return {
    id: event.message_id ?? `${event.chatter_user_id}-${Date.now()}`,
    login: event.chatter_user_login,
    name: event.chatter_user_name,
    color: event.color || null,
    badges: (event.badges ?? []).map((b) => b.set_id),
    fragments,
  };
}

function isAuthorized(event: ChatMessageEvent, streamerTwitchId: string): boolean {
  if (event.chatter_user_id === streamerTwitchId) return true;
  return event.badges?.some((b) => b.set_id === "moderator" || b.set_id === "broadcaster") ?? false;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const messageId = req.headers.get("Twitch-Eventsub-Message-Id") ?? "";
  const timestamp = req.headers.get("Twitch-Eventsub-Message-Timestamp") ?? "";
  const signature = req.headers.get("Twitch-Eventsub-Message-Signature");
  const messageType = req.headers.get("Twitch-Eventsub-Message-Type");

  const valid = verifyEventSubSignature(
    { messageId, timestamp, signature },
    rawBody,
    env.twitchEventSubSecret,
  );
  if (!valid) {
    return new NextResponse("invalid signature", { status: 403 });
  }
  if (!isFreshMessage(timestamp)) {
    return new NextResponse("stale message", { status: 403 });
  }

  const body = JSON.parse(rawBody);

  if (messageType === "webhook_callback_verification") {
    return new NextResponse(body.challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  if (messageType === "revocation") {
    console.warn("EventSub subscription revoked", body.subscription);
    return new NextResponse(null, { status: 204 });
  }

  if (messageType === "notification" && body.subscription?.type === "channel.chat.message") {
    if (isDuplicateMessage(messageId)) {
      return new NextResponse(null, { status: 204 });
    }

    const event = body.event as ChatMessageEvent;
    const rawText = event.message?.text?.trim() ?? "";
    const text = rawText.toLowerCase();

    const streamer = await getStreamerByTwitchId(event.broadcaster_user_id);
    if (!streamer) {
      console.warn("Chat message for unregistered channel", event.broadcaster_user_id);
      return new NextResponse(null, { status: 204 });
    }

    await broadcastToStreamer(streamer.id, "chat", chatPayload(event));

    const settings = await getEntrySettings(streamer.id);

    try {
      const entered = await tryAddEntry(
        streamer.id,
        event.chatter_user_id,
        event.chatter_user_login,
        event.chatter_user_name,
        rawText,
        event.badges,
        settings,
      );
      if (entered) await broadcastToStreamer(streamer.id, "entries");
    } catch (err) {
      console.error("Entry handling failed", err);
    }

    if (settings.drawMode === "number" && settings.entriesOpen) {
      try {
        const guess = parseGuess(rawText, settings.numberMin, settings.numberMax);
        const isSubscriber = (event.badges ?? []).some(
          (b) => b.set_id === "subscriber" || b.set_id === "founder",
        );

        if (guess !== null && (!settings.subscribersOnly || isSubscriber)) {
          const session = await claimSecretNumber(streamer.id, guess);
          if (session !== null) {
            const { osuUsername } = await recordNumberWinner(
              streamer.id,
              session,
              {
                twitchId: event.chatter_user_id,
                twitchLogin: event.chatter_user_login,
                twitchDisplayName: event.chatter_user_name,
              },
              settings.hideOsuStats,
            );

            if (settings.chatAnnouncement) {
              await sendTwitchChatMessage(
                event.broadcaster_user_id,
                `🎉 ${event.chatter_user_name} guessed ${guess} and wins!${osuUsername ? ` (osu! ${osuUsername})` : ""}`,
              );
            }
          }
        }
      } catch (err) {
        console.error("Number guess handling failed", err);
      }
    }

    try {
      const captured = await captureWinnerMessage(streamer.id, settings, event.chatter_user_id, rawText);
      if (captured) await broadcastToStreamer(streamer.id, "winner-chat");
    } catch (err) {
      console.error("Winner chat capture failed", err);
    }

    if (text.startsWith("!pickwinner") && isAuthorized(event, streamer.twitchId)) {
      try {
        if (settings.drawMode === "number") {
          await sendTwitchChatMessage(
            event.broadcaster_user_id,
            "This channel is running a number guess — the winner is whoever guesses the number first.",
          );
          return new NextResponse(null, { status: 204 });
        }

        const criteria = await loadCriteria(streamer.id);
        const { winner } = await pickWinner(
          streamer.id,
          criteria,
          "chat",
          settings.ignoreOsuCriteria,
        );
        const reply = winner
          ? `🎉 Winner: ${winner.twitchDisplayName}${winner.osuUsername ? ` (osu! ${winner.osuUsername})` : ""}`
          : "No participants currently match the criteria.";
        await sendTwitchChatMessage(event.broadcaster_user_id, reply);
      } catch (err) {
        console.error("!pickwinner handling failed", err);
      }
    }

    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}

import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSessionStreamer, setEventSubSubscriptionId } from "@/lib/streamers";
import {
  deleteChatSubscriptionsFor,
  deleteEventSubSubscription,
  subscribeToChatMessages,
  waitForChatSubscriptionStatus,
} from "@/lib/twitch";
import { probeEventSubCallback } from "@/lib/eventsubProbe";

function back(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  return NextResponse.redirect(`${env.appUrl}/admin?${query}`, { status: 303 });
}

export async function POST() {
  const streamer = await getSessionStreamer();
  if (!streamer) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }

  if (!streamer.botScopeGranted) {
    return back({ error: "bot_scope" });
  }

  const callbackUrl = env.eventsubCallbackUrl;

  if (!callbackUrl.startsWith("https://")) {
    return back({ error: "eventsub_https" });
  }

  if (!env.botUserId) {
    return back({ error: "no_bot" });
  }

  const probe = await probeEventSubCallback(callbackUrl, env.twitchEventSubSecret);
  if (!probe.ok) {
    console.error("EventSub callback probe failed", callbackUrl, probe.reason);
    return back({ error: "eventsub_unreachable", detail: `${callbackUrl}: ${probe.reason}` });
  }

  try {
    await deleteChatSubscriptionsFor(streamer.twitchId);
    await setEventSubSubscriptionId(streamer.id, null);

    const subscription = await subscribeToChatMessages(
      streamer.twitchId,
      callbackUrl,
      env.twitchEventSubSecret,
    );

    const status = await waitForChatSubscriptionStatus(streamer.twitchId, subscription.id);
    await setEventSubSubscriptionId(streamer.id, subscription.id);

    if (status === "enabled") {
      return back({ bot: "connected" });
    }

    if (status === "webhook_callback_verification_pending") {
      return back({ error: "eventsub_pending" });
    }

    await deleteEventSubSubscription(subscription.id);
    await setEventSubSubscriptionId(streamer.id, null);
    return back({ error: "eventsub_verification", detail: status });
  } catch (err) {
    console.error("EventSub subscribe failed", err);
    return back({ error: "eventsub", detail: String(err).slice(0, 300) });
  }
}

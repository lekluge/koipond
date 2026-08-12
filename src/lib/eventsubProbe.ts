import "server-only";
import { createHmac, randomUUID } from "crypto";

export type ProbeResult = { ok: true } | { ok: false; reason: string };

export async function probeEventSubCallback(callbackUrl: string, secret: string): Promise<ProbeResult> {
  const messageId = randomUUID();
  const timestamp = new Date().toISOString();
  const challenge = randomUUID();
  const body = JSON.stringify({
    challenge,
    subscription: { id: randomUUID(), type: "channel.chat.message", status: "webhook_callback_verification_pending" },
  });
  const signature = "sha256=" + createHmac("sha256", secret).update(messageId + timestamp + body).digest("hex");

  let res: Response;
  try {
    res = await fetch(callbackUrl, {
      method: "POST",
      redirect: "manual",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Twitch-Eventsub-Message-Id": messageId,
        "Twitch-Eventsub-Message-Timestamp": timestamp,
        "Twitch-Eventsub-Message-Signature": signature,
        "Twitch-Eventsub-Message-Type": "webhook_callback_verification",
      },
      body,
    });
  } catch (err) {
    return { ok: false, reason: `the URL could not be reached (${String(err).slice(0, 120)})` };
  }

  if (res.status >= 300 && res.status < 400) {
    return { ok: false, reason: `it redirects to ${res.headers.get("location") ?? "somewhere else"}` };
  }
  const text = (await res.text()).trim();

  if (res.status === 403 && text === "invalid signature") {
    return { ok: false, reason: "the app at this URL runs with a different TWITCH_EVENTSUB_SECRET" };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, reason: `it answers ${res.status} -- deployment protection or a password in front of the app?` };
  }
  if (!res.ok) {
    return { ok: false, reason: `it answers ${res.status}` };
  }
  if (text !== challenge) {
    return { ok: false, reason: "it answered, but not with Twitch's challenge -- something else is serving this URL" };
  }

  return { ok: true };
}

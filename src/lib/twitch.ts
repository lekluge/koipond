import "server-only";
import { env } from "@/lib/env";

const AUTHORIZE_URL = "https://id.twitch.tv/oauth2/authorize";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const HELIX_URL = "https://api.twitch.tv/helix";

export type TwitchUser = {
  id: string;
  login: string;
  display_name: string;
};

export function twitchAuthorizeUrl(redirectUri: string, state: string, scopes: string[] = []) {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", env.twitchClientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeTwitchCode(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    client_id: env.twitchClientId,
    client_secret: env.twitchClientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const res = await fetch(TOKEN_URL, { method: "POST", body });
  if (!res.ok) {
    throw new Error(`Twitch token exchange failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string[];
  };
}

export async function getTwitchUser(accessToken: string): Promise<TwitchUser> {
  const res = await fetch(`${HELIX_URL}/users`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": env.twitchClientId,
    },
  });
  if (!res.ok) {
    throw new Error(`Twitch get user failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { data: TwitchUser[] };
  const user = json.data[0];
  if (!user) throw new Error("Twitch returned no user for token");
  return user;
}

export type TwitchProfile = {
  login: string;
  displayName: string;
  profileImageUrl: string;
  createdAt: string;
};

const profileCache = new Map<string, { profile: TwitchProfile; expiresAt: number }>();
const PROFILE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getTwitchProfile(twitchUserId: string): Promise<TwitchProfile | null> {
  const cached = profileCache.get(twitchUserId);
  if (cached && cached.expiresAt > Date.now()) return cached.profile;

  const appToken = await getTwitchAppToken();
  const res = await fetch(`${HELIX_URL}/users?id=${encodeURIComponent(twitchUserId)}`, {
    headers: { Authorization: `Bearer ${appToken}`, "Client-Id": env.twitchClientId },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Twitch get user by id failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    data: { login: string; display_name: string; profile_image_url: string; created_at: string }[];
  };
  const user = json.data?.[0];
  if (!user) return null;

  const profile: TwitchProfile = {
    login: user.login,
    displayName: user.display_name,
    profileImageUrl: user.profile_image_url,
    createdAt: user.created_at,
  };
  profileCache.set(twitchUserId, { profile, expiresAt: Date.now() + PROFILE_TTL_MS });
  return profile;
}

let appTokenCache: { token: string; expiresAt: number } | null = null;

export async function getTwitchAppToken(): Promise<string> {
  if (appTokenCache && appTokenCache.expiresAt > Date.now() + 30_000) {
    return appTokenCache.token;
  }

  const body = new URLSearchParams({
    client_id: env.twitchClientId,
    client_secret: env.twitchClientSecret,
    grant_type: "client_credentials",
  });
  const res = await fetch(TOKEN_URL, { method: "POST", body });
  if (!res.ok) {
    throw new Error(`Twitch app token failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  appTokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

export async function subscribeToChatMessages(
  broadcasterUserId: string,
  callbackUrl: string,
  secret: string,
): Promise<{ id: string; status: string }> {
  if (!env.botUserId) {
    throw new Error("No bot account configured: set TWITCH_BOT_USER_ID.");
  }

  const appToken = await getTwitchAppToken();
  const res = await fetch(`${HELIX_URL}/eventsub/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appToken}`,
      "Client-Id": env.twitchClientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "channel.chat.message",
      version: "1",
      condition: {
        broadcaster_user_id: broadcasterUserId,
        user_id: env.botUserId,
      },
      transport: { method: "webhook", callback: callbackUrl, secret },
    }),
  });
  if (!res.ok) {
    throw new Error(`Twitch EventSub subscribe failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { data: { id: string; status: string }[] };
  const subscription = json.data?.[0];
  if (!subscription) throw new Error("Twitch returned no EventSub subscription");
  return subscription;
}

export async function waitForChatSubscriptionStatus(
  broadcasterUserId: string,
  subscriptionId: string,
  attempts = 15,
  delayMs = 1000,
): Promise<string> {
  let status = "webhook_callback_verification_pending";

  for (let i = 0; i < attempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const subscription = (await getChatSubscriptionsFor(broadcasterUserId)).find(
      (s) => s.id === subscriptionId,
    );
    if (!subscription) return "gone";
    status = subscription.status;
    if (status !== "webhook_callback_verification_pending") return status;
  }

  return status;
}

export type ChatSubscription = {
  id: string;
  status: string;
  callback: string;
};

export async function getChatSubscriptionsFor(broadcasterUserId: string): Promise<ChatSubscription[]> {
  const appToken = await getTwitchAppToken();
  const headers = { Authorization: `Bearer ${appToken}`, "Client-Id": env.twitchClientId };
  const found: ChatSubscription[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${HELIX_URL}/eventsub/subscriptions`);
    url.searchParams.set("type", "channel.chat.message");
    if (cursor) url.searchParams.set("after", cursor);

    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Twitch EventSub list failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as {
      data: {
        id: string;
        status: string;
        condition: { broadcaster_user_id?: string };
        transport?: { callback?: string };
      }[];
      pagination?: { cursor?: string };
    };

    for (const subscription of json.data) {
      if (subscription.condition?.broadcaster_user_id === broadcasterUserId) {
        found.push({
          id: subscription.id,
          status: subscription.status,
          callback: subscription.transport?.callback ?? "",
        });
      }
    }
    cursor = json.pagination?.cursor;
  } while (cursor);

  return found;
}

export async function deleteChatSubscriptionsFor(broadcasterUserId: string, exceptId?: string) {
  for (const subscription of await getChatSubscriptionsFor(broadcasterUserId)) {
    if (subscription.id !== exceptId) {
      await deleteEventSubSubscription(subscription.id);
    }
  }
}

export async function deleteEventSubSubscription(subscriptionId: string) {
  const appToken = await getTwitchAppToken();
  const res = await fetch(`${HELIX_URL}/eventsub/subscriptions?id=${encodeURIComponent(subscriptionId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${appToken}`,
      "Client-Id": env.twitchClientId,
    },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Twitch EventSub delete failed: ${res.status} ${await res.text()}`);
  }
}

export async function sendTwitchChatMessage(broadcasterId: string, message: string) {
  if (!env.botUserId) {
    throw new Error("No bot account configured: set TWITCH_BOT_USER_ID.");
  }

  const appToken = await getTwitchAppToken();
  const res = await fetch(`${HELIX_URL}/chat/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appToken}`,
      "Client-Id": env.twitchClientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      broadcaster_id: broadcasterId,
      sender_id: env.botUserId,
      message,
    }),
  });
  if (!res.ok) {
    throw new Error(`Twitch send chat message failed: ${res.status} ${await res.text()}`);
  }
}

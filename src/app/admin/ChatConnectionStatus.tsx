import { env } from "@/lib/env";
import { getChatSubscriptionsFor } from "@/lib/twitch";

export async function ChatConnectionStatus({ streamerTwitchId }: { streamerTwitchId: string }) {
  let subscriptions;
  try {
    subscriptions = await getChatSubscriptionsFor(streamerTwitchId);
  } catch (err) {
    console.error("EventSub status check failed", err);
    return <span className="font-medium text-zinc-500">couldn&apos;t be checked right now</span>;
  }

  if (subscriptions.length === 0) {
    return <span className="font-medium text-zinc-500">not yet</span>;
  }

  const ourCallback = env.eventsubCallbackUrl;
  const live = subscriptions.find((s) => s.status === "enabled");

  if (!live) {
    return (
      <span className="font-medium text-amber-400">
        no — Twitch reports “{subscriptions[0].status}”. Connect the bot again.
      </span>
    );
  }

  if (live.callback !== ourCallback) {
    return (
      <span className="font-medium text-amber-400">
        yes, but chat goes to {hostOf(live.callback)} — this deployment is {hostOf(ourCallback)}.
        Entries only arrive if both use the same database.
      </span>
    );
  }

  return <span className="font-medium text-emerald-400">yes</span>;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

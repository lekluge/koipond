"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ChannelStatus } from "@/lib/channelStatus";

const POLL_MS = 60_000;

function formatUptime(startedAt: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "just started";
}

export function ChannelHeader({
  initial,
  endpoint = "/api/admin/channel-status",
}: {
  initial: ChannelStatus;
  endpoint?: string;
}) {
  const [status, setStatus] = useState(initial);
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as ChannelStatus;
        if (!cancelled) setStatus(data);
      } catch {}
    }
    void refresh();

    const poll = setInterval(refresh, POLL_MS);
    const clock = setInterval(() => setTick((t) => t + 1), 60_000);

    function onVisible() {
      if (!document.hidden) void refresh();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [endpoint]);

  const { stream } = status;

  return (
    <div className="flex items-center gap-4">
      {status.profileImageUrl ? (
        <div className="relative shrink-0">
          <Image
            src={status.profileImageUrl}
            alt=""
            width={56}
            height={56}
            className={`rounded-full ${stream ? "ring-2 ring-red-500 ring-offset-2 ring-offset-[#0a0a0f]" : "opacity-80"}`}
            unoptimized
          />
        </div>
      ) : (
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/5 text-xl font-semibold text-zinc-500 ${
            stream ? "ring-2 ring-red-500 ring-offset-2 ring-offset-[#0a0a0f]" : ""
          }`}
        >
          {status.displayName.slice(0, 1).toUpperCase()}
        </div>
      )}

      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold text-gradient">{status.displayName}</h1>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {stream ? (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-red-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                Live
              </span>
              <span className="text-zinc-400">{formatUptime(stream.startedAt)}</span>
              {Number.isFinite(stream.viewerCount) && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-400">
                    {stream.viewerCount.toLocaleString("en-US")} viewers
                  </span>
                </>
              )}
              {stream.gameName && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="truncate text-zinc-500">{stream.gameName}</span>
                </>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
              {status.unavailable ? "Status unavailable" : "Offline"}
            </span>
          )}
        </div>
        {stream?.title && (
          <p className="mt-1 truncate text-sm text-zinc-500" title={stream.title}>
            {stream.title}
          </p>
        )}
      </div>
    </div>
  );
}

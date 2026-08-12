"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Message = { id: string; message: string; sent_at: string };

type WinnerInfo = {
  profile: { login: string; displayName: string; profileImageUrl: string; createdAt: string } | null;
  badges: { isSubscriber: boolean; isVip: boolean; isModerator: boolean; linked: boolean } | null;
};

const FALLBACK_POLL_MS = 30_000;
const CAPTURE_WINDOW_MS = 15 * 60 * 1000;

function accountAge(createdAt: string): string {
  const days = Math.floor((Date.now() - Date.parse(createdAt)) / 86_400_000);
  if (days < 1) return "created today";
  if (days < 60) return `${days} days old`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months} months old`;
  return `${Math.floor(days / 365)} years old`;
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function WinnerDetails({
  streamerId,
  drawId,
  drawnAt,
}: {
  streamerId: string;
  drawId: string;
  drawnAt: string | null;
}) {
  const [info, setInfo] = useState<WinnerInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [failed, setFailed] = useState(false);
  const sinceRef = useRef<string | undefined>(undefined);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function refresh() {
      if (cancelled) return;
      try {
        const url = new URL("/api/admin/winner", window.location.origin);
        url.searchParams.set("drawId", drawId);
        if (sinceRef.current) url.searchParams.set("since", sinceRef.current);

        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setFailed(false);
            setInfo({ profile: data.profile ?? null, badges: data.badges ?? null });
            const incoming = (data.messages ?? []) as Message[];
            if (incoming.length > 0) {
              sinceRef.current = incoming[incoming.length - 1].sent_at;
              setMessages((prev) => [...prev, ...incoming]);
            }
          }
        } else if (!cancelled) {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }

      const expired = drawnAt ? Date.parse(drawnAt) + CAPTURE_WINDOW_MS < Date.now() : false;
      if (!cancelled && !expired) timer = setTimeout(refresh, FALLBACK_POLL_MS);
    }

    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`streamer:${streamerId}:winner-chat`)
      .on("broadcast", { event: "ping" }, () => {
        clearTimeout(timer);
        void refresh();
      })
      .subscribe();

    void refresh();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [streamerId, drawId, drawnAt]);

  useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, [messages]);

  const profile = info?.profile;
  const badges = info?.badges;

  return (
    <div className="flex w-80 flex-col gap-3">
      {profile && (
        <div className="flex items-center gap-3 text-left">
          <Image
            src={profile.profileImageUrl}
            alt=""
            width={48}
            height={48}
            className="rounded-full border border-white/10"
            unoptimized
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-100">{profile.displayName}</p>
            <p className="text-xs text-zinc-500">Account {accountAge(profile.createdAt)}</p>
          </div>
        </div>
      )}

      {badges && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {badges.isModerator && <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">Mod</Badge>}
          {badges.isVip && <Badge className="border-pink-500/30 bg-pink-500/15 text-pink-300">VIP</Badge>}
          {badges.isSubscriber && <Badge className="border-purple-500/30 bg-purple-500/15 text-purple-300">Sub</Badge>}
          {!badges.linked && <Badge className="border-white/10 bg-white/5 text-zinc-400">no osu! account</Badge>}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0e0e10] text-left">
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400" />
          <span className="text-xs font-medium text-zinc-400">Chat since the draw</span>
        </div>
        <div ref={feedRef} className="flex max-h-40 flex-col gap-1.5 overflow-y-auto px-3 py-2.5">
          {messages.length === 0 ? (
            <p className="py-2 text-center text-xs text-zinc-600">
              {failed ? "Chat couldn't be loaded." : "Waiting for them to say something…"}
            </p>
          ) : (
            messages.map((m) => (
              <p key={m.id} className="text-sm text-zinc-100">
                <span className="mr-1.5 text-[10px] text-zinc-600">{time(m.sent_at)}</span>
                <span className="font-semibold text-gradient">{profile?.displayName ?? "winner"}</span>{" "}
                <span className="break-words">{m.message}</span>
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${className}`}>{children}</span>;
}

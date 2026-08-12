"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Fragment = { text: string; emoteUrl?: string };
type ChatMessage = {
  id: string;
  login: string;
  name: string;
  color: string | null;
  badges: string[];
  fragments: Fragment[];
};
type Emote = { url: string; zeroWidth: boolean; provider?: string };

const MAX_MESSAGES = 200;

const FALLBACK_COLOR = "#c4b5fd";

export function LiveChat({ streamerId }: { streamerId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [emotes, setEmotes] = useState<Record<string, Emote>>({});
  const [connected, setConnected] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/emotes", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { emotes: {} }))
      .then((data) => !cancelled && setEmotes(data.emotes ?? {}))
      .catch(() => {
      });

    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`streamer:${streamerId}:chat`)
      .on("broadcast", { event: "ping" }, ({ payload }) => {
        const message = payload as ChatMessage;
        if (!message?.id) return;
        setMessages((prev) => [...prev, message].slice(-MAX_MESSAGES));
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [streamerId]);

  useEffect(() => {
    const feed = feedRef.current;
    if (feed && stickToBottomRef.current) feed.scrollTop = feed.scrollHeight;
  }, [messages]);

  function onScroll() {
    const feed = feedRef.current;
    if (!feed) return;
    const distanceFromBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 40;
  }

  const emoteCount = Object.keys(emotes).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-xs text-zinc-500">
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? "bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400" : "bg-zinc-600"
          }`}
        />
        {connected ? "live" : "connecting…"}
        <span className="ml-auto">
          {emoteCount > 0 ? `${emoteCount} emotes` : "no emotes loaded"}
        </span>
      </div>

      <div ref={feedRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-600">
            Messages appear here as they are written in chat.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {messages.map((m) => (
              <p key={m.id} className="text-sm leading-snug text-zinc-200">
                {m.badges.map((badge) => (
                  <Badge key={badge} badge={badge} />
                ))}
                <span className="font-semibold" style={{ color: readable(m.color) }}>
                  {m.name}
                </span>
                <span className="text-zinc-500">: </span>
                {m.fragments.map((fragment, i) => (
                  <FragmentView key={i} fragment={fragment} emotes={emotes} />
                ))}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FragmentView({ fragment, emotes }: { fragment: Fragment; emotes: Record<string, Emote> }) {
  if (fragment.emoteUrl) {
    return <EmoteImage url={fragment.emoteUrl} name={fragment.text} />;
  }

  const parts = fragment.text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) => {
        const emote = emotes[part];
        if (emote) return <EmoteImage key={i} url={emote.url} name={part} provider={emote.provider} />;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function EmoteImage({ url, name, provider }: { url: string; name: string; provider?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      title={provider ? `${name} (${provider})` : name}
      className="inline-block h-7 w-auto align-middle"
    />
  );
}

const BADGE_STYLES: Record<string, string> = {
  broadcaster: "bg-red-500/20 text-red-300",
  moderator: "bg-emerald-500/20 text-emerald-300",
  vip: "bg-pink-500/20 text-pink-300",
  subscriber: "bg-purple-500/20 text-purple-300",
  founder: "bg-purple-500/20 text-purple-300",
};

function Badge({ badge }: { badge: string }) {
  const style = BADGE_STYLES[badge];
  if (!style) return null;
  return (
    <span className={`mr-1 rounded px-1 py-0.5 text-[10px] font-semibold uppercase ${style}`}>
      {badge === "broadcaster" ? "host" : badge.slice(0, 3)}
    </span>
  );
}

function readable(color: string | null): string {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return FALLBACK_COLOR;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 70 ? FALLBACK_COLOR : color;
}

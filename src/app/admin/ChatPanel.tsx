"use client";

import { useState } from "react";
import { LiveChat } from "./LiveChat";

export function ChatPanel({ streamerId, chatEmbedUrl }: { streamerId: string; chatEmbedUrl: string }) {
  const [view, setView] = useState<"twitch" | "seventv">("twitch");

  return (
    <>
      <div className="flex items-center gap-1 border-b border-white/10 px-2 py-2">
        <span className="px-2 text-sm font-semibold text-zinc-100">Stream Chat</span>
        <div className="ml-auto flex gap-1">
          <Tab active={view === "twitch"} onClick={() => setView("twitch")}>
            Twitch
          </Tab>
          <Tab active={view === "seventv"} onClick={() => setView("seventv")}>
            7TV
          </Tab>
        </div>
      </div>

      <div className={view === "twitch" ? "flex-1" : "hidden"}>
        <iframe src={chatEmbedUrl} title="Twitch Chat" className="h-full w-full border-0" />
      </div>
      <div className={view === "seventv" ? "flex-1 overflow-hidden" : "hidden"}>
        <LiveChat streamerId={streamerId} />
      </div>
    </>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
        active ? "bg-white/10 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

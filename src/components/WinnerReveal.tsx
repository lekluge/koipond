export function TwitchOsuBadges({
  twitchName,
  osuName,
}: {
  twitchName: string;
  osuName: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-xs font-semibold text-purple-300">
          Twitch
        </span>
        <span className="text-lg font-bold text-zinc-50">{twitchName}</span>
      </div>
      {osuName && (
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-pink-500/30 bg-pink-500/15 px-2 py-0.5 text-xs font-semibold text-pink-300">
            osu!
          </span>
          <span className="font-medium text-zinc-200">{osuName}</span>
        </div>
      )}
    </div>
  );
}

export function ChatWindowPopup({
  twitchName,
  osuName,
  botName = "t1ggy_bot",
}: {
  twitchName: string;
  osuName: string | null;
  botName?: string;
}) {
  return (
    <div className="w-80 overflow-hidden rounded-xl border border-white/10 bg-[#0e0e10] shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px] shadow-emerald-400" />
        <span className="text-xs font-medium text-zinc-400">Twitch Chat</span>
      </div>
      <div className="px-3 py-2.5 text-sm text-zinc-100">
        <span className="font-semibold text-gradient">{botName}</span>{" "}
        <span>
          🎉 Winner is <span className="font-semibold">{twitchName}</span>
          {osuName && (
            <>
              {" "}
              (osu!: <span className="font-semibold">{osuName}</span>)
            </>
          )}
          !
        </span>
      </div>
    </div>
  );
}

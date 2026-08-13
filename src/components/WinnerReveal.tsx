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

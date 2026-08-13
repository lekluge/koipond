import { redirect } from "next/navigation";
import { getSessionStreamer } from "@/lib/streamers";
import { BackgroundGlow, cardClass } from "@/components/ui";

export default async function OverlayIndexPage() {
  const streamer = await getSessionStreamer();
  if (streamer) redirect(`/overlay/${streamer.twitchLogin}`);

  return (
    <>
      <BackgroundGlow />
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 text-center">
        <div className={cardClass}>
          <h1 className="font-semibold text-zinc-100">Overlay</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Every channel has its own overlay URL:{" "}
            <code className="text-zinc-300">/overlay/&lt;your-twitch-name&gt;</code>. You can copy
            yours from the streamer dashboard.
          </p>
        </div>
      </main>
    </>
  );
}

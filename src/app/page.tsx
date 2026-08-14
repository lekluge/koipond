import { BackgroundGlow, SourceLink, buttonClass, cardClass } from "@/components/ui";
import { countLinkedParticipants } from "@/lib/participants";
export const revalidate = 600;

export default async function Home() {
  const linked = await countLinkedParticipants();

  return (
    <>
      <BackgroundGlow />
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
        <div className={cardClass + " flex flex-col items-center gap-6"}>
          <span className="text-4xl">🎱</span>
          <div>
            <h1 className="text-2xl font-bold text-gradient">osu! Winner Picker</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Link your Twitch and osu! account to take part in giveaways.
            </p>
          </div>
          <a href="/link" className={buttonClass("primary", "w-full py-3")}>
            Link account
          </a>
          {linked !== null && linked > 0 && (
            <p className="-mt-2 text-xs text-zinc-500">
              <span className="font-semibold text-zinc-300">{linked.toLocaleString("en-US")}</span>{" "}
              {linked === 1 ? "account" : "accounts"} linked so far
            </p>
          )}
          <a href="/admin" className="text-xs text-zinc-500 transition hover:text-zinc-300">
            Are you a streamer? Set up your channel
          </a>
        </div>
      </main>
      <SourceLink floating />
    </>
  );
}

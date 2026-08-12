import { BackgroundGlow, buttonClass, cardClass } from "@/components/ui";

export default function Home() {
  return (
    <>
      <BackgroundGlow />
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
        <div className={cardClass + " flex flex-col items-center gap-6"}>
          <span className="text-4xl">🎱</span>
          <div>
            <h1 className="text-2xl font-bold text-gradient">osu! Tournament Winner Picker</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Link your Twitch and osu! account to take part in giveaways.
            </p>
          </div>
          <a href="/link" className={buttonClass("primary", "w-full py-3")}>
            Link account
          </a>
          <a href="/admin" className="text-xs text-zinc-500 transition hover:text-zinc-300">
            Are you a streamer? Set up your channel
          </a>
        </div>
      </main>
    </>
  );
}

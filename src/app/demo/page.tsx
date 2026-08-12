import { BackgroundGlow, buttonClass } from "@/components/ui";

export default function DemoLandingPage() {
  return (
    <>
      <BackgroundGlow />
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
          DEMO — runs entirely without Supabase/Twitch/osu! setup
        </p>
        <h1 className="text-2xl font-bold text-gradient">osu! Tournament Winner Picker — POC</h1>
        <p className="text-sm text-zinc-400">
          13 dummy participants are already preloaded. Best to open the dashboard and overlay in
          two tabs side by side.
        </p>
        <div className="flex w-full flex-col gap-3">
          <a href="/demo/link" className={buttonClass("secondary", "py-3")}>
            1. Try the link flow (simulated Twitch/osu! login)
          </a>
          <a href="/demo/admin" className={buttonClass("primary", "py-3")}>
            2. Open admin dashboard
          </a>
          <a href="/demo/overlay" target="_blank" rel="noreferrer" className={buttonClass("secondary", "py-3")}>
            3. Open overlay in a new tab
          </a>
        </div>
      </main>
    </>
  );
}

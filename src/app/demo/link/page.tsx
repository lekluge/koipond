"use client";

import { useState } from "react";
import { BackgroundGlow, SourceLink, buttonClass, cardClass, inputClass } from "@/components/ui";

type Step = "start" | "twitch-done" | "linked";

export default function DemoLinkPage() {
  const [step, setStep] = useState<Step>("start");
  const [twitchName, setTwitchName] = useState("");
  const [osuName, setOsuName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fakeTwitchLogin() {
    const name = twitchName.trim() || `Viewer${Math.floor(Math.random() * 1000)}`;
    setTwitchName(name);
    setStep("twitch-done");
  }

  async function fakeOsuLogin() {
    const osu = osuName.trim() || twitchName;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twitchDisplayName: twitchName, osuUsername: osu }),
      });
      if (!res.ok) throw new Error("Linking failed");
      setOsuName(osu);
      setStep("linked");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BackgroundGlow />
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
        <p className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
          DEMO — simulated login, no real accounts needed
        </p>
        <h1 className="text-2xl font-bold text-gradient">Link your Twitch × osu! account</h1>
        <p className="text-sm text-zinc-400">
          Link your Twitch and osu! account to take part in the streamer&apos;s tournaments and
          giveaways.
        </p>

        {error && (
          <p className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className={cardClass + " flex w-full flex-col gap-4 text-left"}>
          <div
            className={`rounded-lg border px-4 py-3 transition ${
              step !== "start" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/5"
            }`}
          >
            {step === "start" ? (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Your (fictional) Twitch name
                </label>
                <input
                  value={twitchName}
                  onChange={(e) => setTwitchName(e.target.value)}
                  placeholder="e.g. MoonlightMika"
                  className={inputClass}
                />
                <button onClick={fakeTwitchLogin} className={buttonClass("primary", "mt-1")}>
                  Log in with Twitch (Demo)
                </button>
              </div>
            ) : (
              <span>✓ Logged in as {twitchName}</span>
            )}
          </div>

          <div
            className={`rounded-lg border px-4 py-3 transition ${
              step === "linked"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : step === "twitch-done"
                  ? "border-white/10 bg-white/5"
                  : "border-white/5 bg-white/[0.02] text-zinc-600"
            }`}
          >
            {step === "linked" ? (
              <span>✓ osu! account linked: {osuName}</span>
            ) : step === "twitch-done" ? (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Your (fictional) osu! username
                </label>
                <input
                  value={osuName}
                  onChange={(e) => setOsuName(e.target.value)}
                  placeholder="e.g. Mika"
                  className={inputClass}
                />
                <button onClick={fakeOsuLogin} disabled={loading} className={buttonClass("primary", "mt-1")}>
                  {loading ? "Linking…" : "Link osu! account (Demo)"}
                </button>
              </div>
            ) : (
              <span>Link osu! account</span>
            )}
          </div>
        </div>

        {step === "linked" && (
          <a href="/demo/admin" className="text-sm text-purple-300 underline hover:text-purple-200">
            Continue to admin dashboard →
          </a>
        )}
      </main>
      <SourceLink floating />
    </>
  );
}

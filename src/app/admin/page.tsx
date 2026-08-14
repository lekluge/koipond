import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { getSessionStreamer, mayRegisterAsStreamer } from "@/lib/streamers";
import { findEligibleParticipants, getDrawHistory, getPastWinnerIds, loadCriteria, type DrawCriteria } from "@/lib/draw";
import { listPresets } from "@/lib/presets";
import { getEntrants, getEntrySettings, type EntrySettings } from "@/lib/entries";
import { getChannelStatus } from "@/lib/channelStatus";
import { ChannelHeader } from "./ChannelHeader";
import { DrawModeStages, ModeOnly } from "./DrawModeStages";
import { RankPresetButtons, ApplyPresetButton } from "./PresetControls";
import { ChatConnectionStatus } from "./ChatConnectionStatus";
import { ChatPanel } from "./ChatPanel";
import { EntriesLiveProvider } from "./EntriesLive";
import { EntriesPanel } from "./EntriesPanel";
import { EntriesToggleButton } from "./EntriesToggleButton";
import { LiveEligibleCount } from "./LiveEligibleCount";
import { WinnerModal } from "./WinnerModal";
import { PickWinnerButton } from "./PickWinnerButton";
import { SettingsAutoSave } from "./SettingsAutoSave";
import { BackgroundGlow, SourceLink, ToggleField, buttonClass, cardClass, inputClass, labelClass } from "@/components/ui";
import { env } from "@/lib/env";
import { deletePresetAction, savePresetAction, saveSettingsAction } from "./actions";

const LOGIN_ERRORS: Record<string, string> = {
  twitch_state: "Twitch login expired or invalid. Please try again.",
  twitch_auth: "Twitch login failed. Please try again.",
  not_allowed: "This Twitch account isn't on the allowlist for this app.",
  eventsub: "Connecting the bot to your chat failed.",
  no_bot:
    "No bot account is configured for this app. Set TWITCH_BOT_USER_ID (see scripts/get-bot-token.mjs), or link one on this page as the operator.",
  bot_scope: "The bot has no permission for this channel yet — log in again to grant it.",
  eventsub_unreachable:
    "Twitch can't reach this app's webhook URL, so nothing was changed — your existing connection is untouched. Usually this is deployment protection (a login or password in front of the app) or a domain that redirects.",
  eventsub_pending:
    "Twitch hasn't finished verifying the callback yet. The subscription was kept — reload this page in a moment; \"Connected to your chat\" above shows what Twitch actually reports.",
  eventsub_verification:
    "Twitch rejected the callback when it verified it, so the connection was rolled back. Check that the webhook URL is publicly reachable, then try again.",
  eventsub_https:
    "Twitch only delivers chat events to a public https URL, so this step can't be done from a local dev server. Run it on the deployed app (or point NEXT_PUBLIC_APP_URL at an https tunnel).",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string; bot?: string }>;
}) {
  const session = await getSession();
  const { error, detail, bot } = await searchParams;

  if (!session) {
    return (
      <Centered>
        {error && <p className="mb-4 text-sm text-red-300">{LOGIN_ERRORS[error] ?? "Something went wrong."}</p>}
        <p className="mb-4 text-zinc-400">Log in with your Twitch account to run giveaways in your channel.</p>
        <a className={buttonClass("primary")} href="/api/auth/twitch/streamer/login">
          Log in with Twitch
        </a>
      </Centered>
    );
  }

  const streamer = await getSessionStreamer();

  if (!streamer) {
    const allowed = mayRegisterAsStreamer(session.twitchId);
    return (
      <Centered>
        {error && <p className="mb-4 text-sm text-red-300">{LOGIN_ERRORS[error] ?? "Something went wrong."}</p>}
        {allowed ? (
          <>
            <p className="mb-4 max-w-md text-zinc-400">
              Set up your channel, {session.twitchDisplayName}. You&apos;ll be asked to allow the
              giveaway bot to read and post in your chat — that way it runs the giveaway for you and
              you never have to sit in your own chat with a second account.
            </p>
            <a className={buttonClass("primary")} href="/api/auth/twitch/streamer/login">
              Set up my channel
            </a>
          </>
        ) : (
          <p className="max-w-md text-zinc-400">
            No access. {session.twitchDisplayName} isn&apos;t on this app&apos;s streamer allowlist.
          </p>
        )}
      </Centered>
    );
  }

  const [entrySettings, criteria] = await Promise.all([
    getEntrySettings(streamer.id),
    loadCriteria(streamer.id),
  ]);

  const [eligibleRaw, history, presets, entrants, pastWinnerIds, channelStatus] = await Promise.all([
    findEligibleParticipants(streamer.id, criteria, entrySettings),
    getDrawHistory(streamer.id),
    listPresets(streamer.id),
    getEntrants(streamer.id, entrySettings),
    entrySettings.uniqueWinners
      ? getPastWinnerIds(streamer.id, entrySettings.entriesSession)
      : Promise.resolve(new Set<string>()),
    getChannelStatus(streamer),
  ]);

  const subscriberTwitchIds = new Set(entrants.filter((e) => e.is_subscriber).map((e) => e.twitch_id));
  const eligible = eligibleRaw
    .filter((c) => !pastWinnerIds.has(c.twitchId))
    .filter((c) => !entrySettings.subscribersOnly || subscriberTwitchIds.has(c.twitchId));

  let chatParentHost = "localhost";
  try {
    chatParentHost = new URL(env.appUrl).hostname;
  } catch {}

  return (
    <>
      <BackgroundGlow />
      <WinnerModal streamerId={streamer.id} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
        <EntriesLiveProvider
          streamerId={streamer.id}
          entriesOpen={entrySettings.entriesOpen}
          entrants={entrants}
        >
          {/* <ChannelHeader initial={channelStatus} /> */}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {LOGIN_ERRORS[error] ?? "Something went wrong."}
              {detail && <p className="mt-2 break-all font-mono text-xs text-red-300/80">{detail}</p>}
            </div>
          )}

          {bot === "connected" && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              The bot is connected to your chat.
            </div>
          )}

          <div className={cardClass}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="font-semibold text-zinc-100">Entries</h2>
              <EntriesToggleButton />
            </div>
            <EntriesPanel />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
            <div className="flex flex-col gap-6">
              <form id="criteria-form" action={saveSettingsAction} className={cardClass}>
                <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
                <h2 className="font-semibold text-zinc-100">Configure the settings for the giveaway.</h2>

                <DrawModeStages
                  defaultMode={entrySettings.drawMode}
                  keyword={{
                    top: <KeywordEntrySettings entrySettings={entrySettings} />,
                    bottom: (
                      <KeywordDrawSettings
                        entrySettings={entrySettings}
                        criteria={criteria}
                        eligibleCount={eligible.length}
                      />
                    ),
                  }}
                  number={{ top: <NumberRangeSettings entrySettings={entrySettings} /> }}
                  common={
                    <details open className="group mt-4 border-t border-white/10 pt-4">
                      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-zinc-200 [&::-webkit-details-marker]:hidden">
                        <span>Basic Settings</span>
                        <span className="text-zinc-500 transition group-open:rotate-180" aria-hidden>
                          ⌄
                        </span>
                      </summary>

                      <div className="mt-2 divide-y divide-white/10">
                        {/* These two mean nothing in a number guess. */}
                        <ModeOnly mode="keyword">
                          <div className="divide-y divide-white/10">
                            <ToggleField
                              name="removeSpammers"
                              label="Remove Spammers"
                              description="Require an exact keyword match — messages with extra text won't count."
                              defaultChecked={entrySettings.removeSpammers}
                            />
                            <ToggleField
                              name="uniqueWinners"
                              label="Unique Winners"
                              description="Past winners won't be picked again."
                              defaultChecked={entrySettings.uniqueWinners}
                            />
                          </div>
                        </ModeOnly>
                        <ToggleField
                          name="subscribersOnly"
                          label="Subscribers Only"
                          description="Only subscribers can win — in a number guess, a non-subscriber's correct guess doesn't count."
                          defaultChecked={entrySettings.subscribersOnly}
                        />
                        <ToggleField
                          name="chatAnnouncement"
                          label="Chat Announcement"
                          description="Announce the winner in chat when they are picked."
                          defaultChecked={entrySettings.chatAnnouncement}
                        />
                        <ToggleField
                          name="hideOsuStats"
                          label="Hide osu! Stats"
                          description="Reveal the winner without their rank, pp and top play — on the overlay and here."
                          defaultChecked={entrySettings.hideOsuStats}
                        />
                      </div>
                    </details>
                  }
                />

                <div className="mt-4 flex justify-end border-t border-white/10 pt-3">
                  <SettingsAutoSave formId="criteria-form" />
                </div>
              </form>

              <section className={cardClass + " flex flex-col gap-2"}>
                <span className={labelClass}>Custom presets</span>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <span
                      key={preset.id}
                      className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1 text-xs text-zinc-300"
                    >
                      <ApplyPresetButton criteria={preset.criteria} name={preset.name} />
                      <form action={deletePresetAction}>
                        <input type="hidden" name="presetId" value={preset.id} />
                        <button
                          type="submit"
                          aria-label={`Delete ${preset.name}`}
                          className="rounded-full px-2 py-1 text-zinc-500 hover:bg-white/10 hover:text-red-400"
                        >
                          ×
                        </button>
                      </form>
                    </span>
                  ))}
                  {presets.length === 0 && <span className="text-xs text-zinc-600">No presets saved yet.</span>}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    name="presetName"
                    placeholder="Preset name (e.g. 6-digit DE)"
                    form="criteria-form"
                    className={inputClass + " flex-1"}
                  />
                  <button
                    type="submit"
                    form="criteria-form"
                    formAction={savePresetAction}
                    className={buttonClass("secondary")}
                  >
                    Save current criteria
                  </button>
                </div>
              </section>
            </div>
            <div className="lg:min-h-134">
              <div
                className={
                  cardClass +
                  " flex h-145 flex-col overflow-hidden p-0 lg:sticky lg:top-6 lg:h-full lg:max-h-[calc(100vh-3rem)]"
                }
              >
                <ChatPanel
                  streamerId={streamer.id}
                  chatEmbedUrl={`https://www.twitch.tv/embed/${streamer.twitchLogin}/chat?parent=${chatParentHost}&darkpopout`}
                />
              </div>
            </div>
          </div>

          <section className={cardClass}>
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-zinc-100">
              History
            </h2>
            <ul className="flex flex-col gap-2">
              {history.map((draw) => {
                return (
                  <li key={draw.id} className="rounded-lg border border-white/10 bg-white/2 px-4 py-2 text-sm">
                    <span className="font-medium text-zinc-200">
                      {draw.winner_twitch_display_name
                        ? `${draw.winner_twitch_display_name}${draw.winner_osu_username ? ` (${draw.winner_osu_username})` : ""}`
                        : "No winner (no one entered or matched the criteria)"}
                    </span>{" "}
                    <span className="text-zinc-500">
                      · {draw.triggered_by} · {new Date(draw.created_at).toLocaleString("en-US")}
                    </span>
                  </li>
                );
              })}
              {history.length === 0 && <li className="text-sm text-zinc-500">No draws yet.</li>}
            </ul>
          </section>

          <section className={cardClass + " text-sm text-zinc-400"}>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-zinc-100">
              Bot &amp; overlay
            </h2>
            <p className="mb-3">
              The giveaway bot is run by this app — you don&apos;t link an account of your own and
              don&apos;t need to be in your chat. It reads your chat for the keyword and announces
              winners there.
            </p>

            <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt>Bot account:</dt>
              <dd>
                {env.botUserId ? (
                  <span className="font-medium text-emerald-400">ready</span>
                ) : (
                  <span className="font-medium text-amber-400">
                    not set up by the app operator yet
                  </span>
                )}
              </dd>
              <dt>Permission for your chat:</dt>
              <dd>
                {streamer.botScopeGranted ? (
                  <span className="font-medium text-emerald-400">granted</span>
                ) : (
                  <span className="font-medium text-amber-400">missing</span>
                )}
              </dd>
              <dt>Connected to your chat:</dt>
              <dd>
                <Suspense fallback={<span className="font-medium text-zinc-500">checking…</span>}>
                  <ChatConnectionStatus streamerTwitchId={streamer.twitchId} />
                </Suspense>
              </dd>
            </dl>

            {!streamer.botScopeGranted && (
              <p className="mb-3">
                <a href="/api/auth/twitch/streamer/login" className={buttonClass("secondary")}>
                  Grant chat permission
                </a>
              </p>
            )}

            <p className="mb-3">
              Connect the bot to your chat to activate the keyword entries and{" "}
              <code className="text-zinc-300">!pickwinner</code>. Re-run this if you ever revoke the
              bot&apos;s access.
            </p>
            <form action="/api/eventsub/subscribe" method="post">
              <button type="submit" className={buttonClass("secondary")} disabled={!env.botUserId}>
                {streamer.eventsubSubscriptionId ? "Reconnect bot to my chat" : "Connect bot to my chat"}
              </button>
            </form>

            <p className="mt-4">
              Your OBS overlay URL:{" "}
              <code className="text-zinc-300">{`${env.appUrl}/overlay/${streamer.twitchLogin}`}</code>
            </p>
          </section>
        </EntriesLiveProvider>
      </main>
      <SourceLink />
    </>
  );
}

function KeywordEntrySettings({ entrySettings }: { entrySettings: EntrySettings }) {
  return (
    <>
      <div className="mt-3 flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-100">Keyword</span>
        <p className="text-xs text-zinc-500">The phrase that users must type to enter the giveaway.</p>
        <input name="triggerWord" defaultValue={entrySettings.triggerWord} className={inputClass + " mt-1"} />
      </div>
    </>
  );
}

function KeywordDrawSettings({
  entrySettings,
  criteria,
  eligibleCount,
}: {
  entrySettings: EntrySettings;
  criteria: DrawCriteria;
  eligibleCount: number;
}) {
  return (
    <>
      <details className="group mt-4 border-t border-white/10 pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-zinc-200 [&::-webkit-details-marker]:hidden">
          <span>osu! Criteria</span>
          <span className="text-zinc-500 transition group-open:rotate-180" aria-hidden>
            ⌄
          </span>
        </summary>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className={labelClass}>Rank presets</span>
            <RankPresetButtons />
          </div>

          <RangeField label="Global Rank" minName="globalRankMin" maxName="globalRankMax" criteria={criteria} minKey="globalRankMin" maxKey="globalRankMax" />
          <RangeField label="Country Rank" minName="countryRankMin" maxName="countryRankMax" criteria={criteria} minKey="countryRankMin" maxKey="countryRankMax" />
          <RangeField label="PP" minName="ppMin" maxName="ppMax" criteria={criteria} minKey="ppMin" maxKey="ppMax" />
          <RangeField label="Accuracy (%)" minName="accuracyMin" maxName="accuracyMax" criteria={criteria} minKey="accuracyMin" maxKey="accuracyMax" />

          <Field label="Country Code (e.g. DE)" name="countryCode" defaultValue={criteria.countryCode ?? ""} />
          <Field label="Min. Playcount" name="playcountMin" defaultValue={criteria.playcountMin ?? ""} type="number" />
          <Field label="Min. Top-Play Star Rating" name="topPlaySrMin" defaultValue={criteria.topPlaySrMin ?? ""} type="number" step="0.1" />
          <Field label="Min. Top-Play PP" name="topPlayPpMin" defaultValue={criteria.topPlayPpMin ?? ""} type="number" />
        </div>
      </details>

      <details className="group mt-4 border-t border-white/10 pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-zinc-200 [&::-webkit-details-marker]:hidden">
          <span>Advanced Settings</span>
          <span className="text-zinc-500 transition group-open:rotate-180" aria-hidden>
            ⌄
          </span>
        </summary>

        <p className="mt-3 text-xs text-zinc-500">
          How many tickets someone gets. A viewer with 1 and a subscriber with 5 means the
          subscriber is five times as likely — not guaranteed to win. When several apply to the
          same person, the <span className="text-zinc-300">highest</span> one counts; they are not
          multiplied.
        </p>

        <div className="mt-2 flex flex-col divide-y divide-white/10">
          <LuckModifierField label="Viewer Luck Modifier" name="viewerLuckModifier" defaultValue={entrySettings.viewerLuckModifier} />
          <LuckModifierField label="Regular Luck Modifier" name="regularLuckModifier" defaultValue={entrySettings.regularLuckModifier} />
          <LuckModifierField label="Subscriber Luck Modifier" name="subscriberLuckModifier" defaultValue={entrySettings.subscriberLuckModifier} />
          <LuckModifierField label="VIP Luck Modifier" name="vipLuckModifier" defaultValue={entrySettings.vipLuckModifier} />
          <LuckModifierField label="Moderator Luck Modifier" name="moderatorLuckModifier" defaultValue={entrySettings.moderatorLuckModifier} />
        </div>

        <div className="mt-3 flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-100">Regulars</span>
          <p className="text-xs text-zinc-500">
            One Twitch username per line. Used by the Regular Luck Modifier — Twitch has no
            built-in &quot;regular&quot; status, so this list is managed manually.
          </p>
          <textarea
            name="regulars"
            rows={3}
            defaultValue={entrySettings.regulars}
            className={inputClass + " mt-1 resize-y"}
          />
        </div>
      </details>

      <div className="mt-4 border-t border-white/10 pt-2">
        <ToggleField
          name="ignoreOsuCriteria"
          label="Ignore osu! Criteria"
          description="Pick from anyone who typed the keyword, even without a linked account."
          defaultChecked={entrySettings.ignoreOsuCriteria}
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          <span className="font-semibold text-zinc-100">
            <LiveEligibleCount initialCount={eligibleCount} />
          </span>{" "}
          eligible
        </p>
        <PickWinnerButton />
      </div>
    </>
  );
}

function NumberRangeSettings({ entrySettings }: { entrySettings: EntrySettings }) {
  const { numberMin, numberMax } = entrySettings;

  return (
    <>
      <p className="mt-3 text-xs text-zinc-500">
        Opening entries draws a number from this range and keeps it to itself — it is never shown
        here or sent to your browser. Everyone who types a plain number in chat enters, and the
        first one to hit it wins immediately and closes the round.
      </p>

      <div className="mt-3 flex flex-col gap-1 text-sm">
        <span className={labelClass}>Range</span>
        <div className="flex items-center gap-2">
          <input
            name="numberMin"
            type="number"
            defaultValue={numberMin}
            className={inputClass + " w-1/2"}
            aria-label="Lowest possible number"
          />
          <span className="text-zinc-600">to</span>
          <input
            name="numberMax"
            type="number"
            defaultValue={numberMax}
            className={inputClass + " w-1/2"}
            aria-label="Highest possible number"
          />
        </div>
        <p className="text-xs text-zinc-500">
          Changing this during a running round draws a new number — the old one could sit outside
          the new range, where nobody could ever guess it.
        </p>
      </div>
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackgroundGlow />
      <main className="flex min-h-screen flex-col items-center justify-center text-center">{children}</main>
      <SourceLink floating />
    </>
  );
}

function LuckModifierField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm font-medium text-zinc-100">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-zinc-500" aria-hidden>
          ×
        </span>
        <input
          type="number"
          name={name}
          min="0"
          step="0.1"
          defaultValue={defaultValue}
          className={inputClass + " w-20 text-center"}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  step,
}: {
  label: string;
  name: string;
  defaultValue: string | number;
  type?: string;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className={labelClass}>{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        className={inputClass}
      />
    </label>
  );
}

function RangeField({
  label,
  minName,
  maxName,
  criteria,
  minKey,
  maxKey,
}: {
  label: string;
  minName: string;
  maxName: string;
  criteria: DrawCriteria;
  minKey: keyof DrawCriteria;
  maxKey: keyof DrawCriteria;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className={labelClass}>{label}</span>
      <div className="flex gap-2">
        <input
          name={minName}
          type="number"
          placeholder="min"
          defaultValue={criteria[minKey] ?? ""}
          className={inputClass + " w-1/2"}
        />
        <input
          name={maxName}
          type="number"
          placeholder="max"
          defaultValue={criteria[maxKey] ?? ""}
          className={inputClass + " w-1/2"}
        />
      </div>
    </div>
  );
}

export function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-purple-700/20 blur-[120px]" />
      <div className="absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full bg-pink-600/15 blur-[120px]" />
      <div className="absolute bottom-0 left-1/4 h-[24rem] w-[24rem] rounded-full bg-fuchsia-600/10 blur-[120px]" />
    </div>
  );
}

export const cardClass = "rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-black/20 backdrop-blur-sm";

export function cx(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

const buttonVariants = {
  primary:
    "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-950/40 hover:brightness-110",
  secondary: "border border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10",
  danger: "bg-red-600/90 text-white hover:bg-red-500",
  success: "bg-emerald-600/90 text-white hover:bg-emerald-500",
  ghost: "text-zinc-400 hover:text-zinc-200",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function buttonClass(variant: ButtonVariant = "primary", extra = "") {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
    buttonVariants[variant],
    extra,
  );
}

export const inputClass =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20";

export const labelClass = "text-xs font-medium uppercase tracking-wide text-zinc-500";

export const pillClass =
  "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 transition hover:border-purple-500/40 hover:bg-white/10";

export function ToggleField({
  name,
  label,
  description,
  defaultChecked,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block text-sm font-medium text-zinc-100">{label}</span>
        <span className="block text-xs text-zinc-500">{description}</span>
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-white/10 transition peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-600" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

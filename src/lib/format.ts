function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function formatStars(value: number | string | null | undefined): string {
  const n = toNumber(value);
  return n === null ? "—" : n.toFixed(2);
}

export function formatPp(value: number | string | null | undefined): string {
  const n = toNumber(value);
  return n === null ? "—" : String(Math.round(n));
}

export function formatAccuracy(value: number | string | null | undefined): string {
  const n = toNumber(value);
  return n === null ? "—" : n.toFixed(2);
}

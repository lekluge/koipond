import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const SESSION_COOKIE = "koi_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

export type Session = {
  twitchId: string;
  twitchLogin: string;
  twitchDisplayName: string;
};

type SignedPayload = { exp: number };

function isFresh(payload: Partial<SignedPayload> | null): boolean {
  return !!payload && typeof payload.exp === "number" && payload.exp > Date.now();
}

function expiresIn(seconds: number): number {
  return Date.now() + seconds * 1000;
}

function sign(payload: string): string {
  return createHmac("sha256", env.sessionSecret).update(payload).digest("base64url");
}

function encode(data: unknown): string {
  const payload = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function decode<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const payload = decode<Session & SignedPayload>(store.get(SESSION_COOKIE)?.value);
  if (!isFresh(payload)) return null;
  return {
    twitchId: payload!.twitchId,
    twitchLogin: payload!.twitchLogin,
    twitchDisplayName: payload!.twitchDisplayName,
  };
}

export async function setSession(session: Session) {
  const store = await cookies();
  store.set(SESSION_COOKIE, encode({ ...session, exp: expiresIn(SESSION_MAX_AGE_SECONDS) }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function setOAuthState(name: string, data: Record<string, string>) {
  const store = await cookies();
  store.set(name, encode({ ...data, exp: expiresIn(OAUTH_STATE_MAX_AGE_SECONDS) }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  });
}

export async function consumeOAuthState<T extends Record<string, string>>(
  name: string,
): Promise<T | null> {
  const store = await cookies();
  const payload = decode<T & SignedPayload>(store.get(name)?.value);
  store.delete(name);
  return isFresh(payload) ? payload : null;
}

export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/")) return "/link";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/link";
  return value;
}

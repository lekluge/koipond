import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export function verifyEventSubSignature(
  headers: { messageId: string; timestamp: string; signature: string | null },
  rawBody: string,
  secret: string,
): boolean {
  if (!headers.signature) return false;

  const hmacMessage = headers.messageId + headers.timestamp + rawBody;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(hmacMessage).digest("hex");

  const a = Buffer.from(headers.signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const MAX_MESSAGE_AGE_MS = 10 * 60 * 1000;

export function isFreshMessage(timestamp: string, now = Date.now()): boolean {
  const sentAt = Date.parse(timestamp);
  if (Number.isNaN(sentAt)) return false;
  return Math.abs(now - sentAt) <= MAX_MESSAGE_AGE_MS;
}

const seenMessageIds = new Map<string, number>();

export function isDuplicateMessage(messageId: string, now = Date.now()): boolean {
  for (const [id, seenAt] of seenMessageIds) {
    if (now - seenAt > MAX_MESSAGE_AGE_MS) seenMessageIds.delete(id);
  }
  if (seenMessageIds.has(messageId)) return true;
  seenMessageIds.set(messageId, now);
  return false;
}

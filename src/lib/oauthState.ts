import "server-only";
import { randomBytes } from "crypto";

export function randomState(): string {
  return randomBytes(16).toString("hex");
}

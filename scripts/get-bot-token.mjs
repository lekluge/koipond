import { readFileSync } from "node:fs";

const SCOPES = "user:read:chat user:write:chat user:bot";

function clientId() {
  if (process.env.TWITCH_CLIENT_ID) return process.env.TWITCH_CLIENT_ID;
  try {
    const envFile = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const match = envFile.match(/^TWITCH_CLIENT_ID="?(.+?)"?$/m);
    if (match) return match[1];
  } catch {
  }
  throw new Error("TWITCH_CLIENT_ID not found in the environment or .env.local");
}

const id = clientId();

const device = await fetch("https://id.twitch.tv/oauth2/device", {
  method: "POST",
  body: new URLSearchParams({ client_id: id, scopes: SCOPES }),
}).then((r) => r.json());

console.log("\n  Open this and log in as the BOT account (not your streamer account):\n");
console.log(`    ${device.verification_uri}`);
console.log(`    Code: ${device.user_code}\n`);
console.log("  Waiting for approval...");

const deadline = Date.now() + device.expires_in * 1000;
let token = null;

while (!token && Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, device.interval * 1000));

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: id,
      device_code: device.device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      scopes: SCOPES,
    }),
  });
  const json = await res.json();

  if (res.ok) token = json;
  else if (json.message && !/pending/i.test(json.message)) {
    throw new Error(`Twitch rejected the request: ${json.message}`);
  }
}

if (!token) throw new Error("Timed out waiting for approval.");

const user = await fetch("https://api.twitch.tv/helix/users", {
  headers: { Authorization: `Bearer ${token.access_token}`, "Client-Id": id },
})
  .then((r) => r.json())
  .then((j) => j.data[0]);

console.log(`\n  Authorized as: ${user.display_name} (${user.login})\n`);
console.log("  Put these into .env.local and into the Vercel project env:\n");
console.log(`TWITCH_BOT_USER_ID=${user.id}`);
console.log(`TWITCH_BOT_REFRESH_TOKEN=${token.refresh_token}\n`);

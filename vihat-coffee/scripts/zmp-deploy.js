#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Wrapper around `npx zmp deploy` that captures the version Zalo assigned
 * to the new build and posts a dev/test URL back to the Builder API so
 * the Studio's QR modal shows it automatically — no manual paste.
 *
 * Usage:
 *   npm run deploy:auto                    # interactive: pick Dev/Test
 *   ADMIN_TOKEN=xxx npm run deploy:auto    # auto-save
 *
 * Env (also picked up from `.env`):
 *   BUILDER_API_BASE   default https://vihatcafeminiapp-production.up.railway.app
 *   ADMIN_TOKEN        required to save back to API
 *   VITE_DEFAULT_APP_ID  tenant slug (default vihat-cafe)
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function loadDotEnv() {
  const dotenv = path.join(process.cwd(), ".env");
  if (!fs.existsSync(dotenv)) return;
  for (const line of fs.readFileSync(dotenv, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key]) continue;
    process.env[key] = raw.replace(/^['"]|['"]$/g, "").trim();
  }
}
loadDotEnv();

const BUILDER_API =
  process.env.BUILDER_API_BASE ||
  "https://vihatcafeminiapp-production.up.railway.app";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const TENANT = process.env.VITE_DEFAULT_APP_ID || "vihat-cafe";

const zmpCli = require(path.join(process.cwd(), "zmp-cli.json"));
const ZALO_APP_ID = zmpCli.appId;
if (!ZALO_APP_ID) {
  console.error("[deploy:auto] zmp-cli.json missing appId — abort.");
  process.exit(1);
}

console.log(`[deploy:auto] tenant=${TENANT} zaloAppId=${ZALO_APP_ID}`);
console.log(`[deploy:auto] api=${BUILDER_API}`);
console.log(
  `[deploy:auto] ADMIN_TOKEN=${ADMIN_TOKEN ? "<set>" : "<MISSING - manual paste required>"}\n`
);

// Forward stdin so zmp's prompts still work; tee stdout so we can parse it.
const args = ["zmp", "deploy", ...process.argv.slice(2)];
const proc = spawn("npx", args, { stdio: ["inherit", "pipe", "inherit"] });

let captured = "";
proc.stdout.on("data", (chunk) => {
  const s = chunk.toString();
  process.stdout.write(s);
  captured += s;
});

proc.on("close", async (code) => {
  if (code !== 0) {
    console.error(`\n[deploy:auto] zmp deploy exited ${code}, skipping save.`);
    process.exit(code);
  }

  // Parse the version line zmp-cli prints in green, e.g. "Version: 3".
  const stripped = captured.replace(/\x1b\[[0-9;]*m/g, "");
  const verMatch = stripped.match(/Version:\s*(\d+)/i);
  if (!verMatch) {
    console.warn(
      "\n[deploy:auto] Could not detect Version: <n> in output — skipping auto-save."
    );
    process.exit(0);
  }
  const version = parseInt(verMatch[1], 10);

  // Guess environment from prompt outcome. The line is gone by now, so look
  // for the keyword anywhere in the log.
  const env = /testing/i.test(stripped) ? "TESTING" : "DEVELOPMENT";

  // Canonical share URL Zalo uses for unpublished builds.
  const url = `https://zalo.me/s/${ZALO_APP_ID}?env=${env}&v=${version}`;

  console.log(
    `\n[deploy:auto] captured version=${version} env=${env}\n[deploy:auto] url=${url}`
  );

  if (!ADMIN_TOKEN) {
    console.log(
      "\n[deploy:auto] ADMIN_TOKEN not set — printing URL only. Paste it into Studio's QR modal."
    );
    process.exit(0);
  }

  try {
    const res = await fetch(`${BUILDER_API}/api/apps/${TENANT}/runtime`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": ADMIN_TOKEN,
      },
      body: JSON.stringify({
        zaloDevUrl: env === "DEVELOPMENT" ? url : undefined,
        zaloTestUrl: env === "TESTING" ? url : undefined,
        zaloDevVersion: version,
        lastDeployedAt: new Date().toISOString(),
        lastDeployedEnv: env,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status} ${text.slice(0, 200)}`);
    }
    console.log(
      "[deploy:auto] ✓ saved to Builder API — refresh Studio + open QR modal."
    );
  } catch (e) {
    console.error("[deploy:auto] save failed:", e.message);
    process.exitCode = 1;
  }
});

#!/usr/bin/env node
/**
 * Read ZMP_TOKEN from the local `.env` (the one zmp-cli writes on
 * `zmp login`) and push it to the Builder API, which encrypts it and
 * stores it in GitHub Actions secrets so the next Studio "Deploy now"
 * works without manual paste.
 *
 * Usage:  node scripts/sync-zmp-token.js
 *      OR npm run sync:zmp
 *
 * Reads from .env:
 *   ZMP_TOKEN              the Zalo access token (zmp-cli writes this)
 *   ADMIN_TOKEN            Builder API admin token
 *   BUILDER_API_BASE       optional override, default Railway prod URL
 */
const fs = require("fs");
const path = require("path");

function readDotEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim();
  }
  return out;
}

// Merge .env from repo root and vihat-coffee/, then env vars override.
const root = path.resolve(__dirname, "..");
const env = {
  ...readDotEnv(path.join(root, ".env")),
  ...readDotEnv(path.join(root, "vihat-coffee", ".env")),
  ...process.env,
};

const ZMP = env.ZMP_TOKEN;
const ADMIN = env.ADMIN_TOKEN;
const API =
  env.BUILDER_API_BASE ||
  "https://vihatcafeminiapp-production.up.railway.app";

if (!ZMP) {
  console.error("✗ ZMP_TOKEN not found in .env.");
  console.error("  Run `npx zmp login` first (in vihat-coffee/) to refresh.");
  process.exit(1);
}
if (!ADMIN) {
  console.error("✗ ADMIN_TOKEN not found in .env.");
  console.error("  Add it to the repo-root .env. You can copy from Railway.");
  process.exit(1);
}

// Decode JWT payload to check expiry. Refuse to push an already-expired
// token — that just wastes a GH secret update and the next deploy will
// fail anyway with "Permission denied. Please login again".
let expDate = "unknown";
let expiredHoursAgo = 0;
try {
  const payload = JSON.parse(
    Buffer.from(ZMP.split(".")[1], "base64").toString("utf8")
  );
  if (payload.exp) {
    expDate = new Date(payload.exp * 1000).toLocaleString();
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      expiredHoursAgo = Math.floor((now - payload.exp) / 3600);
    }
  }
} catch {}

console.log(`[sync-zmp-token] api=${API}`);
console.log(`[sync-zmp-token] token length=${ZMP.length}, expires=${expDate}`);

if (expiredHoursAgo > 0) {
  console.error(
    `✗ Token đã expire ${expiredHoursAgo}h trước. Chạy 'cd vihat-coffee && npx zmp login' trước.`
  );
  process.exit(1);
}

(async () => {
  try {
    const r = await fetch(`${API}/api/admin/zmp-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": ADMIN,
      },
      body: JSON.stringify({ token: ZMP }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error(`✗ ${r.status}: ${data.error || JSON.stringify(data)}`);
      process.exit(1);
    }
    console.log("✓ ZMP_TOKEN pushed to GitHub Actions secrets.");
    if (data.expiresAt) {
      console.log(
        `  Expires: ${new Date(data.expiresAt).toLocaleString()} — re-sync before that.`
      );
    }
  } catch (e) {
    console.error("✗ Network/parse error:", e.message);
    process.exit(1);
  }
})();

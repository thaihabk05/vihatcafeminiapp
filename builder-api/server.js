/**
 * VIHAT MiniApp Builder — Config API
 *
 * Multi-tenant config store. Each tenant is one JSON file under DATA_DIR.
 *
 * Auth model
 * ----------
 * Reads (GET) are public — the Mini App Shell needs to fetch tenant config
 * from inside Zalo with no credentials.
 *
 * Writes (PUT/DELETE) require `X-Admin-Token` matching the ADMIN_TOKEN env
 * var. Used by the Builder Studio admin UI.
 *
 * If ADMIN_TOKEN is unset (typical for local dev) writes are open. In prod
 * the Railway env MUST set it.
 */
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const PORT = parseInt(process.env.PORT || "4000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const SEED_DIR = path.join(__dirname, "data-seed");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

// CORS allowlist. Comma-separated origins. Empty = open (POC only).
// Pattern support: entries wrapped in /…/ are treated as RegExp source,
// e.g. "/^https:\\/\\/[a-z0-9-]+\\.vercel\\.app$/" for any Vercel preview.
const ALLOWED = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_MATCHERS = ALLOWED.map((s) => {
  if (s.length > 2 && s.startsWith("/") && s.endsWith("/")) {
    try {
      return new RegExp(s.slice(1, -1));
    } catch {
      return s;
    }
  }
  return s;
});

function originAllowed(origin) {
  if (!origin) return true;
  return ALLOWED_MATCHERS.some((m) => {
    if (m instanceof RegExp) return m.test(origin);
    return m === origin;
  });
}

function seedIfEmpty() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const existing = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  if (existing.length > 0) return;
  if (!fs.existsSync(SEED_DIR)) return;
  for (const f of fs.readdirSync(SEED_DIR)) {
    if (!f.endsWith(".json")) continue;
    fs.copyFileSync(path.join(SEED_DIR, f), path.join(DATA_DIR, f));
  }
  console.log(`[builder-api] seeded ${DATA_DIR} from ${SEED_DIR}`);
}
seedIfEmpty();

function tenantPath(appId) {
  if (!/^[a-z0-9\-]+$/i.test(appId)) {
    throw new Error("invalid appId");
  }
  return path.join(DATA_DIR, `${appId}.json`);
}

function readTenant(appId) {
  const file = tenantPath(appId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeTenant(appId, data) {
  fs.writeFileSync(tenantPath(appId), JSON.stringify(data, null, 2), "utf8");
}

function listTenants() {
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const id = f.replace(/\.json$/, "");
      const t = readTenant(id);
      return {
        appId: id,
        name: t.app.title,
        primaryColor: t.template.primaryColor,
      };
    });
}

const app = express();

app.use(
  cors({
    origin:
      ALLOWED.length === 0
        ? true
        : (origin, cb) => cb(null, originAllowed(origin)),
    credentials: false,
    allowedHeaders: ["Content-Type", "X-Admin-Token"],
  })
);
app.use(express.json({ limit: "2mb" }));

app.use(
  "/assets",
  express.static(path.join(__dirname, "public", "assets"), {
    maxAge: "1h",
    setHeaders: (res) => res.setHeader("Cache-Control", "public, max-age=3600"),
  })
);

// Mutation auth. Only enforce if ADMIN_TOKEN is configured.
function requireAuth(req, res, next) {
  if (!ADMIN_TOKEN) return next();
  const provided = req.headers["x-admin-token"];
  if (provided && provided === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: "unauthorized" });
}

// --- Public reads (Mini App Shell + Studio) ---
app.get("/api/tenants", (_req, res) => res.json(listTenants()));

app.get("/api/apps/:appId/config", (req, res) => {
  const data = readTenant(req.params.appId);
  if (!data) return res.status(404).json({ error: "tenant not found" });
  res.json(data);
});

const SECTIONS = [
  "app",
  "template",
  "banners",
  "categories",
  "products",
  // Runtime metadata: dev/test URLs written by the zmp-deploy wrapper.
  // Shape: { zaloDevUrl?, zaloTestUrl?, zaloDevVersion?, lastDeployedAt? }
  "runtime",
];
for (const section of SECTIONS) {
  app.get(`/api/apps/:appId/${section}`, (req, res) => {
    const data = readTenant(req.params.appId);
    if (!data) return res.status(404).json({ error: "tenant not found" });
    res.json(data[section]);
  });

  app.put(`/api/apps/:appId/${section}`, requireAuth, (req, res) => {
    const appId = req.params.appId;
    const data = readTenant(appId);
    if (!data) return res.status(404).json({ error: "tenant not found" });
    data[section] = req.body;
    data.updatedAt = new Date().toISOString();
    writeTenant(appId, data);
    res.json({ ok: true, updatedAt: data.updatedAt });
  });
}

// --- Studio bootstrap ---
// Lets the Studio confirm its stored token without making a mutating request.
app.get("/api/admin/check", requireAuth, (_req, res) =>
  res.json({ ok: true, authed: true })
);

/**
 * Debug: tail the failing step's log from a GitHub Actions workflow run.
 * Uses the same GITHUB_TOKEN env the dispatch endpoint already needs.
 */
app.get("/api/admin/gh-log/:runId", requireAuth, async (req, res) => {
  const GH_TOKEN = process.env.GITHUB_TOKEN;
  const GH_REPO = process.env.GITHUB_REPO;
  if (!GH_TOKEN || !GH_REPO) {
    return res.status(503).json({ error: "github not configured" });
  }
  try {
    const r = await fetch(
      `https://api.github.com/repos/${GH_REPO}/actions/runs/${req.params.runId}/logs`,
      {
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
        redirect: "follow",
      }
    );
    if (!r.ok) {
      return res.status(r.status).json({ error: await r.text() });
    }
    // The endpoint returns a zip. Send through.
    res.set("Content-Type", "application/zip");
    const buf = Buffer.from(await r.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Push a fresh ZMP_TOKEN to GitHub Secrets so the next workflow run picks
 * it up. `zmp login`-issued tokens expire every 24 hours, so we want this
 * to be a single click / single command rather than a manual visit to the
 * repo's Settings → Secrets page.
 *
 * Body: { token: string }
 */
app.post("/api/admin/zmp-token", requireAuth, async (req, res) => {
  const GH_TOKEN = process.env.GITHUB_TOKEN;
  const GH_REPO = process.env.GITHUB_REPO;
  if (!GH_TOKEN || !GH_REPO) {
    return res.status(503).json({
      error:
        "GitHub integration not configured. Set GITHUB_TOKEN and GITHUB_REPO on the Builder API.",
    });
  }
  const token = (req.body || {}).token;
  if (typeof token !== "string" || token.length < 50) {
    return res
      .status(400)
      .json({ error: "missing or implausibly-short token in body" });
  }

  try {
    const sodium = require("libsodium-wrappers");
    await sodium.ready;

    // 1) Fetch the repo's public key to encrypt against.
    const pkRes = await fetch(
      `https://api.github.com/repos/${GH_REPO}/actions/secrets/public-key`,
      {
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    );
    if (!pkRes.ok) {
      const txt = await pkRes.text();
      throw new Error(
        `GitHub public-key fetch ${pkRes.status}: ${txt.slice(0, 200)}`
      );
    }
    const { key, key_id } = await pkRes.json();

    // 2) Encrypt with libsodium sealed box.
    const binkey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);
    const binsec = sodium.from_string(token);
    const encBin = sodium.crypto_box_seal(binsec, binkey);
    const encrypted_value = sodium.to_base64(
      encBin,
      sodium.base64_variants.ORIGINAL
    );

    // 3) PUT the secret.
    const setRes = await fetch(
      `https://api.github.com/repos/${GH_REPO}/actions/secrets/ZMP_TOKEN`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ encrypted_value, key_id }),
      }
    );
    if (!setRes.ok) {
      const txt = await setRes.text();
      throw new Error(
        `GitHub secret PUT ${setRes.status}: ${txt.slice(0, 200)}`
      );
    }

    // 4) Decode JWT payload to surface expiry back to the caller.
    let exp = null;
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString("utf8")
      );
      if (payload.exp) exp = payload.exp * 1000;
    } catch {}

    res.json({ ok: true, expiresAt: exp });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Trigger a GitHub Actions deploy via `repository_dispatch`.
 *
 * Requires the following env on the API server:
 *   GITHUB_TOKEN   PAT with `repo` scope
 *   GITHUB_REPO    "owner/repo" e.g. "thaihabk05/vihatcafeminiapp"
 *
 * Body: { env: "DEVELOPMENT" | "TESTING", description?: string }
 */
app.post("/api/apps/:appId/trigger-deploy", requireAuth, async (req, res) => {
  const { appId } = req.params;
  const data = readTenant(appId);
  if (!data) return res.status(404).json({ error: "tenant not found" });

  const GH_TOKEN = process.env.GITHUB_TOKEN;
  const GH_REPO = process.env.GITHUB_REPO;
  if (!GH_TOKEN || !GH_REPO) {
    return res.status(503).json({
      error:
        "GitHub deploy not configured. Set GITHUB_TOKEN and GITHUB_REPO env vars on the Builder API service.",
    });
  }

  const body = req.body || {};
  const env =
    body.env === "TESTING" || body.env === "DEVELOPMENT"
      ? body.env
      : "DEVELOPMENT";
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim().slice(0, 120)
      : `Deploy from Studio — ${new Date().toISOString().slice(0, 16)}`;

  try {
    const r = await fetch(
      `https://api.github.com/repos/${GH_REPO}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: "studio-deploy",
          client_payload: { tenant: appId, env, description },
        }),
      }
    );
    if (!r.ok) {
      const txt = await r.text();
      return res
        .status(502)
        .json({ error: `GitHub dispatch failed (${r.status}): ${txt.slice(0, 200)}` });
    }
    // Record the trigger so the Studio can poll for runtime changes.
    data.runtime = data.runtime || {};
    data.runtime.lastTriggeredAt = new Date().toISOString();
    data.runtime.lastTriggeredEnv = env;
    writeTenant(appId, data);
    res.json({
      ok: true,
      env,
      description,
      triggeredAt: data.runtime.lastTriggeredAt,
      actionsUrl: `https://github.com/${GH_REPO}/actions/workflows/deploy.yml`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    tenants: listTenants().length,
    dataDir: DATA_DIR,
    env: process.env.NODE_ENV || "development",
    authEnabled: !!ADMIN_TOKEN,
  })
);

app.listen(PORT, HOST, () => {
  console.log(`[builder-api] listening on http://${HOST}:${PORT}`);
  console.log(`[builder-api] DATA_DIR=${DATA_DIR}`);
  console.log(
    `[builder-api] AUTH=${ADMIN_TOKEN ? "enabled" : "open (set ADMIN_TOKEN)"}`
  );
  console.log(
    `[builder-api] CORS=${ALLOWED.length ? ALLOWED.join(", ") : "open (*)"}`
  );
  console.log(
    `[builder-api] tenants:`,
    listTenants().map((t) => t.appId)
  );
});

/**
 * VIHAT MiniApp Builder — Config API
 *
 * Express server backing the multi-tenant Mini App platform.
 * Each tenant is one JSON file under DATA_DIR.
 *
 * In production (Railway / Render / Fly) attach a persistent volume at
 * DATA_DIR so writes from the Studio survive deploys. On first boot we copy
 * the seed configs from SEED_DIR into DATA_DIR if it's empty.
 */
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const PORT = parseInt(process.env.PORT || "4000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const SEED_DIR = path.join(__dirname, "data-seed");

// In prod, restrict CORS to known origins. ALLOWED_ORIGINS is a comma-separated
// list, e.g. "https://h5.zdn.vn,https://studio.vihat.vn". Default = open for POC.
const ALLOWED = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

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
    origin: ALLOWED.length === 0 ? true : ALLOWED,
    credentials: false,
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

app.get("/api/tenants", (_req, res) => res.json(listTenants()));

app.get("/api/apps/:appId/config", (req, res) => {
  const data = readTenant(req.params.appId);
  if (!data) return res.status(404).json({ error: "tenant not found" });
  res.json(data);
});

const SECTIONS = ["app", "template", "banners", "categories", "products"];
for (const section of SECTIONS) {
  app.get(`/api/apps/:appId/${section}`, (req, res) => {
    const data = readTenant(req.params.appId);
    if (!data) return res.status(404).json({ error: "tenant not found" });
    res.json(data[section]);
  });

  app.put(`/api/apps/:appId/${section}`, (req, res) => {
    const appId = req.params.appId;
    const data = readTenant(appId);
    if (!data) return res.status(404).json({ error: "tenant not found" });
    data[section] = req.body;
    data.updatedAt = new Date().toISOString();
    writeTenant(appId, data);
    res.json({ ok: true, updatedAt: data.updatedAt });
  });
}

app.get("/api/health", (_req, res) =>
  res.json({
    ok: true,
    tenants: listTenants().length,
    dataDir: DATA_DIR,
    env: process.env.NODE_ENV || "development",
  })
);

app.listen(PORT, HOST, () => {
  console.log(`[builder-api] listening on http://${HOST}:${PORT}`);
  console.log(`[builder-api] DATA_DIR=${DATA_DIR}`);
  console.log(
    `[builder-api] CORS=${ALLOWED.length ? ALLOWED.join(", ") : "open (*)"}`
  );
  console.log(
    `[builder-api] tenants:`,
    listTenants().map((t) => t.appId)
  );
});

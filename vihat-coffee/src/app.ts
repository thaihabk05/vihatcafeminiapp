// MUST be first: stubs the Zalo bridge for browser-mode previews so
// zmp-sdk/zmp-ui calls at init time don't reject and blank the app.
import "./zalo-stub";

// Import React and ReactDOM
import React from "react";
import { createRoot } from "react-dom/client";

import "swiper/css";
import "swiper/css/pagination";
import "zmp-ui/zaui.css";
import "./css/tailwind.css";
import "./css/app.scss";

// Import App Component
import App from "./components/app";
import fallbackConfig from "../app-config.json";
import { fetchAppConfig, getAppId } from "./utils/api";

function reportFatal(stage: string, err: unknown) {
  let msg = "";
  if (err instanceof Error) {
    msg = `${err.name}: ${err.message}\n\n${err.stack || ""}`;
  } else if (err && typeof err === "object") {
    try {
      msg = JSON.stringify(
        err,
        Object.getOwnPropertyNames(err as object),
        2
      );
    } catch {
      msg = String(err);
    }
  } else {
    msg = String(err);
  }
  console.error(`[shell] fatal at ${stage}:`, err, "→ message:", msg);

  // Append to body so React's tree (if any) stays mounted underneath; we want
  // visible debug, not to replace working content.
  const id = `shell-fatal-${stage}`;
  if (document.getElementById(id)) return;
  const wrap = document.createElement("div");
  wrap.id = id;
  wrap.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:99999;padding:12px;background:#FEF2F2;border-bottom:2px solid #DC2626;font-family:-apple-system,sans-serif;font-size:12px;color:#7F1D1D;max-height:70vh;overflow:auto";
  wrap.innerHTML = `<div style="font-weight:700;margin-bottom:6px">⚠ ${stage}</div><pre style="white-space:pre-wrap;margin:0">${msg.replace(
    /</g,
    "&lt;"
  )}</pre>`;
  document.body.appendChild(wrap);
}

/**
 * `zmp-sdk` and `zmp-ui` happily call into Zalo bridges at mount time and
 * reject when no Zalo runtime is present (Studio preview iframe, healthcheck,
 * normal browser). Those rejections are harmless — silence them so they don't
 * blank the app or scare users.
 */
function isHarmlessZmpRejection(reason: unknown): boolean {
  if (!reason || typeof reason !== "object") return false;
  const r = reason as { code?: number; api?: string; message?: string };
  if (typeof r.api === "string") return true; // zmp-sdk error envelope
  if (r.code === -2000) return true;
  return false;
}

window.addEventListener("error", (e) =>
  reportFatal("window.error", e.error || e.message)
);
window.addEventListener("unhandledrejection", (e) => {
  if (isHarmlessZmpRejection(e.reason)) {
    console.warn("[shell] suppressed zmp-sdk rejection:", e.reason);
    e.preventDefault();
    return;
  }
  reportFatal("unhandledrejection", e.reason);
});

/**
 * Server-Driven UI bootstrap.
 *
 * Before mounting React we fetch this tenant's config from the Builder API
 * and merge it onto the static fallback so `getConfig(...)` keeps working
 * unchanged for every page. Server content (banners/categories/products) is
 * attached under `_serverData` and consumed by Recoil selectors in state.ts.
 *
 * Every stage is wrapped so a single failure surfaces a debuggable message
 * instead of a blank screen.
 */
(async () => {
  let merged: any = fallbackConfig;
  try {
    const cfg = await fetchAppConfig();
    merged = {
      ...fallbackConfig,
      app: {
        ...fallbackConfig.app,
        title: cfg.app.title,
        tagline: cfg.app.tagline,
      },
      template: {
        ...fallbackConfig.template,
        primaryColor: cfg.template.primaryColor,
        currencySymbol: cfg.template.currencySymbol ?? "đ",
        prefixCurrencySymbol: !!cfg.template.prefixCurrencySymbol,
        headerLogo: cfg.template.headerLogo || "",
      },
      _serverData: {
        appId: cfg.appId,
        industry: cfg.industry,
        banners: cfg.banners || [],
        categories: cfg.categories || [],
        products: cfg.products || [],
      },
    };
    console.info(`[shell] loaded tenant "${cfg.appId}" (${cfg.industry})`);
  } catch (e) {
    console.warn(
      `[shell] failed to load tenant "${getAppId()}", using fallback:`,
      e
    );
  }

  // @ts-expect-error global write
  window.APP_CONFIG = merged;
  document.title = merged.app.title;

  try {
    const container = document.getElementById("app");
    if (!container) throw new Error("missing #app container");
    const root = createRoot(container);
    root.render(React.createElement(App));
    console.info("[shell] React mounted");
  } catch (e) {
    reportFatal("react-mount", e);
  }
})().catch((e) => reportFatal("bootstrap", e));

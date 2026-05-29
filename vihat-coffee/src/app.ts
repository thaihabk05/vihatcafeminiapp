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

/**
 * Server-Driven UI bootstrap.
 *
 * Before mounting React we fetch this tenant's config from the Builder API
 * and merge it onto the static fallback so `getConfig(...)` keeps working
 * unchanged for every page. Server content (banners/categories/products) is
 * attached under `_serverData` and consumed by Recoil selectors in state.ts.
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

  // Mount React App
  const root = createRoot(document.getElementById("app")!);
  root.render(React.createElement(App));
})();

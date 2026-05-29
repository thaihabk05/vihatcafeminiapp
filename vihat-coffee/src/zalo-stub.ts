/**
 * Browser-mode stub for the Zalo SDK.
 *
 * Outside Zalo (Studio preview iframe, Railway healthcheck, normal browser):
 *   1. `zmp-sdk` initialises its `appEnv` from the URL — both `isMp` and
 *      `isMpWeb` come out `false`, so every API (login, getSystemInfo, …)
 *      rejects with `{code: -2000, api: <name>}`.
 *   2. `zmp-ui`'s `<App>` calls `login()` on mount. The rejection cascades:
 *      `<App>` never mounts its children → `<ZMPRouter>` never provides
 *      context → every component using `useNavigate` from zmp-ui throws.
 *
 * The fix that lets the full UI render outside Zalo:
 *   - Mutate `appEnv.isMpWeb = true` so the SDK takes its "web preview"
 *     branch and resolves with empty strings instead of rejecting.
 *   - Install minimal window bridges that the SDK pokes at for things like
 *     status-bar height.
 *
 * This file MUST be imported before anything else that touches `zmp-sdk`
 * or `zmp-ui`, otherwise the SDK runs with the unpatched values.
 */
import appEnv from "zmp-sdk/apis/appEnv";

declare global {
  interface Window {
    __VIHAT_ZALO_STUB?: boolean;
    ZaloJavaScriptInterface?: {
      getStatusBarHeight: () => number;
      [k: string]: any;
    };
    zmp?: unknown;
    webkit?: { messageHandlers?: Record<string, { postMessage: Function }> };
  }
}

if (typeof window !== "undefined" && !window.ZaloJavaScriptInterface) {
  window.__VIHAT_ZALO_STUB = true;

  // Flip the SDK into "web preview" mode. login() etc. now resolve quietly.
  if (appEnv && typeof appEnv === "object") {
    (appEnv as any).isMpWeb = true;
  }

  // ZMPRouter computes `basename = "/zapps/" + window.APP_ID` in production
  // builds. With no APP_ID and a URL of "/" the basename never matches and
  // every route renders empty. Set APP_ID to an empty string and make sure
  // the URL sits under /zapps/ so the router can mount at root.
  if (!(window as any).APP_ID) (window as any).APP_ID = "";
  if (!window.location.pathname.startsWith("/zapps/")) {
    const target = "/zapps/" + window.location.search + window.location.hash;
    history.replaceState(null, "", target);
  }

  const noop = () => 0;
  // Android-style bridge — many SDK calls funnel through this.
  window.ZaloJavaScriptInterface = new Proxy(
    { getStatusBarHeight: () => 0 },
    {
      get(target, prop: string) {
        if (prop in target) return (target as any)[prop];
        return noop;
      },
    }
  ) as Window["ZaloJavaScriptInterface"];

  // iOS-style bridge.
  if (!window.webkit) window.webkit = {};
  if (!window.webkit.messageHandlers) window.webkit.messageHandlers = {};
  window.webkit.messageHandlers.zmp = { postMessage: () => {} };

  // Some flows look for a generic zmp object.
  if (!window.zmp) {
    window.zmp = new Proxy(
      {},
      {
        get(_, prop: string) {
          if (prop === "then") return undefined;
          return () => ({});
        },
      }
    );
  }

  console.info(
    "[shell] zalo-stub installed: appEnv.isMpWeb=true, bridges mounted"
  );
}

export {};

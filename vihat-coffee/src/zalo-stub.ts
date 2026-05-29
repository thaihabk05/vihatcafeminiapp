/**
 * Browser-mode stub for the Zalo native bridge.
 *
 * `zmp-sdk` and `zmp-ui` call into the Zalo runtime at mount time (login,
 * getSystemInfo, etc.). Outside Zalo those calls reject and the Mini App
 * blanks. Importing this file installs a minimal stub on `window` so the
 * SDK silently no-ops instead of throwing.
 *
 * This file MUST be imported before any module that touches `zmp-sdk`.
 */
if (typeof window !== "undefined" && !(window as any).ZaloJavaScriptInterface) {
  (window as any).__VIHAT_ZALO_STUB = true;
  const noop = () => {};
  const mockReturn = () => ({});

  // Generic bridge — many SDK calls funnel through this.
  (window as any).ZaloJavaScriptInterface = new Proxy(
    {
      getStatusBarHeight: () => 0,
    },
    {
      get(target, prop: string) {
        if (prop in target) return (target as any)[prop];
        return noop;
      },
    }
  );

  // iOS-style bridge.
  if (!(window as any).webkit) (window as any).webkit = {};
  if (!(window as any).webkit.messageHandlers) {
    (window as any).webkit.messageHandlers = {};
  }
  (window as any).webkit.messageHandlers.zmp = { postMessage: noop };

  // Some flows look for a top-level zmp object too.
  if (!(window as any).zmp) {
    (window as any).zmp = new Proxy(
      {},
      {
        get(_, prop: string) {
          if (prop === "then") return undefined;
          return mockReturn;
        },
      }
    );
  }

  console.info("[shell] installed zalo-stub for browser-mode preview");
}

export {};

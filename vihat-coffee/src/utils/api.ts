/**
 * Server-Driven UI client for the VIHAT MiniApp Builder.
 *
 * The Mini App Shell is a single codebase that renders any tenant's storefront
 * by reading config + content from the Builder API. Tenant is picked via the
 * `?appId=...` URL param (default: VITE_DEFAULT_APP_ID).
 *
 * Inside Zalo the app opens at root with no query string, so we also try to
 * read the Mini App ID from the Zalo SDK and map it to a tenant slug.
 */
import { getSystemInfo } from "zmp-sdk";

const env = (import.meta as any).env || {};
export const API_BASE: string =
  env.VITE_API_BASE || "http://127.0.0.1:4000";
export const DEFAULT_APP_ID: string =
  env.VITE_DEFAULT_APP_ID || "vihat-cafe";

/**
 * Map of Zalo Mini App IDs → internal tenant slugs. Extend this when you
 * register a new mini app on mini.zalo.me and bind it to a tenant.
 */
const ZALO_ID_TO_SLUG: Record<string, string> = {
  "1352472476106621006": "vihat-cafe",
};

export function getAppId(): string {
  if (typeof window === "undefined") return DEFAULT_APP_ID;

  // 1) Explicit override via URL — useful for previewing other tenants.
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("appId");
  if (fromQuery) return fromQuery;

  // 2) Detect from Zalo runtime when running inside Zalo Mini App.
  try {
    const info: any = getSystemInfo();
    const zaloId = String(info?.zaloAppId || info?.appID || "");
    if (zaloId && ZALO_ID_TO_SLUG[zaloId]) {
      return ZALO_ID_TO_SLUG[zaloId];
    }
  } catch {
    // getSystemInfo throws outside Zalo — fall through.
  }

  // 3) Build-time default.
  return DEFAULT_APP_ID;
}

export type ServerAppConfig = {
  appId: string;
  industry: string;
  app: { title: string; tagline?: string };
  template: {
    primaryColor: string;
    backgroundColor?: string;
    currencySymbol: string;
    prefixCurrencySymbol: boolean;
    headerLogo?: string;
  };
  banners: { id: string; image: string; title?: string }[];
  categories: { id: string; name: string; icon: string }[];
  products: any[];
};

export async function fetchAppConfig(): Promise<ServerAppConfig> {
  const appId = getAppId();
  const r = await fetch(`${API_BASE}/api/apps/${appId}/config`);
  if (!r.ok) throw new Error(`config fetch failed: ${r.status}`);
  return r.json();
}

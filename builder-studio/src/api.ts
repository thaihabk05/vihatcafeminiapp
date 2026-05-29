const env = (import.meta as any).env || {};
export const API_BASE: string =
  env.VITE_API_BASE || "http://127.0.0.1:4000";
export const SHELL_BASE: string =
  env.VITE_SHELL_BASE || "http://127.0.0.1:3000";

const TOKEN_KEY = "vihat-admin-token";

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || "";
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  const t = getToken();
  return t ? { ...extra, "X-Admin-Token": t } : extra;
}

async function j<T>(r: Response): Promise<T> {
  if (r.status === 401) {
    clearToken();
    // Force re-render of the login gate
    window.dispatchEvent(new CustomEvent("studio:unauthorized"));
    throw new Error("unauthorized");
  }
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export type Tenant = { appId: string; name: string; primaryColor: string };
export type AppMeta = { title: string; tagline?: string };
export type Template = {
  primaryColor: string;
  backgroundColor?: string;
  currencySymbol: string;
  prefixCurrencySymbol: boolean;
  headerLogo?: string;
};
export type Banner = { id: string; image: string; title?: string };
export type Category = { id: string; name: string; icon: string };
export type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  categoryId: string[];
  variantId?: string[];
  sale?: { type: "percent" | "fixed"; percent?: number; amount?: number };
};

export const api = {
  /** Validate the stored token (used by login gate to verify on boot). */
  check: () =>
    fetch(`${API_BASE}/api/admin/check`, { headers: authHeaders() }).then(
      (r) => r.ok
    ),

  tenants: () => fetch(`${API_BASE}/api/tenants`).then(j<Tenant[]>),

  getApp: (id: string) =>
    fetch(`${API_BASE}/api/apps/${id}/app`).then(j<AppMeta>),
  getTemplate: (id: string) =>
    fetch(`${API_BASE}/api/apps/${id}/template`).then(j<Template>),
  getBanners: (id: string) =>
    fetch(`${API_BASE}/api/apps/${id}/banners`).then(j<Banner[]>),
  getCategories: (id: string) =>
    fetch(`${API_BASE}/api/apps/${id}/categories`).then(j<Category[]>),
  getProducts: (id: string) =>
    fetch(`${API_BASE}/api/apps/${id}/products`).then(j<Product[]>),

  put: <T>(id: string, section: string, body: T) =>
    fetch(`${API_BASE}/api/apps/${id}/${section}`, {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    }).then(j<{ ok: boolean; updatedAt: string }>),
};

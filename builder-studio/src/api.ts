export const API_BASE = "http://127.0.0.1:4000";
export const SHELL_BASE = "http://127.0.0.1:3000";

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

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export const api = {
  tenants: () => fetch(`${API_BASE}/api/tenants`).then(j<Tenant[]>),
  getApp: (id: string) => fetch(`${API_BASE}/api/apps/${id}/app`).then(j<AppMeta>),
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(j<{ ok: boolean; updatedAt: string }>),
};

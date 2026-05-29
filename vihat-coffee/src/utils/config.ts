import fallback from "../../app-config.json";

type ConfigShape = typeof fallback & {
  app: typeof fallback.app & { tagline?: string };
  _serverData?: {
    appId: string;
    industry: string;
    banners: { id: string; image: string; title?: string }[];
    categories: { id: string; name: string; icon: string }[];
    products: any[];
  };
};

function currentConfig(): ConfigShape {
  if (typeof window !== "undefined" && (window as any).APP_CONFIG) {
    return (window as any).APP_CONFIG as ConfigShape;
  }
  return fallback as ConfigShape;
}

export function getConfig<T>(getter: (config: ConfigShape) => T) {
  return getter(currentConfig());
}

/** Server-Driven UI payload (banners/categories/products) for this tenant. */
export function getServerData() {
  return (
    currentConfig()._serverData ?? {
      appId: "fallback",
      industry: "unknown",
      banners: [] as { id: string; image: string; title?: string }[],
      categories: [] as { id: string; name: string; icon: string }[],
      products: [] as any[],
    }
  );
}

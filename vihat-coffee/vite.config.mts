import { defineConfig } from "vite";
import ZaloMiniApp from "zmp-vite-plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

/**
 * Production builds always include `zmp-vite-plugin` so it can emit
 * `www/app-config.json` (required by `zmp deploy`). Dev builds skip the
 * plugin so a plain `vite` run stays usable for local browser previews.
 *
 * Set VITE_API_BASE in `.env.production` to your deployed Builder API.
 */
export default ({ mode }: { mode: string }) => {
  const isProd = mode === "production";

  return defineConfig({
    root: ".",
    base: "",
    plugins: [
      tsconfigPaths(),
      react(),
      ...(isProd ? [ZaloMiniApp()] : []),
    ],
    server: {
      port: 3000,
      host: "127.0.0.1",
    },
    build: {
      outDir: "www",
      emptyOutDir: true,
    },
  });
};

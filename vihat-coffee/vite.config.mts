import { defineConfig, loadEnv } from "vite";
import ZaloMiniApp from "zmp-vite-plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

/**
 * Two-mode config:
 *
 * - `vite` / `vite build`     → preview mode (local), no zmp plugin.
 *   Lets us screenshot in a normal browser without Zalo runtime.
 * - `zmp start` / `zmp deploy` → production mode for Zalo. Sets the
 *   ZMP env flag so the plugin is loaded and the build is packaged
 *   for Zalo Mini App Studio.
 *
 * Set VITE_API_BASE to point at your deployed Builder API.
 * Example: VITE_API_BASE=https://api.vihat-cafe.up.railway.app
 */
export default ({ mode }: { mode: string }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isZmp = !!env.ZMP || !!env.ZMP_DEPLOY;

  return defineConfig({
    root: isZmp ? "./src" : ".",
    base: "",
    plugins: [
      tsconfigPaths(),
      react(),
      ...(isZmp ? [ZaloMiniApp()] : []),
    ],
    server: {
      port: 3000,
      host: "127.0.0.1",
    },
  });
};

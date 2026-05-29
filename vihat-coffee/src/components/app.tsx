import React from "react";
import { App, ZMPRouter, SnackbarProvider } from "zmp-ui";
import { RecoilRoot } from "recoil";
import { getConfig } from "utils/config";
import { Layout } from "./layout";
import { ConfigProvider } from "./config-provider";

const isBrowserPreview =
  typeof window !== "undefined" &&
  !!(window as any).__VIHAT_ZALO_STUB &&
  !((window as any).ZaloJavaScriptInterface?.real === true);

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[shell] render error:", error, info);
  }
  render() {
    if (this.state.error) {
      return <BrowserPreviewNotice />;
    }
    return <>{this.props.children}</>;
  }
}

/**
 * Outside Zalo Mini App runtime (Studio preview, healthcheck, normal browser)
 * the zmp-ui App/Router chain can't fully boot. Show a branded preview card
 * so it's clear to the viewer the app is alive, configured, and just needs
 * to be opened inside Zalo to mount the real UI.
 */
const BrowserPreviewNotice: React.FC = () => {
  const title = getConfig((c) => c.app.title);
  const tagline = getConfig((c) => (c as any).app?.tagline) as
    | string
    | undefined;
  const primary = getConfig((c) => c.template.primaryColor) || "#E94E1B";
  const sd = (window as any).APP_CONFIG?._serverData || {};
  const banners: { image: string; title?: string }[] = sd.banners || [];
  const banner = banners[0];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f5f6",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: 16,
      }}
    >
      <div
        style={{
          maxWidth: 360,
          margin: "12vh auto 0",
          background: "#fff",
          borderRadius: 16,
          padding: 20,
          boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: primary,
              color: "#fff",
              fontWeight: 900,
              fontSize: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            V
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
            {tagline && (
              <div style={{ fontSize: 11, color: "#64748b" }}>{tagline}</div>
            )}
          </div>
        </div>

        {banner?.image && (
          <div
            style={{
              marginTop: 16,
              aspectRatio: "2 / 1",
              borderRadius: 10,
              backgroundImage: `url(${banner.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              background: `${primary} center/cover no-repeat url(${banner.image})`,
            }}
          />
        )}

        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#FFF7ED",
            border: `1px solid ${primary}33`,
            borderRadius: 8,
            fontSize: 12,
            color: "#7c2d12",
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Preview mode (browser)
          </div>
          Mini app này render đầy đủ khi mở trong app Zalo. Trong Studio đây là
          xem trước cấu hình:&nbsp;
          {sd.categories?.length || 0} danh mục, {sd.products?.length || 0} sản
          phẩm, {banners.length} banner.
        </div>
      </div>
    </div>
  );
};

const MyApp = () => {
  // In a normal browser, skip the zmp-ui tree entirely — show the branded
  // notice instead. This avoids the silent-failure cascade where zmp-ui's
  // login rejects, ZMPRouter never mounts, and `useNavigate` blows up.
  if (isBrowserPreview) {
    return <BrowserPreviewNotice />;
  }

  return (
    <ErrorBoundary>
      <RecoilRoot>
        <ConfigProvider
          cssVariables={{
            "--zmp-primary-color": getConfig((c) => c.template.primaryColor),
            "--zmp-background-color": "#f4f5f6",
          }}
        >
          <App>
            <SnackbarProvider>
              <ZMPRouter>
                <React.Suspense
                  fallback={
                    <div
                      style={{
                        padding: 16,
                        fontFamily: "system-ui",
                        color: "#94a3b8",
                      }}
                    >
                      Đang tải…
                    </div>
                  }
                >
                  <Layout />
                </React.Suspense>
              </ZMPRouter>
            </SnackbarProvider>
          </App>
        </ConfigProvider>
      </RecoilRoot>
    </ErrorBoundary>
  );
};
export default MyApp;

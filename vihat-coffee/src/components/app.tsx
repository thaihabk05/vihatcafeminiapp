import React from "react";
import { App, ZMPRouter, SnackbarProvider } from "zmp-ui";
import { RecoilRoot } from "recoil";
import { getConfig } from "utils/config";
import { Layout } from "./layout";
import { ConfigProvider } from "./config-provider";

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
      return (
        <div
          style={{
            padding: 24,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: "#1f2937",
            background: "#fff",
            minHeight: "100vh",
            overflow: "auto",
          }}
        >
          <div
            style={{
              maxWidth: 480,
              margin: "0 auto",
              padding: 16,
              background: "#FEF2F2",
              borderRadius: 12,
              border: "1px solid #FCA5A5",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              ⚠ Mini App load lỗi
            </div>
            <pre
              style={{
                fontSize: 11,
                color: "#7F1D1D",
                background: "#fff",
                padding: 8,
                borderRadius: 4,
                overflow: "auto",
                maxHeight: 300,
                whiteSpace: "pre-wrap",
              }}
            >
              {this.state.error.stack || this.state.error.message}
            </pre>
          </div>
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}

const MyApp = () => {
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

import React, { FC } from "react";
import { Route, Routes } from "react-router";
import { Box } from "zmp-ui";
import { Navigation } from "./navigation";
import HomePage from "pages/index";
import CategoryPage from "pages/category";
import CartPage from "pages/cart";
import NotificationPage from "pages/notification";
import ProfilePage from "pages/profile";
import SearchPage from "pages/search";
import CheckoutResultPage from "pages/result";
import { getSystemInfo } from "zmp-sdk";
import { ScrollRestoration } from "./scroll-restoration";
import { useHandlePayment } from "hooks";

/**
 * Safe-area handling. `getSystemInfo()` only works inside the real Zalo
 * runtime — when the Shell is opened in a normal browser (Studio iframe,
 * local preview, Railway healthcheck) it can throw or return shapes we
 * don't expect. Wrap so a missing platform never blanks the whole app.
 */
try {
  if (import.meta.env.DEV) {
    document.body.style.setProperty("--zaui-safe-area-inset-top", "24px");
  } else {
    const info: any =
      typeof getSystemInfo === "function" ? getSystemInfo() : null;
    if (info?.platform === "android") {
      const statusBarHeight =
        window.ZaloJavaScriptInterface?.getStatusBarHeight() ?? 0;
      const androidSafeTop = Math.round(
        statusBarHeight / window.devicePixelRatio
      );
      document.body.style.setProperty(
        "--zaui-safe-area-inset-top",
        `${androidSafeTop}px`
      );
    } else {
      // Browser / iOS — use the same default as DEV so the header lays out.
      document.body.style.setProperty("--zaui-safe-area-inset-top", "24px");
    }
  }
} catch (e) {
  document.body.style.setProperty("--zaui-safe-area-inset-top", "24px");
  console.warn("[shell] safe-area setup skipped:", e);
}

export const Layout: FC = () => {
  useHandlePayment();

  return (
    <Box flex flexDirection="column" className="h-screen">
      <ScrollRestoration />
      <Box className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<HomePage />}></Route>
          <Route path="/search" element={<SearchPage />}></Route>
          <Route path="/category" element={<CategoryPage />}></Route>
          <Route path="/notification" element={<NotificationPage />}></Route>
          <Route path="/cart" element={<CartPage />}></Route>
          <Route path="/profile" element={<ProfilePage />}></Route>
          <Route path="/result" element={<CheckoutResultPage />}></Route>
        </Routes>
      </Box>
      <Navigation />
    </Box>
  );
};

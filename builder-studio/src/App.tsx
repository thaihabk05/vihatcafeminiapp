import { useEffect, useState, useCallback } from "react";
import { api, SHELL_BASE, type Tenant } from "./api";
import { BrandEditor } from "./editors/BrandEditor";
import { CategoriesEditor } from "./editors/CategoriesEditor";
import { ProductsEditor } from "./editors/ProductsEditor";
import { BannersEditor } from "./editors/BannersEditor";
import { Preview } from "./Preview";
import { QrModal } from "./QrModal";

type Tab = "brand" | "banners" | "categories" | "products";

export default function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [appId, setAppId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("brand");
  const [previewVer, setPreviewVer] = useState(0);
  const [savedAt, setSavedAt] = useState<string>("");
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    api.tenants().then((ts) => {
      setTenants(ts);
      if (ts.length && !appId) setAppId(ts[0].appId);
    });
  }, []);

  const onSaved = useCallback((at: string) => {
    setSavedAt(at);
    setPreviewVer((v) => v + 1);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          tenants={tenants}
          appId={appId}
          onPick={setAppId}
          tab={tab}
          onTab={setTab}
        />
        <main className="flex-1 overflow-auto p-6">
          {appId ? (
            <Editor tab={tab} appId={appId} onSaved={onSaved} />
          ) : (
            <p className="text-slate-500">Chọn tenant ở sidebar.</p>
          )}
          {savedAt && (
            <p className="mt-4 text-xs text-emerald-600">
              ✔ Đã lưu lúc {new Date(savedAt).toLocaleTimeString("vi-VN")} · Preview đã reload.
            </p>
          )}
        </main>
        <aside className="w-[420px] border-l border-slate-200 bg-slate-100 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Live Preview
              </div>
              <div className="text-sm font-medium">
                {appId ? `${SHELL_BASE}/?appId=${appId}` : "—"}
              </div>
            </div>
            <div className="flex gap-1.5 flex-none">
              <button
                onClick={() => setQrOpen(true)}
                disabled={!appId}
                className="text-xs px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-40"
                title="Hiện QR test Mini App"
              >
                📱 QR
              </button>
              <button
                onClick={() => setPreviewVer((v) => v + 1)}
                className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
              >
                ↻ Reload
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-start justify-center p-4">
            {appId && <Preview appId={appId} version={previewVer} />}
          </div>
        </aside>
      </div>

      {qrOpen && appId && (
        <QrModal appId={appId} onClose={() => setQrOpen(false)} />
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="px-6 py-3 bg-white border-b border-slate-200 flex items-center gap-3">
      <div className="w-8 h-8 rounded-md bg-vihat text-white flex items-center justify-center font-bold">
        V
      </div>
      <div>
        <div className="text-sm font-semibold">VIHAT MiniApp Builder · Studio</div>
        <div className="text-xs text-slate-500">
          Tạo & quản lý Zalo Mini App đa ngành — không cần code
        </div>
      </div>
    </header>
  );
}

function Sidebar({
  tenants,
  appId,
  onPick,
  tab,
  onTab,
}: {
  tenants: Tenant[];
  appId: string;
  onPick: (id: string) => void;
  tab: Tab;
  onTab: (t: Tab) => void;
}) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "brand", label: "Brand & Theme", icon: "🎨" },
    { id: "banners", label: "Banner", icon: "🖼" },
    { id: "categories", label: "Danh mục", icon: "🗂" },
    { id: "products", label: "Sản phẩm / Món", icon: "🍔" },
  ];
  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col">
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">
          Tenant (Mini App)
        </div>
        <select
          value={appId}
          onChange={(e) => onPick(e.target.value)}
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
        >
          {tenants.map((t) => (
            <option key={t.appId} value={t.appId}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="text-[10px] text-slate-400 mt-1">App ID: {appId}</div>
      </div>
      <nav className="flex-1 p-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={
              "w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 " +
              (tab === t.id
                ? "bg-vihat/10 text-vihat font-medium"
                : "hover:bg-slate-100")
            }
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="p-3 text-[10px] text-slate-400 border-t border-slate-200">
        Server-Driven UI · 1 codebase, N quán
      </div>
    </aside>
  );
}

function Editor({
  tab,
  appId,
  onSaved,
}: {
  tab: Tab;
  appId: string;
  onSaved: (at: string) => void;
}) {
  if (tab === "brand") return <BrandEditor appId={appId} onSaved={onSaved} />;
  if (tab === "banners") return <BannersEditor appId={appId} onSaved={onSaved} />;
  if (tab === "categories")
    return <CategoriesEditor appId={appId} onSaved={onSaved} />;
  return <ProductsEditor appId={appId} onSaved={onSaved} />;
}

import { useEffect, useState } from "react";
import { api, type AppMeta, type Template } from "../api";

export function BrandEditor({
  appId,
  onSaved,
}: {
  appId: string;
  onSaved: (at: string) => void;
}) {
  const [app, setApp] = useState<AppMeta | null>(null);
  const [tpl, setTpl] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.getApp(appId), api.getTemplate(appId)]).then(([a, t]) => {
      setApp(a);
      setTpl(t);
    });
  }, [appId]);

  if (!app || !tpl) return <p className="text-slate-400">Đang tải…</p>;

  const save = async () => {
    setBusy(true);
    try {
      const r1 = await api.put(appId, "app", app);
      const r2 = await api.put(appId, "template", tpl);
      onSaved(r2.updatedAt || r1.updatedAt);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-xl space-y-6">
      <h2 className="text-lg font-semibold">Brand & Theme</h2>

      <Field label="Tên Mini App">
        <input
          className="input"
          value={app.title}
          onChange={(e) => setApp({ ...app, title: e.target.value })}
        />
      </Field>

      <Field label="Tagline (hiển thị dưới logo header)">
        <input
          className="input"
          placeholder="Ví dụ: Cà phê chuẩn vị · Đặt qua Zalo"
          value={app.tagline || ""}
          onChange={(e) => setApp({ ...app, tagline: e.target.value })}
        />
      </Field>

      <Field label="Màu chủ đạo (Primary)">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={tpl.primaryColor}
            onChange={(e) => setTpl({ ...tpl, primaryColor: e.target.value })}
            className="w-12 h-9 rounded border border-slate-300"
          />
          <input
            className="input flex-1"
            value={tpl.primaryColor}
            onChange={(e) => setTpl({ ...tpl, primaryColor: e.target.value })}
          />
        </div>
      </Field>

      <Field label="Đơn vị tiền tệ">
        <div className="flex gap-3 items-center">
          <input
            className="input w-24"
            value={tpl.currencySymbol}
            onChange={(e) =>
              setTpl({ ...tpl, currencySymbol: e.target.value })
            }
          />
          <label className="text-sm flex items-center gap-1">
            <input
              type="checkbox"
              checked={tpl.prefixCurrencySymbol}
              onChange={(e) =>
                setTpl({ ...tpl, prefixCurrencySymbol: e.target.checked })
              }
            />
            Đặt ký hiệu trước số tiền (vd: $5)
          </label>
        </div>
      </Field>

      <Field label="Header Logo URL (https://...)">
        <input
          className="input"
          placeholder="Để trống dùng logo mặc định"
          value={tpl.headerLogo || ""}
          onChange={(e) => setTpl({ ...tpl, headerLogo: e.target.value })}
        />
      </Field>

      <Save busy={busy} onClick={save} />
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

export function Save({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="bg-vihat text-white px-4 py-2 rounded font-medium disabled:opacity-50"
    >
      {busy ? "Đang lưu…" : "Lưu thay đổi"}
    </button>
  );
}

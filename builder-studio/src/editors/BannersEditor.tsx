import { useEffect, useState } from "react";
import { api, type Banner } from "../api";
import { Field, Save } from "./BrandEditor";

export function BannersEditor({
  appId,
  onSaved,
}: {
  appId: string;
  onSaved: (at: string) => void;
}) {
  const [items, setItems] = useState<Banner[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getBanners(appId).then(setItems);
  }, [appId]);

  if (!items) return <p className="text-slate-400">Đang tải…</p>;

  const add = () =>
    setItems([
      ...items,
      {
        id: `b${Date.now()}`,
        image: "",
        title: "",
      },
    ]);

  const update = (i: number, patch: Partial<Banner>) =>
    setItems(items.map((b, j) => (i === j ? { ...b, ...patch } : b)));

  const remove = (i: number) => setItems(items.filter((_, j) => j !== i));

  const save = async () => {
    setBusy(true);
    try {
      const r = await api.put(appId, "banners", items);
      onSaved(r.updatedAt);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Banner trên trang chủ</h2>
        <button onClick={add} className="text-sm text-vihat hover:underline">
          + Thêm banner
        </button>
      </div>

      <div className="space-y-4">
        {items.map((b, i) => (
          <div
            key={b.id}
            className="border border-slate-200 rounded-lg p-3 bg-white"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-32 h-16 rounded bg-slate-100 bg-cover bg-center flex-none"
                style={{
                  backgroundImage: b.image ? `url(${b.image})` : undefined,
                }}
              />
              <div className="flex-1 space-y-2">
                <Field label="Tiêu đề (mô tả)">
                  <input
                    className="input"
                    value={b.title || ""}
                    onChange={(e) => update(i, { title: e.target.value })}
                  />
                </Field>
                <Field label="Image URL">
                  <input
                    className="input font-mono text-xs"
                    value={b.image}
                    onChange={(e) => update(i, { image: e.target.value })}
                  />
                </Field>
              </div>
              <button
                onClick={() => remove(i)}
                className="text-xs text-red-500 hover:underline"
              >
                Xoá
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-slate-400">Chưa có banner nào.</p>
        )}
      </div>

      <Save busy={busy} onClick={save} />
    </section>
  );
}

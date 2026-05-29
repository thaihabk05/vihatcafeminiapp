import { useEffect, useState } from "react";
import { api, type Category } from "../api";
import { Save } from "./BrandEditor";

export function CategoriesEditor({
  appId,
  onSaved,
}: {
  appId: string;
  onSaved: (at: string) => void;
}) {
  const [items, setItems] = useState<Category[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getCategories(appId).then(setItems);
  }, [appId]);

  if (!items) return <p className="text-slate-400">Đang tải…</p>;

  const add = () =>
    setItems([
      ...items,
      { id: `cat${Date.now()}`, name: "Danh mục mới", icon: "" },
    ]);

  const update = (i: number, patch: Partial<Category>) =>
    setItems(items.map((c, j) => (i === j ? { ...c, ...patch } : c)));

  const remove = (i: number) => setItems(items.filter((_, j) => j !== i));

  const save = async () => {
    setBusy(true);
    try {
      const r = await api.put(appId, "categories", items);
      onSaved(r.updatedAt);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Danh mục</h2>
        <button onClick={add} className="text-sm text-vihat hover:underline">
          + Thêm danh mục
        </button>
      </div>

      <table className="w-full text-sm bg-white border border-slate-200 rounded-lg overflow-hidden">
        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
          <tr>
            <th className="text-left px-3 py-2 w-12">Icon</th>
            <th className="text-left px-3 py-2 w-32">ID</th>
            <th className="text-left px-3 py-2">Tên hiển thị</th>
            <th className="text-left px-3 py-2">Icon URL</th>
            <th className="w-12"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((c, i) => (
            <tr key={c.id} className="border-t border-slate-100">
              <td className="px-3 py-2">
                {c.icon && (
                  <img src={c.icon} className="w-8 h-8 rounded" alt="" />
                )}
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                <input
                  className="input"
                  value={c.id}
                  onChange={(e) => update(i, { id: e.target.value })}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  className="input"
                  value={c.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  className="input font-mono text-xs"
                  value={c.icon}
                  onChange={(e) => update(i, { icon: e.target.value })}
                />
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  onClick={() => remove(i)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Xoá
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Save busy={busy} onClick={save} />
    </section>
  );
}

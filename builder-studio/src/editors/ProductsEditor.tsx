import { useEffect, useState } from "react";
import { api, type Product, type Category } from "../api";
import { Save } from "./BrandEditor";

export function ProductsEditor({
  appId,
  onSaved,
}: {
  appId: string;
  onSaved: (at: string) => void;
}) {
  const [items, setItems] = useState<Product[] | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([api.getProducts(appId), api.getCategories(appId)]).then(
      ([p, c]) => {
        setItems(p);
        setCats(c);
      }
    );
    setEditing(null);
  }, [appId]);

  if (!items) return <p className="text-slate-400">Đang tải…</p>;

  const add = () => {
    const id = (items.reduce((m, p) => Math.max(m, p.id), 0) || 0) + 1;
    setItems([
      ...items,
      {
        id,
        name: "Sản phẩm mới",
        price: 0,
        image: "",
        description: "",
        categoryId: cats[0]?.id ? [cats[0].id] : [],
        variantId: [],
      },
    ]);
    setEditing(items.length);
  };

  const update = (i: number, patch: Partial<Product>) =>
    setItems(items.map((p, j) => (i === j ? { ...p, ...patch } : p)));

  const remove = (i: number) => {
    setItems(items.filter((_, j) => j !== i));
    if (editing === i) setEditing(null);
  };

  const save = async () => {
    setBusy(true);
    try {
      const r = await api.put(appId, "products", items);
      onSaved(r.updatedAt);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sản phẩm / Món</h2>
        <button onClick={add} className="text-sm text-vihat hover:underline">
          + Thêm sản phẩm
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((p, i) => (
          <div
            key={p.id}
            className={
              "border rounded-lg p-3 bg-white flex gap-3 " +
              (editing === i ? "border-vihat ring-1 ring-vihat" : "border-slate-200")
            }
          >
            <div
              className="w-16 h-16 rounded bg-slate-100 bg-cover bg-center flex-none"
              style={{
                backgroundImage: p.image ? `url(${p.image})` : undefined,
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-xs text-slate-500">
                {p.price.toLocaleString("vi-VN")}đ
                {p.sale ? " · 🏷 sale" : ""}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {p.categoryId.join(", ")}
              </div>
              <div className="mt-1 flex gap-2 text-xs">
                <button
                  className="text-vihat hover:underline"
                  onClick={() => setEditing(editing === i ? null : i)}
                >
                  {editing === i ? "Đóng" : "Sửa"}
                </button>
                <button
                  className="text-red-500 hover:underline"
                  onClick={() => remove(i)}
                >
                  Xoá
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing !== null && items[editing] && (
        <ProductForm
          product={items[editing]}
          cats={cats}
          onChange={(patch) => update(editing, patch)}
        />
      )}

      <Save busy={busy} onClick={save} />
    </section>
  );
}

function ProductForm({
  product,
  cats,
  onChange,
}: {
  product: Product;
  cats: Category[];
  onChange: (patch: Partial<Product>) => void;
}) {
  const toggleCat = (id: string) => {
    const set = new Set(product.categoryId);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ categoryId: Array.from(set) });
  };
  return (
    <div className="border border-slate-200 bg-white rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Tên
          </label>
          <input
            className="input"
            value={product.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Giá (VND)
          </label>
          <input
            type="number"
            className="input"
            value={product.price}
            onChange={(e) => onChange({ price: Number(e.target.value) })}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Image URL
        </label>
        <input
          className="input font-mono text-xs"
          value={product.image}
          onChange={(e) => onChange({ image: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Mô tả
        </label>
        <textarea
          className="input min-h-[60px]"
          value={product.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Danh mục
        </label>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => {
            const on = product.categoryId.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCat(c.id)}
                className={
                  "text-xs px-2 py-1 rounded border " +
                  (on
                    ? "bg-vihat text-white border-vihat"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50")
                }
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

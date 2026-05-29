import { useEffect, useState } from "react";
import { API_BASE } from "./api";

/**
 * Modal showing the Zalo Mini App QR code for the current tenant.
 *
 * Reads `zaloAppId` from the full tenant config (the public read endpoint,
 * no auth needed) and renders a QR pointing at `zalo.me/s/<zaloAppId>` —
 * Zalo's universal Mini App deep link. Scanning from the Zalo app opens
 * the Mini App directly, just like users will hit it in production.
 */
export function QrModal({
  appId,
  onClose,
}: {
  appId: string;
  onClose: () => void;
}) {
  const [zaloAppId, setZaloAppId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/apps/${appId}/config`)
      .then((r) => r.json())
      .then((cfg) => {
        setZaloAppId(cfg.zaloAppId || null);
        setName(cfg.app?.title || appId);
        if (!cfg.zaloAppId) {
          setErr(
            "Tenant chưa có `zaloAppId`. Thêm vào tenant JSON trên Builder API để hiện QR thật."
          );
        }
      })
      .catch((e) => setErr(`Không tải được config: ${e.message}`));
  }, [appId]);

  const deepLink = zaloAppId ? `https://zalo.me/s/${zaloAppId}` : "";
  const qrSrc = deepLink
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
        deepLink
      )}&size=320x320&margin=12&qzone=2&color=1F2937&bgcolor=FFFFFF`
    : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setErr("Trình duyệt không cho copy. Hãy chọn URL và copy thủ công.");
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl"
        style={{ width: 380, maxWidth: "100%", padding: 24 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              QR test Mini App
            </div>
            <div className="font-semibold">{name}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 text-lg"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {err && (
          <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-3 mb-3">
            {err}
          </div>
        )}

        {qrSrc && (
          <div className="flex flex-col items-center">
            <img
              src={qrSrc}
              alt="Zalo Mini App QR"
              className="w-72 h-72 rounded-xl border border-slate-200"
            />
            <div className="text-xs text-slate-500 mt-3 text-center">
              Mở app <strong>Zalo</strong> → góc trên phải → <strong>Quét QR</strong>
            </div>
          </div>
        )}

        {deepLink && (
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-600 mb-1">
              Deep link
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={deepLink}
                className="flex-1 input font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                onClick={copy}
                className="bg-vihat text-white px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <div className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              QR và link công khai chỉ mở được sau khi Mini App đã được Zalo
              duyệt. Trong giai đoạn test, scan từ Zalo của developer (account
              đã <code>zmp login</code>) hoặc tester đã được add ở
              mini.zalo.me.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { API_BASE, getToken } from "./api";

type Mode = "dev" | "prod";

/**
 * Small inline panel for pasting a refreshed ZMP_TOKEN. The Builder API
 * encrypts it with the GitHub repo public key and stores it as the
 * `ZMP_TOKEN` Actions secret — so the next "Deploy now" works.
 */
function ZmpTokenPanel({ onClose }: { onClose: () => void }) {
  const [token, setTokenStr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setMsg(null);
    if (!token || token.length < 50) {
      setErr("Token có vẻ quá ngắn. Lấy lại bằng `npx zmp login`.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/admin/zmp-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": getToken(),
        },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `${r.status}`);
      const ts = data.expiresAt
        ? ` · hết hạn ${new Date(data.expiresAt).toLocaleString("vi-VN")}`
        : "";
      setMsg(`✓ Token đã đẩy lên GitHub${ts}`);
      setTokenStr("");
    } catch (e: any) {
      setErr(e.message || "Không cập nhật được token.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 mt-2">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-xs font-medium text-amber-900">
          🔄 Cập nhật ZMP Token
        </div>
        <button
          onClick={onClose}
          className="text-amber-900 text-sm leading-none"
        >
          ×
        </button>
      </div>
      <div className="text-[11px] text-amber-800 leading-relaxed mb-2">
        Lấy token sau khi <code>npx zmp login</code>:
        <code className="block bg-white rounded px-1.5 py-0.5 mt-1 font-mono">
          grep ZMP_TOKEN .env | cut -d= -f2-
        </code>
      </div>
      <textarea
        value={token}
        onChange={(e) => setTokenStr(e.target.value)}
        placeholder="Paste ZMP_TOKEN (eyJ0eXAi…)"
        rows={3}
        className="input font-mono text-[10px]"
      />
      {err && <div className="text-[11px] text-rose-700 mt-1">{err}</div>}
      {msg && (
        <div className="text-[11px] text-emerald-700 mt-1">{msg}</div>
      )}
      <button
        onClick={submit}
        disabled={busy || !token}
        className="mt-2 bg-amber-600 text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50"
      >
        {busy ? "Đang đẩy…" : "Đẩy lên GitHub Secret"}
      </button>
    </div>
  );
}

/**
 * Modal showing the Zalo Mini App QR for the current tenant.
 *
 * Two modes:
 *   - "Prod" — `https://zalo.me/s/<zaloAppId>`. Only works after the app
 *     is approved + released, but is the canonical share link.
 *   - "Dev"  — arbitrary URL the developer pastes (e.g. the one Zalo's
 *     `zmp deploy` CLI prints after pushing a Development version). The
 *     URL is persisted per-tenant in localStorage so the next open
 *     remembers it. Useful for sharing test builds with internal
 *     testers before submitting for review.
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
  const [mode, setMode] = useState<Mode>("dev");
  const devUrlKey = `qr-dev-url-${appId}`;
  const [devUrl, setDevUrl] = useState<string>("");
  const [autoUrl, setAutoUrl] = useState<{
    url: string;
    deployedAt?: string;
    version?: number;
    env?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deployBusy, setDeployBusy] = useState(false);
  const [deployMsg, setDeployMsg] = useState<string | null>(null);
  const [deployEnv, setDeployEnv] = useState<"DEVELOPMENT" | "TESTING">(
    "DEVELOPMENT"
  );
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    setErr(null);
    fetch(`${API_BASE}/api/apps/${appId}/config`)
      .then((r) => r.json())
      .then((cfg) => {
        setZaloAppId(cfg.zaloAppId || null);
        setName(cfg.app?.title || appId);

        // Pick up the URL the `deploy:auto` wrapper saved for this tenant.
        const rt = cfg.runtime || {};
        const apiUrl = rt.zaloDevUrl || rt.zaloTestUrl || "";
        if (apiUrl) {
          setAutoUrl({
            url: apiUrl,
            deployedAt: rt.lastDeployedAt,
            version: rt.zaloDevVersion,
            env: rt.lastDeployedEnv,
          });
          setDevUrl(apiUrl);
        } else {
          setDevUrl(localStorage.getItem(devUrlKey) || "");
        }
      })
      .catch((e) => setErr(`Không tải được config: ${e.message}`));
  }, [appId, devUrlKey]);

  const prodUrl = zaloAppId ? `https://zalo.me/s/${zaloAppId}` : "";
  const url = mode === "prod" ? prodUrl : devUrl.trim();

  const qrSrc = url
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
        url
      )}&size=320x320&margin=12&qzone=2&color=1F2937&bgcolor=FFFFFF`
    : "";

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setErr("Trình duyệt không cho copy. Hãy chọn URL và copy thủ công.");
    }
  };

  const onDevUrlChange = (v: string) => {
    setDevUrl(v);
    localStorage.setItem(devUrlKey, v);
  };

  /**
   * Fire-and-watch deploy: ask the Builder API to dispatch the GitHub
   * Actions workflow, then poll the tenant config until `lastDeployedAt`
   * advances past the trigger time. When that happens the new dev URL is
   * already in `runtime` and we flip the modal to show it.
   */
  const triggerDeploy = async () => {
    setErr(null);
    setDeployMsg(null);
    setDeployBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/apps/${appId}/trigger-deploy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": getToken(),
        },
        body: JSON.stringify({
          env: deployEnv,
          description: `Deploy ${deployEnv} from Studio`,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `${r.status}`);

      const triggeredAt = new Date(data.triggeredAt).getTime();
      setDeployMsg(
        `Đã trigger GitHub Actions (${data.env}). Đợi Zalo upload + capture URL…`
      );

      // Poll runtime until lastDeployedAt > triggeredAt.
      const started = Date.now();
      const tick = async () => {
        if (Date.now() - started > 5 * 60_000) {
          setDeployBusy(false);
          setDeployMsg(
            "Timeout 5 phút — kiểm tra GitHub Actions tab nếu deploy bị stuck."
          );
          return;
        }
        try {
          const cr = await fetch(`${API_BASE}/api/apps/${appId}/config`);
          const cfg = await cr.json();
          const rt = cfg.runtime || {};
          const last = rt.lastDeployedAt
            ? new Date(rt.lastDeployedAt).getTime()
            : 0;
          if (last > triggeredAt && (rt.zaloDevUrl || rt.zaloTestUrl)) {
            const url = rt.zaloDevUrl || rt.zaloTestUrl;
            setAutoUrl({
              url,
              deployedAt: rt.lastDeployedAt,
              version: rt.zaloDevVersion,
              env: rt.lastDeployedEnv,
            });
            setDevUrl(url);
            setDeployBusy(false);
            setDeployMsg(`✓ Deploy xong (v${rt.zaloDevVersion}). QR đã sẵn.`);
            return;
          }
        } catch {}
        pollRef.current = window.setTimeout(tick, 5000);
      };
      pollRef.current = window.setTimeout(tick, 5000);
    } catch (e: any) {
      setDeployBusy(false);
      setErr(e.message || "Trigger deploy lỗi.");
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

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
        style={{ width: 440, maxWidth: "100%", padding: 24 }}
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

        {/* Mode tabs */}
        <div className="grid grid-cols-2 mb-4 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setMode("dev")}
            className={
              "py-1.5 text-sm rounded-md transition " +
              (mode === "dev"
                ? "bg-white text-slate-900 shadow-sm font-medium"
                : "text-slate-500 hover:text-slate-800")
            }
          >
            🧪 Dev / Test
          </button>
          <button
            onClick={() => setMode("prod")}
            className={
              "py-1.5 text-sm rounded-md transition " +
              (mode === "prod"
                ? "bg-white text-slate-900 shadow-sm font-medium"
                : "text-slate-500 hover:text-slate-800")
            }
          >
            🚀 Production
          </button>
        </div>

        {/* Dev mode: auto from API + manual override */}
        {mode === "dev" && (
          <div className="mb-3">
            {/* One-click deploy section */}
            <div className="border border-slate-200 rounded-lg p-3 mb-3 bg-slate-50">
              <div className="text-xs font-medium text-slate-700 mb-2">
                🚀 Deploy thẳng từ Studio
              </div>
              <div className="flex gap-2 items-center">
                <select
                  value={deployEnv}
                  onChange={(e) => setDeployEnv(e.target.value as any)}
                  disabled={deployBusy}
                  className="input flex-none w-36 text-xs"
                >
                  <option value="DEVELOPMENT">Development</option>
                  <option value="TESTING">Testing</option>
                </select>
                <button
                  onClick={triggerDeploy}
                  disabled={deployBusy}
                  className="flex-1 bg-vihat text-white text-sm font-medium rounded px-3 py-1.5 disabled:opacity-50"
                >
                  {deployBusy ? "Đang deploy…" : "Deploy now"}
                </button>
              </div>
              {deployMsg && (
                <div className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                  {deployMsg}
                </div>
              )}
              <button
                onClick={() => setTokenModalOpen(true)}
                disabled={deployBusy}
                className="text-[11px] text-slate-500 hover:text-vihat mt-2 underline"
              >
                🔄 Cập nhật ZMP Token (nếu deploy báo expired)
              </button>
            </div>

            {autoUrl && (
              <div className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg p-2.5 mb-2 leading-relaxed">
                ✓ URL tự động từ Builder API
                {autoUrl.deployedAt && (
                  <>
                    {" "}
                    · cập nhật{" "}
                    {new Date(autoUrl.deployedAt).toLocaleString("vi-VN")}
                  </>
                )}
                {autoUrl.version && (
                  <>
                    {" "}
                    · v{autoUrl.version} {autoUrl.env || ""}
                  </>
                )}
              </div>
            )}
            <label className="block text-xs font-medium text-slate-600 mb-1">
              URL Dev / Testing
            </label>
            <input
              value={devUrl}
              onChange={(e) => onDevUrlChange(e.target.value)}
              placeholder="https://zalo.me/s/... (chạy npm run deploy:auto để tự fill)"
              className="input font-mono text-xs"
            />
            <div className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              <strong>Tự động</strong>: chạy <code>ADMIN_TOKEN=… npm run
              deploy:auto</code> trong vihat-coffee, URL sẽ tự lưu về Builder
              API và render QR ngay khi anh mở modal này.
              <br />
              <strong>Thủ công</strong>: dán URL từ output <code>npx zmp
              deploy</code> hoặc copy QR data từ <a
                href="https://mini.zalo.me"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                mini.zalo.me
              </a>{" "}
              dashboard. URL lưu vào browser.
            </div>
          </div>
        )}

        {/* Prod mode: derived from zaloAppId */}
        {mode === "prod" && !zaloAppId && (
          <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-3 mb-3 leading-relaxed">
            Tenant chưa có <code>zaloAppId</code> trong config. Để có link
            production, mở tenant JSON trên Builder API và thêm:
            <pre className="mt-1 bg-white rounded p-2 text-[10px] overflow-auto">
              {`"zaloAppId": "1352472476106621006"`}
            </pre>
          </div>
        )}

        {err && (
          <div className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg p-3 mb-3">
            {err}
          </div>
        )}

        {/* QR */}
        {qrSrc ? (
          <div className="flex flex-col items-center">
            <img
              src={qrSrc}
              alt="Zalo Mini App QR"
              className="w-72 h-72 rounded-xl border border-slate-200"
            />
            <div className="text-xs text-slate-500 mt-3 text-center">
              Mở app <strong>Zalo</strong> → góc trên phải →{" "}
              <strong>Quét QR</strong>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-72 text-slate-400 text-sm border border-dashed border-slate-300 rounded-xl">
            {mode === "dev"
              ? "Paste URL Dev ở trên để render QR"
              : "Cần zaloAppId để render QR Production"}
          </div>
        )}

        {/* URL bar with copy */}
        {url && (
          <div className="mt-4">
            <div className="text-xs font-medium text-slate-600 mb-1">URL</div>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
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
          </div>
        )}

        {tokenModalOpen && <ZmpTokenPanel onClose={() => setTokenModalOpen(false)} />}

        <div className="text-[11px] text-slate-400 mt-4 leading-relaxed border-t border-slate-100 pt-3">
          <strong className="text-slate-600">Lưu ý:</strong>
          <ul className="mt-1 space-y-1 pl-4 list-disc">
            <li>
              <strong>Dev/Test</strong>: chỉ Zalo của developer + tester đã add
              ở <code>mini.zalo.me</code> mới mở được.
            </li>
            <li>
              <strong>Production</strong>: mở được cho mọi user sau khi Zalo
              duyệt và phát hành version chính thức.
            </li>
            <li>
              Nếu QR scan ra "ứng dụng đang phát triển" → cần dùng URL Dev
              hoặc thêm tài khoản test ở Mini App Console.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { API_BASE, getToken } from "./api";

type Mode = "local" | "test" | "prod";

/**
 * QR Modal: 3 modes match the actual Zalo Mini App build pipeline.
 *
 *   🔧 Local   — `zmp start` on the dev's laptop. Generates a local tunnel
 *                 QR with HMR; not uploaded to Zalo. Fast iteration loop.
 *                 Studio shows the command to run + instructions.
 *
 *   🧪 Test    — `zmp deploy -t` via GitHub Actions. Uploads to Zalo's
 *                 Testing tier so up to 100 testers (added on mini.zalo.me)
 *                 can scan and review. URL flows back into the Studio.
 *
 *   🚀 Prod    — `zalo.me/s/<zaloAppId>` deep link, becomes scannable by
 *                 anyone after Zalo approves and you "Phát hành".
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
  const [mode, setMode] = useState<Mode>("test");
  const devUrlKey = `qr-dev-url-${appId}`;
  const [devUrl, setDevUrl] = useState<string>("");
  const [autoUrl, setAutoUrl] = useState<{
    url: string;
    deployedAt?: string;
    version?: number;
    env?: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [deployBusy, setDeployBusy] = useState(false);
  const [deployMsg, setDeployMsg] = useState<string | null>(null);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    setErr(null);
    fetch(`${API_BASE}/api/apps/${appId}/config`)
      .then((r) => r.json())
      .then((cfg) => {
        setZaloAppId(cfg.zaloAppId || null);
        setName(cfg.app?.title || appId);
        const rt = cfg.runtime || {};
        const apiUrl = rt.zaloTestUrl || rt.zaloDevUrl || "";
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

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  // Determine the URL to QR-encode for the current mode.
  const prodUrl = zaloAppId ? `https://zalo.me/s/${zaloAppId}` : "";
  let url = "";
  if (mode === "prod") url = prodUrl;
  else if (mode === "test") url = devUrl.trim();

  const qrSrc = url
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
        url
      )}&size=320x320&margin=12&qzone=2&color=1F2937&bgcolor=FFFFFF`
    : "";

  const copy = async (text: string, key = "url") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setErr("Trình duyệt không cho copy. Hãy chọn URL và copy thủ công.");
    }
  };

  const onDevUrlChange = (v: string) => {
    setDevUrl(v);
    localStorage.setItem(devUrlKey, v);
  };

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
          env: "TESTING",
          description: `Test deploy from Studio`,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `${r.status}`);

      const triggeredAt = new Date(data.triggeredAt).getTime();
      setDeployMsg(
        `Đã trigger GitHub Actions. Đợi Zalo upload + capture URL…`
      );

      const started = Date.now();
      const tick = async () => {
        if (Date.now() - started > 5 * 60_000) {
          setDeployBusy(false);
          setDeployMsg(
            "Timeout 5 phút — check GitHub Actions tab nếu deploy stuck."
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
            const url = rt.zaloTestUrl || rt.zaloDevUrl;
            setAutoUrl({
              url,
              deployedAt: rt.lastDeployedAt,
              version: rt.zaloDevVersion,
              env: rt.lastDeployedEnv,
            });
            setDevUrl(url);
            setDeployBusy(false);
            setDeployMsg(`✓ Deploy xong (v${rt.zaloDevVersion}). QR sẵn.`);
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

  const localCmd = "cd vihat-coffee && npx zmp start";

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
        style={{ width: 460, maxWidth: "100%", padding: 24 }}
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
        <div className="grid grid-cols-3 mb-4 bg-slate-100 rounded-lg p-1">
          <ModeTab active={mode === "local"} onClick={() => setMode("local")}>
            🔧 Local (HMR)
          </ModeTab>
          <ModeTab active={mode === "test"} onClick={() => setMode("test")}>
            🧪 Test (share)
          </ModeTab>
          <ModeTab active={mode === "prod"} onClick={() => setMode("prod")}>
            🚀 Production
          </ModeTab>
        </div>

        {/* Mode descriptions */}
        <div className="text-[11px] text-slate-500 mb-3 leading-relaxed">
          {mode === "local" && (
            <>
              <strong>Dev local HMR</strong>: chạy <code>zmp start</code> trên
              máy anh. QR trỏ về máy anh qua tunnel của Zalo. Sửa code → reload
              instant. Không upload lên Zalo, chỉ máy anh test được.
            </>
          )}
          {mode === "test" && (
            <>
              <strong>Test upload</strong>: chạy <code>zmp deploy -t</code> qua
              GitHub Actions. Bản build được lưu trên Zalo, share được cho 100
              tester đã add ở mini.zalo.me.
            </>
          )}
          {mode === "prod" && (
            <>
              <strong>Production</strong>: link công khai{" "}
              <code>zalo.me/s/&lt;id&gt;</code>. Chỉ scan được sau khi Zalo
              duyệt và phát hành. Bất kỳ ai cũng vào được.
            </>
          )}
        </div>

        {/* LOCAL mode UI */}
        {mode === "local" && (
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 mb-3">
            <div className="text-xs font-medium text-blue-900 mb-2">
              Lệnh chạy trên máy anh
            </div>
            <div className="flex gap-2 mb-2">
              <code className="flex-1 bg-white border border-blue-200 rounded px-2 py-1.5 text-xs font-mono break-all">
                {localCmd}
              </code>
              <button
                onClick={() => copy(localCmd, "cmd")}
                className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap"
              >
                {copied === "cmd" ? "✓ Copied" : "Copy"}
              </button>
            </div>
            <ol className="text-[11px] text-blue-900 leading-relaxed pl-4 list-decimal space-y-1">
              <li>Mở Terminal trên máy</li>
              <li>Paste lệnh trên → Enter</li>
              <li>
                Đợi <code>Vite</code> build + <code>zmp</code> in QR ASCII
              </li>
              <li>
                Mở Zalo → góc trên phải → <strong>Quét QR</strong> trong
                terminal
              </li>
              <li>
                Sửa code → mini app trong Zalo tự reload (
                <strong>HMR</strong>)
              </li>
            </ol>
          </div>
        )}

        {/* TEST mode UI */}
        {mode === "test" && (
          <div className="mb-3">
            <div className="border border-slate-200 rounded-lg p-3 mb-3 bg-slate-50">
              <div className="text-xs font-medium text-slate-700 mb-2">
                🚀 Deploy thẳng từ Studio
              </div>
              <button
                onClick={triggerDeploy}
                disabled={deployBusy}
                className="w-full bg-vihat text-white text-sm font-medium rounded px-3 py-2 disabled:opacity-50"
              >
                {deployBusy ? "Đang deploy…" : "Deploy lên Test tier"}
              </button>
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
                ✓ URL tự động
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
              URL Test
            </label>
            <input
              value={devUrl}
              onChange={(e) => onDevUrlChange(e.target.value)}
              placeholder="Tự fill sau khi Deploy now hoặc paste từ mini.zalo.me"
              className="input font-mono text-xs"
            />
          </div>
        )}

        {/* PROD mode UI */}
        {mode === "prod" && !zaloAppId && (
          <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-3 mb-3 leading-relaxed">
            Tenant chưa có <code>zaloAppId</code>. Add vào tenant JSON để có
            link Production.
          </div>
        )}

        {tokenModalOpen && (
          <ZmpTokenPanel onClose={() => setTokenModalOpen(false)} />
        )}

        {err && (
          <div className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg p-3 mb-3">
            {err}
          </div>
        )}

        {/* QR display (test + prod) */}
        {mode !== "local" &&
          (qrSrc ? (
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
              {mode === "test"
                ? "Bấm 'Deploy lên Test tier' để có QR"
                : "Cần zaloAppId để render QR Production"}
            </div>
          ))}

        {/* URL copy bar */}
        {mode !== "local" && url && (
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
                onClick={() => copy(url)}
                className="bg-vihat text-white px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap"
              >
                {copied === "url" ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "py-1.5 text-xs rounded-md transition " +
        (active
          ? "bg-white text-slate-900 shadow-sm font-medium"
          : "text-slate-500 hover:text-slate-800")
      }
    >
      {children}
    </button>
  );
}

function ZmpTokenPanel({ onClose }: { onClose: () => void }) {
  const [token, setTokenStr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    setMsg(null);
    if (!token || token.length < 50) {
      setErr("Token có vẻ quá ngắn.");
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
      <textarea
        value={token}
        onChange={(e) => setTokenStr(e.target.value)}
        placeholder="Paste ZMP_TOKEN (eyJ0eXAi…)"
        rows={3}
        className="input font-mono text-[10px]"
      />
      {err && <div className="text-[11px] text-rose-700 mt-1">{err}</div>}
      {msg && <div className="text-[11px] text-emerald-700 mt-1">{msg}</div>}
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

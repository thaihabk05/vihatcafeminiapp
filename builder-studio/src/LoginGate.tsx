import { useEffect, useState } from "react";
import { API_BASE, clearToken, getToken, setToken } from "./api";

/**
 * Renders nothing if the stored admin token validates against the API.
 * Otherwise blocks the UI behind a single-input password screen.
 */
export function LoginGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "in" | "out">("checking");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const verify = async (token: string) => {
    const r = await fetch(`${API_BASE}/api/admin/check`, {
      headers: { "X-Admin-Token": token },
    });
    return r.ok;
  };

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setStatus("out");
      return;
    }
    verify(t).then((ok) => setStatus(ok ? "in" : "out"));

    const onUnauth = () => setStatus("out");
    window.addEventListener("studio:unauthorized", onUnauth);
    return () => window.removeEventListener("studio:unauthorized", onUnauth);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const ok = await verify(pwd);
      if (!ok) {
        setErr("Sai mã quản trị. Kiểm tra lại với admin VIHAT.");
        return;
      }
      setToken(pwd);
      setStatus("in");
    } catch (e: any) {
      setErr(e.message || "Lỗi mạng. Thử lại.");
    } finally {
      setBusy(false);
    }
  };

  if (status === "checking") {
    return (
      <div className="h-screen flex items-center justify-center text-slate-400">
        Đang kiểm tra phiên đăng nhập…
      </div>
    );
  }

  if (status === "in") {
    return (
      <>
        {children}
        <LogoutButton />
      </>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 w-[400px] space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-vihat text-white font-bold flex items-center justify-center text-lg">
            V
          </div>
          <div>
            <div className="font-semibold">VIHAT MiniApp Builder</div>
            <div className="text-xs text-slate-500">Studio · Admin</div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Mã quản trị
          </label>
          <input
            type="password"
            autoFocus
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vihat focus:border-vihat"
            placeholder="••••••••••••••••"
          />
          {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
        </div>

        <button
          type="submit"
          disabled={busy || !pwd}
          className="w-full bg-vihat text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
        >
          {busy ? "Đang xác thực…" : "Đăng nhập"}
        </button>

        <div className="text-[11px] text-slate-400 leading-relaxed">
          Mã được set bằng env <code>ADMIN_TOKEN</code> trên Railway. Liên hệ
          admin VIHAT nếu chưa có mã hoặc cần reset.
        </div>
      </form>
    </div>
  );
}

function LogoutButton() {
  return (
    <button
      onClick={() => {
        clearToken();
        window.location.reload();
      }}
      className="fixed bottom-4 right-4 text-xs px-3 py-1.5 rounded-full bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 shadow-sm"
    >
      Đăng xuất
    </button>
  );
}

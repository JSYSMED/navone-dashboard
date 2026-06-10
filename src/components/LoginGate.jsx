import { useEffect, useState } from "react";
import { setLicenseKey } from "../lib/api";

const inputStyle = {
  width: "100%", padding: "12px 14px", fontSize: 14,
  border: "1px solid #ddd", borderRadius: 10, outline: "none",
  boxSizing: "border-box",
};

export default function LoginGate({ children }) {
  const [state, setState] = useState("loading"); // loading | in | out | pending
  const [user, setUser] = useState(null);

  // 폼 상태
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const checkMe = () =>
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setUser(d.user);
        if (d.user?.license_key) setLicenseKey(d.user.license_key);
        setState(d.user?.status === "pending" ? "pending" : "in");
      })
      .catch(() => setState("out"));

  useEffect(() => { checkMe(); }, []);

  const submit = async () => {
    setErr("");
    if (!email || !password) { setErr("이메일과 비밀번호를 입력하세요."); return; }
    if (mode === "signup" && password.length < 8) { setErr("비밀번호는 8자 이상이어야 합니다."); return; }
    setBusy(true);
    try {
      const path = mode === "signup" ? "/api/auth/signup" : "/api/auth/email-login";
      const body = mode === "signup" ? { email, password, name } : { email, password };
      const r = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok || !d.success) {
        setErr(d?.error?.message || "처리에 실패했습니다.");
        setBusy(false);
        return;
      }
      setUser(d.user);
      if (d.user?.license_key) setLicenseKey(d.user.license_key);
      setState(d.user?.status === "pending" ? "pending" : "in");
    } catch {
      setErr("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  };

  const onKey = (e) => { if (e.key === "Enter") submit(); };

  if (state === "loading") {
    return (<div className="lg-wrap"><div className="lg-spin" /></div>);
  }

  // 가입했지만 관리자 승인 대기 중
  if (state === "pending") {
    return (
      <div className="lg-wrap">
        <div className="lg-card">
          <div className="lg-logo">CommerOne</div>
          <p className="lg-sub">가입이 완료되었어요</p>
          <div style={{ padding: "16px 18px", background: "#FFF7E6", borderRadius: 12, margin: "8px 0 16px", textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#B7791F", marginBottom: 6 }}>승인 대기 중</div>
            <div style={{ fontSize: 13, color: "#7A6A4F", lineHeight: 1.6 }}>
              계정 검토 후 이용이 활성화됩니다. 승인되면 바로 모든 기능을 사용할 수 있어요.
            </div>
          </div>
          <button className="lg-naver" style={{ background: "#eee", color: "#333" }} onClick={checkMe}>
            새로고침
          </button>
          <p className="lg-foot">{user?.email}</p>
        </div>
      </div>
    );
  }

  if (state === "out") {
    return (
      <div className="lg-wrap">
        <div className="lg-card">
          <div className="lg-logo">CommerOne</div>
          <p className="lg-sub">스마트스토어 통합관리</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "14px 0 4px", textAlign: "left" }}>
            {mode === "signup" && (
              <input className="lg-input" style={inputStyle} type="text" placeholder="이름 (선택)"
                value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey} />
            )}
            <input className="lg-input" style={inputStyle} type="email" placeholder="이메일"
              value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onKey} autoComplete="username" />
            <input className="lg-input" style={inputStyle} type="password" placeholder={mode === "signup" ? "비밀번호 (8자 이상)" : "비밀번호"}
              value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={onKey}
              autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </div>

          {err && <p style={{ color: "#D64545", fontSize: 13, margin: "6px 0", textAlign: "left" }}>{err}</p>}

          <button className="lg-naver" style={{ background: "#03C75A", color: "#fff", marginTop: 8 }}
            onClick={submit} disabled={busy}>
            {busy ? "처리 중…" : mode === "signup" ? "회원가입" : "로그인"}
          </button>

          <p className="lg-foot" style={{ marginTop: 14 }}>
            {mode === "signup" ? "이미 계정이 있나요? " : "계정이 없나요? "}
            <span style={{ color: "#03C75A", fontWeight: 700, cursor: "pointer" }}
              onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setErr(""); }}>
              {mode === "signup" ? "로그인" : "회원가입"}
            </span>
          </p>

          {/* 네이버 로그인 (승인 후 활성화 예정) */}
          <div style={{ borderTop: "1px solid #eee", margin: "16px 0 12px" }} />
          <button className="lg-naver" onClick={() => { window.location.href = "/api/auth/naver/login"; }}>
            <span className="lg-n">N</span> 네이버로 시작하기
          </button>
        </div>
      </div>
    );
  }

  return children(user);
}

// 로그아웃 — 어디서든 import해서 쓸 수 있게 export
export async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch { /* noop */ }
  window.location.href = "/";
}

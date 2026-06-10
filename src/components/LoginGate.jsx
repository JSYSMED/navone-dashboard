import { useEffect, useState } from "react";
import { setLicenseKey } from "../lib/api";

export default function LoginGate({ children }) {
  const [state, setState] = useState("loading"); // loading | in | out
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setUser(d.user);
        if (d.user?.license_key) setLicenseKey(d.user.license_key);
        setState("in");
      })
      .catch(() => setState("out"));
  }, []);

  if (state === "loading") {
    return (
      <div className="lg-wrap">
        <div className="lg-spin" />
      </div>
    );
  }

  if (state === "out") {
    return (
      <div className="lg-wrap">
        <div className="lg-card">
          <div className="lg-logo">CommerOne</div>
          <p className="lg-sub">스마트스토어 통합관리</p>
          <button
            className="lg-naver"
            onClick={() => { window.location.href = "/api/auth/naver/login"; }}
          >
            <span className="lg-n">N</span> 네이버로 시작하기
          </button>
          <p className="lg-foot">네이버 계정으로 안전하게 로그인합니다</p>
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

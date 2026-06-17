import NvIcon from "./NvIcon";
import { getSettings } from "../lib/api";
import { logout } from "./LoginGate";

// 평평한 단일 목록 내비게이션 (CommerOne 시안)
const NV_NAV = [
  {
    label: "", items: [
      { id: "dashboard", label: "대시보드", icon: "home" },
      { id: "productreg", label: "상품등록", icon: "box" },
      { id: "price", label: "가격 관리", icon: "tag" },
      { id: "optimize", label: "상품 최적화", icon: "sparkles" },
      { id: "orders", label: "판매 현황", icon: "box" },
      { id: "fulfillment", label: "주문 처리", icon: "truck" },
      { id: "reviews", label: "고객응대", icon: "chat", dot: true },
      { id: "risk", label: "리스크 관리", icon: "shield" },
      { id: "settlement", label: "광고·정산 분석", icon: "trend" },
      { id: "settings", label: "설정", icon: "settings" },
    ]
  },
];

export default function Sidebar({ active = "dashboard", onNav = () => {}, counts = {}, user = null }) {
  const settings = getSettings();
  const storeName = settings.storeName || "내 스토어";
  const planDays = settings.planDays ?? 23;

  return (
    <aside className="nv-sb">
      <div className="nv-sb-brand">
        <div className="nv-sb-mark">
          <svg width="24" height="24" viewBox="0 0 64 64" fill="none"><path d="M52 20.5A24 24 0 1 0 52 43.5" stroke="#fff" strokeWidth="8" strokeLinecap="round" /><circle cx="31" cy="32" r="7.5" fill="#fff" /></svg>
        </div>
        <div className="nv-sb-word">Commer<span className="o">One</span></div>
      </div>

      <div className="nv-store">
        <div className="nv-store-av">🍇</div>
        <div style={{ minWidth: 0 }}>
          <div className="nv-store-name">{storeName}</div>
          <div className="nv-store-sub">스마트스토어</div>
        </div>
      </div>

      <nav className="nv-nav">
        {NV_NAV.map((g, gi) => (
          <div key={gi}>
            {g.label && <div className="nv-nav-label">{g.label}</div>}
            {g.items.map(it => {
              const cnt = counts[it.id];
              return (
                <button key={it.id} onClick={() => onNav(it.id)} className={"nv-nav-item" + (it.id === active ? " active" : "")}>
                  <span className="ic"><NvIcon name={it.icon} size={18} /></span>
                  <span>{it.label}</span>
                  {cnt != null && cnt > 0 && <span className="cnt">{cnt}</span>}
                  {it.dot && cnt == null && <span className="dot" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="nv-plan">
        <div className="nv-plan-row">
          <span className="nv-plan-tag">PRO 플랜</span>
          <span className="nv-plan-days">{planDays}일 남음</span>
        </div>
        <div className="nv-plan-bar"><i style={{ width: `${Math.max(0, Math.min(100, (planDays / 30) * 100))}%` }} /></div>
        <button className="nv-plan-cta" onClick={() => onNav("settings")}>플랜 관리 <NvIcon name="chevR" size={14} /></button>
      </div>

      <div style={{ marginTop: 10, padding: "10px 12px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.name || user?.email || "로그인됨"}
          </div>
          {user?.email && user?.name && (
            <div style={{ fontSize: 11, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
          )}
        </div>
        <button
          onClick={() => { if (confirm("로그아웃 하시겠어요?")) logout(); }}
          title="로그아웃"
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", fontSize: 12, fontWeight: 600, color: "var(--ink-2)", background: "var(--line-2)", border: "none", borderRadius: 8, cursor: "pointer" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          로그아웃
        </button>
      </div>
    </aside>
  );
}

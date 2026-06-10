import NvIcon from "./NvIcon";
import { getSettings } from "../lib/api";

// 6대분류 + 대시보드/설정 — 2그룹 내비게이션 (CommerOne 시안)
const NV_NAV = [
  {
    label: "운영", items: [
      { id: "dashboard", label: "대시보드", icon: "home" },
      { id: "price", label: "가격 관리", icon: "tag" },
      { id: "orders", label: "주문·발주", icon: "box" },
      { id: "settlement", label: "정산·광고 분석", icon: "trend" },
    ]
  },
  {
    label: "고객·품질", items: [
      { id: "reviews", label: "고객응대 AI", icon: "chat", dot: true },
      { id: "optimize", label: "상품 최적화", icon: "sparkles" },
      { id: "risk", label: "리스크 관리", icon: "shield" },
    ]
  },
  {
    label: "", items: [
      { id: "settings", label: "설정", icon: "settings" },
    ]
  },
];

export default function Sidebar({ active = "dashboard", onNav = () => {}, counts = {} }) {
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
    </aside>
  );
}

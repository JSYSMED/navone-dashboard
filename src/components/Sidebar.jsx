import { NavLink } from "react-router-dom";
import Icon from "./Icon";
import { getSettings } from "../lib/api";

const ITEMS = [
  { to: "/", label: "대시보드", icon: "home", end: true },
  { to: "/price", label: "가격 자동화", icon: "tag" },
  { to: "/reviews", label: "리뷰 답글", icon: "star", dot: true },
  { to: "/talktalk", label: "톡톡 AI 응답", icon: "chat", dot: true },
  { to: "/optimize", label: "상품명 최적화", icon: "sparkles" },
  { to: "/settings", label: "설정", icon: "settings" },
];

export default function Sidebar() {
  const settings = getSettings();
  const storeName = settings.storeName || "내 스토어";

  return (
    <aside className="sidebar">
      <div className="sb-logo">Nav<span className="one">One</span></div>
      <nav className="sb-nav">
        {ITEMS.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) => "sb-item" + (isActive ? " active" : "")}
          >
            {({ isActive }) => (
              <>
                <span className="ico"><Icon name={it.icon} size={17} /></span>
                <span>{it.label}</span>
                {it.dot && !isActive && <span className="badge-dot" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="sb-foot">
        <div className="store">{storeName}</div>
        <div className="sub">
          <span>플랜</span>
          <b>프로 · 23일 남음</b>
        </div>
      </div>
    </aside>
  );
}

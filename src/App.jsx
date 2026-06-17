import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Price from "./pages/Price";
import Orders from "./pages/Orders";
import Settlement from "./pages/Settlement";
import Customer from "./pages/Customer";
import Optimize from "./pages/Optimize";
import Group from "./pages/Group";
import Risk from "./pages/Risk";
import Settings from "./pages/Settings";
import LoginGate from "./components/LoginGate";

const PAGES = {
  dashboard: Dashboard,
  price: Price,
  orders: Orders,
  settlement: Settlement,
  reviews: Customer,
  optimize: Optimize,
  group: Group,
  risk: Risk,
  settings: Settings,
};

const PAGE_KEY = "nv_page";

export default function App() {
  const [page, setPage] = useState(() => {
    try { return localStorage.getItem(PAGE_KEY) || "dashboard"; } catch { return "dashboard"; }
  });

  // 모바일 드로어 (≤880px에서 사이드바)
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("nv-drawer-open", drawer);
    return () => document.body.classList.remove("nv-drawer-open");
  }, [drawer]);

  const nav = (id) => {
    if (!PAGES[id]) return;
    setPage(id);
    setDrawer(false); // 모바일: 메뉴 선택하면 드로어 닫기
    try { localStorage.setItem(PAGE_KEY, id); } catch { /* noop */ }
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    document.title = "CommerOne · 스마트스토어 통합관리";
  }, []);

  const Page = PAGES[page] || Dashboard;

  return (
    <LoginGate>
      {(user) => (
        <div className="nv">
          {/* 모바일 상단바 (≤880px에서만 보임) */}
          <div className="nv-mbar">
            <button className="nv-burger" aria-label="메뉴 열기" onClick={() => setDrawer(true)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
            <div className="nv-mbar-word">Commer<span className="o">One</span></div>
          </div>
          {/* 드로어 열렸을 때 딤 배경 (탭하면 닫힘) */}
          <div className="nv-backdrop" onClick={() => setDrawer(false)} />

          <div className="nv-app">
            <Sidebar active={page} onNav={nav} user={user} />
            <main className="nv-main nv-scroll">
              <Page onNav={nav} />
            </main>
          </div>
        </div>
      )}
    </LoginGate>
  );
}

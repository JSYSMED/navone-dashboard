import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Price from "./pages/Price";
import Orders from "./pages/Orders";
import Settlement from "./pages/Settlement";
import Customer from "./pages/Customer";
import Optimize from "./pages/Optimize";
import Risk from "./pages/Risk";
import Settings from "./pages/Settings";

const PAGES = {
  dashboard: Dashboard,
  price: Price,
  orders: Orders,
  settlement: Settlement,
  reviews: Customer,
  optimize: Optimize,
  risk: Risk,
  settings: Settings,
};

const PAGE_KEY = "nv_page";

export default function App() {
  const [page, setPage] = useState(() => {
    try { return localStorage.getItem(PAGE_KEY) || "dashboard"; } catch { return "dashboard"; }
  });

  const nav = (id) => {
    if (!PAGES[id]) return;
    setPage(id);
    try { localStorage.setItem(PAGE_KEY, id); } catch { /* noop */ }
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    document.title = "CommerOne · 스마트스토어 통합관리";
  }, []);

  const Page = PAGES[page] || Dashboard;

  return (
    <div className="nv">
      <div className="nv-app">
        <Sidebar active={page} onNav={nav} />
        <main className="nv-main nv-scroll">
          <Page onNav={nav} />
        </main>
      </div>
    </div>
  );
}

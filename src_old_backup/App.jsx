import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Price from "./pages/Price";
import Reviews from "./pages/Reviews";
import TalkTalk from "./pages/TalkTalk";
import Optimize from "./pages/Optimize";
import Settlement from "./pages/Settlement/index.jsx";
import Margin from "./pages/Margin/index.jsx";
import Claims from "./pages/Claims";
import Orders from "./pages/Orders";
import Penalty from "./pages/Penalty";
import Inquiry from "./pages/Inquiry";
import Group from "./pages/Group";
import Ad from "./pages/Ad";
import ProductAi from "./pages/ProductAi";
import AutoMode from "./pages/AutoMode";
import QA from "./pages/QA";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar />
        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/price" element={<Price />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/talktalk" element={<TalkTalk />} />
            <Route path="/optimize" element={<Optimize />} />
            <Route path="/qa" element={<QA />} />
            <Route path="/settlement" element={<Settlement />} />
            <Route path="/margin" element={<Margin />} />
            <Route path="/ad" element={<Ad />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/inquiry" element={<Inquiry />} />
            <Route path="/penalty" element={<Penalty />} />
            <Route path="/group" element={<Group />} />
            <Route path="/product-ai" element={<ProductAi />} />
            <Route path="/auto" element={<AutoMode />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

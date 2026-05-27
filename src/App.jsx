import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Price from "./pages/Price";
import Reviews from "./pages/Reviews";
import TalkTalk from "./pages/TalkTalk";
import Optimize from "./pages/Optimize";
import Settlement from "./pages/Settlement/index.jsx";
import Margin from "./pages/Margin/index.jsx";
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
            <Route path="/settlement" element={<Settlement />} />
            <Route path="/margin" element={<Margin />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

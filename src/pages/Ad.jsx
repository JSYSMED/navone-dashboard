import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import { fetchAdEfficiency, won, pct } from "../lib/api";

const FALLBACK = {
  products: [
    { productName: "샤인머스캣 1kg 특품", adFee: 184000, sales: 1240000, roas: 673.9, grade: "excellent" },
    { productName: "유기농 사과 5kg 가정용", adFee: 132000, sales: 528000, roas: 400.0, grade: "good" },
    { productName: "제주 한라봉 3kg", adFee: 96000, sales: 211200, roas: 220.0, grade: "warning" },
    { productName: "성주 참외 2.5kg", adFee: 78000, sales: 62400, roas: 80.0, grade: "danger" },
  ],
  summary: {
    productCount: 4, totalAdFee: 490000, totalSales: 2041600, avgRoas: 416.6,
    dangerCount: 1, warningCount: 1, goodCount: 1, excellentCount: 1, lossCount: 1,
  },
  range: { start: "", end: "" },
};

// ROAS → 등급/뱃지
function gradeOf(p) {
  const g = (p.grade || "").toLowerCase();
  if (g) return g;
  const r = Number(p.roas) || 0;
  if (r >= 500) return "excellent";
  if (r >= 300) return "good";
  if (r >= 150) return "warning";
  return "danger";
}
const GRADE_LABEL = { excellent: "최우수", good: "양호", warning: "주의", danger: "위험" };
const GRADE_TONE = { excellent: "green", good: "green", warning: "orange", danger: "red" };

export default function Ad() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);

  const load = async () => {
    setLoading(true); setError(""); setFallback(false);
    try {
      const d = await fetchAdEfficiency();
      // 실데이터가 비어 있으면 예시로 폴백
      if (!d?.products?.length) {
        setData(FALLBACK); setFallback(true);
      } else {
        setData(d);
      }
    } catch (e) {
      setError(e.message);
      setData(FALLBACK);
      setFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const products = data?.products || [];
  const s = data?.summary || {};

  return (
    <>
      <PageHeader
        title="광고효율"
        sub="상품별 광고비 대비 매출(ROAS)을 분석해 비효율 광고를 가려냅니다."
        right={
          <button className="btn ghost" onClick={load} disabled={loading}>
            <Icon name="refresh" size={14} /> 새로고침
          </button>
        }
      />

      {fallback && (
        <div className="card flat" style={{ padding: 12, marginBottom: 12, color: "var(--orange)", background: "var(--orange-soft)" }}>
          실데이터가 없어 예시 데이터를 표시합니다. {error && `(${error})`}
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="총 광고비" value={loading ? "-" : won(s.totalAdFee)} icon="megaphone" />
        <StatCard label="광고 매출" value={loading ? "-" : won(s.totalSales)} icon="trend" alt />
        <StatCard label="평균 ROAS" value={loading ? "-" : pct(s.avgRoas)} icon="flame" />
        <StatCard label="적자 광고" value={loading ? "-" : (s.lossCount ?? 0)} unit="개"
          delta={s.lossCount ? "확인 필요" : "없음"} deltaTone={s.lossCount ? "down" : "up"} icon="alert" />
      </div>

      <div className="card">
        <div className="card-title">
          상품별 광고효율 <span className="hint">{products.length}개 상품</span>
        </div>
        {loading ? (
          <div className="empty"><div className="spinner" />불러오는 중…</div>
        ) : products.length === 0 ? (
          <div className="empty">광고 집행 내역이 없습니다.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>상품명</th>
                <th style={{ width: 120, textAlign: "right" }}>광고비</th>
                <th style={{ width: 120, textAlign: "right" }}>광고 매출</th>
                <th style={{ width: 110, textAlign: "right" }}>ROAS</th>
                <th style={{ width: 90, textAlign: "center" }}>등급</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const g = gradeOf(p);
                return (
                  <tr key={p.productName || i}>
                    <td style={{ fontWeight: 500 }}>{p.productName || p.name || "-"}</td>
                    <td className="mono" style={{ textAlign: "right", color: "var(--ink-2)" }}>{won(p.adFee)}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{won(p.sales ?? p.adSales)}</td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{pct(p.roas)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={"badge " + (GRADE_TONE[g] || "gray")}>{GRADE_LABEL[g] || g}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

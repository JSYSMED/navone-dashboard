import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import { fetchGroupSuggest, won } from "../lib/api";

const FALLBACK = {
  suggestions: [
    {
      groupName: "프리미엄 과일 선물세트",
      reason: "함께 구매 비율이 높은 고당도 상품을 묶어 객단가를 높입니다.",
      expectedUplift: "객단가 +18%",
      products: [
        { name: "샤인머스캣 1kg 특품", price: 24900 },
        { name: "제주 한라봉 3kg", price: 32000 },
      ],
    },
    {
      groupName: "가정용 알뜰 과일 묶음",
      reason: "재구매가 잦은 일상 과일을 묶어 장바구니 이탈을 줄입니다.",
      expectedUplift: "전환율 +9%",
      products: [
        { name: "유기농 사과 5kg 가정용", price: 26900 },
        { name: "방울토마토 2kg 대저", price: 13900 },
      ],
    },
    {
      groupName: "여름 새콤 세트",
      reason: "시즌 검색량 상승 키워드 기반 추천 조합입니다.",
      expectedUplift: "노출 +12%",
      products: [
        { name: "성주 참외 2.5kg", price: 19900 },
        { name: "방울토마토 2kg 대저", price: 13900 },
      ],
    },
  ],
};

const g = (o, keys, d = "") => {
  for (const k of keys) if (o[k] != null && o[k] !== "") return o[k];
  return d;
};

export default function Group() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);

  const load = async () => {
    setLoading(true); setError(""); setFallback(false);
    try {
      const d = await fetchGroupSuggest();
      const list = d?.suggestions || d?.groups || [];
      if (!list.length) { setData(FALLBACK); setFallback(true); }
      else setData(d);
    } catch (e) {
      setError(e.message);
      setData(FALLBACK);
      setFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const suggestions = data?.suggestions || data?.groups || [];
  const totalProducts = suggestions.reduce((s, r) => s + ((r.products || r.items || []).length), 0);

  return (
    <>
      <PageHeader
        title="그룹상품 추천"
        sub="함께 팔기 좋은 상품 조합을 추천해 객단가와 전환율을 높입니다."
        right={
          <button className="btn ghost" onClick={load} disabled={loading}>
            <Icon name="refresh" size={14} /> 새로고침
          </button>
        }
      />

      {fallback && (
        <div className="card flat" style={{ padding: 12, marginBottom: 12, color: "var(--orange)", background: "var(--orange-soft)" }}>
          실시간 추천을 불러오지 못해 예시 데이터를 표시합니다. {error && `(${error})`}
        </div>
      )}

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <StatCard label="추천 묶음" value={loading ? "-" : suggestions.length} unit="개" icon="users" />
        <StatCard label="포함 상품" value={loading ? "-" : totalProducts} unit="개" icon="box" alt />
      </div>

      {loading ? (
        <div className="card empty"><div className="spinner" />불러오는 중…</div>
      ) : suggestions.length === 0 ? (
        <div className="card empty">추천할 그룹 상품이 없습니다.</div>
      ) : (
        <div className="grid-2">
          {suggestions.map((s, i) => {
            const products = s.products || s.items || [];
            const sum = products.reduce((acc, p) => acc + (Number(p.price ?? p.salePrice) || 0), 0);
            return (
              <div key={g(s, ["groupName", "name"], i)} className="card">
                <div className="card-title">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Icon name="users" size={15} color="var(--green)" /> {g(s, ["groupName", "name"], "추천 묶음")}
                  </span>
                  {(s.expectedUplift || s.uplift) && (
                    <span className="badge green">{g(s, ["expectedUplift", "uplift"])}</span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 14, lineHeight: 1.55 }}>
                  {g(s, ["reason", "description"], "")}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {products.map((p, j) => (
                    <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#F7F8FA", borderRadius: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{g(p, ["name", "productName"], "상품")}</span>
                      <span className="mono" style={{ fontSize: 13, color: "var(--ink-2)" }}>{won(p.price ?? p.salePrice)}</span>
                    </div>
                  ))}
                </div>
                {sum > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                    <span style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>묶음 합계</span>
                    <span className="mono" style={{ fontWeight: 700, color: "var(--green-ink)" }}>{won(sum)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

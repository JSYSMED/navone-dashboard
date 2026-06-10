import { useState } from "react";
import Icon from "../components/Icon";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import { analyzeProduct } from "../lib/api";

const fallbackFor = (no) => ({
  originProductNo: no,
  productName: "샤인머스캣 1kg 특품",
  score: 72,
  summary: "상품명에 핵심 키워드는 포함되어 있으나, 검색 트렌드 상위 키워드와 구매 전환 요소가 일부 누락되어 있습니다.",
  currentTitle: "샤인머스캣 1kg 특품",
  titleSuggestion: "[당도선별] 샤인머스캣 1kg 특품 산지직송 고당도 프리미엄",
  keywords: ["당도선별", "산지직송", "고당도", "프리미엄", "선물용"],
  improvements: [
    "상위 검색 키워드 '당도선별', '산지직송'을 상품명 앞쪽에 배치하세요.",
    "대표 이미지에 당도(Brix) 수치를 노출하면 전환율이 개선됩니다.",
    "상세페이지 상단에 보관/배송 안내를 추가해 CS 문의를 줄이세요.",
  ],
});

const g = (o, keys, d = "") => {
  for (const k of keys) if (o[k] != null && o[k] !== "") return o[k];
  return d;
};

export default function ProductAi() {
  const [productNo, setProductNo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);

  const run = async () => {
    const no = productNo.trim();
    if (!no) { setError("상품번호(originProductNo)를 입력해주세요."); return; }
    setLoading(true); setError(""); setFallback(false); setData(null);
    try {
      setData(await analyzeProduct(no));
    } catch (e) {
      setError(e.message);
      setData(fallbackFor(no));
      setFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const score = data ? Number(g(data, ["score", "totalScore"], 0)) : 0;
  const keywords = data ? (data.keywords || data.suggestedKeywords || []) : [];
  const improvements = data ? (data.improvements || data.suggestions || data.tips || []) : [];

  return (
    <>
      <PageHeader
        title="AI 상품분석"
        sub="상품번호를 입력하면 AI가 상품명·키워드·전환 요소를 분석해 개선안을 제시합니다."
      />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">상품 분석 <span className="hint">originProductNo 입력</span></div>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input mono" placeholder="예: 12345678901" value={productNo}
            onChange={(e) => setProductNo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()} />
          <button className="btn primary" onClick={run} disabled={loading}>
            <Icon name="sparkles" size={14} /> {loading ? "분석 중…" : "분석"}
          </button>
        </div>
        {error && !fallback && <div className="field-hint" style={{ marginTop: 10, color: "var(--red)" }}>{error}</div>}
      </div>

      {fallback && (
        <div className="card flat" style={{ padding: 12, marginBottom: 12, color: "var(--orange)", background: "var(--orange-soft)" }}>
          서버 분석을 불러오지 못해 예시 분석 결과를 표시합니다. {error && `(${error})`}
        </div>
      )}

      {loading ? (
        <div className="card empty"><div className="spinner" />상품을 분석하고 있습니다…</div>
      ) : !data ? (
        <div className="card empty">상품번호를 입력하고 분석을 실행하세요.</div>
      ) : (
        <>
          <div className="stat-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <StatCard label="상품 점수" value={score || "-"} unit="/ 100"
              delta={score >= 70 ? "양호" : "개선 권장"} deltaTone={score >= 70 ? "up" : "warn"} icon="trend" />
            <StatCard label="추천 키워드" value={keywords.length} unit="개" icon="sparkles" alt />
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">분석 요약 <span className="hint">{g(data, ["productName", "name"], "")}</span></div>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink)" }}>
              {g(data, ["summary", "analysis", "comment"], "분석 요약 정보가 없습니다.")}
            </div>
          </div>

          {(data.titleSuggestion || data.suggestedTitle) && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">상품명 추천</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 4 }}>현재 상품명</div>
                  <div style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{g(data, ["currentTitle", "productName", "name"], "-")}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--green-ink)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="sparkles" size={11} /> AI 추천
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{g(data, ["titleSuggestion", "suggestedTitle"], "")}</div>
                </div>
              </div>
            </div>
          )}

          {keywords.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">추천 키워드</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {keywords.map((k, i) => (
                  <span key={i} className="chip green" style={{ fontSize: 12 }}>+ {typeof k === "string" ? k : g(k, ["keyword", "name"], "")}</span>
                ))}
              </div>
            </div>
          )}

          {improvements.length > 0 && (
            <div className="card">
              <div className="card-title">개선 제안 <span className="hint">{improvements.length}건</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {improvements.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div className="act-ico price" style={{ width: 24, height: 24, flexShrink: 0 }}>
                      <Icon name="check" size={13} />
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink)", paddingTop: 2 }}>
                      {typeof t === "string" ? t : g(t, ["text", "message", "tip"], "")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

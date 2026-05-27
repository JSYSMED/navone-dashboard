import { useState } from "react";
import Icon from "../components/Icon";
import Toggle from "../components/Toggle";
import PageHeader from "../components/PageHeader";

// 상품명 최적화 — 아직 전용 API가 없어 목업 데이터로 표시
export default function Optimize() {
  const [frequency, setFrequency] = useState("주 2~3회");
  const [autoApply, setAutoApply] = useState(false);
  const [applied, setApplied] = useState(new Set());

  const trendingKeywords = [
    "당도선별", "산지직송", "새벽수확", "GAP인증", "가정용",
    "선물용", "당일출고", "고당도", "특품", "샤인머스캣",
    "유기농", "친환경", "프리미엄", "대용량", "소포장",
  ];

  const products = [
    { id: 1, current: "샤인머스캣 1kg 특품", ai: "[당도선별] 샤인머스캣 1kg 특품 산지직송 고당도 프리미엄", added: ["당도선별", "산지직송", "고당도", "프리미엄"] },
    { id: 2, current: "유기농 사과 5kg 가정용", ai: "GAP인증 유기농 사과 5kg 가정용 새벽수확 친환경 부사", added: ["GAP인증", "새벽수확", "친환경", "부사"] },
    { id: 3, current: "방울토마토 2kg 대저", ai: "[당일출고] 대저 방울토마토 2kg 산지직송 짭짤이 고당도", added: ["당일출고", "산지직송", "짭짤이", "고당도"] },
    { id: 4, current: "제주 한라봉 3kg", ai: "제주 한라봉 3kg 선물용 노지재배 프리미엄 1+", added: ["선물용", "노지재배", "프리미엄", "1+"] },
    { id: 5, current: "성주 참외 2.5kg", ai: "[새벽수확] 성주 참외 2.5kg 가정용 GAP인증 당도선별", added: ["새벽수확", "가정용", "GAP인증", "당도선별"] },
  ];

  return (
    <>
      <PageHeader
        title="상품명 최적화"
        sub="실시간 검색 트렌드를 반영해 상품명을 자동으로 다듬습니다. (미리보기 · API 연동 예정)"
      />

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat">
          <div className="label">최근 7일 최적화</div>
          <div className="val mono">34<span className="unit">건</span></div>
          <div className="delta up">노출 +18.2%</div>
          <div className="icon-pill"><Icon name="sparkles" size={18} /></div>
        </div>
        <div className="stat alt">
          <div className="label">다음 예정</div>
          <div className="val mono">내일 03:00</div>
          <div className="delta warn">자동 실행</div>
          <div className="icon-pill"><Icon name="clock" size={18} /></div>
        </div>
        <div className="stat">
          <div className="label">검토 대기</div>
          <div className="val mono">5<span className="unit">건</span></div>
          <div className="delta up">자동 적용 OFF</div>
          <div className="icon-pill"><Icon name="list" size={18} /></div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">최적화 설정</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="field">
              <label className="field-label">변경 주기</label>
              <div className="seg">
                {["하루 1회", "주 2~3회", "주 1회"].map((f) => (
                  <button key={f} className={frequency === f ? "active" : ""} onClick={() => setFrequency(f)}>{f}</button>
                ))}
              </div>
            </div>
            <div className="field" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="field-label">자동 적용</div>
                <div className="field-hint">검토 없이 추천 상품명을 바로 반영합니다.</div>
              </div>
              <Toggle on={autoApply} onChange={setAutoApply} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="flame" size={14} color="var(--orange)" /> 인기 검색어
            </span>
            <span className="hint">실시간 트렌드</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {trendingKeywords.map((kw, i) => (
              <span key={kw} className={"chip " + (i < 5 ? "orange" : i < 10 ? "green" : "")} style={{ fontSize: 12 }}>
                {i < 3 && <span style={{ fontWeight: 700, marginRight: 2 }}>{i + 1}</span>}
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">최적화 추천 <span className="hint">{products.length}건 검토 대기</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {products.map((p) => {
            const done = applied.has(p.id);
            return (
              <div key={p.id} style={{ padding: "16px 18px", background: "#F7F8FA", borderRadius: 12, border: "1px solid var(--line)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr auto", gap: 16, alignItems: "center" }}>
                  <div style={{
                    width: 90, height: 64, borderRadius: 8,
                    background: "repeating-linear-gradient(45deg, #ECEEF1 0 6px, #F4F6F8 6px 12px)",
                    display: "grid", placeItems: "center", fontSize: 9, color: "var(--ink-3)", fontFamily: "monospace",
                  }}>상품 이미지</div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 4 }}>현재 상품명</div>
                    <div style={{ fontSize: 13.5, color: "var(--ink-2)" }}>{p.current}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--green-ink)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon name="sparkles" size={11} /> AI 추천
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{p.ai}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {p.added.map((k) => (
                        <span key={k} className="chip green" style={{ padding: "2px 8px", fontSize: 11 }}>+ {k}</span>
                      ))}
                    </div>
                  </div>
                  <button className={"btn sm " + (done ? "ghost" : "primary")}
                    onClick={() => { const next = new Set(applied); next.add(p.id); setApplied(next); }}
                    disabled={done}>
                    {done ? <><Icon name="check" size={12} /> 적용됨</> : "적용"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

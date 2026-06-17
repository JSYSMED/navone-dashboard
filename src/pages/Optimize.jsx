import { useState, useEffect } from "react";
import NvIcon from "../components/NvIcon";
import { NvPageHead, NvSeg, NvBanner, NvStat, NvStatRow, NvEmpty } from "../components/atoms";
import { fetchProductDiagnosis, analyzeProduct, fetchFeatureCache, saveFeatureCache } from "../lib/api";
import Group from "./Group";

// 서버 bulk-analyze 응답 → 화면 형식 매핑
// scores.{nameSeo,attributeCompleteness,aitems}는 {score,max,details} 중첩 객체
function mapDiag(products) {
  const num = v => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : 0; };
  return (products || []).map((p, i) => ({
    id: p.originProductNo || i,
    originProductNo: p.originProductNo,
    name: p.productName || "—",
    cat: p.leafCategoryId ? "카테고리 " + p.leafCategoryId : "",
    score: num(p.scores?.overall),
    n: num(p.scores?.nameSeo?.score),
    a: num(p.scores?.attributeCompleteness?.score),
    ai: num(p.scores?.aitems?.score),
    nameDetails: p.scores?.nameSeo?.details || [],
    aiDetails: p.scores?.aitems?.details || [],
    missingAttributes: p.scores?.attributeCompleteness?.missing || p.missingAttributes || [],
    rec: null,
  }));
}

// 모듈 레벨 캐시 — 페이지를 나갔다 다시 들어와도 직전 진단 결과와 AI 추천을 유지한다.
// (브라우저 새로고침 시에는 비워짐. "다시 진단"을 누르면 강제로 새로 분석.)
let _optimizeCache = null;

export default function Optimize() {
  const [view, setView] = useState("opt"); // opt | grp — 그룹상품 흡수
  const [tab, setTab] = useState("diagnose");
  const [scoreMax, setScoreMax] = useState(70);
  const [openId, setOpenId] = useState(null);

  // 진단 데이터 (API). 모듈 캐시로 페이지 이동 간 유지 — 매번 무거운 AI 진단 재호출 방지.
  const [diag, setDiag] = useState(_optimizeCache?.diag || []);
  const [summary, setSummary] = useState(_optimizeCache?.summary || { count: 0, averageOverall: 0, needsImprovement: 0 });
  const [status, setStatus] = useState(_optimizeCache ? "ok" : "loading"); // loading|ok|empty|error
  const [recCache, setRecCache] = useState(_optimizeCache?.recCache || {}); // originProductNo -> {recommendedName, tags}
  const [recLoading, setRecLoading] = useState(null);

  const loadDiag = async () => {
    setStatus("loading");
    try {
      const d = await fetchProductDiagnosis(50);
      const mapped = mapDiag(d?.products);
      const nextSummary = {
        count: d?.count ?? mapped.length,
        averageOverall: Math.round(d?.summary?.averageOverall ?? 0),
        needsImprovement: d?.summary?.needsImprovement ?? mapped.filter(x => x.score < 60).length,
      };
      setSummary(nextSummary);
      if (mapped.length) {
        setDiag(mapped); setStatus("ok");
        _optimizeCache = { diag: mapped, summary: nextSummary, recCache: {} };  // 메모리 캐시(추천은 새로)
        setRecCache({});
        saveFeatureCache("optimize", { diag: mapped, summary: nextSummary, recCache: {} }).catch(() => {});  // 서버 영구 캐시
      }
      else { setDiag([]); setStatus("empty"); _optimizeCache = null; }
    } catch { setStatus("error"); }
  };

  // 우선순위: 모듈캐시(페이지이동) → 서버캐시(새로고침) → 새 진단.
  useEffect(() => {
    if (_optimizeCache) {
      setDiag(_optimizeCache.diag);
      setSummary(_optimizeCache.summary);
      setRecCache(_optimizeCache.recCache || {});
      setStatus(_optimizeCache.diag.length ? "ok" : "empty");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const cached = await fetchFeatureCache("optimize");
        if (alive && cached?.result?.diag) {
          const c = cached.result;
          _optimizeCache = { diag: c.diag, summary: c.summary, recCache: c.recCache || {} };
          setDiag(c.diag);
          setSummary(c.summary);
          setRecCache(c.recCache || {});
          setStatus(c.diag.length ? "ok" : "empty");
          return;
        }
      } catch {}
      if (alive) loadDiag();   // 서버 캐시도 없으면 새로 진단
    })();
    return () => { alive = false; };
  }, []);

  // 행 펼칠 때 AI 추천 lazy 로드 (캐시에도 저장 → 재방문 시 재호출 안 함)
  const toggleRow = async (d) => {
    const next = openId === d.id ? null : d.id;
    setOpenId(next);
    if (next != null && d.originProductNo && !recCache[d.originProductNo]) {
      setRecLoading(d.originProductNo);
      try {
        const r = await analyzeProduct(d.originProductNo);
        const ai = r?.ai || r || {};
        const entry = { recommendedName: ai.recommendedName || "", tags: ai.keywordSuggestions || ai.tags || [] };
        setRecCache(c => {
          const nc = { ...c, [d.originProductNo]: entry };
          if (_optimizeCache) _optimizeCache.recCache = nc;   // 모듈 캐시에도 반영
          return nc;
        });
      } catch {
        setRecCache(c => {
          const nc = { ...c, [d.originProductNo]: { recommendedName: "", tags: [], error: true } };
          if (_optimizeCache) _optimizeCache.recCache = nc;
          return nc;
        });
      }
      setRecLoading(null);
    }
  };

  const dims = [["상품명 (SEO)", summary.count ? Math.round(diag.reduce((s, d) => s + d.n, 0) / diag.length) : 0, "이름 길이·키워드 수·브랜드 조합"], ["속성 완성도", summary.count ? Math.round(diag.reduce((s, d) => s + d.a, 0) / diag.length) : 0, "제조사·브랜드·모델·태그 입력 여부"], ["AiTEMS 노출 재료", summary.count ? Math.round(diag.reduce((s, d) => s + d.ai, 0) / diag.length) : 0, "이미지 장수·상세설명 길이·태그 수"]];
  const sCol = s => s >= 80 ? "var(--green-ink)" : s >= 60 ? "var(--amber-ink)" : "var(--red)";
  const shown = (scoreMax >= 100 ? diag.slice() : diag.filter(d => d.score < scoreMax)).sort((a, b) => a.score - b.score);
  const enrich = [
    { type: "상세설명", mode: "생성", tone: "green", from: "17자", to: "312자", note: "성분·사용법·보관법 자동 구성" },
    { type: "판매자 태그", mode: "생성", tone: "green", from: "0개", to: "5개", note: "검색량 검증 후 추천" },
    { type: "카테고리 속성", mode: "후보 선택", tone: "blue", from: "미입력", to: "원산지=국산 외 2", note: "네이버 제공 후보 중 선택 (임의 생성 안 함)" },
    { type: "제조사·브랜드", mode: "추출만", tone: "gray", from: "미입력", to: "상품명에서 추출", note: "AI가 지어내지 않음 — 확인 불가 시 셀러 입력" },
    { type: "이미지", mode: "가이드만", tone: "gray", from: "1장", to: "권장 4장", note: "전체샷·디테일·사용예시 가이드 (생성 불가)" },
  ];
  const coreTags = ["샤인머스캣", "산지직송", "고당도"];
  const trendIn = [{ kw: "당도선별", vol: "3.5만", up: "+212%" }, { kw: "선물용포장", vol: "1.8만", up: "+64%" }];
  const trendOut = [{ kw: "햇과일", vol: "0.4만" }, { kw: "제철과일", vol: "0.3만" }];

  return (
    <>
      <NvPageHead title="상품 최적화" sub="상품을 사람·검색·AI(AiTEMS) 모두에게 잘 읽히게 만들어요. 진단 → AI 보강 → 월간 갱신."
        actions={view === "opt" ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="nv-btn ghost sm" onClick={loadDiag} disabled={status === "loading"}><NvIcon name="refresh" size={13} /> 다시 진단</button>
          <span className="nv-pill green"><NvIcon name="sparkles" size={12} /> 월간 구독</span>
        </div> : null} />

      <NvSeg style={{ marginBottom: 20 }} value={view} onChange={setView} tabs={[["opt", "상품 최적화"], ["grp", "그룹상품"]]} />

      {view === "grp" && <Group />}

      {view === "opt" && (<>
      <NvSeg style={{ marginBottom: 20 }} value={tab} onChange={setTab} tabs={[["diagnose", "① 진단"], ["enrich", "② AI 보강"], ["refresh", "③ 월간 갱신"]]} />

      {tab === "diagnose" && (
        status === "loading" ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>상품을 진단하는 중…</div>
        ) : status === "error" ? (
          <NvEmpty icon="bell" title="상품 진단을 불러오지 못했어요" desc="잠시 후 다시 시도해 주세요." tone="amber" />
        ) : status === "empty" ? (
          <NvEmpty icon="box" title="진단할 상품이 없어요" desc="판매중인 상품이 등록되면 노출 점수를 진단해 드려요." tone="violet" />
        ) : (
        <>
          <NvStatRow cols={3}>
            <NvStat label="전체 진단 상품" value={summary.count.toLocaleString()} unit="개" icon="box" tone="violet" sub={`상위 ${diag.length}개 분석`} subTone="up" />
            <NvStat label="평균 노출 점수" value={summary.averageOverall} unit="점" icon="trend" tone="green" sub="100점 만점" subTone="up" />
            <NvStat label="60점 미만" value={summary.needsImprovement} unit="개" icon="bell" tone="amber" sub="개선 시 노출 상승 여지" subTone="warn" />
          </NvStatRow>
          <div className="nv-card" style={{ marginBottom: 16 }}>
            <div className="nv-card-h"><h3 className="nv-card-t">영역별 평균 점수</h3><span className="nv-card-hint">분석 상품 기준</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {dims.map(([l, sc, desc]) => (
                <div key={l}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{l}</span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: sCol(sc) }}>{sc}점</span>
                  </div>
                  <div className="nv-prog"><i style={{ width: sc + "%", background: sCol(sc) }} /></div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 5 }}>{desc}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}><NvBanner tone="amber" icon="bell"><b>AiTEMS 노출 재료 점수가 낮으면 추천 노출에서 밀립니다.</b> 네이버 AI는 이미지·상세설명·태그로 상품을 읽어요. → ② AI 보강에서 채울 수 있어요.</NvBanner></div>
          </div>
          <div className="nv-card">
            <div className="nv-card-h" style={{ flexWrap: "wrap", gap: 10 }}>
              <h3 className="nv-card-t">상품별 진단 <span className="nv-card-hint" style={{ fontWeight: 500 }}>{shown.length}개 · 상위 {diag.length}개 분석 완료</span></h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--ink-2)" }}>모아보기</span>
                <NvSeg value={scoreMax} onChange={v => { setScoreMax(v); setOpenId(null); }} tabs={[[50, "50↓"], [60, "60↓"], [70, "70↓"], [100, "전체"]]} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {shown.map(d => {
                const open = openId === d.id;
                const rec = recCache[d.originProductNo];
                return (
                  <div key={d.id} style={{ borderRadius: 14, border: "1px solid var(--line)", overflow: "hidden" }}>
                    <div onClick={() => toggleRow(d)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer", background: open ? "var(--line-2)" : "#fff" }}>
                      <div className="mono" style={{ fontSize: 20, fontWeight: 800, color: sCol(d.score), width: 40, textAlign: "center" }}>{d.score}</div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{d.name}</div><div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>{d.cat}</div></div>
                      <div style={{ display: "flex", gap: 5 }}>
                        {[["명", d.n], ["속", d.a], ["AI", d.ai]].map(([k, v]) => (<span key={k} style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 7, fontWeight: 800, background: v >= 80 ? "var(--green-soft)" : v >= 60 ? "var(--amber-soft)" : "var(--red-soft)", color: sCol(v) }}>{k} {v}</span>))}
                      </div>
                      <NvIcon name={open ? "arrowUp" : "arrowDown"} size={15} />
                    </div>
                    {open && (
                      <div style={{ padding: "16px", borderTop: "1px solid var(--line)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-2)", marginBottom: 9 }}>진단 상세 — 무엇이 부족한가</div>
                          <div style={{ marginBottom: 9 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-3)", marginBottom: 3 }}>점수 요약</div>
                            <div style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.65 }}>· 상품명 SEO {d.n}점 · 속성 완성도 {d.a}점 · AiTEMS {d.ai}점</div>
                          </div>
                          {d.nameDetails?.length > 0 && (
                            <div style={{ marginBottom: 9 }}>
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-3)", marginBottom: 3 }}>상품명</div>
                              {d.nameDetails.map((x, j) => <div key={j} style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.65 }}>· {x}</div>)}
                            </div>
                          )}
                          {d.aiDetails?.length > 0 && (
                            <div style={{ marginBottom: 9 }}>
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-3)", marginBottom: 3 }}>AiTEMS</div>
                              {d.aiDetails.map((x, j) => <div key={j} style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.65 }}>· {x}</div>)}
                            </div>
                          )}
                          {d.missingAttributes?.length > 0 && (
                            <div style={{ marginBottom: 9 }}>
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-3)", marginBottom: 3 }}>누락 속성</div>
                              {d.missingAttributes.map((x, j) => <div key={j} style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.65 }}>· {x}</div>)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--green-ink)", marginBottom: 9, display: "flex", alignItems: "center", gap: 5 }}><NvIcon name="sparkles" size={12} /> AI 추천</div>
                          {recLoading === d.originProductNo ? (
                            <div style={{ fontSize: 12.5, color: "var(--ink-3)", padding: "10px 0" }}>AI 추천 생성 중…</div>
                          ) : rec?.error ? (
                            <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>추천을 불러오지 못했어요.</div>
                          ) : rec ? (
                            <>
                              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 3 }}>추천 상품명</div>
                              <div style={{ fontSize: 13, fontWeight: 600, padding: "9px 12px", background: "var(--green-soft)", borderRadius: 10, lineHeight: 1.5 }}>{rec.recommendedName || "—"}</div>
                              {rec.tags?.length > 0 && (<>
                                <div style={{ fontSize: 11.5, color: "var(--ink-3)", margin: "11px 0 6px" }}>추천 태그</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{rec.tags.map(t => <span key={t} className="nv-chip green" style={{ fontSize: 11.5 }}>+ {t}</span>)}</div>
                              </>)}
                              <button className="nv-btn primary sm" style={{ marginTop: 13 }} onClick={e => { e.stopPropagation(); setTab("enrich"); }}>이 상품 보강하기</button>
                            </>
                          ) : (
                            <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>행을 펼치면 추천을 생성합니다.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
        )
      )}

      {tab === "enrich" && (
        <>
          <div className="nv-card" style={{ marginBottom: 16 }}>
            <div className="nv-card-h"><h3 className="nv-card-t">AI 보강 — 항목별 처리 방식</h3><span className="nv-card-hint">생성/선택/추출/가이드 구분</span></div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 14 }}>항목마다 AI가 하는 일이 달라요. 사실이 정해진 항목(제조사·브랜드)은 <b style={{ color: "var(--ink)" }}>지어내지 않고 추출만</b> 하고, 이미지는 생성하지 않습니다.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {enrich.map((e, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "15px 17px", borderRadius: 14, border: "1px solid var(--line)" }}>
                  <div style={{ width: 104 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{e.type}</div>
                    <span className={"nv-pill " + (e.tone === "gray" ? "gray" : e.tone === "blue" ? "blue" : "green")} style={{ marginTop: 5, fontSize: 10.5 }}>{e.mode}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="mono" style={{ color: "var(--ink-3)" }}>{e.from}</span>
                      <NvIcon name="arrowR" size={13} />
                      <span className="mono" style={{ fontWeight: 800, color: "var(--green-ink)" }}>{e.to}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>{e.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">생성 결과 검수</h3><span className="nv-card-hint">유기농 사과 5kg</span></div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5 }}>AI 생성 상세설명 (초안)</div>
              <div style={{ padding: "13px 15px", borderRadius: 12, background: "var(--line-2)", fontSize: 13, lineHeight: 1.7 }}>GAP 인증 농가에서 새벽 수확한 유기농 부사 사과입니다. 5kg 가정용 대용량 구성으로, 아삭한 식감과 풍부한 과즙이 특징입니다. 서늘한 곳에 보관하시고…</div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button className="nv-btn primary sm">승인 후 반영</button><button className="nv-btn ghost sm">수정</button><button className="nv-btn ghost sm">다시 생성</button></div>
            </div>
            <div className="nv-card" style={{ border: "1px solid #F6DDB8" }}>
              <div className="nv-card-h"><h3 className="nv-card-t" style={{ color: "var(--amber-ink)", display: "flex", alignItems: "center", gap: 6 }}><NvIcon name="bell" size={16} /> 표현 규제 필터</h3></div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 12 }}>화장품·건강식품은 과장·기능성 표현이 식약처 단속 대상입니다. AI 생성 결과에서 위험 표현을 자동 검출해 차단합니다.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[["미백", "기능성 인증 없이 사용 불가"], ["주름 개선", "의약외품·기능성 표현"], ["디톡스·노화 방지", "과장 표현 — 차단"]].map(([w, r]) => (
                  <div key={w} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 11, background: "var(--amber-soft)" }}>
                    <NvIcon name="x" size={14} />
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>"{w}"</span>
                    <span style={{ fontSize: 11, color: "var(--ink-2)" }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "refresh" && (
        <>
          <NvStatRow cols={3}>
            <NvStat label="이번 달 태그 교체" value="2" unit="개" icon="refresh" tone="green" sub="트렌드 슬롯만" subTone="up" />
            <NvStat label="다음 갱신" value="6/1" icon="clock" tone="amber" sub="월 1회 주기" subTone="warn" />
            <NvStat label="교체 후 노출 변화" value="+24" unit="%" icon="trend" tone="blue" sub="지난달 대비" subTone="up" />
          </NvStatRow>
          <div className="nv-card" style={{ marginBottom: 16 }}>
            <div className="nv-card-h"><h3 className="nv-card-t">이번 달 태그 갱신 추천</h3><span className="nv-card-hint">샤인머스캣 1kg · 키워드도구 기준</span></div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 16 }}>실제 월간 검색량을 기준으로, 검색이 늘어난 키워드는 넣고 줄어든 키워드는 뺍니다. 상품 정체성을 나타내는 코어 태그는 유지해요.</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-2)", marginBottom: 8 }}>코어 태그 (유지)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 18 }}>{coreTags.map(t => <span key={t} className="nv-chip"><NvIcon name="check" size={11} /> {t}</span>)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ padding: "15px 17px", borderRadius: 14, background: "var(--green-tint)" }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--green-ink)", marginBottom: 10 }}>+ 추가 (검색 급등)</div>
                {trendIn.map(t => (<div key={t.kw} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13.5, padding: "7px 0" }}><span style={{ fontWeight: 700 }}>{t.kw}</span><span style={{ fontSize: 11.5, color: "var(--ink-2)" }}>월 {t.vol} · <b style={{ color: "var(--green-ink)" }}>{t.up}</b></span></div>))}
              </div>
              <div style={{ padding: "15px 17px", borderRadius: 14, background: "var(--line-2)" }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink-3)", marginBottom: 10 }}>− 제거 (검색 감소)</div>
                {trendOut.map(t => (<div key={t.kw} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13.5, padding: "7px 0" }}><span style={{ fontWeight: 700, color: "var(--ink-2)", textDecoration: "line-through" }}>{t.kw}</span><span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>월 {t.vol}</span></div>))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}><button className="nv-btn primary"><NvIcon name="check" size={15} /> 변경 승인 후 반영</button><button className="nv-btn ghost">개별 조정</button></div>
          </div>
          <div><NvBanner tone="amber" icon="bell">태그는 <b>월 1회만</b> 교체합니다. 너무 자주 바꾸면 어뷰징으로 의심받을 수 있어, 코어는 유지하고 트렌드 슬롯만 회전해요.</NvBanner></div>
        </>
      )}
      </>)}
    </>
  );
}

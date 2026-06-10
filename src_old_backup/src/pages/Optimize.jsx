import { useState } from "react";
import NvIcon from "../components/NvIcon";
import { NvPageHead, NvSeg, NvBanner, NvStat, NvStatRow } from "../components/atoms";

export default function Optimize() {
  const [tab, setTab] = useState("diagnose");
  const [scoreMax, setScoreMax] = useState(70);
  const [openId, setOpenId] = useState(2);

  const diag = [
    { id: 1, name: "샤인머스캣 1kg 특품", cat: "과일", score: 71, n: 100, a: 80, ai: 32, detail: { name: [], attr: ["판매자 태그(검색 키워드) 없음"], ai: ["이미지 1장 — 4장 이상 권장", "판매자 태그 0개 — 5개 이상 권장", "상세설명 67자 — 300자 이상 권장"] }, rec: { name: "[당도선별] 샤인머스캣 1kg 특품 산지직송 고당도 선물용", tags: ["당도선별", "산지직송", "고당도", "선물용포장", "제철과일"] } },
    { id: 2, name: "유기농 사과 5kg 가정용", cat: "과일", score: 54, n: 71, a: 65, ai: 25, detail: { name: ["상품명이 짧음(13자) — 20~50자 권장", "키워드 수 3개 — 4~12개 권장"], attr: ["제조사명 없음", "판매자 태그 없음"], ai: ["이미지 1장 — 4장 이상 권장", "상세설명 17자 — 300자 이상 권장"] }, rec: { name: "GAP인증 유기농 사과 5kg 가정용 새벽수확 친환경 부사 아삭", tags: ["GAP인증", "새벽수확", "친환경사과", "부사", "가정용과일"] } },
    { id: 3, name: "제주 한라봉 3kg", cat: "과일", score: 87, n: 100, a: 100, ai: 60, detail: { name: [], attr: [], ai: ["이미지 1장 — 4장 이상 권장", "상세설명 33자 — 300자 이상 권장"] }, rec: { name: "제주 한라봉 3kg 선물용 노지재배 새콤달콤 고당도", tags: ["제주한라봉", "선물용", "노지재배", "고당도"] } },
    { id: 4, name: "성주 참외 2.5kg", cat: "과일", score: 63, n: 88, a: 65, ai: 30, detail: { name: ["상품명이 짧음(11자) — 20~50자 권장"], attr: ["제조사명 없음", "판매자 태그 없음"], ai: ["이미지 1장 — 4장 이상 권장", "상세설명 24자 — 300자 이상 권장"] }, rec: { name: "[새벽수확] 성주 참외 2.5kg 가정용 GAP인증 당도선별 노란참외", tags: ["성주참외", "새벽수확", "GAP인증", "당도선별", "노란참외"] } },
    { id: 5, name: "방울토마토 2kg 대저", cat: "채소", score: 80, n: 100, a: 80, ai: 41, detail: { name: [], attr: ["판매자 태그 없음"], ai: ["이미지 2장 — 4장 이상 권장", "상세설명 40자 — 300자 이상 권장"] }, rec: { name: "[당일출고] 대저 방울토마토 2kg 산지직송 짭짤이 고당도", tags: ["대저토마토", "짭짤이", "산지직송", "당일출고", "방울토마토"] } },
  ];
  const dims = [["상품명 (SEO)", 92, "이름 길이·키워드 수·브랜드 조합"], ["속성 완성도", 68, "제조사·브랜드·모델·태그 입력 여부"], ["AiTEMS 노출 재료", 41, "이미지 장수·상세설명 길이·태그 수"]];
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
      <NvPageHead title="상품 노출 최적화" sub="상품을 사람·검색·AI(AiTEMS) 모두에게 잘 읽히게 만들어요. 진단 → AI 보강 → 월간 갱신."
        actions={<span className="nv-pill green"><NvIcon name="sparkles" size={12} /> 월간 구독</span>} />

      <NvSeg style={{ marginBottom: 20 }} value={tab} onChange={setTab} tabs={[["diagnose", "① 진단"], ["enrich", "② AI 보강"], ["refresh", "③ 월간 갱신"]]} />

      {tab === "diagnose" && (
        <>
          <NvStatRow cols={3}>
            <NvStat label="전체 진단 상품" value="1,000" unit="개" icon="box" tone="violet" sub="풀스캔 완료" subTone="up" />
            <NvStat label="평균 노출 점수" value="79" unit="점" icon="trend" tone="green" sub="100점 만점" subTone="up" />
            <NvStat label="70점 미만" value="284" unit="개" icon="bell" tone="amber" sub="개선 시 노출 상승 여지" subTone="warn" />
          </NvStatRow>
          <div className="nv-card" style={{ marginBottom: 16 }}>
            <div className="nv-card-h"><h3 className="nv-card-t">영역별 평균 점수</h3><span className="nv-card-hint">전 상품 기준</span></div>
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
            <div style={{ marginTop: 16 }}><NvBanner tone="amber" icon="bell"><b>AiTEMS 노출 재료가 41점으로 가장 낮습니다.</b> 네이버 AI 추천은 이미지·상세설명·태그로 상품을 읽어요. 이 점수가 낮으면 추천 노출에서 밀립니다. → ② AI 보강에서 채울 수 있어요.</NvBanner></div>
          </div>
          <div className="nv-card">
            <div className="nv-card-h" style={{ flexWrap: "wrap", gap: 10 }}>
              <h3 className="nv-card-t">상품별 진단 <span className="nv-card-hint" style={{ fontWeight: 500 }}>{shown.length}개 · 전체 1,000개 분석 완료</span></h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--ink-2)" }}>모아보기</span>
                <NvSeg value={scoreMax} onChange={v => { setScoreMax(v); setOpenId(null); }} tabs={[[50, "50↓"], [60, "60↓"], [70, "70↓"], [100, "전체"]]} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {shown.map(d => {
                const open = openId === d.id;
                return (
                  <div key={d.id} style={{ borderRadius: 14, border: "1px solid var(--line)", overflow: "hidden" }}>
                    <div onClick={() => setOpenId(open ? null : d.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer", background: open ? "var(--line-2)" : "#fff" }}>
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
                          {[["상품명", d.detail.name], ["속성", d.detail.attr], ["AiTEMS", d.detail.ai]].map(([t, arr]) => (
                            <div key={t} style={{ marginBottom: 9 }}>
                              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-3)", marginBottom: 3 }}>{t}</div>
                              {arr.length === 0 ? <div style={{ fontSize: 12, color: "var(--green-ink)" }}>✓ 이상 없음</div> : arr.map((x, j) => <div key={j} style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.65 }}>· {x}</div>)}
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--green-ink)", marginBottom: 9, display: "flex", alignItems: "center", gap: 5 }}><NvIcon name="sparkles" size={12} /> AI 추천 (검색광고 데이터 기반)</div>
                          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 3 }}>추천 상품명</div>
                          <div style={{ fontSize: 13, fontWeight: 600, padding: "9px 12px", background: "var(--green-soft)", borderRadius: 10, lineHeight: 1.5 }}>{d.rec.name}</div>
                          <div style={{ fontSize: 11.5, color: "var(--ink-3)", margin: "11px 0 6px" }}>추천 태그 (검색량 검증)</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{d.rec.tags.map(t => <span key={t} className="nv-chip green" style={{ fontSize: 11.5 }}>+ {t}</span>)}</div>
                          <button className="nv-btn primary sm" style={{ marginTop: 13 }} onClick={e => { e.stopPropagation(); setTab("enrich"); }}>이 상품 보강하기</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
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
    </>
  );
}

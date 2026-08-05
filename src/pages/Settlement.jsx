import { useEffect, useState } from "react";
import NvIcon from "../components/NvIcon";
import { NvPageHead, NvSeg, NvBanner, NvStat, NvStatRow, NvEmpty } from "../components/atoms";
import CostManager from "../components/CostManager";
import { fetchSettlementDaily, fetchMarginRank, fetchCommissionRoi } from "../lib/api";

const won = v => (Number(v) || 0).toLocaleString("ko-KR") + "원";
const man = v => ((Number(v) || 0) / 10000).toFixed(0) + "만";

// ── 시안 fallback (서버 응답 없을 때만 표시) ──
const FALLBACK_DAILY = [
  { date: "05-20", sales: 1842000, commission: 138150, ad: 24000, delivery: 92100, ret: 15900, settlement: 1571850 },
  { date: "05-19", sales: 2134000, commission: 160050, ad: 31000, delivery: 106700, ret: 0, settlement: 1836250 },
  { date: "05-18", sales: 1567000, commission: 117525, ad: 18000, delivery: 78350, ret: 32400, settlement: 1320725 },
  { date: "05-17", sales: 1923000, commission: 144225, ad: 22000, delivery: 96150, ret: 0, settlement: 1660625 },
  { date: "05-16", sales: 2287000, commission: 171525, ad: 35000, delivery: 114350, ret: 23900, settlement: 1942225 },
  { date: "05-15", sales: 1645000, commission: 123375, ad: 19000, delivery: 82250, ret: 0, settlement: 1420375 },
  { date: "05-14", sales: 1978000, commission: 148350, ad: 28000, delivery: 98900, ret: 15900, settlement: 1686850 },
];
const FALLBACK_MARGIN = [
  { rank: 1, name: "유기농 블루베리 500g", sales: 953600, settlement: 819092, cost: 512000, profit: 307092, rate: 32.2 },
  { rank: 2, name: "샤인머스캣 1kg 특품", sales: 2211100, settlement: 1898746, cost: 1246600, profit: 652146, rate: 29.5 },
  { rank: 3, name: "방울토마토 2kg 대저", sales: 1332800, settlement: 1145208, cost: 896000, profit: 249208, rate: 18.7 },
  { rank: 4, name: "제주 한라봉 3kg", sales: 1242700, settlement: 1068721, cost: 860000, profit: 208721, rate: 16.8 },
  { rank: 5, name: "성주 참외 2.5kg", sales: 1405800, settlement: 1208986, cost: 1065000, profit: 143986, rate: 10.2 },
  { rank: 6, name: "친환경 바나나 1송이", sales: 702000, settlement: 603720, cost: 624000, profit: -20280, rate: -2.9, loss: true },
];

// 서버 daily 행 → 시안 형태 매핑 (키 편차 흡수)
function mapDaily(rows) {
  return (rows || []).map(r => {
    const date = (r.settlement_date || r.date || "").slice(5) || "—";
    const sales = +r.sales_amount || +r.sales || 0;
    const commission = +r.commission_fee || +r.commission || 0;
    const ad = +r.ad_fee || +r.ad || 0;
    const delivery = +r.delivery_fee || +r.delivery || 0;
    const ret = +r.return_deduct || +r.ret || 0;
    const settlement = +r.settlement_amount || +r.settlement || (sales - commission - ad - delivery - ret);
    return { date, sales, commission, ad, delivery, ret, settlement };
  });
}
function mapMargin(rows) {
  return (rows || []).map((r, i) => {
    const sales = +r.sales_amount || +r.sales || 0;
    const settlement = +r.settlement_amount || +r.settlement || 0;
    const cost = +r.cost || +r.cost_price || 0;
    const profit = r.profit != null ? +r.profit : settlement - cost;
    const rate = r.rate != null ? +r.rate : (sales ? (profit / sales * 100) : 0);
    return {
      rank: r.rank || i + 1,
      name: r.product_name || r.name || r.productName || "—",
      sales, settlement, cost, profit,
      rate: +rate.toFixed(1),
      loss: profit < 0,
    };
  });
}

export default function Settlement() {
  const [tab, setTab] = useState("now");
  const [hasCost, setHasCost] = useState(true);
  const [adLinked, setAdLinked] = useState(false);

  const [daily, setDaily] = useState(FALLBACK_DAILY);
  const [margin, setMargin] = useState(FALLBACK_MARGIN);
  const [roi, setRoi] = useState(null);          // 수수료 외부유입 ROI (실데이터)
  const [loading, setLoading] = useState(true);
  const [fb, setFb] = useState({ daily: false, margin: false, roi: false });
  const [marginEmpty, setMarginEmpty] = useState(false); // 서버 응답은 정상이나 데이터 0 (원가 미입력)

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchSettlementDaily();
      const mapped = mapDaily(d?.daily || d?.rows);
      if (mapped.length) { setDaily(mapped); setFb(s => ({ ...s, daily: false })); }
      else setFb(s => ({ ...s, daily: true }));
    } catch { setFb(s => ({ ...s, daily: true })); }
    try {
      const m = await fetchMarginRank();
      // 서버 키: data.ranking (배열). 응답 자체는 정상.
      const rows = m?.ranking || m?.products || m?.rows || (Array.isArray(m) ? m : []);
      const mapped = mapMargin(rows);
      if (mapped.length) {
        setMargin(mapped); setFb(s => ({ ...s, margin: false })); setMarginEmpty(false);
        if (m?.costConfigured != null) setHasCost(m.costConfigured > 0);
      } else {
        // 응답은 성공인데 ranking이 빔 → 원가 미입력 등으로 계산할 데이터 없음
        setMarginEmpty(true); setFb(s => ({ ...s, margin: false }));
      }
    } catch { setFb(s => ({ ...s, margin: true })); }
    try {
      const r = await fetchCommissionRoi();
      // totalInterlockBase가 있어야 의미 있는 분석 (유입 수수료 데이터 존재)
      if (r && (r.totalInterlockBase > 0 || (r.feeMix && r.feeMix.length))) {
        setRoi(r); setFb(s => ({ ...s, roi: false }));
      } else setFb(s => ({ ...s, roi: true }));
    } catch { setFb(s => ({ ...s, roi: true })); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const tSet = daily.reduce((s, d) => s + d.settlement, 0);
  const tSales = daily.reduce((s, d) => s + d.sales, 0);
  const tDed = daily.reduce((s, d) => s + d.commission + d.ad + d.delivery + d.ret, 0);
  const dedRate = tSales ? (tDed / tSales * 100).toFixed(1) : "0.0";

  // 수수료 구성 도넛 — 서버 feeMix(실데이터) 우선, 없으면 시안 더미
  const FALLBACK_FEES = [
    { name: "Npay 결제 수수료", val: 412000, color: "#03C75A" },
    { name: "매출연동 수수료", val: 298000, color: "#2E7CF6" },
    { name: "무이자할부 수수료", val: 86000, color: "#7C5CFC" },
    { name: "스토어 쿠폰", val: 224000, color: "#F08A1D" },
    { name: "구매·리뷰 적립", val: 142000, color: "#EC6699" },
    { name: "반품안심케어", val: 38000, color: "#94A3B8" },
  ];
  const feesReal = roi?.feeMix?.length ? roi.feeMix : null;
  const fees = feesReal || FALLBACK_FEES;
  const feeTotal = fees.reduce((s, f) => s + f.val, 0);
  const feeIsReal = !!feesReal;

  const adKw = [
    { kw: "샤인머스캣", cost: 84000, conv: 62, sales: 1532000, roas: 1824, judge: "우수" },
    { kw: "제철과일선물", cost: 56000, conv: 31, sales: 412000, roas: 736, judge: "우수" },
    { kw: "과일선물세트", cost: 72000, conv: 24, sales: 288000, roas: 400, judge: "양호" },
    { kw: "방울토마토", cost: 48000, conv: 14, sales: 112000, roas: 233, judge: "경고" },
    { kw: "유기농과일", cost: 64000, conv: 6, sales: 72000, roas: 113, judge: "위험" },
  ];
  const judge = { "우수": ["green", "증액 추천"], "양호": ["gray", "유지"], "경고": ["amber", "감액 추천"], "위험": ["red", "중단 추천"] };

  // chart geometry
  const W = 620, H = 210, padL = 46, padR = 14, padT = 12, padB = 28;
  const iW = W - padL - padR, iH = H - padT - padB;
  const _dedSum = d => (d.commission || 0) + (d.ad || 0) + (d.delivery || 0) + (d.ret || 0);
  const maxY = Math.max(1, ...daily.map(d => d.sales || 0), ...daily.map(_dedSum)) * 1.12;
  const xF = i => padL + (i + 0.5) * (iW / daily.length);
  const yF = v => padT + iH - (Math.max(0, v) / maxY) * iH;
  const barH = v => Math.max(0, yF(0) - yF(v));
  const bw = iW / daily.length * 0.5;

  let acc = 0; const R = 52, C = 2 * Math.PI * R;
  const donut = fees.map(f => { const frac = f.val / feeTotal; const seg = { ...f, frac, start: acc }; acc += frac; return seg; });

  return (
    <>
      <NvPageHead title="정산 · 마진 · 광고 분석" sub="정산금부터 수수료·마진·광고 효율까지 한곳에서 봅니다. 별도 입력 없이 자동 제공돼요."
        actions={<button className="nv-btn ghost sm" onClick={load} disabled={loading}><NvIcon name="refresh" size={13} /> {loading ? "동기화 중…" : "동기화"}</button>} />

      <NvSeg style={{ marginBottom: 20 }} value={tab} onChange={setTab} tabs={[["now", "정산 현황"], ["fee", "수수료 분석"], ["margin", "마진율 랭킹"], ["ad", "광고 효율"]]} />

      {tab === "now" && (
        <>
          {fb.daily && <div style={{ marginBottom: 14 }}><NvBanner tone="amber" icon="bell">서버 정산 데이터를 불러오지 못해 예시를 표시합니다. 동기화를 눌러 다시 시도해 주세요.</NvBanner></div>}
          <NvStatRow cols={4}>
            <NvStat label="정산금 합계 (이번 달)" value={won(tSet)} icon="coin" tone="green" sub="실수령액" subTone="up" />
            <NvStat label="판매금액 합계" value={won(tSales)} icon="tag" tone="blue" />
            <NvStat label="총 차감액" value={won(tDed)} icon="box" tone="amber" sub="수수료+혜택+공제" subTone="warn" />
            <NvStat label="차감률" value={dedRate} unit="%" icon="trend" tone="violet" sub="네이버가 가져가는 비율" subTone="warn" />
          </NvStatRow>
          <div className="nv-card" style={{ marginBottom: 16 }}>
            <div className="nv-card-h">
              <h3 className="nv-card-t">일별 정산 추이</h3>
              <div style={{ display: "flex", gap: 16, fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: "var(--green-soft)", border: "1px solid var(--green)" }} />판매</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: "var(--red-soft)", border: "1px solid var(--red)" }} />차감</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 3, borderRadius: 2, background: "var(--blue)" }} />정산금</span>
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
              {[0, maxY * .25, maxY * .5, maxY * .75, maxY].map((v, i) => (<g key={i}><line x1={padL} y1={yF(v)} x2={W - padR} y2={yF(v)} stroke="var(--line)" strokeWidth="1" /><text x={padL - 8} y={yF(v) + 4} fontSize="9.5" fill="var(--ink-3)" textAnchor="end">{Math.round(v / 10000)}만</text></g>))}
              {daily.map((d, i) => (<g key={i}>
                <rect x={xF(i) - bw / 2} y={yF(d.sales)} width={bw * 0.46} height={barH(d.sales)} fill="var(--green-soft)" stroke="var(--green)" strokeWidth=".6" rx="2" />
                <rect x={xF(i) + 1} y={yF(_dedSum(d))} width={bw * 0.46} height={barH(_dedSum(d))} fill="var(--red-soft)" stroke="var(--red)" strokeWidth=".6" rx="2" />
                <text x={xF(i)} y={H - 8} fontSize="10" fill="var(--ink-3)" textAnchor="middle">{d.date}</text>
              </g>))}
              <polyline points={daily.map((d, i) => xF(i) + "," + yF(d.settlement)).join(" ")} fill="none" stroke="var(--blue)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
              {daily.map((d, i) => <circle key={i} cx={xF(i)} cy={yF(d.settlement)} r="3.2" fill="#fff" stroke="var(--blue)" strokeWidth="2" />)}
            </svg>
          </div>
          <div className="nv-card">
            <div className="nv-card-h"><h3 className="nv-card-t">일별 정산 내역</h3><span className="nv-card-hint">판매자센터 엑셀 없이 자동 제공</span></div>
            <table className="nv-tbl">
              <thead><tr><th>날짜</th><th style={{ textAlign: "right" }}>판매금액</th><th style={{ textAlign: "right" }}>수수료</th><th style={{ textAlign: "right" }}>배송비</th><th style={{ textAlign: "right" }}>반품</th><th style={{ textAlign: "right" }}>정산금</th></tr></thead>
              <tbody>{daily.map((d, i) => (
                <tr key={i}>
                  <td className="mono" style={{ color: "var(--ink-3)" }}>{d.date}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{won(d.sales)}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--red)" }}>-{won(d.commission)}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--ink-2)" }}>-{won(d.delivery)}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--ink-2)" }}>{d.ret ? "-" + won(d.ret) : "-"}</td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: 800, color: "var(--green-ink)" }}>{won(d.settlement)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}

      {tab === "fee" && (() => {
        const man1 = v => ((Number(v) || 0) / 10000).toFixed(1).replace(/\.0$/, "") + "만";
        const pct1 = v => v == null ? "—" : (v * 100).toFixed(2) + "%";
        const extShare = roi?.externalSharePct ?? null;
        const intShare = roi?.internalSharePct ?? (extShare != null ? +(100 - extShare).toFixed(1) : null);
        const g = roi?.growthIf || null;
        const sv = roi?.savingsIf || null;
        // 외부유입 신규 매출 시나리오 (서버 growthIf 우선, 없으면 비활성)
        const growthTiers = g ? [
          { tag: "+10%", ...g.plus10 },
          { tag: "+20%", ...g.plus20 },
          { tag: "+30%", ...g.plus30 },
        ] : [];
        return (
        <>
          {fb.roi
            ? <NvBanner tone="amber" icon="bell">수수료 상세 데이터를 불러오지 못해 <b>예시</b>를 표시합니다. 동기화를 눌러 다시 시도해 주세요. (실 호출은 집 고정 IP 필요)</NvBanner>
            : <NvBanner tone="green" icon="bolt"><b>유입 경로별 수수료를 실데이터로 분석했어요.</b> 외부유입은 마케팅 수수료(~0.91%)라 내부유입(~2.73%)보다 훨씬 쌉니다.</NvBanner>}

          {/* 내부 vs 외부 유입 요약 */}
          <NvStatRow cols={4}>
            <NvStat label="내부유입 비중" value={intShare != null ? intShare : "—"} unit={intShare != null ? "%" : ""} icon="home" tone="blue" sub="네이버 내부 노출" subTone="warn" />
            <NvStat label="외부유입 비중" value={extShare != null ? extShare : "—"} unit={extShare != null ? "%" : ""} icon="trend" tone="green" sub="블로그·광고·외부 유입" subTone="up" />
            <NvStat label="내부 실효 수수료율" value={roi ? pct1(roi.internal.rate ?? roi.refRates.internal) : "—"} icon="tag" tone="amber" sub="비싼 쪽" subTone="warn" />
            <NvStat label="외부 실효 수수료율" value={roi ? pct1(roi.external.rate ?? roi.refRates.external) : "—"} icon="bolt" tone="green" sub="싼 쪽" subTone="up" />
          </NvStatRow>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">수수료 구성</h3><span className="nv-card-hint">{feeIsReal ? "실데이터 · 합계 " + won(feeTotal) : "예시 · 합계 " + won(feeTotal)}</span></div>
              <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                <svg viewBox="0 0 140 140" style={{ width: 140, height: 140, flexShrink: 0 }}>
                  <g transform="rotate(-90 70 70)">{donut.map((d, i) => <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={d.color} strokeWidth="20" strokeDasharray={(d.frac * C) + " " + C} strokeDashoffset={-d.start * C} />)}</g>
                  <text x="70" y="66" textAnchor="middle" fontSize="11" fill="var(--ink-3)">총 수수료</text>
                  <text x="70" y="84" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--ink)">{man(feeTotal)}원</text>
                </svg>
                <div style={{ flex: 1, minWidth: 180 }}>
                  {fees.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "6px 0" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: f.color, flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{f.name}</span>
                      <span className="mono" style={{ color: "var(--ink-2)" }}>{man(f.val)}원</span>
                      <span className="mono" style={{ width: 36, textAlign: "right", color: "var(--ink-3)" }}>{(f.val / feeTotal * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 외부유입을 늘리면? — 매출증가(증대) + 수수료절약(전환) */}
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">외부유입을 늘리면?</h3><span className="nv-card-hint">신규 매출 시뮬</span></div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 12 }}>
                외부유입(블로그·외부광고·가격비교 유입)은 수수료가 <b style={{ color: "var(--green-ink)" }}>{roi ? pct1(roi.external.rate ?? roi.refRates.external) : "0.91%"}</b>로 내부유입보다 쌉니다. 외부에서 매출을 더 만들면 <b>대부분 그대로 남아요.</b>
              </div>
              {growthTiers.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {growthTiers.map((t, i) => (
                    <div key={i} style={{ padding: "13px 15px", borderRadius: 13, background: i === 1 ? "var(--green-tint)" : "var(--line-2)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>외부유입 {t.tag} 늘리면</span>
                        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>매출 +{man1(t.extraSales)}원</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontSize: 17, fontWeight: 800, color: "var(--green-ink)" }}>순증 약 +{man1(t.extraNet)}원</span>
                        <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>내부보다 수수료 {man1(t.feeEdge)}원 덜 냄</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>* 유입 귀속 매출 기준 what-if 시나리오. 전환율은 동일 가정.</div>
                </div>
              ) : (
                <div style={{ padding: "13px 16px", borderRadius: 12, border: "1px dashed var(--line)", fontSize: 12.5, color: "var(--ink-2)" }}>
                  수수료 상세 데이터가 모이면 외부유입 신규 매출 시뮬을 보여드려요.
                </div>
              )}
            </div>
          </div>

          {/* 이미 들어오는 매출을 외부 경로로 — 수수료 절약(전환) */}
          {sv && (
            <div className="nv-card" style={{ marginTop: 16 }}>
              <div className="nv-card-h"><h3 className="nv-card-t">지금 매출을 외부 경로로 돌리면 (수수료 절약)</h3><span className="nv-card-hint">전환 시뮬 · 이번 달 기준</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                {[["내부유입 25% 전환", sv.shift25], ["50% 전환", sv.shift50], ["100% 전환", sv.shift100]].map(([lab, v], i) => (
                  <div key={i} style={{ padding: "14px 16px", borderRadius: 13, background: "var(--green-tint)", textAlign: "center" }}>
                    <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 5 }}>{lab}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--green-ink)" }}>−{man1(v)}원</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3 }}>수수료 절약</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 12, lineHeight: 1.55 }}>
                같은 매출이라도 외부유입 경로로 들어오면 매출연동 수수료가 <b>{roi ? pct1(roi.refRates.internal) : "2.73%"} → {roi ? pct1(roi.refRates.external) : "0.91%"}</b>로 떨어집니다. 외부 채널(블로그/카페/인스타·외부광고)을 키울수록 같은 매출에서 정산금이 더 남아요.
              </div>
            </div>
          )}
        </>
        );
      })()}

      {tab === "margin" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <CostManager onSaved={load} />
          {marginEmpty ? (
            <NvEmpty icon="coin" title="원가를 입력하면 마진율이 계산돼요"
              desc="위에서 원가를 입력하고 동기화하면, 정산금에서 원가를 빼 상품별 진짜 마진율과 순이익을 자동으로 보여드려요." tone="amber" />
          ) : (
        <>
          {fb.margin && <div style={{ marginBottom: 14 }}><NvBanner tone="amber" icon="bell">마진 데이터를 불러오지 못해 예시를 표시합니다.</NvBanner></div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{hasCost ? "원가 입력 완료 — 진짜 마진율을 계산합니다." : "원가 미입력 — 정산율만 표시됩니다."}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className={"nv-btn sm " + (hasCost ? "primary" : "ghost")} onClick={() => setHasCost(true)}>원가 입력됨</button>
              <button className={"nv-btn sm " + (!hasCost ? "primary" : "ghost")} onClick={() => setHasCost(false)}>원가 미입력</button>
            </div>
          </div>
          {!hasCost && <div style={{ marginBottom: 16 }}><NvBanner tone="green" icon="sparkles"><b>원가를 입력하면 진짜 마진율을 알 수 있어요.</b> 엑셀 업로드 또는 상품별 직접 입력 — 한 번만 하면 자동 계산됩니다.</NvBanner></div>}
          <div className="nv-card">
            <div className="nv-card-h"><h3 className="nv-card-t">상품별 {hasCost ? "마진율" : "정산율"} 랭킹</h3><span className="nv-card-hint">{hasCost ? "순이익 높은 순" : "정산금 기준"}</span></div>
            <table className="nv-tbl">
              <thead><tr><th style={{ width: 40, textAlign: "center" }}>#</th><th>상품명</th><th style={{ textAlign: "right" }}>판매가</th><th style={{ textAlign: "right" }}>정산금</th>{hasCost && <th style={{ textAlign: "right" }}>원가</th>}{hasCost && <th style={{ textAlign: "right" }}>순이익</th>}<th style={{ width: 84, textAlign: "center" }}>{hasCost ? "마진율" : "정산율"}</th></tr></thead>
              <tbody>{margin.map(r => {
                const sr = r.sales ? (r.settlement / r.sales * 100).toFixed(1) : "0.0";
                return (
                  <tr key={r.rank} style={r.loss ? { background: "var(--amber-soft)" } : null}>
                    <td style={{ textAlign: "center", fontWeight: 800, color: "var(--ink-3)" }}>{r.rank}</td>
                    <td style={{ fontWeight: 600 }}>{r.name}{r.loss && <span style={{ fontSize: 11, color: "var(--red)", marginLeft: 6, fontWeight: 700 }}>팔수록 손해</span>}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{won(r.sales)}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{won(r.settlement)}</td>
                    {hasCost && <td className="mono" style={{ textAlign: "right", color: "var(--ink-2)" }}>{won(r.cost)}</td>}
                    {hasCost && <td className="mono" style={{ textAlign: "right", fontWeight: 700, color: r.loss ? "var(--red)" : "var(--ink)" }}>{won(r.profit)}</td>}
                    <td style={{ textAlign: "center" }}>{hasCost ? <span className={"nv-pill " + (r.loss ? "red" : r.rate < 15 ? "amber" : "green")}>{r.rate}%</span> : <span className="mono" style={{ color: "var(--ink-2)" }}>{sr}%</span>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </>
        )}
        </div>
      )}

      {tab === "ad" && (!adLinked ? (
        <div className="nv-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div className="nv-ic-tile green" style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px" }}><NvIcon name="trend" size={26} /></div>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 7 }}>검색광고를 연동하면 키워드별 효율을 분석할 수 있어요</div>
          <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 20, maxWidth: 440, margin: "0 auto 20px" }}>광고비 대비 매출(ROAS)을 키워드별로 보고, 돈 낭비하는 키워드를 찾아 끌 수 있어요. 정산과 합쳐 진짜 순이익도 계산됩니다.</div>
          <div style={{ maxWidth: 340, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
            <input className="nv-input" placeholder="Access License" />
            <input className="nv-input" placeholder="Secret Key" />
            <input className="nv-input" placeholder="Customer ID" />
            <button className="nv-btn primary" onClick={() => setAdLinked(true)} style={{ justifyContent: "center" }}>연동하기</button>
          </div>
        </div>
      ) : (
        <>
          <NvStatRow cols={4}>
            <NvStat label="이번 달 총 광고비" value={won(324000)} icon="tag" tone="amber" />
            <NvStat label="광고를 통한 매출" value={won(2416000)} icon="trend" tone="green" sub="ROAS 기준" subTone="up" />
            <NvStat label="전체 ROAS" value="746" unit="%" icon="bolt" tone="blue" sub="매출÷광고비" subTone="up" />
            <NvStat label="비효율 키워드" value={2} unit="개" icon="bell" tone="red" sub="감액·중단 검토" subTone="warn" />
          </NvStatRow>
          <div className="nv-card" style={{ marginBottom: 16 }}>
            <div className="nv-card-h"><h3 className="nv-card-t">키워드별 효율</h3></div>
            <table className="nv-tbl">
              <thead><tr><th>키워드</th><th style={{ textAlign: "right" }}>광고비</th><th style={{ textAlign: "right" }}>전환</th><th style={{ textAlign: "right" }}>매출</th><th style={{ textAlign: "right" }}>ROAS</th><th style={{ width: 110, textAlign: "center" }}>판정</th></tr></thead>
              <tbody>{adKw.map((k, i) => { const [tone, act] = judge[k.judge]; return (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>{k.kw}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{won(k.cost)}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--ink-2)" }}>{k.conv}건</td>
                  <td className="mono" style={{ textAlign: "right" }}>{won(k.sales)}</td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: 800, color: tone === "red" ? "var(--red)" : tone === "amber" ? "var(--amber-ink)" : tone === "green" ? "var(--green-ink)" : "var(--ink)" }}>{k.roas}%</td>
                  <td style={{ textAlign: "center" }}><span className={"nv-pill " + tone}>{act}</span></td>
                </tr>
              ); })}</tbody>
            </table>
          </div>
          <div className="nv-card">
            <div className="nv-card-h"><h3 className="nv-card-t">진짜 순이익</h3><span className="nv-card-hint">정산 − 원가 − 광고비</span></div>
            <div style={{ padding: "18px 20px", borderRadius: 14, background: "var(--green-tint)" }}>
              <div style={{ fontWeight: 800, marginBottom: 8, fontSize: 14.5 }}>샤인머스캣 1kg 특품</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 13.5, color: "var(--ink-2)" }}>
                <span>정산 <b style={{ color: "var(--ink)" }}>25만</b></span><span>−</span><span>원가 <b style={{ color: "var(--ink)" }}>15만</b></span><span>−</span><span>광고 <b style={{ color: "var(--ink)" }}>3만</b></span><span>=</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--green-ink)" }}>순이익 7만원</span>
              </div>
            </div>
          </div>
        </>
      ))}
    </>
  );
}

import { useEffect, useState } from "react";
import NvIcon from "../components/NvIcon";
import { NvPageHead, NvSeg, NvStat, NvStatRow } from "../components/atoms";
import { fetchClaims, fetchPenaltyScan } from "../lib/api";

const typeKo = { RETURN: "반품", CANCEL: "취소", EXCHANGE: "교환", 반품: "반품", 취소: "취소", 교환: "교환" };

const FALLBACK_CLAIMS = [
  { id: "PO2026052511751741", product: "아비브 껌딱지 시트 마스크 10매", type: "RETURN", cat: "단순변심", amount: 15900, conf: 0.92, decision: "approve", reason: "사이즈가 안 맞아요" },
  { id: "PO2026052409823156", product: "샤인머스캣 1kg 특품", type: "RETURN", cat: "상품하자", amount: 24900, conf: 0.88, decision: "approve", reason: "상품 받았는데 곰팡이가 있어요" },
  { id: "PO2026052312847293", product: "유기농 블루베리 500g", type: "CANCEL", cat: "단순변심", amount: 14900, conf: 0.95, decision: "approve", reason: "단순 변심이요" },
  { id: "PO2026052215739481", product: "방울토마토 2kg 대저", type: "EXCHANGE", cat: "배송문제", amount: 11900, conf: 0.71, decision: "hold", reason: "배송 중 파손됐어요. 교환 부탁드립니다." },
  { id: "PO2026052118692537", product: "제주 한라봉 3kg", type: "RETURN", cat: "기타", amount: 28900, conf: 0.54, decision: "hold", reason: "선물 받은 건데 안 먹어서요" },
];

// 서버 클레임 행 → 시안 형태
function mapClaims(rows) {
  return (rows || []).map(c => ({
    id: c.productOrderId || c.id || "",
    product: c.productName || c.product || "—",
    type: c.claimType || c.type || "RETURN",
    cat: c.category || c.cat || "기타",
    amount: +c.amount || 0,
    conf: c.conf != null ? +c.conf : (c.decision ? 0.85 : 0.6),
    decision: c.decision === "APPROVE" ? "approve" : c.decision === "HOLD" ? "hold" : (c.decision || "hold"),
    reason: c.claimReason || c.reason || "",
  }));
}

export default function Risk() {
  const [tab, setTab] = useState("claims");
  const [claims, setClaims] = useState(FALLBACK_CLAIMS);
  const [penalty, setPenalty] = useState(null);
  const [fb, setFb] = useState({ claims: false, penalty: true });
  const [loading, setLoading] = useState(false);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const d = await fetchClaims();
      const rows = d?.pending?.length ? d.pending : d?.claims;
      const mapped = mapClaims(rows);
      if (mapped.length) { setClaims(mapped); setFb(s => ({ ...s, claims: false })); }
      else setFb(s => ({ ...s, claims: true }));
    } catch { setFb(s => ({ ...s, claims: true })); }
    setLoading(false);
  };
  const loadPenalty = async () => {
    setLoading(true);
    try {
      const d = await fetchPenaltyScan();
      const scan = d?.scans?.[0];
      if (scan) { setPenalty(scan); setFb(s => ({ ...s, penalty: false })); }
      else setFb(s => ({ ...s, penalty: true }));
    } catch { setFb(s => ({ ...s, penalty: true })); }
    setLoading(false);
  };
  useEffect(() => { loadClaims(); loadPenalty(); }, []);

  const approved = claims.filter(c => c.decision === "approve").length;
  const held = claims.filter(c => c.decision === "hold").length;

  // 위험 항목 — 등록한도/무거래는 실데이터 주입, 나머지는 시안 더미
  const usagePct = penalty ? Math.round((penalty.total / (penalty.limit || 1000)) * 1000) / 10 : 84.7;
  const limitCount = (penalty && penalty.total >= (penalty.limit || 1000) * 0.95) ? 1 : 0;
  const idleCount = penalty ? (penalty.danger ?? 3) : 3;
  const risks = [
    { key: "ship", icon: "truck", title: "발송 지연 위험", desc: "미발주 주문이 발송 기한을 넘기기 전 자동 발주확인", count: 2, action: "자동 발주확인", linked: "주문·발주 연동", tone: "red" },
    { key: "claim", icon: "refresh", title: "클레임 처리 지연", desc: "미처리 클레임 기한 카운트다운 → 기한 전 자동 승인", count: held, action: "자동 승인 예약", linked: "클레임 연동", tone: "red" },
    { key: "stock", icon: "box", title: "품절 미처리", desc: "재고 0인데 판매중인 상품 → 자동 품절 처리", count: 1, action: "자동 품절 처리", linked: "재고 연동", tone: "amber" },
    { key: "idle", icon: "flame", title: "무거래 상품", desc: "13개월 무판매 상품 → 삭제 권고", count: idleCount, action: "삭제 권고 보기", linked: null, tone: "amber" },
    { key: "limit", icon: "list", title: "등록 한도 임박", desc: `${penalty ? penalty.total : 847} / ${penalty ? (penalty.limit || 1000) : 1000}개 · ${usagePct}% 사용`, count: limitCount, action: "상품 정리", linked: null, tone: "green" },
  ];
  const weights = { ship: 30, claim: 25, stock: 15, idle: 15, limit: 0 };
  const score = risks.reduce((s, r) => s + (r.count > 0 ? weights[r.key] : 0), 0);
  const handled = risks.filter(r => r.count === 0).length;
  const pending = risks.filter(r => r.count > 0).length;
  const sCol = score >= 60 ? "var(--red)" : score >= 30 ? "var(--amber)" : "var(--green)";
  const sLabel = score >= 60 ? "위험" : score >= 30 ? "주의" : "안전";
  const idle = [["초특가 딸기잼 300g", "2025-03-12", 14], ["고급 꿀 선물세트(단종)", "2025-02-28", 15], ["수입 드라이망고 200g", "2025-04-01", 13]];
  const R = 62, C = 2 * Math.PI * R;

  // AI 분류 분포 (실데이터 집계)
  const catCount = {};
  claims.forEach(c => { catCount[c.cat] = (catCount[c.cat] || 0) + 1; });
  const dist = Object.entries(catCount).slice(0, 4).map(([name, n], i) => {
    const colors = ["var(--green)", "var(--amber)", "var(--blue)", "var(--violet)"];
    return [name, n, Math.round(n / claims.length * 100), colors[i % 4]];
  });

  return (
    <>
      <NvPageHead title="리스크 관리" sub="페널티로 이어질 수 있는 위험을 감지하고, 클레임을 AI가 분류해 기한 전에 자동 처리합니다."
        actions={<button className="nv-btn primary" onClick={tab === "claims" ? loadClaims : loadPenalty} disabled={loading}><NvIcon name="refresh" size={15} /> {tab === "claims" ? "클레임 폴링" : "위험 재스캔"}</button>} />

      <NvSeg style={{ marginBottom: 20 }} value={tab} onChange={setTab} tabs={[["claims", "클레임 자동처리"], ["penalty", "클린페널티"]]} />

      {tab === "claims" && (
        <>
          <NvStatRow cols={3}>
            <NvStat label="오늘 처리" value={claims.length} unit="건" icon="sparkles" tone="green" sub="AI 자동분류" subTone="up" />
            <NvStat label="자동 승인" value={approved} unit="건" icon="check" tone="blue" sub="신뢰도 80%↑" subTone="up" />
            <NvStat label="셀러 보류" value={held} unit="건" icon="bell" tone="amber" sub="수동 확인 필요" subTone="warn" />
          </NvStatRow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">자동처리 룰</h3><span className="nv-card-hint">현재 설정</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {[["단순변심 자동승인", "ON", "green"], ["단순변심 최대 금액", "50,000원", "mono"], ["상품하자 자동승인", "ON", "green"], ["AI 신뢰도 임계값", "0.80", "mono"], ["교환 클레임", "항상 보류", "amber"]].map(([l, v, t], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5 }}>
                    <span style={{ color: "var(--ink-2)" }}>{l}</span>
                    {t === "green" ? <span className="nv-pill green">{v}</span> : t === "amber" ? <span className="nv-pill amber">{v}</span> : <span className="mono" style={{ fontWeight: 700 }}>{v}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">AI 분류 분포</h3></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {dist.map(c => (
                  <div key={c[0]}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}><span style={{ fontWeight: 700 }}>{c[0]}</span><span className="mono" style={{ color: "var(--ink-2)" }}>{c[1]}건 ({c[2]}%)</span></div>
                    <div className="nv-prog"><i style={{ width: c[2] + "%", background: c[3] }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {claims.map(c => {
              const ap = c.decision === "approve";
              return (
                <div key={c.id} className="nv-card" style={{ display: "flex", gap: 0, padding: 0, overflow: "hidden" }}>
                  <div style={{ width: 5, background: ap ? "var(--green)" : "var(--amber)", flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "18px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 9 }}>
                      <span className={"nv-pill " + (c.type === "RETURN" ? "green" : c.type === "CANCEL" ? "gray" : "amber")}>{typeKo[c.type] || c.type}</span>
                      <span className="nv-pill gray">{c.cat}</span>
                      <span className="nv-pill blue mono">신뢰도 {(c.conf * 100).toFixed(0)}%</span>
                      <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 800 }} className="mono">{c.amount.toLocaleString()}원</span>
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>{c.product}</div>
                    <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 12, lineHeight: 1.5 }}>"{c.reason}"</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {ap ? <span className="nv-pill green"><NvIcon name="check" size={12} /> 자동 승인 완료</span> : <>
                        <button className="nv-btn primary sm"><NvIcon name="check" size={13} /> 승인</button>
                        <button className="nv-btn ghost sm"><NvIcon name="x" size={13} /> 거부</button>
                        <span className="nv-pill amber" style={{ marginLeft: 4 }}>셀러 판단 필요</span>
                      </>}
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-3)" }} className="mono">#{String(c.id).slice(-8)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "penalty" && (
        <>
          {fb.penalty && <div style={{ marginBottom: 16 }}><div className="nv-banner amber"><span className="bi"><NvIcon name="bell" size={17} /></span><span>페널티 스캔 데이터를 아직 받지 못해 일부 항목은 예시로 표시됩니다. 위험 재스캔을 눌러 주세요.</span></div></div>}
          <div className="nv-card" style={{ marginBottom: 16, padding: "26px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
              <div style={{ position: "relative", width: 148, height: 148, flexShrink: 0 }}>
                <svg viewBox="0 0 148 148" style={{ width: 148, height: 148, transform: "rotate(-90deg)" }}>
                  <circle cx="74" cy="74" r={R} fill="none" stroke="var(--line)" strokeWidth="12" />
                  <circle cx="74" cy="74" r={R} fill="none" stroke={sCol} strokeWidth="12" strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} strokeLinecap="round" />
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                  <div className="mono" style={{ fontSize: 36, fontWeight: 800, color: sCol, lineHeight: 1 }}>{score}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>위험도</div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 800 }}>현재 위험도 {score}점</span>
                  <span className={"nv-pill " + (score >= 30 ? "amber" : "green")}>{sLabel}</span>
                </div>
                <div style={{ fontSize: 14, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 16 }}>미처리 위험 <b style={{ color: sCol }}>{pending}건</b>이 페널티로 이어질 수 있어요. 아래 항목을 처리하면 <b style={{ color: "var(--green-ink)" }}>위험도 0점</b>이 됩니다.</div>
                <div style={{ display: "flex", gap: 28 }}>
                  {[[handled, "안전 항목", "var(--ink)"], [pending, "처리 필요", sCol], [12, "이번 달 자동 회피", "var(--green-ink)"]].map((x, i) => (
                    <div key={i} style={{ display: "flex", gap: 28 }}>
                      {i > 0 && <div style={{ width: 1, background: "var(--line)" }} />}
                      <div><div className="mono" style={{ fontSize: 24, fontWeight: 800, color: x[2] }}>{x[0]}</div><div style={{ fontSize: 12, color: "var(--ink-2)" }}>{x[1]}</div></div>
                    </div>
                  ))}
                </div>
              </div>
              <button className="nv-btn primary" style={{ alignSelf: "center" }}><NvIcon name="check" size={15} /> 위험 전체 자동 처리</button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {risks.map(r => {
              const clear = r.count === 0;
              const tone = clear ? "green" : r.tone;
              return (
                <div key={r.key} className="nv-card" style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 18, borderLeft: `4px solid var(--${tone === "red" ? "red" : tone === "amber" ? "amber" : "green"})` }}>
                  <div className={"nv-ic-tile " + (tone === "red" ? "red" : tone === "amber" ? "amber" : "green")}><NvIcon name={clear ? "check" : r.icon} size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700 }}>{r.title}</span>
                      {clear ? <span className="nv-pill green">안전</span> : <span className={"nv-pill " + (r.tone === "red" ? "red" : "amber")}>{r.count}건 감지</span>}
                      {r.linked && <span style={{ fontSize: 11, color: "var(--ink-3)" }}>· {r.linked}</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{r.desc}</div>
                  </div>
                  {clear ? <span style={{ fontSize: 12, color: "var(--ink-3)" }}>처리할 항목 없음</span> : <button className={"nv-btn sm " + (r.tone === "red" ? "primary" : "ghost")}>{r.action}</button>}
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t" style={{ color: "var(--amber-ink)", display: "flex", alignItems: "center", gap: 6 }}><NvIcon name="flame" size={16} /> 무거래 상품 상세</h3><span className="nv-card-hint" style={{ color: "var(--amber-ink)" }}>13개월+ · {idle.length}개</span></div>
              {idle.map((p, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "11px 0", borderBottom: i < idle.length - 1 ? "1px solid var(--line-2)" : "none" }}><span style={{ fontWeight: 600 }}>{p[0]}</span><span className="mono" style={{ color: "var(--amber-ink)", fontSize: 12 }}>{p[1]} · {p[2]}개월</span></div>))}
              <button className="nv-btn ghost" style={{ marginTop: 14, width: "100%", justifyContent: "center" }}><NvIcon name="x" size={13} /> 선택 상품 삭제 권고 보기</button>
            </div>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">이번 달 자동 회피 이력</h3><span className="nv-card-hint">페널티 방지 12건</span></div>
              {[["발송 기한 임박 주문 자동 발주확인", 6], ["클레임 기한 전 자동 승인", 3], ["재고 0 상품 자동 품절 처리", 2], ["무거래 상품 삭제 권고 반영", 1]].map((x, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, padding: "11px 0", borderBottom: i < 3 ? "1px solid var(--line-2)" : "none" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-2)" }}><span style={{ color: "var(--green-ink)" }}><NvIcon name="check" size={14} /></span> {x[0]}</span>
                  <span className="mono" style={{ fontWeight: 800, color: "var(--green-ink)" }}>{x[1]}건</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

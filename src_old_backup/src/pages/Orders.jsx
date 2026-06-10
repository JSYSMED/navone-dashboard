import { useEffect, useState } from "react";
import NvIcon from "../components/NvIcon";
import { NvPageHead, NvToggle, NvStat, NvStatRow } from "../components/atoms";
import { fetchOrders } from "../lib/api";

const FALLBACK_ORDERS = [
  { id: "PO2026052814523987", product: "샤인머스캣 1kg 특품", buyer: "김*영", qty: 2, amount: 49800, stage: 5, tracking: "6012345678901", at: "09:42", stock: 42 },
  { id: "PO2026052814198234", product: "유기농 사과 5kg 가정용", buyer: "이*수", qty: 1, amount: 38000, stage: 5, tracking: "6012345670582", at: "09:38", stock: 18 },
  { id: "PO2026052813847521", product: "방울토마토 2kg 대저", buyer: "박*진", qty: 3, amount: 35700, stage: 3, at: "09:21", stock: 11 },
  { id: "PO2026052812934168", product: "데일리 코튼 티셔츠", option: "블랙 / L", buyer: "최*서", qty: 1, amount: 19900, stage: 0, stock: 0, exception: "주문 옵션(블랙/L) 재고 0 — 자동 보류", at: "08:54" },
  { id: "PO2026052812388471", product: "친환경 바나나 1송이", buyer: "한*글", qty: 1, amount: 4500, stage: 0, stock: 2, exception: "재고 2개 (임계치 이하) — 자동 보류", at: "08:33" },
  { id: "PO2026052811782345", product: "제주 한라봉 3kg", buyer: "정*아", qty: 1, amount: 28900, stage: 5, tracking: "6012345661234", at: "08:12", stock: 27 },
];

function mapOrders(rows) {
  return (rows || []).map(o => ({
    id: o.productOrderId || o.id || "",
    product: o.productName || o.product || "—",
    buyer: o.buyerName || o.buyer || "—",
    qty: o.quantity ?? o.qty ?? 1,
    amount: +o.totalAmount || +o.amount || 0,
    stage: 0, // 발주 단계는 확장/별도 API에서 갱신 — 미발주 기본
    at: (o.orderDate || "").slice(11, 16) || "—",
    stock: o.stock ?? null,
  }));
}

export default function Orders() {
  const [autoOn, setAutoOn] = useState(true);
  const [carrier, setCarrier] = useState("CJGLS");
  const [custNo, setCustNo] = useState("40287156");
  const [threshold, setThreshold] = useState(3);
  const [track, setTrack] = useState(null);
  const [orders, setOrders] = useState(FALLBACK_ORDERS);
  const [fb, setFb] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await fetchOrders();
      const mapped = mapOrders(d?.orders || d);
      if (mapped.length) { setOrders(mapped); setFb(false); }
      else { setFb(true); }
    } catch { setFb(true); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const carriers = [["CJGLS", "CJ대한통운"], ["HANJIN", "한진택배"], ["LOTTE", "롯데택배"], ["EPOST", "우체국"], ["LOGEN", "로젠택배"]];
  const cName = Object.fromEntries(carriers);
  const STEPS = ["주문 접수", "발주 확인", "택배 예약", "송장 발급", "네이버 등록"];
  const stepIcons = ["box", "check", "truck", "tag", "check"];

  const trackSteps = {
    "6012345678901": { status: "배송중", steps: [["집화 완료", "05-28 18:20", "이천HUB", "done"], ["간선 상차", "05-28 21:05", "이천HUB", "done"], ["간선 하차", "05-29 04:30", "서울 강남", "done"], ["배송 출발", "05-29 08:15", "강남대리점 · 김배송 기사", "now"], ["배송 완료", "", "", ""]] },
    "6012345670582": { status: "배송완료", steps: [["집화 완료", "05-27 17:40", "이천HUB", "done"], ["간선 상차", "05-27 20:10", "이천HUB", "done"], ["간선 하차", "05-28 03:50", "인천", "done"], ["배송 출발", "05-28 09:00", "부평대리점", "done"], ["배송 완료", "05-28 14:22", "수령인 직접 수령", "done"]] },
    "6012345661234": { status: "집화완료", steps: [["집화 완료", "05-28 19:10", "이천HUB", "now"], ["간선 상차", "", "", ""], ["간선 하차", "", "", ""], ["배송 출발", "", "", ""], ["배송 완료", "", "", ""]] },
  };
  const autoDone = orders.filter(o => o.stage === 5).length;
  const inProg = orders.filter(o => o.stage > 0 && o.stage < 5).length;
  const exc = orders.filter(o => o.exception).length;

  return (
    <>
      <NvPageHead title="주문 · 발주 관리" sub="주문이 들어오면 발주확인부터 송장 등록까지 자동으로 처리해요. 사장님은 포장만 하세요."
        actions={<div style={{ display: "flex", alignItems: "center", gap: 10 }}><button className="nv-btn ghost sm" onClick={load} disabled={loading}><NvIcon name="refresh" size={13} /> 새로고침</button><span style={{ fontSize: 13.5, fontWeight: 700, color: autoOn ? "var(--green-ink)" : "var(--ink-3)" }}>전체 자동</span><NvToggle on={autoOn} onChange={setAutoOn} /></div>} />

      <div className="nv-card" style={{ marginBottom: 16 }}>
        <div className="nv-card-h">
          <h3 className="nv-card-t">자동화 흐름</h3>
          <span className={"nv-pill " + (autoOn ? "green" : "gray")}><span className="pdot" />{autoOn ? "AUTO ON" : "OFF"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "flex-start", flex: i < STEPS.length - 1 ? 1 : "0 0 auto" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 9, minWidth: 90, flex: "0 0 auto" }}>
                <div className={"nv-ic-tile " + (autoOn ? "green" : "gray")} style={{ width: 44, height: 44 }}><NvIcon name={stepIcons[i]} size={19} /></div>
                <div style={{ fontSize: 12.5, fontWeight: 700, textAlign: "center", color: autoOn ? "var(--ink)" : "var(--ink-3)" }}>{s}</div>
                {i === 2 && <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{cName[carrier]}</div>}
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 3, borderRadius: 2, marginTop: 20, background: autoOn ? "linear-gradient(90deg,var(--green),var(--green-soft))" : "var(--line)" }} />}
            </div>
          ))}
        </div>
      </div>

      <NvStatRow cols={3}>
        <NvStat label="자동 처리 완료" value={autoDone} unit="건" icon="check" tone="green" sub="송장 등록까지 완료" subTone="up" />
        <NvStat label="처리 중" value={inProg} unit="건" icon="truck" tone="blue" sub="택배 예약 단계" subTone="muted" />
        <NvStat label="재고 보류" value={exc} unit="건" icon="bell" tone="amber" sub="텔레그램 알림 전송됨" subTone="warn" />
      </NvStatRow>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="nv-card">
          <div className="nv-card-h"><h3 className="nv-card-t">배송사 연동</h3><span className="nv-card-hint">송장 자동 발급</span></div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 9 }}>택배사 선택</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {carriers.map(c => (<button key={c[0]} onClick={() => setCarrier(c[0])} className={"nv-btn sm " + (carrier === c[0] ? "primary" : "ghost")}>{c[1]}</button>))}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{cName[carrier]} 계약 고객번호</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input className="nv-input mono" value={custNo} onChange={e => setCustNo(e.target.value)} style={{ flex: 1 }} />
            <span className={"nv-pill " + (custNo ? "green" : "amber")}>{custNo ? <><NvIcon name="check" size={12} /> 연동됨</> : "미연동"}</span>
          </div>
          <div style={{ marginTop: 16, padding: "15px 17px", borderRadius: 14, background: "var(--line-2)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>택배 계약이 없으신가요?</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 11 }}>계약 없이도 시작할 수 있는 방법을 안내해 드려요.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className="nv-btn ghost sm">네이버 도착보장</button>
              <button className="nv-btn ghost sm">편의점·방문택배</button>
              <button className="nv-btn ghost sm">CJ 계약 도움받기</button>
            </div>
          </div>
        </div>

        <div className="nv-card">
          <div className="nv-card-h"><h3 className="nv-card-t">품절 임박 자동 OFF</h3><span className="nv-card-hint">네이버 재고 기준</span></div>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 14 }}>발주 직전 실시간 재고를 확인해 부족하면 자동 발주를 멈추고 알림을 보냅니다.</div>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "15px 17px", borderRadius: 14, background: "var(--green-soft)", marginBottom: 13 }}>
            <NvIcon name="box" size={17} />
            <div style={{ fontSize: 13.5, flex: 1, fontWeight: 600 }}>재고가
              <input className="nv-input mono" value={threshold} onChange={e => setThreshold(e.target.value.replace(/[^0-9]/g, ""))} style={{ width: 52, padding: "5px 8px", margin: "0 7px", textAlign: "center", display: "inline-block" }} />
              개 이하면 보류
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {[["단일 상품", "상품 재고로 판단"], ["옵션 상품", "주문 옵션 조합 재고로 판단"], ["수동 지정 상품", "직접 등록한 예외 상품"]].map(([t, d]) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "var(--line-2)" }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{t}</div><div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 1 }}>{d}</div></div>
                <span className="nv-pill green">자동 보류</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="nv-card">
        <div className="nv-card-h"><h3 className="nv-card-t">오늘 주문</h3><span className="nv-card-hint">{fb ? "예시 · " : ""}{orders.length}건</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {orders.map(o => {
            const done = o.stage === 5, ex = !!o.exception;
            return (
              <div key={o.id} style={{ padding: "15px 17px", borderRadius: 15, border: `1px solid ${ex ? "#F6DDB8" : "var(--line)"}`, background: ex ? "var(--amber-soft)" : "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9, flexWrap: "wrap" }}>
                  <span className={"nv-pill " + (ex ? "amber" : done ? "green" : "gray")}><span className="pdot" />{ex ? "예외 · 수동" : done ? "자동 완료" : "처리 중"}</span>
                  <span style={{ fontSize: 11.5, color: "var(--ink-3)" }} className="mono">#{String(o.id).slice(-8)}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-2)" }} className="mono">{o.at}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{o.product}{o.option && <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginLeft: 8, padding: "2px 9px", background: "var(--line-2)", borderRadius: 7 }}>{o.option}</span>}</div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3 }}>{o.buyer} · {o.qty}개 · {o.amount.toLocaleString()}원</div>
                  </div>
                  {done && o.tracking ? (
                    <div style={{ textAlign: "right", fontSize: 12 }}>
                      <div style={{ fontWeight: 700 }}>{cName[carrier]}</div>
                      <div className="mono" style={{ color: "var(--ink-2)", marginTop: 2 }}>{o.tracking}</div>
                      <button className="nv-btn ghost sm" style={{ marginTop: 7 }} onClick={() => setTrack(o)}><NvIcon name="truck" size={13} /> 배송 조회</button>
                    </div>
                  ) : o.stock != null ? (
                    <div style={{ textAlign: "right", fontSize: 12, whiteSpace: "nowrap" }}>
                      <div style={{ color: "var(--ink-3)" }}>{o.option ? "옵션 재고" : "재고"}</div>
                      <div className="mono" style={{ fontWeight: 800, fontSize: 16, marginTop: 2, color: o.stock <= threshold ? "var(--amber-ink)" : "var(--ink)" }}>{o.stock}개</div>
                    </div>
                  ) : null}
                </div>
                {ex && (
                  <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12.5, color: "var(--amber-ink)", fontWeight: 700, flex: 1 }}>{o.exception}</span>
                    <button className="nv-btn primary sm">수동 발주확인</button>
                    <button className="nv-btn ghost sm">예외 유지</button>
                  </div>
                )}
                {!done && !ex && o.stage > 0 && (
                  <div style={{ marginTop: 11 }}>
                    <div style={{ display: "flex", gap: 5 }}>{STEPS.map((s, i) => <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < o.stage ? "var(--green)" : "var(--line)" }} />)}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 7 }}>{STEPS[o.stage - 1]} 완료 · 다음: {STEPS[o.stage]}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {track && (() => {
        const t = trackSteps[track.tracking];
        if (!t) return null;
        return (
          <div onClick={() => setTrack(null)} style={{ position: "fixed", inset: 0, background: "rgba(20,24,22,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "86vh", overflow: "auto", boxShadow: "0 24px 70px rgba(0,0,0,.3)" }} className="nv">
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 800 }}>배송 조회</div><div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2 }}>{track.product} · {track.buyer}님</div></div>
                <button className="nv-btn ghost sm" onClick={() => setTrack(null)}><NvIcon name="x" size={15} /></button>
              </div>
              <div style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                  <span className={"nv-pill " + (t.status === "배송완료" ? "green" : "blue")}><span className="pdot" />{t.status}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{cName[carrier]}</span>
                  <span className="mono" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{track.tracking}</span>
                </div>
                <div style={{ position: "relative", paddingLeft: 6 }}>
                  {t.steps.map((s, i) => {
                    const filled = s[3] === "done" || s[3] === "now", now = s[3] === "now";
                    return (
                      <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i < t.steps.length - 1 ? 18 : 0, position: "relative" }}>
                        {i < t.steps.length - 1 && <div style={{ position: "absolute", left: 6, top: 16, bottom: 0, width: 2, background: filled ? "var(--green)" : "var(--line)" }} />}
                        <div style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, marginTop: 2, zIndex: 1, background: now ? "var(--blue)" : filled ? "var(--green)" : "#fff", border: filled ? "none" : "2px solid var(--line)", boxShadow: now ? "0 0 0 4px var(--blue-soft)" : "none" }} />
                        <div style={{ flex: 1, opacity: filled ? 1 : .4 }}>
                          <div style={{ fontSize: 13.5, fontWeight: now ? 800 : 600, color: now ? "var(--blue)" : "var(--ink)" }}>{s[0]}</div>
                          {s[1] && <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{s[1]} · {s[2]}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

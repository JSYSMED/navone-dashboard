import { useEffect, useState, useMemo } from "react";
import NvIcon from "./NvIcon";
import { NvEmpty } from "./atoms";
import { fetchSalesStatus } from "../lib/api";

const won = v => (Number(v) || 0).toLocaleString() + "원";

// KST 기준 ISO 범위 만들기
function rangeFor(preset) {
  const now = new Date();
  const kstOffset = 9 * 60; // 분
  const toKstMidnight = (d) => {
    // d(로컬)를 KST 자정으로
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    const kst = new Date(utc + kstOffset * 60000);
    kst.setHours(0, 0, 0, 0);
    // KST 자정의 ISO(+09:00)
    const y = kst.getFullYear(), m = String(kst.getMonth() + 1).padStart(2, "0"), day = String(kst.getDate()).padStart(2, "0");
    return { y, m, day };
  };
  const fmt = (y, m, day, h = "00:00:00.000") => `${y}-${m}-${day}T${h}+09:00`;
  if (preset === "today") {
    const { y, m, day } = toKstMidnight(now);
    return { from: fmt(y, m, day), to: fmt(y, m, day, "23:59:59.999") };
  }
  if (preset === "yesterday") {
    const yd = new Date(now); yd.setDate(yd.getDate() - 1);
    const { y, m, day } = toKstMidnight(yd);
    return { from: fmt(y, m, day), to: fmt(y, m, day, "23:59:59.999") };
  }
  // week: 최근 7일
  const wd = new Date(now); wd.setDate(wd.getDate() - 6);
  const a = toKstMidnight(wd), b = toKstMidnight(now);
  return { from: fmt(a.y, a.m, a.day), to: fmt(b.y, b.m, b.day, "23:59:59.999") };
}

// 주문상태 한글 라벨 + 색
const STATUS_LABEL = {
  PAYMENT_WAITING: ["결제대기", "gray"],
  PAYED: ["결제완료", "blue"],
  DELIVERING: ["배송중", "blue"],
  DELIVERED: ["배송완료", "green"],
  PURCHASE_DECIDED: ["구매확정", "green"],
  EXCHANGED: ["교환", "amber"],
  CANCELED: ["취소", "red"],
  RETURNED: ["반품", "red"],
  CANCELED_BY_NOPAYMENT: ["미결제취소", "gray"],
};
const labelOf = s => STATUS_LABEL[s]?.[0] || s || "—";
const toneOf = s => STATUS_LABEL[s]?.[1] || "gray";

const PRESETS = [["today", "오늘"], ["yesterday", "어제"], ["week", "최근 7일"]];

export default function SalesStatus() {
  const [preset, setPreset] = useState("today");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading|ok|empty|error
  const [msg, setMsg] = useState("");

  const load = async (p = preset) => {
    setStatus("loading"); setMsg("");
    try {
      const { from, to } = rangeFor(p);
      const d = await fetchSalesStatus({ from, to, rangeType: "PAYED_DATETIME" });
      const orders = d?.orders || [];
      if (orders.length) { setData(d); setStatus("ok"); }
      else { setData(d); setStatus("empty"); }
    } catch (e) {
      setStatus("error"); setMsg(e.message || "판매 현황을 불러오지 못했습니다.");
    }
  };
  useEffect(() => { load(preset); /* eslint-disable-next-line */ }, [preset]);

  const orders = data?.orders || [];
  const summary = data?.summary || {};
  // expectedSettlement가 실제로 채워져 오는지 — 하나라도 0보다 크면 컬럼 표시
  const hasSettlement = useMemo(
    () => orders.some(o => Number(o.expectedSettlement) > 0),
    [orders]
  );

  const statusCounts = summary.statusCounts || {};
  const stages = Object.entries(statusCounts).filter(([, n]) => n > 0);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, background: "var(--line-2)", padding: 4, borderRadius: 12 }}>
          {PRESETS.map(([k, lbl]) => (
            <button key={k} onClick={() => setPreset(k)}
              className={"nv-btn sm " + (preset === k ? "primary" : "ghost")}
              style={{ minWidth: 72 }}>{lbl}</button>
          ))}
        </div>
        <button className="nv-btn ghost sm" onClick={() => load()} disabled={status === "loading"}>
          <NvIcon name="refresh" size={13} /> 새로고침
        </button>
      </div>

      {status === "error" && (
        <NvEmpty icon="bell" title="판매 현황을 불러오지 못했어요" desc={msg || "잠시 후 다시 시도해 주세요."} tone="amber" />
      )}

      {status === "loading" && (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>불러오는 중…</div>
      )}

      {(status === "ok" || status === "empty") && (
        <>
          {/* 요약 바 */}
          <div style={{ display: "grid", gridTemplateColumns: hasSettlement ? "repeat(4,1fr)" : "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
            <SumCard label="판매 건수" value={(summary.orderCount ?? orders.length) + "건"} icon="box" tone="blue" />
            <SumCard label="판매액" value={won(summary.totalSales)} icon="coin" tone="green" />
            {hasSettlement && <SumCard label="정산예정액 (예상)" value={won(summary.totalSettlement)} icon="trend" tone="green" sub="네이버 수수료 차감 후" />}
            <SumCard label="수수료 합계" value={won(summary.totalCommission)} icon="shield" tone="amber" />
          </div>

          {/* 단계별 카운트 */}
          {stages.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {stages.map(([s, n]) => (
                <span key={s} className={"nv-pill " + toneOf(s)} style={{ fontSize: 12.5 }}>
                  <span className="pdot" />{labelOf(s)} {n}
                </span>
              ))}
            </div>
          )}

          {status === "empty" ? (
            <NvEmpty icon="box" title="이 기간에 판매된 주문이 없어요" desc="다른 기간을 선택하거나, 새 주문이 들어오면 여기에 표시됩니다." />
          ) : (
            <div className="nv-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ maxHeight: 560, overflow: "auto" }}>
                <table className="nv-tbl">
                  <thead><tr>
                    <th>상품</th>
                    <th style={{ width: 90, textAlign: "center" }}>상태</th>
                    <th style={{ width: 64, textAlign: "right" }}>수량</th>
                    <th style={{ width: 110, textAlign: "right" }}>판매액</th>
                    {hasSettlement && <th style={{ width: 130, textAlign: "right" }}>정산예정(예상)</th>}
                  </tr></thead>
                  <tbody>
                    {orders.map((o, i) => (
                      <tr key={o.productOrderId || i}>
                        <td style={{ fontWeight: 600 }}>
                          {o.productName}
                          {o.option && <span style={{ color: "var(--ink-3)", fontWeight: 400 }}> · {o.option}</span>}
                          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
                            {o.ordererName || ""}{o.inflowPath ? ` · ${o.inflowPath}` : ""}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className={"nv-pill " + toneOf(o.status)} style={{ fontSize: 11.5 }}>{labelOf(o.status)}</span>
                        </td>
                        <td className="mono" style={{ textAlign: "right" }}>{o.quantity}</td>
                        <td className="mono" style={{ textAlign: "right" }}>{won(o.salesAmount)}</td>
                        {hasSettlement && (
                          <td className="mono" style={{ textAlign: "right", color: "var(--green-ink)", fontWeight: 700 }}>
                            {Number(o.expectedSettlement) > 0 ? won(o.expectedSettlement) : "—"}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {hasSettlement && (
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>
              ※ 정산예정액은 네이버가 주문 시점에 계산한 <b>예상치</b>입니다. 쿠폰·반품·매출연동수수료 등에 따라 실제 정산 금액과 다를 수 있어요. 확정 정산은 정산 현황에서 확인하세요.
            </div>
          )}
        </>
      )}
    </>
  );
}

function SumCard({ label, value, icon, tone, sub }) {
  return (
    <div className="nv-card" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div className={"nv-ic-tile " + tone} style={{ width: 30, height: 30, borderRadius: 9 }}><NvIcon name={icon} size={15} /></div>
        <span style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

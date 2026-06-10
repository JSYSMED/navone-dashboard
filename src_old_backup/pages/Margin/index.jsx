import { useEffect, useState, useCallback } from "react";
import Icon from "../../components/Icon";
import StatCard from "../../components/StatCard";
import PageHeader from "../../components/PageHeader";
import { getLicenseKey } from "../../lib/api";
import { fetchMarginRank, won, pct } from "../Settlement/api";

function defaultRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86400000);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

// 마진율 → 뱃지 톤
function marginTone(r) {
  if (!r.hasCost) return "gray";
  if (r.isLoss) return "red";
  if (r.marginRate != null && r.marginRate < 15) return "orange";
  return "green";
}

export default function Margin() {
  const hasLicense = !!getLicenseKey();
  const def = defaultRange();

  const [start, setStart] = useState(def.start);
  const [end, setEnd] = useState(def.end);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(hasLicense);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!hasLicense) return;
    setLoading(true); setError("");
    try {
      setData(await fetchMarginRank(start, end));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [hasLicense, start, end]);

  useEffect(() => { load(); }, [load]);

  const ranking = data?.ranking || [];
  const lossItems = ranking.filter((r) => r.isLoss);
  const noCost = ranking.filter((r) => !r.hasCost).length;
  const avgMargin = (() => {
    const withMargin = ranking.filter((r) => r.marginRate != null);
    if (!withMargin.length) return null;
    return withMargin.reduce((s, r) => s + r.marginRate, 0) / withMargin.length;
  })();

  return (
    <>
      <PageHeader
        title="마진율 랭킹"
        sub="정산 데이터 기준 상품별 마진율을 계산해 순위와 적자 상품을 보여줍니다."
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input className="input mono" type="date" value={start} max={end}
              onChange={(e) => setStart(e.target.value)} style={{ width: 150 }} />
            <span style={{ color: "var(--ink-3)" }}>~</span>
            <input className="input mono" type="date" value={end} min={start}
              onChange={(e) => setEnd(e.target.value)} style={{ width: 150 }} />
            <button className="btn ghost" onClick={load} disabled={loading || !hasLicense}>
              <Icon name="refresh" size={14} /> 새로고침
            </button>
          </div>
        }
      />

      <div className="stat-grid">
        <StatCard label="분석 상품 수" value={data?.productCount ?? "-"} unit="개" icon="box" />
        <StatCard label="평균 마진율" value={avgMargin == null ? "-" : pct(avgMargin)} icon="trend" alt />
        <StatCard label="적자 상품" value={lossItems.length} unit="개"
          delta={lossItems.length ? "확인 필요" : "없음"} deltaTone={lossItems.length ? "down" : "up"} icon="flame" />
        <StatCard label="원가 미설정" value={noCost} unit="개" icon="list" />
      </div>

      {lossItems.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: "#F5C6C6", background: "var(--red-soft)" }}>
          <div className="card-title" style={{ color: "var(--red)" }}>
            <Icon name="flame" size={15} /> 적자 상품 경고 <span className="hint" style={{ color: "var(--red)" }}>{lossItems.length}개</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {lossItems.slice(0, 8).map((r) => (
              <div key={r.channelProductNo || r.productName} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ fontWeight: 500 }}>{r.productName}</span>
                <span className="mono" style={{ color: "var(--red)", fontWeight: 600 }}>
                  마진 {pct(r.marginRate)} · {won(r.profit)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">상품별 마진율 <span className="hint">{start} ~ {end} · 정산금 기준</span></div>
        {noCost > 0 && (
          <div className="field-hint" style={{ marginBottom: 10 }}>
            원가(min_sale_price) 미설정 상품 {noCost}개는 마진율 계산에서 제외되어 맨 아래에 표시됩니다. 확장 프로그램에서 원가를 설정하세요.
          </div>
        )}
        {!hasLicense ? (
          <div className="empty">설정에서 라이선스 키를 입력해주세요.</div>
        ) : loading ? (
          <div className="empty"><div className="spinner" />불러오는 중…</div>
        ) : error ? (
          <div className="empty state-error">{error}</div>
        ) : ranking.length === 0 ? (
          <div className="empty">정산 데이터가 없습니다. 정산 현황에서 먼저 동기화하세요.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: "center" }}>순위</th>
                <th>상품명</th>
                <th style={{ width: 70, textAlign: "right" }}>판매수</th>
                <th style={{ width: 110, textAlign: "right" }}>판매가</th>
                <th style={{ width: 110, textAlign: "right" }}>정산금</th>
                <th style={{ width: 110, textAlign: "right" }}>원가</th>
                <th style={{ width: 110, textAlign: "right" }}>손익</th>
                <th style={{ width: 100, textAlign: "center" }}>마진율</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r) => (
                <tr key={r.channelProductNo || r.productName}>
                  <td style={{ textAlign: "center", fontWeight: 700, color: "var(--ink-3)" }}>{r.hasCost ? r.rank : "-"}</td>
                  <td style={{ fontWeight: 500 }}>{r.productName}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--ink-2)" }}>{r.units}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{won(r.sales)}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{won(r.settlement)}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--ink-2)" }}>{r.hasCost ? won(r.totalCost) : "미설정"}</td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: 600, color: r.isLoss ? "var(--red)" : "var(--ink)" }}>
                    {r.profit == null ? "-" : won(r.profit)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={"badge " + marginTone(r)}>{r.marginRate == null ? "—" : pct(r.marginRate)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

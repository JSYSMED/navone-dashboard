import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import Icon from "../../components/Icon";
import StatCard from "../../components/StatCard";
import PageHeader from "../../components/PageHeader";
import { getLicenseKey } from "../../lib/api";
import { fetchDailySettlement, syncSettlement, won } from "./api";

// 기본 조회 범위: 최근 30일 (YYYY-MM-DD).
function defaultRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86400000);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

const sum = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

export default function Settlement() {
  const hasLicense = !!getLicenseKey();
  const def = defaultRange();

  const [start, setStart] = useState(def.start);
  const [end, setEnd] = useState(def.end);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(hasLicense);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!hasLicense) return;
    setLoading(true); setError("");
    try {
      const d = await fetchDailySettlement(start, end);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [hasLicense, start, end]);

  useEffect(() => { load(); }, [load]);

  const onSync = async () => {
    setSyncing(true); setError(""); setNotice("");
    try {
      const r = await syncSettlement(start, end);
      setNotice(`동기화 완료: ${r.upserted}건 저장${r.skipped ? `, ${r.skipped}건 건너뜀` : ""}`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSyncing(false);
    }
  };

  const daily = data?.daily || [];
  const rows = data?.rows || [];
  const chartData = daily.map((d) => ({
    date: (d.date || "").slice(5),    // MM-DD
    정산금: Math.round(d.settlement),
    판매가: Math.round(d.sales),
    차감액: Math.round(d.commission + d.ad + d.delivery + d.return),
  }));

  const totalSettlement = sum(daily, "settlement");
  const totalSales = sum(daily, "sales");
  const totalDeduct = sum(daily, "commission") + sum(daily, "ad") + sum(daily, "delivery") + sum(daily, "return");

  return (
    <>
      <PageHeader
        title="정산 현황"
        sub="네이버 커머스 일별 정산 내역을 조회하고 동기화합니다."
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input className="input mono" type="date" value={start} max={end}
              onChange={(e) => setStart(e.target.value)} style={{ width: 150 }} />
            <span style={{ color: "var(--ink-3)" }}>~</span>
            <input className="input mono" type="date" value={end} min={start}
              onChange={(e) => setEnd(e.target.value)} style={{ width: 150 }} />
            <button className="btn primary" onClick={onSync} disabled={syncing || !hasLicense}>
              <Icon name="refresh" size={14} /> {syncing ? "동기화 중…" : "동기화"}
            </button>
          </div>
        }
      />

      {notice && <div className="card flat" style={{ padding: 12, marginBottom: 12, color: "var(--green-ink)", background: "var(--green-soft)" }}>{notice}</div>}

      <div className="stat-grid">
        <StatCard label="정산금 합계" value={won(totalSettlement)} icon="trend" />
        <StatCard label="판매가 합계" value={won(totalSales)} icon="tag" alt />
        <StatCard label="차감액 (수수료·광고·배송·반품)" value={won(totalDeduct)} icon="box" />
        <StatCard label="정산 건수" value={rows.length} unit="건" icon="list" />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">일별 정산 추이 <span className="hint">{start} ~ {end}</span></div>
        {!hasLicense ? (
          <div className="empty">설정에서 라이선스 키를 입력해주세요.</div>
        ) : loading ? (
          <div className="empty"><div className="spinner" />불러오는 중…</div>
        ) : error ? (
          <div className="empty state-error">{error}</div>
        ) : chartData.length === 0 ? (
          <div className="empty">해당 기간 정산 내역이 없습니다.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ECEEF1" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#999" }} />
              <YAxis tick={{ fontSize: 11, fill: "#999" }} tickFormatter={(v) => `${Math.round(v / 10000)}만`} width={44} />
              <Tooltip formatter={(v) => won(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="판매가" fill="#E6F9EE" stroke="#03C75A" radius={[3, 3, 0, 0]} />
              <Bar dataKey="차감액" fill="#FDECEC" stroke="#E53935" radius={[3, 3, 0, 0]} />
              <Line dataKey="정산금" stroke="#2563EB" strokeWidth={2.2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <div className="card-title">일별 정산 내역 <span className="hint">{daily.length}일</span></div>
        {!hasLicense ? (
          <div className="empty">설정에서 라이선스 키를 입력해주세요.</div>
        ) : loading ? (
          <div className="empty"><div className="spinner" />불러오는 중…</div>
        ) : daily.length === 0 ? (
          <div className="empty">해당 기간 정산 내역이 없습니다.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 110 }}>정산일</th>
                <th style={{ textAlign: "right" }}>판매가</th>
                <th style={{ textAlign: "right" }}>수수료</th>
                <th style={{ textAlign: "right" }}>광고비</th>
                <th style={{ textAlign: "right" }}>배송비</th>
                <th style={{ textAlign: "right" }}>반품차감</th>
                <th style={{ textAlign: "right" }}>정산금</th>
                <th style={{ width: 70, textAlign: "center" }}>건수</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => (
                <tr key={d.date}>
                  <td className="mono" style={{ color: "var(--ink-2)" }}>{d.date}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{won(d.sales)}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--ink-2)" }}>{won(d.commission)}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--ink-2)" }}>{won(d.ad)}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--ink-2)" }}>{won(d.delivery)}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--ink-2)" }}>{won(d.return)}</td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: 700, color: "var(--green-ink)" }}>{won(d.settlement)}</td>
                  <td style={{ textAlign: "center", color: "var(--ink-2)" }}>{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

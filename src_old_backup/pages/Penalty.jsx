import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import { fetchPenaltyScan, pct } from "../lib/api";

// 서버 연결 실패 시 폴백 예시 데이터
const FALLBACK = {
  scans: [
    { storeName: "내 스토어", total: 433, danger: 305, warning: 21, limit: 10000, usagePercent: 4.3, notified: true },
  ],
  processed: 1,
  errors: [],
};

function riskTone(p) {
  if (p >= 80) return "red";
  if (p >= 50) return "orange";
  return "green";
}

export default function Penalty() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);

  const load = async () => {
    setLoading(true); setError(""); setFallback(false);
    try {
      setData(await fetchPenaltyScan());
    } catch (e) {
      setError(e.message);
      setData(FALLBACK);
      setFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const scans = data?.scans || [];
  const totalPenalty = scans.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const totalDanger = scans.reduce((s, r) => s + (Number(r.danger) || 0), 0);
  const totalWarning = scans.reduce((s, r) => s + (Number(r.warning) || 0), 0);
  const maxUsage = scans.reduce((m, r) => Math.max(m, Number(r.usagePercent) || 0), 0);

  return (
    <>
      <PageHeader
        title="페널티 스캔"
        sub="스토어 페널티 누적 현황을 점검하고 한도 초과 위험을 조기에 감지합니다."
        right={
          <button className="btn ghost" onClick={load} disabled={loading}>
            <Icon name="refresh" size={14} /> 새로고침
          </button>
        }
      />

      {fallback && (
        <div className="card flat" style={{ padding: 12, marginBottom: 12, color: "var(--orange)", background: "var(--orange-soft)" }}>
          서버에 연결하지 못해 예시 데이터를 표시합니다. {error && `(${error})`}
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="누적 페널티" value={loading ? "-" : totalPenalty} unit="점" icon="shield" />
        <StatCard label="위험 항목" value={loading ? "-" : totalDanger} unit="건"
          delta={totalDanger ? "확인 필요" : "없음"} deltaTone={totalDanger ? "down" : "up"} icon="alert" alt />
        <StatCard label="주의 항목" value={loading ? "-" : totalWarning} unit="건" icon="bell" />
        <StatCard label="최대 한도 사용률" value={loading ? "-" : pct(maxUsage)} icon="trend" />
      </div>

      <div className="card">
        <div className="card-title">스토어별 페널티 <span className="hint">{scans.length}개 스토어</span></div>
        {loading ? (
          <div className="empty"><div className="spinner" />불러오는 중…</div>
        ) : scans.length === 0 ? (
          <div className="empty">스캔된 페널티 내역이 없습니다.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {scans.map((r, i) => {
              const usage = Number(r.usagePercent) || 0;
              const tone = riskTone(usage);
              const barColor = tone === "red" ? "var(--red)" : tone === "orange" ? "var(--orange)" : "var(--green)";
              return (
                <div key={r.storeName || i} className="card flat" style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{r.storeName || "스토어"}</div>
                    <span className={"badge " + tone}>
                      한도 {Number(r.limit || 0).toLocaleString("ko-KR")}점 중 {pct(usage)} 사용
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 24, marginBottom: 12, flexWrap: "wrap" }}>
                    <div><span style={{ fontSize: 12, color: "var(--ink-2)" }}>누적 </span><b className="mono">{r.total ?? 0}</b></div>
                    <div><span style={{ fontSize: 12, color: "var(--ink-2)" }}>위험 </span><b className="mono" style={{ color: "var(--red)" }}>{r.danger ?? 0}</b></div>
                    <div><span style={{ fontSize: 12, color: "var(--ink-2)" }}>주의 </span><b className="mono" style={{ color: "var(--orange)" }}>{r.warning ?? 0}</b></div>
                    <div style={{ marginLeft: "auto" }}>
                      {r.notified
                        ? <span className="badge green"><Icon name="check" size={11} /> 알림 발송됨</span>
                        : <span className="badge gray">알림 없음</span>}
                    </div>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: "#F0F2F5", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, usage)}%`, height: "100%", background: barColor, borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {data?.errors?.length > 0 && (
          <div className="field-hint" style={{ marginTop: 12, color: "var(--red)" }}>
            스캔 오류 {data.errors.length}건이 발생했습니다.
          </div>
        )}
      </div>
    </>
  );
}

import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import Toggle from "../components/Toggle";
import PageHeader from "../components/PageHeader";
import { fetchHistory, fetchStats, getLicenseKey, getSettings, saveSettings, formatDateTime, formatPrice } from "../lib/api";

export default function Price() {
  const hasLicense = !!getLicenseKey();
  const s = getSettings();

  const [running, setRunning] = useState(true);
  const [undercut, setUndercut] = useState(s.undercut ?? 500);
  const [minMargin, setMinMargin] = useState(s.minMargin ?? 18);
  const [testMode, setTestMode] = useState(s.testMode ?? false);
  const [excludeList, setExcludeList] = useState(s.excludeList ?? []);
  const [newExclude, setNewExclude] = useState("");

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(hasLicense);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasLicense) return;
    let alive = true;
    (async () => {
      try {
        const [hist, st] = await Promise.all([
          fetchHistory("price", 50),
          fetchStats("today").catch(() => null),
        ]);
        if (!alive) return;
        setRows(hist.data || []);
        setStats(st);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [hasLicense]);

  const persist = (patch) => saveSettings(patch);
  const addExclude = () => {
    const v = newExclude.trim();
    if (!v) return;
    const next = [...excludeList, v];
    setExcludeList(next); persist({ excludeList: next }); setNewExclude("");
  };
  const removeExclude = (i) => {
    const next = excludeList.filter((_, j) => j !== i);
    setExcludeList(next); persist({ excludeList: next });
  };

  const lastRun = rows[0]?.created_at;

  return (
    <>
      <PageHeader
        title="가격 자동화"
        sub="경쟁사 최저가를 추적해 자동으로 가격을 조정합니다."
        right={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn danger"><Icon name="refresh" size={14} /> 가격 복구</button>
            <button className={"btn " + (running ? "ghost" : "primary")} onClick={() => setRunning(!running)}>
              <Icon name={running ? "pause" : "play"} size={14} /> {running ? "일시정지" : "실행"}
            </button>
          </div>
        }
      />

      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="act-ico price" style={{ width: 40, height: 40 }}><Icon name={running ? "play" : "pause"} size={18} /></div>
          <div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>실행 상태</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{running ? "실행 중" : "일시정지"}</div>
          </div>
        </div>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="act-ico talk" style={{ width: 40, height: 40 }}><Icon name="clock" size={18} /></div>
          <div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>마지막 변경</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{lastRun ? formatDateTime(lastRun) : "-"}</div>
          </div>
        </div>
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="act-ico review" style={{ width: 40, height: 40 }}><Icon name="list" size={18} /></div>
          <div>
            <div style={{ fontSize: 12, color: "var(--ink-2)" }}>오늘 변경</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>{stats?.priceChanges ?? "-"} 건</div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">자동화 설정</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="field">
              <label className="field-label">언더컷 금액</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input className="input mono" type="number" value={undercut}
                  onChange={(e) => { const v = parseInt(e.target.value || 0); setUndercut(v); persist({ undercut: v }); }}
                  style={{ maxWidth: 160 }} />
                <span style={{ fontSize: 13, color: "var(--ink-2)" }}>원 (경쟁 최저가보다 낮게)</span>
              </div>
            </div>
            <div className="field">
              <label className="field-label">최소 마진율</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input className="input mono" type="number" value={minMargin}
                  onChange={(e) => { const v = parseInt(e.target.value || 0); setMinMargin(v); persist({ minMargin: v }); }}
                  style={{ maxWidth: 160 }} />
                <span style={{ fontSize: 13, color: "var(--ink-2)" }}>% 이하면 변경 보류</span>
              </div>
            </div>
            <div className="field" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="field-label">테스트 모드</div>
                <div className="field-hint">실제 가격을 바꾸지 않고 변경 내역만 기록합니다.</div>
              </div>
              <Toggle on={testMode} onChange={(v) => { setTestMode(v); persist({ testMode: v }); }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">경쟁사 제외 목록 <span className="hint">{excludeList.length}곳</span></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, minHeight: 40 }}>
            {excludeList.length === 0 && <span className="field-hint">등록된 제외 판매처가 없습니다.</span>}
            {excludeList.map((str, i) => (
              <span key={i} className="chip">{str}<button onClick={() => removeExclude(i)}><Icon name="x" size={10} /></button></span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="제외할 판매처 이름 입력" value={newExclude}
              onChange={(e) => setNewExclude(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExclude()} />
            <button className="btn primary" onClick={addExclude}><Icon name="plus" size={14} /> 추가</button>
          </div>
          <div className="field-hint" style={{ marginTop: 10 }}>여기 등록된 판매처는 경쟁 최저가 계산에서 제외됩니다.</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">가격 변경 이력 <span className="hint">최근 50건</span></div>
        {!hasLicense ? (
          <div className="empty">설정에서 라이선스 키를 입력해주세요.</div>
        ) : loading ? (
          <div className="empty"><div className="spinner" />불러오는 중…</div>
        ) : error ? (
          <div className="empty state-error">{error}</div>
        ) : rows.length === 0 ? (
          <div className="empty">가격 변경 이력이 없습니다.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 150 }}>일시</th>
                <th>상품명</th>
                <th style={{ width: 110, textAlign: "right" }}>변경 전</th>
                <th style={{ width: 110, textAlign: "right" }}>변경 후</th>
                <th style={{ width: 110, textAlign: "right" }}>경쟁 최저가</th>
                <th style={{ width: 120, textAlign: "center" }}>유형</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const changed = Number(r.old_price) !== Number(r.new_price);
                return (
                  <tr key={i}>
                    <td className="mono" style={{ color: "var(--ink-2)" }}>{formatDateTime(r.created_at)}</td>
                    <td style={{ fontWeight: 500 }}>{r.product_name || r.channel_product_no || "-"}</td>
                    <td className={"mono " + (changed ? "strike" : "")} style={{ textAlign: "right" }}>{formatPrice(r.old_price)}</td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 600, color: changed ? "var(--green-ink)" : "var(--ink)" }}>{formatPrice(r.new_price)}</td>
                    <td className="mono" style={{ textAlign: "right", color: "var(--ink-2)" }}>{r.rank1_price != null ? formatPrice(r.rank1_price) : "-"}</td>
                    <td style={{ textAlign: "center" }}><span className="badge green">{r.action_type || "-"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

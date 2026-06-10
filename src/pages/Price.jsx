import { useEffect, useState } from "react";
import NvIcon from "../components/NvIcon";
import { NvPageHead, NvSeg, NvToggle, NvField, NvBanner, NvStat, NvStatRow } from "../components/atoms";
import { fetchHistory, fetchAutomationConfig, saveAutomationConfig } from "../lib/api";

const won = v => (Number(v) || 0).toLocaleString() + "원";

// 실행 주기 프리셋 (분)
const INTERVALS = [[30, "30분"], [60, "1시간"], [120, "2시간"], [360, "6시간"], [720, "12시간"], [1440, "24시간"]];

// 상대 시간 ("2분 전")
function relTime(iso) {
  if (!iso) return "실행 기록 없음";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return m + "분 전";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "시간 전";
  return Math.floor(h / 24) + "일 전";
}
function hhmm(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  const p = n => String(n).padStart(2, "0");
  return p(d.getHours()) + ":" + p(d.getMinutes());
}

// 서버 price_history 필드 → 화면. 서버는 old_price/new_price/rank1_price/action_type로 저장.
const FALLBACK_HISTORY = [];
function mapHistory(rows) {
  // v2.1 action_type: BEAT_RANK1(1위 추월=변경) / FLOOR_HOLD(하한 보류=스킵) /
  //   PRICE_TOO_LOW(저가 보류=스킵) / SAME_PRICE(동일=스킵) / API_ERROR(오류)
  const statusMap = {
    BEAT_RANK1: "변경", UPDATED: "변경",
    FLOOR_HOLD: "스킵", PRICE_TOO_LOW: "스킵", SAME_PRICE: "스킵", NO_COMPETITORS: "스킵",
    API_ERROR: "오류", ERROR: "오류",
    TEST_SKIP: "테스트",
  };
  return (rows || []).map(r => {
    const before = +r.old_price || +r.before_price || +r.before || 0;
    const after = +r.new_price || +r.after_price || +r.after || 0;
    const comp = +r.rank1_price || +r.competitor_price || +r.comp || 0;
    const status = statusMap[r.action_type] || (after === before ? "스킵" : "변경");
    return {
      date: (r.created_at || r.timestamp || "").slice(5, 16).replace("T", " ") || "—",
      name: r.product_name || r.name || "—",
      before, after, comp, status,
    };
  });
}

export default function Price() {
  const [tab, setTab] = useState("auto");

  // 서버 자동화 설정 (리모트컨트롤)
  const [cfg, setCfg] = useState({ enabled: false, intervalMinutes: 60, testMode: true, runNow: false, lastRunAt: null });
  const [cfgLoaded, setCfgLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // 로컬 전용 (서버 미반영): 경쟁사 제외 — 참고용
  const [excl, setExcl] = useState(["프리미엄과수원", "초록마트", "정직한농장"]);
  const [nw, setNw] = useState("");

  const [history, setHistory] = useState(FALLBACK_HISTORY);
  const [counts, setCounts] = useState({ change: 0, skip: 0, error: 0, test: 0 });

  // 자동모드 탭 (다른 자동화 — 데모 유지)
  const [master, setMaster] = useState(true);
  const [tasks, setTasks] = useState([
    { id: "review", label: "AI 리뷰 답글", interval: 30, enabled: true, lastRun: "16:55", status: "3개 답변", icon: "star" },
    { id: "claim", label: "클레임 자동처리", interval: 15, enabled: true, lastRun: "16:50", status: "2건 승인", icon: "refresh" },
    { id: "order", label: "발주확인 자동화", interval: 60, enabled: true, lastRun: "16:42", status: "4건 확인", icon: "box" },
    { id: "inquiry", label: "CS문의 AI답변", interval: 30, enabled: false, lastRun: "—", status: "대기 중", icon: "chat" },
    { id: "penalty", label: "페널티 스캔", interval: 1440, enabled: true, lastRun: "09:00", status: "305개 위험", icon: "flame" },
  ]);

  // 자동화 설정 로드
  useEffect(() => {
    fetchAutomationConfig().then(c => {
      if (c) setCfg(c);
    }).catch(() => {}).finally(() => setCfgLoaded(true));
  }, []);

  // 가격 이력 로드 (실제 API)
  useEffect(() => {
    fetchHistory("price", 30).then(d => {
      const m = mapHistory(d?.data);
      setHistory(m);
      const c = { change: 0, skip: 0, error: 0, test: 0 };
      m.forEach(r => {
        if (r.status === "변경") c.change++;
        else if (r.status === "스킵") c.skip++;
        else if (r.status === "오류") c.error++;
        else if (r.status === "테스트") c.test++;
      });
      setCounts(c);
    }).catch(() => {});
  }, []);

  // 설정 저장 (부분 patch) — 토글/주기 변경 즉시 서버 반영
  const save = async (patch) => {
    setCfg(prev => ({ ...prev, ...patch }));   // 낙관적 업데이트
    setSaving(true); setMsg("");
    try {
      const c = await saveAutomationConfig(patch);
      if (c) setCfg(c);
    } catch (e) {
      setMsg(e.message || "저장 실패");
    }
    setSaving(false);
  };

  // 지금 실행 — runNow 플래그. 확장이 다음 폴링(≤1분)에 감지해 실행.
  const runNow = async () => {
    setSaving(true); setMsg("");
    try {
      await saveAutomationConfig({ runNow: true });
      setMsg("실행 요청됨 — 켜져 있는 크롬 확장이 1분 내 시작합니다.");
    } catch (e) {
      setMsg(e.message || "요청 실패");
    }
    setSaving(false);
  };

  const add = () => { const v = nw.trim(); if (!v) return; setExcl([...excl, v]); setNw(""); };
  const sTone = s => s === "변경" ? "green" : s === "테스트" ? "blue" : s === "스킵" ? "amber" : "red";

  const enabled = cfg.enabled;

  return (
    <>
      <NvPageHead title="가격 관리" sub="경쟁사 최저가를 추적해 자동으로 가격을 조정하고, 자동 실행 주기를 관리합니다."
        actions={tab === "auto" && <>
          <button className="nv-btn ghost" onClick={runNow} disabled={saving || !enabled}>
            <NvIcon name="bolt" size={15} /> 지금 실행
          </button>
          <button className={"nv-btn " + (enabled ? "ghost" : "primary")} onClick={() => save({ enabled: !enabled })} disabled={saving || !cfgLoaded}>
            <NvIcon name={enabled ? "x" : "check"} size={15} /> {enabled ? "자동 끄기" : "자동 켜기"}
          </button>
        </>} />

      <NvSeg style={{ marginBottom: 20 }} value={tab} onChange={setTab} tabs={[["auto", "가격 자동화"], ["mode", "자동모드"]]} />

      {tab === "auto" && (
        <>
          {msg && <div style={{ marginBottom: 14 }}><NvBanner tone={msg.includes("실패") ? "red" : "green"} icon={msg.includes("실패") ? "flame" : "check"}>{msg}</NvBanner></div>}

          <NvStatRow cols={3}>
            <NvStat label="자동 실행" value={enabled ? "켜짐" : "꺼짐"} icon={enabled ? "bolt" : "clock"} tone={enabled ? "green" : "gray"}
              sub={enabled ? (cfg.testMode ? "테스트 모드" : "실전 모드") : "중지됨"} subTone={enabled ? "up" : "muted"} />
            <NvStat label="마지막 실행" value={relTime(cfg.lastRunAt)} icon="clock" tone="blue"
              sub={cfg.lastRunAt ? hhmm(cfg.lastRunAt) + " · " + (cfg.intervalMinutes < 60 ? cfg.intervalMinutes + "분" : (cfg.intervalMinutes / 60) + "시간") + " 주기" : "주기 " + (cfg.intervalMinutes < 60 ? cfg.intervalMinutes + "분" : (cfg.intervalMinutes / 60) + "시간")} subTone="muted" />
            <NvStat label="최근 이력" value={history.length} unit="건" icon="tag" tone="violet"
              sub={"변경 " + counts.change + " · 스킵 " + counts.skip + (counts.error ? " · 오류 " + counts.error : "") + (counts.test ? " · 테스트 " + counts.test : "")} subTone="muted" />
          </NvStatRow>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">자동 실행 설정</h3>{saving && <span className="nv-card-hint">저장 중…</span>}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 14, background: "var(--line-2)" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>자동 실행</div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>켜면 설정한 주기마다 가격을 자동 조정해요.</div>
                  </div>
                  <NvToggle on={enabled} onChange={v => save({ enabled: v })} />
                </div>

                <NvField label="실행 주기" hint="이 간격마다 전 상품을 점검해 가격을 조정합니다.">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {INTERVALS.map(([v, l]) => (
                      <button key={v} className={"nv-chip-btn" + (cfg.intervalMinutes === v ? " on" : "")} onClick={() => save({ intervalMinutes: v })}
                        style={{ padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "1px solid var(--line)", background: cfg.intervalMinutes === v ? "var(--green)" : "var(--bg)", color: cfg.intervalMinutes === v ? "#fff" : "var(--ink-2)" }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </NvField>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 14, background: "var(--line-2)" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>테스트 모드</div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>실제 가격은 바꾸지 않고 내역만 기록해요.</div>
                  </div>
                  <NvToggle on={cfg.testMode} onChange={v => save({ testMode: v })} />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <NvBanner tone="gray" icon="shield">자동 실행은 <b>켜져 있는 크롬 + 확장</b>에서 동작합니다. PC가 꺼져 있으면 멈춰요. 켜면 1분 내 반영됩니다.</NvBanner>
              </div>
            </div>

            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">경쟁사 제외 목록</h3><span className="nv-card-hint">{excl.length}곳</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14, minHeight: 40 }}>
                {excl.map((s, i) => (<span key={i} className="nv-chip">{s}<button onClick={() => setExcl(excl.filter((_, j) => j !== i))}><NvIcon name="x" size={10} /></button></span>))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="nv-input" placeholder="제외할 판매처 이름" value={nw} onChange={e => setNw(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
                <button className="nv-btn primary" onClick={add}><NvIcon name="plus" size={15} /> 추가</button>
              </div>
              <div style={{ marginTop: 14 }}><NvBanner tone="gray" icon="shield"><b>제외된 판매처</b>는 경쟁 최저가 계산에서 빠집니다. 비정상 저가 판매처를 걸러 안정적으로 가격을 조정해요.</NvBanner></div>
            </div>
          </div>

          <div className="nv-card">
            <div className="nv-card-h"><h3 className="nv-card-t">가격 변경 이력</h3><span className="nv-card-hint">최근 {history.length}건</span></div>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-3)", fontSize: 13.5 }}>
                아직 가격 변경 이력이 없습니다. 실전 모드로 한 번 실행되면 여기에 기록돼요.<br />
                <span style={{ fontSize: 12 }}>(테스트 모드 실행은 기기에만 기록되고 서버 이력엔 남지 않습니다.)</span>
              </div>
            ) : (
              <table className="nv-tbl">
                <thead><tr>
                  <th style={{ width: 130 }}>일시</th><th>상품명</th>
                  <th style={{ textAlign: "right" }}>변경 전</th><th style={{ textAlign: "right" }}>변경 후</th>
                  <th style={{ textAlign: "right" }}>경쟁 1위</th><th style={{ width: 80, textAlign: "center" }}>상태</th>
                </tr></thead>
                <tbody>{history.map((r, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ color: "var(--ink-3)" }}>{r.date}</td>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td className={"mono " + (r.status === "변경" ? "nv-strike" : "")} style={{ textAlign: "right" }}>{won(r.before)}</td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 700, color: r.status === "변경" ? "var(--green-ink)" : "var(--ink)" }}>{won(r.after)}</td>
                    <td className="mono" style={{ textAlign: "right", color: "var(--ink-2)" }}>{won(r.comp)}</td>
                    <td style={{ textAlign: "center" }}><span className={"nv-pill " + sTone(r.status)}>{r.status}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === "mode" && (
        <>
          <div className="nv-card" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, padding: "20px 24px" }}>
            <div className={"nv-ic-tile " + (master ? "green" : "gray")} style={{ width: 48, height: 48, borderRadius: 14 }}><NvIcon name="bolt" size={22} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>자동모드 {master ? "ON" : "OFF"}</div>
              <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>{master ? "모든 자동화가 설정된 주기로 실행되고 있어요." : "모든 자동화가 멈춰 있어요. 켜면 일제히 재개됩니다."}</div>
            </div>
            <NvToggle on={master} onChange={setMaster} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
            {tasks.map(t => {
              const on = t.enabled && master;
              return (
                <div key={t.id} className="nv-card" style={{ opacity: master ? 1 : .55, transition: "opacity .2s", padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <div className={"nv-ic-tile " + (on ? "green" : "gray")} style={{ width: 38, height: 38, borderRadius: 11 }}><NvIcon name={t.icon} size={18} /></div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{t.label}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-3)" }}>매 {t.interval < 60 ? t.interval + "분" : (t.interval / 60) + "시간"}</div>
                      </div>
                    </div>
                    <NvToggle on={on} onChange={() => setTasks(tasks.map(x => x.id === t.id ? { ...x, enabled: !x.enabled } : x))} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "var(--line-2)", borderRadius: 12, fontSize: 12.5 }}>
                    <div><span style={{ color: "var(--ink-3)" }}>마지막 실행</span><div style={{ fontWeight: 700, marginTop: 2 }} className="mono">{t.lastRun}</div></div>
                    <div style={{ textAlign: "right" }}><span style={{ color: "var(--ink-3)" }}>결과</span><div style={{ fontWeight: 700, marginTop: 2, color: on ? "var(--green-ink)" : "var(--ink-3)" }}>{t.status}</div></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14 }}>
            <NvBanner tone="amber" icon="sparkles">가격 자동화의 ON/OFF·주기는 위 <b>가격 자동화</b> 탭에서 관리합니다. 이 화면의 나머지 자동화는 곧 연결될 예정이에요.</NvBanner>
          </div>
        </>
      )}
    </>
  );
}

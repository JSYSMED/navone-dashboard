import { useEffect, useState } from "react";
import NvIcon from "../components/NvIcon";
import { NvPageHead, NvSeg, NvToggle, NvField, NvBanner, NvStat, NvStatRow } from "../components/atoms";
import { fetchHistory } from "../lib/api";

const won = v => (Number(v) || 0).toLocaleString() + "원";

const FALLBACK_HISTORY = [
  { date: "5/20 14:12", name: "샤인머스캣 1kg 특품", before: 24900, after: 23400, comp: 22900, status: "변경" },
  { date: "5/20 14:12", name: "유기농 사과 5kg 가정용", before: 38000, after: 38000, comp: 36500, status: "스킵" },
  { date: "5/20 14:11", name: "방울토마토 2kg 대저", before: 12400, after: 11900, comp: 11400, status: "변경" },
  { date: "5/20 14:11", name: "제주 한라봉 3kg", before: 28900, after: 27500, comp: 27000, status: "변경" },
  { date: "5/20 14:10", name: "성주 참외 2.5kg", before: 19800, after: 19800, comp: 18900, status: "오류" },
  { date: "5/20 14:10", name: "친환경 바나나 1송이", before: 4900, after: 4500, comp: 4000, status: "변경" },
  { date: "5/20 13:42", name: "거창 사과 3kg 부사", before: 22400, after: 21900, comp: 21400, status: "변경" },
  { date: "5/20 13:42", name: "유기농 블루베리 500g", before: 14900, after: 14900, comp: 13900, status: "스킵" },
];

function mapHistory(rows) {
  const statusMap = { AUTO_RANK1: "변경", DEFAULT_RANK1: "변경", DEFAULT_RANK2: "변경", FLOOR_HOLD: "스킵", SKIP: "스킵", ERROR: "오류" };
  return (rows || []).map(r => {
    const before = +r.before_price || +r.before || 0;
    const after = +r.after_price || +r.after || 0;
    let status = r.status || statusMap[r.action_type] || (after === before ? "스킵" : "변경");
    return {
      date: (r.created_at || "").slice(5, 16).replace("T", " ") || r.date || "—",
      name: r.product_name || r.name || "—",
      before, after,
      comp: +r.competitor_price || +r.comp || 0,
      status,
    };
  });
}

export default function Price() {
  const [tab, setTab] = useState("auto");
  const [running, setRunning] = useState(true);
  const [undercut, setUndercut] = useState(500);
  const [minMargin, setMinMargin] = useState(18);
  const [testMode, setTestMode] = useState(false);
  const [excl, setExcl] = useState(["프리미엄과수원", "초록마트", "정직한농장", "베스트프루트", "할인왕"]);
  const [nw, setNw] = useState("");
  const [master, setMaster] = useState(true);
  const [history, setHistory] = useState(FALLBACK_HISTORY);
  const [tasks, setTasks] = useState([
    { id: "price", label: "가격 자동화", interval: 60, enabled: true, lastRun: "16:42", status: "49개 조정", icon: "tag" },
    { id: "review", label: "AI 리뷰 답글", interval: 30, enabled: true, lastRun: "16:55", status: "3개 답변", icon: "star" },
    { id: "claim", label: "클레임 자동처리", interval: 15, enabled: true, lastRun: "16:50", status: "2건 승인", icon: "refresh" },
    { id: "order", label: "발주확인 자동화", interval: 60, enabled: true, lastRun: "16:42", status: "4건 확인", icon: "box" },
    { id: "inquiry", label: "CS문의 AI답변", interval: 30, enabled: false, lastRun: "—", status: "대기 중", icon: "chat" },
    { id: "penalty", label: "페널티 스캔", interval: 1440, enabled: true, lastRun: "09:00", status: "305개 위험", icon: "flame" },
    { id: "group", label: "그룹상품 스캔", interval: 1440, enabled: false, lastRun: "—", status: "대기 중", icon: "sparkles" },
  ]);

  useEffect(() => {
    fetchHistory("price", 8).then(d => {
      const m = mapHistory(d?.data);
      if (m.length) setHistory(m);
    }).catch(() => {});
  }, []);

  const add = () => { const v = nw.trim(); if (!v) return; setExcl([...excl, v]); setNw(""); };
  const sTone = s => s === "변경" ? "green" : s === "스킵" ? "amber" : "red";

  return (
    <>
      <NvPageHead title="가격 관리" sub="경쟁사 최저가를 추적해 자동으로 가격을 조정하고, 모든 자동화의 주기를 관리합니다."
        actions={tab === "auto" && <>
          <button className="nv-btn ghost"><NvIcon name="refresh" size={15} /> 가격 복구</button>
          <button className={"nv-btn " + (running ? "ghost" : "primary")} onClick={() => setRunning(!running)}>
            <NvIcon name={running ? "x" : "check"} size={15} /> {running ? "일시정지" : "실행"}
          </button>
        </>} />

      <NvSeg style={{ marginBottom: 20 }} value={tab} onChange={setTab} tabs={[["auto", "가격 자동화"], ["mode", "자동모드"]]} />

      {tab === "auto" && (
        <>
          <NvStatRow cols={3}>
            <NvStat label="실행 상태" value={running ? "실행 중" : "일시정지"} icon={running ? "bolt" : "clock"} tone={running ? "green" : "gray"} sub={running ? "정상 가동" : "중지됨"} subTone={running ? "up" : "muted"} />
            <NvStat label="마지막 실행" value="2분 전" icon="clock" tone="blue" sub="14:12 · 60분 주기" subTone="muted" />
            <NvStat label="오늘 처리" value="23" unit="건" icon="tag" tone="violet" sub="변경 18 · 스킵 4 · 오류 1" subTone="muted" />
          </NvStatRow>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">자동화 설정</h3></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <NvField label="언더컷 금액" hint="경쟁 최저가보다 이만큼 낮게 설정합니다.">
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input className="nv-input mono" type="number" value={undercut} onChange={e => setUndercut(+e.target.value || 0)} style={{ maxWidth: 160 }} />
                    <span style={{ fontSize: 13, color: "var(--ink-2)" }}>원 낮게</span>
                  </div>
                </NvField>
                <NvField label="최소 마진율" hint="이 마진율 미만이면 가격 변경을 보류합니다.">
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input className="nv-input mono" type="number" value={minMargin} onChange={e => setMinMargin(+e.target.value || 0)} style={{ maxWidth: 160 }} />
                    <span style={{ fontSize: 13, color: "var(--ink-2)" }}>% 이하 보류</span>
                  </div>
                </NvField>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderRadius: 14, background: "var(--line-2)" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>테스트 모드</div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>실제 가격은 바꾸지 않고 내역만 기록해요.</div>
                  </div>
                  <NvToggle on={testMode} onChange={setTestMode} />
                </div>
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
            <table className="nv-tbl">
              <thead><tr>
                <th style={{ width: 130 }}>일시</th><th>상품명</th>
                <th style={{ textAlign: "right" }}>변경 전</th><th style={{ textAlign: "right" }}>변경 후</th>
                <th style={{ textAlign: "right" }}>경쟁 최저가</th><th style={{ width: 80, textAlign: "center" }}>상태</th>
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
        </>
      )}
    </>
  );
}

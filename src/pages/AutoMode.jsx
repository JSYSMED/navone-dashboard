import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import Toggle from "../components/Toggle";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import { fetchStats, getSettings, saveSettings } from "../lib/api";

const MODULES = [
  { key: "auto_price", label: "가격 자동화", icon: "tag", desc: "경쟁 최저가를 추적해 가격을 자동 조정합니다." },
  { key: "auto_review", label: "리뷰 답글", icon: "star", desc: "신규 리뷰에 AI 답글을 자동 등록합니다." },
  { key: "auto_talk", label: "톡톡 AI 응답", icon: "chat", desc: "자주 묻는 문의에 즉시 자동 응답합니다." },
  { key: "auto_optimize", label: "상품명 최적화", icon: "sparkles", desc: "검색 트렌드를 반영해 상품명을 다듬습니다." },
  { key: "auto_claim", label: "클레임 자동처리", icon: "refresh", desc: "단순 취소/반품을 규칙에 따라 자동 처리합니다." },
  { key: "auto_qa", label: "Q&A 자동답글", icon: "help", desc: "상품 Q&A에 AI 답변 초안을 자동 등록합니다." },
];

export default function AutoMode() {
  const s = getSettings();
  const [master, setMaster] = useState(s.autoMaster ?? true);
  const [mods, setMods] = useState(() => {
    const init = {};
    MODULES.forEach((m) => { init[m.key] = s[m.key] ?? false; });
    return init;
  });

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const st = await fetchStats("today");
        if (alive) setStats(st);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const setMaster_ = (v) => { setMaster(v); saveSettings({ autoMaster: v }); };
  const setMod = (key, v) => {
    const next = { ...mods, [key]: v };
    setMods(next); saveSettings({ [key]: v });
  };

  const activeCount = Object.values(mods).filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="자동모드"
        sub="NavOne 자동화 모듈을 한 곳에서 켜고 끕니다."
        right={
          <div className={"ext-status" + (master ? "" : " off")}>
            <span className="dot" /> {master ? "자동모드 ON" : "자동모드 OFF"}
          </div>
        }
      />

      {error && (
        <div className="card flat" style={{ padding: 12, marginBottom: 12, color: "var(--orange)", background: "var(--orange-soft)" }}>
          오늘 처리 통계를 불러오지 못했습니다. ({error})
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="활성 모듈" value={activeCount} unit={`/ ${MODULES.length}`} icon="cpu" />
        <StatCard label="오늘 가격 변경" value={loading ? "-" : (stats?.priceChanges ?? 0)} unit="건" icon="tag" alt />
        <StatCard label="오늘 리뷰 답글" value={loading ? "-" : (stats?.reviewReplies ?? 0)} unit="건" icon="star" />
        <StatCard label="오늘 총 처리" value={loading ? "-" : (stats?.total ?? 0)} unit="건"
          delta="자동화 합계" deltaTone="up" icon="trend" />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">전체 자동모드</div>
        <div className="field" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="field-label">마스터 스위치</div>
            <div className="field-hint">끄면 아래 모든 모듈이 일시 정지됩니다.</div>
          </div>
          <Toggle on={master} onChange={setMaster_} />
        </div>
      </div>

      <div className="card">
        <div className="card-title">모듈별 자동화 <span className="hint">{activeCount}개 실행 중</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {MODULES.map((m) => {
            const on = master && mods[m.key];
            return (
              <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "#F7F8FA", borderRadius: 12, opacity: master ? 1 : 0.55 }}>
                <div className={"act-ico " + (m.icon === "tag" ? "price" : m.icon === "chat" ? "talk" : "review")} style={{ width: 38, height: 38 }}>
                  <Icon name={m.icon} size={17} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    {m.label}
                    <span className={"badge " + (on ? "green" : "gray")}>{on ? "실행 중" : "정지"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{m.desc}</div>
                </div>
                <Toggle on={mods[m.key]} onChange={(v) => setMod(m.key, v)} />
              </div>
            );
          })}
        </div>
        <div className="field-hint" style={{ marginTop: 12 }}>설정은 브라우저(localStorage)에 저장됩니다.</div>
      </div>
    </>
  );
}

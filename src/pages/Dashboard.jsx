import { useEffect, useState } from "react";
import NvIcon from "../components/NvIcon";
import { NvExtStatus } from "../components/atoms";
import { fetchStats, getLicenseKey } from "../lib/api";

export default function Dashboard({ onNav = () => {} }) {
  const hasLicense = !!getLicenseKey();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!hasLicense) return;
    let alive = true;
    fetchStats("today").then(s => { if (alive) setStats(s); }).catch(() => {});
    return () => { alive = false; };
  }, [hasLicense]);

  // 실데이터 우선, 없으면 시안 기본값 (graceful)
  const done = [
    { label: "가격 변경", value: stats?.priceChanges ?? "—", icon: "tag" },
    { label: "리뷰 답글", value: stats?.reviewReplies ?? "—", icon: "star" },
    { label: "클레임 처리", value: stats?.claims ?? "—", icon: "refresh" },
    { label: "발주 확인", value: stats?.orders ?? "—", icon: "box" },
  ];
  const totalToday = stats?.total ?? "—";

  // 할 일 / 예약작업 / 누적 절약시간 — 서버 집계 API 도입 전까지 시안 더미 유지
  const tasks = [
    { urg: "긴급", tone: "red", icon: "shield", title: "클린페널티 위험 3건을 확인해 주세요", meta: "무거래 위험 · 등록 한도 84.7% 사용", cta: "지금 확인", primary: true, go: "risk" },
    { urg: "오늘", tone: "amber", icon: "star", title: "낮은 평점 리뷰 2건, AI 답글을 검토해 주세요", meta: "별 3점 이하 · 답글 초안 준비됨", cta: "검토하기", go: "reviews" },
    { urg: "오늘", tone: "blue", icon: "box", title: "발주 확인 대기 3건이 있어요", meta: "신규 주문 · 송장 등록 전", cta: "발주 확인", go: "orders" },
    { urg: "검토", tone: "green", icon: "tag", title: "유기농 사과 5kg 가격 변경이 보류됐어요", meta: "최소 마진율 미만 · 사장님 판단 필요", cta: "가격 보기", go: "price" },
  ];
  const schedule = [
    { at: "14:20", inMin: "20분 후", label: "가격 자동화", desc: "카탈로그 최저가 확인 → 가격 조정", icon: "tag", tone: "green", next: true },
    { at: "14:50", inMin: "50분 후", label: "리뷰 답글 등록", desc: "AI 답글 12건 순차 등록", icon: "star", tone: "amber" },
    { at: "15:00", inMin: "1시간 후", label: "발주 자동확인", desc: "신규 주문 발주확인 + 송장", icon: "box", tone: "blue" },
    { at: "15:30", inMin: "1시간 30분 후", label: "클레임 처리", desc: "미처리 클레임 자동 승인", icon: "refresh", tone: "violet" },
  ];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 20, flexWrap: "wrap" }}>
        <div>
          <div className="nv-greet-time">{greetTime()}</div>
          <h1 className="nv-greet-h">오늘도 고생 많으세요 사장님</h1>
        </div>
        <NvExtStatus connected={hasLicense} />
      </div>

      {/* 오늘의 브리핑 밴드 */}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 22, padding: "24px 28px", marginBottom: 30, background: "linear-gradient(120deg, #03C75A 0%, #04A94E 100%)", boxShadow: "0 12px 30px rgba(3,160,76,.26)" }}>
        <div style={{ position: "absolute", right: -30, top: -50, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.10)" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.85)" }}>오늘 CommerOne이 처리한 일</div>
            <div className="mono" style={{ fontSize: 54, fontWeight: 800, letterSpacing: "-0.05em", color: "#fff", lineHeight: .92, marginTop: 6 }}>{totalToday}<span style={{ fontSize: 22, marginLeft: 3 }}>건</span></div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "5px 11px", borderRadius: 999, background: "rgba(255,255,255,.18)" }}>
              <NvIcon name="bolt" size={14} /><span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>반복 작업은 CommerOne이 처리했어요</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, background: "rgba(255,255,255,.13)", borderRadius: 16, padding: "4px" }}>
            {done.map((d, i) => (
              <div key={i} style={{ padding: "14px 16px", borderLeft: i ? "1px solid rgba(255,255,255,.18)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: "rgba(255,255,255,.9)" }}><NvIcon name={d.icon} size={15} /><span style={{ fontSize: 12.5, fontWeight: 600 }}>{d.label}</span></div>
                <div className="mono" style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginTop: 6, lineHeight: 1 }}>{d.value}<span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.7)", marginLeft: 2 }}>건</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 30, alignItems: "start" }}>
        <div className="nv-card" style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "-0.03em", display: "flex", alignItems: "center", gap: 8 }}>오늘 할 일 <span className="nv-pill red"><span className="pdot" />{tasks.length}</span></h2>
            <span className="nv-card-hint">사장님 확인이 필요해요 · 긴급한 순서</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
            {tasks.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 17px", borderRadius: 16, background: t.primary ? "var(--red-soft)" : "var(--line-2)", border: `1px solid ${t.primary ? "#F7D4CF" : "var(--line)"}` }}>
                <div className={"nv-ic-tile " + t.tone}><NvIcon name={t.icon} size={20} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: 4 }}><span className={"nv-pill " + t.tone} style={{ padding: "2px 9px", fontSize: 11 }}>{t.urg}</span></div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-0.01em" }}>{t.title}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2 }}>{t.meta}</div>
                </div>
                <button className={"nv-btn " + (t.primary ? "primary" : "ghost") + " sm"} style={{ flexShrink: 0 }} onClick={() => onNav(t.go)}>{t.cta}</button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, padding: "12px", borderRadius: 14, background: "var(--green-tint)", fontSize: 13, fontWeight: 600, color: "var(--green-ink)" }}>
            <NvIcon name="check" size={16} /> 나머지는 CommerOne이 자동으로 끝냈어요
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="nv-card" style={{ padding: "20px 22px" }}>
            <div className="nv-card-h" style={{ marginBottom: 16 }}>
              <h3 className="nv-card-t" style={{ fontSize: 15 }}>다음 예정 작업</h3>
              <span className="nv-pill green"><span className="pdot" />20분 후</span>
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 17, top: 8, bottom: 8, width: 2, background: "var(--line)" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {schedule.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 13, position: "relative" }}>
                    <div className={"nv-ic-tile " + s.tone} style={{ width: 36, height: 36, borderRadius: 11, zIndex: 1, boxShadow: s.next ? "0 0 0 4px var(--green-soft)" : "0 0 0 4px #fff" }}><NvIcon name={s.icon} size={16} /></div>
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span className="mono" style={{ fontSize: 14, fontWeight: 800 }}>{s.at}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: s.next ? "var(--green-ink)" : "var(--ink-3)" }}>{s.inMin}</span>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 1 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderRadius: 20, padding: "20px 22px", background: "var(--ink)", color: "#fff", boxShadow: "var(--sh-2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#8EE9B4" }}><NvIcon name="bolt" size={16} /> 이번 달 아낀 시간</div>
            <div className="mono" style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em", marginTop: 8, lineHeight: 1 }}>72<span style={{ fontSize: 16, color: "rgba(255,255,255,.6)", marginLeft: 2 }}>시간</span> 18<span style={{ fontSize: 16, color: "rgba(255,255,255,.6)", marginLeft: 2 }}>분</span></div>
            <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 34, marginTop: 14 }}>
              {[12, 18, 22, 28, 35, 42, 48, 54, 58, 63, 68, 72].map((v, i) => (<div key={i} style={{ flex: 1, height: `${(v / 72) * 100}%`, borderRadius: 3, background: i === 11 ? "var(--green)" : "rgba(255,255,255,.22)" }} />))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function greetTime() {
  const d = new Date();
  const h = d.getHours();
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 || 12;
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${ampm} ${h12}:${String(d.getMinutes()).padStart(2, "0")} · ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

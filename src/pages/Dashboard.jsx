import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import Sparkline from "../components/Sparkline";
import { fetchStats, fetchWeeklyTrend, fetchHistory, getLicenseKey, formatPrice } from "../lib/api";

function relTime(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

const SummaryRow = ({ icon, label, status, tone, sub }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <div className={"act-ico " + (icon === "tag" ? "price" : icon === "chat" ? "talk" : "review")}>
      <Icon name={icon} size={15} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{sub}</div>
    </div>
    <span className={"badge " + tone}>{status}</span>
  </div>
);

export default function Dashboard() {
  const hasLicense = !!getLicenseKey();
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(hasLicense);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasLicense) return;
    let alive = true;
    (async () => {
      try {
        const [s, t, price, review] = await Promise.all([
          fetchStats("today"),
          fetchWeeklyTrend(),
          fetchHistory("price", 6).catch(() => ({ data: [] })),
          fetchHistory("review", 6).catch(() => ({ data: [] })),
        ]);
        if (!alive) return;
        setStats(s);
        setTrend(t);

        const acts = [];
        (price.data || []).forEach((r) =>
          acts.push({
            t: "price", time: r.created_at,
            title: `${r.product_name || r.channel_product_no} 가격 변경`,
            sub: `${formatPrice(r.old_price)} → ${formatPrice(r.new_price)}`,
          })
        );
        (review.data || []).forEach((r) =>
          acts.push({
            t: "review", time: r.created_at,
            title: `AI 답글 등록 · 별 ${r.rating || 0}점`,
            sub: `"${(r.original_review || "").slice(0, 24)}…"`,
          })
        );
        acts.sort((a, b) => new Date(b.time) - new Date(a.time));
        setActivity(acts.slice(0, 8));
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [hasLicense]);

  // ----- 차트 좌표 계산 -----
  const W = 640, H = 220, padL = 32, padB = 28, padT = 12, padR = 16;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const xStep = trend.length > 1 ? innerW / (trend.length - 1) : innerW;
  const peak = Math.max(5, ...trend.flatMap((d) => [d.price, d.review, d.cs]));
  const maxY = Math.ceil(peak / 4) * 4 || 4;
  const yFor = (v) => padT + innerH - (v / maxY) * innerH;
  const xFor = (i) => padL + i * xStep;
  const line = (key) => trend.map((p, i) => `${xFor(i)},${yFor(p[key])}`).join(" ");
  const gridVals = [0, maxY / 4, maxY / 2, (maxY * 3) / 4, maxY];

  return (
    <>
      <PageHeader
        title="대시보드"
        sub="오늘 NavOne이 처리한 운영 업무를 한눈에 확인하세요."
        right={
          <div className={"ext-status" + (hasLicense && !error ? "" : " off")}>
            <span className="dot" /> {hasLicense ? (error ? "연결 오류" : "서버 · 연결됨") : "라이선스 미설정"}
          </div>
        }
      />

      <div className="stat-grid">
        <StatCard label="오늘 가격 변경" value={stats?.priceChanges ?? "-"} unit="건" icon="tag" />
        <StatCard label="리뷰 답글 작성" value={stats?.reviewReplies ?? "-"} unit="건" icon="star" alt />
        <StatCard label="톡톡 자동 응답" value={stats?.csReplies ?? "-"} unit="건" icon="chat" />
        <StatCard label="오늘 총 처리" value={stats?.total ?? "-"} unit="건" delta="자동화 합계" deltaTone="up" icon="trend" />
      </div>

      <div className="grid-7-3">
        <div className="card">
          <div className="card-title">자동화 추이 <span className="hint">최근 7일</span></div>
          {!hasLicense ? (
            <div className="empty">설정에서 라이선스 키를 입력하면 추이가 표시됩니다.</div>
          ) : loading ? (
            <div className="empty"><div className="spinner" />불러오는 중…</div>
          ) : (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, height: "auto" }}>
                {gridVals.map((v) => (
                  <g key={v}>
                    <line x1={padL} y1={yFor(v)} x2={W - padR} y2={yFor(v)} stroke="#ECEEF1" strokeWidth="1" />
                    <text x={padL - 8} y={yFor(v) + 4} fontSize="10" fill="#999" textAnchor="end">{Math.round(v)}</text>
                  </g>
                ))}
                {trend.map((p, i) => (
                  <text key={p.label} x={xFor(i)} y={H - 8} fontSize="10" fill="#999" textAnchor="middle">{p.label}</text>
                ))}
                <polyline points={line("price")} fill="none" stroke="#03C75A" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
                <polyline points={line("review")} fill="none" stroke="#FF6F00" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <polyline points={line("cs")} fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
                {trend.map((p, i) => (
                  <g key={"d" + i}>
                    <circle cx={xFor(i)} cy={yFor(p.price)} r="3.5" fill="white" stroke="#03C75A" strokeWidth="2" />
                    <circle cx={xFor(i)} cy={yFor(p.review)} r="2.8" fill="white" stroke="#FF6F00" strokeWidth="1.8" />
                  </g>
                ))}
              </svg>
              <div style={{ display: "flex", gap: 18, fontSize: 12, color: "var(--ink-2)", marginTop: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "#03C75A", borderRadius: 2 }} />가격변경</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "#FF6F00", borderRadius: 2 }} />리뷰답글</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: "#2563EB", borderRadius: 2 }} />톡톡응답</span>
              </div>
            </>
          )}
        </div>

        <div className="col">
          <div className="card">
            <div className="card-title">자동화 요약</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SummaryRow icon="tag" label="가격 자동화" status="실행 중" tone="green" sub="크롬 확장 연동" />
              <SummaryRow icon="star" label="리뷰 답글" status={stats?.reviewReplies ? "처리됨" : "대기"} tone={stats?.reviewReplies ? "green" : "gray"} sub={`오늘 ${stats?.reviewReplies ?? 0}건`} />
              <SummaryRow icon="chat" label="톡톡 AI" status="준비 중" tone="orange" sub="API 연동 예정" />
              <SummaryRow icon="sparkles" label="상품명 최적화" status="준비 중" tone="orange" sub="API 연동 예정" />
            </div>
          </div>
          <div className="card flat" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 6 }}>최근 7일 자동화 건수</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }} className="mono">
              {trend.reduce((s, d) => s + d.price + d.review + d.cs, 0)}
              <span style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500, marginLeft: 4 }}>건</span>
            </div>
            <Sparkline data={trend.map((d) => d.price + d.review + d.cs)} width={220} height={36} />
          </div>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div className="card">
        <div className="card-title">최근 활동 <span className="hint">최신순</span></div>
        <div className="scroll-y">
          {!hasLicense ? (
            <div className="empty">라이선스를 입력하면 활동 내역이 표시됩니다.</div>
          ) : loading ? (
            <div className="empty">불러오는 중…</div>
          ) : activity.length === 0 ? (
            <div className="empty">아직 기록된 활동이 없습니다.</div>
          ) : (
            activity.map((a, i) => (
              <div className="act" key={i}>
                <div className={"act-ico " + (a.t === "price" ? "price" : "review")}>
                  <Icon name={a.t === "price" ? "tag" : "star"} size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="act-title">{a.title}</div>
                  <div className="act-sub">{a.sub}</div>
                </div>
                <div className="act-time">{relTime(a.time)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

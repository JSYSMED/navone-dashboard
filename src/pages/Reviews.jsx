import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import Stars from "../components/Stars";
import PageHeader from "../components/PageHeader";
import { fetchHistory, fetchStats, getLicenseKey, getSettings, saveSettings, formatDateTime } from "../lib/api";

const TONES = ["친근", "정중", "간결"];

export default function Reviews() {
  const hasLicense = !!getLicenseKey();
  const s = getSettings();

  const [tone, setTone] = useState(s.reviewTone || "친근");
  const [customPrompt, setCustomPrompt] = useState(s.reviewCustomPrompt || "");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(null);
  const [loading, setLoading] = useState(hasLicense);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasLicense) return;
    let alive = true;
    (async () => {
      try {
        const [hist, st] = await Promise.all([
          fetchHistory("review", 50),
          fetchStats("today").catch(() => null),
        ]);
        if (!alive) return;
        setRows(hist.data || []);
        setTotal(hist.total || 0);
        setTodayCount(st?.reviewReplies ?? null);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [hasLicense]);

  const avgRating = rows.length
    ? (rows.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / rows.length).toFixed(1)
    : "-";

  return (
    <>
      <PageHeader title="리뷰 답글" sub="AI가 작성해 등록한 답글 내역을 확인합니다." />

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat">
          <div className="label">오늘 답글 작성</div>
          <div className="val mono">{todayCount ?? "-"}<span className="unit">건</span></div>
          <div className="delta up">오늘</div>
          <div className="icon-pill"><Icon name="check" size={18} /></div>
        </div>
        <div className="stat alt">
          <div className="label">전체 답글</div>
          <div className="val mono">{total}<span className="unit">건</span></div>
          <div className="delta warn">누적</div>
          <div className="icon-pill"><Icon name="bell" size={18} /></div>
        </div>
        <div className="stat">
          <div className="label">평균 별점</div>
          <div className="val mono">{avgRating}<span className="unit">/ 5.0</span></div>
          <div className="delta up">최근 {rows.length}건</div>
          <div className="icon-pill"><Icon name="star" size={18} /></div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">AI 답글 톤</div>
          <div className="seg">
            {TONES.map((t) => (
              <button key={t} className={tone === t ? "active" : ""}
                onClick={() => { setTone(t); saveSettings({ reviewTone: t }); }}>{t}</button>
            ))}
          </div>
          <div className="field-hint" style={{ marginTop: 10 }}>
            {tone === "친근" && "고객을 가까운 친구처럼 대하는 따뜻한 어투를 사용합니다."}
            {tone === "정중" && "정중하고 격식 있는 표현으로 신뢰감을 줍니다."}
            {tone === "간결" && "꼭 필요한 말만 짧고 깔끔하게 전달합니다."}
          </div>
        </div>
        <div className="card">
          <div className="card-title">커스텀 프롬프트</div>
          <textarea className="input" rows="3" value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onBlur={() => saveSettings({ reviewCustomPrompt: customPrompt })}
            placeholder="우리 스토어는 ___를 파는 곳입니다." />
          <div className="field-hint" style={{ marginTop: 6 }}>AI가 답글을 생성할 때 참고하는 스토어 컨텍스트입니다.</div>
        </div>
      </div>

      {!hasLicense ? (
        <div className="card empty">설정에서 라이선스 키를 입력해주세요.</div>
      ) : loading ? (
        <div className="card empty"><div className="spinner" />불러오는 중…</div>
      ) : error ? (
        <div className="card empty state-error">{error}</div>
      ) : rows.length === 0 ? (
        <div className="card empty">리뷰 답글 이력이 없습니다.</div>
      ) : (
        <div className="col">
          {rows.map((r, idx) => {
            const rating = Number(r.rating) || 0;
            const bar = rating >= 5 ? "s5" : rating >= 3 ? "s34" : "s12";
            return (
              <div key={idx} className="card" style={{ display: "flex", gap: 16, padding: 0, overflow: "hidden" }}>
                <div className={"review-bar " + bar} />
                <div style={{ flex: 1, padding: "20px 22px 20px 6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <Stars value={rating} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.product_name || "-"}</span>
                    <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: "auto" }}>{formatDateTime(r.created_at)}</span>
                  </div>
                  <p style={{ margin: "10px 0 14px", fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)" }}>
                    {r.original_review || "(리뷰 내용 없음)"}
                  </p>
                  <div style={{ background: "#F7F8FA", borderRadius: 12, padding: "12px 14px", borderLeft: "3px solid var(--green)" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--green-ink)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon name="sparkles" size={12} /> 등록된 AI 답글
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink)" }}>
                      {r.final_reply || r.generated_reply || "-"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

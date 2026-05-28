import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import { fetchQaList, formatDateTime } from "../lib/api";

const FALLBACK = {
  storeName: "내 스토어",
  count: 2,
  total: 4,
  inquiries: [
    {
      id: "qa1", productName: "샤인머스캣 1kg 특품", customerName: "정*우",
      question: "씨가 없는 품종인가요? 아이들 먹이려고요.",
      aiReply: "네 고객님 :) 해당 상품은 씨 없는 샤인머스캣으로, 아이들도 안심하고 드실 수 있습니다. 껍질째 드셔도 좋아요!",
      answered: false, createdAt: "2026-05-28T10:02:00",
    },
    {
      id: "qa2", productName: "유기농 사과 5kg 가정용", customerName: "한*름",
      question: "보관은 어떻게 하나요?",
      aiReply: "사과는 0~4℃ 냉장 보관 시 가장 신선하게 즐기실 수 있습니다. 다른 과일과 분리 보관하시면 더욱 오래갑니다!",
      answered: true, createdAt: "2026-05-27T16:20:00",
    },
  ],
};

const g = (o, keys, d = "") => {
  for (const k of keys) if (o[k] != null && o[k] !== "") return o[k];
  return d;
};
const isAnswered = (r) => {
  const v = r.answered ?? r.answerStatus ?? r.status;
  if (typeof v === "boolean") return v;
  return ["답변완료", "answered", "complete", "done"].includes(String(v).toLowerCase());
};

export default function QA() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);

  const load = async () => {
    setLoading(true); setError(""); setFallback(false);
    try {
      setData(await fetchQaList());
    } catch (e) {
      setError(e.message);
      setData(FALLBACK);
      setFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const items = data?.inquiries || [];
  const pending = items.filter((r) => !isAnswered(r)).length;

  return (
    <>
      <PageHeader
        title="Q&A AI답글"
        sub="상품 Q&A에 AI가 답변 초안을 작성해 등록을 돕습니다."
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

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <StatCard label="신규 Q&A" value={loading ? "-" : (data?.count ?? items.length)} unit="건" icon="help" />
        <StatCard label="답변 대기" value={loading ? "-" : pending} unit="건"
          delta={pending ? "AI 초안 준비됨" : "없음"} deltaTone={pending ? "warn" : "up"} icon="sparkles" alt />
        <StatCard label="누적 Q&A" value={loading ? "-" : (data?.total ?? items.length)} unit="건" icon="list" />
      </div>

      <div className="card">
        <div className="card-title">
          Q&A 목록
          <span className="hint">{data?.storeName ? data.storeName + " · " : ""}{items.length}건</span>
        </div>
        {loading ? (
          <div className="empty"><div className="spinner" />불러오는 중…</div>
        ) : items.length === 0 ? (
          <div className="empty">접수된 Q&A가 없습니다.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((r, i) => {
              const answered = isAnswered(r);
              const reply = g(r, ["aiReply", "generatedReply", "answer", "reply"], "");
              return (
                <div key={g(r, ["id", "inquiryId"], i)} className="card flat" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                    <span className={"badge " + (answered ? "green" : "orange")}>{answered ? "등록완료" : "초안 대기"}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{g(r, ["productName", "name"], "상품 미지정")}</span>
                    <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: "auto" }}>
                      {formatDateTime(g(r, ["createdAt", "created_at", "regDate"], null) || null)}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                    <div className="act-ico" style={{ width: 26, height: 26, background: "white", color: "var(--ink-2)", border: "1px solid var(--line)" }}>
                      <Icon name="user" size={13} />
                    </div>
                    <div style={{ flex: 1, fontSize: 13, color: "var(--ink)", lineHeight: 1.55, paddingTop: 3 }}>
                      {g(r, ["question", "content", "body"], "-")}
                    </div>
                  </div>
                  {reply && (
                    <div style={{ background: "#F7F8FA", borderRadius: 12, padding: "12px 14px", borderLeft: "3px solid var(--green)" }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--green-ink)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <Icon name="sparkles" size={12} /> AI 답변 초안
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink)" }}>{reply}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

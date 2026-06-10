import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import { fetchInquiries, formatDateTime } from "../lib/api";

const FALLBACK = {
  storeName: "내 스토어",
  count: 3,
  total: 12,
  inquiries: [
    { id: "q1", productName: "샤인머스캣 1kg 특품", customerName: "김*수", title: "배송 언제 오나요?", content: "오늘 주문하면 언제 받을 수 있나요? 주말 전에 받고 싶어요.", answered: false, createdAt: "2026-05-28T09:30:00" },
    { id: "q2", productName: "유기농 사과 5kg 가정용", customerName: "이*희", title: "당도 어느 정도인가요", content: "사과 당도가 어느 정도 되는지 궁금합니다.", answered: true, createdAt: "2026-05-27T14:10:00" },
    { id: "q3", productName: "제주 한라봉 3kg", customerName: "박*진", title: "선물포장 가능한가요", content: "선물용으로 보내려는데 포장 옵션이 있나요?", answered: false, createdAt: "2026-05-27T11:05:00" },
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

export default function Inquiry() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);

  const load = async () => {
    setLoading(true); setError(""); setFallback(false);
    try {
      setData(await fetchInquiries());
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
        title="CS 문의"
        sub="고객 문의를 모아 미답변 건을 빠르게 처리합니다."
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
        <StatCard label="신규 문의" value={loading ? "-" : (data?.count ?? items.length)} unit="건" icon="chat" />
        <StatCard label="미답변" value={loading ? "-" : pending} unit="건"
          delta={pending ? "확인 필요" : "없음"} deltaTone={pending ? "down" : "up"} icon="bell" alt />
        <StatCard label="누적 문의" value={loading ? "-" : (data?.total ?? items.length)} unit="건" icon="list" />
      </div>

      <div className="card">
        <div className="card-title">
          문의 목록
          <span className="hint">{data?.storeName ? data.storeName + " · " : ""}{items.length}건</span>
        </div>
        {loading ? (
          <div className="empty"><div className="spinner" />불러오는 중…</div>
        ) : items.length === 0 ? (
          <div className="empty">접수된 문의가 없습니다.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((r, i) => {
              const answered = isAnswered(r);
              return (
                <div key={g(r, ["id", "inquiryId"], i)} className="card flat" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <span className={"badge " + (answered ? "green" : "orange")}>
                      {answered ? "답변완료" : "미답변"}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{g(r, ["title", "subject"], "(제목 없음)")}</span>
                    <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: "auto" }}>
                      {formatDateTime(g(r, ["createdAt", "created_at", "regDate"], null) || null)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.55 }}>{g(r, ["content", "question", "body"], "-")}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 8 }}>
                    {g(r, ["productName", "name"], "상품 미지정")} · {g(r, ["customerName", "writer", "orderer"], "고객")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

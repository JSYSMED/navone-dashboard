import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import { fetchClaims, formatDateTime } from "../lib/api";

const FALLBACK = {
  storeName: "내 스토어",
  count: 3,
  claims: [
    { productOrderId: "2026052700123", productName: "샤인머스캣 1kg 특품", claimType: "반품", reason: "단순 변심", quantity: 1, requestDate: "2026-05-27T09:12:00", status: "접수" },
    { productOrderId: "2026052700088", productName: "유기농 사과 5kg 가정용", claimType: "교환", reason: "상품 파손", quantity: 1, requestDate: "2026-05-27T11:43:00", status: "수거중" },
    { productOrderId: "2026052700061", productName: "제주 한라봉 3kg", claimType: "취소", reason: "배송 지연", quantity: 2, requestDate: "2026-05-26T18:05:00", status: "접수" },
  ],
};

// 서버 응답의 키 편차를 흡수하는 안전 접근자
const g = (o, keys, d = "-") => {
  for (const k of keys) if (o[k] != null && o[k] !== "") return o[k];
  return d;
};
const TYPE_TONE = { 취소: "gray", 반품: "red", 교환: "orange" };

export default function Claims() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);

  const load = async () => {
    setLoading(true); setError(""); setFallback(false);
    try {
      setData(await fetchClaims());
    } catch (e) {
      setError(e.message);
      setData(FALLBACK);
      setFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const items = data?.claims?.length ? data.claims : (data?.pending || []);
  const typeCount = (t) => items.filter((r) => g(r, ["claimType", "type"], "") === t).length;

  return (
    <>
      <PageHeader
        title="클레임 관리"
        sub="취소·반품·교환 등 미처리 클레임을 한눈에 확인하고 대응합니다."
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
        <StatCard label="미처리 클레임" value={loading ? "-" : (data?.count ?? items.length)} unit="건"
          delta={items.length ? "확인 필요" : "없음"} deltaTone={items.length ? "down" : "up"} icon="refresh" />
        <StatCard label="취소" value={loading ? "-" : typeCount("취소")} unit="건" icon="x" alt />
        <StatCard label="반품" value={loading ? "-" : typeCount("반품")} unit="건" icon="box" />
        <StatCard label="교환" value={loading ? "-" : typeCount("교환")} unit="건" icon="refresh" />
      </div>

      <div className="card">
        <div className="card-title">
          미처리 클레임 목록
          <span className="hint">{data?.storeName ? data.storeName + " · " : ""}{items.length}건</span>
        </div>
        {loading ? (
          <div className="empty"><div className="spinner" />불러오는 중…</div>
        ) : items.length === 0 ? (
          <div className="empty">미처리 클레임이 없습니다.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 150 }}>주문번호</th>
                <th>상품명</th>
                <th style={{ width: 80, textAlign: "center" }}>유형</th>
                <th>사유</th>
                <th style={{ width: 60, textAlign: "center" }}>수량</th>
                <th style={{ width: 150 }}>신청일</th>
                <th style={{ width: 90, textAlign: "center" }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, i) => {
                const type = g(r, ["claimType", "type"], "-");
                return (
                  <tr key={g(r, ["productOrderId", "orderId", "id"], i)}>
                    <td className="mono" style={{ color: "var(--ink-2)" }}>{g(r, ["productOrderId", "orderId", "id"])}</td>
                    <td style={{ fontWeight: 500 }}>{g(r, ["productName", "name"])}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={"badge " + (TYPE_TONE[type] || "gray")}>{type}</span>
                    </td>
                    <td style={{ color: "var(--ink-2)" }}>{g(r, ["reason", "claimReason"])}</td>
                    <td className="mono" style={{ textAlign: "center" }}>{g(r, ["quantity", "qty"], "-")}</td>
                    <td className="mono" style={{ color: "var(--ink-2)" }}>
                      {formatDateTime(g(r, ["requestDate", "claimRequestDate", "createdAt"], null))}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="badge gray">{g(r, ["status", "claimStatus"])}</span>
                    </td>
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

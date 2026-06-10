import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import StatCard from "../components/StatCard";
import PageHeader from "../components/PageHeader";
import { fetchOrders, won, formatDateTime } from "../lib/api";

const FALLBACK = {
  storeName: "내 스토어",
  count: 4,
  orders: [
    { productOrderId: "2026052800231", productName: "샤인머스캣 1kg 특품", optionInfo: "1kg / 특품", quantity: 2, ordererName: "김*수", paymentDate: "2026-05-28T08:21:00", totalAmount: 49800, status: "결제완료" },
    { productOrderId: "2026052800219", productName: "유기농 사과 5kg 가정용", optionInfo: "5kg / 가정용", quantity: 1, ordererName: "이*희", paymentDate: "2026-05-28T07:54:00", totalAmount: 26900, status: "결제완료" },
    { productOrderId: "2026052800204", productName: "방울토마토 2kg 대저", optionInfo: "2kg", quantity: 3, ordererName: "박*진", paymentDate: "2026-05-28T07:12:00", totalAmount: 41700, status: "결제완료" },
    { productOrderId: "2026052800188", productName: "제주 한라봉 3kg", optionInfo: "3kg / 선물용", quantity: 1, ordererName: "최*아", paymentDate: "2026-05-28T06:40:00", totalAmount: 32000, status: "결제완료" },
  ],
};

const g = (o, keys, d = "-") => {
  for (const k of keys) if (o[k] != null && o[k] !== "") return o[k];
  return d;
};

export default function Orders() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);

  const load = async () => {
    setLoading(true); setError(""); setFallback(false);
    try {
      setData(await fetchOrders());
    } catch (e) {
      setError(e.message);
      setData(FALLBACK);
      setFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const orders = data?.orders || [];
  const totalQty = orders.reduce((s, r) => s + (Number(g(r, ["quantity", "qty"], 0)) || 0), 0);
  const totalAmount = orders.reduce((s, r) => s + (Number(g(r, ["totalAmount", "totalPaymentAmount", "amount"], 0)) || 0), 0);

  return (
    <>
      <PageHeader
        title="주문/발주"
        sub="결제 완료 후 아직 발주하지 않은 신규 주문을 확인합니다."
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
        <StatCard label="미발주 주문" value={loading ? "-" : (data?.count ?? orders.length)} unit="건"
          delta={orders.length ? "처리 필요" : "없음"} deltaTone={orders.length ? "warn" : "up"} icon="cart" />
        <StatCard label="총 주문 수량" value={loading ? "-" : totalQty} unit="개" icon="box" alt />
        <StatCard label="주문 금액 합계" value={loading ? "-" : won(totalAmount)} icon="trend" />
        <StatCard label="스토어" value={data?.storeName || "-"} icon="home" />
      </div>

      <div className="card">
        <div className="card-title">
          미발주 주문 목록
          <span className="hint">{orders.length}건</span>
        </div>
        {loading ? (
          <div className="empty"><div className="spinner" />불러오는 중…</div>
        ) : orders.length === 0 ? (
          <div className="empty">미발주 주문이 없습니다.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 150 }}>주문번호</th>
                <th>상품명</th>
                <th>옵션</th>
                <th style={{ width: 60, textAlign: "center" }}>수량</th>
                <th style={{ width: 80, textAlign: "center" }}>주문자</th>
                <th style={{ width: 150 }}>결제일</th>
                <th style={{ width: 110, textAlign: "right" }}>금액</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((r, i) => (
                <tr key={g(r, ["productOrderId", "orderId", "id"], i)}>
                  <td className="mono" style={{ color: "var(--ink-2)" }}>{g(r, ["productOrderId", "orderId", "id"])}</td>
                  <td style={{ fontWeight: 500 }}>{g(r, ["productName", "name"])}</td>
                  <td style={{ color: "var(--ink-2)" }}>{g(r, ["optionInfo", "productOption", "option"])}</td>
                  <td className="mono" style={{ textAlign: "center" }}>{g(r, ["quantity", "qty"], "-")}</td>
                  <td style={{ textAlign: "center", color: "var(--ink-2)" }}>{g(r, ["ordererName", "orderer"])}</td>
                  <td className="mono" style={{ color: "var(--ink-2)" }}>
                    {formatDateTime(g(r, ["paymentDate", "orderDate", "createdAt"], null))}
                  </td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>
                    {won(g(r, ["totalAmount", "totalPaymentAmount", "amount"], null))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

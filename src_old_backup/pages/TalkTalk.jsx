import { useState } from "react";
import Icon from "../components/Icon";
import PageHeader from "../components/PageHeader";

// 톡톡 AI 응답 — 아직 전용 API가 없어 목업 데이터로 표시
export default function TalkTalk() {
  const [info, setInfo] = useState({
    delivery: "오후 2시 이전 주문 시 당일 출고, 일반적으로 1~2일 내 도착합니다.",
    returns: "신선식품 특성상 단순 변심 반품은 어렵습니다. 상품 하자 시 사진과 함께 톡톡으로 문의 부탁드립니다.",
    exchange: "수령 후 24시간 이내 사진 첨부 시 교환 가능합니다.",
    notes: "주말/공휴일은 출고가 어렵습니다. 새벽배송은 제공하지 않습니다.",
  });

  const chats = [
    { time: "14:23", customer: "샤인머스캣 오늘 주문하면 언제 받을 수 있어요?", reply: "오늘 오후 2시 이전 주문건은 당일 출고되어 보통 내일~모레 도착합니다. 새벽배송은 운영하지 않는 점 참고 부탁드려요.", status: "auto" },
    { time: "14:18", customer: "사과 5kg 환불하고 싶어요", reply: "환불 관련 문의는 판매자가 직접 확인해드릴 수 있도록 전달드렸습니다. 잠시만 기다려 주세요.", status: "forward" },
    { time: "13:54", customer: "방울토마토 당일 출고 되나요?", reply: "네 :) 오후 2시 전 주문이시면 오늘 출고됩니다. 결제 완료 기준이라 결제까지 마쳐주세요!", status: "auto" },
    { time: "13:42", customer: "선물용으로 포장 가능한가요?", reply: "기본 포장도 깔끔하게 나가지만, 선물용 박스 포장이 필요하시면 옵션에서 선물포장(+2,000원)을 선택해주세요.", status: "auto" },
    { time: "13:21", customer: "교환은 어떻게 하나요?", reply: "수령 후 24시간 이내에 상품 사진을 톡톡으로 보내주시면 빠르게 교환 도와드립니다!", status: "auto" },
    { time: "12:58", customer: "법인 카드로 결제했는데 세금계산서 발행돼나요?", reply: "세금계산서 발행 관련해서는 판매자가 직접 확인해드리겠습니다. 곧 답변드릴게요.", status: "forward" },
    { time: "12:30", customer: "한라봉 입고 언제 또 되나요?", reply: "현재 한라봉은 시즌 막바지로 재입고가 미정입니다. 자세한 일정은 판매자가 확인 후 안내드릴게요.", status: "forward" },
    { time: "11:48", customer: "참외 박스에 흠집난 것 있나요?", reply: "박스 외관은 운송 중 약간의 눌림이 있을 수 있지만, 상품 자체에는 영향이 없도록 이중 포장해 보내드립니다.", status: "auto" },
  ];

  return (
    <>
      <PageHeader
        title="톡톡 AI 응답"
        sub="자주 묻는 문의에 AI가 자동으로 응답하고, 어려운 건은 판매자에게 전달합니다. (미리보기 · API 연동 예정)"
      />

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="stat">
          <div className="label">오늘 자동 응답</div>
          <div className="val mono">42<span className="unit">건</span></div>
          <div className="delta up">응답률 94.2%</div>
          <div className="icon-pill"><Icon name="chat" size={18} /></div>
        </div>
        <div className="stat alt">
          <div className="label">판매자 전달</div>
          <div className="val mono">3<span className="unit">건</span></div>
          <div className="delta warn">확인 필요</div>
          <div className="icon-pill"><Icon name="user" size={18} /></div>
        </div>
        <div className="stat">
          <div className="label">평균 응답 시간</div>
          <div className="val mono">8<span className="unit">초</span></div>
          <div className="delta up">즉시 응답</div>
          <div className="icon-pill"><Icon name="clock" size={18} /></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">스토어 기본 정보 <span className="hint">AI가 답변에 활용합니다</span></div>
        <div className="grid-2">
          <div className="field">
            <label className="field-label">배송 소요일</label>
            <textarea className="input" rows="2" value={info.delivery} onChange={(e) => setInfo({ ...info, delivery: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">반품 정책</label>
            <textarea className="input" rows="2" value={info.returns} onChange={(e) => setInfo({ ...info, returns: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">교환 가능 기간</label>
            <textarea className="input" rows="2" value={info.exchange} onChange={(e) => setInfo({ ...info, exchange: e.target.value })} />
          </div>
          <div className="field">
            <label className="field-label">주요 안내사항</label>
            <textarea className="input" rows="2" value={info.notes} onChange={(e) => setInfo({ ...info, notes: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">상담 이력 <span className="hint">최근 8건</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {chats.map((c, i) => {
            const fwd = c.status === "forward";
            return (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "70px 1fr", gap: 14,
                padding: "14px 16px", borderRadius: 12,
                background: fwd ? "var(--orange-soft)" : "#F7F8FA",
                border: fwd ? "1px solid #FFD9B0" : "1px solid transparent",
              }}>
                <div style={{ fontSize: 12, color: "var(--ink-2)", paddingTop: 2 }} className="mono">{c.time}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div className="act-ico" style={{ width: 26, height: 26, background: "white", color: "var(--ink-2)", border: "1px solid var(--line)" }}>
                      <Icon name="user" size={13} />
                    </div>
                    <span style={{ fontSize: 12.5, color: "var(--ink)", flex: 1 }}>{c.customer}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div className="act-ico" style={{ width: 26, height: 26, background: fwd ? "#FFE4C7" : "var(--green-soft)", color: fwd ? "var(--orange)" : "var(--green-ink)" }}>
                      <Icon name={fwd ? "user" : "sparkles"} size={13} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{c.reply}</div>
                      <span className={"badge " + (fwd ? "orange" : "green")} style={{ marginTop: 6 }}>
                        {fwd ? "판매자 전달" : "자동 응답"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

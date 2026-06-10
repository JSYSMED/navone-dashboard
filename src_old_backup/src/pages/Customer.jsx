import { useEffect, useState } from "react";
import NvIcon from "../components/NvIcon";
import { NvPageHead, NvSeg, NvToggle, NvField, NvBanner, NvStat, NvStatRow, NvStars } from "../components/atoms";
import { fetchQaList, fetchInquiries, fetchHistory } from "../lib/api";

const FALLBACK_REVIEWS = [
  { id: 1, product: "샤인머스캣 1kg 특품", rating: 5, time: "12분 전", text: "포장 정말 꼼꼼하게 와서 한 알도 안 터졌어요! 당도도 진짜 높고 알도 굵어요. 다음에 또 주문할게요.", reply: "고객님, 따뜻한 후기 정말 감사드립니다 :) 한 알 한 알 정성껏 골라 포장하는 게 저희의 자부심이에요. 다음번에도 가장 좋은 머스캣으로 보내드릴게요!" },
  { id: 2, product: "유기농 사과 5kg 가정용", rating: 3, time: "34분 전", text: "맛은 괜찮은데 크기가 생각보다 작은 게 좀 섞여 있었어요. 다음엔 좀 더 균일했으면 좋겠습니다.", reply: "소중한 의견 주셔서 감사합니다. 가정용 상품은 크기 편차가 있을 수 있는 점 양해 부탁드려요. 선별 기준을 더 다듬어 균일한 상품을 보내드릴 수 있도록 노력하겠습니다." },
  { id: 3, product: "방울토마토 2kg 대저", rating: 5, time: "1시간 전", text: "달고 신선해요. 아이가 너무 잘 먹어서 또 주문했어요. 배송도 빠르고 최고!", reply: "아이가 잘 먹는다니 저희도 정말 기쁘네요! 매일 새벽에 따서 그날 바로 출고하고 있어요. 늘 가장 신선한 토마토로 보답드리겠습니다." },
  { id: 4, product: "성주 참외 2.5kg", rating: 2, time: "2시간 전", text: "받자마자 한두 개 무른 게 있었어요. 환불 부탁드립니다.", reply: "불편을 드려 진심으로 죄송합니다. 무른 상품은 바로 환불 도와드리겠습니다. 톡톡으로 상품 사진 보내주시면 즉시 처리해드릴게요." },
  { id: 5, product: "제주 한라봉 3kg", rating: 4, time: "3시간 전", text: "맛있어요. 한라봉 향이 진하고 새콤달콤 좋네요. 별 하나 뺀 건 일부 크기가 작아서요.", reply: "한라봉 좋아해 주셔서 감사합니다! 크기 편차 부분은 앞으로 더 세심히 선별해서 보내드릴게요." },
];
const FALLBACK_INQUIRIES = [
  { id: "INQ001", product: "아비브 콜라겐 겔 마스크 1매", q: "이거 민감성 피부에도 괜찮을까요?", buyer: "김*희", time: "15분 전", a: "안녕하세요! 저자극 처방으로 민감성 피부에도 안심하고 사용하실 수 있습니다. 약산성(pH 5.5) 포뮬러로 자극을 최소화했어요.", status: "pending", conf: 0.94 },
  { id: "INQ002", product: "유기농 사과 5kg 가정용", q: "배송 보통 며칠 걸리나요? 경상도인데", buyer: "이*수", time: "32분 전", a: "주문 확인 후 1~2 영업일 내 출고되며, 경상도는 출고 기준 1~2일 내 수령 가능하십니다. 총 2~4일 정도 소요돼요.", status: "approved", conf: 0.97 },
  { id: "INQ003", product: "제주 한라봉 3kg", q: "선물용 박스도 있나요?", buyer: "박*민", time: "1시간 전", a: "네, 선물용 박스 포장을 옵션에서 선택하실 수 있어요(+2,000원). 메시지 카드도 동봉 가능합니다.", status: "pending", conf: 0.91 },
];

function mapReviews(rows) {
  return (rows || []).map((r, i) => ({
    id: r.id || i + 1,
    product: r.product_name || r.productName || "—",
    rating: +r.rating || 0,
    time: r.created_at ? rel(r.created_at) : "",
    text: r.original_review || r.review || r.text || "",
    reply: r.reply || r.ai_reply || r.reply_text || "",
  }));
}
function mapInquiries(rows) {
  return (rows || []).map((q, i) => ({
    id: q.id || q.inquiryNo || "INQ" + (i + 1),
    product: q.product_name || q.productName || q.product || "—",
    q: q.question || q.q || q.content || "",
    buyer: q.buyer || q.writerName || "—",
    time: q.created_at ? rel(q.created_at) : (q.time || ""),
    a: q.ai_answer || q.answer || q.a || "",
    status: q.status === "ANSWERED" || q.answered ? "approved" : "pending",
    conf: q.conf != null ? +q.conf : 0.9,
  }));
}
function rel(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function Customer() {
  const [tab, setTab] = useState("rev");
  const [tone, setTone] = useState("친근");
  const [ctx, setCtx] = useState("우리 스토어는 산지 직송 과일을 판매하는 곳입니다. 신선도와 포장에 자부심이 있습니다.");
  const [autoReply, setAutoReply] = useState(true);
  const [sel, setSel] = useState(new Set([1, 2, 3, 5]));

  const [reviews, setReviews] = useState(FALLBACK_REVIEWS);
  const [inquiries, setInquiries] = useState(FALLBACK_INQUIRIES);

  useEffect(() => {
    fetchHistory("review", 30).then(d => {
      const m = mapReviews(d?.data);
      if (m.length) { setReviews(m); setSel(new Set(m.filter(r => r.rating >= 3).map(r => r.id))); }
    }).catch(() => {});
    // QA + inquiry 합쳐서 표시
    Promise.allSettled([fetchQaList(), fetchInquiries()]).then(([qa, inq]) => {
      const rows = [
        ...(qa.status === "fulfilled" ? (qa.value?.items || qa.value?.list || qa.value || []) : []),
        ...(inq.status === "fulfilled" ? (inq.value?.inquiries || inq.value?.list || inq.value || []) : []),
      ];
      const m = mapInquiries(rows);
      if (m.length) setInquiries(m);
    }).catch(() => {});
  }, []);

  const toggle = id => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const ratingTag = r => r >= 4 ? ["감사", "green"] : r >= 3 ? ["공감·개선", "amber"] : ["사과·해결", "red"];
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";

  const chats = [
    { time: "14:23", q: "샤인머스캣 오늘 주문하면 언제 받을 수 있어요?", a: "오늘 오후 2시 이전 주문건은 당일 출고되어 보통 내일~모레 도착합니다. 새벽배송은 운영하지 않는 점 참고 부탁드려요.", fwd: false },
    { time: "14:18", q: "사과 5kg 환불하고 싶어요", a: "환불 관련 문의는 판매자가 직접 확인해드릴 수 있도록 전달드렸습니다. 잠시만 기다려 주세요.", fwd: true },
    { time: "13:54", q: "방울토마토 당일 출고 되나요?", a: "네 :) 오후 2시 전 주문이시면 오늘 출고됩니다. 결제 완료 기준이라 결제까지 마쳐주세요!", fwd: false },
    { time: "13:42", q: "선물용으로 포장 가능한가요?", a: "선물용 박스 포장이 필요하시면 옵션에서 선물포장(+2,000원)을 선택해주세요.", fwd: false },
    { time: "12:58", q: "법인 카드로 결제했는데 세금계산서 발행되나요?", a: "세금계산서 발행 관련해서는 판매자가 직접 확인해드리겠습니다. 곧 답변드릴게요.", fwd: true },
    { time: "11:48", q: "참외 박스에 흠집난 것 있나요?", a: "박스 외관은 운송 중 약간 눌림이 있을 수 있지만, 상품 자체에는 영향이 없도록 이중 포장해 보내드립니다.", fwd: false },
  ];

  return (
    <>
      <NvPageHead title="고객응대 AI" sub="리뷰 답글, 톡톡 문의, Q&A를 AI가 초안부터 응답까지 도와드려요."
        actions={tab === "rev" && <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 13.5, fontWeight: 700, color: autoReply ? "var(--green-ink)" : "var(--ink-3)" }}>자동 답글</span><NvToggle on={autoReply} onChange={setAutoReply} /></div>} />

      <NvSeg style={{ marginBottom: 20 }} value={tab} onChange={setTab} tabs={[["rev", "리뷰 답글"], ["talk", "톡톡 AI 응답"], ["qna", "Q&A · CS 답변"]]} />

      {tab === "rev" && (
        <>
          {autoReply && <div style={{ marginBottom: 16 }}><NvBanner tone="green" icon="sparkles"><b>자동 답글 켜짐</b> — 새 리뷰가 들어오면 AI가 답글을 생성해 순차 등록합니다. 저별점(2점 이하)은 자동 등록하지 않고 검수 대기로 남겨 직접 확인하도록 해요.</NvBanner></div>}
          <NvStatRow cols={3}>
            <NvStat label="미답글 리뷰" value={reviews.length} unit="건" icon="bell" tone="amber" sub="답글 초안 생성됨" subTone="muted" />
            <NvStat label="선택됨" value={sel.size} unit="건" icon="check" tone="green" sub="등록 대기" subTone="up" />
            <NvStat label="평균 별점" value={avgRating} unit="/ 5.0" icon="star" tone="violet" sub="최근 7일" subTone="muted" />
          </NvStatRow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">AI 답글 톤</h3></div>
              <NvSeg value={tone} onChange={setTone} tabs={[["친근", "친근"], ["정중", "정중"], ["간결", "간결"]]} />
              <div className="nv-field-hint" style={{ marginTop: 10 }}>{tone === "친근" && "고객을 가까운 친구처럼 대하는 따뜻한 어투."}{tone === "정중" && "정중하고 격식 있는 표현으로 신뢰감을."}{tone === "간결" && "꼭 필요한 말만 짧고 깔끔하게."}</div>
              <div className="nv-field-hint" style={{ marginTop: 6 }}>별점별 대응: 고별점=감사 / 중별점=공감+개선 / 저별점=사과+해결</div>
            </div>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">스토어 컨텍스트</h3></div>
              <textarea className="nv-input" rows="3" value={ctx} onChange={e => setCtx(e.target.value)} />
              <div className="nv-field-hint" style={{ marginTop: 7 }}>AI가 답글을 생성할 때 참고하는 스토어 정보입니다.</div>
            </div>
          </div>
          <div className="nv-card" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "18px 22px" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>선택한 {sel.size}건 순차 등록</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 3 }}>봇 감지를 피하기 위해 한 건씩 랜덤 간격(20~60초)으로 등록합니다.</div>
            </div>
            <button className="nv-btn ghost sm" onClick={() => setSel(new Set(reviews.map(r => r.id)))}>전체 선택</button>
            <button className="nv-btn ghost sm" onClick={() => setSel(new Set())}>선택 해제</button>
            <button className="nv-btn primary"><NvIcon name="check" size={15} /> {sel.size}건 등록 시작</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {reviews.map(r => {
              const [tg, tc] = ratingTag(r.rating); const s = sel.has(r.id);
              const bar = r.rating >= 4 ? "var(--green)" : r.rating >= 3 ? "var(--amber)" : "var(--red)";
              return (
                <div key={r.id} className="nv-card" style={{ display: "flex", gap: 0, padding: 0, overflow: "hidden" }}>
                  <div style={{ width: 5, background: bar, flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "18px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <input type="checkbox" checked={s} onChange={() => toggle(r.id)} style={{ width: 17, height: 17, accentColor: "var(--green)" }} />
                      <NvStars v={r.rating} />
                      <span className={"nv-pill " + tc}>{tg}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r.product}</span>
                      <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: "auto" }}>{r.time}</span>
                    </div>
                    <p style={{ margin: "12px 0 14px", fontSize: 13.5, lineHeight: 1.6 }}>{r.text}</p>
                    {r.reply && <div style={{ background: "var(--green-tint)", borderRadius: 14, padding: "13px 16px", borderLeft: "3px solid var(--green)" }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--green-ink)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><NvIcon name="sparkles" size={12} /> AI 생성 답글</div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{r.reply}</div>
                    </div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                      <button className="nv-btn ghost sm"><NvIcon name="refresh" size={12} /> 다시 생성</button>
                      <button className="nv-btn ghost sm">수정</button>
                      <button className={"nv-btn sm " + (s ? "primary" : "ghost")} onClick={() => toggle(r.id)}>{s ? <><NvIcon name="check" size={12} /> 선택됨</> : "선택"}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "talk" && (
        <>
          <NvStatRow cols={3}>
            <NvStat label="오늘 자동 응답" value="42" unit="건" icon="chat" tone="green" sub="응답률 94.2%" subTone="up" />
            <NvStat label="판매자 전달" value="3" unit="건" icon="user" tone="amber" sub="확인 필요" subTone="warn" />
            <NvStat label="평균 응답 시간" value="8" unit="초" icon="clock" tone="blue" sub="즉시 응답" subTone="up" />
          </NvStatRow>
          <div className="nv-card" style={{ marginBottom: 16 }}>
            <div className="nv-card-h"><h3 className="nv-card-t">스토어 기본 정보</h3><span className="nv-card-hint">AI가 답변에 활용합니다</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <NvField label="배송 소요일"><textarea className="nv-input" rows="2" defaultValue="오후 2시 이전 주문 시 당일 출고, 보통 1~2일 내 도착합니다." /></NvField>
              <NvField label="반품 정책"><textarea className="nv-input" rows="2" defaultValue="신선식품 특성상 단순 변심 반품은 어렵습니다. 상품 하자 시 사진과 함께 톡톡으로 문의 부탁드립니다." /></NvField>
              <NvField label="교환 가능 기간"><textarea className="nv-input" rows="2" defaultValue="수령 후 24시간 이내 사진 첨부 시 교환 가능합니다." /></NvField>
              <NvField label="주요 안내사항"><textarea className="nv-input" rows="2" defaultValue="주말/공휴일은 출고가 어렵습니다. 새벽배송은 제공하지 않습니다." /></NvField>
            </div>
          </div>
          <div className="nv-card">
            <div className="nv-card-h"><h3 className="nv-card-t">상담 이력</h3><span className="nv-card-hint">최근 6건</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {chats.map((c, i) => (
                <div key={i} style={{ padding: "14px 16px", borderRadius: 14, background: c.fwd ? "var(--amber-soft)" : "var(--line-2)", border: c.fwd ? "1px solid #F6DDB8" : "1px solid transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
                    <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{c.time}</span>
                    <div style={{ width: 24, height: 24, borderRadius: 8, background: "#fff", border: "1px solid var(--line)", display: "grid", placeItems: "center", color: "var(--ink-2)" }}><NvIcon name="user" size={13} /></div>
                    <span style={{ fontSize: 13, flex: 1 }}>{c.q}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                    <div className={"nv-ic-tile " + (c.fwd ? "amber" : "green")} style={{ width: 24, height: 24, borderRadius: 8 }}><NvIcon name={c.fwd ? "user" : "sparkles"} size={12} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.55 }}>{c.a}</div>
                      <span className={"nv-pill " + (c.fwd ? "amber" : "green")} style={{ marginTop: 7 }}>{c.fwd ? "판매자 전달" : "자동 응답"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "qna" && (
        <>
          <NvStatRow cols={3}>
            <NvStat label="오늘 문의" value={inquiries.length} unit="건" icon="chat" tone="green" sub="AI 답변 생성됨" subTone="up" />
            <NvStat label="답변 대기" value={inquiries.filter(i => i.status === "pending").length} unit="건" icon="bell" tone="amber" sub="검수 후 등록" subTone="warn" />
            <NvStat label="평균 신뢰도" value={inquiries.length ? (inquiries.reduce((s, i) => s + i.conf, 0) / inquiries.length * 100).toFixed(0) : "—"} unit="%" icon="shield" tone="blue" sub="AI 답변 정확도" subTone="up" />
          </NvStatRow>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {inquiries.map(q => {
              const done = q.status === "approved";
              return (
                <div key={q.id} className="nv-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 10 }}>
                    <span className="nv-pill gray">{q.product}</span>
                    <span className="nv-pill blue mono">신뢰도 {(q.conf * 100).toFixed(0)}%</span>
                    <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--ink-3)" }}>{q.buyer} · {q.time}</span>
                  </div>
                  <div style={{ display: "flex", gap: 9, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 9, background: "var(--line-2)", display: "grid", placeItems: "center", color: "var(--ink-2)", flexShrink: 0 }}><NvIcon name="user" size={14} /></div>
                    <div style={{ fontSize: 14, fontWeight: 600, paddingTop: 4 }}>{q.q}</div>
                  </div>
                  {q.a && <div style={{ background: "var(--green-tint)", borderRadius: 14, padding: "13px 16px", borderLeft: "3px solid var(--green)" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--green-ink)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><NvIcon name="sparkles" size={12} /> AI 생성 답변</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{q.a}</div>
                  </div>}
                  <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end", alignItems: "center" }}>
                    {done ? <span className="nv-pill green"><NvIcon name="check" size={12} /> 등록 완료</span> : <>
                      <button className="nv-btn ghost sm"><NvIcon name="refresh" size={12} /> 다시 생성</button>
                      <button className="nv-btn ghost sm">수정</button>
                      <button className="nv-btn primary sm"><NvIcon name="check" size={13} /> 답변 등록</button>
                    </>}
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

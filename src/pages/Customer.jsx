import { useEffect, useState } from "react";
import NvIcon from "../components/NvIcon";
import { NvPageHead, NvSeg, NvToggle, NvField, NvBanner, NvStat, NvStatRow, NvStars, NvEmpty } from "../components/atoms";
import { fetchReviewList } from "../lib/api";

const FALLBACK_REVIEWS = [
  { id: 1, product: "샤인머스캣 1kg 특품", rating: 5, time: "12분 전", text: "포장 정말 꼼꼼하게 와서 한 알도 안 터졌어요! 당도도 진짜 높고 알도 굵어요. 다음에 또 주문할게요.", reply: "고객님, 따뜻한 후기 정말 감사드립니다 :) 한 알 한 알 정성껏 골라 포장하는 게 저희의 자부심이에요. 다음번에도 가장 좋은 머스캣으로 보내드릴게요!" },
  { id: 2, product: "유기농 사과 5kg 가정용", rating: 3, time: "34분 전", text: "맛은 괜찮은데 크기가 생각보다 작은 게 좀 섞여 있었어요. 다음엔 좀 더 균일했으면 좋겠습니다.", reply: "소중한 의견 주셔서 감사합니다. 가정용 상품은 크기 편차가 있을 수 있는 점 양해 부탁드려요. 선별 기준을 더 다듬어 균일한 상품을 보내드릴 수 있도록 노력하겠습니다." },
  { id: 3, product: "방울토마토 2kg 대저", rating: 5, time: "1시간 전", text: "달고 신선해요. 아이가 너무 잘 먹어서 또 주문했어요. 배송도 빠르고 최고!", reply: "아이가 잘 먹는다니 저희도 정말 기쁘네요! 매일 새벽에 따서 그날 바로 출고하고 있어요. 늘 가장 신선한 토마토로 보답드리겠습니다." },
  { id: 4, product: "성주 참외 2.5kg", rating: 2, time: "2시간 전", text: "받자마자 한두 개 무른 게 있었어요. 환불 부탁드립니다.", reply: "불편을 드려 진심으로 죄송합니다. 무른 상품은 바로 환불 도와드리겠습니다. 톡톡으로 상품 사진 보내주시면 즉시 처리해드릴게요." },
  { id: 5, product: "제주 한라봉 3kg", rating: 4, time: "3시간 전", text: "맛있어요. 한라봉 향이 진하고 새콤달콤 좋네요. 별 하나 뺀 건 일부 크기가 작아서요.", reply: "한라봉 좋아해 주셔서 감사합니다! 크기 편차 부분은 앞으로 더 세심히 선별해서 보내드릴게요." },
];

function mapReviews(rows) {
  return (rows || []).map((r, i) => ({
    id: r.reviewId || r.id || i + 1,
    product: r.productName || r.product_name || "—",
    rating: +r.rating || 0,
    time: r.reviewDate || (r.created_at ? rel(r.created_at) : ""),
    text: r.content || r.original_review || r.review || r.text || "",
    reply: r.replyText || r.reply || r.ai_reply || r.reply_text || "",
    replyStatus: r.replyStatus || r.reply_status || (r.replyText || r.reply_text ? "replied" : "pending"),
  }));
}
function rel(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

// ───── 문의 응답 목업 데이터 (실제 API 없음) ─────
const CAT_TONE = { "배송": "blue", "상품": "green", "교환·반품": "red", "결제": "amber", "기타": "gray" };
const INQ_CATS = ["전체", "배송", "상품", "교환·반품", "결제", "기타"];
const INQUIRIES = [
  { id: "INQ2051", cat: "배송", product: "샤인머스캣 1kg 특품", summary: "제주도 배송 가능 여부·추가 배송비 문의", raw: "제주도인데 배송 가능한가요? 도서산간 추가비용 있으면 얼마인지 궁금합니다.", buyer: "김*희", time: "8분 전", draft: "네, 제주도도 배송 가능합니다! 도서산간 추가 배송비 3,000원이 발생하며 결제 시 자동 합산돼요. 출고 후 보통 2~3일 내 도착합니다." },
  { id: "INQ2050", cat: "상품", product: "유기농 사과 5kg 가정용", summary: "당도 수준·부사 품종 여부 문의", raw: "사과 당도가 어느정도 되나요? 그리고 부사 맞나요?", buyer: "이*수", time: "21분 전", draft: "안녕하세요! 보내드리는 사과는 부사 품종으로 당도 14~15Brix 내외의 고당도 상품입니다. 아삭한 식감과 풍부한 과즙이 특징이에요." },
  { id: "INQ2049", cat: "교환·반품", product: "성주 참외 2.5kg", summary: "일부 무름 — 교환·환불 요청", raw: "어제 받았는데 두 개가 물러서 왔어요. 교환이나 환불 가능할까요?", buyer: "박*민", time: "44분 전", draft: "불편을 드려 죄송합니다. 무른 상품은 바로 처리 도와드릴게요. 상품 사진을 첨부해 주시면 환불 또는 재발송 중 원하시는 방법으로 즉시 처리해 드리겠습니다." },
  { id: "INQ2048", cat: "결제", product: "제주 한라봉 3kg", summary: "법인카드 결제 — 세금계산서 발행 여부", raw: "법인카드로 결제했는데 세금계산서 발행 가능한가요?", buyer: "최*서", time: "1시간 전", draft: "네, 세금계산서 발행 가능합니다. 사업자등록증 사본과 발행 정보를 톡톡으로 보내주시면 영업일 기준 1~2일 내 발행해 드려요." },
  { id: "INQ2047", cat: "기타", product: "방울토마토 2kg 대저", summary: "선물 포장·메시지 카드 동봉 가능 여부", raw: "선물로 보내려는데 포장이랑 카드 동봉 되나요?", buyer: "한*글", time: "2시간 전", draft: "네 :) 선물 포장(+2,000원)과 메시지 카드 동봉 모두 가능합니다. 주문 시 요청사항에 메시지 내용을 남겨주시면 정성껏 동봉해 드릴게요." },
];
const INQ_DONE = [
  { id: "INQ2042", cat: "배송", product: "샤인머스캣 1kg 특품", summary: "배송 출발 문의 — 당일 출고 안내", time: "오늘 10:12", via: "텔레그램" },
  { id: "INQ2039", cat: "상품", product: "유기농 사과 5kg 가정용", summary: "보관 방법 문의 — 냉장보관 안내", time: "오늘 09:41", via: "텔레그램" },
  { id: "INQ2035", cat: "결제", product: "제주 한라봉 3kg", summary: "결제 오류 문의 — 재결제 안내", time: "어제 18:23", via: "직접 답변" },
];

export default function Customer() {
  const [tab, setTab] = useState("rev");
  const [tone, setTone] = useState("친근");
  const [ctx, setCtx] = useState("우리 스토어는 산지 직송 과일을 판매하는 곳입니다. 신선도와 포장에 자부심이 있습니다.");
  const [autoReply, setAutoReply] = useState(true);
  const [sel, setSel] = useState(new Set([1, 2, 3, 5]));

  const [reviews, setReviews] = useState([]);
  const [revStatus, setRevStatus] = useState("loading");  // loading|ok|empty|error
  const [revFilter, setRevFilter] = useState("pending");  // pending|replied|all

  // 문의 응답(목업) 상태
  const [inqFilter, setInqFilter] = useState("전체");
  const [inqOpen, setInqOpen] = useState(new Set());
  const [drafts, setDrafts] = useState(() => Object.fromEntries(INQUIRIES.map(i => [i.id, i.draft])));
  const [doneSearch, setDoneSearch] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetchReviewList("all", 100).then(d => {
      const m = mapReviews(d?.reviews || d?.data);
      if (m.length) { setReviews(m); setSel(new Set(m.filter(r => r.rating >= 3 && r.replyStatus !== "replied").map(r => r.id))); setRevStatus("ok"); }
      else { setReviews([]); setRevStatus("empty"); }
    }).catch(() => { setReviews(FALLBACK_REVIEWS); setRevStatus("error"); });
  }, []);

  const toggle = id => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  const ratingTag = r => r >= 4 ? ["감사", "green"] : r >= 3 ? ["공감·개선", "amber"] : ["사과·해결", "red"];
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";

  const toggleInq = id => setInqOpen(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const fakeToast = msg => { setToast(msg); setTimeout(() => setToast(""), 2600); };
  const shownInq = inqFilter === "전체" ? INQUIRIES : INQUIRIES.filter(i => i.cat === inqFilter);
  const shownDone = INQ_DONE.filter(d => !doneSearch || (d.product + d.summary).includes(doneSearch));

  return (
    <>
      <NvPageHead title="고객응대" sub="리뷰 답글과 고객 문의를 AI가 도와드려요."
        actions={tab === "rev" && <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 13.5, fontWeight: 700, color: autoReply ? "var(--green-ink)" : "var(--ink-3)" }}>자동 답글</span><NvToggle on={autoReply} onChange={setAutoReply} /></div>} />

      <NvSeg style={{ marginBottom: 20 }} value={tab} onChange={setTab} tabs={[["rev", "리뷰 답글"], ["inq", "문의 응답"]]} />

      {tab === "rev" && (
        <>
          {autoReply && <div style={{ marginBottom: 16 }}><NvBanner tone="green" icon="sparkles"><b>자동 답글 켜짐</b> — 새 리뷰가 들어오면 AI가 답글을 생성해 순차 등록합니다. 저별점(2점 이하)은 자동 등록하지 않고 검수 대기로 남겨 직접 확인하도록 해요.</NvBanner></div>}
          <NvStatRow cols={3}>
            <NvStat label="미답글 리뷰" value={reviews.filter(r => r.replyStatus !== "replied").length} unit="건" icon="bell" tone="amber" sub="답글 대기 중" subTone="muted" />
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
          {revStatus === "error" && <div style={{ marginBottom: 14 }}><NvBanner tone="amber" icon="bell">리뷰 데이터를 불러오지 못해 예시를 표시합니다.</NvBanner></div>}
          {revStatus !== "loading" && revStatus !== "empty" && (() => {
            const pendingN = reviews.filter(r => r.replyStatus !== "replied").length;
            const repliedN = reviews.filter(r => r.replyStatus === "replied").length;
            return (
              <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "var(--line-2)", padding: 4, borderRadius: 12, width: "fit-content" }}>
                {[["pending", `미답글 ${pendingN}`], ["replied", `답글완료 ${repliedN}`], ["all", `전체 ${reviews.length}`]].map(([k, lbl]) => (
                  <button key={k} onClick={() => setRevFilter(k)} className={"nv-btn sm " + (revFilter === k ? "primary" : "ghost")} style={{ minWidth: 90 }}>{lbl}</button>
                ))}
              </div>
            );
          })()}
          {revStatus === "empty" ? (
            <NvEmpty icon="star" title="답글을 기다리는 새 리뷰가 없어요" desc="크롬 확장에서 리뷰를 스캔하면 여기에 표시됩니다." tone="violet" />
          ) : revStatus === "loading" ? (
            <div style={{ padding: "44px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>불러오는 중…</div>
          ) : (() => {
          const shown = reviews.filter(r => revFilter === "all" ? true : revFilter === "replied" ? r.replyStatus === "replied" : r.replyStatus !== "replied");
          if (shown.length === 0) return <NvEmpty icon="check" title={revFilter === "replied" ? "답글 완료된 리뷰가 없어요" : "미답글 리뷰가 없어요"} desc={revFilter === "replied" ? "답글을 등록하면 여기로 이동합니다." : "모든 리뷰에 답글을 등록했어요."} tone="violet" />;
          return (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {shown.map(r => {
              const [tg, tc] = ratingTag(r.rating); const s = sel.has(r.id);
              const bar = r.rating >= 4 ? "var(--green)" : r.rating >= 3 ? "var(--amber)" : "var(--red)";
              const replied = r.replyStatus === "replied";
              return (
                <div key={r.id} className="nv-card" style={{ display: "flex", gap: 0, padding: 0, overflow: "hidden" }}>
                  <div style={{ width: 5, background: bar, flexShrink: 0 }} />
                  <div style={{ flex: 1, padding: "18px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {!replied && <input type="checkbox" checked={s} onChange={() => toggle(r.id)} style={{ width: 17, height: 17, accentColor: "var(--green)" }} />}
                      <NvStars v={r.rating} />
                      <span className={"nv-pill " + tc}>{tg}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r.product}</span>
                      {replied && <span className="nv-pill green"><NvIcon name="check" size={11} /> 답글완료</span>}
                      <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: "auto" }}>{r.time}</span>
                    </div>
                    <p style={{ margin: "12px 0 14px", fontSize: 13.5, lineHeight: 1.6 }}>{r.text}</p>
                    {r.reply ? <div style={{ background: "var(--green-tint)", borderRadius: 14, padding: "13px 16px", borderLeft: "3px solid var(--green)" }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--green-ink)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><NvIcon name="sparkles" size={12} /> {replied ? "등록된 답글" : "AI 생성 답글"}</div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{r.reply}</div>
                    </div> : <div style={{ fontSize: 12.5, color: "var(--ink-3)", padding: "10px 14px", background: "var(--line-2)", borderRadius: 12 }}>아직 답글이 생성되지 않았어요. 자동 답글이 켜져 있으면 AI가 곧 초안을 만들어요.</div>}
                    {!replied && <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                      <button className="nv-btn ghost sm"><NvIcon name="refresh" size={12} /> {r.reply ? "다시 생성" : "답글 생성"}</button>
                      {r.reply && <button className="nv-btn ghost sm">수정</button>}
                      <button className={"nv-btn sm " + (s ? "primary" : "ghost")} onClick={() => toggle(r.id)}>{s ? <><NvIcon name="check" size={12} /> 선택됨</> : "선택"}</button>
                    </div>}
                  </div>
                </div>
              );
            })}
          </div>
          );
          })()}
        </>
      )}

      {tab === "inq" && (
        <>
          <div style={{ marginBottom: 16 }}>
            <NvBanner tone="green" icon="sparkles">
              <b>문의가 들어오면 AI가 분류·요약하고 텔레그램으로 보내드려요.</b> 사장님은 텔레그램에서 톡하듯 답장만 하면 네이버에 자동 등록돼요.
            </NvBanner>
          </div>

          <NvStatRow cols={3}>
            <NvStat label="미응답 문의" value={INQUIRIES.length} unit="건" icon="chat" tone="amber" sub="AI 초안 준비됨" subTone="warn" />
            <NvStat label="오늘 처리" value="12" unit="건" icon="check" tone="green" sub="텔레그램·직접 답변" subTone="up" />
            <NvStat label="평균 응답 시간" value="6" unit="분" icon="clock" tone="blue" sub="문의 접수 → 답변" subTone="up" />
          </NvStatRow>

          {/* 분류 필터 */}
          <NvSeg style={{ marginBottom: 16 }} value={inqFilter} onChange={setInqFilter} tabs={INQ_CATS.map(c => [c, c])} />

          {/* 문의 리스트 */}
          {shownInq.length === 0 ? (
            <NvEmpty icon="check" title="해당 분류의 미응답 문의가 없어요" desc="다른 분류를 선택하거나 전체를 확인해 보세요." tone="violet" />
          ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {shownInq.map(q => {
              const open = inqOpen.has(q.id);
              return (
                <div key={q.id} className="nv-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 10 }}>
                    <span className={"nv-pill " + (CAT_TONE[q.cat] || "gray")}>{q.cat}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{q.product}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--ink-3)" }}>{q.buyer} · {q.time}</span>
                  </div>

                  <div style={{ display: "flex", gap: 9, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 9, background: "var(--line-2)", display: "grid", placeItems: "center", color: "var(--ink-2)", flexShrink: 0 }}><NvIcon name="user" size={14} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, paddingTop: 4 }}>{q.summary}</div>
                      <button onClick={() => toggleInq(q.id)} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 12, fontWeight: 600, color: "var(--ink-2)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        <NvIcon name={open ? "arrowUp" : "arrowDown"} size={13} /> 원문 {open ? "접기" : "보기"}
                      </button>
                      {open && <div style={{ marginTop: 8, padding: "11px 14px", borderRadius: 11, background: "var(--line-2)", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6 }}>"{q.raw}"</div>}
                    </div>
                  </div>

                  <NvField>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--green-ink)", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}><NvIcon name="sparkles" size={12} /> AI 답변 초안</div>
                    <textarea className="nv-input" rows="3" value={drafts[q.id]} onChange={e => setDrafts(d => ({ ...d, [q.id]: e.target.value }))} style={{ lineHeight: 1.6 }} />
                  </NvField>

                  <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button className="nv-btn ghost sm" onClick={() => { setDrafts(d => ({ ...d, [q.id]: q.draft })); fakeToast("AI 초안을 다시 생성했어요."); }}><NvIcon name="refresh" size={12} /> 다시 생성</button>
                    <button className="nv-btn ghost sm" onClick={() => fakeToast("답변을 등록했어요. (목업)")}>여기서 답변</button>
                    <button className="nv-btn primary sm" onClick={() => fakeToast("문의에 답변을 등록했어요. 네이버에 자동 반영돼요.")}><NvIcon name="send" size={13} /> 문의 답변하기</button>
                  </div>
                </div>
              );
            })}
          </div>
          )}

          {/* 처리 완료 이력 */}
          <div className="nv-card" style={{ marginTop: 16 }}>
            <div className="nv-card-h" style={{ flexWrap: "wrap", gap: 10 }}>
              <h3 className="nv-card-t">처리 완료 이력 <span className="nv-card-hint" style={{ fontWeight: 500 }}>{INQ_DONE.length}건</span></h3>
              <input className="nv-input" value={doneSearch} onChange={e => setDoneSearch(e.target.value)} placeholder="상품·내용 검색" style={{ width: 220 }} />
            </div>
            {shownDone.length === 0 ? (
              <div style={{ padding: "28px 0", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>검색 결과가 없어요.</div>
            ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {shownDone.map(d => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "var(--line-2)" }}>
                  <span className={"nv-pill " + (CAT_TONE[d.cat] || "gray")}>{d.cat}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.product}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 1 }}>{d.summary}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span className="nv-pill green"><NvIcon name="check" size={11} /> {d.via}</span>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{d.time}</div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </>
      )}

      {/* 가짜 토스트 */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", alignItems: "center", gap: 9, padding: "13px 20px", borderRadius: 14, background: "var(--ink)", color: "#fff", fontSize: 13.5, fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,.25)", maxWidth: "90vw" }}>
          <NvIcon name="check" size={16} /> {toast}
        </div>
      )}
    </>
  );
}

import { useState, useRef, useEffect } from "react";
import NvIcon from "../components/NvIcon";
import { NvPageHead, NvField, NvBanner } from "../components/atoms";

// 목업 페이지 — 실제 AI/Commerce API·업로드 연결 없음.
// [AI로 생성하기]는 setTimeout 가짜 로딩 후 하드코딩 결과(골드밤 예시)를 표시한다.
// 사진은 실제 파일 선택창/드래그&드롭으로 받아 로컬 미리보기만 한다(업로드 안 함).

// 필수 항목 뱃지
const Req = () => (
  <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--red)", background: "var(--red-soft)", padding: "1px 5px", borderRadius: 5, lineHeight: 1.5 }}>필수</span>
);

// 등록 필드 한 줄 (라벨 + 값 + 필수)
const Row = ({ label, value, req }) => (
  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 13px", borderRadius: 11, background: "var(--line-2)" }}>
    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", width: 104, flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}>
      {label}{req && <Req />}
    </span>
    <span style={{ fontSize: 13, fontWeight: 600, flex: 1, lineHeight: 1.5 }}>{value}</span>
  </div>
);

// 그룹 소제목 + 내용
const FieldGroup = ({ title, badge, note, children, first }) => (
  <div style={{ paddingTop: first ? 0 : 16, marginTop: first ? 0 : 16, borderTop: first ? "none" : "1px solid var(--line)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <h4 style={{ fontSize: 12.5, fontWeight: 800, color: "var(--ink-2)", letterSpacing: "0.01em" }}>{title}</h4>
      {badge}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{children}</div>
    {note && <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.6 }}>{note}</div>}
  </div>
);

const RESULT = {
  name: "앙쥬 24K 골드 멀티밤 9g 안티에이징 탄력 멀티밤 1+1 선물세트",
  category: "화장품/미용 > 스킨케어 > 멀티밤",
  categoryCode: "50000189",
  detailText:
    "24K 골드 성분을 담은 멀티밤으로, 눈가·입가 등 탄력이 필요한 부위에 간편하게 사용할 수 있습니다. " +
    "끈적임 없이 스며드는 밤 타입으로 데일리 안티에이징 케어에 적합합니다. 9g 슬림 사이즈로 휴대도 간편해요.",
  tags: ["멀티밤", "골드밤", "안티에이징밤", "탄력케어", "페이스밤"],
};

export default function ProductReg() {
  const [text, setText] = useState("");
  const [cat, setCat] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | loading | done
  const [name, setName] = useState(RESULT.name);
  const [toast, setToast] = useState("");

  // 사진 (로컬 미리보기만)
  const [photos, setPhotos] = useState([]); // {id, url, name}
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const urlsRef = useRef([]);

  // 언마운트 시 objectURL 정리(누수 방지)
  useEffect(() => () => { urlsRef.current.forEach((u) => URL.revokeObjectURL(u)); }, []);

  const addFiles = (fileList) => {
    const imgs = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setPhotos((prev) => {
      const room = Math.max(0, 10 - prev.length);
      return [
        ...prev,
        ...imgs.slice(0, room).map((f, i) => {
          const url = URL.createObjectURL(f);
          urlsRef.current.push(url);
          return { id: `${f.name}-${f.size}-${prev.length + i}-${f.lastModified}`, url, name: f.name };
        }),
      ];
    });
  };

  const removePhoto = (id) => {
    setPhotos((prev) => {
      const t = prev.find((p) => p.id === id);
      if (t) { URL.revokeObjectURL(t.url); urlsRef.current = urlsRef.current.filter((u) => u !== t.url); }
      return prev.filter((p) => p.id !== id);
    });
  };

  const onDrop = (e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); };

  const generate = () => {
    setPhase("loading");
    setTimeout(() => { setName(RESULT.name); setPhase("done"); }, 1500);
  };

  const fakeToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2600); };

  const addCount = Math.max(0, photos.length - 1);

  return (
    <>
      <NvPageHead
        title="상품 등록"
        sub="상품 정보와 사진만 주면 AI가 상세페이지·카테고리·등록 항목까지 전부 만들어 드려요. 확인하고 등록만 누르세요."
      />

      {/* ───────── 입력 영역 ───────── */}
      <div className="nv-card" style={{ marginBottom: 16 }}>
        <div className="nv-card-h">
          <h3 className="nv-card-t">상품 정보 입력</h3>
          <span className="nv-card-hint">한 번에 자유롭게</span>
        </div>

        <NvField label="상품 정보">
          <textarea
            className="nv-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="상품 정보를 자유롭게 적어주세요. 예) 앙쥬 24k 골드 멀티밤 9g, 안티에이징·탄력, 정가 25000원, 1+1 행사…"
            style={{ minHeight: 120, resize: "vertical", lineHeight: 1.6 }}
          />
        </NvField>

        <NvField label="카테고리 직접 지정(선택)" hint="비우면 AI가 자동 분류해요">
          <input
            className="nv-input"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            placeholder="예) 화장품/미용 > 스킨케어 > 멀티밤"
          />
        </NvField>

        {/* 사진 — 실제 파일 선택창 + 드래그&드롭 */}
        <NvField label="상품 사진">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragOver ? "var(--green)" : "var(--line)"}`,
              borderRadius: 16, padding: "22px 18px", cursor: "pointer",
              background: dragOver ? "var(--green-soft)" : "var(--line-2)", textAlign: "center",
              transition: "border-color .12s, background .12s",
            }}
          >
            <div className="nv-ic-tile green" style={{ width: 46, height: 46, borderRadius: 14, margin: "0 auto 10px" }}>
              <NvIcon name="plus" size={22} />
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>사진을 끌어다 놓거나 클릭해서 올려주세요</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>JPG·PNG · 대표컷 1장 권장 · 최대 10장 ({photos.length}/10)</div>
          </div>

          {/* 썸네일 미리보기 (선택한 파일) */}
          {photos.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
              {photos.map((p, i) => (
                <div key={p.id} style={{ textAlign: "center" }}>
                  <div style={{ position: "relative", width: 84, height: 84, borderRadius: 12, overflow: "hidden", border: i === 0 ? "2px solid var(--green)" : "1px solid var(--line)" }}>
                    <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <button
                      onClick={(e) => { e.stopPropagation(); removePhoto(p.id); }}
                      title="삭제"
                      style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "rgba(20,24,22,.66)", color: "#fff", display: "grid", placeItems: "center", border: "none", cursor: "pointer" }}
                    >
                      <NvIcon name="x" size={12} />
                    </button>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "var(--green-ink)" : "var(--ink-3)", marginTop: 5 }}>
                    {i === 0 ? "대표컷" : `추가 ${i}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </NvField>

        <button
          className="nv-btn primary"
          onClick={generate}
          disabled={phase === "loading"}
          style={{ width: "100%", marginTop: 6, justifyContent: "center" }}
        >
          {phase === "loading" ? (
            <><span className="nv-spin" /> AI가 생성하는 중…</>
          ) : (
            <><NvIcon name="sparkles" size={16} /> AI로 생성하기</>
          )}
        </button>
      </div>

      {/* ───────── 결과 영역 ───────── */}
      {phase === "done" && (
        <>
          <div style={{ marginBottom: 16 }}>
            <NvBanner tone="green" icon="sparkles">
              <b>상품정보제공고시·SEO·옵션까지 자동 작성했어요.</b> 확인 후 등록하세요.
            </NvBanner>
          </div>

          {/* 추천 상품명 (수정 가능) */}
          <div className="nv-card" style={{ marginBottom: 16 }}>
            <div className="nv-card-h">
              <h3 className="nv-card-t">추천 상품명</h3>
              <span className="nv-pill green"><NvIcon name="check" size={12} /> SEO 최적화</span>
            </div>
            <NvField hint="검색 키워드를 반영해 자동 작성했어요. 직접 수정할 수 있어요.">
              <input className="nv-input" value={name} onChange={(e) => setName(e.target.value)} />
            </NvField>
          </div>

          {/* 등록 필드 요약 ① — 기본 / 가격·재고 / 이미지 / 상세 / 배송 */}
          <div className="nv-card" style={{ marginBottom: 16 }}>
            <div className="nv-card-h">
              <h3 className="nv-card-t">등록 필드 요약 — 기본</h3>
              <span className="nv-card-hint">POST /external/v2/products · originProduct</span>
            </div>

            <FieldGroup title="① 기본 정보" first>
              <Row label="상품명" value={name} req />
              <Row label="판매상태" value="판매중 (SALE)" req />
              <Row label="상품유형" value="신상품 (NEW)" req />
              <Row label="카테고리" value={`${RESULT.category} (${RESULT.categoryCode})`} req />
            </FieldGroup>

            <FieldGroup title="② 가격·재고">
              <Row label="판매가" value="25,000원" req />
              <Row label="재고수량" value="100" req />
              <Row label="즉시할인" value="없음" />
              <Row label="옵션" value="단일상품" />
            </FieldGroup>

            <FieldGroup title="③ 이미지" note="원본 파일은 이미지 업로드 API로 올린 뒤 URL로 등록됩니다(추후 연결).">
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {(photos.length ? photos.slice(0, 3) : [null, null, null]).map((p, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ width: 64, height: 64, borderRadius: 11, overflow: "hidden", border: i === 0 ? "2px solid var(--green)" : "1px solid var(--line)", background: "var(--line-2)", display: "grid", placeItems: "center", color: "var(--ink-3)" }}>
                      {p ? <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <NvIcon name="box" size={20} />}
                    </div>
                    <div style={{ fontSize: 10.5, color: i === 0 ? "var(--green-ink)" : "var(--ink-3)", fontWeight: 700, marginTop: 4 }}>{i === 0 ? "대표" : `추가 ${i}`}</div>
                  </div>
                ))}
                <span style={{ fontSize: 12.5, color: "var(--ink-2)", marginLeft: 4 }}>
                  대표 1 · 추가 {photos.length ? addCount : 2} <Req />
                </span>
              </div>
            </FieldGroup>

            <FieldGroup title="④ 상세설명">
              <div style={{ padding: "13px 15px", borderRadius: 12, background: "var(--line-2)", fontSize: 12.5, lineHeight: 1.7 }}>{RESULT.detailText}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="nv-pill blue"><NvIcon name="check" size={11} /> HTML 자동 변환됨</span>
                <Req />
              </div>
            </FieldGroup>

            <FieldGroup title="⑤ 배송">
              <Row label="배송방법" value="택배 · CJ대한통운" req />
              <Row label="배송비" value="무료 (선불 / PREPAID)" />
              <Row label="반품·교환비" value="반품 3,000원 · 교환 4,000원" />
              <Row label="출고지·반품지" value="기본 주소록" />
            </FieldGroup>
          </div>

          {/* ★ 상품정보제공고시 (화장품) — 법적 필수 */}
          <div className="nv-card" style={{ marginBottom: 16, border: "1px solid #C9EED9" }}>
            <div className="nv-card-h" style={{ flexWrap: "wrap", gap: 8 }}>
              <h3 className="nv-card-t">⑥ 상품정보제공고시 (화장품 · COSMETIC)</h3>
              <span className="nv-pill green"><NvIcon name="sparkles" size={12} /> 법적 필수 항목 자동 완성</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              <Row label="용량·중량" value="9g" req />
              <Row label="제조업자" value="(주)앙쥬" req />
              <Row label="책임판매업자" value="(주)앙쥬 (제조업자와 동일)" req />
              <Row label="제조국" value="대한민국" req />
              <Row label="사용기한" value="제조일로부터 24개월" req />
              <Row label="기능성화장품" value="해당없음" />
              <Row label="주요성분" value="24K 골드 등" />
              <Row label="사용방법·주의사항" value="AI 자동 작성됨" />
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.6 }}>
              상품정보제공고시는 카테고리(상품군)에 따라 항목이 완전히 달라집니다. AI가 카테고리를 보고 해당 유형(화장품)을 채웠어요.
            </div>
          </div>

          {/* 등록 필드 요약 ② — 검색·노출·기타 */}
          <div className="nv-card" style={{ marginBottom: 16 }}>
            <div className="nv-card-h">
              <h3 className="nv-card-t">등록 필드 요약 — 검색·노출</h3>
              <span className="nv-card-hint">detailAttribute · smartstoreChannelProduct</span>
            </div>

            <FieldGroup title="⑦ 검색 / SEO" first note="🔑 황금키워드 엔진이 추천한 검색량 기반 태그 (추후 연결)">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 13px", borderRadius: 11, background: "var(--line-2)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", width: 104, flexShrink: 0, paddingTop: 3 }}>검색 태그</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
                  {RESULT.tags.map((t) => <span key={t} className="nv-chip green" style={{ fontSize: 11.5 }}>+ {t}</span>)}
                </div>
              </div>
              <Row label="제조사" value="(주)앙쥬" />
              <Row label="브랜드" value="앙쥬" />
              <Row label="모델명" value="AJ-GOLD-9G" />
            </FieldGroup>

            <FieldGroup title="⑧ 원산지 / A·S / 인증">
              <Row label="원산지" value="국산 (대한민국)" />
              <Row label="A/S 안내" value="1600-0000 · 제품 이상 시 교환·환불" />
              <Row label="인증" value="화장품 — 인증대상 아님 (표시사항 준수)" />
              <Row label="미성년자 구매" value="가능" />
            </FieldGroup>

            <FieldGroup title="⑨ 채널 노출 (smartstoreChannelProduct)">
              <Row label="채널 상품명" value={name} />
              <Row label="네이버쇼핑 노출" value="ON" />
              <Row label="전시 상태" value="전시중 (ON)" />
            </FieldGroup>
          </div>

          {/* 액션 버튼 */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="nv-btn primary" onClick={() => fakeToast("상품이 등록되었어요. (목업)")}>
              <NvIcon name="check" size={15} /> 이대로 등록
            </button>
            <button className="nv-btn ghost" onClick={() => fakeToast("수정 모드는 준비 중이에요.")}>수정</button>
            <button className="nv-btn ghost" onClick={generate}><NvIcon name="refresh" size={15} /> 다시 생성</button>
          </div>
        </>
      )}

      {/* 가짜 성공 토스트 */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", alignItems: "center", gap: 9, padding: "13px 20px", borderRadius: 14, background: "var(--ink)", color: "#fff", fontSize: 13.5, fontWeight: 700, boxShadow: "0 10px 30px rgba(0,0,0,.25)" }}>
          <NvIcon name="check" size={16} /> {toast}
        </div>
      )}
    </>
  );
}

import { useState, useRef, useEffect, useMemo } from "react";
import NvIcon from "../components/NvIcon";
import { NvPageHead, NvBanner, NvToggle } from "../components/atoms";
import { detailGenerate } from "../lib/api";

// 상품 등록 — 2단계
//  ① 편집(작업실 분할형): 왼쪽 자유 입력 + 사진(제품/상세페이지용) + 오른쪽 실시간 미리보기
//  ② 검토: 버튼 1회로 상세페이지 HTML + 등록정보를 한 번에 생성 → (A)상세페이지 (B)AI추정 (C)셀러입력 폼
// · 사진 업로드는 로컬 미리보기(dataURI는 API 전송용으로 함께 보관)
// · 가격·감지칩·키워드·글자수는 입력에서 실시간 파싱(UX용 — 최종 결과는 실 API만 사용)

const won = (n) => (n == null ? null : Number(n).toLocaleString("ko-KR"));
const onlyNum = (s) => Number(String(s).replace(/[^\d]/g, ""));
const isEmpty = (v) => String(v ?? "").trim() === "";

// 입력 텍스트에서 가격/용량/행사/키워드를 가볍게 파싱 (편집 단계 실시간 미리보기 전용)
function analyze(text) {
  const t = text || "";
  const pick = (re) => { const m = t.match(re); return m ? onlyNum(m[1]) : null; };

  let list = pick(/정가\s*([\d,]+)/);
  let sale = pick(/(?:행사가|판매가|할인가|특가)\s*([\d,]+)/);
  const arrow = t.match(/([\d,]{3,})\s*원?\s*(?:→|->|~|=>)\s*([\d,]{3,})/);
  if (arrow) { if (list == null) list = onlyNum(arrow[1]); if (sale == null) sale = onlyNum(arrow[2]); }
  if (list != null && sale == null) sale = list;
  if (list == null && sale != null) list = sale;
  const discount = list && sale && list > sale ? Math.round((1 - sale / list) * 100) : null;

  const volMatch = t.match(/(\d+\s?(?:g|kg|ml|l|매|개|정|포|호))\b/i);
  const vol = volMatch ? volMatch[1].replace(/\s/g, "") : null;
  const hasVolume = !!vol;
  const hasPromo = /1\s?\+\s?1|2\s?\+\s?1|증정|행사|할인|세일|쿠폰|특가|\d+\s?%/.test(t);
  const hasName = t.trim().replace(/\s/g, "").length >= 2;
  const hasPrice = list != null || sale != null || /\d{3,}\s*원/.test(t);

  const lex = ["안티에이징", "탄력", "보습", "미백", "주름개선", "수분", "진정", "끈적임없는", "저자극", "민감성", "건성", "지성", "대용량", "선물세트", "페이스"];
  const compact = t.replace(/\s/g, "");
  const found = [];
  if (/골드/.test(t)) found.push(/밤/.test(t) ? "골드밤" : "골드");
  lex.forEach((k) => { if (compact.includes(k) && !found.includes(k)) found.push(k); });
  if (/1\s?\+\s?1/.test(t)) found.push("1+1");
  const tags = (t.match(/#([^\s#]+)/g) || []).map((s) => s.slice(1));
  const keywords = (tags.length ? tags : found).slice(0, 6);

  return { list, sale, discount, vol, hasName, hasVolume, hasPrice, hasPromo, keywords, len: t.length };
}

// ── 페이로드 조립 (§7 표대로). 지금은 조립+로그까지만, 네이버 전송은 다음 단계. ──
function buildPayload(result, sellerInput, name) {
  const reg = result?.registration || {};
  const ai = reg.ai_estimated || {};
  const sr = reg.seller_required || {};
  const nt = sr.noticeType || "ETC";
  const si = sellerInput || {};

  const notice = {}; // sellerInput.notice 의 키→값 그대로
  Object.entries(si.notice || {}).forEach(([k, v]) => { notice[k] = v; });

  const fee = Number(si.deliveryFee) || 0;

  return {
    originProduct: {
      statusType: "SALE",
      name: name || ai.name || "",
      detailContent: result?.html || "",
      images: { representativeImage: { url: "" /* 대표사진 URL — 다음단계 */ }, optionalImages: [] },
      salePrice: Number(si.salePrice ?? ai.salePrice) || 0,
      leafCategoryId: si.leafCategoryId || ai.leafCategoryId || "",
      stockQuantity: Number(si.stockQuantity) || 0,
      deliveryInfo: {
        deliveryFee: { deliveryFeeType: fee > 0 ? "PAID" : "FREE", baseFee: fee },
      },
      detailAttribute: {
        afterServiceInfo: { afterServiceTelephoneNumber: si.afterServicePhone || "" },
        originAreaInfo: { originAreaCode: si.origin || "" },
        taxType: "TAX",
        seoInfo: { sellerTags: (ai.searchTags || []).map((t) => ({ text: t })) },
        productInfoProvidedNotice: { productInfoProvidedNoticeType: nt, [nt.toLowerCase()]: notice },
        ...(sr.functional?.["여부"]
          ? { certificationInfo: { certificationNumber: si.functionalCertNumber || "" } }
          : {}),
      },
    },
    smartstoreChannelProduct: {
      channelProductDisplayStatusType: "ON",
      naverShoppingRegistration: si.naverShopping ?? true,
    },
  };
}

// ── 작은 컴포넌트들 ──
const DetChip = ({ on, label }) => (
  <span className={"pr-detchip" + (on ? " on" : "")}>
    {on && <NvIcon name="check" size={12} />} {label}
  </span>
);

const Req = () => (
  <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--red)", background: "var(--red-soft)", padding: "1px 5px", borderRadius: 5, lineHeight: 1.5 }}>필수</span>
);

// 셀러 입력 한 줄 (편집 가능한 input)
const InpRow = ({ label, value, onChange, required, source, type = "text", placeholder, hint }) => {
  const empty = isEmpty(value);
  return (
    <div className="pr-inprow">
      <div className="pr-inplab">{label}{required && <Req />}</div>
      <div className="pr-inpcol">
        <input
          className={"pr-inp" + (required && empty ? " miss" : "")}
          type={type}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="pr-inpmeta">
          {source && !empty && (
            <span className="pr-srcok"><NvIcon name="check" size={10} /> {source}에서 추출 · 확인</span>
          )}
          {hint && <span className="pr-inphint">{hint}</span>}
        </div>
      </div>
    </div>
  );
};

// 사진 업로드 칸 (제품 / 상세페이지용 공용)
function PhotoBox({ photos, which, drag, setDrag, inputRef, onAdd, onRemove }) {
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => { onAdd(e.target.files, which); e.target.value = ""; }}
      />
      <div
        className="pr-photos"
        onDragOver={(e) => { e.preventDefault(); setDrag(which); }}
        onDragLeave={() => setDrag("")}
        onDrop={(e) => { e.preventDefault(); setDrag(""); onAdd(e.dataTransfer.files, which); }}
      >
        {photos.map((p, i) => (
          <div className="pr-tile" key={p.id}>
            <img src={p.url} alt={p.name} />
            {i === 0 && <span className="rep">대표</span>}
            <button className="del" title="삭제" onClick={() => onRemove(p.id, which)}>
              <NvIcon name="x" size={12} />
            </button>
          </div>
        ))}
        {photos.length < 10 && (
          <div
            className={"pr-add" + (drag === which ? " drag" : "") + (photos.length === 0 ? " wide" : "")}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          >
            <NvIcon name="plus" size={photos.length === 0 ? 24 : 20} />
            <span>{photos.length === 0 ? "사진 끌어다 놓거나 클릭" : "추가"}</span>
          </div>
        )}
      </div>
    </>
  );
}

export default function ProductReg() {
  const [text, setText] = useState("");
  const [productPhotos, setProductPhotos] = useState([]); // {id,url,name,dataUri}
  const [detailPhotos, setDetailPhotos] = useState([]);
  const [drag, setDrag] = useState(""); // "" | "product" | "detail"
  const [phase, setPhase] = useState("edit"); // edit | loading | review
  const [result, setResult] = useState(null); // { profile, registration, html, genLog }
  const [sellerInput, setSellerInput] = useState(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const productRef = useRef(null);
  const detailRef = useRef(null);
  const urlsRef = useRef([]);

  useEffect(() => () => urlsRef.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const a = useMemo(() => analyze(text), [text]);
  const hasInput = text.trim().length > 0;

  // 사진 추가 — 미리보기(objectURL) + dataURI(FileReader, API 전송용) 둘 다 보관
  const addFiles = (fileList, which) => {
    const imgs = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    const setter = which === "detail" ? setDetailPhotos : setProductPhotos;
    setter((prev) => {
      const room = Math.max(0, 10 - prev.length);
      const next = imgs.slice(0, room).map((f, i) => {
        const url = URL.createObjectURL(f);
        urlsRef.current.push(url);
        const id = `${which}-${f.name}-${f.size}-${prev.length + i}-${f.lastModified}`;
        const reader = new FileReader();
        reader.onload = () => {
          const du = reader.result;
          setter((cur) => cur.map((p) => (p.id === id ? { ...p, dataUri: du } : p)));
        };
        reader.readAsDataURL(f);
        return { id, url, name: f.name, dataUri: null };
      });
      return [...prev, ...next];
    });
  };

  const removePhoto = (id, which) => {
    const setter = which === "detail" ? setDetailPhotos : setProductPhotos;
    setter((prev) => {
      const tgt = prev.find((p) => p.id === id);
      if (tgt) { URL.revokeObjectURL(tgt.url); urlsRef.current = urlsRef.current.filter((u) => u !== tgt.url); }
      return prev.filter((p) => p.id !== id);
    });
  };

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2600); };

  // API 결과 → 셀러 입력 폼 초기값 (추출값 있으면 기본채움)
  const initSellerInput = (r) => {
    const reg = r?.registration || {};
    const ai = reg.ai_estimated || {};
    const sr = reg.seller_required || {};
    const notice = {};
    Object.entries(sr.notice || {}).forEach(([k, v]) => { notice[k] = v?.value ?? ""; });
    setSellerInput({
      salePrice: ai.salePrice != null ? String(ai.salePrice) : "",
      leafCategoryId: ai.leafCategoryId != null ? String(ai.leafCategoryId) : "",
      stockQuantity: sr.stockQuantity != null ? String(sr.stockQuantity) : "",
      deliveryFee: sr.deliveryFee != null ? String(sr.deliveryFee) : "",
      afterServicePhone: sr.afterServicePhone?.value ?? "",
      origin: sr.origin?.value ?? "",
      functionalCertNumber: sr.functional?.["심사필인증번호"] ?? "",
      naverShopping: true,
      notice,
    });
    setName(ai.name || "");
  };

  const generate = async () => {
    if (!hasInput) return;
    setError("");
    setPhase("loading");
    try {
      const detailImg = detailPhotos[0]?.dataUri || productPhotos[0]?.dataUri || null;
      const r = await detailGenerate({ desc: text, template: "point_light", image: detailImg });
      setResult(r);
      initSellerInput(r);
      setPhase("review");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e?.message || "생성에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setPhase("edit");
    }
  };

  // 검토 단계 파생값
  const reg = result?.registration || {};
  const ai = reg.ai_estimated || {};
  const sr = reg.seller_required || {};
  const noticeLabels = reg._notice_labels || {};
  const noticeKeys = Object.keys(sr.notice || {});

  const setSI = (patch) => setSellerInput((s) => ({ ...s, ...patch }));
  const setNotice = (k, v) => setSellerInput((s) => ({ ...s, notice: { ...s.notice, [k]: v } }));

  // 필수 입력 항목 + 미완성 개수
  const requiredEntries = useMemo(() => {
    if (!result || !sellerInput) return [];
    const ents = [
      { value: sellerInput.salePrice },
      { value: sellerInput.leafCategoryId },
      { value: sellerInput.stockQuantity },
      { value: sellerInput.deliveryFee },
      { value: sellerInput.afterServicePhone },
      { value: sellerInput.origin },
      ...noticeKeys.map((k) => ({ value: sellerInput.notice?.[k] })),
    ];
    if (sr.functional?.["여부"]) ents.push({ value: sellerInput.functionalCertNumber });
    return ents;
  }, [result, sellerInput, noticeKeys, sr]);

  const missingCount = requiredEntries.filter((e) => isEmpty(e.value)).length;
  const canRegister = result && sellerInput && missingCount === 0;

  const genFail = (result?.genLog || []).filter((g) => !g.ok).length;
  const genTotal = (result?.genLog || []).length;

  const onRegister = () => {
    if (!canRegister) return;
    const payload = buildPayload(result, sellerInput, name);
    // 지금은 조립+로그까지만 (네이버 전송은 다음 단계)
    console.log("[ProductReg] v2/products 페이로드 (조립만, 전송 안 함):", payload);
    showToast("등록 준비 완료 — 네이버 전송은 다음 단계예요.");
  };

  return (
    <>
      <style>{PRX_CSS}</style>

      <NvPageHead
        title="상품 등록"
        sub={
          phase === "review"
            ? "AI가 만든 상세페이지와 등록정보를 확인하고, 셀러 필수 항목을 채운 뒤 등록하세요."
            : "왼쪽에 정보·사진을 넣으면, 오른쪽에서 AI가 어떻게 이해했는지 실시간으로 확인할 수 있어요."
        }
      />

      {phase !== "review" && error && (
        <div style={{ marginBottom: 14 }}>
          <NvBanner tone="red" icon="bell">{error}</NvBanner>
        </div>
      )}

      {/* ═══════════ ① 편집 (작업실 분할형) ═══════════ */}
      {phase !== "review" && (
        <>
          <div className="pr-split">
            {/* 왼쪽: 상품 정보 입력 */}
            <div className="nv-card">
              <div className="nv-card-h">
                <div className="pr-cardtitle">
                  <span className="pr-icontile"><NvIcon name="sparkles" size={15} /></span>
                  <h3 className="nv-card-t">상품 정보 입력</h3>
                </div>
                <span className="nv-pill green">한 번에 자유롭게</span>
              </div>

              <div className="pr-labelrow">
                <span className="pr-label">상품 정보</span>
                <span className="pr-req">필수</span>
              </div>
              <div className="pr-detchips">
                <DetChip on={a.hasName} label="브랜드·제품명" />
                <DetChip on={a.hasVolume} label="용량" />
                <DetChip on={a.hasPrice} label="가격" />
                <DetChip on={a.hasPromo} label="행사" />
              </div>

              <div className="pr-ta">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 1000))}
                  placeholder={"상품 정보를 자유롭게 적어주세요.\n예) 앙쥬 24K 골드 멀티밤 9g, 안티에이징·탄력, 정가 25,000원 → 19,900원 (1+1)…"}
                />
                <div className="pr-ta-foot">
                  <span className="pr-ta-live"><span className="pr-livedot" /> 실시간 분석 중</span>
                  <span className="pr-count">{a.len} / 1,000</span>
                </div>
              </div>

              {/* 제품 이미지 (네이버 등록용) */}
              <div className="pr-labelrow" style={{ marginTop: 18 }}>
                <span className="pr-label">제품 이미지</span>
                <span className="nv-card-hint">네이버 등록용 · 대표컷 1장 권장 · {productPhotos.length}/10</span>
              </div>
              <PhotoBox
                photos={productPhotos} which="product" drag={drag} setDrag={setDrag}
                inputRef={productRef} onAdd={addFiles} onRemove={removePhoto}
              />
              <div className="pr-photohint">JPG·PNG · 장당 10MB · 첫 장이 대표컷</div>

              {/* 상세페이지용 이미지 (연출컷 생성 원본) */}
              <div className="pr-labelrow" style={{ marginTop: 18 }}>
                <span className="pr-label">상세페이지용 이미지 (연출컷 생성)</span>
                <span className="nv-card-hint">AI 연출컷 원본 · {detailPhotos.length}/10</span>
              </div>
              <PhotoBox
                photos={detailPhotos} which="detail" drag={drag} setDrag={setDrag}
                inputRef={detailRef} onAdd={addFiles} onRemove={removePhoto}
              />
              <div className="pr-photohint">없으면 제품 대표컷으로 자동 대체돼요.</div>
            </div>

            {/* 오른쪽: AI가 이렇게 이해했어요 (실시간 미리보기 — UX용) */}
            <div className="nv-card">
              <div className="pr-rhead">
                <span className="pr-livedot lg" />
                <h3 className="nv-card-t">AI가 이렇게 이해했어요</h3>
              </div>

              {hasInput ? (
                <>
                  <div className="pr-sec first">
                    <div className="pr-sec-lab">감지된 가격</div>
                    <div className="pr-prices">
                      <div className="pr-pb">
                        <div className="l">정가</div>
                        <div className={"v" + (a.discount != null ? " strk" : "")}>{won(a.list) ?? "—"}</div>
                      </div>
                      <div className="pr-pb sale">
                        <div className="l">판매가</div>
                        <div className="v">{won(a.sale) ?? "—"}</div>
                      </div>
                      <div className="pr-pb disc">
                        <div className="l">할인</div>
                        <div className="v">{a.discount != null ? a.discount + "%" : "—"}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pr-sec">
                    <div className="pr-sec-lab">추출 키워드</div>
                    <div className="pr-kw">
                      {a.keywords.length ? (
                        a.keywords.map((k) => <span className="nv-chip" key={k}>#{k}</span>)
                      ) : (
                        <span className="pr-muted">키워드를 분석하고 있어요…</span>
                      )}
                    </div>
                  </div>

                  <div className="pr-sec">
                    <div className="pr-sec-lab">상세페이지</div>
                    <div className="pr-skel">
                      <i style={{ width: "42%" }} />
                      <i style={{ width: "90%" }} />
                      <i style={{ width: "78%" }} />
                      <i style={{ width: "63%" }} />
                    </div>
                    <div className="pr-skel-note"><NvIcon name="clock" size={13} /> 버튼을 누르면 AI가 상세페이지·연출컷·등록정보를 만들어요</div>
                  </div>
                </>
              ) : (
                <div className="pr-empty">
                  <NvIcon name="sparkles" size={26} />
                  <div className="t">왼쪽에 상품 정보를 입력해 주세요</div>
                  <div className="d">입력하는 즉시 AI가 이해한 내용을 여기에 보여드려요.</div>
                </div>
              )}
            </div>
          </div>

          {/* 하단 CTA — 버튼 1개로 상세페이지 + 등록정보 한 번에 */}
          <div className="pr-cta-row">
            <div className="pr-cta-note">상세페이지(연출컷 포함)와 네이버 등록 요소를 한 번에 만들어 확인 화면을 보여드려요.</div>
            <button className="pr-cta" onClick={generate} disabled={phase === "loading" || !hasInput}>
              {phase === "loading"
                ? <><span className="nv-spin" /> AI가 상세페이지·연출컷·등록정보를 만들고 있어요 (수십 초)</>
                : <><NvIcon name="sparkles" size={18} /> 상세페이지 생성 및 상품등록 요소 자동 정렬</>}
            </button>
          </div>
        </>
      )}

      {/* ═══════════ ② 검토 ═══════════ */}
      {phase === "review" && result && (
        <>
          <div className="pr-reviewbar">
            <button className="nv-btn ghost sm" onClick={() => setPhase("edit")}>
              <span style={{ display: "inline-flex", transform: "scaleX(-1)" }}><NvIcon name="arrowR" size={13} /></span> 다시 작성
            </button>
            <span className="nv-card-hint">아래 항목으로 네이버 스마트스토어에 등록됩니다</span>
          </div>

          {/* 요약 히어로 */}
          <div className="pr-hero">
            <div className="pr-hero-top">
              <span className="nv-pill green"><NvIcon name="sparkles" size={12} /> AI가 상세페이지와 등록정보를 만들었어요</span>
              {missingCount > 0
                ? <span className="pr-missbadge"><NvIcon name="bell" size={12} /> 미완성 {missingCount}건</span>
                : <span className="pr-hero-count"><NvIcon name="check" size={13} /> 셀러 입력 완료</span>}
            </div>
            <input
              className="pr-hero-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              spellCheck={false}
              placeholder="상품명"
            />
            <div className="pr-hero-namehint">AI 추정 상품명이에요. 눌러서 바로 수정할 수 있어요.</div>
            {ai.categoryPath && (
              <div className="pr-hero-catrow">
                <span className="pr-catpill"><NvIcon name="tag" size={12} /> {ai.categoryPath}</span>
              </div>
            )}
          </div>

          {/* (A) 상세페이지 미리보기 */}
          <div className="nv-card pr-fcard">
            <div className="nv-card-h">
              <h3 className="nv-card-t">A · 상세페이지 미리보기</h3>
              <span className="nv-card-hint">originProduct.detailContent</span>
            </div>
            {genTotal > 0 && genFail > 0 && (
              <div style={{ margin: "0 0 12px" }}>
                <NvBanner tone="amber" icon="bell">
                  연출컷 {genTotal}장 중 {genFail}장 생성 실패 — 해당 컷은 원본 이미지로 대체했어요.
                </NvBanner>
              </div>
            )}
            {result.html ? (
              <iframe
                title="상세페이지 미리보기"
                style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 12, height: 1200, background: "#fff" }}
                srcDoc={result.html}
              />
            ) : (
              <div className="pr-muted">상세페이지 HTML이 비어 있어요.</div>
            )}
          </div>

          {/* (B) AI 추정 등록정보 */}
          <div className="nv-card pr-fcard pr-aiest">
            <div className="nv-card-h">
              <div className="pr-cardtitle">
                <span className="pr-icontile"><NvIcon name="sparkles" size={15} /></span>
                <h3 className="nv-card-t">B · AI 추정 등록정보</h3>
              </div>
              <span className="nv-pill green">AI 자동 추정</span>
            </div>

            <div className="pr-grow">
              <span className="k">상품명</span>
              <span className="vv">{ai.name || "—"}</span>
            </div>
            <div className="pr-grow">
              <span className="k">카테고리</span>
              <span className="vv">
                {ai.categoryPath || "—"}
                {ai.leafCategoryId ? <span className="pr-muted"> · leaf {ai.leafCategoryId}</span> : null}
              </span>
            </div>
            <div className="pr-grow">
              <span className="k">추정 판매가</span>
              <span className="vv">{won(ai.salePrice) ? `${won(ai.salePrice)}원` : "—"}</span>
            </div>
            <div className="pr-grow" style={{ alignItems: "flex-start" }}>
              <span className="k" style={{ paddingTop: 3 }}>검색 태그</span>
              <div className="vv" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(ai.searchTags || []).length
                  ? ai.searchTags.map((t) => <span key={t} className="nv-chip green" style={{ fontSize: 11.5 }}>+ {t}</span>)
                  : <span className="pr-muted">—</span>}
              </div>
            </div>
          </div>

          {/* (C) 셀러 입력 필요 — 실제 입력 폼 */}
          {sellerInput && (
            <div className="nv-card pr-fcard pr-seller">
              <div className="nv-card-h">
                <div className="pr-cardtitle">
                  <span className="pr-icontile amber"><NvIcon name="shield" size={15} /></span>
                  <h3 className="nv-card-t">C · 셀러 입력 필요</h3>
                </div>
                {missingCount > 0
                  ? <span className="pr-missbadge"><NvIcon name="bell" size={12} /> 미완성 {missingCount}건</span>
                  : <span className="nv-pill green"><NvIcon name="check" size={12} /> 모두 입력됨</span>}
              </div>

              <div className="pr-formnote">네이버 v2/products 등록에 필수인 항목이에요. AI가 추출한 값은 미리 채워뒀어요 — 확인·수정만 하면 됩니다.</div>

              {/* 가격·카테고리·재고·배송 */}
              <div className="pr-formgroup">
                <div className="pr-formhead">기본 등록 요소</div>
                <div className="pr-grid2">
                  <InpRow label="판매가" type="number" required value={sellerInput.salePrice}
                    onChange={(v) => setSI({ salePrice: v })} hint="AI 추정값 — 확인하세요" />
                  <InpRow label="리프카테고리 ID" required value={sellerInput.leafCategoryId}
                    onChange={(v) => setSI({ leafCategoryId: v })} hint="AI 추정 — 확인 필수" />
                  <InpRow label="재고수량" type="number" required value={sellerInput.stockQuantity}
                    onChange={(v) => setSI({ stockQuantity: v })} placeholder="예) 100" />
                  <InpRow label="배송비" type="number" required value={sellerInput.deliveryFee}
                    onChange={(v) => setSI({ deliveryFee: v })} placeholder="0 = 무료" hint="0 입력 시 무료배송" />
                  <InpRow label="A/S 전화" required value={sellerInput.afterServicePhone}
                    onChange={(v) => setSI({ afterServicePhone: v })} source={sr.afterServicePhone?.source}
                    placeholder="예) 1600-0000" />
                  <InpRow label="원산지" required value={sellerInput.origin}
                    onChange={(v) => setSI({ origin: v })} source={sr.origin?.source}
                    placeholder="예) 국내산 / 중국 등" />
                </div>
              </div>

              {/* 상품정보제공고시 */}
              {noticeKeys.length > 0 && (
                <div className="pr-formgroup">
                  <div className="pr-formhead">
                    상품정보제공고시
                    <span className="pr-notetype">{sr.noticeType}</span>
                  </div>
                  <div className="pr-grid2">
                    {noticeKeys.map((k) => (
                      <InpRow
                        key={k}
                        label={noticeLabels[k] || k}
                        required
                        value={sellerInput.notice?.[k]}
                        onChange={(v) => setNotice(k, v)}
                        source={sr.notice?.[k]?.source}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 기능성 인증번호 (기능성일 때만) */}
              {sr.functional?.["여부"] && (
                <div className="pr-formgroup">
                  <div className="pr-formhead">기능성화장품 인증</div>
                  <div className="pr-grid2">
                    <InpRow label="기능성 심사필 인증번호" required value={sellerInput.functionalCertNumber}
                      onChange={(v) => setSI({ functionalCertNumber: v })} source={sr.functional?.source} />
                  </div>
                </div>
              )}

              {/* 네이버쇼핑 노출 토글 */}
              <div className="pr-toggle-row">
                <div>
                  <div className="pr-formhead" style={{ marginBottom: 2 }}>네이버쇼핑 노출</div>
                  <div className="pr-inphint">검색 노출을 위해 켜두는 것을 권장해요.</div>
                </div>
                <NvToggle on={sellerInput.naverShopping} onChange={(v) => setSI({ naverShopping: v })} />
              </div>
            </div>
          )}

          {/* (D) 액션 */}
          <div className="pr-actions">
            <button className="pr-cta" onClick={onRegister} disabled={!canRegister}>
              <NvIcon name="check" size={18} /> 이대로 등록
            </button>
            <button className="nv-btn ghost" onClick={() => setPhase("edit")}>수정</button>
            <button className="nv-btn ghost" onClick={generate}><NvIcon name="refresh" size={15} /> 다시 생성</button>
          </div>
          {!canRegister && (
            <div className="pr-disabled-note">필수 항목을 모두 채워야 등록할 수 있어요.</div>
          )}
        </>
      )}

      {/* 성공 토스트 */}
      {toast && (
        <div className="pr-toast"><NvIcon name="check" size={16} /> {toast}</div>
      )}
    </>
  );
}

const PRX_CSS = `
.pr-split { display:grid; grid-template-columns:1.05fr .95fr; gap:16px; align-items:start; }
@media (max-width:980px){ .pr-split{ grid-template-columns:1fr; } }

.pr-cardtitle { display:flex; align-items:center; gap:10px; }
.pr-icontile { width:30px; height:30px; border-radius:9px; display:grid; place-items:center; background:var(--green-soft); color:var(--green-ink); flex-shrink:0; }
.pr-icontile.amber { background:var(--amber-soft); color:var(--amber-ink); }

.pr-labelrow { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.pr-label { font-size:13px; font-weight:800; color:var(--ink); display:flex; align-items:center; gap:7px; }
.pr-req { font-size:9.5px; font-weight:800; color:var(--red); background:var(--red-soft); padding:2px 6px; border-radius:6px; line-height:1.4; }

.pr-detchips { display:flex; flex-wrap:wrap; gap:7px; margin:11px 0 12px; }
.pr-detchip { display:inline-flex; align-items:center; gap:4px; padding:5px 11px; border-radius:999px; font-size:12px; font-weight:700; background:var(--line-2); color:var(--ink-3); transition:background .15s, color .15s; }
.pr-detchip.on { background:var(--green-soft); color:var(--green-ink); }

.pr-ta { border:1.5px solid var(--green); border-radius:14px; overflow:hidden; background:#fff; transition:box-shadow .12s; }
.pr-ta:focus-within { box-shadow:0 0 0 3px rgba(3,199,90,.12); }
.pr-ta textarea { width:100%; box-sizing:border-box; border:none; outline:none; resize:none; padding:15px 16px; font-size:14px; line-height:1.65; font-family:inherit; color:var(--ink); background:transparent; min-height:150px; display:block; }
.pr-ta-foot { display:flex; align-items:center; justify-content:space-between; padding:9px 14px; border-top:1px solid var(--line); background:var(--green-tint); }
.pr-ta-live { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:var(--green-ink); }
.pr-livedot { width:7px; height:7px; border-radius:50%; background:var(--green); animation:prpulse 1.4s ease-in-out infinite; flex-shrink:0; }
.pr-livedot.lg { width:9px; height:9px; }
@keyframes prpulse { 0%,100%{opacity:1; transform:scale(1)} 50%{opacity:.35; transform:scale(.65)} }
.pr-count { font-size:12px; font-weight:700; color:var(--ink-3); font-variant-numeric:tabular-nums; }

.pr-photos { display:grid; grid-template-columns:repeat(auto-fill,minmax(92px,1fr)); gap:10px; margin-top:10px; }
.pr-tile { position:relative; aspect-ratio:1; border-radius:12px; overflow:hidden; border:1px solid var(--line); }
.pr-tile img { width:100%; height:100%; object-fit:cover; display:block; }
.pr-tile .rep { position:absolute; top:6px; left:6px; padding:2px 7px; border-radius:6px; font-size:10px; font-weight:800; background:var(--green); color:#fff; }
.pr-tile .del { position:absolute; top:5px; right:5px; width:21px; height:21px; border-radius:50%; background:rgba(20,24,22,.62); color:#fff; display:grid; place-items:center; border:none; cursor:pointer; opacity:0; transition:opacity .12s; }
.pr-tile:hover .del { opacity:1; }
.pr-add { aspect-ratio:1; border:2px dashed var(--line); border-radius:12px; background:var(--line-2); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; cursor:pointer; color:var(--ink-3); font-size:12px; font-weight:700; transition:border-color .12s, background .12s, color .12s; }
.pr-add.wide { grid-column:1/-1; aspect-ratio:auto; padding:34px 18px; }
.pr-add:hover, .pr-add.drag { border-color:var(--green); background:var(--green-soft); color:var(--green-ink); }
.pr-photohint { font-size:11.5px; color:var(--ink-3); margin-top:9px; }

.pr-rhead { display:flex; align-items:center; gap:9px; margin-bottom:18px; }

.pr-sec { padding-top:16px; margin-top:16px; border-top:1px solid var(--line); }
.pr-sec.first { padding-top:0; margin-top:0; border-top:none; }
.pr-sec-lab { font-size:12px; font-weight:800; color:var(--ink-2); margin-bottom:9px; }

.pr-prices { display:grid; grid-template-columns:1fr 1fr auto; gap:9px; }
.pr-pb { padding:11px 13px; border-radius:12px; background:var(--line-2); }
.pr-pb .l { font-size:11px; font-weight:700; color:var(--ink-3); }
.pr-pb .v { font-size:18px; font-weight:800; letter-spacing:-.02em; margin-top:4px; line-height:1; font-variant-numeric:tabular-nums; }
.pr-pb .v.strk { text-decoration:line-through; color:var(--ink-3); font-weight:700; font-size:16px; }
.pr-pb.sale { background:var(--green-soft); }
.pr-pb.sale .l { color:var(--green-ink); }
.pr-pb.sale .v { color:var(--green-ink); }
.pr-pb.disc { background:var(--red-soft); text-align:center; min-width:62px; }
.pr-pb.disc .l { color:var(--red); }
.pr-pb.disc .v { color:var(--red); }

.pr-kw { display:flex; flex-wrap:wrap; gap:7px; }
.pr-muted { font-size:12px; color:var(--ink-3); }

.pr-skel { display:flex; flex-direction:column; gap:10px; padding:15px; border:1px solid var(--line); border-radius:12px; background:var(--line-2); }
.pr-skel i { height:10px; border-radius:6px; display:block; background:linear-gradient(90deg,#E4E8E1,#F0F3ED,#E4E8E1); background-size:200% 100%; animation:prsh 1.4s linear infinite; }
@keyframes prsh { to { background-position:-200% 0; } }
.pr-skel-note { display:flex; align-items:center; gap:6px; margin-top:9px; font-size:12px; color:var(--ink-3); }

.pr-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; padding:54px 20px; text-align:center; color:var(--ink-3); }
.pr-empty .t { font-size:13.5px; font-weight:700; color:var(--ink-2); }
.pr-empty .d { font-size:12.5px; }

.pr-cta-row { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-top:18px; flex-wrap:wrap; }
.pr-cta-note { font-size:13px; color:var(--ink-2); max-width:560px; }
.pr-cta { display:inline-flex; align-items:center; justify-content:center; gap:9px; padding:16px 30px; border-radius:15px; background:var(--green); color:#fff; font-size:16px; font-weight:800; letter-spacing:-.01em; box-shadow:0 6px 18px rgba(3,199,90,.28); cursor:pointer; border:none; transition:background .12s, transform .08s; white-space:nowrap; }
.pr-cta:hover { background:#02b352; }
.pr-cta:active { transform:scale(.99); }
.pr-cta:disabled { opacity:.6; cursor:default; box-shadow:none; }
@media (max-width:640px){
  .pr-cta-row { flex-direction:column; align-items:stretch; }
  .pr-cta { width:100%; }
  .pr-cta-note { text-align:center; order:2; }
}

.pr-reviewbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; flex-wrap:wrap; }

/* ── 검토 화면 ── */
.pr-hero { background:linear-gradient(135deg, var(--green-tint), #fff 70%); border:1px solid #DCF2E5; border-radius:18px; padding:20px 22px; margin-bottom:16px; box-shadow:var(--sh-1); }
.pr-hero-top { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
.pr-hero-count { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; color:var(--green-ink); }
.pr-missbadge { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:800; color:var(--amber-ink); background:var(--amber-soft); padding:4px 10px; border-radius:999px; }
.pr-hero-name { width:100%; box-sizing:border-box; border:1.5px solid transparent; background:rgba(255,255,255,.65); border-radius:12px; padding:13px 15px; font-size:17px; font-weight:800; letter-spacing:-.02em; color:var(--ink); font-family:inherit; transition:border-color .12s, background .12s, box-shadow .12s; }
.pr-hero-name:hover { border-color:var(--line); }
.pr-hero-name:focus { outline:none; border-color:var(--green); background:#fff; box-shadow:0 0 0 3px rgba(3,199,90,.1); }
.pr-hero-namehint { font-size:11.5px; color:var(--ink-3); margin:7px 0 14px; padding-left:2px; }
.pr-hero-catrow { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.pr-catpill { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:999px; background:#fff; border:1px solid var(--line); font-size:12.5px; font-weight:700; color:var(--ink); }

.pr-fcard { margin-bottom:16px; }

.pr-grow { display:flex; align-items:flex-start; gap:14px; padding:11px 2px; border-bottom:1px solid var(--line); }
.pr-grow:last-child { border-bottom:none; }
.pr-grow .k { font-size:12.5px; font-weight:600; color:var(--ink-3); width:108px; flex-shrink:0; display:flex; align-items:center; gap:5px; }
.pr-grow .vv { font-size:13.5px; font-weight:600; color:var(--ink); flex:1; line-height:1.55; }

.pr-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:0 26px; }
@media (max-width:620px){ .pr-grid2 { grid-template-columns:1fr; } }

/* ── (C) 셀러 입력 폼 ── */
.pr-aiest { border:1px solid #C9EED9; background:linear-gradient(180deg, var(--green-tint), #fff 46px); }
.pr-seller { border:1px solid var(--amber); }
.pr-formnote { font-size:12.5px; color:var(--ink-2); margin:2px 0 4px; line-height:1.6; }
.pr-formgroup { padding-top:16px; margin-top:14px; border-top:1px solid var(--line); }
.pr-formhead { font-size:12.5px; font-weight:800; color:var(--ink); margin-bottom:10px; display:flex; align-items:center; gap:8px; }
.pr-notetype { font-size:10px; font-weight:800; color:var(--amber-ink); background:var(--amber-soft); padding:2px 7px; border-radius:6px; letter-spacing:.02em; }

.pr-inprow { padding:9px 0; border-bottom:1px solid var(--line); }
.pr-inplab { font-size:12px; font-weight:700; color:var(--ink-2); margin-bottom:5px; display:flex; align-items:center; gap:6px; }
.pr-inpcol { display:flex; flex-direction:column; gap:5px; }
.pr-inp { width:100%; box-sizing:border-box; border:1.5px solid var(--line); border-radius:10px; padding:9px 12px; font-size:13.5px; font-family:inherit; color:var(--ink); background:#fff; transition:border-color .12s, box-shadow .12s; }
.pr-inp:focus { outline:none; border-color:var(--green); box-shadow:0 0 0 3px rgba(3,199,90,.1); }
.pr-inp.miss { border-color:var(--amber); background:var(--amber-soft); }
.pr-inpmeta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; min-height:14px; }
.pr-srcok { display:inline-flex; align-items:center; gap:4px; font-size:10.5px; font-weight:800; color:var(--green-ink); background:var(--green-soft); padding:2px 8px; border-radius:999px; }
.pr-inphint { font-size:10.5px; color:var(--ink-3); }

.pr-toggle-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-top:16px; margin-top:14px; border-top:1px solid var(--line); }

.pr-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:4px; }
.pr-actions .pr-cta { padding:14px 26px; font-size:15px; border-radius:14px; }
.pr-disabled-note { font-size:12px; color:var(--amber-ink); margin-top:9px; font-weight:700; }

.pr-toast { position:fixed; bottom:28px; left:50%; transform:translateX(-50%); z-index:200; display:flex; align-items:center; gap:9px; padding:13px 20px; border-radius:14px; background:var(--ink); color:#fff; font-size:13.5px; font-weight:700; box-shadow:0 10px 30px rgba(0,0,0,.25); }
`;

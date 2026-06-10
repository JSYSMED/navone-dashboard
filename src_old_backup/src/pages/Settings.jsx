import { useState } from "react";
import NvIcon from "../components/NvIcon";
import { NvPageHead, NvSeg, NvField, NvBanner } from "../components/atoms";
import { getSettings, saveSettings, getLicenseKey, setLicenseKey } from "../lib/api";

export default function Settings() {
  const init = getSettings();
  const [tab, setTab] = useState("general");
  const [secretVisible, setSecretVisible] = useState(false);
  const [sent, setSent] = useState(false);
  const [saved, setSaved] = useState(false);

  const [storeName, setStoreName] = useState(init.storeName || "");
  const [category, setCategory] = useState(init.category || "");
  const [pageInfo, setPageInfo] = useState(init.pageInfo || "");
  const [tgToken, setTgToken] = useState(init.tgToken || "");
  const [tgChatId, setTgChatId] = useState(init.tgChatId || "");
  const [license, setLicense] = useState(getLicenseKey() || "");

  const save = () => {
    saveSettings({ storeName, category, pageInfo, tgToken, tgChatId });
    if (license) setLicenseKey(license.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const tiers = [
    { name: "스타터", range: "상품 100개까지", price: 79000, sub: "이제 막 시작한 소규모 셀러", feats: ["가격 자동화", "주문·발주 자동화", "품절 자동 OFF", "월간 진단 1회"] },
    { name: "그로스", range: "상품 500개까지", price: 149000, sub: "성장 중인 셀러 · 가장 인기", feats: ["스타터 전체", "정산·마진·광고 분석", "클레임·페널티 자동화", "상품 노출 최적화(월간)"], best: true },
    { name: "프로", range: "상품 2,000개까지", price: 249000, sub: "대형 셀러 · 전상품 풀스캔", feats: ["그로스 전체", "전상품 AI 보강", "그룹상품·중복정리", "리뷰 답글 AI", "우선 지원"], cur: true },
    { name: "엔터프라이즈", range: "2,000개 이상", price: null, sub: "다채널·대량 셀러", feats: ["프로 전체", "물량 맞춤 단가", "전담 지원", "맞춤 기능 협의"] },
  ];

  return (
    <>
      <NvPageHead title="설정" sub="CommerOne 동작에 필요한 계정·알림·라이선스와 요금제를 관리합니다."
        actions={tab === "general" && <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{saved && <span className="nv-pill green"><NvIcon name="check" size={12} /> 저장됨</span>}<button className="nv-btn primary" onClick={save}><NvIcon name="check" size={15} /> 설정 저장</button></div>} />
      <NvSeg style={{ marginBottom: 20 }} value={tab} onChange={setTab} tabs={[["general", "일반 설정"], ["plan", "플랜 · 요금"]]} />

      {tab === "general" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">네이버 Commerce API</h3><span className="nv-pill green"><NvIcon name="check" size={12} /> 서버 관리</span></div>
              <NvBanner tone="gray" icon="shield">Commerce API 자격증명(client_id/secret)은 보안을 위해 CommerOne 서버(store-register)에 암호화 저장됩니다. 여기서는 연결 상태만 표시해요.</NvBanner>
            </div>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">스토어 정보</h3></div>
              <NvField label="스토어명"><input className="nv-input" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="예: 볼빨간오빠" /></NvField>
              <div style={{ marginTop: 14 }}><NvField label="카테고리"><input className="nv-input" value={category} onChange={e => setCategory(e.target.value)} placeholder="식품 > 신선식품 > 과일" /></NvField></div>
            </div>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">상세페이지 정보</h3><span className="nv-card-hint">톡톡 AI 참고용</span></div>
              <textarea className="nv-input" rows="6" value={pageInfo} onChange={e => setPageInfo(e.target.value)} placeholder="스토어 소개·배송·교환정책 등 AI가 참고할 정보를 입력하세요." />
              <div className="nv-field-hint" style={{ marginTop: 8 }}>현재 {pageInfo.length}자 입력됨 · 권장 200자 이상</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">텔레그램 알림</h3><span className={"nv-pill " + (tgToken ? "green" : "gray")}><span className="pdot" />{tgToken ? "활성" : "미설정"}</span></div>
              <NvField label="봇 토큰"><input className="nv-input mono" type={secretVisible ? "text" : "password"} value={tgToken} onChange={e => setTgToken(e.target.value)} placeholder="0000000:AAH-..." /></NvField>
              <div style={{ marginTop: 14 }}><NvField label="Chat ID"><input className="nv-input mono" value={tgChatId} onChange={e => setTgChatId(e.target.value)} placeholder="5677149726" /></NvField></div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
                <button className="nv-btn ghost sm" onClick={() => setSecretVisible(!secretVisible)}><NvIcon name="eye" size={14} /> {secretVisible ? "숨김" : "토큰 표시"}</button>
                <button className="nv-btn primary" onClick={() => { setSent(true); setTimeout(() => setSent(false), 2400); }}><NvIcon name="send" size={13} /> 테스트 발송</button>
                {sent && <span className="nv-pill green"><NvIcon name="check" size={12} /> 전송 완료</span>}
              </div>
              <div className="nv-field-hint" style={{ marginTop: 12 }}>가격 변경 오류, 판매자 전달 건이 발생하면 즉시 알림을 받습니다.</div>
            </div>
            <div className="nv-card">
              <div className="nv-card-h"><h3 className="nv-card-t">라이선스</h3></div>
              <NvField label="라이선스 키" hint="이 키로 모든 API 호출이 인증됩니다."><input className="nv-input mono" value={license} onChange={e => setLicense(e.target.value)} placeholder="NAVONE-TEST-001" /></NvField>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                <div style={{ padding: "13px 15px", background: license ? "var(--green-soft)" : "var(--line-2)", borderRadius: 12 }}><div style={{ fontSize: 11.5, color: license ? "var(--green-ink)" : "var(--ink-2)", fontWeight: 700 }}>상태</div><div style={{ fontSize: 15, fontWeight: 800, color: license ? "var(--green-ink)" : "var(--ink-2)", marginTop: 4 }}>{license ? "활성" : "미입력"}</div></div>
                <div style={{ padding: "13px 15px", background: "var(--line-2)", borderRadius: 12 }}><div style={{ fontSize: 11.5, color: "var(--ink-2)", fontWeight: 700 }}>현재 플랜</div><div className="mono" style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>PRO</div></div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}><button className="nv-btn ghost sm">결제 관리</button><button className="nv-btn primary sm" onClick={() => setTab("plan")}>플랜 변경</button></div>
            </div>
            <div className="nv-card flat" style={{ background: "var(--line-2)" }}>
              <div style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 700, marginBottom: 6 }}>CommerOne 정보</div>
              <div className="nv-field-hint" style={{ lineHeight: 1.7 }}>크롬 확장 <span className="mono" style={{ color: "var(--ink)" }}>v1.4.2</span> · 대시보드 <span className="mono" style={{ color: "var(--ink)" }}>v0.9.7</span><br />문의: support@commerone.kr · 가이드 문서 보기</div>
            </div>
          </div>
        </div>
      )}

      {tab === "plan" && (
        <>
          <div style={{ marginBottom: 16 }}><NvBanner tone="green" icon="bolt">상품 수에 따라 분석량과 비용이 달라 요금을 나눴어요. 지금은 <b>프로 플랜(체험 23일 남음)</b>을 쓰고 있어요.</NvBanner></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            {tiers.map(t => (
              <div key={t.name} className="nv-card" style={{ position: "relative", padding: "22px 20px", border: t.cur ? "2px solid var(--green)" : t.best ? "2px solid var(--green-soft)" : "1px solid var(--line)" }}>
                {(t.best || t.cur) && <span className="nv-pill green" style={{ position: "absolute", top: -11, left: 20 }}>{t.cur ? "현재 플랜" : "인기"}</span>}
                <div style={{ fontSize: 16, fontWeight: 800 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, marginBottom: 14 }}>{t.range}</div>
                <div style={{ marginBottom: 4 }}>{t.price ? <><span className="mono" style={{ fontSize: 26, fontWeight: 800 }}>{t.price / 10000}</span><span style={{ fontSize: 13, color: "var(--ink-2)" }}>만원/월</span></> : <span style={{ fontSize: 20, fontWeight: 800 }}>협의</span>}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginBottom: 16, minHeight: 32 }}>{t.sub}</div>
                <button className={"nv-btn sm " + (t.cur ? "ghost" : "primary")} style={{ width: "100%", justifyContent: "center" }} disabled={t.cur}>{t.cur ? "사용 중" : t.price ? "이 플랜으로" : "문의하기"}</button>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                  {t.feats.map(f => (<div key={f} style={{ fontSize: 12, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 7 }}><span style={{ color: "var(--green-ink)" }}><NvIcon name="check" size={13} /></span> {f}</div>))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}><NvBanner tone="gray" icon="shield">상품 수가 플랜 한도를 넘으면 자동으로 상위 플랜을 안내합니다. 분석 비용(AI·API)은 요금에 포함되어 추가 과금이 없어요.</NvBanner></div>
        </>
      )}
    </>
  );
}

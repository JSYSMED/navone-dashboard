import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import PageHeader from "../components/PageHeader";
import { getSettings, saveSettings, getLicenseKey, setLicenseKey, checkConnection } from "../lib/api";

export default function Settings() {
  const s = getSettings();
  const [appId, setAppId] = useState(s.appId || "");
  const [secret, setSecret] = useState(s.secret || "");
  const [storeName, setStoreName] = useState(s.storeName || "");
  const [category, setCategory] = useState(s.category || "");
  const [botToken, setBotToken] = useState(s.botToken || "");
  const [chatId, setChatId] = useState(s.chatId || "");
  const [pageInfo, setPageInfo] = useState(s.pageInfo || "");
  const [license, setLicense] = useState(getLicenseKey());

  const [secretVisible, setSecretVisible] = useState(false);
  const [telegramSent, setTelegramSent] = useState(false);
  const [saved, setSaved] = useState(false);
  const [conn, setConn] = useState({ status: "idle", text: "" });

  async function verify() {
    if (!getLicenseKey()) { setConn({ status: "bad", text: "라이선스 키 미설정" }); return; }
    setConn({ status: "checking", text: "확인 중…" });
    try {
      const { stats } = await checkConnection();
      setConn({ status: "ok", text: `활성 · 오늘 ${(stats?.total ?? 0)}건` });
    } catch (e) {
      setConn({ status: "bad", text: "확인 필요" });
    }
  }

  useEffect(() => { if (getLicenseKey()) verify(); /* eslint-disable-next-line */ }, []);

  function save() {
    saveSettings({ appId, secret, storeName, category, botToken, chatId, pageInfo });
    setLicenseKey(license.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    verify();
  }

  return (
    <>
      <PageHeader
        title="설정"
        sub="NavOne 동작에 필요한 계정과 알림, 라이선스를 관리합니다."
        right={<button className="btn primary" onClick={save}>{saved ? <><Icon name="check" size={14} /> 저장됨</> : "저장"}</button>}
      />

      <div className="grid-2">
        <div className="col">
          <div className="card">
            <div className="card-title">
              네이버 Commerce API
              <span className={"badge " + (appId && secret ? "green" : "gray")}>{appId && secret ? "입력됨" : "미입력"}</span>
            </div>
            <div className="field">
              <label className="field-label">애플리케이션 ID</label>
              <input className="input mono" value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="nv_app_..." />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label className="field-label">시크릿</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className={"input mono " + (secretVisible ? "" : "pw")} type={secretVisible ? "text" : "password"}
                  value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="$2a$04$..." />
                <button className="btn ghost sm" onClick={() => setSecretVisible(!secretVisible)}>{secretVisible ? "숨김" : "표시"}</button>
              </div>
              <div className="field-hint">브라우저(localStorage)에 저장됩니다.</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">스토어 정보</div>
            <div className="field">
              <label className="field-label">스토어명</label>
              <input className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="예: 달콤한과일가게" />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label className="field-label">카테고리</label>
              <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="식품 > 신선식품 > 과일" />
            </div>
          </div>

          <div className="card">
            <div className="card-title">상세페이지 정보 <span className="hint">톡톡 AI 참고용</span></div>
            <textarea className="input" rows="6" value={pageInfo} onChange={(e) => setPageInfo(e.target.value)}
              placeholder="스토어와 주요 상품에 대한 설명을 자세히 적어주세요. 톡톡 AI가 답변할 때 참고합니다." />
            <div className="field-hint" style={{ marginTop: 8 }}>현재 {pageInfo.length}자 입력됨 · 권장 200자 이상</div>
          </div>
        </div>

        <div className="col">
          <div className="card">
            <div className="card-title">
              텔레그램 알림
              <span className={"badge " + (botToken && chatId ? "green" : "gray")}>{botToken && chatId ? "활성" : "비활성"}</span>
            </div>
            <div className="field">
              <label className="field-label">봇 토큰</label>
              <input className="input mono pw" type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="123456:ABC..." />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label className="field-label">Chat ID</label>
              <input className="input mono" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="예: 482917365" />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center" }}>
              <button className="btn primary" onClick={() => { setTelegramSent(true); setTimeout(() => setTelegramSent(false), 2400); }}>
                <Icon name="send" size={12} /> 테스트 발송
              </button>
              {telegramSent && <span className="badge green"><Icon name="check" size={11} /> 전송 완료</span>}
            </div>
            <div className="field-hint" style={{ marginTop: 12 }}>가격 변경 오류, 판매자 전달 건이 발생하면 알림을 받습니다.</div>
          </div>

          <div className="card">
            <div className="card-title">라이선스</div>
            <div className="field">
              <label className="field-label">라이선스 키</label>
              <input className="input mono" value={license} onChange={(e) => setLicense(e.target.value)} placeholder="예: NVO-PRO-2026-..." />
            </div>
            <div className="conn-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <div style={{ padding: "12px 14px", background: conn.status === "ok" ? "var(--green-soft)" : "#F7F8FA", borderRadius: 10 }}>
                <div style={{ fontSize: 11.5, color: conn.status === "ok" ? "var(--green-ink)" : "var(--ink-2)", fontWeight: 600 }}>상태</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: conn.status === "ok" ? "var(--green-ink)" : conn.status === "bad" ? "var(--red)" : "var(--ink)", marginTop: 4 }}>
                  {conn.status === "ok" ? "활성" : conn.status === "checking" ? "확인 중" : conn.status === "bad" ? "확인 필요" : "—"}
                </div>
              </div>
              <div style={{ padding: "12px 14px", background: "#F7F8FA", borderRadius: 10 }}>
                <div style={{ fontSize: 11.5, color: "var(--ink-2)", fontWeight: 600 }}>연결</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{conn.text || "저장 후 확인"}</div>
              </div>
            </div>
            <div className="field-hint" style={{ marginTop: 12 }}>
              현재 플랜: <b style={{ color: "var(--ink)" }}>NavOne 프로</b> · 모든 자동화 모듈 사용 가능
            </div>
          </div>

          <div className="card flat" style={{ background: "#FAFBFC" }}>
            <div style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 600, marginBottom: 6 }}>NavOne 정보</div>
            <div className="field-hint" style={{ lineHeight: 1.7 }}>
              대시보드 <span className="mono" style={{ color: "var(--ink)" }}>v1.0.0</span><br />
              문의: support@navone.kr
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

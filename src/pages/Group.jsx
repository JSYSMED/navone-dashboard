import { useState, useEffect } from "react";
import NvIcon from "../components/NvIcon";
import { NvPageHead, NvBanner, NvEmpty } from "../components/atoms";
import { fetchGroupSuggest, fetchFeatureCache, saveFeatureCache } from "../lib/api";

const won = (n) => (Number(n) || 0).toLocaleString() + "원";

// 모듈 레벨 캐시 — 페이지를 나갔다 다시 들어와도 직전 추천 결과를 유지한다.
// (브라우저 새로고침 시에는 비워짐. "다시 스캔"을 누르면 강제로 새로 파싱.)
let _groupCache = null;

export default function Group() {
  const [data, setData] = useState(_groupCache || { scanned: 0, count: 0, candidates: [] });
  const [status, setStatus] = useState(_groupCache ? (_groupCache.candidates.length ? "ok" : "empty") : "loading");

  const load = async () => {
    setStatus("loading");
    try {
      const d = await fetchGroupSuggest();
      const candidates = d?.candidates || [];
      const next = { scanned: d?.scanned || 0, count: d?.count ?? candidates.length, candidates };
      _groupCache = next;                 // 메모리 캐시
      setData(next);
      setStatus(candidates.length ? "ok" : "empty");
      saveFeatureCache("group", next).catch(() => {});   // 서버 영구 캐시(새로고침 대비)
    } catch {
      setStatus("error");
    }
  };

  // 우선순위: 모듈캐시(페이지이동) → 서버캐시(새로고침) → 새 스캔.
  useEffect(() => {
    if (_groupCache) {
      setData(_groupCache);
      setStatus(_groupCache.candidates.length ? "ok" : "empty");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const cached = await fetchFeatureCache("group");
        if (alive && cached?.result) {
          _groupCache = cached.result;
          setData(cached.result);
          setStatus(cached.result.candidates?.length ? "ok" : "empty");
          return;
        }
      } catch {}
      if (alive) load();   // 서버 캐시도 없으면 새로 스캔
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="nv-page">
      <NvPageHead
        title="그룹상품 추천"
        sub="같은 제품인데 따로 등록된 상품들이에요. 묶으면 가격비교가 한 카드로 합쳐져 노출에 유리해요."
        actions={
          <button className="nv-btn ghost sm" onClick={load} disabled={status === "loading"}>
            <NvIcon name="refresh" size={14} /> 다시 스캔
          </button>
        }
      />

      {status === "loading" && (
        <div className="nv-card" style={{ textAlign: "center", padding: "44px 24px", color: "var(--ink-2)" }}>
          상품을 스캔하고 묶을 후보를 찾는 중…
        </div>
      )}

      {status === "error" && (
        <NvEmpty
          icon="bolt"
          tone="red"
          title="불러오지 못했어요"
          desc="잠시 후 ‘다시 스캔’을 눌러주세요. 설정의 라이선스 키도 확인해 주세요."
        />
      )}

      {status === "empty" && (
        <NvEmpty
          icon="check"
          title="묶을 그룹이 없어요"
          desc={`상품 ${data.scanned.toLocaleString()}개를 살펴봤지만 지금은 묶을 만한 후보가 없네요.`}
        />
      )}

      {status === "ok" && (
        <>
          <NvBanner tone="green" icon="sparkles">
            상품 {data.scanned.toLocaleString()}개 중 묶을 수 있는 그룹 <b>{data.count}개</b>를 찾았어요.
          </NvBanner>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
            {data.candidates.map((g, gi) => (
              <div className="nv-card" key={gi}>
                <div className="nv-card-h">
                  <div>
                    <div className="nv-card-t">{g.groupName || `그룹 ${gi + 1}`}</div>
                    {g.reason && <div className="nv-card-hint">{g.reason}</div>}
                  </div>
                  <span className="nv-pill green">{g.products?.length || 0}개 묶기</span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
                  {(g.products || []).map((p, pi) => (
                    <div
                      key={pi}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        border: "1px solid var(--line)",
                        borderRadius: 12,
                        padding: 10,
                        width: "calc(50% - 6px)",
                        minWidth: 240,
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 10,
                          flexShrink: 0,
                          overflow: "hidden",
                          background: "var(--line)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--ink-4)",
                        }}
                      >
                        {p.image ? (
                          <img src={p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <NvIcon name="box" size={20} />
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            lineHeight: 1.4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {p.name}
                        </div>
                        <div className="mono" style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 3 }}>
                          {won(p.salePrice)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

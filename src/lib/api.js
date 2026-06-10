// NavOne 대시보드 — API 호출 헬퍼
const API_BASE = "";
const LICENSE_KEY = "navone_license_key";
const SETTINGS_KEY = "navone_settings";
// 미설정 시 사용하는 기본 테스트 라이선스 키.
const DEFAULT_LICENSE = "NAVONE-TEST-001";

// ===== licenseKey (localStorage) =====
export function getLicenseKey() {
  return localStorage.getItem(LICENSE_KEY) || DEFAULT_LICENSE;
}
export function setLicenseKey(key) {
  localStorage.setItem(LICENSE_KEY, key || "");
}

// ===== 일반 설정 (스토어/텔레그램/상세페이지) — 서버 저장 + localStorage 캐시 =====
// 서버(navone_settings)가 진짜 소스. localStorage는 즉시 표시용 캐시.
// 라이선스 키로 어느 기기/브라우저에서도 동일한 설정을 불러온다.
export function getSettings() {          // 동기: localStorage 캐시 (초기 렌더용)
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}
export async function syncSettings() {   // 서버에서 최신 가져와 캐시 갱신
  try {
    const d = await apiGet("settings");  // { success, settings }
    const s = (d && d.settings) || {};
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    return s;
  } catch {
    return getSettings();                // 서버 실패 시 캐시 폴백
  }
}
export async function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));  // 캐시 즉시 갱신
  try { await apiSend("settings", { patch }, "POST"); } catch {}  // 서버 저장
  return next;
}

// ===== 공통 fetch =====
async function getJson(url) {
  const res = await fetch(url);
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

function requireLicense() {
  const lk = getLicenseKey();
  if (!lk) throw new Error("라이선스 키가 없습니다. 설정에서 입력해주세요.");
  return lk;
}

// ===== 통계 (대시보드 카드) =====
// period: today | week | month
export async function fetchStats(period = "today") {
  const lk = requireLicense();
  const data = await getJson(
    `${API_BASE}/api/dashboard-stats?licenseKey=${encodeURIComponent(lk)}&period=${period}`
  );
  return data.stats;
}

// ===== 이력 목록 =====
// type: price | review | cs
export async function fetchHistory(type, limit = 50, offset = 0) {
  const lk = requireLicense();
  const data = await getJson(
    `${API_BASE}/api/history-list?licenseKey=${encodeURIComponent(lk)}&type=${type}&limit=${limit}&offset=${offset}`
  );
  return data; // { success, data, total, limit, offset }
}

// ===== 최근 7일 일별 추이 =====
// dashboard-stats?period=week 는 합계만 주므로, history-list의 created_at으로 클라이언트에서 일별 버킷팅.
export async function fetchWeeklyTrend() {
  requireLicense();
  const [price, review, cs] = await Promise.all([
    fetchHistory("price", 300).catch(() => ({ data: [] })),
    fetchHistory("review", 300).catch(() => ({ data: [] })),
    fetchHistory("cs", 300).catch(() => ({ data: [] })),
  ]);

  // 최근 7일 빈 버킷 생성
  const map = {};
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const row = { date: key, label: `${d.getMonth() + 1}/${d.getDate()}`, price: 0, review: 0, cs: 0 };
    days.push(row);
    map[key] = row;
  }

  const bucket = (rows, field) => {
    (rows || []).forEach((r) => {
      const key = (r.created_at || "").slice(0, 10);
      if (map[key]) map[key][field] += 1;
    });
  };
  bucket(price.data, "price");
  bucket(review.data, "review");
  bucket(cs.data, "cs");
  return days;
}

// ===== 연결 확인 =====
// 전용 store-info API가 없어 dashboard-stats 성공 여부로 연결 상태 판단.
export async function checkConnection() {
  const stats = await fetchStats("today");
  return { connected: true, stats };
}

// ===== 표시용 포맷 헬퍼 =====
export function formatDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function formatPrice(n) {
  if (n == null || n === "") return "-";
  const num = Number(n);
  return isNaN(num) ? String(n) : num.toLocaleString("ko-KR") + "원";
}
export function truncate(s, n = 40) {
  if (!s) return "-";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ===== 운영 모듈 엔드포인트 공통 GET =====
// 응답 형태: { success, data } | { success:false, error } | { error: "..." }
// ── TTL 캐시 (페이지 전환 시 동일 GET 재호출 방지) ──
const _cache = new Map();      // url → { ts, data }
const _inflight = new Map();   // url → Promise
const CACHE_TTL = 5 * 60_000;  // 5분

export function clearApiCache(prefix) {
  if (!prefix) { _cache.clear(); return; }
  for (const k of _cache.keys()) if (k.includes(prefix)) _cache.delete(k);
}

// 캐시 키 빌더 (apiGet과 동일 규칙)
function _cacheUrl(path, params = {}) {
  const q = new URLSearchParams({ licenseKey: getLicenseKey(), ...params });
  return `${API_BASE}/api/${path}?${q.toString()}`;
}

// 동기적으로 캐시된 값 즉시 반환 (없으면 undefined) — 페이지 초기값용, 로딩 깜빡임 제거
export function getCached(path, params = {}) {
  const hit = _cache.get(_cacheUrl(path, params));
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  return undefined;
}

async function apiGet(path, params = {}) {
  const url = _cacheUrl(path, params);

  // 캐시 히트 (TTL 내)
  const hit = _cache.get(url);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  // 진행 중인 동일 요청이 있으면 그것을 공유 (중복 호출 방지)
  if (_inflight.has(url)) return _inflight.get(url);

  const p = (async () => {
    const res = await fetch(url);
    let data = {};
    try { data = await res.json(); } catch { /* ignore */ }
    const errMsg = typeof data.error === "string" ? data.error : data?.error?.message;
    if (!res.ok || data.success === false || errMsg) {
      throw new Error(errMsg || `요청 실패 (${res.status})`);
    }
    _cache.set(url, { ts: Date.now(), data });
    return data;
  })();
  _inflight.set(url, p);
  try { return await p; }
  finally { _inflight.delete(url); }
}

export const fetchClaims        = () => apiGet("claim/pending", { days: 7 }).then((d) => d.data);
export const fetchOrders        = () => apiGet("order/pending").then((d) => d.data);
export const fetchPenaltyScan   = () => apiGet("penalty/risk-scan").then((d) => d.data);
export const fetchInquiries     = () => apiGet("inquiry/list");  // {inquiries, total} 최상위 (data 래핑 없음)
export const fetchGroupSuggest  = () => apiGet("group/suggest").then((d) => d.data);

// ===== 범용 결과 캐시 (cache/feature) — 무거운 AI 결과 영구 저장 =====
// GET → { result, updatedAt } | null,  저장 → updatedAt
export const fetchFeatureCache = (feature) =>
  apiGet("cache/feature", { feature }).then((d) => d.cached);
export const saveFeatureCache = (feature, result) =>
  apiSend("cache/feature", { feature, result }, "POST");

export const fetchAdEfficiency  = () => apiGet("ad/efficiency").then((d) => d.data);
export const fetchQaList        = () => apiGet("qa/list");        // 최상위 구조
export const analyzeProduct     = (originProductNo) =>
  apiGet("product-ai/analyze", { originProductNo }).then((d) => d.data);

// 상품 노출 진단 (전체 일괄) — bulk-analyze. 응답: {success, data:{count, products[]}}
export const fetchProductDiagnosis = (limit = 50) =>
  apiGet("product-ai/bulk-analyze", { limit }).then((d) => d.data || d);

// 리뷰 목록 (확장이 DB에 모은 미답글 리뷰) — review/list
export const fetchReviewList = (status = "pending", limit = 50) =>
  apiGet("review/list", { status, limit });

// 금액/숫자 포맷 (won은 formatPrice의 별칭, 페이지에서 자주 쓰임)
export function won(n) {
  return formatPrice(n);
}
export function pct(n) {
  if (n == null || n === "") return "-";
  const num = Number(n);
  return isNaN(num) ? String(n) : `${num.toFixed(1)}%`;
}

// ===========================================================
// CommerOne 페이지 배선용 추가 헬퍼 (검증된 6개 API)
// 응답 형태는 서버 README 기준. 키 편차는 페이지단에서 흡수.
// ===========================================================

// 날짜 유틸 (이번 달 1일 ~ 오늘)
export function monthRange() {
  const now = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  return { start: iso(new Date(now.getFullYear(), now.getMonth(), 1)), end: iso(now) };
}

// 정산 — 일별 ( settlement/daily → { rows, daily, range } )
export async function fetchSettlementDaily() {
  const { start, end } = monthRange();
  const d = await apiGet("settlement/daily", { start, end });
  return d.data; // { rows, daily, range, count }
}

// 정산 — 마진율 랭킹 ( settlement/margin-rank )
export const fetchMarginRank = () => apiGet("settlement/margin-rank").then((d) => d.data);

// 정산 — 수수료 ROI ( settlement/commission-roi )
export const fetchCommissionRoi = () => apiGet("settlement/commission-roi").then((d) => d.data);

// 주의: fetchClaims / fetchPenaltyScan / fetchOrders / fetchQaList /
// fetchInquiries / fetchAdEfficiency 는 위쪽(공통 GET 블록)에 이미 정의됨.

// ===== POST/PATCH 공통 =====
async function apiSend(path, body = {}, method = "POST") {
  const lk = getLicenseKey();
  const res = await fetch(`${API_BASE}/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ licenseKey: lk, ...body }),
  });
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  const errMsg = typeof data.error === "string" ? data.error : data?.error?.message;
  if (!res.ok || data.success === false || errMsg) {
    throw new Error(errMsg || `요청 실패 (${res.status})`);
  }
  // 쓰기 성공 → 관련 캐시 무효화 (cost 저장 시 cost-list/margin 갱신되게)
  const base = path.split("/")[0];        // "product" | "review" | ...
  clearApiCache(base);
  if (base === "product") clearApiCache("settlement/margin-rank");
  return data;
}

// ===== 원가 관리 (product/cost-*) =====
// 상품 전체 + 저장된 원가 머지. 응답: { products:[{channelProductNo, productName, category, salePrice, cost|null}], count, costConfigured }
export const fetchCostList = () => apiGet("product/cost-list");
// 엑셀 파싱(SheetJS)은 프론트에서 → JSON 일괄 저장. items: [{channelProductNo, cost, productName?}]
export const saveCostBulk = (items) => apiSend("product/cost-bulk", { items }, "POST");
// 개별 수정
export const saveCost = (channelProductNo, cost) => apiSend("product/cost", { channelProductNo, cost }, "PATCH");

// ===== 가격 자동화 리모트컨트롤 (automation/config) =====
// GET → { enabled, intervalMinutes, testMode, runNow, lastRunAt }
export const fetchAutomationConfig = () => apiGet("automation/config").then((d) => d.config);
// POST patch (대시보드 설정 저장). 보낸 필드만 갱신. 저장 후 automation 캐시 자동 무효화.
export const saveAutomationConfig = (patch) => apiSend("automation/config", patch, "POST").then((d) => d.config);

// ===== 판매 현황 (order/sales-status) =====
// from/to(ISO, KST) + rangeType. 응답: { summary{orderCount,totalSales,totalSettlement,totalCommission,statusCounts}, orders[] }
export const fetchSalesStatus = ({ from, to, rangeType } = {}) => {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (rangeType) params.rangeType = rangeType;
  return apiGet("order/sales-status", params);
};

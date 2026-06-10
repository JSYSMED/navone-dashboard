// NavOne 대시보드 — API 호출 헬퍼
const API_BASE = "https://pjhbless0831.cafe24.com";
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

// ===== 일반 설정 (Commerce API / 스토어 / 텔레그램) — localStorage =====
export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}
export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
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
async function apiGet(path, params = {}) {
  const lk = getLicenseKey();
  const q = new URLSearchParams({ licenseKey: lk, ...params });
  const res = await fetch(`${API_BASE}/api/${path}?${q.toString()}`);
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  const errMsg = typeof data.error === "string" ? data.error : data?.error?.message;
  if (!res.ok || data.success === false || errMsg) {
    throw new Error(errMsg || `요청 실패 (${res.status})`);
  }
  return data;
}

export const fetchClaims        = () => apiGet("claim/pending").then((d) => d.data);
export const fetchOrders        = () => apiGet("order/pending").then((d) => d.data);
export const fetchPenaltyScan   = () => apiGet("penalty/risk-scan").then((d) => d.data);
export const fetchInquiries     = () => apiGet("inquiry/list").then((d) => d.data);
export const fetchGroupSuggest  = () => apiGet("group/suggest").then((d) => d.data);
export const fetchAdEfficiency  = () => apiGet("ad/efficiency").then((d) => d.data);
export const fetchQaList        = () => apiGet("qa/list").then((d) => d.data);
export const analyzeProduct     = (originProductNo) =>
  apiGet("product-ai/analyze", { originProductNo }).then((d) => d.data);

// 금액/숫자 포맷 (won은 formatPrice의 별칭, 페이지에서 자주 쓰임)
export function won(n) {
  return formatPrice(n);
}
export function pct(n) {
  if (n == null || n === "") return "-";
  const num = Number(n);
  return isNaN(num) ? String(n) : `${num.toFixed(1)}%`;
}

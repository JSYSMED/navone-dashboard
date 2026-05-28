// NavOne 대시보드 — 정산/마진 API 헬퍼 (Agent A)
// 공통 인증/포맷은 기존 ../../lib/api 를 재사용한다 (수정 없이 import만).
import { getLicenseKey } from "../../lib/api";

const API_BASE = "http://1.234.91.111:3000";

async function getJson(url) {
  const res = await fetch(url);
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok || data.success === false) {
    throw new Error(data?.error?.message || `요청 실패 (${res.status})`);
  }
  return data;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok || data.success === false) {
    throw new Error(data?.error?.message || `요청 실패 (${res.status})`);
  }
  return data;
}

function requireLicense() {
  const lk = getLicenseKey();
  if (!lk) throw new Error("라이선스 키가 없습니다. 설정에서 입력해주세요.");
  return lk;
}

const qs = (lk, start, end) => {
  let s = `licenseKey=${encodeURIComponent(lk)}`;
  if (start) s += `&start=${start}`;
  if (end) s += `&end=${end}`;
  return s;
};

// 일별 정산 (네이버 API 실시간) → { rows, daily, range, count }
export async function fetchDailySettlement(start, end) {
  const lk = requireLicense();
  const data = await getJson(`${API_BASE}/api/settlement/daily?${qs(lk, start, end)}`);
  return data.data;
}

// 상품별 마진율 랭킹 → { ranking, lossCount, costConfigured, productCount, range }
export async function fetchMarginRank(start, end) {
  const lk = requireLicense();
  const data = await getJson(`${API_BASE}/api/settlement/margin-rank?${qs(lk, start, end)}`);
  return data.data;
}

// 정산 데이터 동기화 (DB upsert) → { upserted, skipped, fetched, range }
export async function syncSettlement(start, end) {
  const lk = requireLicense();
  const data = await postJson(`${API_BASE}/api/settlement/sync`, { licenseKey: lk, start, end });
  return data.data;
}

// ===== 포맷 헬퍼 =====
export function won(n) {
  if (n == null || n === "") return "-";
  const num = Number(n);
  return isNaN(num) ? String(n) : num.toLocaleString("ko-KR") + "원";
}
export function pct(n) {
  if (n == null) return "-";
  return `${Number(n).toFixed(1)}%`;
}

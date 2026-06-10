import { useState } from "react";
import NvIcon from "./NvIcon";
import { NvBanner, NvEmpty } from "./atoms";
import { fetchCostList, saveCostBulk, saveCost } from "../lib/api";

const won = v => (Number(v) || 0).toLocaleString() + "원";

// 원가 관리: 상품목록 불러오기 → 엑셀 양식 다운로드 → 채워서 업로드 → 개별 인라인 수정
export default function CostManager({ onSaved }) {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("idle"); // idle|loading|ok|empty|error
  const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setStatus("loading"); setMsg("");
    try {
      const d = await fetchCostList();
      const rows = (d?.products || []).map(p => ({
        channelProductNo: String(p.channelProductNo || p.productNo || ""),
        productName: p.productName || p.name || "—",
        category: p.category || "",
        salePrice: +p.salePrice || 0,
        cost: p.cost == null ? null : +p.cost,
      }));
      if (rows.length) { setProducts(rows); setStatus("ok"); }
      else { setStatus("empty"); }
    } catch (e) {
      setStatus("error"); setMsg(e.message || "상품을 불러오지 못했습니다.");
    }
  };

  // 엑셀 양식 다운로드 — 상품목록 채우고 원가 칸만 비움
  const downloadTemplate = async () => {
    const src = products.length ? products : [];
    if (!src.length) { setMsg("먼저 '상품 불러오기'를 눌러 주세요."); return; }
    const XLSX = await import("xlsx");
    const aoa = [["채널상품번호", "상품명", "판매가", "원가(직접입력)"]];
    src.forEach(p => aoa.push([p.channelProductNo, p.productName, p.salePrice, p.cost ?? ""]));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{ wch: 16 }, { wch: 40 }, { wch: 12 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "원가입력");
    XLSX.writeFile(wb, `CommerOne_원가양식_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 엑셀 업로드 — 파싱해서 일괄 저장
  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSaving(true); setMsg("");
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      // 헤더 1줄 스킵, [번호, 상품명, 판매가, 원가]
      const items = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const no = String(r[0] ?? "").trim();
        const cost = Number(String(r[3] ?? "").replace(/[^0-9.-]/g, ""));
        if (!no || !cost || cost <= 0) continue;
        items.push({ channelProductNo: no, cost: Math.round(cost), productName: r[1] || "" });
      }
      if (!items.length) { setMsg("원가가 입력된 행을 찾지 못했습니다. 원가 칸을 확인해 주세요."); setSaving(false); return; }
      await saveCostBulk(items);
      setMsg(`${items.length}개 상품 원가를 저장했어요.`);
      await load();
      onSaved?.();
    } catch (err) {
      setMsg(err.message || "업로드 처리 중 오류가 발생했습니다.");
    }
    setSaving(false);
  };

  const startEdit = (p) => { setEditId(p.channelProductNo); setEditVal(p.cost ?? ""); };
  const commitEdit = async (p) => {
    const v = Math.round(Number(String(editVal).replace(/[^0-9.-]/g, "")) || 0);
    setEditId(null);
    if (v <= 0 || v === p.cost) return;
    setSaving(true);
    try {
      await saveCost(p.channelProductNo, v);
      setProducts(ps => ps.map(x => x.channelProductNo === p.channelProductNo ? { ...x, cost: v } : x));
      onSaved?.();
    } catch (err) { setMsg(err.message || "저장 실패"); }
    setSaving(false);
  };

  const filled = products.filter(p => p.cost != null && p.cost > 0).length;

  return (
    <div className="nv-card">
      <div className="nv-card-h" style={{ flexWrap: "wrap", gap: 10 }}>
        <h3 className="nv-card-t">원가 관리 <span className="nv-card-hint" style={{ fontWeight: 500 }}>{products.length ? `${filled}/${products.length}개 입력됨` : "상품을 불러와 원가를 입력하세요"}</span></h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="nv-btn ghost sm" onClick={load} disabled={status === "loading"}><NvIcon name="refresh" size={13} /> {status === "loading" ? "불러오는 중…" : "상품 불러오기"}</button>
          <button className="nv-btn ghost sm" onClick={downloadTemplate} disabled={!products.length}><NvIcon name="arrowDown" size={13} /> 엑셀 양식</button>
          <label className={"nv-btn primary sm" + (saving ? " disabled" : "")} style={{ cursor: saving ? "default" : "pointer" }}>
            <NvIcon name="arrowUp" size={13} /> {saving ? "처리 중…" : "엑셀 업로드"}
            <input type="file" accept=".xlsx,.xls" onChange={onUpload} disabled={saving} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <NvBanner tone="green" icon="sparkles">
          상품 목록은 <b>CommerOne이 자동으로 불러와요</b>. 엑셀 양식을 받아 원가 칸만 채워 올리거나, 표에서 직접 입력하세요. 원가를 넣으면 마진율이 자동 계산됩니다.
        </NvBanner>
      </div>

      {msg && <div style={{ marginBottom: 12, fontSize: 13, color: status === "error" ? "var(--red)" : "var(--green-ink)", fontWeight: 600 }}>{msg}</div>}

      {status === "idle" && (
        <NvEmpty icon="box" title="상품을 먼저 불러오세요" desc="'상품 불러오기'를 누르면 스토어의 전체 상품을 가져와 원가 입력표를 만들어 드려요." tone="violet" />
      )}
      {status === "empty" && (
        <NvEmpty icon="box" title="불러올 상품이 없어요" desc="판매중인 상품이 없거나 상품 조회 권한을 확인해 주세요." tone="amber" />
      )}
      {status === "error" && (
        <NvEmpty icon="bell" title="상품을 불러오지 못했어요" desc={msg || "잠시 후 다시 시도해 주세요."} tone="amber" />
      )}

      {status === "ok" && (
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <table className="nv-tbl">
            <thead><tr>
              <th>상품명</th>
              <th style={{ textAlign: "right", width: 120 }}>판매가</th>
              <th style={{ textAlign: "right", width: 140 }}>원가</th>
              <th style={{ width: 60, textAlign: "center" }}>상태</th>
            </tr></thead>
            <tbody>
              {products.map(p => {
                const editing = editId === p.channelProductNo;
                const has = p.cost != null && p.cost > 0;
                return (
                  <tr key={p.channelProductNo}>
                    <td style={{ fontWeight: 600 }}>{p.productName}<div style={{ fontSize: 11, color: "var(--ink-3)" }} className="mono">#{p.channelProductNo}</div></td>
                    <td className="mono" style={{ textAlign: "right" }}>{won(p.salePrice)}</td>
                    <td style={{ textAlign: "right" }}>
                      {editing ? (
                        <input className="nv-input mono" autoFocus value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={() => commitEdit(p)}
                          onKeyDown={e => { if (e.key === "Enter") commitEdit(p); if (e.key === "Escape") setEditId(null); }}
                          style={{ width: 110, padding: "5px 9px", textAlign: "right" }} />
                      ) : (
                        <button className="nv-btn ghost sm" onClick={() => startEdit(p)} style={{ minWidth: 96, justifyContent: "flex-end" }}>
                          {has ? <span className="mono">{won(p.cost)}</span> : <span style={{ color: "var(--ink-3)" }}>입력</span>}
                        </button>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {has ? <span className="nv-pill green"><NvIcon name="check" size={11} /></span> : <span className="nv-pill gray">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

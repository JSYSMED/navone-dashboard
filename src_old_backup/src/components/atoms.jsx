import NvIcon from "./NvIcon";

// 크롬 확장 상태칩
export const NvExtStatus = ({ connected = true }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", borderRadius: 999, background: connected ? "var(--green-soft)" : "var(--line-2)", border: connected ? "1px solid #C9EED9" : "1px solid var(--line)" }}>
    <span style={{ color: connected ? "var(--green-ink)" : "var(--ink-3)", display: "grid", placeItems: "center" }}><NvIcon name="chrome" size={16} /></span>
    <span style={{ fontSize: 12.5, fontWeight: 700, color: connected ? "var(--green-ink)" : "var(--ink-3)" }}>{connected ? "크롬 확장 연결됨" : "크롬 확장 미연결"}</span>
    {connected && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 0 3px rgba(3,199,90,.2)" }} />}
  </div>
);

export const NvPageHead = ({ title, sub, actions }) => (
  <div className="nv-ph">
    <div>
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
    {actions && <div className="nv-ph-actions">{actions}</div>}
  </div>
);

export const NvSeg = ({ tabs, value, onChange, style }) => (
  <div className="nv-seg" style={style}>
    {tabs.map(([k, l]) => (
      <button key={k} className={value === k ? "active" : ""} onClick={() => onChange(k)}>{l}</button>
    ))}
  </div>
);

export const NvToggle = ({ on, onChange }) => (
  <button className={"nv-toggle" + (on ? " on" : "")} onClick={() => onChange(!on)} aria-pressed={on} />
);

export const NvField = ({ label, hint, children }) => (
  <div className="nv-field">
    {label && <label className="nv-field-label">{label}</label>}
    {children}
    {hint && <div className="nv-field-hint">{hint}</div>}
  </div>
);

export const NvBanner = ({ tone = "green", icon = "sparkles", children }) => (
  <div className={"nv-banner " + tone}>
    <span className="bi"><NvIcon name={icon} size={17} /></span>
    <span>{children}</span>
  </div>
);

export const NvStat = ({ label, value, unit, icon, tone = "green", sub, subTone = "up", right }) => (
  <div className="nv-stat">
    <div className="top">
      <div className={"nv-ic-tile " + tone} style={{ width: 38, height: 38, borderRadius: 11 }}><NvIcon name={icon} size={18} /></div>
      {right}
    </div>
    <div className="lab">{label}</div>
    <div className="big mono">{value}{unit && <span className="u">{unit}</span>}</div>
    {sub && <div className={"sub " + subTone}>{subTone === "up" && <NvIcon name="arrowUp" size={12} />}{sub}</div>}
  </div>
);

export const NvStatRow = ({ children, cols = 4 }) => (
  <div className="nv-statline" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>{children}</div>
);

// 별점 표시 (Customer 페이지용)
export const NvStars = ({ v }) => {
  const c = v >= 4 ? "var(--green)" : v >= 3 ? "var(--amber)" : "var(--red)";
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width="15" height="15" viewBox="0 0 24 24" fill={i <= v ? c : "#E2E6E0"}>
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6L12 17l-5.4 2.8 1-6L3.2 9.5l6.1-.9L12 3Z" />
        </svg>
      ))}
    </span>
  );
};

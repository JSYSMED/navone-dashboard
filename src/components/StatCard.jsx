import Icon from "./Icon";

export default function StatCard({ label, value, unit, delta, deltaTone = "up", icon, alt }) {
  return (
    <div className={"stat" + (alt ? " alt" : "")}>
      <div className="label">{label}</div>
      <div className="val mono">{value}{unit && <span className="unit">{unit}</span>}</div>
      {delta && (
        <div className={"delta " + deltaTone}>
          {deltaTone === "up" && <Icon name="arrowUp" size={11} />}
          {deltaTone === "down" && <Icon name="arrowDown" size={11} />}
          {delta}
        </div>
      )}
      {icon && <div className="icon-pill"><Icon name={icon} size={18} /></div>}
    </div>
  );
}

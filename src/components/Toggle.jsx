export default function Toggle({ on, onChange }) {
  return (
    <button
      className={"toggle " + (on ? "on" : "")}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    />
  );
}

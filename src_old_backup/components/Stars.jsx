export default function Stars({ value = 0 }) {
  const color = value >= 5 ? "var(--green)" : value >= 3 ? "var(--orange)" : "var(--red)";
  return (
    <span className="stars" aria-label={`${value}점`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" fill={i <= value ? color : "#E0E3E8"}>
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6L12 17l-5.4 2.8 1-6L3.2 9.5l6.1-.9L12 3Z" />
        </svg>
      ))}
    </span>
  );
}

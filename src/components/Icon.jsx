// SVG 아이콘 (stroke 1.7, 24 viewbox) — 원본 HTML의 path 그대로
export default function Icon({ name, size = 18, color = "currentColor" }) {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: color, strokeWidth: 1.7,
    strokeLinecap: "round", strokeLinejoin: "round",
  };
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-6h4v6" /></>,
    tag: <><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="7.5" r="1.2" /></>,
    chat: <><path d="M21 12c0 4.4-4 8-9 8-1.2 0-2.4-.2-3.4-.6L3 21l1.6-4.4C3.6 15.2 3 13.7 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" /></>,
    star: <><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6L12 17l-5.4 2.8 1-6L3.2 9.5l6.1-.9L12 3Z" /></>,
    sparkles: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.8 2.8M15.2 15.2 18 18M6 18l2.8-2.8M15.2 8.8 18 6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
    refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>,
    play: <><polygon points="6 4 20 12 6 20 6 4" /></>,
    pause: <><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    x: <><path d="M6 6l12 12M18 6 6 18" /></>,
    check: <><path d="m5 12 5 5L20 6" /></>,
    bell: <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8Z" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
    arrowDown: <><path d="M12 5v14" /><path d="m6 13 6 6 6-6" /></>,
    arrowUp: <><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4 20-7Z" /></>,
    chevR: <><path d="m9 6 6 6-6 6" /></>,
    chrome: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="M21 12h-7.5" /><path d="M5.2 7.5 9 13.5" /><path d="M9 18.5 13.5 11" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></>,
    trend: <><path d="M3 17 9 11l4 4 8-8" /><path d="M14 7h7v7" /></>,
    box: <><path d="m3.3 7 8.7 5 8.7-5" /><path d="M21 7v10l-9 5-9-5V7l9-5 9 5Z" /><path d="M12 12v10" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    flame: <><path d="M12 22c4.4 0 8-3.4 8-7.7 0-3.3-2-5.6-3.5-7-.5-.5-1.5-.3-1.5.5 0 1.5-1 2.7-2 2.7-1.4 0-1.5-1.8-1-4 .2-.8-.7-1.4-1.4-1C8.5 6.5 5 9.2 5 14.3 5 18.6 8 22 12 22Z" /></>,
    alert: <><path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
    shield: <><path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    megaphone: <><path d="m3 11 15-6v14l-15-6v-2Z" /><path d="M3 11v2a3 3 0 0 0 3 3h1" /><path d="M9 19a2 2 0 0 0 4 0" /></>,
    cpu: <><rect x="6" y="6" width="12" height="12" rx="2" /><rect x="9" y="9" width="6" height="6" rx="1" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.2 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.8 2.5-2.8 2.5" /><path d="M12 17h.01" /></>,
    users: <><circle cx="9" cy="8" r="3.4" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 5.2a3.4 3.4 0 0 1 0 5.6" /><path d="M18 14.5c2 .8 3.5 2.6 3.5 5" /></>,
    cart: <><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h2.2l2 12.4a1.6 1.6 0 0 0 1.6 1.3h9.4a1.6 1.6 0 0 0 1.6-1.3L20.5 7H5.5" /></>,
  };
  return <svg {...props} aria-hidden="true">{paths[name] || null}</svg>;
}

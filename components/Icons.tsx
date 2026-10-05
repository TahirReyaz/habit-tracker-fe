// Square-cap, square-join line icons to match the ledger look.
const base = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "square" as const, strokeLinejoin: "miter" as const };

export const EyeIcon = () => (
  <svg {...base} aria-hidden><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" /><rect x="6.5" y="6.5" width="3" height="3" /></svg>
);
export const EyeOffIcon = () => (
  <svg {...base} aria-hidden><path d="M1.5 8S4 3.5 8 3.5c1.3 0 2.4.5 3.4 1.1M14.5 8S12 12.5 8 12.5c-1.3 0-2.4-.5-3.4-1.1" /><path d="M2 14 14 2" /></svg>
);
export const LockIcon = () => (
  <svg {...base} aria-hidden><rect x="3" y="7" width="10" height="7" /><path d="M5 7V4.5h6V7" /></svg>
);
export const ChevL = () => (<svg {...base} aria-hidden><path d="M10 3 5 8l5 5" /></svg>);
export const ChevR = () => (<svg {...base} aria-hidden><path d="m6 3 5 5-5 5" /></svg>);
export const PlusIcon = () => (<svg {...base} aria-hidden><path d="M8 3v10M3 8h10" /></svg>);
export const CloseIcon = () => (<svg {...base} aria-hidden><path d="m3.5 3.5 9 9M12.5 3.5l-9 9" /></svg>);
export const SunIcon = () => (
  <svg {...base} aria-hidden>
    <rect x="5.5" y="5.5" width="5" height="5" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" />
  </svg>
);
export const MoonIcon = () => (
  <svg {...base} aria-hidden><path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7Z" /></svg>
);

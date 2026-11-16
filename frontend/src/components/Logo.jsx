import { Link } from "react-router-dom";
import "./Logo.css";

export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--green-900)" />
      <path d="M14 30c0-9 8-15 18-15s18 6 18 15z" fill="var(--orange-500)" />
      <rect x="12" y="33" width="40" height="6" rx="3" fill="var(--green-300)" />
      <path d="M14 42h36c0 5-4 8-9 8H23c-5 0-9-3-9-8z" fill="var(--orange-500)" />
    </svg>
  );
}

export default function Logo({ to = "/", light = false }) {
  return (
    <Link to={to} className={`logo ${light ? "logo-light" : ""}`} aria-label="EstuLanches — início">
      <LogoMark />
      <span>
        Estu<strong>Lanches</strong>
      </span>
    </Link>
  );
}

import { ORDER_STATUS } from "../utils/format.js";
import "./StatusBadge.css";

export default function StatusBadge({ status, short = false }) {
  const info = ORDER_STATUS[status] ?? { label: status, short: status, tone: "gray" };
  return (
    <span className={`badge badge-${info.tone}`}>
      <span className="badge-dot" aria-hidden="true" />
      {short ? info.short : info.label}
    </span>
  );
}

export function AvailabilityBadge({ available }) {
  return (
    <span className={`badge ${available ? "badge-green" : "badge-red"}`}>
      <span className="badge-dot" aria-hidden="true" />
      {available ? "Disponível" : "Indisponível"}
    </span>
  );
}

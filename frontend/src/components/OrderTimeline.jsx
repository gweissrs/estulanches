import { Check, ChefHat, Clock, PackageCheck, XCircle } from "lucide-react";
import { ORDER_FLOW, ORDER_STATUS } from "../utils/format.js";
import "./OrderTimeline.css";

const ICONS = { PENDING: Clock, PREPARING: ChefHat, READY: PackageCheck, COMPLETED: Check };

export default function OrderTimeline({ status }) {
  if (status === "CANCELLED") {
    return (
      <div className="timeline-cancelled">
        <XCircle size={20} /> Este pedido foi cancelado.
      </div>
    );
  }

  const current = ORDER_FLOW.indexOf(status);
  return (
    <ol className="timeline" aria-label="Andamento do pedido">
      {ORDER_FLOW.map((step, index) => {
        const Icon = ICONS[step];
        const state = index < current ? "done" : index === current ? "current" : "todo";
        return (
          <li key={step} className={`timeline-step ${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="timeline-icon">
              <Icon size={18} />
            </span>
            <span className="timeline-label">{ORDER_STATUS[step].label}</span>
          </li>
        );
      })}
    </ol>
  );
}

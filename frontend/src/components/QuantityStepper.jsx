import { Minus, Plus } from "lucide-react";
import { MAX_QUANTITY } from "../hooks/useCart.jsx";

export default function QuantityStepper({ value, onChange, label }) {
  return (
    <div className="stepper" role="group" aria-label={`Quantidade de ${label}`}>
      <button type="button" onClick={() => onChange(value - 1)} aria-label="Diminuir quantidade">
        <Minus size={16} />
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= MAX_QUANTITY} aria-label="Aumentar quantidade">
        <Plus size={16} />
      </button>
    </div>
  );
}

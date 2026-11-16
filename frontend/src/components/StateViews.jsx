import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import "./StateViews.css";

export function Spinner({ size = 20, label = "Carregando" }) {
  return <Loader2 size={size} className="spin" aria-label={label} />;
}

export function LoadingState({ message = "Carregando..." }) {
  return (
    <div className="state-view" role="status">
      <Spinner size={28} />
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-view state-error" role="alert">
      <span className="state-icon">
        <AlertTriangle size={24} />
      </span>
      <h3>Não foi possível carregar</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={() => onRetry()}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="state-view">
      <span className="state-icon">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="skeleton-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton skeleton-img" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

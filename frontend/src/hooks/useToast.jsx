import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import "../styles/toast.css";

const ToastContext = createContext(null);
const ICONS = { success: CheckCircle2, error: XCircle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((toast) => toast.id !== id)), []);

  const show = useCallback(
    (message, type = "info") => {
      const id = crypto.randomUUID?.() ?? String(Date.now() + Math.random());
      setToasts((t) => [...t.slice(-3), { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (m) => show(m, "success"),
      error: (m) => show(m, "error"),
      info: (m) => show(m, "info"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map(({ id, message, type }) => {
          const Icon = ICONS[type];
          return (
            <div key={id} className={`toast toast-${type}`}>
              <Icon size={18} />
              <span>{message}</span>
              <button type="button" className="toast-close" onClick={() => dismiss(id)} aria-label="Fechar aviso">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  return ctx;
}

import { ArrowLeft, PartyPopper } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ConfirmDialog } from "../components/Modal.jsx";
import OrderTimeline from "../components/OrderTimeline.jsx";
import { ErrorState, LoadingState } from "../components/StateViews.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { useToast } from "../hooks/useToast.jsx";
import { getErrorMessage } from "../services/api.js";
import { orderService } from "../services/index.js";
import { formatCurrency, formatDateTime, PLACEHOLDER_IMAGE } from "../utils/format.js";
import "./Orders.css";

const FINAL = ["COMPLETED", "CANCELLED"];

export default function OrderDetail() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data: order, loading, error, reload, setData } = useFetch(() => orderService.get(id), [id], {
    pollInterval: 8000,
  });

  async function handleCancel() {
    setCancelling(true);
    try {
      setData(await orderService.cancel(order.id));
      toast.success("Pedido cancelado.");
      setConfirmOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <LoadingState message="Carregando pedido..." />;
  if (error)
    return (
      <div className="page container">
        <ErrorState message={error} onRetry={reload} />
      </div>
    );

  return (
    <div className="page container order-detail">
      <Link to={isAdmin ? "/admin/pedidos" : "/pedidos"} className="back-link">
        <ArrowLeft size={16} /> {isAdmin ? "Voltar para pedidos" : "Meus pedidos"}
      </Link>

      {location.state?.justCreated && order.status === "PENDING" && (
        <div className="order-success fade-up">
          <PartyPopper size={22} />
          <div>
            <strong>Pedido recebido!</strong>
            <p>Guarde o número {order.orderNumber}. Avisaremos aqui quando estiver pronto para retirada.</p>
          </div>
        </div>
      )}

      <div className="card order-detail-card">
        <div className="order-detail-head">
          <div>
            <span className="muted">Pedido</span>
            <h1 className="order-number">{order.orderNumber}</h1>
            <span className="muted">Feito em {formatDateTime(order.createdAt)}</span>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="order-detail-timeline">
          <OrderTimeline status={order.status} />
          {!FINAL.includes(order.status) && <p className="live-hint">● Atualizando automaticamente</p>}
        </div>

        <ul className="order-items">
          {order.items.map((item) => (
            <li key={item.id}>
              <img src={item.product.image || PLACEHOLDER_IMAGE} alt="" />
              <div>
                <strong>{item.product.name}</strong>
                <span className="muted">
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </span>
              </div>
              <span className="order-item-subtotal">{formatCurrency(item.subtotal)}</span>
            </li>
          ))}
        </ul>

        <div className="order-detail-total">
          <span>Total</span>
          <strong>{formatCurrency(order.total)}</strong>
        </div>

        {!isAdmin && order.status === "PENDING" && (
          <div className="order-detail-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmOpen(true)}>
              Cancelar pedido
            </button>
            <span className="muted">Possível enquanto a cantina não confirmar o pedido.</span>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancelar pedido?"
        message={`O pedido ${order.orderNumber} será cancelado e não poderá ser reaberto.`}
        confirmLabel="Sim, cancelar"
        danger
        loading={cancelling}
        onConfirm={handleCancel}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}

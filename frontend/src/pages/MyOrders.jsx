import { ChevronRight, ReceiptText, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { orderService } from "../services/index.js";
import { formatCurrency, formatDateTime } from "../utils/format.js";
import "./Orders.css";

const ACTIVE = ["PENDING", "PREPARING", "READY"];

export default function MyOrders() {
  // Atualiza a cada 10s para refletir mudanças de status feitas pela cantina
  const { data: orders, loading, error, reload } = useFetch(() => orderService.mine(), [], { pollInterval: 10000 });

  const active = (orders ?? []).filter((o) => ACTIVE.includes(o.status));
  const history = (orders ?? []).filter((o) => !ACTIVE.includes(o.status));

  return (
    <div className="page container orders-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">Pedidos</span>
          <h1>Meus pedidos</h1>
          <p>Acompanhe o andamento — a lista é atualizada automaticamente.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => reload()}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      {loading ? (
        <LoadingState message="Carregando pedidos..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !orders.length ? (
        <EmptyState
          icon={ReceiptText}
          title="Você ainda não fez pedidos"
          description="Quando fizer um pedido, ele aparecerá aqui com o status atualizado."
          action={
            <Link to="/cardapio" className="btn btn-primary">
              Fazer meu primeiro pedido
            </Link>
          }
        />
      ) : (
        <>
          {active.length > 0 && <OrderList title="Em andamento" orders={active} highlight />}
          {history.length > 0 && <OrderList title="Histórico" orders={history} />}
        </>
      )}
    </div>
  );
}

function OrderList({ title, orders, highlight }) {
  return (
    <section className="orders-section">
      <h2>{title}</h2>
      <ul className="order-list">
        {orders.map((order) => (
          <li key={order.id}>
            <Link to={`/pedidos/${order.id}`} className={`order-row card ${highlight ? "order-row-active" : ""}`}>
              <div className="order-row-main">
                <strong className="order-number">{order.orderNumber}</strong>
                <span className="muted">
                  {formatDateTime(order.createdAt)} · {order.items.reduce((s, i) => s + i.quantity, 0)} itens
                </span>
                <span className="order-row-items">{order.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", ")}</span>
              </div>
              <StatusBadge status={order.status} />
              <strong className="order-row-total">{formatCurrency(order.total)}</strong>
              <ChevronRight size={18} className="muted" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

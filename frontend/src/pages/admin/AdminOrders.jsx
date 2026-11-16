import { ClipboardList, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../../components/Modal.jsx";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateViews.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { useFetch } from "../../hooks/useFetch.js";
import { useToast } from "../../hooks/useToast.jsx";
import { getErrorMessage } from "../../services/api.js";
import { adminService } from "../../services/index.js";
import { formatCurrency, formatDate, formatTime, NEXT_ACTIONS, ORDER_STATUS } from "../../utils/format.js";
import "./Admin.css";

const FILTERS = [{ value: "", label: "Todos" }, ...Object.entries(ORDER_STATUS).map(([value, s]) => ({ value, label: s.short }))];

export default function AdminOrders() {
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data, loading, error, reload } = useFetch(
    () => adminService.orders({ status: status || undefined, search: search || undefined, page, pageSize: 15 }),
    [status, search, page],
    { pollInterval: 10000 },
  );

  async function changeStatus(order, next) {
    setBusyId(order.id);
    try {
      await adminService.updateOrderStatus(order.id, next);
      toast.success(`Pedido ${order.orderNumber}: ${ORDER_STATUS[next].label.toLowerCase()}.`);
      setConfirm(null);
      await reload({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
      await reload({ silent: true });
    } finally {
      setBusyId(null);
    }
  }

  function handleAction(order, action) {
    if (action.danger) setConfirm({ order, action });
    else changeStatus(order, action.status);
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Pedidos</h1>
          <p>Gerencie a fila da cantina. A lista atualiza a cada 10 segundos.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => reload()}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      <div className="toolbar">
        <div className="chip-group">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`chip ${status === f.value ? "active" : ""}`}
              onClick={() => {
                setStatus(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={18} />
          <span className="sr-only">Pesquisar pedido</span>
          <input type="search" placeholder="Nº do pedido ou estudante" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </label>
      </div>

      <div className="card">
        {loading ? (
          <LoadingState message="Carregando pedidos..." />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data.data.length ? (
          <EmptyState icon={ClipboardList} title="Nenhum pedido encontrado" description="Ajuste os filtros ou aguarde novos pedidos." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Estudante</th>
                  <th>Produtos</th>
                  <th>Qtd.</th>
                  <th>Total</th>
                  <th>Horário</th>
                  <th>Status</th>
                  <th className="th-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((order) => (
                  <tr key={order.id}>
                    <td className="nowrap">
                      <Link to={`/pedidos/${order.id}`} className="order-link" title="Ver detalhes do pedido">
                        <strong className="order-number">{order.orderNumber}</strong>
                      </Link>
                    </td>
                    <td>{order.user.name}</td>
                    <td className="td-products">
                      {order.items.map((i) => (
                        <span key={i.id}>
                          {i.quantity}× {i.product.name}
                        </span>
                      ))}
                    </td>
                    <td>{order.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="nowrap">{formatCurrency(order.total)}</td>
                    <td className="nowrap">
                      <span className="td-time">{formatTime(order.createdAt)}</span>
                      <span className="td-date">{formatDate(order.createdAt)}</span>
                    </td>
                    <td>
                      <StatusBadge status={order.status} short />
                    </td>
                    <td>
                      <div className="row-actions row-actions-stack">
                        {NEXT_ACTIONS[order.status].map((action) => (
                          <button
                            key={action.status}
                            type="button"
                            className={`btn btn-sm ${action.danger ? "btn-ghost danger-text" : "btn-primary"}`}
                            disabled={busyId === order.id}
                            onClick={() => handleAction(order, action)}
                          >
                            {action.label}
                          </button>
                        ))}
                        {!NEXT_ACTIONS[order.status].length && <span className="muted">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <div className="pagination">
          <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span className="muted">
            Página {data.pagination.page} de {data.pagination.totalPages} · {data.pagination.total} pedidos
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Cancelar pedido?"
        message={confirm ? `O pedido ${confirm.order.orderNumber} de ${confirm.order.user.name} será cancelado.` : ""}
        confirmLabel="Cancelar pedido"
        danger
        loading={busyId !== null}
        onConfirm={() => changeStatus(confirm.order, confirm.action.status)}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}

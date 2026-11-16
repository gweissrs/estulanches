import {
  ArrowRight,
  ChefHat,
  CircleCheck,
  CircleDollarSign,
  Clock,
  Package,
  PackageX,
  ReceiptText,
  RefreshCw,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatCard } from "../../components/AdminLayout.jsx";
import { ErrorState, LoadingState } from "../../components/StateViews.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { useFetch } from "../../hooks/useFetch.js";
import { adminService } from "../../services/index.js";
import { formatCurrency, formatTime } from "../../utils/format.js";
import "./Admin.css";

export default function AdminDashboard() {
  const stats = useFetch(() => adminService.dashboard(), [], { pollInterval: 15000 });
  const queue = useFetch(() => adminService.orders({ pageSize: 6 }), [], { pollInterval: 15000 });

  if (stats.loading) return <LoadingState message="Carregando indicadores..." />;
  if (stats.error) return <ErrorState message={stats.error} onRetry={stats.reload} />;

  const { orders, revenue, products, students } = stats.data;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Visão geral</h1>
          <p>Indicadores atualizados automaticamente.</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            stats.reload();
            queue.reload();
          }}
        >
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      <div className="stat-grid">
        <StatCard icon={ReceiptText} label="Total de pedidos" value={orders.total} hint={`${orders.today} hoje`} />
        <StatCard icon={Clock} label="Pedidos pendentes" value={orders.pending} tone="amber" hint="Aguardando confirmação" />
        <StatCard icon={ChefHat} label="Em preparação" value={orders.preparing} tone="blue" hint={`${orders.ready} prontos para retirada`} />
        <StatCard icon={CircleCheck} label="Pedidos finalizados" value={orders.completed} tone="gray" hint={`${orders.cancelled} cancelados`} />
        <StatCard
          icon={CircleDollarSign}
          label="Faturamento registrado"
          value={formatCurrency(revenue.total)}
          tone="orange"
          hint={`${formatCurrency(revenue.today)} hoje · exclui cancelados`}
        />
        <StatCard icon={Package} label="Produtos cadastrados" value={products.total} />
        <StatCard icon={PackageX} label="Produtos indisponíveis" value={products.unavailable} tone="red" />
        <StatCard icon={Users} label="Estudantes cadastrados" value={students} tone="gray" />
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Pedidos recentes</h2>
          <Link to="/admin/pedidos" className="btn btn-ghost btn-sm">
            Gerenciar pedidos <ArrowRight size={16} />
          </Link>
        </div>
        {queue.loading ? (
          <LoadingState />
        ) : !queue.data?.data.length ? (
          <p className="muted card-empty">Nenhum pedido registrado ainda.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Estudante</th>
                  <th>Horário</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.data.data.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong className="order-number">{o.orderNumber}</strong>
                    </td>
                    <td>{o.user.name}</td>
                    <td>{formatTime(o.createdAt)}</td>
                    <td>{formatCurrency(o.total)}</td>
                    <td>
                      <StatusBadge status={o.status} short />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

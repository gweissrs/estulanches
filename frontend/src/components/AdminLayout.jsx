import { ClipboardList, LayoutDashboard, Package, Tags } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import "./AdminLayout.css";

const LINKS = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, end: true },
  { to: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/admin/produtos", label: "Cardápio", icon: Package },
  { to: "/admin/categorias", label: "Categorias", icon: Tags },
];

export default function AdminLayout() {
  return (
    <div className="container admin-layout">
      <aside className="admin-sidebar" aria-label="Menu administrativo">
        <span className="eyebrow">Administração</span>
        <nav>
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="admin-content">
        <Outlet />
      </section>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, tone = "green", hint }) {
  return (
    <div className="stat-card card">
      <span className={`stat-icon stat-${tone}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {hint && <p className="stat-hint">{hint}</p>}
      </div>
    </div>
  );
}

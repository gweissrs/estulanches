import { LayoutDashboard, LogOut, Menu as MenuIcon, ReceiptText, ShoppingBag, UtensilsCrossed, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useCart } from "../hooks/useCart.jsx";
import Logo from "./Logo.jsx";
import "./Navbar.css";

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const firstName = user?.name?.split(" ")[0];

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Logo />

        <nav className={`navbar-links ${open ? "open" : ""}`} aria-label="Navegação principal">
          <NavLink to="/cardapio">
            <UtensilsCrossed size={18} /> Cardápio
          </NavLink>
          {isAuthenticated && !isAdmin && (
            <NavLink to="/pedidos">
              <ReceiptText size={18} /> Meus pedidos
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin">
              <LayoutDashboard size={18} /> Painel
            </NavLink>
          )}

          <div className="navbar-auth-mobile">
            {isAuthenticated ? (
              <button type="button" className="btn btn-secondary btn-block" onClick={handleLogout}>
                <LogOut size={16} /> Sair
              </button>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary btn-block">
                  Entrar
                </Link>
                <Link to="/cadastro" className="btn btn-primary btn-block">
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className="navbar-actions">
          {!isAdmin && (
            <Link to="/carrinho" className="cart-button" aria-label={`Carrinho com ${count} itens`}>
              <ShoppingBag size={20} />
              {count > 0 && <span className="cart-count">{count}</span>}
            </Link>
          )}

          {isAuthenticated ? (
            <div className="navbar-user">
              <span className="avatar" aria-hidden="true">
                {firstName?.[0]?.toUpperCase()}
              </span>
              <span className="navbar-user-name">
                {firstName}
                <small>{isAdmin ? "Administrador" : "Estudante"}</small>
              </span>
              <button type="button" className="btn btn-ghost btn-icon" onClick={handleLogout} aria-label="Sair" title="Sair">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="navbar-auth">
              <Link to="/login" className="btn btn-ghost">
                Entrar
              </Link>
              <Link to="/cadastro" className="btn btn-primary">
                Criar conta
              </Link>
            </div>
          )}

          <button
            type="button"
            className="btn btn-ghost btn-icon navbar-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}

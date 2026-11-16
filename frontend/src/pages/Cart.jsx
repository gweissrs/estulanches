import { ArrowLeft, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import QuantityStepper from "../components/QuantityStepper.jsx";
import { EmptyState } from "../components/StateViews.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { useCart } from "../hooks/useCart.jsx";
import { useToast } from "../hooks/useToast.jsx";
import { getErrorMessage } from "../services/api.js";
import { orderService } from "../services/index.js";
import { formatCurrency, PLACEHOLDER_IMAGE } from "../utils/format.js";
import "./Cart.css";

export default function Cart() {
  const { items, total, count, updateQuantity, removeItem, clear } = useCart();
  const { isAuthenticated, isAdmin } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const navigate = useNavigate();

  async function handleCheckout() {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/carrinho" } });
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      // Envia apenas ids e quantidades: preço e disponibilidade são validados no backend.
      const order = await orderService.create(items.map((i) => ({ productId: i.id, quantity: i.quantity })));
      clear();
      toast.success(`Pedido ${order.orderNumber} confirmado!`);
      navigate(`/pedidos/${order.id}`, { state: { justCreated: true } });
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível confirmar o pedido."));
    } finally {
      setSubmitting(false);
    }
  }

  if (!items.length) {
    return (
      <div className="page container">
        <EmptyState
          icon={ShoppingBag}
          title="Seu carrinho está vazio"
          description="Explore o cardápio e adicione seus lanches favoritos."
          action={
            <Link to="/cardapio" className="btn btn-primary">
              Ver cardápio
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="page container">
      <div className="page-header">
        <div>
          <Link to="/cardapio" className="back-link">
            <ArrowLeft size={16} /> Continuar comprando
          </Link>
          <h1>Carrinho</h1>
          <p>
            {count} {count === 1 ? "item" : "itens"} no carrinho
          </p>
        </div>
      </div>

      <div className="cart-layout">
        <ul className="cart-list card">
          {items.map((item) => (
            <li key={item.id} className="cart-item">
              <img src={item.image || PLACEHOLDER_IMAGE} alt="" />
              <div className="cart-item-info">
                <strong>{item.name}</strong>
                <span className="muted">{formatCurrency(item.price)} cada</span>
              </div>
              <QuantityStepper value={item.quantity} onChange={(q) => updateQuantity(item.id, q)} label={item.name} />
              <span className="cart-item-subtotal">{formatCurrency(item.price * item.quantity)}</span>
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => removeItem(item.id)} aria-label={`Remover ${item.name}`}>
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>

        <aside className="cart-summary card">
          <h2>Resumo</h2>
          <dl>
            {items.map((item) => (
              <div key={item.id}>
                <dt>
                  {item.quantity}× {item.name}
                </dt>
                <dd>{formatCurrency(item.price * item.quantity)}</dd>
              </div>
            ))}
            <div className="cart-subtotal">
              <dt>Subtotal</dt>
              <dd>{formatCurrency(total)}</dd>
            </div>
            <div className="cart-total">
              <dt>Total</dt>
              <dd>{formatCurrency(total)}</dd>
            </div>
          </dl>

          {error && <div className="alert alert-error">{error}</div>}

          {isAdmin ? (
            <div className="alert alert-info">Contas de administrador não realizam pedidos.</div>
          ) : (
            <button type="button" className="btn btn-accent btn-lg btn-block" onClick={handleCheckout} disabled={submitting}>
              {submitting ? "Confirmando..." : isAuthenticated ? "Confirmar pedido" : "Entrar para finalizar"}
            </button>
          )}
          <p className="cart-note">Pagamento na retirada. Os valores são conferidos pelo sistema ao confirmar.</p>
        </aside>
      </div>
    </div>
  );
}

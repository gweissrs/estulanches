import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { formatCurrency, PLACEHOLDER_IMAGE } from "../utils/format.js";
import "./ProductCard.css";

export default function ProductCard({ product, onAdd, quantityInCart = 0 }) {
  const [added, setAdded] = useState(false);

  function handleAdd() {
    onAdd(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <article className="product-card fade-up">
      <div className="product-image">
        <img
          src={product.image || PLACEHOLDER_IMAGE}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = PLACEHOLDER_IMAGE;
          }}
        />
        {product.category && <span className="product-category">{product.category.name}</span>}
        {quantityInCart > 0 && <span className="product-in-cart">{quantityInCart} no carrinho</span>}
      </div>
      <div className="product-body">
        <h3>{product.name}</h3>
        {product.description && <p>{product.description}</p>}
        <div className="product-footer">
          <span className="product-price">{formatCurrency(product.price)}</span>
          {product.available ? (
            <button
              type="button"
              className={`btn btn-sm ${added ? "btn-secondary" : "btn-primary"}`}
              onClick={handleAdd}
              aria-label={`Adicionar ${product.name} ao carrinho`}
            >
              {added ? <Check size={16} /> : <Plus size={16} />}
              {added ? "Adicionado" : "Adicionar"}
            </button>
          ) : (
            <span className="product-unavailable">Indisponível</span>
          )}
        </div>
      </div>
    </article>
  );
}

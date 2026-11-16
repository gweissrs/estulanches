import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cartTotal } from "../utils/format.js";

const CART_KEY = "estulanches.cart";
export const MAX_QUANTITY = 20;

const CartContext = createContext(null);

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((i) => i && i.id && i.quantity > 0) : [];
  } catch {
    return [];
  }
}

/**
 * Carrinho no navegador (persistido no localStorage).
 * Os preços aqui servem apenas para exibição: o backend recalcula tudo ao confirmar o pedido.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const addItem = useCallback((product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((i) => i.id === product.id);
      if (existing) {
        return current.map((i) =>
          i.id === product.id ? { ...i, quantity: Math.min(MAX_QUANTITY, i.quantity + quantity) } : i,
        );
      }
      const { id, name, price, image } = product;
      return [...current, { id, name, price, image, quantity: Math.min(MAX_QUANTITY, quantity) }];
    });
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((i) => i.id !== id)
        : current.map((i) => (i.id === id ? { ...i, quantity: Math.min(MAX_QUANTITY, quantity) } : i)),
    );
  }, []);

  const removeItem = useCallback((id) => setItems((current) => current.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      total: cartTotal(items),
      addItem,
      updateQuantity,
      removeItem,
      clear,
    }),
    [items, addItem, updateQuantity, removeItem, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>");
  return ctx;
}

import { Search, SearchX, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import { EmptyState, ErrorState, SkeletonGrid } from "../components/StateViews.jsx";
import { useCart } from "../hooks/useCart.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { useToast } from "../hooks/useToast.jsx";
import { catalogService } from "../services/index.js";
import { formatCurrency } from "../utils/format.js";
import "./Menu.css";

export default function Menu() {
  const [categoryId, setCategoryId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const { addItem, items, count, total } = useCart();
  const toast = useToast();

  // Debounce da pesquisa para não chamar a API a cada tecla
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data: categories } = useFetch(() => catalogService.categories(), []);
  const {
    data: products,
    loading,
    error,
    reload,
  } = useFetch(
    () => catalogService.products({ categoryId: categoryId ?? undefined, search: search || undefined }),
    [categoryId, search],
  );

  function handleAdd(product) {
    addItem(product);
    toast.success(`${product.name} adicionado ao carrinho.`);
  }

  // Agrupa por categoria quando nenhum filtro de categoria está ativo
  const groups = [];
  for (const product of products ?? []) {
    const name = product.category?.name ?? "Outros";
    let group = groups.find((g) => g.name === name);
    if (!group) groups.push((group = { name, items: [] }));
    group.items.push(product);
  }

  const qtyInCart = (id) => items.find((i) => i.id === id)?.quantity;

  return (
    <div className="page container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Cardápio</span>
          <h1>O que vai ser hoje?</h1>
          <p>Somente itens disponíveis no momento são exibidos.</p>
        </div>
        <label className="search-box">
          <Search size={18} />
          <span className="sr-only">Pesquisar produto</span>
          <input
            type="search"
            placeholder="Pesquisar por nome..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
      </div>

      <div className="chip-group menu-filters" role="tablist" aria-label="Filtrar por categoria">
        <button type="button" role="tab" aria-selected={categoryId === null} className={`chip ${categoryId === null ? "active" : ""}`} onClick={() => setCategoryId(null)}>
          Todos
        </button>
        {(categories ?? []).map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={categoryId === c.id}
            className={`chip ${categoryId === c.id ? "active" : ""}`}
            onClick={() => setCategoryId(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !products?.length ? (
        <EmptyState
          icon={SearchX}
          title="Nenhum produto encontrado"
          description={search ? `Não encontramos resultados para "${search}".` : "Não há produtos disponíveis nesta categoria agora."}
          action={
            (search || categoryId) && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSearchInput("");
                  setCategoryId(null);
                }}
              >
                Limpar filtros
              </button>
            )
          }
        />
      ) : (
        groups.map((group) => (
          <section key={group.name} className="menu-group">
            <h2>
              {group.name} <span>{group.items.length}</span>
            </h2>
            <div className="product-grid">
              {group.items.map((product) => (
                <ProductCard key={product.id} product={product} onAdd={handleAdd} quantityInCart={qtyInCart(product.id)} />
              ))}
            </div>
          </section>
        ))
      )}

      {count > 0 && (
        <Link to="/carrinho" className="floating-cart fade-up">
          <ShoppingBag size={20} />
          <span>
            {count} {count === 1 ? "item" : "itens"}
          </span>
          <strong>{formatCurrency(total)}</strong>
          <span className="floating-cart-cta">Ver carrinho</span>
        </Link>
      )}
    </div>
  );
}

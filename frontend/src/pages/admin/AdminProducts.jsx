import { Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import Modal, { ConfirmDialog } from "../../components/Modal.jsx";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateViews.jsx";
import { AvailabilityBadge } from "../../components/StatusBadge.jsx";
import { useFetch } from "../../hooks/useFetch.js";
import { useToast } from "../../hooks/useToast.jsx";
import { getErrorMessage, getFieldErrors } from "../../services/api.js";
import { adminService, catalogService } from "../../services/index.js";
import { formatCurrency, PLACEHOLDER_IMAGE } from "../../utils/format.js";
import "./Admin.css";

const EMPTY_FORM = { name: "", description: "", price: "", image: "", categoryId: "", available: true };

export default function AdminProducts() {
  const [categoryId, setCategoryId] = useState("");
  const [availability, setAvailability] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | product
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { data: categories } = useFetch(() => catalogService.categories(), []);
  const { data: products, loading, error, reload } = useFetch(
    () =>
      adminService.products({
        categoryId: categoryId || undefined,
        available: availability || undefined,
        search: search || undefined,
      }),
    [categoryId, availability, search],
  );

  async function toggleAvailability(product) {
    setTogglingId(product.id);
    try {
      await adminService.updateProduct(product.id, { available: !product.available });
      toast.success(`${product.name} ${product.available ? "desativado" : "disponível no cardápio"}.`);
      await reload({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await adminService.deleteProduct(toDelete.id);
      toast.success("Produto excluído.");
      setToDelete(null);
      await reload({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Cardápio</h1>
          <p>Cadastre produtos, ajuste preços e controle a disponibilidade.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")} disabled={!categories?.length}>
          <Plus size={18} /> Novo produto
        </button>
      </div>

      <div className="toolbar">
        <div className="toolbar-filters">
          <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Filtrar por categoria">
            <option value="">Todas as categorias</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="select" value={availability} onChange={(e) => setAvailability(e.target.value)} aria-label="Filtrar por disponibilidade">
            <option value="">Todas</option>
            <option value="true">Disponíveis</option>
            <option value="false">Indisponíveis</option>
          </select>
        </div>
        <label className="search-box">
          <Search size={18} />
          <span className="sr-only">Pesquisar produto</span>
          <input type="search" placeholder="Pesquisar produto" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </label>
      </div>

      <div className="card">
        {loading ? (
          <LoadingState message="Carregando produtos..." />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !products.length ? (
          <EmptyState icon={Package} title="Nenhum produto encontrado" description="Cadastre um produto ou ajuste os filtros." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th>Disponibilidade</th>
                  <th className="th-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="product-cell">
                        <img src={p.image || PLACEHOLDER_IMAGE} alt="" />
                        <div>
                          <strong>{p.name}</strong>
                          {p.description && <span className="muted">{p.description}</span>}
                        </div>
                      </div>
                    </td>
                    <td>{p.category?.name}</td>
                    <td className="nowrap">{formatCurrency(p.price)}</td>
                    <td>
                      <label className="switch" title={p.available ? "Desativar" : "Ativar"}>
                        <input
                          type="checkbox"
                          checked={p.available}
                          disabled={togglingId === p.id}
                          onChange={() => toggleAvailability(p)}
                          aria-label={`Disponibilidade de ${p.name}`}
                        />
                        <span className="switch-track" />
                        <AvailabilityBadge available={p.available} />
                      </label>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(p)} aria-label={`Editar ${p.name}`} title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm danger-text"
                          onClick={() => setToDelete(p)}
                          aria-label={`Excluir ${p.name}`}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <ProductFormModal
          product={editing === "new" ? null : editing}
          categories={categories ?? []}
          onClose={() => setEditing(null)}
          onSaved={async (saved, isNew) => {
            toast.success(isNew ? `${saved.name} cadastrado.` : `${saved.name} atualizado.`);
            setEditing(null);
            await reload({ silent: true });
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Excluir produto?"
        message={toDelete ? `"${toDelete.name}" será removido. Produtos que já foram pedidos não podem ser excluídos — nesse caso, desative-o.` : ""}
        confirmLabel="Excluir"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}

function ProductFormModal({ product, categories, onClose, onSaved }) {
  const isNew = !product;
  const [form, setForm] = useState(() =>
    product
      ? {
          name: product.name,
          description: product.description ?? "",
          price: String(product.price),
          image: product.image ?? "",
          categoryId: String(product.categoryId),
          available: product.available,
        }
      : { ...EMPTY_FORM, categoryId: String(categories[0]?.id ?? "") },
  );
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const price = Number(String(form.price).replace(",", "."));
    const clientErrors = {};
    if (form.name.trim().length < 2) clientErrors.name = "Informe o nome do produto.";
    if (!Number.isFinite(price) || price <= 0) clientErrors.price = "Informe um preço maior que zero.";
    if (!form.categoryId) clientErrors.categoryId = "Selecione uma categoria.";
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Math.round(price * 100) / 100,
      image: form.image.trim() || null,
      categoryId: Number(form.categoryId),
      available: form.available,
    };

    setSaving(true);
    setServerError("");
    try {
      const saved = isNew ? await adminService.createProduct(payload) : await adminService.updateProduct(product.id, payload);
      await onSaved(saved, isNew);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={isNew ? "Novo produto" : "Editar produto"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form="product-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      {serverError && <div className="alert alert-error">{serverError}</div>}
      <form id="product-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="p-name">Nome</label>
          <input id="p-name" className={`input ${errors.name ? "has-error" : ""}`} value={form.name} onChange={update("name")} maxLength={100} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="p-desc">Descrição</label>
          <textarea id="p-desc" className="textarea" value={form.description} onChange={update("description")} maxLength={500} />
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="p-price">Preço (R$)</label>
            <input
              id="p-price"
              className={`input ${errors.price ? "has-error" : ""}`}
              inputMode="decimal"
              placeholder="0,00"
              value={form.price}
              onChange={update("price")}
            />
            {errors.price && <span className="field-error">{errors.price}</span>}
          </div>
          <div className="field">
            <label htmlFor="p-cat">Categoria</label>
            <select id="p-cat" className={`select ${errors.categoryId ? "has-error" : ""}`} value={form.categoryId} onChange={update("categoryId")}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <span className="field-error">{errors.categoryId}</span>}
          </div>
        </div>
        <div className="field">
          <label htmlFor="p-image">Imagem (URL)</label>
          <div className="image-field">
            <img src={form.image || PLACEHOLDER_IMAGE} alt="" onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMAGE)} />
            <input
              id="p-image"
              className={`input ${errors.image ? "has-error" : ""}`}
              placeholder="https://... ou /images/products/coxinha.svg"
              value={form.image}
              onChange={update("image")}
            />
          </div>
          {errors.image ? <span className="field-error">{errors.image}</span> : <span className="field-hint">Opcional. Use uma URL https ou um caminho local.</span>}
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={form.available} onChange={update("available")} />
          Disponível no cardápio
        </label>
      </form>
    </Modal>
  );
}

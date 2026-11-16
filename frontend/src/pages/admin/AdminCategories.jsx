import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import Modal, { ConfirmDialog } from "../../components/Modal.jsx";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateViews.jsx";
import { useFetch } from "../../hooks/useFetch.js";
import { useToast } from "../../hooks/useToast.jsx";
import { getErrorMessage, getFieldErrors } from "../../services/api.js";
import { adminService, catalogService } from "../../services/index.js";
import "./Admin.css";

export default function AdminCategories() {
  const { data: categories, loading, error, reload } = useFetch(() => catalogService.categories(), []);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  async function handleDelete() {
    setDeleting(true);
    try {
      await adminService.deleteCategory(toDelete.id);
      toast.success("Categoria excluída.");
      await reload({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Categorias</h1>
          <p>Organize o cardápio em seções.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>
          <Plus size={18} /> Nova categoria
        </button>
      </div>

      <div className="card">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !categories.length ? (
          <EmptyState icon={Tags} title="Nenhuma categoria" description="Crie a primeira categoria para cadastrar produtos." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Produtos</th>
                  <th className="th-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                    </td>
                    <td className="muted">{c.description || "—"}</td>
                    <td>{c._count?.products ?? 0}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(c)} aria-label={`Editar ${c.name}`} title="Editar">
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm danger-text"
                          onClick={() => setToDelete(c)}
                          aria-label={`Excluir ${c.name}`}
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
        <CategoryFormModal
          category={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async (saved, isNew) => {
            toast.success(isNew ? `Categoria ${saved.name} criada.` : `Categoria ${saved.name} atualizada.`);
            setEditing(null);
            await reload({ silent: true });
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Excluir categoria?"
        message={toDelete ? `A categoria "${toDelete.name}" será removida. Só é possível excluir categorias sem produtos.` : ""}
        confirmLabel="Excluir"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}

function CategoryFormModal({ category, onClose, onSaved }) {
  const isNew = !category;
  const [form, setForm] = useState({ name: category?.name ?? "", description: category?.description ?? "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      setErrors({ name: "Informe o nome da categoria." });
      return;
    }
    setSaving(true);
    setServerError("");
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || null };
      const saved = isNew ? await adminService.createCategory(payload) : await adminService.updateCategory(category.id, payload);
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
      size="sm"
      title={isNew ? "Nova categoria" : "Editar categoria"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" form="category-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </>
      }
    >
      {serverError && <div className="alert alert-error">{serverError}</div>}
      <form id="category-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="c-name">Nome</label>
          <input
            id="c-name"
            className={`input ${errors.name ? "has-error" : ""}`}
            value={form.name}
            maxLength={60}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setErrors({});
            }}
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="c-desc">Descrição</label>
          <textarea id="c-desc" className="textarea" value={form.description} maxLength={255} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>
      </form>
    </Modal>
  );
}

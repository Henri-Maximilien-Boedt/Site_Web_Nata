import Head from "next/head";
import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

const CATEGORIES = ["entrees", "plats", "desserts", "boissons"];
const CAT_LABELS  = { entrees: "Entrées", plats: "Plats", desserts: "Desserts", boissons: "Boissons" };
const ALL_TAGS    = ["vegan", "sans-gluten", "epice"];

const EMPTY_ITEM = { name: "", category: "entrees", subcategory: "", description: "", price: "", tags: [], sort_order: 0 };

export default function AdminMenu() {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null);   // null | "add" | item (édition)
  const [deleteModal, setDeleteModal] = useState(null); // item à supprimer
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState(EMPTY_ITEM);

  async function fetchItems() {
    setLoading(true);
    const res  = await fetch("/api/menu?admin=true");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { fetchItems(); }, []);

  function openAdd() { setForm(EMPTY_ITEM); setModal("add"); }
  function openEdit(item) { setForm({ ...item, price: item.price ?? "", tags: item.tags ?? [] }); setModal(item); }

  async function handleSave() {
    setSaving(true);
    const payload = {
      ...form,
      price: form.price === "" ? null : Number(form.price),
    };

    if (modal === "add") {
      await fetch("/api/menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/menu", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: modal.id, ...payload }) });
    }
    setSaving(false);
    setModal(null);
    fetchItems();
  }

  async function handleToggle(item) {
    // Mise à jour optimiste
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
    await fetch("/api/menu", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, is_available: !item.is_available }),
    });
  }

  async function handleDelete() {
    await fetch("/api/menu", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteModal.id }) });
    setDeleteModal(null);
    fetchItems();
  }

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {});

  return (
    <>
      <Head><title>Menu — NATA Admin</title></Head>
      <AdminLayout>
        <div className="flex flex-col gap-6">

          {/* En-tête */}
          <div className="flex items-center justify-between">
            <h1 className="font-title text-4xl" style={{ color: "var(--text-primary)" }}>
              Menu
            </h1>
            <Button onClick={openAdd}>+ Ajouter un plat</Button>
          </div>

          {/* Liste par catégorie */}
          {loading ? (
            <p style={{ color: "var(--text-secondary)" }}>Chargement…</p>
          ) : (
            CATEGORIES.map((cat) => {
              const catItems = byCategory[cat];
              if (!catItems.length) return null;
              return (
                <section key={cat}>
                  <h2 className="font-title text-2xl mb-3" style={{ color: "var(--text-primary)" }}>
                    {CAT_LABELS[cat]}
                  </h2>
                  <div className="flex flex-col gap-2">
                    {catItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg border"
                        style={{
                          backgroundColor: "var(--bg-card)",
                          borderColor: "var(--bg-input)",
                          opacity: item.is_available ? 1 : 0.5,
                        }}
                      >
                        {/* Toggle dispo */}
                        <button
                          onClick={() => handleToggle(item)}
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg"
                          style={{ backgroundColor: item.is_available ? "rgba(34,197,94,0.15)" : "var(--bg-input)" }}
                          title={item.is_available ? "Disponible — cliquer pour désactiver" : "Indisponible — cliquer pour activer"}
                        >
                          {item.is_available ? "✓" : "✗"}
                        </button>

                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                            {item.name}
                          </p>
                          {item.description && (
                            <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Prix */}
                        {item.price != null && (
                          <span className="text-sm font-bold shrink-0" style={{ color: "var(--accent)" }}>
                            {Number(item.price).toFixed(2)} €
                          </span>
                        )}

                        {/* Actions */}
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => openEdit(item)}
                            className="w-10 h-10 flex items-center justify-center rounded"
                            style={{ color: "var(--text-secondary)" }}
                            title="Modifier"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => setDeleteModal(item)}
                            className="w-10 h-10 flex items-center justify-center rounded"
                            style={{ color: "#ef4444" }}
                            title="Supprimer"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>

        {/* Modale ajout / édition */}
        <Modal
          open={!!modal}
          onClose={() => !saving && setModal(null)}
          title={modal === "add" ? "Ajouter un plat" : "Modifier le plat"}
          size="md"
        >
          <div className="flex flex-col gap-4">
            <Field label="Nom *">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input-base"
                placeholder="Ex : Bibimbap"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Catégorie *">
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input-base">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </Field>
              <Field label="Sous-catégorie">
                <input
                  value={form.subcategory}
                  onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
                  className="input-base"
                  placeholder="Ex : cocktails"
                />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="input-base resize-none"
                rows={2}
                placeholder="Description courte"
              />
            </Field>
            <Field label="Prix (€)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="input-base"
                placeholder="Laisser vide si non affiché"
              />
            </Field>
            <Field label="Tags">
              <div className="flex gap-3 flex-wrap">
                {ALL_TAGS.map((tag) => (
                  <label key={tag} className="flex items-center gap-1.5 cursor-pointer text-sm" style={{ color: "var(--text-secondary)" }}>
                    <input
                      type="checkbox"
                      checked={form.tags.includes(tag)}
                      onChange={(e) => {
                        const tags = e.target.checked
                          ? [...form.tags, tag]
                          : form.tags.filter((t) => t !== tag);
                        setForm((f) => ({ ...f, tags }));
                      }}
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </Field>

            <div className="flex gap-3 pt-2">
              <Button loading={saving} onClick={handleSave}>Enregistrer</Button>
              <Button variant="ghost" onClick={() => setModal(null)} disabled={saving}>Annuler</Button>
            </div>
          </div>
        </Modal>

        {/* Modale suppression */}
        <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Supprimer ce plat ?" size="sm">
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            « {deleteModal?.name} » sera définitivement supprimé.
          </p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={handleDelete}>Supprimer</Button>
            <Button variant="ghost" onClick={() => setDeleteModal(null)}>Annuler</Button>
          </div>
        </Modal>
      </AdminLayout>

      <style jsx global>{`
        .input-base {
          width: 100%;
          height: 2.75rem;
          padding: 0 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid var(--bg-input);
          background-color: var(--bg-input);
          color: var(--text-primary);
          font-size: 0.875rem;
          font-family: inherit;
        }
        textarea.input-base { height: auto; padding: 0.5rem 0.75rem; }
      `}</style>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

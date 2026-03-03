import Head from "next/head";
import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";

const EMPTY_ARTICLE = { title: "", content: "", image_url: "", event_date: "", is_published: false };

export default function AdminActualites() {
  const [articles, setArticles]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null);       // null | "add" | article
  const [deleteModal, setDeleteModal] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState(EMPTY_ARTICLE);

  async function fetchArticles() {
    setLoading(true);
    const res  = await fetch("/api/actualites?admin=true");
    const data = await res.json();
    setArticles(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { fetchArticles(); }, []);

  function openAdd()     { setForm(EMPTY_ARTICLE); setModal("add"); }
  function openEdit(a)   { setForm({ ...a, event_date: a.event_date ?? "", image_url: a.image_url ?? "" }); setModal(a); }

  async function handleSave() {
    setSaving(true);
    const payload = { ...form, event_date: form.event_date || null, image_url: form.image_url || null };
    if (modal === "add") {
      await fetch("/api/actualites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/actualites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: modal.id, ...payload }) });
    }
    setSaving(false);
    setModal(null);
    fetchArticles();
  }

  async function handleTogglePublish(article) {
    setArticles((prev) => prev.map((a) => a.id === article.id ? { ...a, is_published: !a.is_published } : a));
    await fetch("/api/actualites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: article.id, is_published: !article.is_published }),
    });
  }

  async function handleDelete() {
    await fetch("/api/actualites", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteModal.id }) });
    setDeleteModal(null);
    fetchArticles();
  }

  return (
    <>
      <Head><title>Actualités — NATA Admin</title></Head>
      <AdminLayout>
        <div className="flex flex-col gap-6">

          <div className="flex items-center justify-between">
            <h1 className="font-title text-4xl" style={{ color: "var(--text-primary)" }}>
              Actualités
            </h1>
            <Button onClick={openAdd}>+ Nouvel article</Button>
          </div>

          {loading ? (
            <p style={{ color: "var(--text-secondary)" }}>Chargement…</p>
          ) : articles.length === 0 ? (
            <p style={{ color: "var(--text-secondary)" }}>Aucun article.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {articles.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-4 rounded-lg border"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--bg-input)" }}
                >
                  {/* Statut publié */}
                  <button
                    onClick={() => handleTogglePublish(a)}
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm"
                    style={{ backgroundColor: a.is_published ? "rgba(34,197,94,0.15)" : "var(--bg-input)" }}
                    title={a.is_published ? "Publié — cliquer pour repasser en brouillon" : "Brouillon — cliquer pour publier"}
                  >
                    {a.is_published ? "✓" : "○"}
                  </button>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                        {a.title}
                      </p>
                      {a.event_date && (
                        <Badge variant="default">Événement</Badge>
                      )}
                      {!a.is_published && (
                        <Badge variant="default">Brouillon</Badge>
                      )}
                    </div>
                    {a.event_date && (
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {new Date(a.event_date).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(a)}
                      className="w-10 h-10 flex items-center justify-center rounded"
                      style={{ color: "var(--text-secondary)" }}
                      title="Modifier"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => setDeleteModal(a)}
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
          )}
        </div>

        {/* Modale ajout / édition */}
        <Modal open={!!modal} onClose={() => !saving && setModal(null)} title={modal === "add" ? "Nouvel article" : "Modifier l'article"} size="lg">
          <div className="flex flex-col gap-4">
            <Field label="Titre *">
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-base" placeholder="Titre de l'article" />
            </Field>
            <Field label="Contenu">
              <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} className="input-base resize-none" rows={5} placeholder="Texte de l'article…" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Date d'événement (optionnel)">
                <input type="date" value={form.event_date} onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))} className="input-base" />
              </Field>
              <Field label="URL image (Supabase Storage)">
                <input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} className="input-base" placeholder="https://…" />
              </Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "var(--text-secondary)" }}>
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))} />
              Publier immédiatement
            </label>
            <div className="flex gap-3 pt-2">
              <Button loading={saving} onClick={handleSave}>Enregistrer</Button>
              <Button variant="ghost" onClick={() => setModal(null)} disabled={saving}>Annuler</Button>
            </div>
          </div>
        </Modal>

        {/* Modale suppression */}
        <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Supprimer cet article ?" size="sm">
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            « {deleteModal?.title} » sera définitivement supprimé.
          </p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={handleDelete}>Supprimer</Button>
            <Button variant="ghost" onClick={() => setDeleteModal(null)}>Annuler</Button>
          </div>
        </Modal>
      </AdminLayout>

      <style jsx global>{`
        .input-base { width:100%; height:2.75rem; padding:0 0.75rem; border-radius:0.375rem; border:1px solid var(--bg-input); background-color:var(--bg-input); color:var(--text-primary); font-size:0.875rem; font-family:inherit; }
        textarea.input-base { height:auto; padding:0.5rem 0.75rem; }
      `}</style>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

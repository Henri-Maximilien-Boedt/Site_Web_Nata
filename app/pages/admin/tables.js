import Head from "next/head";
import { useState, useEffect, useRef, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

const EMPTY_FORM = { code: "", seats: 2, zone: "interieur" };

export default function AdminTables() {
  const [tables, setTables]                   = useState([]);
  const [terrasse, setTerrasse]               = useState(false);
  const [localPos, setLocalPos]               = useState({});
  const [draggingId, setDraggingId]           = useState(null);
  const [floorPlans, setFloorPlans]           = useState([]);
  const [savePlanModal, setSavePlanModal]     = useState(false);
  const [planName, setPlanName]               = useState("");
  const [loadPlanModal, setLoadPlanModal]     = useState(false);
  const [saving, setSaving]                   = useState(false);

  /* ── Ajout de table ───────────────────────────────────────── */
  const [addModal, setAddModal]       = useState(false);
  const [addForm, setAddForm]         = useState(EMPTY_FORM);
  const [addSaving, setAddSaving]     = useState(false);

  /* ── Suppression de table ────────────────────────────────── */
  const [deleteModal, setDeleteModal] = useState(null); // objet table

  const intRef = useRef(null);
  const terRef = useRef(null);

  /* ── Chargement initial ──────────────────────────────────── */
  const fetchTables = useCallback(async () => {
    const res  = await fetch("/api/tables");
    const data = await res.json();
    setTables(data.tables ?? []);
    setTerrasse(data.terrasse_active ?? false);
    const pos = {};
    (data.tables ?? []).forEach((t) => { pos[t.id] = { pos_x: t.pos_x, pos_y: t.pos_y }; });
    setLocalPos(pos);
  }, []);

  async function fetchFloorPlans() {
    const res  = await fetch("/api/tables/floor-plans");
    const data = await res.json();
    setFloorPlans(Array.isArray(data) ? data : []);
  }

  useEffect(() => { fetchTables(); fetchFloorPlans(); }, [fetchTables]);

  /* ── Drag & drop — Pointer Events ───────────────────────── */
  function getContainerRef(zone) { return zone === "interieur" ? intRef : terRef; }

  function onPointerDown(e, tableId) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingId(tableId);
  }

  function onPointerMove(e, tableId, zone) {
    if (draggingId !== tableId) return;
    const rect = getContainerRef(zone).current?.getBoundingClientRect();
    if (!rect) return;
    const pos_x = Math.min(97, Math.max(3, ((e.clientX - rect.left)  / rect.width)  * 100));
    const pos_y = Math.min(97, Math.max(3, ((e.clientY - rect.top)   / rect.height) * 100));
    setLocalPos((prev) => ({ ...prev, [tableId]: { pos_x, pos_y } }));
  }

  async function onPointerUp(e, tableId) {
    if (draggingId !== tableId) return;
    setDraggingId(null);
    const { pos_x, pos_y } = localPos[tableId] ?? {};
    if (pos_x === undefined) return;
    await fetch("/api/tables/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tableId, pos_x, pos_y }),
    });
  }

  /* ── Terrasse switch ─────────────────────────────────────── */
  async function toggleTerrasse() {
    const next = !terrasse;
    setTerrasse(next);
    await fetch("/api/tables/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "terrasse_active", value: String(next) }),
    });
  }

  /* ── Ajouter une table ───────────────────────────────────── */
  async function handleAddTable() {
    if (!addForm.code.trim() || !addForm.seats) return;
    setAddSaving(true);
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setAddSaving(false);
    setAddModal(false);
    setAddForm(EMPTY_FORM);
    fetchTables();
  }

  /* ── Supprimer une table ─────────────────────────────────── */
  async function handleDeleteTable() {
    if (!deleteModal) return;
    await fetch("/api/tables", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteModal.id }),
    });
    setDeleteModal(null);
    fetchTables();
  }

  /* ── Sauvegarder disposition ─────────────────────────────── */
  async function saveFloorPlan() {
    if (!planName.trim()) return;
    setSaving(true);
    const layout = tables.map((t) => ({ id: t.id, pos_x: localPos[t.id]?.pos_x ?? t.pos_x, pos_y: localPos[t.id]?.pos_y ?? t.pos_y }));
    await fetch("/api/tables/floor-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: planName.trim(), layout }),
    });
    setSaving(false);
    setSavePlanModal(false);
    setPlanName("");
    fetchFloorPlans();
  }

  /* ── Charger une disposition ─────────────────────────────── */
  async function loadFloorPlan(plan) {
    for (const entry of plan.layout) {
      await fetch("/api/tables/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, pos_x: entry.pos_x, pos_y: entry.pos_y }),
      });
    }
    setLoadPlanModal(false);
    fetchTables();
  }

  async function deleteFloorPlan(id) {
    await fetch("/api/tables/floor-plans", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchFloorPlans();
  }

  const intTables = tables.filter((t) => t.zone === "interieur");
  const terTables = tables.filter((t) => t.zone === "terrasse");

  return (
    <>
      <Head><title>Plan de salle — NATA Admin</title></Head>
      <AdminLayout>
        <div className="flex flex-col gap-6">

          {/* En-tête */}
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <h1 className="font-title text-4xl" style={{ color: "var(--text-primary)" }}>
              Plan de salle
            </h1>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => { setAddForm(EMPTY_FORM); setAddModal(true); }}>+ Table</Button>
              <Button variant="secondary" onClick={() => setSavePlanModal(true)}>💾 Sauvegarder</Button>
              <Button variant="secondary" onClick={() => { fetchFloorPlans(); setLoadPlanModal(true); }}>📂 Charger</Button>
            </div>
          </div>

          {/* Switch terrasse */}
          <div
            className="flex items-center justify-between p-4 rounded-lg border"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--bg-input)" }}
          >
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Terrasse</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {terrasse ? "Active — visible sur le site" : "Inactive — masquée sur le site"}
              </p>
            </div>
            <button
              onClick={toggleTerrasse}
              className="relative w-14 h-7 rounded-full transition-colors"
              style={{ backgroundColor: terrasse ? "var(--accent)" : "var(--bg-input)" }}
            >
              <span
                className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform"
                style={{ transform: terrasse ? "translateX(32px)" : "translateX(2px)" }}
              />
            </button>
          </div>

          {/* Légende */}
          <div className="flex gap-4 text-xs flex-wrap" style={{ color: "var(--text-secondary)" }}>
            <span>🟠 Drag & drop pour repositionner · 🗑 Clic long ou bouton pour supprimer</span>
          </div>

          {/* Plan intérieur */}
          <section>
            <h2 className="font-title text-2xl mb-3" style={{ color: "var(--text-primary)" }}>Intérieur</h2>
            {intTables.length === 0 ? (
              <p className="text-sm py-4" style={{ color: "var(--text-secondary)" }}>
                Aucune table. Cliquez sur &quot;+ Table&quot; pour en ajouter.
              </p>
            ) : (
              <div className="floor-plan" ref={intRef}>
                {intTables.map((table) => (
                  <TableWithDelete
                    key={table.id}
                    table={table}
                    pos={localPos[table.id] ?? { pos_x: table.pos_x, pos_y: table.pos_y }}
                    dragging={draggingId === table.id}
                    onPointerDown={(e) => onPointerDown(e, table.id)}
                    onPointerMove={(e) => onPointerMove(e, table.id, "interieur")}
                    onPointerUp={(e) => onPointerUp(e, table.id)}
                    onDelete={() => setDeleteModal(table)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Plan terrasse */}
          {terrasse && (
            <section>
              <h2 className="font-title text-2xl mb-3" style={{ color: "var(--text-primary)" }}>Terrasse</h2>
              {terTables.length === 0 ? (
                <p className="text-sm py-4" style={{ color: "var(--text-secondary)" }}>
                  Aucune table terrasse. Cliquez sur &quot;+ Table&quot; et choisissez &quot;Terrasse&quot;.
                </p>
              ) : (
                <div className="floor-plan" ref={terRef}>
                  {terTables.map((table) => (
                    <TableWithDelete
                      key={table.id}
                      table={table}
                      pos={localPos[table.id] ?? { pos_x: table.pos_x, pos_y: table.pos_y }}
                      dragging={draggingId === table.id}
                      onPointerDown={(e) => onPointerDown(e, table.id)}
                      onPointerMove={(e) => onPointerMove(e, table.id, "terrasse")}
                      onPointerUp={(e) => onPointerUp(e, table.id)}
                      onDelete={() => setDeleteModal(table)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Modale ajout de table */}
        <Modal open={addModal} onClose={() => setAddModal(false)} title="Ajouter une table" size="sm">
          <div className="flex flex-col gap-4">
            <Field label="Code *">
              <input
                value={addForm.code}
                onChange={(e) => setAddForm((f) => ({ ...f, code: e.target.value }))}
                className="h-12 px-4 rounded border text-sm w-full"
                style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--bg-input)" }}
                placeholder="Ex : T-1, TER-3"
                autoFocus
              />
            </Field>
            <Field label="Nombre de places *">
              <input
                type="number"
                min="1"
                max="20"
                value={addForm.seats}
                onChange={(e) => setAddForm((f) => ({ ...f, seats: e.target.value }))}
                className="h-12 px-4 rounded border text-sm w-full"
                style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--bg-input)" }}
              />
            </Field>
            <Field label="Zone *">
              <select
                value={addForm.zone}
                onChange={(e) => setAddForm((f) => ({ ...f, zone: e.target.value }))}
                className="h-12 px-4 rounded border text-sm w-full"
                style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--bg-input)" }}
              >
                <option value="interieur">Intérieur</option>
                <option value="terrasse">Terrasse</option>
              </select>
            </Field>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              La table apparaîtra au centre du plan. Faites-la glisser ensuite pour la positionner.
            </p>
            <div className="flex gap-3">
              <Button loading={addSaving} onClick={handleAddTable}>Ajouter</Button>
              <Button variant="ghost" onClick={() => setAddModal(false)}>Annuler</Button>
            </div>
          </div>
        </Modal>

        {/* Modale suppression */}
        <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Supprimer cette table ?" size="sm">
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            La table <strong style={{ color: "var(--text-primary)" }}>{deleteModal?.code}</strong> ({deleteModal?.seats} pers.) sera définitivement supprimée.
            Les réservations existantes ne seront pas affectées.
          </p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={handleDeleteTable}>Supprimer</Button>
            <Button variant="ghost" onClick={() => setDeleteModal(null)}>Annuler</Button>
          </div>
        </Modal>

        {/* Modale sauvegarder disposition */}
        <Modal open={savePlanModal} onClose={() => setSavePlanModal(false)} title="Sauvegarder la disposition" size="sm">
          <div className="flex flex-col gap-4">
            <input
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="h-12 px-4 rounded border text-sm w-full"
              style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--bg-input)" }}
              placeholder="Ex : Normal, Soirée événement…"
              onKeyDown={(e) => { if (e.key === "Enter") saveFloorPlan(); }}
            />
            <div className="flex gap-3">
              <Button loading={saving} onClick={saveFloorPlan}>Sauvegarder</Button>
              <Button variant="ghost" onClick={() => setSavePlanModal(false)}>Annuler</Button>
            </div>
          </div>
        </Modal>

        {/* Modale charger disposition */}
        <Modal open={loadPlanModal} onClose={() => setLoadPlanModal(false)} title="Charger une disposition" size="sm">
          {floorPlans.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Aucune disposition sauvegardée.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {floorPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-3 rounded border"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--bg-input)" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {plan.name}
                    {plan.is_default && <span className="ml-2 text-xs" style={{ color: "var(--accent)" }}>défaut</span>}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => loadFloorPlan(plan)} className="text-xs px-3 py-1.5 rounded" style={{ backgroundColor: "var(--accent)", color: "#fff" }}>
                      Charger
                    </button>
                    <button onClick={() => deleteFloorPlan(plan.id)} className="text-xs px-2 py-1.5 rounded" style={{ color: "#ef4444" }}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      </AdminLayout>
    </>
  );
}

/* ── Table avec bouton supprimer ─────────────────────────────── */
function TableWithDelete({ table, pos, dragging, onPointerDown, onPointerMove, onPointerUp, onDelete }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${pos.pos_x}%`,
        top: `${pos.pos_y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: dragging ? 10 : 1,
      }}
    >
      <button
        className={`table-btn free ${dragging ? "dragging" : ""}`}
        style={{ position: "relative", left: "unset", top: "unset", transform: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="table-code">{table.code}</span>
        <span className="table-seats">{table.seats}p</span>
      </button>
      {/* Bouton supprimer — badge en haut à droite */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute flex items-center justify-center rounded-full text-white font-bold"
        style={{
          top: "-6px",
          right: "-6px",
          width: "20px",
          height: "20px",
          fontSize: "10px",
          backgroundColor: "#ef4444",
          lineHeight: 1,
          zIndex: 20,
        }}
        title={`Supprimer ${table.code}`}
      >
        ✕
      </button>
    </div>
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

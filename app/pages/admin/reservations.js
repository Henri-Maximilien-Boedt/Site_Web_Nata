import Head from "next/head";
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatDateFR } from "@/lib/dateUtils";

const STATUS_LABELS = { pending: "En attente", confirmed: "Confirmée", cancelled: "Annulée" };

export default function AdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filterDate, setFilterDate]     = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [confirmModal, setConfirmModal] = useState(null); // { id, action }
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDate)   params.set("date", filterDate);
    if (filterStatus) params.set("status", filterStatus);
    const res  = await fetch(`/api/reservations?${params}`);
    const data = await res.json();
    setReservations(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filterDate, filterStatus]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  async function handleAction(id, action) {
    setActionLoading(true);
    await fetch(`/api/reservations/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setConfirmModal(null);
    setActionLoading(false);
    fetchReservations();
  }

  return (
    <>
      <Head><title>Réservations — NATA Admin</title></Head>
      <AdminLayout>
        <div className="flex flex-col gap-6">

          {/* En-tête */}
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-title text-4xl" style={{ color: "var(--text-primary)" }}>
              Réservations
            </h1>
            <button
              onClick={fetchReservations}
              className="text-sm px-4 h-10 rounded border"
              style={{ color: "var(--text-secondary)", borderColor: "var(--bg-input)" }}
            >
              ↺ Actualiser
            </button>
          </div>

          {/* Filtres */}
          <div className="flex flex-wrap gap-3">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-10 px-3 rounded border text-sm"
              style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--bg-input)" }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 px-3 rounded border text-sm"
              style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", borderColor: "var(--bg-input)" }}
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmées</option>
              <option value="cancelled">Annulées</option>
            </select>
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="h-10 px-3 rounded border text-sm"
                style={{ color: "var(--text-secondary)", borderColor: "var(--bg-input)" }}
              >
                ✕ Date
              </button>
            )}
          </div>

          {/* Liste */}
          {loading ? (
            <p className="py-8 text-center" style={{ color: "var(--text-secondary)" }}>Chargement…</p>
          ) : reservations.length === 0 ? (
            <p className="py-8 text-center" style={{ color: "var(--text-secondary)" }}>Aucune réservation.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {reservations.map((r) => (
                <ReservationCard
                  key={r.id}
                  resa={r}
                  onConfirm={() => setConfirmModal({ id: r.id, action: "confirm" })}
                  onCancel={() => setConfirmModal({ id: r.id, action: "cancel" })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modale confirmation */}
        <Modal
          open={!!confirmModal}
          onClose={() => !actionLoading && setConfirmModal(null)}
          title={confirmModal?.action === "confirm" ? "Confirmer la réservation ?" : "Refuser la réservation ?"}
          size="sm"
        >
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            {confirmModal?.action === "confirm"
              ? "Le client recevra un email de confirmation."
              : "Le client recevra un email d'annulation."}
          </p>
          <div className="flex gap-3">
            <Button
              variant={confirmModal?.action === "confirm" ? "primary" : "danger"}
              loading={actionLoading}
              onClick={() => handleAction(confirmModal.id, confirmModal.action)}
            >
              {confirmModal?.action === "confirm" ? "Confirmer" : "Refuser"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmModal(null)} disabled={actionLoading}>
              Annuler
            </Button>
          </div>
        </Modal>
      </AdminLayout>
    </>
  );
}

/* ── Card réservation (swipe mobile) ────────────────────────── */
function ReservationCard({ resa, onConfirm, onCancel }) {
  const [swipeX, setSwipeX] = useState(0);
  const [startX, setStartX] = useState(null);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(e) { setStartX(e.clientX); setDragging(false); }

  function onPointerMove(e) {
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 5) setDragging(true);
    if (dx < 0) setSwipeX(Math.max(dx, -140));
  }

  function onPointerUp() {
    if (swipeX < -60) setSwipeX(-140);
    else setSwipeX(0);
    setStartX(null);
    setTimeout(() => setDragging(false), 50);
  }

  return (
    <div className="relative overflow-hidden rounded-lg" style={{ touchAction: "pan-y" }}>
      {/* Actions révélées (swipe mobile) */}
      {resa.status === "pending" && (
        <div className="absolute right-0 top-0 bottom-0 flex">
          <button
            onClick={onConfirm}
            className="w-[70px] flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: "#22c55e" }}
          >
            ✓ Valider
          </button>
          <button
            onClick={onCancel}
            className="w-[70px] flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: "#ef4444" }}
          >
            ✕ Refuser
          </button>
        </div>
      )}

      {/* Card */}
      <div
        className="relative p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center gap-3"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--bg-input)",
          transform: `translateX(${swipeX}px)`,
          transition: startX === null ? "transform 0.2s ease" : "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              {resa.name}
            </span>
            <Badge variant={resa.status}>{STATUS_LABELS[resa.status]}</Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span>{formatDateFR(resa.date)}</span>
            <span>{resa.time_start?.slice(0, 5)}</span>
            <span>{resa.covers} pers.</span>
            <span>{resa.email}</span>
            {resa.phone && <span>{resa.phone}</span>}
          </div>
          {resa.message && (
            <p className="text-xs italic mt-1" style={{ color: "var(--text-secondary)" }}>
              « {resa.message} »
            </p>
          )}
        </div>

        {/* Actions desktop */}
        {resa.status === "pending" && (
          <div className="hidden sm:flex gap-2 shrink-0">
            <Button size="sm" onClick={onConfirm}>Valider</Button>
            <Button size="sm" variant="danger" onClick={onCancel}>Refuser</Button>
          </div>
        )}
      </div>
    </div>
  );
}

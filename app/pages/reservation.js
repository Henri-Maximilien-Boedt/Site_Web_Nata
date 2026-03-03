import Head from "next/head";
import { useState, useEffect, useCallback } from "react";
import DatePicker from "@/components/reservation/DatePicker";
import TimePicker from "@/components/reservation/TimePicker";
import FloorPlan from "@/components/reservation/FloorPlan";
import BookingForm from "@/components/reservation/BookingForm";
import { formatDateFR } from "@/lib/dateUtils";

export default function Reservation() {
  /* ── État principal ───────────────────────────────────────── */
  const [covers, setCovers]           = useState(2);
  const [date, setDate]               = useState(null);
  const [time, setTime]               = useState(null);
  const [selectedTable, setSelectedTable] = useState(null); // objet table

  /* ── Données chargées depuis l'API ───────────────────────── */
  const [tables, setTables]           = useState([]);
  const [terrasse, setTerrasse]       = useState(false);
  const [occupiedIds, setOccupiedIds] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingOcc, setLoadingOcc]   = useState(false);

  /* ── Soumission ───────────────────────────────────────────── */
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitted, setSubmitted]     = useState(false);

  /* ── Chargement initial des tables ───────────────────────── */
  useEffect(() => {
    fetch("/api/tables")
      .then((r) => r.json())
      .then((data) => {
        setTables(data.tables ?? []);
        setTerrasse(data.terrasse_active ?? false);
      })
      .finally(() => setLoadingInit(false));
  }, []);

  /* ── Chargement des tables occupées quand date + time changent ── */
  const fetchOccupancy = useCallback(async (d, t) => {
    if (!d || !t) { setOccupiedIds([]); return; }
    setLoadingOcc(true);
    const res  = await fetch(`/api/tables?date=${d}&time=${t}`);
    const data = await res.json();
    setOccupiedIds(data.occupied_ids ?? []);
    setLoadingOcc(false);
  }, []);

  /* ── Handlers ─────────────────────────────────────────────── */
  function handleCoversChange(delta) {
    const next = Math.max(1, Math.min(20, covers + delta));
    setCovers(next);
    // Si la table sélectionnée ne peut plus accueillir le groupe, la désélectionner
    if (selectedTable && selectedTable.seats < next) setSelectedTable(null);
  }

  function handleDateChange(newDate) {
    setDate(newDate);
    setTime(null);
    setSelectedTable(null);
    setOccupiedIds([]);
  }

  function handleTimeChange(newTime) {
    setTime(newTime);
    setSelectedTable(null);
    fetchOccupancy(date, newTime);
  }

  function handleTableSelect(table) {
    setSelectedTable(table);
  }

  async function handleFormSubmit(formData) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/reservations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          time_start: time,
          covers,
          table_id: selectedTable.id,
          ...formData,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Une erreur est survenue.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setSubmitError("Impossible de contacter le serveur.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Page succès ──────────────────────────────────────────── */
  if (submitted) {
    return (
      <>
        <Head><title>Réservation confirmée — NATA Bar</title></Head>
        <main className="max-w-lg mx-auto px-4 pt-28 pb-20 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-6"
            style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
          >
            ✓
          </div>
          <h1 className="font-title text-4xl mb-3" style={{ color: "var(--text-primary)" }}>
            Demande envoyée !
          </h1>
          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
            Votre demande de réservation a bien été reçue. Nous la confirmerons par email dans les
            plus brefs délais.
          </p>
          <div
            className="mt-6 p-4 rounded-xl text-sm text-left"
            style={{ backgroundColor: "var(--bg-card)", color: "var(--text-secondary)" }}
          >
            <p><strong style={{ color: "var(--text-primary)" }}>{formatDateFR(date)}</strong> à <strong style={{ color: "var(--text-primary)" }}>{time}</strong></p>
            <p>{covers} personne{covers > 1 ? "s" : ""} · Table {selectedTable?.code}</p>
          </div>
          <button
            onClick={() => {
              setSubmitted(false);
              setDate(null); setTime(null); setSelectedTable(null); setCovers(2);
            }}
            className="mt-8 text-sm underline"
            style={{ color: "var(--accent)" }}
          >
            Faire une autre réservation
          </button>
        </main>
      </>
    );
  }

  /* ── Page principale ──────────────────────────────────────── */
  return (
    <>
      <Head><title>Réservation — NATA Bar</title></Head>

      <main className="max-w-2xl mx-auto px-4 pt-24 pb-20">

        {/* En-tête */}
        <div className="mb-8">
          <h1 className="font-title text-5xl sm:text-6xl mb-2" style={{ color: "var(--text-primary)" }}>
            Réserver une table
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Choisissez vos préférences, puis remplissez vos coordonnées.
          </p>
        </div>

        {loadingInit ? (
          <p style={{ color: "var(--text-secondary)" }}>Chargement…</p>
        ) : (
          <div className="flex flex-col gap-8">

            {/* ── Étape 1 : Nombre de couverts ────────────────── */}
            <Step number={1} title="Combien de personnes ?">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleCoversChange(-1)}
                  disabled={covers <= 1}
                  className="w-12 h-12 rounded-full text-2xl font-bold flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    color: covers <= 1 ? "var(--text-secondary)" : "var(--text-primary)",
                  }}
                >
                  −
                </button>
                <span
                  className="font-title text-5xl w-16 text-center"
                  style={{ color: "var(--accent)" }}
                >
                  {covers}
                </span>
                <button
                  onClick={() => handleCoversChange(1)}
                  disabled={covers >= 20}
                  className="w-12 h-12 rounded-full text-2xl font-bold flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    color: covers >= 20 ? "var(--text-secondary)" : "var(--text-primary)",
                  }}
                >
                  +
                </button>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  personne{covers > 1 ? "s" : ""}
                </span>
              </div>
              {covers > 8 && (
                <p className="mt-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                  Pour les groupes de plus de 8 personnes, nous vous conseillons de nous contacter
                  directement pour organiser votre soirée.
                </p>
              )}
            </Step>

            {/* ── Étape 2 : Date ──────────────────────────────── */}
            <Step number={2} title="Choisissez une date">
              <DatePicker value={date} onChange={handleDateChange} />
            </Step>

            {/* ── Étape 3 : Créneau ───────────────────────────── */}
            {date && (
              <Step number={3} title="Choisissez un créneau">
                <TimePicker date={date} value={time} onChange={handleTimeChange} />
              </Step>
            )}

            {/* ── Étape 4 : Table ─────────────────────────────── */}
            {date && time && (
              <Step number={4} title="Choisissez votre table">
                {loadingOcc ? (
                  <p style={{ color: "var(--text-secondary)" }}>Chargement du plan…</p>
                ) : (
                  <FloorPlan
                    tables={tables}
                    terrasse_active={terrasse}
                    occupied_ids={occupiedIds}
                    covers={covers}
                    selectedTableId={selectedTable?.id ?? null}
                    onSelect={handleTableSelect}
                  />
                )}
              </Step>
            )}

            {/* ── Étape 5 : Formulaire ────────────────────────── */}
            {selectedTable && (
              <Step number={5} title="Vos coordonnées">
                {/* Récapitulatif */}
                <div
                  className="flex flex-wrap gap-3 p-3 rounded-lg mb-4 text-sm"
                  style={{ backgroundColor: "var(--bg-input)", color: "var(--text-secondary)" }}
                >
                  <span>📅 {formatDateFR(date)}</span>
                  <span>🕐 {time}</span>
                  <span>👥 {covers} pers.</span>
                  <span>🍽 Table {selectedTable.code}</span>
                </div>
                <BookingForm
                  onSubmit={handleFormSubmit}
                  loading={submitting}
                  error={submitError}
                />
              </Step>
            )}

          </div>
        )}
      </main>
    </>
  );
}

/* ── Composant Step ───────────────────────────────────────────── */
function Step({ number, title, children }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          {number}
        </div>
        <h2 className="font-title text-2xl" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

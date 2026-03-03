import { getSlotsForDate } from "@/lib/dateUtils";

/**
 * TimePicker — affiche les créneaux disponibles pour une date donnée.
 *
 * Props:
 *   date     — "YYYY-MM-DD"
 *   value    — "HH:MM" | null
 *   onChange — callback("HH:MM")
 */
export default function TimePicker({ date, value, onChange }) {
  if (!date) return null;

  const slots = getSlotsForDate(new Date(date + "T12:00:00")); // heure fixe pour éviter bug DST

  if (slots.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Aucun créneau disponible ce jour.
      </p>
    );
  }

  // Regrouper midi / soir
  const midday = slots.filter((s) => {
    const h = parseInt(s.split(":")[0], 10);
    return h < 17;
  });
  const evening = slots.filter((s) => {
    const h = parseInt(s.split(":")[0], 10);
    return h >= 17;
  });

  function SlotGroup({ label, slots: group }) {
    if (group.length === 0) return null;
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>
          {label}
        </p>
        <div className="flex flex-wrap gap-2">
          {group.map((slot) => {
            const selected = value === slot;
            return (
              <button
                key={slot}
                onClick={() => onChange(slot)}
                className="px-4 h-11 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: selected ? "var(--accent)" : "var(--bg-input)",
                  color: selected ? "#fff" : "var(--text-primary)",
                  border: selected ? "none" : "1px solid var(--bg-input)",
                }}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SlotGroup label="Déjeuner" slots={midday} />
      <SlotGroup label="Dîner" slots={evening} />
    </div>
  );
}

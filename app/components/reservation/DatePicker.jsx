import { useState } from "react";
import { isOpenDay } from "@/lib/dateUtils";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * DatePicker — calendrier mensuel.
 * Jours passés et jours de fermeture sont désactivés.
 *
 * Props:
 *   value    — "YYYY-MM-DD" | null
 *   onChange — callback("YYYY-MM-DD")
 */
export default function DatePicker({ value, onChange }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Offset lundi-premier : JS donne 0=Dim, on veut 0=Lun
  const firstDayJS = new Date(year, month, 1).getDay();
  const offset     = firstDayJS === 0 ? 6 : firstDayJS - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const canGoPrev =
    year > today.getFullYear() ||
    (year === today.getFullYear() && month > today.getMonth());

  function prevMonth() {
    if (canGoPrev) setViewDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  // Cellules : `null` pour rembourrage + numéros de jour
  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div
      className="rounded-xl p-4 w-full max-w-sm mx-auto"
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-input)" }}
    >
      {/* Navigation mois */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="w-9 h-9 flex items-center justify-center rounded-full text-lg transition-colors"
          style={{
            color: canGoPrev ? "var(--text-primary)" : "var(--bg-input)",
            backgroundColor: canGoPrev ? "var(--bg-input)" : "transparent",
          }}
        >
          ‹
        </button>
        <span className="font-title text-xl" style={{ color: "var(--text-primary)" }}>
          {MONTHS_FR[month]} {year}
        </span>
        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
          style={{ color: "var(--text-primary)", backgroundColor: "var(--bg-input)" }}
        >
          ›
        </button>
      </div>

      {/* En-tête jours */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_FR.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold py-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grille de jours */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;

          const cellDate = new Date(year, month, day);
          const dateStr  = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isPast   = cellDate < today;
          const isClosed = !isOpenDay(cellDate);
          const disabled = isPast || isClosed;
          const selected = value === dateStr;

          return (
            <button
              key={day}
              onClick={() => !disabled && onChange(dateStr)}
              disabled={disabled}
              className="flex items-center justify-center rounded-full text-sm font-medium transition-colors"
              style={{
                height: "2.25rem",
                backgroundColor: selected
                  ? "var(--accent)"
                  : "transparent",
                color: selected
                  ? "#fff"
                  : disabled
                  ? "var(--bg-input)"
                  : "var(--text-primary)",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {value && (
        <button
          onClick={() => onChange(null)}
          className="mt-3 text-xs w-full text-center"
          style={{ color: "var(--text-secondary)" }}
        >
          Effacer la date
        </button>
      )}
    </div>
  );
}

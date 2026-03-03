/**
 * TableButton — bouton circulaire représentant une table sur le plan de salle.
 * Statuts : "free" | "pending" | "reserved" | "small" | "selected"
 */
export default function TableButton({ table, status, onSelect, isSelected }) {
  const displayStatus = isSelected ? "selected" : status;

  return (
    <button
      className={`table-btn ${displayStatus === "selected" ? "free" : displayStatus}`}
      style={{
        "--x": `${table.pos_x}%`,
        "--y": `${table.pos_y}%`,
        outline: isSelected ? "3px solid var(--accent)" : "none",
        outlineOffset: "2px",
      }}
      onClick={() => status === "free" && onSelect(table)}
      disabled={status !== "free"}
      title={
        status === "small"
          ? `${table.code} — trop petite (${table.seats} pers.)`
          : status === "free"
          ? `${table.code} — ${table.seats} pers. — Disponible`
          : `${table.code} — Déjà réservée`
      }
    >
      <span className="table-code">{table.code}</span>
      <span className="table-seats">{table.seats}p</span>
    </button>
  );
}

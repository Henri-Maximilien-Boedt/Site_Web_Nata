import TableButton from "./TableButton";

/**
 * FloorPlan — plan de salle CSS pur, 2 zones (intérieur + terrasse).
 *
 * Props:
 *   tables         — liste complète des tables actives
 *   terrasse_active — boolean
 *   occupied_ids   — tableau d'IDs de tables déjà réservées sur le créneau
 *   covers         — nombre de couverts demandé
 *   selectedTableId — ID de la table sélectionnée (null si aucune)
 *   onSelect       — callback(table) quand le client clique sur une table libre
 */
export default function FloorPlan({
  tables,
  terrasse_active,
  occupied_ids = [],
  covers,
  selectedTableId,
  onSelect,
}) {
  const intTables = tables.filter((t) => t.zone === "interieur");
  const terTables = tables.filter((t) => t.zone === "terrasse");

  function getStatus(table) {
    if (table.seats < covers) return "small";
    if (occupied_ids.includes(table.id)) return "reserved";
    return "free";
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Légende */}
      <div className="floor-legend">
        <div className="floor-legend-item">
          <div className="floor-legend-dot" style={{ background: "#22c55e" }} />
          <span>Disponible</span>
        </div>
        <div className="floor-legend-item">
          <div className="floor-legend-dot" style={{ background: "#ef4444" }} />
          <span>Réservée</span>
        </div>
        <div className="floor-legend-item">
          <div className="floor-legend-dot" style={{ background: "#6b7280" }} />
          <span>Trop petite</span>
        </div>
      </div>

      {/* Intérieur */}
      <div>
        <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
          Intérieur
        </p>
        <div className="floor-plan">
          {intTables.map((table) => (
            <TableButton
              key={table.id}
              table={table}
              status={getStatus(table)}
              isSelected={table.id === selectedTableId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>

      {/* Terrasse (si active) */}
      {terrasse_active && terTables.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
            Terrasse
          </p>
          <div className="floor-plan">
            {terTables.map((table) => (
              <TableButton
                key={table.id}
                table={table}
                status={getStatus(table)}
                isSelected={table.id === selectedTableId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

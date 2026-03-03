/**
 * Badge / tag coloré.
 * variant: "pending" | "confirmed" | "cancelled" | "default"
 */
const VARIANTS = {
  pending:   { backgroundColor: "rgba(245,158,11,0.15)",  color: "#f59e0b",  label: "En attente" },
  confirmed: { backgroundColor: "rgba(34,197,94,0.15)",   color: "#22c55e",  label: "Confirmée" },
  cancelled: { backgroundColor: "rgba(239,68,68,0.15)",   color: "#ef4444",  label: "Annulée" },
  default:   { backgroundColor: "var(--bg-input)",         color: "var(--text-secondary)", label: "" },
};

export default function Badge({ variant = "default", children }) {
  const style = VARIANTS[variant] ?? VARIANTS.default;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={style}
    >
      {children ?? style.label}
    </span>
  );
}

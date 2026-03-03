/**
 * Bouton réutilisable.
 * variant: "primary" | "secondary" | "danger" | "ghost"
 * size:    "sm" | "md" (défaut) | "lg"
 */
export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  ...props
}) {
  const base = "inline-flex items-center justify-center gap-2 font-body font-bold rounded transition-opacity select-none";

  const sizes = {
    sm: "h-9  px-4 text-xs  min-w-[80px]",
    md: "h-12 px-6 text-sm  min-w-[100px]",
    lg: "h-14 px-8 text-base min-w-[120px]",
  };

  const variants = {
    primary:   { backgroundColor: "var(--accent)",    color: "#fff" },
    secondary: { backgroundColor: "var(--bg-input)",  color: "var(--text-primary)", border: "1px solid var(--bg-input)" },
    danger:    { backgroundColor: "#ef4444",           color: "#fff" },
    ghost:     { backgroundColor: "transparent",       color: "var(--text-secondary)", border: "1px solid var(--bg-input)" },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${sizes[size] ?? sizes.md} ${className}`}
      style={{
        ...(variants[variant] ?? variants.primary),
        opacity: disabled || loading ? 0.6 : 1,
        cursor: disabled || loading ? "not-allowed" : "pointer",
      }}
      {...props}
    >
      {loading ? "…" : children}
    </button>
  );
}

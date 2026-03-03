import { useEffect } from "react";

/**
 * Modale générique.
 * Fermeture : croix, touche Escape, ou tap en dehors.
 *
 * @param {boolean}  open      - Affiche la modale
 * @param {Function} onClose   - Callback fermeture
 * @param {string}   title     - Titre optionnel
 * @param {node}     children  - Contenu
 * @param {string}   size      - "sm" | "md" (défaut) | "lg"
 */
export default function Modal({ open, onClose, title, children, size = "md" }) {
  /* Fermeture clavier */
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* Empêche le scroll body */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const maxW = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[size] ?? "max-w-lg";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`w-full ${maxW} rounded-xl border flex flex-col max-h-[90vh]`}
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--bg-input)" }}
      >
        {/* Header */}
        {(title || true) && (
          <div
            className="flex items-center justify-between px-5 py-4 border-b shrink-0"
            style={{ borderColor: "var(--bg-input)" }}
          >
            {title && (
              <h2 className="font-title text-2xl" style={{ color: "var(--text-primary)" }}>
                {title}
              </h2>
            )}
            <button
              onClick={onClose}
              className="ml-auto w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Body scrollable */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import Button from "@/components/ui/Button";

/**
 * BookingForm — formulaire des coordonnées client.
 *
 * Props:
 *   onSubmit  — callback({ name, email, phone, message })
 *   loading   — boolean
 *   error     — string | null
 */
export default function BookingForm({ onSubmit, loading, error }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nom complet *">
        <input
          required
          value={form.name}
          onChange={set("name")}
          className="input-field"
          placeholder="Prénom Nom"
          autoComplete="name"
        />
      </Field>

      <Field label="Email *">
        <input
          required
          type="email"
          value={form.email}
          onChange={set("email")}
          className="input-field"
          placeholder="vous@exemple.com"
          autoComplete="email"
        />
      </Field>

      <Field label="Téléphone *">
        <input
          required
          type="tel"
          value={form.phone}
          onChange={set("phone")}
          className="input-field"
          placeholder="+32 470 00 00 00"
          autoComplete="tel"
        />
      </Field>

      <Field label="Message (optionnel)">
        <textarea
          value={form.message}
          onChange={set("message")}
          className="input-field resize-none"
          rows={3}
          placeholder="Allergies, occasion spéciale…"
        />
      </Field>

      {error && (
        <p className="text-sm p-3 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} disabled={loading}>
        Confirmer la réservation
      </Button>

      <style jsx global>{`
        .input-field {
          width: 100%;
          height: 3rem;
          padding: 0 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid var(--bg-input);
          background-color: var(--bg-input);
          color: var(--text-primary);
          font-size: 0.9375rem;
          font-family: inherit;
        }
        textarea.input-field {
          height: auto;
          padding: 0.75rem 0.875rem;
        }
        .input-field:focus {
          outline: 2px solid var(--accent);
          outline-offset: 1px;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

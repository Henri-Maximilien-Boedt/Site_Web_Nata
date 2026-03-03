import Link from "next/link";

const HORAIRES = [
  { jour: "Lundi",          horaire: "18h – 22h" },
  { jour: "Mardi – Samedi", horaire: "12h – 14h30 · 18h – 22h" },
  { jour: "Dimanche",       horaire: "Fermé" },
];

const NAV_LINKS = [
  { href: "/",              label: "Accueil" },
  { href: "/menu",          label: "Menu" },
  { href: "/evenements",    label: "Événements" },
  { href: "/actualites",    label: "Actualités" },
  { href: "/reservation",   label: "Réservation" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-16 border-t"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--bg-input)" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">

        {/* Colonne 1 — Identité */}
        <div className="flex flex-col gap-3">
          <p className="font-title text-4xl tracking-widest" style={{ color: "var(--text-primary)" }}>
            NATA <span style={{ color: "var(--accent)" }}>BAR</span>
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Restaurant coréen au cœur de<br />Louvain-la-Neuve, Belgique.
          </p>
          <address className="not-italic text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Place de l&apos;Université<br />
            1348 Louvain-la-Neuve
          </address>
          <a
            href="tel:+32000000000"
            className="text-sm transition-colors"
            style={{ color: "var(--accent)" }}
          >
            +32 (0) 00 000 000
          </a>
        </div>

        {/* Colonne 2 — Horaires */}
        <div className="flex flex-col gap-3">
          <h3 className="font-title text-lg" style={{ color: "var(--text-primary)" }}>
            Horaires
          </h3>
          <ul className="flex flex-col gap-2">
            {HORAIRES.map(({ jour, horaire }) => (
              <li key={jour} className="flex flex-col text-sm">
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{jour}</span>
                <span style={{ color: "var(--text-secondary)" }}>{horaire}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Colonne 3 — Navigation */}
        <div className="flex flex-col gap-3">
          <h3 className="font-title text-lg" style={{ color: "var(--text-primary)" }}>
            Navigation
          </h3>
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm transition-colors hover:text-accent"
                style={{ color: "var(--text-secondary)" }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Barre de copyright */}
      <div
        className="border-t px-4 py-4 text-center text-xs"
        style={{ borderColor: "var(--bg-input)", color: "var(--text-secondary)" }}
      >
        © {year} NATA Bar — Tous droits réservés
      </div>
    </footer>
  );
}

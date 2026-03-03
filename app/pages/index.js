import Head from "next/head";
import Link from "next/link";

const HORAIRES = [
  { jour: "Lundi",          horaire: "18h – 22h" },
  { jour: "Mardi – Samedi", horaire: "12h – 14h30  ·  18h – 22h" },
  { jour: "Dimanche",       horaire: "Fermé" },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>NATA Bar — Restaurant coréen à Louvain-la-Neuve</title>
        <meta
          name="description"
          content="NATA Bar, restaurant coréen au cœur de Louvain-la-Neuve. Cuisine coréenne authentique, cocktails et ambiance unique."
        />
      </Head>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section
        className="flex flex-col items-center justify-center text-center min-h-screen px-4 pt-16"
        style={{ backgroundColor: "var(--bg-main)" }}
      >
        <p
          className="text-sm uppercase tracking-[0.3em] mb-4 font-medium"
          style={{ color: "var(--accent)" }}
        >
          Restaurant coréen · Louvain-la-Neuve
        </p>
        <h1
          className="font-title text-7xl sm:text-8xl md:text-9xl leading-none mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          NATA<br />
          <span style={{ color: "var(--accent)" }}>BAR</span>
        </h1>
        <p
          className="max-w-md text-base sm:text-lg leading-relaxed mb-10"
          style={{ color: "var(--text-secondary)" }}
        >
          Une expérience culinaire coréenne authentique au cœur du campus.
          Saveurs, partage et convivialité.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-none sm:justify-center">
          <Link
            href="/reservation"
            className="px-8 py-4 rounded font-bold text-base text-white text-center"
            style={{ backgroundColor: "var(--accent)" }}
          >
            Réserver une table
          </Link>
          <Link
            href="/menu"
            className="px-8 py-4 rounded font-bold text-base text-center border-2"
            style={{
              color: "var(--text-primary)",
              borderColor: "var(--bg-input)",
            }}
          >
            Voir le menu
          </Link>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 flex flex-col items-center gap-1 opacity-40">
          <span className="text-xs tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>
            Découvrir
          </span>
          <span style={{ color: "var(--text-secondary)" }}>↓</span>
        </div>
      </section>

      {/* ── Concept ───────────────────────────────────────────── */}
      <section
        className="py-20 px-4"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <div className="max-w-3xl mx-auto text-center flex flex-col gap-6">
          <p
            className="text-sm uppercase tracking-[0.3em] font-medium"
            style={{ color: "var(--accent)" }}
          >
            Notre concept
          </p>
          <h2
            className="font-title text-5xl sm:text-6xl leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            La Corée au cœur<br />de Louvain-la-Neuve
          </h2>
          <p
            className="text-base sm:text-lg leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            NATA Bar vous propose une cuisine coréenne authentique : gyoza,
            bibimbap, BBQ coréen, cocktails au soju et bien plus. Un espace
            chaleureux pour partager, découvrir et se retrouver.
          </p>
        </div>
      </section>

      {/* ── Points forts ──────────────────────────────────────── */}
      <section className="py-20 px-4" style={{ backgroundColor: "var(--bg-main)" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              icon: "🍜",
              titre: "Cuisine authentique",
              texte: "Des recettes coréennes traditionnelles préparées avec des ingrédients frais et de qualité.",
            },
            {
              icon: "🍸",
              titre: "Bar & Cocktails",
              texte: "Cocktails au soju, makgeolli, bières artisanales et créations maison.",
            },
            {
              icon: "🎉",
              titre: "Événements",
              texte: "Soirées thématiques, privatisations et food truck — contactez-nous pour vos projets.",
            },
          ].map(({ icon, titre, texte }) => (
            <div
              key={titre}
              className="p-6 rounded-lg border flex flex-col gap-3"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--bg-input)",
              }}
            >
              <span className="text-4xl">{icon}</span>
              <h3
                className="font-title text-2xl"
                style={{ color: "var(--text-primary)" }}
              >
                {titre}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {texte}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Horaires & Accès ──────────────────────────────────── */}
      <section
        className="py-20 px-4"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Horaires */}
          <div className="flex flex-col gap-4">
            <p
              className="text-sm uppercase tracking-[0.3em] font-medium"
              style={{ color: "var(--accent)" }}
            >
              Horaires
            </p>
            <h2
              className="font-title text-4xl"
              style={{ color: "var(--text-primary)" }}
            >
              On vous attend
            </h2>
            <ul className="flex flex-col gap-3 mt-2">
              {HORAIRES.map(({ jour, horaire }) => (
                <li
                  key={jour}
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 pb-3 border-b"
                  style={{ borderColor: "var(--bg-input)" }}
                >
                  <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    {jour}
                  </span>
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {horaire}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Adresse + CTA réservation */}
          <div className="flex flex-col gap-4">
            <p
              className="text-sm uppercase tracking-[0.3em] font-medium"
              style={{ color: "var(--accent)" }}
            >
              Nous trouver
            </p>
            <h2
              className="font-title text-4xl"
              style={{ color: "var(--text-primary)" }}
            >
              Louvain-la-Neuve
            </h2>
            <address
              className="not-italic text-sm leading-relaxed mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Place de l&apos;Université<br />
              1348 Louvain-la-Neuve<br />
              Belgique
            </address>
            <a
              href="tel:+32000000000"
              className="text-sm font-semibold"
              style={{ color: "var(--accent)" }}
            >
              +32 (0) 00 000 000
            </a>
            <Link
              href="/reservation"
              className="mt-4 inline-block px-6 py-3 rounded font-bold text-sm text-white text-center"
              style={{ backgroundColor: "var(--accent)" }}
            >
              Réserver une table
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

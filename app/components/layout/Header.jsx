import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const NAV_LINKS = [
  { href: "/",           label: "Accueil" },
  { href: "/menu",       label: "Menu" },
  { href: "/evenements", label: "Événements" },
  { href: "/actualites", label: "Actualités" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled]  = useState(false);
  const router = useRouter();

  /* Ferme le menu mobile à chaque changement de route */
  useEffect(() => {
    const handleRouteChange = () => setMenuOpen(false);
    router.events.on("routeChangeStart", handleRouteChange);
    return () => router.events.off("routeChangeStart", handleRouteChange);
  }, [router.events]);

  /* Ombre header au scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-shadow duration-300 ${
        scrolled ? "shadow-[0_2px_20px_rgba(0,0,0,0.6)]" : ""
      }`}
      style={{ backgroundColor: "var(--bg-main)", borderBottom: "1px solid var(--bg-input)" }}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          className="font-title text-3xl tracking-widest hover:text-accent transition-colors"
          style={{ color: "var(--text-primary)" }}
        >
          NATA <span style={{ color: "var(--accent)" }}>BAR</span>
        </Link>

        {/* Navigation desktop */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ href, label }) => (
            <NavLink key={href} href={href} label={label} currentPath={router.pathname} />
          ))}
          <Link
            href="/reservation"
            className="ml-2 px-5 py-2 rounded font-body font-700 text-sm transition-all duration-200"
            style={{
              backgroundColor: "var(--accent)",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            Réserver
          </Link>
        </nav>

        {/* Burger mobile */}
        <button
          className="md:hidden flex flex-col justify-center items-center gap-[5px] w-12 h-12 rounded"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span
            className="block w-6 h-0.5 transition-all duration-300"
            style={{
              backgroundColor: "var(--text-primary)",
              transform: menuOpen ? "rotate(45deg) translateY(8px)" : "",
            }}
          />
          <span
            className="block w-6 h-0.5 transition-all duration-300"
            style={{
              backgroundColor: "var(--text-primary)",
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            className="block w-6 h-0.5 transition-all duration-300"
            style={{
              backgroundColor: "var(--text-primary)",
              transform: menuOpen ? "rotate(-45deg) translateY(-8px)" : "",
            }}
          />
        </button>
      </div>

      {/* Menu mobile déroulant */}
      {menuOpen && (
        <nav
          className="md:hidden px-4 pb-4 flex flex-col gap-1"
          style={{ backgroundColor: "var(--bg-main)", borderTop: "1px solid var(--bg-input)" }}
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block py-3 text-base font-body font-medium border-b transition-colors"
              style={{
                color: router.pathname === href ? "var(--accent)" : "var(--text-primary)",
                borderColor: "var(--bg-input)",
                fontWeight: 500,
              }}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/reservation"
            className="mt-3 block text-center py-3 rounded font-body font-bold text-white transition-all"
            style={{ backgroundColor: "var(--accent)", fontWeight: 700 }}
          >
            Réserver une table
          </Link>
        </nav>
      )}
    </header>
  );
}

function NavLink({ href, label, currentPath }) {
  const isActive = currentPath === href;
  return (
    <Link
      href={href}
      className="relative font-body text-sm font-medium transition-colors duration-200 py-1"
      style={{ color: isActive ? "var(--accent)" : "var(--text-secondary)", fontWeight: 500 }}
    >
      {label}
      {isActive && (
        <span
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
          style={{ backgroundColor: "var(--accent)" }}
        />
      )}
    </Link>
  );
}

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";

const ADMIN_LINKS = [
  { href: "/admin",              label: "Dashboard",     icon: "⊞" },
  { href: "/admin/reservations", label: "Réservations",  icon: "📅" },
  { href: "/admin/tables",       label: "Plan de salle", icon: "🗺" },
  { href: "/admin/menu",         label: "Menu",          icon: "🍽" },
  { href: "/admin/actualites",   label: "Actualités",    icon: "📰" },
];

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg-main)" }}>

      {/* Sidebar desktop */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0 border-r"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--bg-input)" }}
      >
        {/* Logo */}
        <div
          className="h-16 flex items-center px-5 border-b"
          style={{ borderColor: "var(--bg-input)" }}
        >
          <Link href="/admin" className="font-title text-2xl tracking-widest">
            NATA <span style={{ color: "var(--accent)" }}>ADMIN</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
          {ADMIN_LINKS.map(({ href, label, icon }) => (
            <AdminNavLink
              key={href}
              href={href}
              label={label}
              icon={icon}
              currentPath={router.pathname}
            />
          ))}
        </nav>

        {/* Déconnexion */}
        <div className="px-3 py-4 border-t" style={{ borderColor: "var(--bg-input)" }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded text-sm font-medium transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <span>↩</span>
            Déconnexion
          </button>
          <Link
            href="/"
            className="mt-1 block text-center text-xs py-2 transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            ← Voir le site
          </Link>
        </div>
      </aside>

      {/* Drawer mobile */}
      {sidebarOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside
            className="fixed left-0 top-0 bottom-0 w-64 z-50 flex flex-col border-r md:hidden"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--bg-input)" }}
          >
            <div
              className="h-16 flex items-center justify-between px-5 border-b"
              style={{ borderColor: "var(--bg-input)" }}
            >
              <Link href="/admin" className="font-title text-2xl tracking-widest">
                NATA <span style={{ color: "var(--accent)" }}>ADMIN</span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded"
                aria-label="Fermer le menu"
                style={{ color: "var(--text-secondary)" }}
              >
                ✕
              </button>
            </div>
            <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
              {ADMIN_LINKS.map(({ href, label, icon }) => (
                <AdminNavLink
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  currentPath={router.pathname}
                  onClick={() => setSidebarOpen(false)}
                />
              ))}
            </nav>
            <div className="px-3 py-4 border-t" style={{ borderColor: "var(--bg-input)" }}>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                <span>↩</span>
                Déconnexion
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar mobile */}
        <header
          className="md:hidden h-16 flex items-center gap-4 px-4 border-b shrink-0"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--bg-input)" }}
        >
          <button
            className="w-12 h-12 flex items-center justify-center rounded shrink-0"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
            style={{ color: "var(--text-primary)" }}
          >
            ☰
          </button>
          <span className="font-title text-xl tracking-widest">
            NATA <span style={{ color: "var(--accent)" }}>ADMIN</span>
          </span>
        </header>

        {/* Zone de contenu */}
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminNavLink({ href, label, icon, currentPath, onClick }) {
  const isActive = currentPath === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-3 rounded text-sm font-medium transition-colors min-h-[48px]"
      style={{
        backgroundColor: isActive ? "var(--bg-input)" : "transparent",
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
        fontWeight: isActive ? 700 : 500,
      }}
    >
      <span className="text-base shrink-0">{icon}</span>
      {label}
    </Link>
  );
}

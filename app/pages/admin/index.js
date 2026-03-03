import Head from "next/head";
import { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/components/layout/AdminLayout";
import Badge from "@/components/ui/Badge";
import { formatDateFR } from "@/lib/dateUtils";

export default function AdminDashboard() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const [resAll, resToday] = await Promise.all([
        fetch("/api/reservations?status=pending").then((r) => r.json()),
        fetch(`/api/reservations?date=${today}`).then((r) => r.json()),
      ]);
      setStats({
        pending:    Array.isArray(resAll)    ? resAll.length    : 0,
        todayCount: Array.isArray(resToday)  ? resToday.length  : 0,
        todayResas: Array.isArray(resToday)  ? resToday         : [],
      });
      setLoading(false);
    }
    load();
  }, []);

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <Head><title>Dashboard — NATA Admin</title></Head>
      <AdminLayout>
        <div className="flex flex-col gap-8">

          {/* Salutation */}
          <div>
            <h1 className="font-title text-5xl" style={{ color: "var(--text-primary)" }}>
              Bonjour 👋
            </h1>
            <p className="text-sm mt-1 capitalize" style={{ color: "var(--text-secondary)" }}>{today}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              label="Réservations en attente"
              value={loading ? "…" : stats.pending}
              accent={stats?.pending > 0}
              href="/admin/reservations"
            />
            <StatCard
              label="Réservations aujourd'hui"
              value={loading ? "…" : stats.todayCount}
              href="/admin/reservations"
            />
          </div>

          {/* Réservations du jour */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-title text-2xl" style={{ color: "var(--text-primary)" }}>
                Aujourd&apos;hui
              </h2>
              <Link href="/admin/reservations" className="text-xs" style={{ color: "var(--accent)" }}>
                Voir tout →
              </Link>
            </div>

            {loading ? (
              <p style={{ color: "var(--text-secondary)" }}>Chargement…</p>
            ) : stats.todayResas.length === 0 ? (
              <p style={{ color: "var(--text-secondary)" }}>Aucune réservation aujourd&apos;hui.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {stats.todayResas.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-lg border"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--bg-input)" }}
                  >
                    <span className="font-bold text-sm w-12 shrink-0" style={{ color: "var(--accent)" }}>
                      {r.time_start?.slice(0, 5)}
                    </span>
                    <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {r.name} · {r.covers} pers.
                    </span>
                    <Badge variant={r.status} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Raccourcis */}
          <section>
            <h2 className="font-title text-2xl mb-3" style={{ color: "var(--text-primary)" }}>Raccourcis</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: "/admin/reservations", icon: "📅", label: "Réservations" },
                { href: "/admin/tables",       icon: "🗺",  label: "Plan de salle" },
                { href: "/admin/menu",         icon: "🍽",  label: "Menu" },
                { href: "/admin/actualites",   icon: "📰",  label: "Actualités" },
              ].map(({ href, icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border text-center min-h-[80px] justify-center transition-colors"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--bg-input)" }}
                >
                  <span className="text-2xl">{icon}</span>
                  <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </AdminLayout>
    </>
  );
}

function StatCard({ label, value, accent, href }) {
  return (
    <Link
      href={href}
      className="p-5 rounded-lg border flex flex-col gap-1 transition-colors"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: accent ? "var(--accent)" : "var(--bg-input)",
      }}
    >
      <span className="text-3xl font-title" style={{ color: accent ? "var(--accent)" : "var(--text-primary)" }}>
        {value}
      </span>
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
    </Link>
  );
}

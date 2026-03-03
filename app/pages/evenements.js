import Head from "next/head";
import Image from "next/image";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { formatDateFR } from "@/lib/dateUtils";

export default function Evenements({ evenements }) {
  /* Sépare les événements futurs / passés */
  const today = new Date().toISOString().slice(0, 10);
  const avenir  = evenements.filter((e) => e.event_date >= today);
  const passes  = evenements.filter((e) => e.event_date <  today);

  return (
    <>
      <Head>
        <title>Événements — NATA Bar</title>
        <meta
          name="description"
          content="Les prochains événements au NATA Bar : soirées thématiques, concerts, dégustations."
        />
      </Head>

      {/* Hero */}
      <section
        className="pt-28 pb-12 px-4 text-center"
        style={{ backgroundColor: "var(--bg-main)" }}
      >
        <p
          className="text-sm uppercase tracking-[0.3em] mb-3 font-medium"
          style={{ color: "var(--accent)" }}
        >
          NATA Bar
        </p>
        <h1
          className="font-title text-6xl sm:text-7xl md:text-8xl leading-none"
          style={{ color: "var(--text-primary)" }}
        >
          Événements
        </h1>
      </section>

      <main className="max-w-4xl mx-auto px-4 pb-20">
        {evenements.length === 0 ? (
          <p
            className="text-center py-20"
            style={{ color: "var(--text-secondary)" }}
          >
            Aucun événement programmé pour le moment.
          </p>
        ) : (
          <>
            {/* Événements à venir */}
            {avenir.length > 0 && (
              <section className="mb-16">
                <h2
                  className="font-title text-3xl mb-8 pb-3 border-b"
                  style={{
                    color: "var(--text-primary)",
                    borderColor: "var(--bg-input)",
                  }}
                >
                  À venir
                </h2>
                <div className="flex flex-col gap-8">
                  {avenir.map((e) => (
                    <EvenementCard key={e.id} event={e} upcoming />
                  ))}
                </div>
              </section>
            )}

            {/* Événements passés */}
            {passes.length > 0 && (
              <section>
                <h2
                  className="font-title text-3xl mb-8 pb-3 border-b"
                  style={{
                    color: "var(--text-secondary)",
                    borderColor: "var(--bg-input)",
                  }}
                >
                  Événements passés
                </h2>
                <div className="flex flex-col gap-6 opacity-70">
                  {passes.map((e) => (
                    <EvenementCard key={e.id} event={e} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}

function EvenementCard({ event, upcoming = false }) {
  return (
    <article
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: upcoming ? "var(--accent)" : "var(--bg-input)",
      }}
    >
      {event.image_url && (
        <div className="relative w-full aspect-[16/7]">
          <Image
            src={event.image_url}
            alt={event.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 896px"
          />
        </div>
      )}

      <div className="p-6 flex flex-col gap-3">
        <p
          className="text-xs uppercase tracking-widest font-semibold"
          style={{ color: "var(--accent)" }}
        >
          {formatDateFR(event.event_date)}
        </p>
        <h2
          className="font-title text-3xl sm:text-4xl leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {event.title}
        </h2>
        {event.content && (
          <p
            className="text-sm leading-relaxed whitespace-pre-line"
            style={{ color: "var(--text-secondary)" }}
          >
            {event.content}
          </p>
        )}
      </div>
    </article>
  );
}

/* ── Data ────────────────────────────────────────────────────── */
export async function getServerSideProps() {
  const { data, error } = await supabaseAdmin
    .from("news_posts")
    .select("*")
    .eq("is_published", true)
    .not("event_date", "is", null)
    .order("event_date", { ascending: false });

  if (error) return { props: { evenements: [] } };

  return { props: { evenements: data ?? [] } };
}

import Head from "next/head";
import Image from "next/image";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { formatDateFR } from "@/lib/dateUtils";

export default function Actualites({ articles }) {
  return (
    <>
      <Head>
        <title>Actualités — NATA Bar</title>
        <meta
          name="description"
          content="Les dernières nouvelles du NATA Bar : nouveautés, annonces et vie du restaurant."
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
          Actualités
        </h1>
      </section>

      {/* Liste des articles */}
      <main className="max-w-4xl mx-auto px-4 pb-20">
        {articles.length === 0 ? (
          <p
            className="text-center py-20"
            style={{ color: "var(--text-secondary)" }}
          >
            Aucune actualité pour le moment.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function ArticleCard({ article }) {
  return (
    <article
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--bg-input)",
      }}
    >
      {/* Image */}
      {article.image_url && (
        <div className="relative w-full aspect-[16/7]">
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 896px"
          />
        </div>
      )}

      {/* Contenu */}
      <div className="p-6 flex flex-col gap-3">
        {/* Date */}
        <p
          className="text-xs uppercase tracking-widest"
          style={{ color: "var(--accent)" }}
        >
          {article.event_date
            ? formatDateFR(article.event_date)
            : formatDateFR(article.created_at)}
        </p>

        {/* Titre */}
        <h2
          className="font-title text-3xl sm:text-4xl leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {article.title}
        </h2>

        {/* Corps */}
        {article.content && (
          <p
            className="text-sm leading-relaxed whitespace-pre-line"
            style={{ color: "var(--text-secondary)" }}
          >
            {article.content}
          </p>
        )}
      </div>
    </article>
  );
}

/* ── Data (SSR pour fraîcheur des actus) ─────────────────────── */
export async function getServerSideProps() {
  const { data, error } = await supabaseAdmin
    .from("news_posts")
    .select("*")
    .eq("is_published", true)
    .is("event_date", null) // actualités générales uniquement
    .order("created_at", { ascending: false });

  if (error) return { props: { articles: [] } };

  return { props: { articles: data ?? [] } };
}

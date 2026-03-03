import Head from "next/head";
import supabaseAdmin from "@/lib/supabaseAdmin";

/* ── Catégories dans l'ordre d'affichage ─────────────────────── */
const CATEGORIES = [
  { key: "entrees",  label: "Entrées & Sharing Food" },
  { key: "plats",    label: "Plats principaux" },
  { key: "desserts", label: "Desserts" },
  { key: "boissons", label: "Boissons" },
];

const TAG_LABELS = {
  vegan:          "🌱 Vegan",
  "sans-gluten":  "🌾 Sans gluten",
  epice:          "🌶 Épicé",
};

export default function Menu({ itemsByCategory }) {
  return (
    <>
      <Head>
        <title>Menu — NATA Bar</title>
        <meta
          name="description"
          content="Découvrez notre menu coréen : entrées, plats, desserts et boissons."
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
          Restaurant coréen
        </p>
        <h1
          className="font-title text-6xl sm:text-7xl md:text-8xl leading-none mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          Notre Menu
        </h1>
        <p
          className="max-w-md mx-auto text-base"
          style={{ color: "var(--text-secondary)" }}
        >
          Cuisine coréenne authentique, préparée avec des produits frais.
        </p>
      </section>

      {/* Catégories */}
      <div className="max-w-5xl mx-auto px-4 pb-20 flex flex-col gap-16">
        {CATEGORIES.map(({ key, label }) => {
          const items = itemsByCategory[key];
          if (!items?.length) return null;

          /* Boissons : regroupées par sous-catégorie */
          if (key === "boissons") {
            const bySub = groupBy(items, "subcategory");
            return (
              <section key={key}>
                <CategoryTitle label={label} />
                <div className="flex flex-col gap-10">
                  {Object.entries(bySub).map(([sub, subItems]) => (
                    <div key={sub}>
                      {sub && sub !== "null" && (
                        <h3
                          className="font-title text-2xl mb-4 pb-2 border-b"
                          style={{
                            color: "var(--text-primary)",
                            borderColor: "var(--bg-input)",
                          }}
                        >
                          {sub}
                        </h3>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subItems.map((item) => (
                          <MenuCard key={item.id} item={item} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }

          return (
            <section key={key}>
              <CategoryTitle label={label} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <MenuCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })}

        {/* Message si aucun plat en base */}
        {Object.keys(itemsByCategory).length === 0 && (
          <p className="text-center py-20" style={{ color: "var(--text-secondary)" }}>
            Le menu sera bientôt disponible.
          </p>
        )}
      </div>
    </>
  );
}

/* ── Sous-composants ─────────────────────────────────────────── */

function CategoryTitle({ label }) {
  return (
    <h2
      className="font-title text-4xl sm:text-5xl mb-8"
      style={{ color: "var(--text-primary)" }}
    >
      {label}
    </h2>
  );
}

function MenuCard({ item }) {
  return (
    <article
      className="p-5 rounded-lg border flex flex-col gap-2"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--bg-input)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className="font-body font-bold text-base leading-snug"
          style={{ color: "var(--text-primary)" }}
        >
          {item.name}
        </h3>
        {item.price != null && (
          <span
            className="font-body font-bold text-sm shrink-0"
            style={{ color: "var(--accent)" }}
          >
            {Number(item.price).toFixed(2)} €
          </span>
        )}
      </div>

      {item.description && (
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {item.description}
        </p>
      )}

      {item.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full border"
              style={{
                color: "var(--text-secondary)",
                borderColor: "var(--bg-input)",
              }}
            >
              {TAG_LABELS[tag] ?? tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

/* ── Utilitaire ──────────────────────────────────────────────── */
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = String(item[key] ?? "");
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

/* ── Data (SSG + revalidation ISR) ──────────────────────────── */
export async function getStaticProps() {
  const { data, error } = await supabaseAdmin
    .from("menu_items")
    .select("*")
    .eq("is_available", true)
    .order("category")
    .order("sort_order");

  if (error) {
    return { props: { itemsByCategory: {} }, revalidate: 60 };
  }

  const itemsByCategory = groupBy(data ?? [], "category");

  return {
    props: { itemsByCategory },
    revalidate: 300, // revalidation toutes les 5 min
  };
}

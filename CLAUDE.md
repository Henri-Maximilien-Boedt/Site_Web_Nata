# CLAUDE.md — NATA Bar

Lis ce fichier en entier avant d'écrire la moindre ligne de code.

---

## Projet

Site web complet pour **NATA Bar**, restaurant coréen à Louvain-la-Neuve (Belgique).
Stack : Next.js 14 (Pages Router) + Supabase + Tailwind CSS + Brevo + Vercel.

Le dossier `/maquette/` contient une version HTML/CSS/JS de référence visuelle uniquement.
Ne pas réutiliser son code — il a des credentials en dur, utilise localStorage, et n'a pas de backend.
Ce qu'on en garde : le design (couleurs, typo, composants visuels) et le contenu du menu.

---

## Règles absolues

1. **Pages Router uniquement** — jamais `app/`, jamais Server Components, jamais `use client` global
2. **Site 100% en français** — pas de `next-i18next`, pas de colonnes `_en`, pas de `router.locale`
3. **Mobile-first strict** — coder pour 375px d'abord, élargir avec `sm:` `md:` `lg:`
4. **Admin tactile** — Pointer Events (pas Mouse Events), touch targets ≥ 48px, pas de hover-only
5. **Brevo pour les emails** — jamais Resend (limite 100/jour trop basse)
6. **`supabaseAdmin`** (service role) uniquement dans `pages/api/` — jamais côté client
7. **Plan de salle en CSS pur** — pas de Canvas, pas de SVG library, pas de react-dnd externe

---

## Stack

| Couche | Outil | Notes |
|---|---|---|
| Framework | Next.js 14, Pages Router | |
| Style | Tailwind CSS | mobile-first strict |
| BDD + Auth + Realtime | Supabase (PostgreSQL) | |
| Emails | Brevo (`@getbrevo/brevo`) | 300/jour gratuit |
| Hébergement | Vercel | CI/CD auto depuis GitHub |

---

## Structure des fichiers

```
nata-bar/
├── pages/
│   ├── index.js
│   ├── menu.js
│   ├── evenements.js
│   ├── actualites.js
│   ├── reservation.js
│   ├── login.js
│   ├── admin/
│   │   ├── index.js           → dashboard (protégé)
│   │   ├── reservations.js
│   │   ├── tables.js          → éditeur plan de salle drag & drop
│   │   ├── menu.js
│   │   └── actualites.js
│   └── api/
│       ├── reservations/
│       │   ├── create.js      → POST nouvelle réservation
│       │   ├── confirm.js     → POST confirmer (admin)
│       │   └── cancel.js      → POST annuler (admin)
│       ├── tables/
│       │   ├── index.js       → GET tables + état terrasse
│       │   ├── update.js      → PUT position / ajout / désactivation
│       │   ├── settings.js    → PUT terrasse_active
│       │   └── floor-plans.js → GET / POST / PUT / DELETE dispositions
│       ├── menu/
│       │   └── index.js       → GET / POST / PUT / DELETE
│       ├── actualites/
│       │   └── index.js       → GET / POST / PUT / DELETE
│       └── devis.js           → POST formulaire privatisation → email gérant
├── components/
│   ├── layout/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   └── AdminLayout.jsx
│   ├── reservation/
│   │   ├── FloorPlan.jsx      → plan de salle CSS pur
│   │   ├── TableButton.jsx
│   │   ├── DatePicker.jsx
│   │   ├── TimePicker.jsx
│   │   └── BookingForm.jsx
│   ├── admin/
│   │   ├── TableEditor.jsx    → drag & drop Pointer Events
│   │   ├── ReservationCard.jsx
│   │   ├── Timeline.jsx
│   │   ├── MenuItemModal.jsx
│   │   └── ArticleForm.jsx
│   └── ui/
│       ├── Modal.jsx
│       ├── Button.jsx
│       └── Badge.jsx
├── lib/
│   ├── supabase.js            → createBrowserSupabaseClient (anon key)
│   ├── supabaseAdmin.js       → createClient service role — API ROUTES UNIQUEMENT
│   ├── brevo.js               → sendEmail()
│   └── dateUtils.js           → timesOverlap(), getSlotsForDate(), OPENING_HOURS
├── styles/
│   ├── globals.css
│   └── floorplan.css          → styles du plan de salle
└── middleware.js              → protège /admin/*
```

---

## Schéma Supabase

### `tables`
```sql
id        uuid PK DEFAULT gen_random_uuid()
code      text NOT NULL          -- "T-1", "T-2"...
seats     integer NOT NULL
zone      text NOT NULL          -- 'interieur' | 'terrasse'
pos_x     numeric NOT NULL       -- % (0-100)
pos_y     numeric NOT NULL       -- % (0-100)
is_active boolean DEFAULT true
created_at timestamptz DEFAULT now()
```

### `reservations`
```sql
id          uuid PK DEFAULT gen_random_uuid()
table_ids   uuid[]               -- support fusion de tables
date        date NOT NULL
time_start  time NOT NULL        -- créneau de 2h
covers      integer NOT NULL
name        text NOT NULL
email       text NOT NULL
phone       text NOT NULL
message     text
status      text DEFAULT 'pending'  -- 'pending' | 'confirmed' | 'cancelled'
created_at  timestamptz DEFAULT now()
```

### `menu_items`
```sql
id           uuid PK DEFAULT gen_random_uuid()
category     text NOT NULL       -- 'entrees' | 'plats' | 'desserts' | 'boissons'
subcategory  text                -- 'cocktails' | 'bieres' | 'softs'...
name         text NOT NULL
description  text
price        numeric(6,2)        -- null si non affiché
tags         text[]              -- ['vegan', 'sans-gluten', 'epice']
is_available boolean DEFAULT true
sort_order   integer DEFAULT 0
created_at   timestamptz DEFAULT now()
```

### `news_posts`
```sql
id           uuid PK DEFAULT gen_random_uuid()
title        text NOT NULL
content      text
image_url    text                -- Supabase Storage, bucket 'news-images'
event_date   date                -- null si actualité générale
is_published boolean DEFAULT false
created_at   timestamptz DEFAULT now()
```

### `quote_requests`
```sql
id           uuid PK DEFAULT gen_random_uuid()
type         text                -- 'privatisation' | 'food_truck'
event_date   date
guests       integer
name         text NOT NULL
email        text NOT NULL
phone        text
message      text
created_at   timestamptz DEFAULT now()
```

### `settings`
```sql
key   text PRIMARY KEY        -- ex: 'terrasse_active'
value text NOT NULL           -- ex: 'true' | 'false'
```

Valeur initiale à insérer :
```sql
INSERT INTO settings (key, value) VALUES ('terrasse_active', 'false');
```

### `floor_plans`
```sql
id         uuid PK DEFAULT gen_random_uuid()
name       text NOT NULL       -- "Normal", "Événement", "Hiver"...
layout     jsonb NOT NULL      -- snapshot des positions de toutes les tables
is_default boolean DEFAULT false  -- chargé automatiquement au démarrage
created_at timestamptz DEFAULT now()
```

Le champ `layout` est un tableau JSON :
```json
[
  { "id": "uuid-table-1", "pos_x": 20, "pos_y": 30 },
  { "id": "uuid-table-2", "pos_x": 50, "pos_y": 60 }
]
```

### `settings`
```sql
key   text PK             -- ex: 'terrasse_active'
value text NOT NULL       -- ex: 'true' | 'false'
```

Utilisée pour les réglages globaux du restaurant. Valeur initiale :
```sql
INSERT INTO settings (key, value) VALUES ('terrasse_active', 'false');
```

---

## Gestion de la terrasse

La terrasse est **saisonnière et météo-dépendante**. Le gérant peut l'activer ou
la désactiver en un clic depuis `/admin/tables` — sans toucher au code.

L'état est stocké dans la table `settings` (`key = 'terrasse_active'`, `value = 'true'|'false'`).

### Comportement
- Terrasse **active** → le bloc terrasse apparaît sur `/reservation`, les tables sont réservables
- Terrasse **inactive** → le bloc terrasse est masqué côté client, les tables BDD restent intactes

### API `/api/tables/index.js` — inclure l'état terrasse dans la réponse
```js
const { data: tables } = await supabaseAdmin
  .from('tables').select('*').eq('is_active', true)

const { data: setting } = await supabaseAdmin
  .from('settings').select('value').eq('key', 'terrasse_active').single()

res.json({ tables, terrasse_active: setting.value === 'true' })
```

### `FloorPlan.jsx` — affichage conditionnel
```jsx
{terrasse_active && (
  <div>
    <h3>Terrasse</h3>
    <div className="floor-plan">
      {tables.filter(t => t.zone === 'terrasse').map(t => (
        <TableButton key={t.id} table={t} status={getStatus(t)} onSelect={onSelect} />
      ))}
    </div>
  </div>
)}
```

### `/admin/tables` — switch de contrôle
```js
await fetch('/api/tables/settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'terrasse_active', value: String(!terrasse_active) })
})
```

---

## Dispositions du plan de salle

Le gérant peut sauvegarder plusieurs **dispositions nommées** et en appliquer une en un clic.
Exemples : "Normal", "Soirée événement", "Hiver (sans terrasse)".

Depuis `/admin/tables`, trois actions disponibles :
- **Sauvegarder** → modale pour nommer → snapshot JSON des positions → INSERT dans `floor_plans`
- **Charger** → liste des dispositions sauvegardées → applique les positions sur toutes les tables en BDD
- **Définir par défaut** → `is_default = true` sur cette disposition (false sur toutes les autres) → chargée automatiquement à l'ouverture de `/admin/tables`

### API
```js
// Sauvegarder la disposition courante
const layout = tables.map(t => ({ id: t.id, pos_x: t.pos_x, pos_y: t.pos_y }))
await fetch("/api/tables/floor-plans", {
  method: "POST",
  body: JSON.stringify({ name: "Normal", layout, is_default: false })
})

// Appliquer une disposition sauvegardée
for (const entry of plan.layout) {
  await fetch("/api/tables/update", {
    method: "PUT",
    body: JSON.stringify({ id: entry.id, pos_x: entry.pos_x, pos_y: entry.pos_y })
  })
}

// Définir par défaut (reset les autres puis update celle-ci)
await fetch("/api/tables/floor-plans", {
  method: "PUT",
  body: JSON.stringify({ id: plan.id, is_default: true })
})
```

### Routes API tables — structure complète
```
pages/api/tables/
├── index.js          → GET tables + état terrasse
├── update.js         → PUT position / seats / code d'une table
├── settings.js       → PUT terrasse_active
└── floor-plans.js    → GET liste / POST créer / PUT is_default / DELETE
```

---

## Plan de salle — CSS pur (LIRE ATTENTIVEMENT)

Technique : `position: absolute` sur chaque table, coordonnées en % injectées via variables CSS.

```css
/* floorplan.css */
.floor-plan {
  position: relative;
  width: 100%;
  padding-bottom: 70%;        /* ratio fixe de la salle */
  background: #1a1a1a;
}

.table-btn {
  position: absolute;
  left: var(--x);
  top: var(--y);
  transform: translate(-50%, -50%);
  width: 11%;
  aspect-ratio: 1;
  min-width: 44px;
  min-height: 44px;           /* touch target mobile */
}

.table-btn.free     { background: #22c55e; }
.table-btn.pending  { background: #f59e0b; }
.table-btn.reserved { background: #ef4444; }
.table-btn.small    { background: #6b7280; } /* trop petite pour le groupe */
```

```jsx
// TableButton.jsx
<button
  className={`table-btn ${status}`}
  style={{ "--x": `${table.pos_x}%`, "--y": `${table.pos_y}%` }}
  onClick={() => onSelect(table)}
  disabled={status !== "free"}
>
  <span>{table.code}</span>
  <span>{table.seats}p</span>
</button>
```

Deux zones indépendantes : `zone = 'interieur'` et `zone = 'terrasse'` → deux conteneurs `.floor-plan` séparés.

### Drag & drop admin — Pointer Events obligatoires

```js
// CORRECT - fonctionne sur tactile ET souris
onPointerDown / onPointerMove / onPointerUp

// INTERDIT - ne fonctionne pas sur écran tactile
onMouseDown / onMouseMove / onMouseUp
```

```js
function onPointerMove(e, tableId) {
  const rect = containerRef.current.getBoundingClientRect()
  const pos_x = Math.min(97, Math.max(3, ((e.clientX - rect.left) / rect.width) * 100))
  const pos_y = Math.min(97, Math.max(3, ((e.clientY - rect.top) / rect.height) * 100))
  setLocalPositions(prev => ({ ...prev, [tableId]: { pos_x, pos_y } }))
}

async function onPointerUp(tableId) {
  const { pos_x, pos_y } = localPositions[tableId]
  await fetch("/api/tables/update", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: tableId, pos_x, pos_y })
  })
}
```

---

## Logique de réservation

### Disponibilité — créneau de 2h
```js
// lib/dateUtils.js
export function timesOverlap(startA, startB, durationMinutes = 120) {
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m }
  const endA = toMin(startA) + durationMinutes
  const endB = toMin(startB) + durationMinutes
  return toMin(startA) < endB && toMin(startB) < endA
}
```

Une table est **occupée** si une réservation `pending` ou `confirmed` existe pour elle
à la même date avec chevauchement horaire.

### Horaires d'ouverture
```js
export const OPENING_HOURS = {
  0: [],                                                           // Dimanche fermé
  1: [{ start: "18:00", end: "22:00" }],                         // Lundi soir seulement
  2: [{ start: "12:00", end: "14:30" }, { start: "18:00", end: "22:00" }],
  3: [{ start: "12:00", end: "14:30" }, { start: "18:00", end: "22:00" }],
  4: [{ start: "12:00", end: "14:30" }, { start: "18:00", end: "22:00" }],
  5: [{ start: "12:00", end: "14:30" }, { start: "18:00", end: "22:00" }],
  6: [{ start: "12:00", end: "14:30" }, { start: "18:00", end: "22:00" }],
}
```

### Flux client
1. Nombre de couverts → date → créneau → plan de salle → table → formulaire → soumission
2. Insertion en base `status: pending` + email accusé client + notification gérant

### Flux admin
1. Voir les `pending` → Valider (`confirmed` + email client) ou Refuser (`cancelled` + email client)
2. Plan de salle mis à jour en temps réel via Supabase Realtime

---

## Emails — Brevo

```js
// lib/brevo.js
const SibApiV3Sdk = require("@getbrevo/brevo")
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
apiInstance.authentications["api-key"].apiKey = process.env.BREVO_API_KEY

export async function sendEmail({ to, subject, html }) {
  const mail = new SibApiV3Sdk.SendSmtpEmail()
  mail.sender      = { name: "NATA Bar", email: "noreply@natabar.be" }
  mail.to          = [{ email: to }]
  mail.subject     = subject
  mail.htmlContent = html
  return apiInstance.sendTransacEmail(mail)
}
```

| Déclencheur | Destinataire | Route API |
|---|---|---|
| Résa soumise | Client | `POST /api/reservations/create` |
| Résa soumise | Gérant | `POST /api/reservations/create` |
| Résa confirmée | Client | `POST /api/reservations/confirm` |
| Résa annulée | Client | `POST /api/reservations/cancel` |
| Devis soumis | Gérant | `POST /api/devis` |

---

## Interface admin

### Gestion du menu (`/admin/menu`)
- Toggle `is_available` : PUT immédiat sans modale, mise à jour optimiste du state React
- Ajouter / Modifier : modale `MenuItemModal` (nom, description, prix, tags, catégorie, sous-catégorie)
- Supprimer : modale de confirmation obligatoire
- Réordonner : drag & drop Pointer Events → PUT `sort_order`
- Pas de rechargement de page → mise à jour optimiste puis confirmation BDD

### Gestion des actualités (`/admin/actualites`)
- Créer / Modifier : `ArticleForm` (titre, contenu, `event_date` optionnelle, image, statut)
- Images : upload vers Supabase Storage bucket `news-images` (max 2Mo, JPG/PNG/WebP)
- Toggle publié/brouillon : directement depuis la liste
- Supprimer : modale de confirmation
- Côté public `/actualites` : `is_published = true` uniquement, triés `event_date DESC` puis `created_at DESC`

---

## Middleware (protection admin)

```js
// middleware.js
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session && req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
  return res
}

export const config = { matcher: ["/admin/:path*"] }
```

---

## Variables d'environnement

```bash
# .env.local — JAMAIS commité sur Git
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # API routes uniquement
BREVO_API_KEY=
ADMIN_EMAIL=
NEXT_PUBLIC_SITE_URL=
```

---

## Design

| Élément | Valeur |
|---|---|
| Fond principal | `#1a1a1a` |
| Couleur accent | `#e63946` |
| Titre font | Bebas Neue (Google Fonts) |
| Corps font | Manrope 400/500/700/800 (Google Fonts) |
| Texture | noise CSS sur le body |

---

## Responsive — règles Tailwind

Toujours coder dans cet ordre : mobile → `sm:` → `md:` → `lg:`

```
375px  → défaut  → mobile (base)
640px  → sm:     → grand mobile
768px  → md:     → tablette (référence admin)
1024px → lg:     → desktop
```

### Règles tactiles admin (non négociables)
- Touch targets ≥ 48×48px sur tous les boutons d'action
- `onPointerDown/Move/Up` pour tout drag & drop (jamais `onMouse*`)
- Pas d'interactions hover-only
- Inputs `h-12` minimum
- Swipe gauche sur cards de réservation → révèle Valider / Refuser
- Modales : fermeture au tap en dehors

---

## Sécurité — rappels

- Ne jamais mettre de credentials en dur (la maquette le fait — c'est un bug, pas un exemple)
- `supabaseAdmin` (service role) → uniquement dans `pages/api/`
- RLS activé sur toutes les tables Supabase
- Validation serveur sur chaque API Route

---

## État du projet

- [ ] Phase 1 — Setup : `create-next-app`, Supabase, `.env.local`, layout global
- [ ] Phase 2 — Pages statiques : Accueil, Menu, Événements, Actualités
- [ ] Phase 3 — Réservation : FloorPlan CSS, calendrier, créneaux, Realtime ← **le plus complexe**
- [ ] Phase 4 — Admin : dashboard, réservations, plan de salle, menu, actualités
- [ ] Phase 5 — Emails Brevo, SEO, RGPD
- [ ] Phase 6 — Tests + mise en ligne

### Commande de démarrage Phase 1
```bash
npx create-next-app@14 nata-bar --js --no-app --no-src-dir --no-turbopack --tailwind --eslint
```

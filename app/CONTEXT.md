# CONTEXT.md — NATA Bar Web Project
> Fichier de contexte pour Claude Code. Lis ce fichier en entier avant de commencer.

---

## Vue d'ensemble du projet

Site web complet pour **NATA Bar**, restaurant coréen à Louvain-la-Neuve (Belgique).
Le projet est en phase de **setup initial** — aucun code Next.js n'existe encore.

Une maquette HTML/CSS/JS existe dans un dossier séparé (`/maquette/`) et sert de
**référence de design uniquement**. Elle n'est pas à intégrer telle quelle — elle
est non commentée, hardcodée, et utilise localStorage comme fausse BDD.
Ce qu'on garde de la maquette : le design visuel (couleurs, typographies, composants),
le contenu du menu, et l'idée du plan de salle en CSS pur.

**Le site est entièrement en français.** Pas de multilingue, pas de next-i18next,
pas de colonnes `_en` en base de données.

---

## Stack technique

| Couche | Technologie | Notes |
|---|---|---|
| Framework | Next.js 14, **Pages Router** | PAS App Router |
| Style | Tailwind CSS | **mobile-first strict** |
| BDD + Auth + Realtime | **Supabase** (PostgreSQL) | |
| Emails | **Brevo** (ex-Sendinblue) | 300/jour gratuit, RGPD EU |
| Hébergement | Vercel | déploiement auto depuis GitHub |
| Plan de salle | CSS pur (variables CSS + position absolue) | PAS de Canvas ni SVG library |

---

## Pages du site (routing Next.js Pages Router)

```
/                    → Accueil
/menu                → Menu / Carte
/evenements          → Événements (food truck + privatisation sur devis)
/actualites          → Actualités passées et à venir
/reservation         → Réservation + plan de salle interactif
/admin               → Dashboard admin (protégé, redirect si non connecté)
/admin/reservations  → Gestion des réservations
/admin/tables        → Éditeur du plan de salle (drag & drop)
/admin/menu          → CRUD menu
/admin/actualites    → CRUD articles
/login               → Login admin (Supabase Auth)
```

---

## Design

| Élément | Valeur |
|---|---|
| Fond principal | `#12100e` |
| Fond cards / sections | `#1c1916` |
| Fond inputs / borders | `#252119` |
| Texte principal | `#ede0c4` (crème) |
| Texte secondaire | `#a89880` (crème foncé) |
| Accent | `#e8621a` (orange flamme) |
| Titre font | Bebas Neue (Google Fonts) |
| Corps font | Manrope 400/500/700/800 (Google Fonts) |
| Texture | noise CSS sur le body |

### Plan de salle — couleurs statut
| Statut | Couleur |
|---|---|
| Libre | `#22c55e` |
| En attente | `#f59e0b` |
| Réservée | `#ef4444` |
| Inactive / trop petite | `#6b7280` |

### Variables CSS globales à définir dans `globals.css`
```css
:root {
  --bg-main:       #12100e;
  --bg-card:       #1c1916;
  --bg-input:      #252119;
  --text-primary:  #ede0c4;
  --text-secondary:#a89880;
  --accent:        #e8621a;
}
```

## Structure des dossiers cible

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
│   │   ├── index.js
│   │   ├── reservations.js
│   │   ├── tables.js
│   │   ├── menu.js
│   │   └── actualites.js
│   └── api/
│       ├── reservations/
│       │   ├── create.js
│       │   ├── confirm.js
│       │   └── cancel.js
│       ├── tables/
│       │   ├── index.js
│       │   └── update.js
│       ├── menu/
│       │   └── index.js      ← GET / POST / PUT / DELETE plats
│       ├── actualites/
│       │   └── index.js      ← GET / POST / PUT / DELETE articles
│       └── devis.js
├── components/
│   ├── layout/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   └── AdminLayout.jsx
│   ├── reservation/
│   │   ├── FloorPlan.jsx       ← plan de salle CSS pur
│   │   ├── TableButton.jsx     ← bouton table individuel
│   │   ├── DatePicker.jsx
│   │   ├── TimePicker.jsx
│   │   └── BookingForm.jsx
│   ├── admin/
│   │   ├── TableEditor.jsx     ← drag & drop éditeur
│   │   ├── ReservationCard.jsx
│   │   ├── Timeline.jsx
│   │   ├── MenuItemModal.jsx   ← formulaire ajout / édition plat
│   │   └── ArticleForm.jsx     ← formulaire ajout / édition article
│   └── ui/
│       ├── Modal.jsx
│       ├── Button.jsx
│       └── Badge.jsx
├── lib/
│   ├── supabase.js             ← client Supabase côté front (anon key)
│   ├── supabaseAdmin.js        ← client Supabase côté serveur (service role)
│   ├── brevo.js                ← client Brevo pour emails
│   └── dateUtils.js            ← utilitaires créneaux horaires
└── styles/
    ├── globals.css
    └── floorplan.css           ← styles du plan de salle
```

---

## Schéma Supabase (PostgreSQL)

### Table `tables`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
code        text NOT NULL           -- "T-1", "T-2"...
seats       integer NOT NULL        -- capacité
zone        text NOT NULL           -- 'interieur' | 'terrasse'
pos_x       numeric NOT NULL        -- position X en % (0-100)
pos_y       numeric NOT NULL        -- position Y en % (0-100)
is_active   boolean DEFAULT true
created_at  timestamptz DEFAULT now()
```

### Table `reservations`
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
table_ids    uuid[]                  -- support fusion de tables
date         date NOT NULL
time_start   time NOT NULL
covers       integer NOT NULL
name         text NOT NULL
email        text NOT NULL
phone        text NOT NULL
message      text
status       text DEFAULT 'pending'  -- 'pending' | 'confirmed' | 'cancelled'
created_at   timestamptz DEFAULT now()
```

### Table `menu_items`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
category        text NOT NULL    -- 'entrees' | 'plats' | 'desserts' | 'boissons'
subcategory     text             -- 'cocktails-classic' | 'bieres' | 'softs'...
name            text NOT NULL    -- nom du plat en français
description     text
price           numeric(6,2)     -- null si prix non affiché
tags            text[]           -- ['vegan', 'sans-gluten', 'épicé']
is_available    boolean DEFAULT true
sort_order      integer DEFAULT 0
created_at      timestamptz DEFAULT now()
```

### Table `news_posts`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
title         text NOT NULL
content       text
image_url     text              -- URL Supabase Storage (bucket: news-images)
event_date    date              -- null si actualité générale (pas un événement daté)
is_published  boolean DEFAULT false
created_at    timestamptz DEFAULT now()
```

### Table `quote_requests`
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
type          text             -- 'privatisation' | 'food_truck'
event_date    date
guests        integer
name          text NOT NULL
email         text NOT NULL
phone         text
message       text
created_at    timestamptz DEFAULT now()
```

### Table `settings`
```sql
key   text PRIMARY KEY        -- identifiant du paramètre
value text NOT NULL           -- valeur (toujours stockée en texte)
```

Valeur initiale :
```sql
INSERT INTO settings (key, value) VALUES ('terrasse_active', 'false');
```

### Table `floor_plans`
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
name       text NOT NULL          -- "Normal", "Événement", "Hiver"...
layout     jsonb NOT NULL         -- snapshot positions : [{ id, pos_x, pos_y }, ...]
is_default boolean DEFAULT false  -- chargé automatiquement au démarrage de l'admin
created_at timestamptz DEFAULT now()
```

### Table `settings`
```sql
key   text PRIMARY KEY   -- ex: 'terrasse_active'
value text NOT NULL      -- ex: 'true' | 'false'
```

Valeur initiale à insérer :
```sql
INSERT INTO settings (key, value) VALUES ('terrasse_active', 'false');
```

---

## Dispositions du plan de salle

Le gérant peut sauvegarder plusieurs **dispositions nommées** et en appliquer une en un clic.
Exemples : "Normal", "Soirée événement", "Hiver (sans terrasse)".

Depuis `/admin/tables` :
- **Sauvegarder** → modale pour nommer → snapshot JSON des positions → INSERT dans `floor_plans`
- **Charger** → liste des dispositions → applique les positions sur toutes les tables en BDD
- **Définir par défaut** → `is_default = true` (false sur toutes les autres) → chargée automatiquement à l'ouverture

Routes API :
```
pages/api/tables/
├── index.js          → GET tables + état terrasse
├── update.js         → PUT position / seats / code d'une table
├── settings.js       → PUT terrasse_active
└── floor-plans.js    → GET liste / POST créer / PUT is_default / DELETE
```

---

## Gestion de la terrasse

La terrasse est **saisonnière et météo-dépendante**. Le gérant peut l'activer ou la
désactiver en un clic depuis `/admin/tables` sans toucher au code.

- L'état est stocké dans `settings` avec `key = 'terrasse_active'`, `value = 'true' | 'false'`
- Terrasse **active** → le bloc terrasse s'affiche sur `/reservation`, les tables sont réservables
- Terrasse **inactive** → le bloc terrasse est masqué côté client, les tables BDD restent intactes
- Le toggle est un switch visible en haut de la page `/admin/tables`
- `GET /api/tables` renvoie les tables **et** l'état terrasse dans la même réponse
- `PUT /api/tables/settings` met à jour la valeur dans `settings`

```jsx
// FloorPlan.jsx — affichage conditionnel
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

---

## Plan de salle — Architecture CSS (IMPORTANT)

Le plan de salle utilise du **CSS pur avec variables CSS** — PAS de Canvas, PAS de SVG library.

Principe :
- Chaque table = un `<button>` positionné en `position: absolute`
- Les coordonnées viennent de Supabase et sont injectées via `style={{ "--x": "24%", "--y": "12%" }}`
- Le conteneur est en `position: relative` avec `padding-bottom: 70%` pour le ratio

```css
/* floorplan.css */
.floor-plan {
  position: relative;
  width: 100%;
  padding-bottom: 70%;
}

.table-btn {
  position: absolute;
  left: var(--x);
  top: var(--y);
  transform: translate(-50%, -50%);
  width: 11%;
  aspect-ratio: 1;
}

.table-btn.free     { background: #22c55e; }
.table-btn.pending  { background: #f59e0b; }
.table-btn.reserved { background: #ef4444; }
```

Deux zones distinctes : `zone = 'interieur'` et `zone = 'terrasse'` — deux conteneurs séparés.

L'admin peut **ajouter/déplacer/désactiver** des tables depuis `/admin/tables` :
- Drag & drop via Pointer Events API
- Position sauvegardée en % dans Supabase via `PUT /api/tables/update`
- Ajout de table : formulaire (code, seats, zone) → insert Supabase

---

## Logique de réservation

### Flux client
1. Nombre de personnes
2. Date (calendrier modal, jours fermés désactivés)
3. Créneau horaire (30min, selon horaires d'ouverture)
4. Plan de salle (tables colorées selon dispo temps réel via Supabase Realtime)
5. Formulaire (nom, email, téléphone, message)
6. Soumission → `status: pending` → emails envoyés

### Flux admin
1. Dashboard affiche les `pending`
2. Valider → `confirmed` → email client
3. Refuser → `cancelled` → email client
4. Plan de salle sync temps réel (Supabase Realtime)

### Règle de disponibilité
Une table est occupée si une réservation `confirmed` ou `pending` existe pour cette
table à la même date avec un chevauchement horaire (créneau de **2 heures**).

```js
// lib/dateUtils.js
export function timesOverlap(startA, startB, durationMinutes = 120) {
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const endA = toMin(startA) + durationMinutes
  const endB = toMin(startB) + durationMinutes
  return toMin(startA) < endB && toMin(startB) < endA
}
```

### Horaires d'ouverture
```js
export const OPENING_HOURS = {
  0: [],                                                          // Dimanche fermé
  1: [{ start: '18:00', end: '22:00' }],                        // Lundi soir seulement
  2: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
  3: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
  4: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
  5: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
  6: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
}
```

---

## Interface Admin — Gestion du menu (`/admin/menu`)

L'admin voit la carte organisée par catégories (Entrées, Plats, Desserts, Boissons).

### Fonctionnalités
- **Toggle disponibilité** : switch on/off par plat — le plat disparaît/réapparaît
  sur la page publique `/menu` instantanément (sans rechargement)
- **Modifier** : modale pré-remplie avec nom, description, prix, tags, catégorie
- **Ajouter** : même modale avec champs vides + choix catégorie/sous-catégorie
- **Supprimer** : bouton supprimer avec modal de confirmation (évite les suppressions accidentelles)
- **Réordonner** : drag & drop dans chaque catégorie → met à jour `sort_order` en BDD

### API Route : `pages/api/menu/index.js`
```js
// GET    → liste tous les plats (triés par category + sort_order)
// POST   → crée un nouveau plat
// PUT    → modifie un plat existant (id requis dans le body)
// DELETE → supprime un plat (id requis dans le body)
```

### Comportement front
- Pas de rechargement de page : React met à jour l'état local (optimistic update)
  puis confirme en BDD via l'API Route
- Le toggle disponibilité fait un `PUT` immédiat et met à jour la couleur
  de la card sans ouvrir de modale

---

## Interface Admin — Gestion des actualités (`/admin/actualites`)

L'admin voit une liste de tous ses articles avec leur statut (publié / brouillon).

### Fonctionnalités
- **Créer un article** : formulaire avec titre, contenu (textarea), date d'événement
  (optionnelle — null si actualité générale), upload image, statut publié/brouillon
- **Modifier** : même formulaire pré-rempli
- **Toggle publié/brouillon** : directement depuis la liste, sans ouvrir le formulaire
- **Supprimer** : avec modal de confirmation

### Upload d'image
- Upload vers **Supabase Storage** (bucket `news-images`, accès public)
- L'URL publique est stockée dans `image_url`
- Taille max recommandée : 2 Mo, formats acceptés : JPG, PNG, WebP

### Affichage côté public (`/actualites`)
- Seuls les articles `is_published = true` sont visibles
- Triés par `event_date DESC` (événements à venir en premier)
  puis `created_at DESC` pour les actualités sans date

### API Route : `pages/api/actualites/index.js`
```js
// GET    → liste les articles (publié uniquement côté public, tous côté admin)
// POST   → crée un article
// PUT    → modifie un article
// DELETE → supprime un article
```

---

## Emails — Brevo (IMPORTANT : pas Resend)

**Pourquoi Brevo et pas Resend ?**
Resend free = 100 emails/jour. Un samedi chargé (30 résa × 3 emails) = 90 emails.
Trop risqué. Brevo free = **300 emails/jour**, RGPD européen natif, gratuit.

### Emails envoyés
| Déclencheur | Destinataire | Template |
|---|---|---|
| Résa soumise | Client | Accusé de réception |
| Résa soumise | Gérant | Notification + lien admin |
| Résa confirmée | Client | Confirmation définitive |
| Résa annulée | Client | Annulation |
| Devis soumis | Gérant | Contenu formulaire privatisation |

### Intégration
```js
// lib/brevo.js
const SibApiV3Sdk = require('@getbrevo/brevo')
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
apiInstance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY

export async function sendEmail({ to, subject, html }) {
  const mail = new SibApiV3Sdk.SendSmtpEmail()
  mail.sender      = { name: 'NATA Bar', email: 'noreply@natabar.be' }
  mail.to          = [{ email: to }]
  mail.subject     = subject
  mail.htmlContent = html
  return apiInstance.sendTransacEmail(mail)
}
```

---

## Sécurité

- **JAMAIS** de credentials en dur dans le code
- Toutes les clés dans `.env.local` (dans `.gitignore`)
- `SUPABASE_SERVICE_ROLE_KEY` utilisée UNIQUEMENT dans `lib/supabaseAdmin.js` (côté serveur)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` uniquement pour le client front
- Middleware Next.js protège toutes les routes `/admin/*`
- RLS (Row Level Security) activé sur toutes les tables Supabase

### Variables d'environnement requises
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BREVO_API_KEY=
ADMIN_EMAIL=
NEXT_PUBLIC_SITE_URL=
```

---

## Design (référence maquette)

Typographies (Google Fonts) :
- Titres : **Bebas Neue**
- Corps : **Manrope** (400, 500, 700, 800)

Palette :
- Fond principal : `#1a1a1a` (noir chaud)
- Accent : `#e63946` (rouge)
- Texte : blanc / gris clair
- Cards : fond légèrement plus clair que le fond

Effet texture noise (CSS) sur le body.

---

## Responsive & Mobile-first (IMPORTANT)

### Site public — 100% mobile
Le site public est conçu **mobile en premier**. Chaque composant est pensé pour
un écran de 375px et s'adapte ensuite aux écrans plus larges. Aucun élément ne
doit être inaccessible ou cassé sur mobile.

Points d'attention spécifiques :
- **Plan de salle** (`/reservation`) : le conteneur doit rester lisible sur mobile.
  Sur petit écran, permettre le scroll horizontal ou zoomer dans le plan si nécessaire.
  Les boutons de table doivent rester cliquables (taille minimum touch target : 44×44px).
- **Calendrier / créneaux** : pleine largeur sur mobile, pas de colonne flottante
- **Formulaire de réservation** : champs empilés, pas de grid multi-colonnes sur mobile
- **Navigation** : burger menu sur mobile, sticky header

### Interface admin — pensée tablette tactile
L'interface admin est utilisée **en situation réelle dans le restaurant** : le gérant
a une tablette (iPad ou Android) posée sur le comptoir ou en salle. L'admin doit
être **entièrement utilisable au doigt**, sans souris.

Règles obligatoires pour toutes les pages admin :
- **Touch targets minimum 48×48px** pour tous les boutons d'action (valider, refuser, toggle...)
- **Pas de hover-only interactions** — tout ce qui est accessible au hover doit aussi
  être accessible au tap
- **Drag & drop du plan de salle** : utiliser les **Pointer Events API** (pas Mouse Events)
  pour supporter le tactile nativement. `onPointerDown`, `onPointerMove`, `onPointerUp`
  au lieu de `onMouseDown` etc.
- **Drag & drop du menu** (réordonnancement) : idem, Pointer Events obligatoires
- **Modales** : fermeture au tap en dehors de la modale, bouton de fermeture grand
  et facilement atteignable
- **Swipe** : sur la liste des réservations, un swipe gauche peut révéler les boutons
  Valider / Refuser (pattern mobile natif)
- **Formulaires admin** : inputs de grande taille (`h-12` minimum), pas de petits
  champs difficiles à taper sur tactile
- **Espacements** : `gap` et `padding` généreux dans les listes et cards admin

### Breakpoints Tailwind à utiliser
```
Mobile    : défaut (pas de préfixe) → 375px+
Tablette  : sm: → 640px+  /  md: → 768px+
Desktop   : lg: → 1024px+
```

L'admin est conçu pour `md:` (768px, tablette portrait) comme écran de référence principal.
Le desktop (`lg:`) est un bonus, pas la cible principale de l'admin.

---

## État actuel du projet

- [ ] Phase 1 — Setup : `create-next-app`, Supabase, variables env, layout
- [ ] Phase 2 — Pages statiques : Accueil, Menu, Événements, Actualités
- [ ] Phase 3 — Plan de salle + réservation
- [ ] Phase 4 — Interface admin (réservations + menu + actualités + tables)
- [ ] Phase 5 — Emails Brevo, SEO (meta, Open Graph, sitemap), RGPD
- [ ] Phase 6 — Tests + mise en ligne

**Prochaine tâche : Phase 1 — Setup initial**

```bash
npx create-next-app@14 nata-bar --js --no-app --no-src-dir --no-turbopack --tailwind --eslint
```

---

## Notes importantes pour Claude Code

1. **Pages Router uniquement** — ne jamais utiliser `app/` directory ni Server Components
2. **Site 100% en français** — pas de next-i18next, pas de colonnes `_en`, pas de `router.locale`
3. **Mobile-first strict** — coder d'abord pour 375px, élargir ensuite avec `sm:`, `md:`, `lg:`
4. **Admin sur tablette tactile** — Pointer Events (pas Mouse Events), touch targets ≥48px, pas de hover-only
5. **Le plan de salle** est le composant le plus complexe — bien lire la section dédiée avant de commencer
6. **Brevo et pas Resend** pour les emails
7. Le contenu du menu est déjà connu (voir maquette) — à insérer en SQL dans Supabase
8. La maquette HTML est une référence visuelle, pas du code à réutiliser
9. Utiliser `supabaseAdmin` (service role) uniquement dans les fichiers `pages/api/`
10. Les mises à jour admin (menu, actualités) sont optimistes côté front — pas de rechargement

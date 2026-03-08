# CONTEXT.md — NATA Bar
> Fichier de contexte pour Claude Code. Lis ce fichier en entier avant de commencer.

---

## Vue d'ensemble

Site web complet pour **NATA Bar**, restaurant coréen à Louvain-la-Neuve (Belgique).
Stack : Express.js + EJS + PostgreSQL + Brevo + Render.

Le dossier `/maquette/` est une référence visuelle uniquement — ne pas réutiliser son code.
Ce qu'on garde de la maquette : le design (couleurs, typo), le contenu du menu, l'idée du plan de salle CSS pur.

**Le site est entièrement en français.** Pas de multilingue.

---

## Stack technique

| Couche | Technologie | Notes |
|---|---|---|
| Backend | Express.js | Serveur Node.js classique |
| Templates | EJS | Rendu serveur, pas de React |
| BDD | PostgreSQL | Sur Render (même service que l'app) |
| Auth admin | express-session + bcrypt | Sessions côté serveur |
| Emails | Brevo | 300/jour gratuit, RGPD EU |
| Upload images | Multer | Stockage dans `public/uploads/` |
| Hébergement | Render | App + BDD ensemble |
| Polling admin | fetch + setInterval | Toutes les 20s, vanilla JS |

---

## Pages du site

```
/                    → Accueil
/menu                → Menu / Carte
/evenements          → Événements (food truck + privatisation)
/actualites          → Liste des actualités
/actualites/:id      → Détail d'une actualité
/reservation         → Réservation + plan de salle interactif
/login               → Login admin
/admin               → Dashboard (protégé)
/admin/reservations  → Gestion des réservations
/admin/tables        → Éditeur du plan de salle
/admin/menu          → CRUD menu
/admin/actualites    → CRUD articles
```

---

## Structure des dossiers

```
app/
├── server.js
├── db.js
├── lib/
│   ├── brevo.js
│   └── dateUtils.js
├── routes/
│   ├── index.js
│   ├── menu.js
│   ├── evenements.js
│   ├── actualites.js
│   ├── reservation.js
│   └── admin.js
├── controllers/
│   ├── reservationController.js
│   ├── menuController.js
│   ├── actualitesController.js
│   ├── tablesController.js
│   └── adminController.js
├── middleware/
│   ├── auth.js
│   └── upload.js
├── views/
│   ├── partials/
│   │   ├── header.ejs
│   │   ├── footer.ejs
│   │   └── reservations-list.ejs
│   ├── index.ejs
│   ├── menu.ejs
│   ├── evenements.ejs
│   ├── actualites.ejs
│   ├── actualite-detail.ejs
│   ├── reservation.ejs
│   ├── login.ejs
│   └── admin/
│       ├── dashboard.ejs
│       ├── reservations.ejs
│       ├── tables.ejs
│       ├── menu.ejs
│       └── actualites.ejs
└── public/
    ├── css/
    │   ├── main.css
    │   └── floorplan.css
    ├── js/
    │   ├── reservation.js
    │   ├── admin-tables.js
    │   ├── admin-menu.js
    │   └── admin-poll.js
    └── uploads/
```

---

## Schéma PostgreSQL (8 tables)

### `tables`
```sql
id          serial PRIMARY KEY
code        text NOT NULL
seats       integer NOT NULL
zone        text NOT NULL CHECK (zone IN ('interieur', 'terrasse'))
pos_x       numeric NOT NULL DEFAULT 50
pos_y       numeric NOT NULL DEFAULT 50
is_active   boolean DEFAULT true
live_status text DEFAULT 'free' CHECK (live_status IN ('free', 'walk_in', 'occupied'))
-- 'free'     : table libre
-- 'walk_in'  : walk-in sur place, bloqué manuellement par le serveur
-- 'occupied' : client avec résa, arrivé et assis
-- Libéré manuellement → repasse à 'free'
created_at  timestamptz DEFAULT now()
```

### `reservations`
```sql
id         serial PRIMARY KEY
table_id   integer REFERENCES tables(id)
date       date NOT NULL
time_start time NOT NULL
covers     integer NOT NULL
name       text NOT NULL
email      text          -- NOT NULL si source='online', null si source='phone'
phone      text          -- NOT NULL si source='online', null si source='phone'
message    text          -- note interne pour les resas phone
source     text DEFAULT 'online' CHECK (source IN ('online', 'phone'))
-- 'online' : résa client depuis le site → email obligatoire
-- 'phone'  : saisie par le serveur → pas d'email requis
status     text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled'))
-- annulation → email client uniquement si source='online'
created_at timestamptz DEFAULT now()
```

### `menu_items`
```sql
id           serial PRIMARY KEY
category     text NOT NULL CHECK (category IN ('entrees', 'plats', 'desserts', 'boissons'))
subcategory  text
name         text NOT NULL
description  text
price        numeric(6,2)
tags         text[] DEFAULT '{}'
is_available boolean DEFAULT true
sort_order   integer DEFAULT 0
created_at   timestamptz DEFAULT now()
```

### `news_posts`
```sql
id           serial PRIMARY KEY
title        text NOT NULL
content      text
event_date   date             -- null si actualité générale
is_published boolean DEFAULT false
is_pinned    boolean DEFAULT false  -- épinglé = affiché en premier côté public
created_at   timestamptz DEFAULT now()
```

### `news_images`
```sql
id         serial PRIMARY KEY
post_id    integer REFERENCES news_posts(id) ON DELETE CASCADE
url        text NOT NULL      -- chemin /uploads/xxx.jpg
is_main    boolean DEFAULT false  -- photo principale (carte + header détail)
sort_order integer DEFAULT 0
```
Max 10 images par article. Une seule `is_main = true` par article.
Tri public : `ORDER BY is_pinned DESC, event_date DESC NULLS LAST, created_at DESC`

### `quote_requests`
```sql
id         serial PRIMARY KEY
type       text CHECK (type IN ('privatisation', 'food_truck'))
event_date date
guests     integer
name       text NOT NULL
email      text NOT NULL
phone      text
message    text
created_at timestamptz DEFAULT now()
```

### `settings`
```sql
key   text PRIMARY KEY
value text NOT NULL
```
Valeur initiale : `INSERT INTO settings (key, value) VALUES ('terrasse_active', 'false');`

### `floor_plans`
```sql
id         serial PRIMARY KEY
name       text NOT NULL
layout     jsonb NOT NULL     -- [{ id, pos_x, pos_y }, ...]
is_default boolean DEFAULT false
created_at timestamptz DEFAULT now()
```

### `admin_users`
```sql
id            serial PRIMARY KEY
email         text NOT NULL UNIQUE
password_hash text NOT NULL
created_at    timestamptz DEFAULT now()
```

---

## Plan de salle — CSS pur

Chaque table = un `<button>` en `position: absolute`.
Coordonnées injectées via variables CSS `--x` et `--y` en %.
Deux zones séparées : `interieur` et `terrasse`.

```css
.floor-plan { position: relative; width: 100%; padding-bottom: 70%; }
.table-btn  { position: absolute; left: var(--x); top: var(--y); transform: translate(-50%, -50%); }
.table-btn.free     { background: #22c55e; }
.table-btn.confirmed { background: #ef4444; }  /* réservée en ligne */
.table-btn.free     { background: #22c55e; }
.table-btn.upcoming { background: #f59e0b; }
.table-btn.occupied { background: #ef4444; }
.table-btn.walk_in  { background: #a855f7; }
.table-btn.reserved { background: #ef4444; }
```

Drag & drop admin : **Pointer Events obligatoires** (pas Mouse Events — ne fonctionnent pas sur tactile).

---

## Logique de réservation

- Disponibilité : pas de résa `confirmed` qui chevauche ET `live_status = 'free'`
- Flux client : GET formulaire → POST → INSERT confirmed → email confirmation client → redirect
- L'admin ne valide pas les resas — confirmées automatiquement
- Admin gère via clic sur table : walk-in, client arrivé, libérer
- Pas de formulaire walk-in, juste un toggle sur la table

### Horaires d'ouverture
```js
const OPENING_HOURS = {
  0: [],                                                            // Dimanche fermé
  1: [{ start: '18:00', end: '22:00' }],
  2: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
  3: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
  4: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
  5: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
  6: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
}
```

---

## Polling admin

Pas de Realtime. La liste des réservations se rafraîchit toutes les 20s via fetch vanilla JS.
Une route Express dédiée `/admin/reservations/fragment` renvoie uniquement le fragment HTML.
La page admin ne se recharge jamais — seul le contenu de la liste est mis à jour.

---

## Gestion de la terrasse

Toggle on/off depuis `/admin/tables`. État dans `settings.terrasse_active`.
Quand inactive : le bloc terrasse est masqué sur `/reservation`, les tables BDD restent intactes.

---

## Dispositions du plan de salle

Sauvegarder/charger/définir par défaut des configurations nommées (snapshots JSON des positions).
Stockées dans `floor_plans`. Accessibles depuis `/admin/tables`.

---

## Emails — Brevo

**Pourquoi Brevo ?** Resend free = 100/jour. Samedi chargé = 90 emails. Trop risqué.
Brevo free = 300/jour, hébergé en EU (RGPD natif).

| Déclencheur | Destinataire |
|---|---|
| Résa soumise | Client (accusé) + Gérant (notification) |
| Résa confirmée | Client |
| Résa annulée | Client |
| Devis soumis | Gérant |

---

## Auth admin

Sessions Express stockées en PostgreSQL (`connect-pg-simple`).
Login avec email + bcrypt. Session valide 24h.
Middleware `isAuth` protège toutes les routes `/admin/*`.

---

## Design

Inspiré du logo : fond noir chaud, texte crème, accent orange flamme.

| Élément | Valeur |
|---|---|
| Fond principal | `#12100e` |
| Fond cards | `#1c1916` |
| Fond inputs | `#252119` |
| Texte principal | `#ede0c4` (crème) |
| Texte secondaire | `#a89880` |
| Accent | `#e8621a` (orange flamme) |
| Titre font | Bebas Neue (Google Fonts) |
| Corps font | Manrope 400/500/700/800 (Google Fonts) |
| Texture | noise CSS sur le body |

---

## Variables d'environnement

```bash
DATABASE_URL=
SESSION_SECRET=
BREVO_API_KEY=
ADMIN_EMAIL=
SITE_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
```

---

## Responsive & Admin tactile

Mobile-first (375px base). Admin conçu pour tablette (768px).
Touch targets ≥ 48px. Pointer Events pour drag & drop. Pas de hover-only.

---

## Sécurité

- `.env` dans `.gitignore`
- Requêtes SQL paramétrées `$1, $2...`
- Sessions httpOnly
- Validation serveur sur chaque POST

---

## État du projet

- [x] Setup repo Git + structure dossiers
- [x] Dépendances npm installées
- [ ] Phase 1 — server.js, db.js, auth, layout EJS
- [ ] Phase 2 — Pages publiques
- [ ] Phase 3 — Réservation + plan de salle
- [ ] Phase 4 — Interface admin
- [ ] Phase 5 — Emails, SEO, RGPD
- [ ] Phase 6 — Déploiement Render

---

## Notes importantes pour Claude Code

1. **Express + EJS** — pas de React, pas de Next.js
2. **Vanilla JS** côté client uniquement
3. **Mobile-first** — 375px d'abord
4. **Pointer Events** pour tout drag & drop (jamais Mouse Events)
5. **Polling** à la place du Realtime — simple fetch toutes les 20s
6. **PostgreSQL** avec requêtes paramétrées — jamais de concaténation SQL
7. **Brevo** pour les emails, pas Resend
8. **Multer** pour les uploads, stockage dans `public/uploads/`
9. La maquette est une référence visuelle, pas du code à réutiliser
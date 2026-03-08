# CLAUDE.md — NATA Bar

Lis ce fichier en entier avant d'écrire la moindre ligne de code.

---

## Projet

Site web complet pour **NATA Bar**, restaurant coréen à Louvain-la-Neuve (Belgique).
Stack : Express.js + EJS + PostgreSQL + Brevo + Render.

Le dossier `/maquette/` contient une version HTML/CSS/JS de référence visuelle uniquement.
Ne pas réutiliser son code — il a des credentials en dur et pas de backend.
Ce qu'on en garde : le design (couleurs, typo, composants visuels) et le contenu du menu.

---

## Règles absolues

1. **Express + EJS uniquement** — pas de React, pas de Next.js, pas de framework front
2. **Site 100% en français** — pas de i18n, pas de colonnes `_en`
3. **Mobile-first strict** — coder pour 375px d'abord
4. **Admin tactile** — touch targets ≥ 48px, Pointer Events pour le drag & drop
5. **Brevo pour les emails** — jamais Resend (limite 100/jour trop basse)
6. **Vanilla JS côté client** — pas de React, pas de Vue, pas de jQuery
7. **Plan de salle en CSS pur** — pas de Canvas, pas de SVG library
8. **Jamais de credentials en dur** — tout dans `.env`

---

## Stack

| Couche | Outil | Notes |
|---|---|---|
| Backend | Express.js | Serveur Node.js |
| Templates | EJS | Rendu côté serveur |
| BDD | PostgreSQL | Hébergé sur Render |
| Auth admin | express-session + bcrypt | Sessions serveur |
| Emails | Brevo (`@getbrevo/brevo`) | 300/jour gratuit |
| Upload images | Multer | Stockage local `/public/uploads/` |
| Hébergement | Render | App + BDD au même endroit |
| Realtime admin | Polling fetch toutes les 20s | Vanilla JS, pas de Socket.io |

---

## Structure des fichiers

```
app/
├── server.js                  → point d'entrée, config Express
├── db.js                      → pool PostgreSQL (pg)
├── lib/
│   ├── brevo.js               → sendEmail()
│   └── dateUtils.js           → timesOverlap(), getSlotsForDate(), OPENING_HOURS
├── routes/
│   ├── index.js               → GET /
│   ├── menu.js                → GET /menu
│   ├── evenements.js          → GET /evenements + POST /devis
│   ├── actualites.js          → GET /actualites, GET /actualites/:id
│   ├── reservation.js         → GET /reservation + POST /reservation
│   └── admin.js               → toutes les routes /admin/* (protégées)
├── controllers/
│   ├── reservationController.js
│   ├── menuController.js
│   ├── actualitesController.js
│   ├── tablesController.js
│   └── adminController.js
├── middleware/
│   ├── auth.js                → vérifie req.session.admin, redirect /login sinon
│   └── upload.js              → config Multer
├── views/
│   ├── partials/
│   │   ├── header.ejs
│   │   ├── footer.ejs
│   │   └── reservations-list.ejs  → fragment pour le polling admin
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
    │   ├── reservation.js     → plan de salle interactif
    │   ├── admin-tables.js    → drag & drop plan de salle
    │   ├── admin-menu.js      → toggle dispo, réordonnancement
    │   └── admin-poll.js      → polling toutes les 20s
    └── uploads/               → images actualités uploadées
```

---

## Schéma PostgreSQL

### `tables`
```sql
id         serial PRIMARY KEY
code       text NOT NULL
seats      integer NOT NULL
zone       text NOT NULL CHECK (zone IN ('interieur', 'terrasse'))
pos_x      numeric NOT NULL DEFAULT 50
pos_y      numeric NOT NULL DEFAULT 50
is_active  boolean DEFAULT true
live_status text DEFAULT 'free' CHECK (live_status IN ('free', 'walk_in', 'occupied'))
-- 'free'     : table libre
-- 'walk_in'  : client sur place sans résa, bloqué manuellement
-- 'occupied' : client avec résa, arrivé et assis
-- Libéré manuellement par le serveur → repasse à 'free'
created_at timestamptz DEFAULT now()
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
-- 'online' : résa faite par le client sur le site → email obligatoire
-- 'phone'  : résa saisie par le serveur → pas d'email, pas de téléphone requis
status     text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled'))
-- 'confirmed' : résa active
-- 'cancelled' : annulée → email au client uniquement si source='online'
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
is_pinned    boolean DEFAULT false  -- épinglé = affiché en premier
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

**Règles images :**
- Max 10 images par article (vérification côté serveur avant upload)
- Une seule `is_main = true` par article
- Suppression article → cascade-supprime toutes ses images
- Tri public : `ORDER BY is_pinned DESC, event_date DESC NULLS LAST, created_at DESC`

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

## Connexion PostgreSQL

```js
// db.js
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

module.exports = pool
```

---

## Auth admin — Sessions

```js
// server.js
const session = require('express-session')
const connectPgSimple = require('connect-pg-simple')
const PgSession = connectPgSimple(session)

app.use(session({
  store: new PgSession({ pool }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24h
}))
```

```js
// middleware/auth.js
module.exports = function isAuth(req, res, next) {
  if (req.session && req.session.admin) return next()
  res.redirect('/login')
}
```

```js
// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const { rows } = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email])
  if (!rows[0]) return res.render('login', { error: 'Identifiants incorrects' })
  const valid = await bcrypt.compare(password, rows[0].password_hash)
  if (!valid) return res.render('login', { error: 'Identifiants incorrects' })
  req.session.admin = { id: rows[0].id, email: rows[0].email }
  res.redirect('/admin')
})
```

---

## Plan de salle — CSS pur

```css
/* public/css/floorplan.css */
.floor-plan {
  position: relative;
  width: 100%;
  padding-bottom: 70%;
  background: #1c1916;
}

.table-btn {
  position: absolute;
  left: var(--x);
  top: var(--y);
  transform: translate(-50%, -50%);
  width: 11%;
  aspect-ratio: 1;
  min-width: 44px;
  min-height: 44px;
}

.table-btn.free     { background: #22c55e; }  /* libre */
.table-btn.upcoming { background: #f59e0b; }  /* résa à venir aujourd'hui, client pas encore arrivé */
.table-btn.occupied { background: #ef4444; }  /* client assis (résa arrivée) */
.table-btn.walk_in  { background: #a855f7; }  /* walk-in sur place */
.table-btn.inactive { background: #6b7280; }  /* trop petite / désactivée */
```

### Logique de couleur — plan de salle admin

La couleur d'une table est déterminée dans cet ordre de priorité :

```js
function getTableDisplayStatus(table, reservations, now) {
  // 1. Statut live en priorité absolue (géré manuellement)
  if (table.live_status === 'walk_in') return 'walk_in'
  if (table.live_status === 'occupied') return 'occupied'

  // 2. Réservation confirmée qui chevauche l'heure actuelle ou à venir aujourd'hui
  const hasUpcoming = reservations.some(r =>
    r.table_id === table.id &&
    r.status === 'confirmed' &&
    r.date === today
  )
  if (hasUpcoming) return 'upcoming'

  // 3. Libre
  return 'free'
}
```

### Menu contextuel — clic sur une table (admin uniquement)

Quand le serveur clique sur une table, un menu contextuel apparaît selon le statut :

| Statut table | Options affichées |
|---|---|
| `free` (sans résa) | **Walk-in** |
| `free` (avec résa à venir) | **Walk-in** · **Voir la résa** |
| `upcoming` | **Client arrivé** · **Voir la résa** · **Annuler la résa** |
| `occupied` | **Libérer la table** · **Voir la résa** |
| `walk_in` | **Libérer la table** |

**Actions :**
- **Walk-in** → `POST /admin/tables/:id/walkin` → `live_status = 'walk_in'`
- **Client arrivé** → `POST /admin/tables/:id/seat` → `live_status = 'occupied'`
- **Libérer la table** → `POST /admin/tables/:id/free` → `live_status = 'free'`
- **Voir la résa** → ouvre un panneau latéral avec les détails
- **Annuler la résa** → `POST /admin/reservations/:id/cancel` → email client + `live_status = 'free'`

```ejs
<!-- views/reservation.ejs -->
<% tables.filter(t => t.zone === 'interieur').forEach(t => { %>
  <button
    class="table-btn <%= t.status %>"
    style="--x: <%= t.pos_x %>%; --y: <%= t.pos_y %>%"
    data-id="<%= t.id %>"
    data-seats="<%= t.seats %>"
    data-code="<%= t.code %>"
    <%= t.status !== 'free' ? 'disabled' : '' %>
  >
    <span><%= t.code %></span>
    <span><%= t.seats %>p</span>
  </button>
<% }) %>
```

### Drag & drop admin — Pointer Events obligatoires

```js
// public/js/admin-tables.js — CORRECT, fonctionne souris ET tactile
container.addEventListener('pointerdown', onDown)
container.addEventListener('pointermove', onMove)
container.addEventListener('pointerup', async (e) => {
  const rect = container.getBoundingClientRect()
  const pos_x = Math.min(97, Math.max(3, ((e.clientX - rect.left) / rect.width) * 100))
  const pos_y = Math.min(97, Math.max(3, ((e.clientY - rect.top) / rect.height) * 100))
  await fetch(`/admin/tables/${tableId}/position`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pos_x, pos_y })
  })
})
// INTERDIT : mousedown / mousemove / mouseup — ne fonctionnent pas sur tactile
```

---

## Logique de réservation

### Disponibilité — créneau de 2h
```js
// lib/dateUtils.js
function timesOverlap(startA, startB, durationMinutes = 120) {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const endA = toMin(startA) + durationMinutes
  const endB = toMin(startB) + durationMinutes
  return toMin(startA) < endB && toMin(startB) < endA
}
```

Une table est disponible si elle n'a pas de résa `confirmed` qui chevauche le créneau demandé ET que son `live_status = 'free'`.

### Horaires d'ouverture
```js
const OPENING_HOURS = {
  0: [],
  1: [{ start: '18:00', end: '22:00' }],
  2: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
  3: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
  4: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
  5: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
  6: [{ start: '12:00', end: '14:30' }, { start: '18:00', end: '22:00' }],
}
```

### Flux client (résa en ligne)
1. GET `/reservation` → affiche formulaire + plan de salle (tables `free` uniquement)
2. POST `/reservation` → validation (nom, email, téléphone obligatoires) + vérif dispo → INSERT `confirmed`, `source='online'` → email confirmation client + notification gérant → redirect confirmation

### Flux serveur (résa téléphone)
1. Client appelle → serveur ouvre `/admin/reservations`
2. Bouton **"+ Nouvelle résa"** → formulaire dans une modale :
   - Nom (obligatoire)
   - Couverts (obligatoire)
   - Date + heure (obligatoire)
   - Table (obligatoire — sélecteur avec dispo calculée)
   - Note interne (optionnel)
3. POST `/admin/reservations/create` → INSERT `confirmed`, `source='phone'` → pas d'email
4. La résa apparaît immédiatement dans la liste et sur le plan de salle

### Flux admin — plan de salle en temps réel
Le serveur gère le service directement depuis le plan de salle. Pas de validation, pas de formulaire.

**Clic sur une table → menu contextuel → action immédiate :**
- `POST /admin/tables/:id/walkin` → `live_status = 'walk_in'` (violet)
- `POST /admin/tables/:id/seat` → `live_status = 'occupied'` (rouge, client résa arrivé)
- `POST /admin/tables/:id/free` → `live_status = 'free'` (vert)
- `POST /admin/reservations/:id/cancel` → annule résa + email client si `source='online'` + libère la table

**Autres actions sur les réservations (depuis liste ou menu) :**
- Changer la table → `PUT /admin/reservations/:id/table`
- Modifier les détails (couverts, heure, nom) → `PUT /admin/reservations/:id`

### Walk-ins
Pas de réservation créée. Le serveur clique sur la table → **Walk-in** → table passe en violet.
Quand le client part → **Libérer la table** → table repasse en vert.
Aucune trace en base de données.

---

## Polling admin

Le dashboard admin rafraîchit toutes les **20 secondes** :
- Le **plan de salle** (live_status des tables + réservations du jour)
- La **liste des réservations** du jour

```js
// public/js/admin-poll.js
async function refreshDashboard() {
  // Rafraîchit le plan de salle
  const planRes = await fetch('/admin/floor-plan/fragment')
  document.getElementById('floor-plan-container').innerHTML = await planRes.text()

  // Rafraîchit la liste des réservations
  const listRes = await fetch('/admin/reservations/fragment')
  document.getElementById('reservations-list').innerHTML = await listRes.text()
}
setInterval(refreshDashboard, 20000)
```

```js
// Fragment plan de salle — retourne tables + statuts calculés
router.get('/admin/floor-plan/fragment', isAuth, async (req, res) => {
  const { rows: tables } = await pool.query('SELECT * FROM tables WHERE is_active = true')
  const { rows: resas } = await pool.query(
    "SELECT * FROM reservations WHERE date = CURRENT_DATE AND status = 'confirmed'"
  )
  res.render('partials/floor-plan', { tables, resas, today: new Date() })
})
```

---

## Interface admin — Réservations (`/admin/reservations`)

### Principe général
L'interface centrale est le **plan de salle**. Le serveur gère tout en cliquant sur les tables.
Pas de formulaire pour les walk-ins. Pas de validation pour les réservations en ligne.

### Plan de salle — interactions admin
Clic sur une table → menu contextuel selon le `live_status` :

| `live_status` + contexte | Menu affiché |
|---|---|
| `free`, pas de résa | **Walk-in** |
| `free`, résa à venir | **Walk-in** · **Voir la résa** |
| `upcoming` (résa, client pas encore là) | **Client arrivé** · **Voir la résa** · **Annuler** |
| `occupied` (client assis avec résa) | **Libérer la table** · **Voir la résa** |
| `walk_in` | **Libérer la table** |

### Actions depuis la liste des réservations
- **+ Nouvelle résa** → modale : nom, couverts, date, heure, table, note → INSERT `source='phone'`, pas d'email
- **Annuler** → `POST /admin/reservations/:id/cancel` → email client **uniquement si** `source='online'` + libère la table
- **Changer la table** → modale avec plan de salle miniature → `PUT /admin/reservations/:id/table`
- **Modifier** → couverts, heure, nom, note → `PUT /admin/reservations/:id`

### Badges visuels dans la liste
| Badge | Signification |
|---|---|
| 🌐 En ligne | `source = 'online'` |
| 📞 Téléphone | `source = 'phone'` |

### Couleurs plan de salle admin
| Statut | Couleur | Signification |
|---|---|---|
| `free` | `#22c55e` vert | Libre, personne |
| `upcoming` | `#f59e0b` orange | Résa confirmée, client pas encore arrivé |
| `occupied` | `#ef4444` rouge | Client assis (résa arrivée) |
| `walk_in` | `#a855f7` violet | Walk-in sur place |
| inactive | `#6b7280` gris | Table désactivée |

### Cas particuliers à gérer
- **Changer la table** : si la nouvelle table a une résa qui chevauche → bloquer + message d'erreur
- **Libérer** une table `occupied` : marque le créneau comme terminé (la table peut accepter une nouvelle résa plus tôt)
- **Annuler** une résa dont la table est `occupied` : demander confirmation ("le client est encore assis")

---

## Gestion de la terrasse

```js
router.post('/admin/settings/terrasse', isAuth, async (req, res) => {
  const { value } = req.body
  await pool.query("UPDATE settings SET value = $1 WHERE key = 'terrasse_active'", [value])
  res.redirect('/admin/tables')
})
```

---

## Dispositions du plan de salle

- **Sauvegarder** → POST `/admin/floor-plans` avec snapshot JSON des positions
- **Charger** → POST `/admin/floor-plans/:id/apply` → met à jour pos_x/pos_y de chaque table
- **Par défaut** → POST `/admin/floor-plans/:id/default`

---

## Emails — Brevo

```js
// lib/brevo.js
const SibApiV3Sdk = require('@getbrevo/brevo')
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
apiInstance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY

async function sendEmail({ to, subject, html }) {
  const mail = new SibApiV3Sdk.SendSmtpEmail()
  mail.sender      = { name: 'NATA Bar', email: 'noreply@natabar.be' }
  mail.to          = [{ email: to }]
  mail.subject     = subject
  mail.htmlContent = html
  return apiInstance.sendTransacEmail(mail)
}

module.exports = { sendEmail }
```

| Déclencheur | Destinataire |
|---|---|
| Résa en ligne soumise | Client (confirmation immédiate) + Gérant (notification) |
| Résa annulée par l'admin | Client **uniquement si** `source = 'online'` — jamais pour `source = 'phone'` |
| Devis soumis | Gérant |

---

## Interface admin — Actualités (`/admin/actualites`)

### Fonctionnalités
- **Créer / Modifier** : formulaire avec titre, contenu, `event_date` (optionnelle), statut publié/brouillon
- **Toggle épinglé** : `is_pinned` on/off directement depuis la liste — les articles épinglés apparaissent en premier côté public
- **Toggle publié/brouillon** : directement depuis la liste
- **Supprimer** : confirmation JS + suppression cascade des images
- **Upload images** : jusqu'à 10 photos par article (Multer, max 2 Mo chacune, JPG/PNG/WebP)
  - La première uploadée devient `is_main = true` automatiquement
  - L'admin peut changer la photo principale depuis la page d'édition
  - Les images sont stockées dans `public/uploads/`

### Affichage côté public (`/actualites`)
- Cartes avec photo principale, titre, date, badge "événement" si `event_date` renseignée
- Épinglés en haut avec un indicateur visuel
- Tri : `ORDER BY is_pinned DESC, event_date DESC NULLS LAST, created_at DESC`
- Événements passés et futurs tous visibles (pas de filtre par date)
- Clic sur une carte → page détail `/actualites/:id`

### Page détail (`/actualites/:id`)
- Photo principale en header
- Titre, date, contenu complet
- Galerie des photos supplémentaires (jusqu'à 9 photos en plus de la principale)

```bash
# .env — JAMAIS commité sur Git
DATABASE_URL=postgresql://user:password@host/dbname
SESSION_SECRET=une_chaine_aleatoire_longue
BREVO_API_KEY=
ADMIN_EMAIL=
SITE_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
```

---

## Design

| Élément | Valeur |
|---|---|
| Fond principal | `#12100e` |
| Fond cards / sections | `#1c1916` |
| Fond inputs / borders | `#252119` |
| Texte principal | `#ede0c4` (crème) |
| Texte secondaire | `#a89880` |
| Accent | `#e8621a` (orange flamme) |
| Titre font | Bebas Neue (Google Fonts) |
| Corps font | Manrope 400/500/700/800 (Google Fonts) |
| Texture | noise CSS sur le body |

### Couleurs plan de salle
| Statut | Couleur |
|---|---|
| Libre | `#22c55e` |
| En attente | `#f59e0b` |
| Réservée | `#ef4444` |
| Inactive | `#6b7280` |

### Variables CSS (`main.css`)
```css
:root {
  --bg-main:        #12100e;
  --bg-card:        #1c1916;
  --bg-input:       #252119;
  --text-primary:   #ede0c4;
  --text-secondary: #a89880;
  --accent:         #e8621a;
}
```

---

## Responsive

Mobile-first. Coder pour 375px d'abord.

```
375px  → mobile (base)
640px  → grand mobile
768px  → tablette (référence admin)
1024px → desktop
```

### Règles tactiles admin
- Touch targets ≥ 48×48px sur tous les boutons d'action
- Pointer Events pour tout drag & drop (jamais Mouse Events)
- Pas d'interactions hover-only
- Inputs hauteur minimum 48px

---

## Sécurité

- Jamais de credentials en dur
- Validation des inputs côté serveur sur chaque route POST
- Sessions httpOnly, sameSite strict
- Requêtes SQL paramétrées `$1, $2...` — jamais de concaténation de string

---

## État du projet

- [x] Setup repo Git + structure dossiers
- [x] Dépendances npm installées
- [ ] Phase 1 — server.js, db.js, auth, layout EJS de base
- [ ] Phase 2 — Pages publiques : Accueil, Menu, Événements, Actualités
- [ ] Phase 3 — Réservation : plan de salle CSS, formulaire, logique dispo
- [ ] Phase 4 — Admin : dashboard, réservations, tables, menu, actualités
- [ ] Phase 5 — Emails Brevo, SEO, RGPD
- [ ] Phase 6 — Déploiement Render, tests, mise en ligne
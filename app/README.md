# NATA Bar — Site web

Restaurant coréen à Louvain-la-Neuve. Next.js 14 + Supabase + Tailwind + Brevo.

## Démarrage

```bash
npm run dev        # http://localhost:3000
```

> ⚠️ Toujours utiliser `npm run dev`, pas `npx next dev`.

---

## Structure du projet

```
pages/                          ← Une page = un fichier = une URL
├── index.js                    → /
├── menu.js                     → /menu
├── evenements.js               → /evenements
├── actualites.js               → /actualites
├── reservation.js              → /reservation
├── login.js                    → /login
├── admin/                      ← Protégé par middleware.js (auth requise)
│   ├── index.js                → /admin
│   ├── reservations.js         → /admin/reservations
│   ├── tables.js               → /admin/tables
│   ├── menu.js                 → /admin/menu
│   └── actualites.js           → /admin/actualites
└── api/                        ← Routes back-end (jamais exécutées côté client)
    ├── reservations/
    │   ├── create.js           → POST /api/reservations/create
    │   ├── confirm.js          → POST /api/reservations/confirm
    │   └── cancel.js           → POST /api/reservations/cancel
    ├── tables/
    │   ├── index.js            → GET  /api/tables
    │   ├── update.js           → PUT  /api/tables/update
    │   ├── settings.js         → PUT  /api/tables/settings
    │   └── floor-plans.js      → GET/POST/PUT/DELETE /api/tables/floor-plans
    ├── menu/
    │   └── index.js            → GET/POST/PUT/DELETE /api/menu
    ├── actualites/
    │   └── index.js            → GET/POST/PUT/DELETE /api/actualites
    └── devis.js                → POST /api/devis

components/
├── layout/
│   ├── Header.jsx              ← Barre de navigation (toutes les pages publiques)
│   ├── Footer.jsx              ← Pied de page
│   └── AdminLayout.jsx         ← Wrapper pour toutes les pages /admin
├── reservation/                ← Composants du tunnel de réservation (Phase 3)
│   ├── FloorPlan.jsx
│   ├── TableButton.jsx
│   ├── DatePicker.jsx
│   ├── TimePicker.jsx
│   └── BookingForm.jsx
├── admin/                      ← Composants de l'interface admin (Phase 4)
│   ├── TableEditor.jsx
│   ├── ReservationCard.jsx
│   ├── Timeline.jsx
│   ├── MenuItemModal.jsx
│   └── ArticleForm.jsx
└── ui/                         ← Composants réutilisables (Phase 4)
    ├── Modal.jsx
    ├── Button.jsx
    └── Badge.jsx

lib/
├── supabase.js                 ← Client navigateur (pages + composants)
├── supabaseAdmin.js            ← Client service role (pages/api/ UNIQUEMENT)
├── brevo.js                    ← sendEmail() (pages/api/ UNIQUEMENT)
└── dateUtils.js                ← Horaires, créneaux, utilitaires dates

styles/
├── globals.css                 ← Variables CSS, reset, polices
└── floorplan.css               ← Styles du plan de salle

middleware.js                   ← Redirige /admin/* vers /login si non connecté
```

---

## JSX en 30 secondes

JSX = HTML avec `{}` pour le JavaScript. C'est tout.

```jsx
// HTML normal              →  JSX
// class="btn"              →  className="btn"
// <div style="color:red">  →  <div style={{ color: 'red' }}>
// <%= variable %>          →  {variable}
// <% if (ok) { %> ... <% } %> → {ok && <div>...</div>}
// <% list.forEach(item => { %> → {list.map(item => <div key={item.id}>...</div>)}
```

---

## Phases

| Phase | Contenu | État |
|---|---|---|
| 1 | Setup, layout global, lib | ✅ Fait |
| 2 | Pages statiques | 🔜 |
| 3 | Réservation (FloorPlan, créneaux) | 🔜 |
| 4 | Interface admin | 🔜 |
| 5 | Emails Brevo, SEO, RGPD | 🔜 |
| 6 | Tests + mise en ligne | 🔜 |

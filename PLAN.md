# PLAN — NATA Bar (septembre 2026)

Plan de travail validé avec le gérant. Les documents `CLAUDE.md` et `EXPLICATION.md`
ne reflètent pas l'état réel du code : ce fichier fait foi jusqu'à leur mise à jour
(dernière étape du plan).

Le site est **en production sur AlwaysData**. Toute modification de schéma doit rester
**additive** (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`) via
`ensureRuntimeSchema()` dans `lib/restaurantStore.js`.

---

## Décisions actées

| Sujet | Décision |
|---|---|
| Plan de salle client | Supprimé. L'admin garde le sien, intact. |
| Attribution des tables | Automatique, côté serveur. |
| Fusion de tables | Aucune, sauf deux tables de 2 voisines pour un groupe de 3 ou 4. |
| Voisinage des tables | Calculé à la volée depuis `pos_x` / `pos_y` en base, jamais codé en dur. |
| Groupe de 7 personnes et plus | Réservation enregistrée **en attente sans table**, l'admin assigne. |
| Groupe maximum | 18 personnes. |
| Zone d'attribution | Intérieur uniquement — jamais la terrasse. |
| Cuisine, midi | 12:00 → 14:00, lundi au samedi. |
| Cuisine, soir | 18:00 → 22:00, lundi au samedi. |
| Dimanche | Fermé toute la journée. |
| Bar | 12:00 → 01:00, **affichage seul**, ne génère aucun créneau. |
| Durée d'une réservation | 2 h partout (le code disait 2 h / 1 h 30 selon les endroits). |
| Dernier créneau du midi | 14:00, la table reste bloquée 2 h au-delà. |
| Présence client | Interrupteur réversible, position par défaut « venu ». |

Risque connu : le seuil de distance qui décide que deux tables sont accolables ne peut
pas être validé sans voir la salle. Il est isolé dans une constante unique, à ajuster
après un service réel.

---

## Chantier 1 — Archivage des statistiques (EN PREMIER)

**Pourquoi d'abord** : les réservations passées sont supprimées au bout d'un jour, les
annulées au bout de dix. Chaque jour sans agrégat est une donnée perdue définitivement.

- [x] Table d'agrégats journaliers créée dans `ensureRuntimeSchema()`
      (une ligne par date et par service : réservations, couverts, absences,
      annulations, répartition en ligne / téléphone).
- [x] Capture des agrégats déclenchée **avant** la suppression, dans
      `purgeOldReservations()`.
- [x] Supprimer la purge dupliquée écrite en dur dans `routes/admin.js`
      (route `GET /admin/reservations`) : elle supprime **sans** archiver.
- [x] Rattrapage au démarrage sur les réservations encore présentes en base.

## Chantier 2 — Horaires

Le service du midi est **désactivé dans le code**, pas seulement masqué
(`getOpeningServicesForDay` ne renvoie que le soir).

- [x] Module d'horaires unique, partagé serveur et front, en remplacement des
      quatre définitions éparpillées.
- [x] Créneaux : midi 12:00 → 14:00, soir 18:00 → 22:00, dimanche fermé.
- [x] Durée unifiée à 2 h (serveur, admin, emails).

Fichiers à corriger, tous vérifiés :

| Fichier | Contenu |
|---|---|
| `public/js/app.js` | créneaux client, créneaux admin, libellés de service |
| `views/partials/footer.ejs` | horaires affichés |
| `views/index.ejs` | bloc horaires + données structurées JSON-LD |
| `views/reservation.ejs` | phrase d'ouverture |
| `views/admin/dashboard.ejs` | titre de la vue service |
| `lib/reservationMailer.js` | durée annoncée dans les deux emails |

## Chantier 3 — Interrupteur de présence

Le bouton actuel est irréversible : `markNoShow()` écrit une valeur fixe et le bouton
disparaît ensuite.

- [x] `markNoShow()` accepte une valeur booléenne.
- [x] Route `PATCH /admin/api/reservations/:id/no-show` idem.
- [x] Interrupteur (et non plus bouton) dans `views/admin/reservations.ejs` **et**
      dans la liste rendue par `public/js/app.js`.
- [x] Vérifier l'effet de bord existant : une absence libère la table dans les calculs
      de conflit, donc revenir en arrière doit la re-bloquer.

## Chantier 4 — Attribution automatique des tables

**Retrait côté client** : champ Table de `views/reservation.ejs`, modale de plan et
champs cachés associés dans `public/js/app.js`. Ne pas toucher au plan de salle admin,
qui partage les fonctions de bas niveau (`getTableUnits`, `isTableBooked`).

**Nouveau module d'attribution**, appelé dans `createReservation()` à l'intérieur de la
transaction existante :

1. Lister les tables libres sur le créneau (logique de conflit déjà écrite).
2. Choisir la **plus petite** table seule qui accueille le groupe, à l'intérieur.
   La terrasse est exclue de l'attribution.
3. Pour 3 ou 4 personnes sans table de 4 libre : deux tables de 2 voisines, voisinage
   calculé depuis les positions réelles en base.
4. Au-delà de 6 personnes, ou si rien n'est libre : enregistrer **en attente sans
   table**.

- [x] Plafond porté de 10 à 18 personnes aux trois endroits qui le limitent
      (validation serveur, validation client, attribut du champ du formulaire).
- [x] Page admin : signaler les demandes sans table et permettre d'en assigner une
      avant confirmation.

## Chantier 5 — Onglet statistiques

- [x] Nouvelle page admin + entrée dans `views/partials/admin-topbar.ejs`.
- [x] Lecture des agrégats du chantier 1.
- [x] Totaux par semaine, par mois, par an ; couverts ; taux d'absence ;
      répartition midi / soir ; comparaison avec la période précédente.

## Chantier 6 — Documentation

- [x] Mettre `CLAUDE.md` et `EXPLICATION.md` en accord avec le code réel.

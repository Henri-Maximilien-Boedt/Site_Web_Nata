# Description détaillée des pages — NATA Bar

## 1. `/` — Accueil

### Objectif
Page de présentation principale du restaurant, conçue pour accrocher le visiteur et le guider vers les actions principales : réserver une table ou consulter le menu.

### Sections

#### Header Sticky
- **Position** : fixe en haut de la page (`position: sticky`)
- **Contenu** : 
  - Logo "NATA" à gauche (style Bebas Neue, couleur accent orange)
  - Navigation centrale (desktop) : Accueil, Menu, Événements, Actualités
  - Bouton "Réserver" sur la droite (accent)
  - Menu hamburger sur mobile (apparaît < 768px)
- **Comportement mobile** : Menu hamburger déroulant au tap
- **Style** : Arrière-plan semi-transparent avec backdrop-filter blur

#### Section Hero (Full-screen)
- **Dimensions** : 100vh (page entière)
- **Fond** : Gradient sombre avec overlay dégradé (vaguement restaurant/nourriture)
- **Contenu centré** :
  - Titre "NATA" (très gros, Bebas Neue, orange)
  - Sous-titre "Korean Food & Bar · Louvain-la-Neuve" (gris secondaire)
  - 2 boutons CTA :
    1. "Réserver une table" (primaire, orange)
    2. "Voir le menu" (secondaire, border orange)
- **Mobile** : Texte adapté, boutons full-width empilés verticalement
- **Desktop** : Boutons côte-à-côte

#### Section "Vos Événements"
- **Titre** : "Vos Événements" (Bebas Neue, all-caps)
- **Layout** :
  - Mobile : 1 colonne
  - Tablette/Desktop : 2 colonnes
- **Cartes** :
  1. **Food Truck** : Emoji 🚚, titre, description courte, bouton "Demander un devis"
  2. **Privatisation** : Emoji 🍽️, titre, description courte, bouton "Demander un devis"
- **Style des cartes** : Fond légèrement contrasté (`--bg-card`), border fine, padding confortable

#### Section "Actualités Récentes"
- **Titre** : "Actualités Récentes"
- **Layout** :
  - Mobile : 1 colonne
  - Tablette/Desktop : 3 colonnes
- **Cartes d'articles** (jusqu'à 3 derniers) :
  - Zone image placeholders (200px de hauteur, emoji 📸)
  - Métadonnée date (gris secondaire, petit)
  - Titre article (Bebas Neue, uppercase)
  - Description (2-3 lignes, gris secondaire)
  - Lien "Lire plus →" (orange, interactif)
- **Hover** : Légère elevation surlignée (`transform: translateY(-4px)`)

#### Section "Plus de l'Univers NATA"
- **Présentation** : Bloc unique centré
- **Contenu** :
  - Titre
  - Texte court de présentation
  - Lien "Visiter notre réseau →" (orange)
- **Style** : Fond card, border, padding

#### Footer
- **Layout** :
  - Mobile : 1 colonne (adresse, horaires, réseaux)
  - Desktop : 3 colonnes
- **Sections** :
  1. **Adresse** : Rue, code postal, pays
  2. **Horaires** : Tableau des jours/heures (Lun fermé soir uniquement, Mar-Sam full, Dim fermé)
  3. **Réseaux sociaux** : 3 boutons circulaires (Facebook, Twitter, Instagram) avec hover color
- **Footer bottom** : 
  - Liens : Mentions légales, Politique de confidentialité, Admin
  - Copyright
  - Layout : espaced-between sur desktop, column sur mobile

### Interactions et comportements

- **Scroll lisse** : Utilisation de `scrollIntoView({ behavior: 'smooth' })` pour les ancres
- **Menu mobile** : Tap sur hamburger → déroulement du menu. Tap sur lien → fermeture du menu
- **Hover des boutons** : Légère effet opacity (0.9)
- **Hover des liens** : Couleur plus claire (#ff7a38)

### Design responsive

| Breakpoint | Base | `sm:` | `md:` | `lg:` |
|---|---|---|---|---|
| Viewport | 375px | 640px | 768px | 1024px |
| Events | 1 col | 1 col | 2 col | 2 col |
| Articles | 1 col | 1 col | 3 col | 3 col |
| Footer | 1 col | 1 col | 3 col | 3 col |
| Buttons (hero) | Stack vertical | Stack vertical | Côte-à-côte | Côte-à-côte |

### Couleurs et typo appliquées

- **Fond** : `#12100e` (`--bg-main`)
- **Cards** : `#1c1916` (`--bg-card`)
- **Texte principal** : `#ede0c4` (`--text-primary`)
- **Texte secondaire** : `#a89880` (`--text-secondary`)
- **Accent (orange)** : `#e8621a` (`--accent`)
- **Titres** : Bebas Neue, uppercase, letter-spacing
- **Corps** : Manrope 400/500/700
- **Effet noise** : Subtle overlay SVG noise

### Notes techniques

- HTML5 sémantique (header, footer, section, article, nav)
- CSS Grid et Flexbox pour le layout
- `position: absolute` + variables CSS pour le positionnement adaptatif
- Aucune dépendance JS externe (vanilla JS pour menu + smooth scroll)
- Mobile-first CSS media queries

---

## 2. `/menu` — Menu / Carte

### Objectif
Afficher le menu complet du restaurant par catégories et sous-catégories avec descriptions, prix et tags (vegan, sans gluten, épicé).

### Structure

#### Header
Identique à la page d'accueil (sticky, navigation, logo).

#### Contenu Principal
- **Titre** : "Notre Menu" (Bebas Neue, uppercase)
- **Layout** : Scroll vertical classique, pas de sticky navigation dans la page
- **Catégories principales** (sections bordeaux accent) :
  1. Entrées (tteokbokki, gyoza, edamame, pajeon)
  2. Plats Principaux (viande, poisson, végétal)
  3. Desserts (bingsu, hotteok)
  4. Boissons (cocktails classiques, signature, bières, softs)

#### Composition d'un Plat
```
[Nom du plat] .................. [Prix €]
Description du plat
[Tag] [Tag] [Tag]
```

- **Nom** : Bebas Neue, uppercase
- **Description** : Gris secondaire, italic ou normal
- **Prix** : Couleur accent, bold
- **Tags** : Petit badge arrière-plan dégradé accent + texte accent
- **Card** : Border-left accent (4px)

#### Résponsivement
- Mobile : 1 colonne de plats
- Tablette/Desktop : 2 colonnes

#### CSS Spécifique
- `.menu-items` grid-columns
- `.menu-item` avec `.item-header` flex justify-between
- `.item-tags` flex wrap gap
- `.tag` avec background rgba(accent, 0.15)

---

## 3. `/evenements` — Événements

### Objectif
Présenter les deux offres d'événements (Food Truck et Privatisation) avec descriptions et formulaires de devis.

### Sections

#### 1. **Food Truck**
- **Header** : Emoji 🚚, titre "Food Truck", accent border-bottom
- **Description** : Texte accrocheur (cuisine coréenne authentique sur site)
- **"Comment ça marche ?"** : Bloc numéroté (1→2→3→4) avec counter CSS
- **Formulaire Devis** :
  - Nom, Email, Téléphone (optionnel), Date, Nombre de personnes, Message
  - Bouton submit (accent color)
  - Submit → alerte "Devis envoyé ! Nous vous contacterons bientôt."

#### 2. **Privatisation**
- Même structure que Food Truck
- Description salle + capacité (jusqu'à 40 personnes)
- Formulaire identique + select "Type d'événement" (anniversaire, business, famille, mariage, autre)

#### Layout
- Mobile : 1 colonne stack vertical
- Desktop : 2 colonnes côte-à-côte (150% gutter)
- Chaque section : `.event-section` (card bg-card, border)

#### Styles
- `.event-header` gradient accent 0-20%
- `.how-it-works` bloc accentué avec border-left accent + counter
- `.form-container` bg-card avec padding
- Inputs : bg-input, border #a89880 opacity 0.3

---

## 4. `/actualites` — Liste des Actualités

### Objectif
Afficher les articles triés en trois catégories : Épinglés, À venir, Passés.

### Structure

#### Vue en Catégories
```
📌 Épinglés
[Card 1 - Featured, grid-column: 1/-1]

📅 À venir
[Card 2]  [Card 3]

📖 Articles Passés
[Card 4]  [Card 5]  [Card 6]  [Card 7]
```

#### Carte Article Standard
- **Image** : Placeholder 200px (emoji)
- **Métadonnée** : Date (gris secondaire petit)
- **Type** : Badge badge-accent (article, événement, recette, etc.)
- **Titre** : Bebas Neue uppercase
- **Extraire** : 2-3 lignes description gris secondaire
- **Lien** : "Lire plus →" (accent, hover couleur plus claire)
- **Hover** : `transform: translateY(-4px)`, slight shadow

#### Carte Épinglée (Featured)
- `.article-card.featured`
- `border: 2px solid var(--accent)`
- Grid 2 colonnes : [image | content] (desktop)
- Contenu centré / padded davantage

#### Responsive
- Mobile : 1 colonne pour toutes catégories
- Tablette/Desktop : 2 col (featured = full width)

---

## 5. `/actualites/:id` — Détail Article

### Objectif
Affichage complet d'un article avec photo hero, contenu, galerie, articles connexes.

### Sections

#### Photo Hero
- Full-width, 250px height (mobile), 400px (desktop)
- Placeholder emoji 📸
- Gradient overlay accent

#### Contenu Article
```
← Retour aux actualités

[Meta: date, type badge]
Titre complet
Sous-titre
---
Contenu long avec h3, h4, ul, ol, p
Quote / bloc accentué
---
Galerie (9 photos max en plus de la principale)
---
Articles connexes (2-3 cartes thumbnail)
```

#### Galerie
- `.gallery-grid` 2 col (mobile) → 3 col (desktop)
- Chaque item : 150px square, hover scale 1.05

#### Articles Connexes
- `.related-grid` : grid 2 col
- `.related-card` : grid [80px thumb | info]
- Clickable, hover background tint

---

## 6. `/reservation` — Réservation

### Objectif
Parcours guidé en 5 étapes pour réserver une table (couverts → date → créneau → table → formulaire).

### Étapes

#### Stepper Visual
```
1. Couverts → 2. Date → 3. Créneau → 4. Table → 5. Formulaire
   [circle]      [circle]    [circle]     [circle]   [circle]
```

- `.step` active = accent color + border
- `.step` completed = green color (✓)
- `.step-connector` horizontal line between (gris)

#### Step 1: Couverts
- Input number min=1 max=20
- Bouton "Continuer"

#### Step 2: Date
- Input date (datepicker)
- Boutons "Retour" + "Continuer"

#### Step 3: Créneau
- Select dropdown : "12:00-14:30 (Midi)" | "18:00-22:00 (Soir)"
- Boutons navigation

#### Step 4: Plan de Salle
- **Intérieur** : `.floor-plan` (CSS pur layout)
  - Tables: green=free, orange=pending, red=reserved, gray=too small
- **Terrasse** : Bloc séparé (masquable ultérieurement)
- Légende couleurs
- Info sélection : "Table choisie: T-3"
- Bouton "Continuer" disabled jusqu'à sélection

#### Step 5: Formulaire
- Nom, Email, Téléphone (opt), Message (opt)
- Bouton "Confirmer la réservation"
- Submit → alert "Réservation confirmée !"

#### Flexibilité
- `.step-content` class, `.active` visibility
- JS vanilla : `nextStep()` / `prevStep()`

---

## 7. `/login` — Connexion Admin

### Objectif
Page simple et centrée pour authentifier l'administrateur.

### Layout

#### Centré Verticalement + Horizontalement
```
[Logo NATA] (grand, accent color)
[Subtitle: Espace Admin]

[Input Email]
[Input Password]
[Bouton Connexion]
[Lien Retour au site]
```

#### Validation
- Email: `admin@natabar.be`
- Password: `password` (prototype uniquement)
- Succès → redirection `/admin/index.html`
- Erreur → `.error-message` bloc rouge affichant "Email ou mot de passe incorrect."

#### Style
- Max-width 400px
- `.login-container` : bg-card, centrée, padding
- Inputs : bg-input, border gris
- Focus state : border accent + subtle glow

---

## 8. `/admin` — Dashboard

### Objectif
Vue d'ensemble de l'état du restaurant (réservations, tables, statistiques).

### Layout

#### Sidebar Fixe (Gauche)
```
Logo NATA
📊 Dashboard [active]
📋 Réservations
🪑 Tables
🍽️ Menu
📰 Actualités
[Spacer]
🚪 Déconnexion [border]
```

- Position fixed (desktop) / collapsible (mobile)
- Liens hover → accent bg + white text
- Responsive: 250px desktop, collapsible mobile

#### Contenu Principal
- **Grid de statistiques** 4 cartes :
  1. Réservations Aujourd'hui (5)
  2. En Attente (2)
  3. Tables Occupées (7/12)
  4. Taux Occupation (58%)
  
- **Aperçu Plan de Salle** :
  - Toggle "Terrasse active"
  - Plans intérieur + terrasse (preview, pas drag)
  - Lien "Éditer" vers `/admin/tables`
  
- **Dernières Réservations** (tableau):
  - Nom, Date/Heure, Couverts, Table, Statut, Actions
  - Statuts: pending (orange), confirmed (vert), cancelled (rouge)
  - Boutons Valider / Annuler (entrelacés avec la réservation)

#### Style Admin
- Fond blanc (#fff) / gris clair (#f5f5f5)
- Couleurs accent sans les teintes sombres du site
- Typographie lisible (Manrope, sans serif)
- Cards avec border #e0e0e0

---

## 9. `/admin/reservations` — Gestion Réservations

### Objectif
Liste complète et filtrable de toutes les réservations avec actions (valider/annuler).

### Filtres (En-tête)
- **Date** : date input
- **Statut** : select (Tous, En attente, Confirmée, Annulée)
- **Nom** : text input search

### Tableau Réservations
```
| Nom | Email | Téléphone | Date/Heure | Couverts | Table(s) | Statut | Actions |
```

- Statuts color-badge
- Actions : boutons Valider (vert) / Annuler (rouge)
- Hover ligne : légère teinte grise
- Scroll horizontal sur mobile

### Comportement
- Valider → "Réservation confirmée ! Email envoyé au client."
- Annuler → "Réservation annulée ! Email confirmé."

---

## 10. `/admin/tables` — Éditeur Plan de Salle

### Objectif
Drag & drop pour repositionner les tables, gérer la terrasse, sauvegarder/charger dispositions.

### Contrôles (En-haut)
- Toggle "Terrasse active" (switch)
- Bouton "Sauvegarder Disposition"
- Bouton "Ajouter Table"

### Plans Éditables
- **Intérieur** : Grid 6 colonnes, tables draggable
- **Terrasse** : Grid 6 colonnes, masquable avec toggle
- Tables colors : green=free, red=reserved, orange=pending
- Drag & drop : `dragstart` / `dragend`, visual feedback opacity
- Click table → sélection (border accent)

### Ajout Table (Form)
```
Code table: [input] ex: T-7
Nombre places: [number] ex: 4
Zone: [select] Intérieur | Terrasse
[Bouton Créer]
```

### Dispositions Sauvegardées
- Cards : "Normal", "Événement", "Hiver"
- Actions par card : Charger, Supprimer
- Disposition "par défaut" rechargée au démarrage

---

## 11. `/admin/menu` — Gestion Menu

### Objectif
Lister les plats par catégories, toggle disponibilité, ajouter/modifier/supprimer des plats.

### Layout

#### Titrе + Bouton
```
Gestion du Menu          [➕ Nouveau plat]
```

#### Catégories (Sections)
```
Entrées [bg-accent header]
├─ Tteokbokki | [Toggle ON] | [Modifier] [Suppr]
├─ Edamame    | [Toggle OFF] | [Modifier] [Suppr]

Plats Principaux
├─ Bulgogi | [Toggle ON] | [Modifier] [Suppr]
...
```

- Card `.category-section` white bg
- Header category bg-accent
- Items `.menu-item` : grid [info | actions]
- Toggle : switch on/off (immediate fetch, no reload)
- Boutons : Modifier (bleu) / Suppr (rouge)

### Modal/Form (non montré, déclaré dans desc)
- Créer/Modifier : Titre, Description, Prix, Tags (multi-select), Catégorie, Sous-cat, Disponibilité
- Upload image (iconique, pas d'affichage ici mais structuré)

---

## 12. `/admin/actualites` — Gestion Actualités

### Objectif
Lister tous les articles avec statuts (publié/brouillon/épinglé) et actions rapides.

### Tableau Actualités
```
| Titre | Date | Publié [Toggle] | Épinglé [Toggle] | Actions |
```

- Titre clickable ?, date sous-titre gris
- Publié toggle : quick state change (no modal)
- Épinglé toggle : star/pin visual feedback
- Actions : Modifier (bleu) / Supprimer (rouge)

### Statuts Visuels
- Publié: vert (#22c55e) / Brouillon: gris (#6b7280)
- Épinglé: orange accent border + badge

### Modal/Form (non montré)
- Créer/Modifier : Titre, Contenu (WYSIWYG), Date événement (opt), Upload jusqu'à 10 photos (carousel), Choix photo principale, Toggle publié/brouillon/épinglé

---

## Synthèse Responsive

| Breakpoint | Usage | Layout Changes |
|---|---|---|
| 375px | Mobile de base | 1 col, full-width, hamburger menu |
| 640px | Grand mobile | Inputs plus larges |
| 768px | Tablette (référence admin) | 2 col pour articles, admin sidebar visible |
| 1024px | Desktop | 3-4 col, spacing élargi |

### Touches Essentielles

1. **Mobile-first** : Toujours coder base mobile, puis `@media (min-width: 768px)` pour breakpoints
2. **Admin interface** : Fond blanc, haute lisibilité, pas d'effet sombre
3. **Drag & drop Pointer Events** : `onPointerDown/Move/Up` pas `onMouse*` (tactile)
4. **Validation serveur** : JS prototype uniquement, backend validera
5. **Accessibility** : Labels liés, inputs min 48px touch targets, contraste WCAG
6. **SEO** : Meta tags, structure HTML5 sémantique, sitemap futur

---

**Fin de description. À adapter selon stack technique final (Express/EJS/PostgreSQL).**


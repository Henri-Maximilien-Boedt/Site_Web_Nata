# 🍜 NATA Bar — Documentation Complète

## 📋 Table des matières

1. [Vue d'ensemble](#-vue-densemble)
2. [Architecture technique](#-architecture-technique)
3. [Installation](#-installation)
4. [Lancer le serveur](#-lancer-le-serveur)
5. [Structure du projet](#-structure-du-projet)
6. [Base de données](#-base-de-données)
7. [Authentification](#-authentification)
8. [Pages et routes](#-pages-et-routes)
9. [Admin Dashboard](#-admin-dashboard)

---

## 🎯 Vue d'ensemble

**NATA Bar** est un site web complet pour un restaurant coréen situé à Louvain-la-Neuve (Belgique).

### Fonctionnalités principales :
- ✅ Site public (accueil, menu, événements, actualités)
- ✅ Système de réservations en ligne
- ✅ Admin dashboard (gestion des réservations, tables, menu, actualités)
- ✅ Authentification sécurisée
- ✅ Emails transactionnels (Brevo)
- ✅ Plan de salle interactif

---

## 🔧 Architecture technique

```
Stack Frontend        Stack Backend           Base de données
├─ HTML5             ├─ Express.js 4.x       ├─ PostgreSQL 15
├─ CSS3 (Grid)       ├─ EJS templating       ├─ pg driver
└─ Vanilla JS        ├─ Sessions (express)   └─ 10 tables
                     ├─ bcrypt (auth)        
                     ├─ Multer (uploads)     
                     └─ Brevo (emails)       
```

### Stack complet :
- **Runtime** : Node.js 18+
- **Framework web** : Express.js 4.x
- **Template engine** : EJS 3.x
- **Base de données** : PostgreSQL 15
- **Sessions** : express-session + connect-pg-simple
- **Authentification** : bcrypt (hachage des mots de passe)
- **Emails** : @getbrevo/brevo (Sendinblue API)
- **Upload fichiers** : multer

---

## 🚀 Installation

### Prérequis
- Node.js 18+ installé
- PostgreSQL 15 installé (Mac: via Homebrew)
- Un terminal

### Étapes d'installation

```bash
# 1. Naviguer dans le dossier app
cd /Users/henrimaximilienboedt/Documents/Perso/Projects/Site_Web_Nata/app

# 2. Installer les dépendances npm
npm install

# 3. Créer la base de données (une seule fois)
createdb nata_bar

# 4. Charger le schéma SQL
psql nata_bar < db/schema.sql

# 5. Créer un admin (une seule fois)
node db/create-admin.js gerant@natabar.be Password123!
```
# woula jai eu des problemes de connection mtn le mdp cest  admin123
---

## ⚡ Lancer le serveur

### Méthode simple
```bash
cd /Users/henrimaximilienboedt/Documents/Perso/Projects/Site_Web_Nata/app
npm start
```

Vous verrez :
```
✓ NATA Bar server lancé sur http://localhost:3000
✓ Environnement : development
```

### Accès
- **Site public** : http://localhost:3000
- **Page login** : http://localhost:3000/login
- **Admin** : http://localhost:3000/admin (après connexion)

### Identifiants admin
```
Email : gerant@natabar.be
Mot de passe : Password123!
```

### Arrêter le serveur
```bash
# Dans le terminal où tourne le serveur
Ctrl + C
```

---

## 📁 Structure du projet

```
app/
├── server.js                       # Point d'entrée Express
├── db.js                          # Pool PostgreSQL
├── package.json                   # Dépendances npm
├── .env                           # Variables d'environnement
│
├── db/
│   ├── schema.sql                 # Schéma PostgreSQL (10 tables)
│   └── create-admin.js            # Script création admin
│
├── routes/                        # Routeurs Express
│   ├── index.js                   # GET / (accueil)
│   ├── menu.js                    # GET /menu
│   ├── evenements.js              # GET /evenements
│   ├── actualites.js              # GET /actualites
│   ├── reservation.js             # GET /reservation + POST
│   └── admin.js                   # Toutes routes /admin/*
│
├── middleware/
│   ├── auth.js                    # Vérification authentification
│   └── upload.js                  # Config Multer
│
├── views/                         # Templates EJS
│   ├── index.ejs                  # Accueil
│   ├── menu.ejs                   # Menu
│   ├── evenements.ejs             # Événements
│   ├── actualites.ejs             # Actualités (liste)
│   ├── reservation.ejs            # Réservations
│   ├── login.ejs                  # Login admin
│   ├── 404.ejs                    # Page 404
│   ├── error.ejs                  # Page erreur
│   ├── partials/
│   │   ├── header.ejs             # Header sticky
│   │   ├── footer.ejs             # Footer
│   │   └── admin-sidebar.ejs      # Sidebar admin
│   └── admin/
│       ├── dashboard.ejs          # Tableau de bord
│       ├── reservations.ejs       # Gestion réservations
│       ├── tables.ejs             # Gestion tables/plan
│       ├── menu.ejs               # Gestion menu
│       └── actualites.ejs         # Gestion actualités
│
├── public/                        # Fichiers statiques
│   ├── css/
│   │   ├── main.css               # Styles principaux
│   │   └── floorplan.css          # Styles plan de salle
│   ├── js/                        # Scripts côté client
│   └── uploads/                   # Images téléchargées
│
└── lib/
    ├── brevo.js                   # Envoi emails
    └── dateUtils.js               # Utilitaires dates
```

---

## 🗄️ Base de données

PostgreSQL avec 10 tables :

### 1. `session` (express-session)
Stockage des sessions utilisateur authentifiées.

### 2. `tables`
Toutes les tables du restaurant (intérieur + terrasse).
```sql
id | code | seats | zone | pos_x | pos_y | is_active | live_status | created_at
```

### 3. `reservations`
Toutes les réservations clients.
```sql
id | table_id | date | time_start | covers | name | email | phone | message | source | status | created_at
```

### 4. `menu_items`
Articles du menu (entrées, plats, desserts, boissons).
```sql
id | category | subcategory | name | description | price | tags | is_available | sort_order | created_at
```

### 5. `news_posts`
Articles d'actualités et événements.
```sql
id | title | content | event_date | is_published | is_pinned | created_at
```

### 6. `news_images`
Images associées aux actualités.
```sql
id | post_id | url | is_main | sort_order
```

### 7. `quote_requests`
Demandes de devis (privatisations, food truck).
```sql
id | type | event_date | guests | name | email | phone | message | created_at
```

### 8. `settings`
Configuration globale du site.
```sql
key | value
```
Exemple : `terrasse_active | true/false`

### 9. `floor_plans`
Snapshots sauvegardés du plan de salle.
```sql
id | name | layout | is_default | created_at
```

### 10. `admin_users`
Comptes administrateurs.
```sql
id | email | password_hash | created_at
```

---

## 🔐 Authentification

### Fonctionnement

1. **Login** (`POST /admin/login`)
   - Email + mot de passe
   - Vérification en base de données
   - bcrypt compare du mot de passe hasé
   - Création de session si OK

2. **Session**
   - Sauvegardée dans PostgreSQL
   - Durée : 24 heures
   - Cookie httpOnly (sécurisé)

3. **Middleware de protection** (`middleware/auth.js`)
   - Vérifie `req.session.admin`
   - Redirige vers `/login` si pas authentifié

### Identifiants
```
Email : gerant@natabar.be
Mot de passe : Password123!
Hash bcrypt : $2b$12$dL00jcm2VbRsH8zdXrYo0OFWz0xwmYDul17JEs2Meqs5KLisdneuu
```

### Changer le mot de passe

```bash
# Dans le terminal
cd /Users/henrimaximilienboedt/Documents/Perso/Projects/Site_Web_Nata/app
node db/create-admin.js gerant@natabar.be NOUVEAU_MOT_DE_PASSE
```

---

## 🌐 Pages et routes

### 📄 Pages publiques

| URL | Description | Fichier |
|-----|-------------|---------|
| `/` | Accueil | views/index.ejs |
| `/menu` | Menu complet | views/menu.ejs |
| `/evenements` | Food truck + privatisations | views/evenements.ejs |
| `/actualites` | Articles et événements | views/actualites.ejs |
| `/actualites/:id` | Détail article | (à créer) |
| `/reservation` | Réserver une table | views/reservation.ejs |

### 🔒 Pages admin (protégées)

| URL | Description | Fichier |
|-----|-------------|---------|
| `/login` → `/admin/login` | Login | views/login.ejs |
| `/admin` | Tableau de bord | views/admin/dashboard.ejs |
| `/admin/reservations` | Gestion réservations | views/admin/reservations.ejs |
| `/admin/tables` | Gestion plan de salle | views/admin/tables.ejs |
| `/admin/menu` | Gestion menu | views/admin/menu.ejs |
| `/admin/actualites` | Gestion actualités | views/admin/actualites.ejs |
| `/admin/logout` | Déconnexion | Détruit session |

---

## 📊 Admin Dashboard

### Tableau de bord
Affiche 4 cartes avec statistiques (actuellement en dur, à rendre dynamiques) :
- Réservations aujourd'hui
- Tables disponibles
- Demandes de devis
- Actualités publiées

### Sous-sections

#### 1️⃣ Plan de salle
- Intérieur + Terrasse
- Tables positionnées en CSS
- Statuts : libre (vert), réservé (rouge), occupé (orange), walk-in (violet)

#### 2️⃣ Réservations
- Liste des réservations du jour
- Filtres par statut
- Actions : voir, éditer, annuler

#### 3️⃣ Tables
- Drag & drop pour repositionner
- Activation/désactivation
- Sauvegarde des dispositions

#### 4️⃣ Menu
- Activation/désactivation par article
- Réordonnancement
- Édition prix

#### 5️⃣ Actualités
- Créer/éditer/supprimer
- Upload images (jusqu'à 10)
- Publier/brouillon
- Épingler article

---

## 🎨 Design

### Couleurs
```css
--bg-main:        #12100e   (charcoal)
--bg-card:        #1c1916   (lighter charcoal)
--bg-input:       #252119   (input backgrounds)
--text-primary:   #ede0c4   (cream)
--text-secondary: #a89880   (taupe)
--accent:         #e8621a   (orange)
```

### Typographie
- **Headers** : Bebas Neue (Google Fonts)
- **Body** : Manrope 400/500/700/800 (Google Fonts)

### Responsive
- 375px : mobile
- 640px : grand mobile
- 768px : tablet
- 1024px : desktop

---

## 📝 Variables d'environnement (.env)

```env
# Base de données
DATABASE_URL=postgresql://localhost/nata_bar

# Sessions
SESSION_SECRET=une_chaine_aleatoire_longue

# Emails Brevo
BREVO_API_KEY=votre_cle_api

# Configuration
ADMIN_EMAIL=admin@natabar.be
SITE_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
```

---

## 🐛 Troubleshooting

### "Port 3000 already in use"
```bash
# Trouver le processus
lsof -i :3000

# Tuer le processus (remplacer PID)
kill -9 PID
```

### "Cannot find module 'pg'"
```bash
# Réinstaller les dépendances
npm install
```

### "Database does not exist"
```bash
# Créer la base de données
createdb nata_bar

# Charger le schéma
psql nata_bar < db/schema.sql
```

### "Identifiants incorrects"
```bash
# Réinitialiser le mot de passe admin
node db/create-admin.js gerant@natabar.be Password123!
```

---

## 📚 Prochaines étapes

- [ ] Rendre les stats du dashboard dynamiques
- [ ] Implémenter les API de réservation
- [ ] Implémenter les API d'actualités
- [ ] Intégration Brevo pour les emails
- [ ] Upload et galerie d'images
- [ ] Plan de salle avec drag & drop
- [ ] Tests unitaires
- [ ] Déploiement sur Render

---

## 📞 Contact & Support

**Restaurant NATA Bar**
- Adresse : Rue de Brabant 10, Louvain-la-Neuve
- Téléphone : À définir
- Email : contact@natabar.be
- Instagram : @natabar_lln

---

**Dernière mise à jour** : 8 mars 2026

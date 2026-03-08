-- ============================================================
-- NATA Bar — Schéma PostgreSQL
-- Exécuter une seule fois sur la base de données
-- ============================================================

-- Table de sessions (connect-pg-simple)
CREATE TABLE IF NOT EXISTS "session" (
  "sid"    varchar NOT NULL COLLATE "default",
  "sess"   json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- ============================================================

CREATE TABLE IF NOT EXISTS tables (
  id          serial PRIMARY KEY,
  code        text NOT NULL,
  seats       integer NOT NULL,
  zone        text NOT NULL CHECK (zone IN ('interieur', 'terrasse')),
  pos_x       numeric NOT NULL DEFAULT 50,
  pos_y       numeric NOT NULL DEFAULT 50,
  is_active   boolean DEFAULT true,
  live_status text DEFAULT 'free' CHECK (live_status IN ('free', 'walk_in', 'occupied')),
  created_at  timestamptz DEFAULT now()
);

-- ============================================================

CREATE TABLE IF NOT EXISTS reservations (
  id         serial PRIMARY KEY,
  table_id   integer REFERENCES tables(id) ON DELETE SET NULL,
  date       date NOT NULL,
  time_start time NOT NULL,
  covers     integer NOT NULL,
  name       text NOT NULL,
  email      text,
  phone      text,
  message    text,
  source     text DEFAULT 'online' CHECK (source IN ('online', 'phone')),
  status     text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- ============================================================

CREATE TABLE IF NOT EXISTS menu_items (
  id           serial PRIMARY KEY,
  category     text NOT NULL CHECK (category IN ('entrees', 'plats', 'desserts', 'boissons')),
  subcategory  text,
  name         text NOT NULL,
  description  text,
  price        numeric(6,2),
  tags         text[] DEFAULT '{}',
  is_available boolean DEFAULT true,
  sort_order   integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================

CREATE TABLE IF NOT EXISTS news_posts (
  id           serial PRIMARY KEY,
  title        text NOT NULL,
  content      text,
  event_date   date,
  is_published boolean DEFAULT false,
  is_pinned    boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================

CREATE TABLE IF NOT EXISTS news_images (
  id         serial PRIMARY KEY,
  post_id    integer NOT NULL REFERENCES news_posts(id) ON DELETE CASCADE,
  url        text NOT NULL,
  is_main    boolean DEFAULT false,
  sort_order integer DEFAULT 0
);

-- ============================================================

CREATE TABLE IF NOT EXISTS quote_requests (
  id         serial PRIMARY KEY,
  type       text CHECK (type IN ('privatisation', 'food_truck')),
  event_date date,
  guests     integer,
  name       text NOT NULL,
  email      text NOT NULL,
  phone      text,
  message    text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- ============================================================

CREATE TABLE IF NOT EXISTS floor_plans (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  layout     jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id            serial PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- Données initiales
-- ============================================================

INSERT INTO settings (key, value)
VALUES ('terrasse_active', 'false')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Pour créer le premier compte admin, lancer :
--   node db/create-admin.js
-- ou :
--   ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=yourpassword node db/create-admin.js
-- ============================================================

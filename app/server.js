require('dotenv').config()
const express = require('express')
const path = require('path')
const helmet = require('helmet')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const PgSession = require('connect-pg-simple')(session)
const pool = require('./db')
const { pageAnalyticsMiddleware } = require('./lib/pageAnalytics')
const visitorMiddleware = require('./middleware/visitor')
const { csrfMiddleware } = require('./middleware/csrf')

if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: SESSION_SECRET non défini en production')
    process.exit(1)
  } else {
    console.warn('⚠ SESSION_SECRET non défini — fallback dev uniquement')
  }
}

const app = express()

// ============================================================
// Config views (EJS)
// ============================================================
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Reverse proxy (AlwaysData, Render…)
app.set('trust proxy', 1)

// ============================================================
// Middleware global
// ============================================================
app.use(helmet({ contentSecurityPolicy: false }))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())

// ============================================================
// Sessions (PostgreSQL store)
// ============================================================
app.use(session({
  store: new PgSession({ pool }),
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-prod',
  resave: false,
  saveUninitialized: false, // Pas de cookie public inutile pour les visiteurs anonymes
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 heures
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production' // HTTPS only en prod
  }
}))

app.use(visitorMiddleware)
app.use(csrfMiddleware)

app.use((req, res, next) => {
  res.locals.cookieConsent = req.cookies?.nata_cookie_consent || null
  next()
})

app.use(pageAnalyticsMiddleware)

// ============================================================
// Routes
// ============================================================
app.use('/', require('./routes/index'))
app.use('/menu', require('./routes/menu'))
app.use('/evenements', require('./routes/evenements'))
app.use('/actualites', require('./routes/actualites'))
app.use('/reservation', require('./routes/reservation'))
app.use('/admin', require('./routes/admin'))

// Redirection /login vers /admin/login
app.get('/login', (req, res) => {
  res.redirect('/admin/login')
})

// ============================================================
// Sitemap
// ============================================================
app.get('/sitemap.xml', async (req, res) => {
  const base = 'https://nata-lln.be'
  const today = new Date().toISOString().split('T')[0]

  const staticUrls = [
    { loc: '/',                          priority: '1.0', changefreq: 'weekly' },
    { loc: '/menu',                      priority: '0.9', changefreq: 'weekly' },
    { loc: '/reservation',               priority: '0.9', changefreq: 'monthly' },
    { loc: '/evenements',                priority: '0.8', changefreq: 'monthly' },
    { loc: '/actualites',                priority: '0.7', changefreq: 'weekly' },
    { loc: '/mentions-legales',          priority: '0.2', changefreq: 'yearly' },
    { loc: '/politique-confidentialite', priority: '0.2', changefreq: 'yearly' },
    { loc: '/politique-cookies',         priority: '0.2', changefreq: 'yearly' },
  ]

  let dynamicUrls = []
  try {
    const { rows } = await pool.query(
      `SELECT id, created_at FROM news_posts WHERE is_published = true ORDER BY created_at DESC`
    )
    dynamicUrls = rows.map(p => ({
      loc: `/actualites/${p.id}`,
      priority: '0.6',
      changefreq: 'monthly',
      lastmod: new Date(p.created_at).toISOString().split('T')[0]
    }))
  } catch (_) {}

  const allUrls = [...staticUrls, ...dynamicUrls]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${base}${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  res.header('Content-Type', 'application/xml')
  res.send(xml)
})

// ============================================================
// 404 handler
// ============================================================
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page non trouvée' })
})

// ============================================================
// Error handler
// ============================================================
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).render('error', {
    title: 'Erreur serveur',
    message: process.env.NODE_ENV === 'production'
      ? 'Une erreur est survenue.'
      : err.message
  })
})

// ============================================================
// Start server
// ============================================================
const PORT = process.env.PORT || 3000
const HOST = process.env.HOST || '::'

app.listen(PORT, HOST, () => {
  console.log(`✓ NATA Bar server lancé sur ${HOST}:${PORT}`)
  console.log(`✓ Environnement : ${process.env.NODE_ENV || 'development'}`)
  console.log(`✓ Cloudinary cloud: ${process.env.CLOUDINARY_CLOUD_NAME || '(non configuré)'}`)
})

// Test DB connection at startup
pool.query('SELECT 1').then(() => {
  console.log('✓ PostgreSQL connecté')
}).catch(err => {
  console.error('✗ PostgreSQL erreur connexion:', err.message)
})

module.exports = app

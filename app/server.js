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
const { csrfMiddleware, verifyCsrf } = require('./middleware/csrf')
const { renderUserText, escapeHTML } = require('./lib/sanitize')

const isProduction = process.env.NODE_ENV === 'production'

if (!process.env.SESSION_SECRET) {
  if (isProduction) {
    console.error('FATAL: SESSION_SECRET non défini en production')
    process.exit(1)
  } else {
    console.warn('⚠ SESSION_SECRET non défini — fallback dev uniquement')
  }
}

if (isProduction && !process.env.ADMIN_PASSWORD_HASH) {
  console.error('FATAL: ADMIN_PASSWORD_HASH non défini en production (bcrypt obligatoire)')
  process.exit(1)
}

const app = express()

// ============================================================
// Config views (EJS)
// ============================================================
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// Helpers disponibles dans toutes les vues EJS
app.locals.renderUserText = renderUserText
app.locals.escapeHTML = escapeHTML

// Reverse proxy (AlwaysData : un seul Apache devant)
app.set('trust proxy', 1)

// ============================================================
// Helmet — CSP stricte
// ============================================================
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      // EJS embarque parfois des handlers inline (forms / boutons) → 'unsafe-inline' toléré sur scripts
      // pour éviter de tout casser. À durcir avec des nonces dans une seconde itération.
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: isProduction ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}))

// X-Robots-Tag global pour interdire l'indexation de /admin
app.use((req, res, next) => {
  if (req.path.startsWith('/admin')) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
  }
  next()
})

app.use(express.static(path.join(__dirname, 'public')))

// Limites strictes anti-DoS
app.use(express.urlencoded({ extended: false, limit: '100kb', parameterLimit: 100 }))
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

// ============================================================
// Sessions (PostgreSQL store)
// ============================================================
app.use(session({
  store: new PgSession({ pool }),
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-prod',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge: 4 * 60 * 60 * 1000, // 4 heures (sliding window via rolling: true)
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction
  }
}))

app.use(visitorMiddleware)
app.use(csrfMiddleware)

// CSRF global sur toutes les méthodes mutantes
app.use(verifyCsrf)

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
// 404 handler
// ============================================================
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page non trouvée' })
})

// ============================================================
// Error handler — ne jamais leak err.message hors dev explicite
// ============================================================
app.use((err, req, res, next) => {
  // Log minimal côté serveur, sans req.body (peut contenir PII)
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} →`, err.message)

  const exposeDetails = process.env.NODE_ENV === 'development'
  res.status(500).render('error', {
    title: 'Erreur serveur',
    message: exposeDetails ? err.message : 'Une erreur est survenue.'
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

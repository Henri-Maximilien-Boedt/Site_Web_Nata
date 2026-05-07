const crypto = require('crypto')

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function ensureToken(req) {
  if (!req.session) return null
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex')
  }
  return req.session.csrfToken
}

// Génère / expose le token CSRF dans res.locals pour les vues.
// Force la création d'une session si nécessaire (sinon les formulaires GET initiaux n'auraient pas de token).
function csrfMiddleware(req, res, next) {
  res.locals.csrfToken = ''

  if (!req.session) return next()

  // Force la session à exister pour générer un token stable, même si saveUninitialized=false.
  if (!req.session.csrfBootstrapped) {
    req.session.csrfBootstrapped = true
  }

  res.locals.csrfToken = ensureToken(req) || ''
  next()
}

// Compare deux strings en temps constant pour éviter timing attacks.
function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''))
  const bufB = Buffer.from(String(b || ''))
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

// Refus par défaut : pas de session ou pas de token = 403.
function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next()

  const sessionToken = req.session?.csrfToken
  const provided = req.body?._csrf || req.headers['x-csrf-token']

  const ok = sessionToken && provided && timingSafeEqual(sessionToken, provided)

  if (!ok) {
    const isJson =
      req.headers['content-type']?.includes('application/json') ||
      req.headers['accept']?.includes('application/json')
    if (isJson) {
      return res.status(403).json({ ok: false, message: 'Token de sécurité invalide.' })
    }
    return res.status(403).render('error', {
      title: 'Erreur de sécurité',
      message: 'Token de sécurité invalide. Rechargez la page et réessayez.'
    })
  }

  next()
}

module.exports = { csrfMiddleware, verifyCsrf }

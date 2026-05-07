const crypto = require('crypto')

function csrfMiddleware(req, res, next) {
  // Toujours définir csrfToken pour éviter les ReferenceError dans les templates
  res.locals.csrfToken = ''

  if (!req.session) return next()

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex')
  }
  res.locals.csrfToken = req.session.csrfToken
  next()
}

function verifyCsrf(req, res, next) {
  // Si pas de session ou pas de token en session, on ne peut pas vérifier
  if (!req.session || !req.session.csrfToken) return next()

  const token = req.body?._csrf || req.headers['x-csrf-token'] || req.query?._csrf
  if (!token || token !== req.session.csrfToken) {
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

const { randomUUID } = require('crypto')

const VISITOR_COOKIE = 'nata_vid'
const CONSENT_COOKIE = 'nata_cookie_consent'
// Jamais plus longtemps que le consentement lui-même (30 jours, voir footer.ejs).
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
})

function visitorMiddleware(req, res, next) {
  const consent = req.cookies?.[CONSENT_COOKIE]

  // Only set visitor ID if analytics consent given
  if (consent === 'accepted') {
    if (!req.cookies?.[VISITOR_COOKIE]) {
      const vid = randomUUID()
      res.cookie(VISITOR_COOKIE, vid, { ...cookieOptions(), maxAge: THIRTY_DAYS_MS })
      // Attach to req so analytics middleware can use it this request
      req.visitorId = vid
    } else {
      req.visitorId = req.cookies[VISITOR_COOKIE]
    }
  } else if (req.cookies?.[VISITOR_COOKIE]) {
    // Consentement refusé, retiré ou expiré : on supprime l'identifiant.
    res.clearCookie(VISITOR_COOKIE, cookieOptions())
  }

  next()
}

module.exports = visitorMiddleware

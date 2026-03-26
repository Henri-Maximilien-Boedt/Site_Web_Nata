const { randomUUID } = require('crypto')

const VISITOR_COOKIE = 'nata_vid'
const CONSENT_COOKIE = 'nata_cookie_consent'
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

function visitorMiddleware(req, res, next) {
  const consent = req.cookies?.[CONSENT_COOKIE]

  // Only set visitor ID if analytics consent given
  if (consent === 'accepted') {
    if (!req.cookies?.[VISITOR_COOKIE]) {
      const vid = randomUUID()
      res.cookie(VISITOR_COOKIE, vid, {
        maxAge: ONE_YEAR_MS,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      })
      // Attach to req so analytics middleware can use it this request
      req.visitorId = vid
    } else {
      req.visitorId = req.cookies[VISITOR_COOKIE]
    }
  }

  next()
}

module.exports = visitorMiddleware

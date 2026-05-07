const { rateLimit } = require('express-rate-limit')

// Réservations publiques : 5 / 10 min / IP
const reservationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Trop de tentatives. Réessayez dans quelques minutes.' }
})

// Devis : 3 / 30 min / IP
const quoteLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Trop de demandes de devis. Réessayez plus tard.' }
})

module.exports = { reservationLimiter, quoteLimiter }

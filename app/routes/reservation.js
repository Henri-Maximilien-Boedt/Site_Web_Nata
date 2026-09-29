const express = require('express')
const router = express.Router()
const {
  cancelReservationByClient,
  createReservation,
  getActiveBanners,
  getPublicState,
  serializeStateForScript
} = require('../lib/restaurantStore')
const { reservationLimiter, cancelLimiter } = require('../middleware/rateLimits')

router.get('/', async (req, res, next) => {
  try {
    const [clientState, banners] = await Promise.all([getPublicState(), getActiveBanners()])

    res.render('reservation', {
      title: 'Réservation | NATA Bar',
      description: 'Réservez votre table chez NATA Bar.',
      clientStateJson: serializeStateForScript(clientState),
      banners
    })
  } catch (error) {
    next(error)
  }
})

router.get('/api/state', async (req, res, next) => {
  try {
    const clientState = await getPublicState()
    res.json(clientState)
  } catch (error) {
    next(error)
  }
})

router.post('/api/reservations', reservationLimiter, async (req, res, next) => {
  try {
    const reservation = await createReservation(req.body)
    res.status(201).json({ ok: true, reservation })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ ok: false, message: error.message })
    }
    next(error)
  }
})

router.post('/api/cancel', cancelLimiter, async (req, res, next) => {
  try {
    const cancelled = await cancelReservationByClient(req.body)
    if (!cancelled.length) {
      return res.status(404).json({
        ok: false,
        message: 'Aucune réservation à venir ne correspond à ces informations. Vérifie ton nom, ton email et ton téléphone, ou appelle-nous.'
      })
    }
    res.json({ ok: true, count: cancelled.length })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ ok: false, message: error.message })
    }
    next(error)
  }
})

router.post('/', reservationLimiter, async (req, res, next) => {
  try {
    await createReservation(req.body)

    if (req.accepts('html')) {
      return res.redirect('/reservation?success=1')
    }

    res.json({ ok: true })
  } catch (error) {
    if (error.status) {
      if (req.accepts('html')) {
        return res.status(error.status).redirect('/reservation?error=1')
      }
      return res.status(error.status).json({ ok: false, message: error.message })
    }
    next(error)
  }
})

module.exports = router

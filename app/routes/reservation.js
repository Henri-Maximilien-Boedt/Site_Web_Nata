const express = require('express')
const router = express.Router()
const {
  createReservation,
  getClientState,
  serializeStateForScript
} = require('../lib/restaurantStore')

router.get('/', async (req, res, next) => {
  try {
    const clientState = await getClientState()

    res.render('reservation', {
      title: 'Réservation | NATA Bar',
      description: 'Réservez votre table chez NATA Bar.',
      clientStateJson: serializeStateForScript(clientState)
    })
  } catch (error) {
    next(error)
  }
})

router.get('/api/state', async (req, res, next) => {
  try {
    const clientState = await getClientState()
    res.json(clientState)
  } catch (error) {
    next(error)
  }
})

router.post('/api/reservations', async (req, res, next) => {
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

router.post('/', async (req, res, next) => {
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

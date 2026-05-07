const express = require('express')
const router = express.Router()
const { createQuoteRequest } = require('../lib/restaurantStore')
const { sendQuoteRequestNotification } = require('../lib/quoteMailer')

router.get('/', (req, res) => {
  const quoteStatus = String(req.query.quote || '').trim()

  res.render('evenements', {
    title: 'Événements | NATA — Restaurant coréen Louvain-la-Neuve',
    description: 'Privatisations, afterworks et food truck avec NATA à Louvain-la-Neuve.',
    clientStateJson: '{}',
    quoteStatus
  })
})

router.post('/devis', async (req, res, next) => {
  try {
    const quote = await createQuoteRequest(req.body)

    let mailSent = false
    try {
      mailSent = await sendQuoteRequestNotification(quote)
    } catch (mailError) {
      console.error('Erreur email devis:', mailError)
    }

    res.redirect(`/evenements?quote=${mailSent ? 'ok' : 'saved'}`)
  } catch (error) {
    if (error.status) {
      return res.redirect('/evenements?quote=error')
    }
    next(error)
  }
})

module.exports = router

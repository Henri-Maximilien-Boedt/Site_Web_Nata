const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.render('reservation', { title: 'Réservation — NATA Bar' })
})

module.exports = router

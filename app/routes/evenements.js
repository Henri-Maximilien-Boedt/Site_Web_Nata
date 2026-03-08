const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.render('evenements', { title: 'Événements — NATA Bar' })
})

module.exports = router

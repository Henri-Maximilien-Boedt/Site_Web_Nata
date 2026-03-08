const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.render('actualites', { title: 'Actualités — NATA Bar' })
})

module.exports = router

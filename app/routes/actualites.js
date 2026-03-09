const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.render('actualites', {
    title: 'Actualités | NATA Bar',
    description: 'Les dernières actualités de NATA Bar.',
    clientStateJson: '{}'
  })
})

module.exports = router

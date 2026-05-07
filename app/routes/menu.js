const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.render('menu', {
    title: 'Menu | NATA — Restaurant coréen Louvain-la-Neuve',
    description: 'Découvrez la carte de NATA : entrées, plats coréens, desserts et boissons à Louvain-la-Neuve.',
    clientStateJson: '{}'
  })
})

module.exports = router

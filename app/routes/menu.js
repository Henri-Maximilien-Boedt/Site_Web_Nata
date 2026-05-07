const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.render('menu', {
    title: 'Menu | NATA Bar',
    description: 'Carte des plats et boissons de NATA Bar.',
    clientStateJson: '{}'
  })
})

module.exports = router

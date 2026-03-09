const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.render('evenements', {
    title: 'Événements | NATA Bar',
    description: 'Privatisations, afterworks et collaborations NATA Bar.',
    clientStateJson: '{}'
  })
})

module.exports = router

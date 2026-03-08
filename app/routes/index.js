const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.render('index', { title: 'NATA Bar — Restaurant coréen à Louvain-la-Neuve' })
})

module.exports = router

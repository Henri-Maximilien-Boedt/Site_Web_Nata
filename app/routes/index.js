const express = require('express')
const router = express.Router()
const { getClientState, serializeStateForScript } = require('../lib/restaurantStore')

router.get('/', async (req, res, next) => {
  try {
    const clientState = await getClientState()

    res.render('index', {
      title: 'NATA Bar | Korean Food & Bar',
      description:
        'NATA Bar - Cuisine coréenne, plats signature et boissons dans une ambiance chaleureuse.',
      clientStateJson: serializeStateForScript(clientState)
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router

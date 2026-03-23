const express = require('express')
const router = express.Router()
const pool = require('../db')

router.get('/', async (_req, res, next) => {
  try {
    let recentPosts = []
    try {
      const { rows } = await pool.query(`
        SELECT
          p.id,
          p.title,
          p.event_date::text AS event_date,
          p.is_pinned,
          p.created_at,
          i.url AS main_image_url
        FROM news_posts p
        LEFT JOIN news_images i ON i.post_id = p.id AND i.is_main = true
        WHERE p.is_published = true
        ORDER BY p.is_pinned DESC, p.event_date DESC NULLS LAST, p.created_at DESC
        LIMIT 3
      `)
      recentPosts = rows
    } catch {
      // news tables may not exist yet on first boot — silently ignore
    }

    res.render('index', {
      title: 'NATA Bar | Korean Food & Bar',
      description: 'NATA Bar — Cuisine coréenne, plats signature et boissons dans une ambiance chaleureuse à Louvain-la-Neuve.',
      recentPosts
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router

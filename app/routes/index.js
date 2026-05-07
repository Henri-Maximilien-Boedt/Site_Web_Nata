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

router.get('/mentions-legales', (_req, res) => {
  res.render('mentions-legales', {
    title: 'Mentions légales — NATA Bar',
    description: 'Mentions légales du site NATA Bar.'
  })
})

router.get('/politique-confidentialite', (_req, res) => {
  res.render('politique-confidentialite', {
    title: 'Politique de confidentialité — NATA Bar',
    description: 'Politique de confidentialité et données personnelles.'
  })
})

router.get('/politique-cookies', (_req, res) => {
  res.render('politique-cookies', {
    title: 'Politique cookies — NATA Bar',
    description: 'Information sur les cookies et traceurs utilisés.'
  })
})

module.exports = router

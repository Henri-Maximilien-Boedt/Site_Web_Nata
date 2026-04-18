const express = require('express')
const router = express.Router()
const pool = require('../db')

router.get('/', async (_req, res, next) => {
  try {
    const { rows: featuredPosts } = await pool.query(`
      SELECT
        p.id,
        p.title,
        p.content,
        p.event_date::text AS event_date,
        COALESCE(p.event_date, p.created_at::date)::text AS ref_date,
        p.is_pinned,
        p.created_at,
        i.url AS main_image_url
      FROM news_posts p
      LEFT JOIN news_images i ON i.post_id = p.id AND i.is_main = true
      WHERE p.is_published = true
        AND p.is_pinned = true
      ORDER BY ABS(COALESCE(p.event_date, p.created_at::date) - CURRENT_DATE) ASC,
               COALESCE(p.event_date, p.created_at::date) ASC,
               p.created_at DESC
    `)

    const { rows: upcomingPosts } = await pool.query(`
      SELECT
        p.id,
        p.title,
        p.content,
        p.event_date::text AS event_date,
        COALESCE(p.event_date, p.created_at::date)::text AS ref_date,
        p.is_pinned,
        p.created_at,
        i.url AS main_image_url
      FROM news_posts p
      LEFT JOIN news_images i ON i.post_id = p.id AND i.is_main = true
      WHERE p.is_published = true
        AND COALESCE(p.event_date, p.created_at::date) >= CURRENT_DATE
        AND p.is_pinned = false
      ORDER BY COALESCE(p.event_date, p.created_at::date) ASC, p.created_at DESC
    `)

    const { rows: pastPosts } = await pool.query(`
      SELECT
        p.id,
        p.title,
        p.content,
        p.event_date::text AS event_date,
        COALESCE(p.event_date, p.created_at::date)::text AS ref_date,
        p.is_pinned,
        p.created_at,
        i.url AS main_image_url
      FROM news_posts p
      LEFT JOIN news_images i ON i.post_id = p.id AND i.is_main = true
      WHERE p.is_published = true
        AND COALESCE(p.event_date, p.created_at::date) < CURRENT_DATE
        AND p.is_pinned = false
      ORDER BY COALESCE(p.event_date, p.created_at::date) DESC, p.created_at DESC
    `)

    res.render('actualites', {
      title: 'Actualités | NATA — Restaurant coréen Louvain-la-Neuve',
      description: 'Les dernières actualités et événements de NATA, restaurant coréen à Louvain-la-Neuve.',
      featuredPosts,
      upcomingPosts,
      pastPosts
    })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(id)) return next()

    const { rows: postRows } = await pool.query(
      `SELECT id, title, content, event_date::text AS event_date, is_pinned, created_at
       FROM news_posts WHERE id = $1 AND is_published = true`,
      [id]
    )

    if (!postRows.length) return next()

    const post = postRows[0]

    const { rows: images } = await pool.query(
      `SELECT id, url, is_main FROM news_images WHERE post_id = $1 ORDER BY is_main DESC, sort_order ASC, id ASC`,
      [id]
    )

    res.render('actualite-detail', {
      title: `${post.title} | NATA`,
      description: post.content ? post.content.slice(0, 150).replace(/\s+/g, ' ') : 'Actualité NATA Louvain-la-Neuve',
      post,
      images
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router

const express = require('express')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const isAuth = require('../middleware/auth')
const upload = require('../middleware/upload')
const pool = require('../db')
const {
  deleteReservation,
  getClientState,
  replaceAdminBlocks,
  serializeStateForScript,
  updateTableLayout,
  updateTableMerges
} = require('../lib/restaurantStore')

const renderDashboard = async (req, res, next, section, title) => {
  try {
    const clientState = await getClientState()

    res.render('admin/dashboard', {
      title,
      admin: req.session.admin,
      currentSection: section,
      clientStateJson: serializeStateForScript(clientState)
    })
  } catch (error) {
    next(error)
  }
}

// ============================================================
// Routes login / logout (non protégées)
// ============================================================

router.get('/login', (req, res) => {
  if (req.session && req.session.admin) return res.redirect('/admin')
  res.render('login', { error: null })
})

router.post('/login', (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.render('login', { error: 'Veuillez renseigner email et mot de passe.' })
  }

  const validEmail = email.trim().toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase()
  const validPassword = password === process.env.ADMIN_PASSWORD

  if (!validEmail || !validPassword) {
    return res.render('login', { error: 'Identifiants incorrects.' })
  }

  req.session.admin = { email: email.trim().toLowerCase() }
  res.redirect('/admin')
})

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login')
  })
})

// ============================================================
// Routes admin protégées (pages)
// ============================================================

router.get('/', isAuth, (req, res, next) => {
  renderDashboard(req, res, next, 'reservations', 'Réservations — Admin NATA')
})

router.get('/reservations', isAuth, (req, res, next) => {
  renderDashboard(req, res, next, 'reservations', 'Réservations — Admin NATA')
})

router.get('/tables', isAuth, (req, res, next) => {
  renderDashboard(req, res, next, 'tables', 'Plan de salle — Admin NATA')
})

router.get('/menu', isAuth, (req, res, next) => {
  renderDashboard(req, res, next, 'menu', 'Menu — Admin NATA')
})

// ============================================================
// Actualités — liste
// ============================================================

router.get('/actualites', isAuth, async (req, res, next) => {
  try {
    const { rows: posts } = await pool.query(`
      SELECT
        p.id,
        p.title,
        p.event_date::text AS event_date,
        p.is_published,
        p.is_pinned,
        p.created_at,
        COUNT(i.id)::int AS image_count
      FROM news_posts p
      LEFT JOIN news_images i ON i.post_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `)

    res.render('admin/actualites', {
      title: 'Actualités — Admin NATA',
      posts,
      flash: req.session.flash || null
    })
    delete req.session.flash
  } catch (err) {
    next(err)
  }
})

// ============================================================
// Actualités — créer
// ============================================================

router.get('/actualites/create', isAuth, (_req, res) => {
  res.render('admin/actualite-form', {
    title: 'Nouvel article — Admin NATA',
    post: null,
    images: [],
    error: null
  })
})

router.post('/actualites/create', isAuth, async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim()
    const content = String(req.body.content || '').trim()
    const eventDate = String(req.body.event_date || '').trim() || null
    const isPublished = req.body.is_published === '1'
    const isPinned = req.body.is_pinned === '1'

    if (!title) {
      return res.render('admin/actualite-form', {
        title: 'Nouvel article — Admin NATA',
        post: { title, content, event_date: eventDate, is_published: isPublished, is_pinned: isPinned },
        images: [],
        error: 'Le titre est obligatoire.'
      })
    }

    const { rows } = await pool.query(
      `INSERT INTO news_posts (title, content, event_date, is_published, is_pinned)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [title, content || null, eventDate, isPublished, isPinned]
    )

    req.session.flash = { type: 'success', text: 'Article créé avec succès.' }
    res.redirect(`/admin/actualites/${rows[0].id}/edit`)
  } catch (err) {
    next(err)
  }
})

// ============================================================
// Actualités — éditer
// ============================================================

router.get('/actualites/:id/edit', isAuth, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(id)) return next()

    const { rows } = await pool.query(
      `SELECT id, title, content, event_date::text AS event_date, is_published, is_pinned
       FROM news_posts WHERE id = $1`,
      [id]
    )
    if (!rows.length) return next()

    const { rows: images } = await pool.query(
      `SELECT id, url, is_main FROM news_images WHERE post_id = $1 ORDER BY is_main DESC, sort_order ASC, id ASC`,
      [id]
    )

    res.render('admin/actualite-form', {
      title: 'Modifier article — Admin NATA',
      post: rows[0],
      images,
      error: null,
      flash: req.session.flash || null
    })
    delete req.session.flash
  } catch (err) {
    next(err)
  }
})

router.post('/actualites/:id/edit', isAuth, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(id)) return next()

    const title = String(req.body.title || '').trim()
    const content = String(req.body.content || '').trim()
    const eventDate = String(req.body.event_date || '').trim() || null
    const isPublished = req.body.is_published === '1'
    const isPinned = req.body.is_pinned === '1'

    if (!title) {
      const { rows } = await pool.query(
        `SELECT id, title, content, event_date::text AS event_date, is_published, is_pinned FROM news_posts WHERE id = $1`,
        [id]
      )
      const { rows: images } = await pool.query(
        `SELECT id, url, is_main FROM news_images WHERE post_id = $1 ORDER BY is_main DESC, sort_order ASC, id ASC`,
        [id]
      )
      return res.render('admin/actualite-form', {
        title: 'Modifier article — Admin NATA',
        post: rows[0] || { id, title, content, event_date: eventDate, is_published: isPublished, is_pinned: isPinned },
        images,
        error: 'Le titre est obligatoire.',
        flash: null
      })
    }

    await pool.query(
      `UPDATE news_posts SET title=$1, content=$2, event_date=$3, is_published=$4, is_pinned=$5 WHERE id=$6`,
      [title, content || null, eventDate, isPublished, isPinned, id]
    )

    req.session.flash = { type: 'success', text: 'Article mis à jour.' }
    res.redirect(`/admin/actualites/${id}/edit`)
  } catch (err) {
    next(err)
  }
})

// ============================================================
// Actualités — toggles (published / pinned)
// ============================================================

router.post('/actualites/:id/toggle-published', isAuth, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(id)) return next()
    await pool.query(`UPDATE news_posts SET is_published = NOT is_published WHERE id = $1`, [id])
    res.redirect('/admin/actualites')
  } catch (err) {
    next(err)
  }
})

router.post('/actualites/:id/toggle-pinned', isAuth, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(id)) return next()
    await pool.query(`UPDATE news_posts SET is_pinned = NOT is_pinned WHERE id = $1`, [id])
    res.redirect('/admin/actualites')
  } catch (err) {
    next(err)
  }
})

// ============================================================
// Actualités — supprimer
// ============================================================

router.post('/actualites/:id/delete', isAuth, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(id)) return next()

    // Fetch images to delete files from disk
    const { rows: images } = await pool.query(`SELECT url FROM news_images WHERE post_id = $1`, [id])
    for (const img of images) {
      const filePath = path.join(__dirname, '../public', img.url)
      fs.unlink(filePath, () => {}) // ignore errors (file may not exist)
    }

    await pool.query(`DELETE FROM news_posts WHERE id = $1`, [id])
    req.session.flash = { type: 'success', text: 'Article supprimé.' }
    res.redirect('/admin/actualites')
  } catch (err) {
    next(err)
  }
})

// ============================================================
// Actualités — images : upload
// ============================================================

router.post('/actualites/:id/images', isAuth, upload.array('images', 10), async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isInteger(id)) return next()

    // Check current image count
    const { rows: existing } = await pool.query(`SELECT COUNT(*) AS cnt FROM news_images WHERE post_id = $1`, [id])
    const currentCount = Number(existing[0].cnt)

    const files = req.files || []
    const toInsert = files.slice(0, Math.max(0, 10 - currentCount))

    for (let i = 0; i < toInsert.length; i++) {
      const url = `/uploads/${toInsert[i].filename}`
      // First image overall becomes main
      const isMain = currentCount === 0 && i === 0
      await pool.query(
        `INSERT INTO news_images (post_id, url, is_main, sort_order) VALUES ($1, $2, $3, $4)`,
        [id, url, isMain, currentCount + i]
      )
    }

    req.session.flash = { type: 'success', text: `${toInsert.length} image(s) ajoutée(s).` }
    res.redirect(`/admin/actualites/${id}/edit`)
  } catch (err) {
    next(err)
  }
})

// ============================================================
// Actualités — images : set-main / delete
// ============================================================

router.post('/actualites/:id/images/:imgId/set-main', isAuth, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    const imgId = Number.parseInt(req.params.imgId, 10)
    if (!Number.isInteger(id) || !Number.isInteger(imgId)) return next()

    await pool.query(`UPDATE news_images SET is_main = false WHERE post_id = $1`, [id])
    await pool.query(`UPDATE news_images SET is_main = true WHERE id = $1 AND post_id = $2`, [imgId, id])

    req.session.flash = { type: 'success', text: 'Photo principale mise à jour.' }
    res.redirect(`/admin/actualites/${id}/edit`)
  } catch (err) {
    next(err)
  }
})

router.post('/actualites/:id/images/:imgId/delete', isAuth, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    const imgId = Number.parseInt(req.params.imgId, 10)
    if (!Number.isInteger(id) || !Number.isInteger(imgId)) return next()

    const { rows } = await pool.query(
      `DELETE FROM news_images WHERE id = $1 AND post_id = $2 RETURNING url, is_main`,
      [imgId, id]
    )

    if (rows.length) {
      fs.unlink(path.join(__dirname, '../public', rows[0].url), () => {})

      // If the deleted image was main, promote the first remaining image
      if (rows[0].is_main) {
        await pool.query(
          `UPDATE news_images SET is_main = true WHERE post_id = $1 AND id = (
            SELECT id FROM news_images WHERE post_id = $1 ORDER BY sort_order ASC, id ASC LIMIT 1
          )`,
          [id]
        )
      }
    }

    req.session.flash = { type: 'success', text: 'Image supprimée.' }
    res.redirect(`/admin/actualites/${id}/edit`)
  } catch (err) {
    next(err)
  }
})

// ============================================================
// Routes admin protégées (API JSON)
// ============================================================

router.get('/api/state', isAuth, async (req, res, next) => {
  try {
    const clientState = await getClientState()
    res.json(clientState)
  } catch (error) {
    next(error)
  }
})

router.delete('/api/reservations/:id', isAuth, async (req, res, next) => {
  try {
    const deleted = await deleteReservation(req.params.id)
    if (!deleted) return res.status(404).json({ ok: false, message: 'Réservation introuvable.' })
    res.json({ ok: true })
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ ok: false, message: error.message })
    }
    next(error)
  }
})

router.put('/api/layout', isAuth, async (req, res, next) => {
  try {
    const tableLayout = await updateTableLayout(req.body?.layout)
    res.json({ ok: true, tableLayout })
  } catch (error) {
    next(error)
  }
})

router.put('/api/merges', isAuth, async (req, res, next) => {
  try {
    const tableMerges = await updateTableMerges(req.body?.tableMerges)
    res.json({ ok: true, tableMerges })
  } catch (error) {
    next(error)
  }
})

router.put('/api/blocks', isAuth, async (req, res, next) => {
  try {
    const adminBlocks = await replaceAdminBlocks(req.body?.adminBlocks)
    res.json({ ok: true, adminBlocks })
  } catch (error) {
    next(error)
  }
})

module.exports = router

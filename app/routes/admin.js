const express = require('express')
const router = express.Router()
const isAuth = require('../middleware/auth')
const upload = require('../middleware/upload')
const { cloudinary } = require('../middleware/upload')
const pool = require('../db')
const { getPageViewStats } = require('../lib/pageAnalytics')
const {
  deleteReservation,
  getClientState,
  replaceAdminBlocks,
  serializeStateForScript,
  updateReservationStatus,
  updateTableLayout,
  updateTableMerges
} = require('../lib/restaurantStore')

const renderDashboard = async (req, res, next, section, title) => {
  try {
    const clientState = await getClientState()
    let pageAnalytics = null

    try {
      pageAnalytics = await getPageViewStats()
    } catch (analyticsError) {
      console.error('Erreur chargement analytics admin:', analyticsError)
    }

    res.render('admin/dashboard', {
      title,
      admin: req.session.admin,
      currentSection: section,
      clientStateJson: serializeStateForScript(clientState),
      pageAnalytics
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
    console.log(`✗ Tentative connexion échouée: ${email}`)
    return res.render('login', { error: 'Identifiants incorrects.' })
  }

  req.session.admin = { email: email.trim().toLowerCase() }
  console.log(`✓ Admin connecté: ${email.trim().toLowerCase()}`)
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
  renderDashboard(req, res, next, 'dashboard', 'Dashboard — Admin NATA')
})

router.get('/reservations', isAuth, async (req, res, next) => {
  try {
    await pool.query(`
      DELETE FROM reservations
      WHERE (status = 'cancelled' AND date < CURRENT_DATE - INTERVAL '10 days')
         OR (status <> 'cancelled' AND date < CURRENT_DATE - INTERVAL '1 day')
    `)

    const { rows: reservations } = await pool.query(
      `SELECT
        r.id,
        r.date::text AS date,
        r.time_start::text AS time_start,
        r.covers,
        r.name,
        r.source,
        r.status,
        t.code AS table_code
      FROM reservations r
      LEFT JOIN tables t ON t.id = r.table_id
      WHERE (r.status = 'cancelled' AND r.date >= CURRENT_DATE - INTERVAL '10 days')
         OR (r.status <> 'cancelled' AND r.date >= CURRENT_DATE - INTERVAL '1 day')
      ORDER BY r.date DESC, r.time_start DESC, r.created_at DESC
      LIMIT 200`
    )

    res.render('admin/reservations', {
      title: 'Réservations — Admin NATA',
      currentSection: 'reservations',
      reservations
    })
  } catch (err) {
    next(err)
  }
})

router.get('/tables', isAuth, async (req, res, next) => {
  try {
    const { rows: tables } = await pool.query(
      `SELECT id, code, seats, zone, is_active, live_status, pos_x, pos_y
       FROM tables
       ORDER BY zone ASC, code ASC`
    )

    res.render('admin/tables', {
      title: 'Plan de salle — Admin NATA',
      currentSection: 'tables',
      tables
    })
  } catch (err) {
    next(err)
  }
})

router.get('/menu', isAuth, async (req, res, next) => {
  try {
    const { rows: items } = await pool.query(
      `SELECT id, category, name, price, is_available, sort_order
       FROM menu_items
       ORDER BY category ASC, sort_order ASC, name ASC`
    )

    res.render('admin/menu', {
      title: 'Menu — Admin NATA',
      currentSection: 'menu',
      items
    })
  } catch (err) {
    next(err)
  }
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
      ORDER BY p.is_pinned DESC, p.event_date DESC NULLS LAST, p.created_at DESC
    `)

    res.render('admin/actualites', {
      title: 'Actualités — Admin NATA',
      posts,
      flash: req.session.flash || null,
      currentSection: 'actualites'
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
    error: null,
    flash: null,
    currentSection: 'actualites'
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
        error: 'Le titre est obligatoire.',
        flash: null,
        currentSection: 'actualites'
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
      flash: req.session.flash || null,
      currentSection: 'actualites'
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
        flash: null,
        currentSection: 'actualites'
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

    // Destroy images on Cloudinary before cascade-delete
    const { rows: images } = await pool.query(`SELECT cloudinary_id FROM news_images WHERE post_id = $1`, [id])
    for (const img of images) {
      if (img.cloudinary_id) {
        await cloudinary.uploader.destroy(img.cloudinary_id)
          .then(() => console.log(`✓ Cloudinary destroy: ${img.cloudinary_id}`))
          .catch(err => console.error('✗ Cloudinary destroy échoué:', err.message))
      }
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
    const remainingSlots = Math.max(0, 10 - currentCount)
    const toInsert = files.slice(0, remainingSlots)
    const ignoredCount = Math.max(0, files.length - toInsert.length)

    for (let i = 0; i < toInsert.length; i++) {
      const url = toInsert[i].path          // Cloudinary HTTPS URL
      const cloudinaryId = toInsert[i].filename  // public_id
      // First image overall becomes main
      const isMain = currentCount === 0 && i === 0
      await pool.query(
        `INSERT INTO news_images (post_id, url, cloudinary_id, is_main, sort_order) VALUES ($1, $2, $3, $4, $5)`,
        [id, url, cloudinaryId, isMain, currentCount + i]
      )
    }

    console.log(`✓ Cloudinary upload: ${toInsert.length} image(s) → article #${id}`)

    let flashText = `${toInsert.length} image(s) ajoutée(s).`
    if (toInsert.length === 0 && files.length > 0) {
      flashText = 'Aucune image ajoutée: limite de 10 images atteinte pour cet article.'
    } else if (ignoredCount > 0) {
      flashText += ` ${ignoredCount} image(s) ignorée(s) (limite de 10 atteinte).`
    }

    req.session.flash = { type: 'success', text: flashText }
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
      `DELETE FROM news_images WHERE id = $1 AND post_id = $2 RETURNING cloudinary_id, is_main`,
      [imgId, id]
    )

    if (rows.length) {
      if (rows[0].cloudinary_id) {
        await cloudinary.uploader.destroy(rows[0].cloudinary_id)
          .then(() => console.log(`✓ Cloudinary destroy: ${rows[0].cloudinary_id}`))
          .catch(err => console.error('✗ Cloudinary destroy échoué:', err.message))
      }

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

router.patch('/api/reservations/:id/status', isAuth, async (req, res, next) => {
  try {
    const { status } = req.body || {}
    const reservation = await updateReservationStatus(req.params.id, status)
    res.json({ ok: true, reservation })
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

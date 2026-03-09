const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const pool = require('../db')
const isAuth = require('../middleware/auth')
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

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.render('login', { error: 'Veuillez renseigner email et mot de passe.' })
  }

  try {
    const { rows } = await pool.query('SELECT * FROM admin_users WHERE email = $1', [
      email.trim().toLowerCase()
    ])

    if (!rows[0]) {
      return res.render('login', { error: 'Identifiants incorrects.' })
    }

    const valid = await bcrypt.compare(password, rows[0].password_hash)
    if (!valid) {
      return res.render('login', { error: 'Identifiants incorrects.' })
    }

    req.session.admin = { id: rows[0].id, email: rows[0].email }
    res.redirect('/admin')
  } catch (err) {
    console.error('Erreur login :', err)
    res.render('login', { error: 'Erreur serveur, veuillez réessayer.' })
  }
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

router.get('/actualites', isAuth, (req, res, next) => {
  renderDashboard(req, res, next, 'actualites', 'Actualités — Admin NATA')
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

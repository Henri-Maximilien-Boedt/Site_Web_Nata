const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const pool = require('../db')
const isAuth = require('../middleware/auth')

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
    const { rows } = await pool.query(
      'SELECT * FROM admin_users WHERE email = $1',
      [email.trim().toLowerCase()]
    )

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
// Routes admin protégées
// ============================================================

router.get('/', isAuth, (req, res) => {
  res.redirect('/admin/reservations')
})

router.get('/reservations', isAuth, (req, res) => {
  res.render('admin/dashboard', {
    title: 'Réservations — Admin NATA',
    admin: req.session.admin
  })
})

router.get('/tables', isAuth, (req, res) => {
  res.render('admin/dashboard', {
    title: 'Plan de salle — Admin NATA',
    admin: req.session.admin
  })
})

router.get('/menu', isAuth, (req, res) => {
  res.render('admin/dashboard', {
    title: 'Menu — Admin NATA',
    admin: req.session.admin
  })
})

router.get('/actualites', isAuth, (req, res) => {
  res.render('admin/dashboard', {
    title: 'Actualités — Admin NATA',
    admin: req.session.admin
  })
})

module.exports = router

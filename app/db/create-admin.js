#!/usr/bin/env node
/**
 * Script one-shot pour créer le premier compte admin.
 * Lancer une seule fois :
 *   node db/create-admin.js
 * ou avec des variables :
 *   ADMIN_EMAIL=gerant@natabar.be ADMIN_PASSWORD=motdepasse node db/create-admin.js
 * ou en arguments :
 *   node db/create-admin.js gerant@natabar.be motdepasse
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const bcrypt = require('bcrypt')
const pool = require('../db')

async function createAdmin() {
  const email    = process.env.ADMIN_EMAIL    || process.argv[2]
  const password = process.env.ADMIN_PASSWORD || process.argv[3]

  if (!email || !password) {
    console.error('Usage : ADMIN_EMAIL=x ADMIN_PASSWORD=y node db/create-admin.js')
    console.error('   ou : node db/create-admin.js email@exemple.com motdepasse')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('Erreur : le mot de passe doit faire au moins 8 caractères.')
    process.exit(1)
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const { rows } = await pool.query(
      'INSERT INTO admin_users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash]
    )
    console.log(`✓ Admin créé — id: ${rows[0].id}, email: ${rows[0].email}`)
  } catch (err) {
    if (err.code === '23505') {
      console.error(`Erreur : l'email "${email}" est déjà utilisé par un admin.`)
    } else {
      console.error('Erreur lors de la création de l\'admin :', err.message)
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

createAdmin()

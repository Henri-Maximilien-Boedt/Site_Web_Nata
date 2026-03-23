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

  const normalizedEmail = email.trim().toLowerCase()

  try {
    console.log('⏳ Hachage du mot de passe en cours...')
    const passwordHash = await bcrypt.hash(password, 12)
    
    // Vérification CRITIQUE : s'assurer que bcrypt.compare() fonctionne avant d'insérer
    console.log('🔍 Vérification du hash...')
    const isValid = await bcrypt.compare(password, passwordHash)
    if (!isValid) {
      throw new Error('CRITIQUE : bcrypt.compare() a échoué ! Le hash est invalide.')
    }
    console.log('✓ Hash validé avec succès')
    
    // Insérer en base de données
    console.log('💾 Enregistrement en base de données...')
    const { rows } = await pool.query(
      `INSERT INTO admin_users (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email)
       DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id, email, created_at`,
      [normalizedEmail, passwordHash]
    )
    
    // Vérification finale : récupérer et tester le hash depuis la BDD
    console.log('🔐 Vérification finale du hash en base de données...')
    const { rows: checkRows } = await pool.query(
      'SELECT password_hash FROM admin_users WHERE email = $1',
      [normalizedEmail]
    )
    const dbHash = checkRows[0].password_hash
    const finalCheck = await bcrypt.compare(password, dbHash)
    if (!finalCheck) {
      throw new Error('CRITIQUE : Le hash en base de données ne correspond pas au mot de passe !')
    }
    
    console.log('\n✅ SUCCÈS ! Admin créé/mis à jour et vérifié')
    console.log(`   ID    : ${rows[0].id}`)
    console.log(`   Email : ${rows[0].email}`)
    console.log(`   Créé  : ${rows[0].created_at}`)
    console.log(`\n📝 Identifiants de connexion :`)
    console.log(`   Email    : ${normalizedEmail}`)
    console.log(`   Password : ${password}`)
    console.log(`\n✨ Le mot de passe a été testé et fonctionne correctement !`)
  } catch (err) {
    console.error(`\n❌ Erreur CRITIQUE : ${err.message}`)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

createAdmin()

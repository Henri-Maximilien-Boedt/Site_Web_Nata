const brevo = require('@getbrevo/brevo')

const { getDurationLabel } = require('./openingHours')

const escapeHTML = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const formatDateTime = (dateISO, timeHHMM) =>
  `${escapeHTML(dateISO || '')} à ${escapeHTML(timeHHMM || '')}`

const getMailerConfig = () => {
  const apiKey = String(process.env.BREVO_API_KEY || '').trim()
  const fromEmail = String(process.env.MAIL_FROM || process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  return { apiKey, fromEmail, adminEmail }
}

// Pied de page des emails clients : identité de l'expéditeur + lien RGPD.
const SITE_URL = String(process.env.SITE_URL || 'https://nata-lln.be').replace(/\/+$/, '')
const CLIENT_FOOTER_HTML = `
    <p style="max-width:620px;margin:12px auto 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#789;text-align:center;">
      NATA SRL · Grand-Place 51, 1348 Louvain-la-Neuve · BE 1001.480.755<br>
      Vos données servent uniquement à gérer votre réservation.
      <a href="${SITE_URL}/politique-confidentialite" style="color:#789;">Politique de confidentialité</a>
    </p>`
const CLIENT_FOOTER_TEXT = [
  '',
  '--',
  'NATA SRL · Grand-Place 51, 1348 Louvain-la-Neuve · BE 1001.480.755',
  `Vos données servent uniquement à gérer votre réservation : ${SITE_URL}/politique-confidentialite`
].join('\n')

const buildApiInstance = (apiKey) => {
  const apiInstance = new brevo.TransactionalEmailsApi()
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey)
  return apiInstance
}

const sendEmail = async ({ to, subject, htmlContent, textContent, replyTo, client = false }) => {
  const { apiKey, fromEmail } = getMailerConfig()
  if (!apiKey || !fromEmail) {
    console.warn('Email non envoyé (BREVO_API_KEY ou MAIL_FROM manquant).')
    return false
  }

  const api = buildApiInstance(apiKey)
  const payload = new brevo.SendSmtpEmail()
  payload.sender = { email: fromEmail, name: 'NATA' }
  payload.to = to
  payload.subject = subject
  payload.htmlContent = client ? htmlContent + CLIENT_FOOTER_HTML : htmlContent
  payload.textContent = client ? textContent + '\n' + CLIENT_FOOTER_TEXT : textContent
  if (replyTo) payload.replyTo = replyTo

  // Journaux sans données personnelles (ni adresse, ni sujet qui peut contenir un nom).
  const recipients = `${to.length} destinataire${to.length > 1 ? 's' : ''}`

  try {
    await api.sendTransacEmail(payload)
    console.log(`✓ Email envoyé → ${recipients}`)
    return true
  } catch (err) {
    console.error(`✗ Email échoué → ${recipients} |`, err.message)
    throw err
  }
}

const sendReservationAcknowledgement = async (reservation) => {
  if (!reservation?.email) return false
  const subject = 'Votre demande de réservation - NATA'
  const htmlContent = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f6fbff;padding:16px;">
      <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #d8e5f2;border-radius:12px;padding:18px;">
        <h2 style="margin:0 0 8px;color:#153f70;">Nous avons bien reçu votre demande</h2>
        <p style="margin:0 0 14px;color:#50667d;">Nous revenons vers vous rapidement pour confirmer.</p>
        <p style="margin:0 0 6px;">Nom : <strong>${escapeHTML(reservation.name)}</strong></p>
        <p style="margin:0 0 6px;">Date/heure : <strong>${formatDateTime(reservation.date, reservation.time)}</strong></p>
        <p style="margin:0 0 6px;">Durée : <strong>${getDurationLabel()}</strong></p>
        <p style="margin:0 0 6px;">Personnes : <strong>${escapeHTML(String(reservation.people || ''))}</strong></p>
        ${reservation.message ? `<p style="margin:0 0 6px;">Votre message : <strong>${escapeHTML(reservation.message)}</strong></p>` : ''}
        <p style="margin:0;color:#789">ID : ${escapeHTML(reservation.id || '')}</p>
      </div>
    </div>
  `
  const textContent = [
    'Nous avons bien reçu votre demande de réservation.',
    `Nom : ${reservation.name}`,
    `Date/heure : ${reservation.date} ${reservation.time}`,
    `Durée : ${getDurationLabel()}`,
    `Personnes : ${reservation.people}`,
    reservation.message ? `Votre message : ${reservation.message}` : '',
    `ID : ${reservation.id || ''}`
  ].filter(Boolean).join('\n')

  return sendEmail({
    to: [{ email: reservation.email, name: reservation.name || '' }],
    client: true,
    subject,
    htmlContent,
    textContent
  })
}

const sendReservationStatusEmail = async (reservation, status) => {
  if (!reservation?.email) return false
  const isConfirm = status === 'confirmed'
  const subject = isConfirm
    ? 'Réservation confirmée - NATA'
    : 'Réservation annulée - NATA'
  const lead = isConfirm
    ? 'Votre réservation est confirmée.'
    : 'Votre réservation a été annulée.'

  const htmlContent = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f6fbff;padding:16px;">
      <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #d8e5f2;border-radius:12px;padding:18px;">
        <h2 style="margin:0 0 8px;color:#153f70;">${lead}</h2>
        <p style="margin:0 0 14px;color:#50667d;">NATA — Louvain-la-Neuve</p>
        <p style="margin:0 0 6px;">Nom : <strong>${escapeHTML(reservation.name)}</strong></p>
        <p style="margin:0 0 6px;">Date/heure : <strong>${formatDateTime(reservation.date, reservation.time)}</strong></p>
        <p style="margin:0 0 6px;">Durée : <strong>${getDurationLabel()}</strong></p>
        <p style="margin:0 0 6px;">Personnes : <strong>${escapeHTML(String(reservation.people || ''))}</strong></p>
        ${reservation.message ? `<p style="margin:0 0 6px;">Votre message : <strong>${escapeHTML(reservation.message)}</strong></p>` : ''}
        <p style="margin:0;color:#789">ID : ${escapeHTML(reservation.id || '')}</p>
      </div>
    </div>
  `

  const textContent = [
    lead,
    `Nom : ${reservation.name}`,
    `Date/heure : ${reservation.date} ${reservation.time}`,
    `Durée : ${getDurationLabel()}`,
    `Personnes : ${reservation.people}`,
    reservation.message ? `Votre message : ${reservation.message}` : '',
    `ID : ${reservation.id || ''}`
  ].filter(Boolean).join('\n')

  return sendEmail({
    to: [{ email: reservation.email, name: reservation.name || '' }],
    client: true,
    subject,
    htmlContent,
    textContent
  })
}

const sendManagerNewReservationNotification = async (reservation) => {
  const { adminEmail } = getMailerConfig()
  if (!adminEmail) return false

  const subject = `[NATA] Nouvelle réservation en attente — ${reservation.name}`
  const htmlContent = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f6fbff;padding:16px;">
      <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #d8e5f2;border-radius:12px;padding:18px;">
        <h2 style="margin:0 0 8px;color:#153f70;">Nouvelle réservation à confirmer</h2>
        <p style="margin:0 0 14px;color:#50667d;">Une réservation en ligne vient d'être soumise et attend votre confirmation.</p>
        <p style="margin:0 0 6px;">Nom : <strong>${escapeHTML(reservation.name)}</strong></p>
        <p style="margin:0 0 6px;">Date/heure : <strong>${formatDateTime(reservation.date, reservation.time)}</strong></p>
        <p style="margin:0 0 6px;">Personnes : <strong>${escapeHTML(String(reservation.people || ''))}</strong></p>
        <p style="margin:0 0 6px;">Email client : <strong>${escapeHTML(reservation.email || '')}</strong></p>
        <p style="margin:0 0 6px;">Téléphone : <strong>${escapeHTML(reservation.phone || '')}</strong></p>
        ${reservation.message ? `<p style="margin:0 0 6px;">Message : <strong>${escapeHTML(reservation.message)}</strong></p>` : ''}
        <p style="margin:14px 0 0;"><a href="${process.env.SITE_URL || ''}/admin/reservations" style="background:#153f70;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Voir dans l'admin</a></p>
      </div>
    </div>
  `

  return sendEmail({
    to: [{ email: adminEmail }],
    subject,
    htmlContent,
    textContent: [
      'Nouvelle réservation en attente de confirmation.',
      `Nom : ${reservation.name}`,
      `Date/heure : ${reservation.date} ${reservation.time}`,
      `Personnes : ${reservation.people}`,
      `Email : ${reservation.email}`,
      `Téléphone : ${reservation.phone}`,
      reservation.message ? `Message : ${reservation.message}` : ''
    ].filter(Boolean).join('\n')
  })
}

// Premier mot du nom saisi, faute de champ prénom séparé.
const getFirstName = (name) => String(name || '').trim().split(/\s+/)[0] || ''

const sendClientCancellationEmail = async (reservation) => {
  if (!reservation?.email) return false
  const firstName = getFirstName(reservation.name)
  const greeting = firstName ? `Bonjour ${firstName},` : 'Bonjour,'
  const subject = 'Réservation annulée - NATA'

  const htmlContent = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f6fbff;padding:16px;">
      <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #d8e5f2;border-radius:12px;padding:18px;">
        <p style="margin:0 0 10px;color:#153f70;font-size:17px;">${escapeHTML(greeting)}</p>
        <p style="margin:0 0 10px;">Votre réservation du <strong>${formatDateTime(reservation.date, reservation.time)}</strong>
          (${escapeHTML(String(reservation.people || ''))} pers.) a bien été annulée.</p>
        <p style="margin:0 0 14px;">En espérant vous revoir très bientôt chez NATA !</p>
        <p style="margin:0;color:#50667d;">L'équipe NATA — Louvain-la-Neuve</p>
      </div>
    </div>
  `

  const textContent = [
    greeting,
    '',
    `Votre réservation du ${reservation.date} à ${reservation.time} (${reservation.people} pers.) a bien été annulée.`,
    'En espérant vous revoir très bientôt chez NATA !',
    '',
    "L'équipe NATA — Louvain-la-Neuve"
  ].join('\n')

  return sendEmail({
    to: [{ email: reservation.email, name: reservation.name || '' }],
    client: true,
    subject,
    htmlContent,
    textContent
  })
}

const sendManagerClientCancellationNotification = async (reservation) => {
  const { adminEmail } = getMailerConfig()
  if (!adminEmail) return false

  const subject = `[NATA] Réservation annulée par le client — ${reservation.name}`
  const htmlContent = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f6fbff;padding:16px;">
      <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #d8e5f2;border-radius:12px;padding:18px;">
        <h2 style="margin:0 0 8px;color:#153f70;">Un client a annulé sa réservation</h2>
        <p style="margin:0 0 6px;">Nom : <strong>${escapeHTML(reservation.name)}</strong></p>
        <p style="margin:0 0 6px;">Date/heure : <strong>${formatDateTime(reservation.date, reservation.time)}</strong></p>
        <p style="margin:0 0 6px;">Personnes : <strong>${escapeHTML(String(reservation.people || ''))}</strong></p>
        <p style="margin:0 0 6px;">Téléphone : <strong>${escapeHTML(reservation.phone || '')}</strong></p>
        <p style="margin:0;color:#789">ID : ${escapeHTML(reservation.id || '')}</p>
      </div>
    </div>
  `

  return sendEmail({
    to: [{ email: adminEmail }],
    subject,
    htmlContent,
    textContent: [
      'Un client a annulé sa réservation depuis le site.',
      `Nom : ${reservation.name}`,
      `Date/heure : ${reservation.date} ${reservation.time}`,
      `Personnes : ${reservation.people}`,
      `Téléphone : ${reservation.phone}`,
      `ID : ${reservation.id || ''}`
    ].join('\n')
  })
}

module.exports = {
  sendClientCancellationEmail,
  sendManagerClientCancellationNotification,
  sendReservationAcknowledgement,
  sendReservationStatusEmail,
  sendManagerNewReservationNotification
}

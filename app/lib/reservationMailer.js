const brevo = require('@getbrevo/brevo')

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

const buildApiInstance = (apiKey) => {
  const apiInstance = new brevo.TransactionalEmailsApi()
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey)
  return apiInstance
}

const sendEmail = async ({ to, subject, htmlContent, textContent, replyTo }) => {
  const { apiKey, fromEmail } = getMailerConfig()
  if (!apiKey || !fromEmail) {
    console.warn('Email non envoyé (BREVO_API_KEY ou MAIL_FROM manquant).')
    return false
  }

  const api = buildApiInstance(apiKey)
  const payload = new brevo.SendSmtpEmail()
  payload.sender = { email: fromEmail, name: 'NATA Bar' }
  payload.to = to
  payload.subject = subject
  payload.htmlContent = htmlContent
  payload.textContent = textContent
  if (replyTo) payload.replyTo = replyTo

  try {
    await api.sendTransacEmail(payload)
    console.log(`✓ Email envoyé → ${to.map(t => t.email).join(', ')} | "${subject}"`)
    return true
  } catch (err) {
    console.error(`✗ Email échoué → ${to.map(t => t.email).join(', ')} | "${subject}" |`, err.message)
    throw err
  }
}

const sendReservationAcknowledgement = async (reservation) => {
  if (!reservation?.email) return false
  const subject = 'Votre demande de réservation - NATA Bar'
  const htmlContent = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f6fbff;padding:16px;">
      <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #d8e5f2;border-radius:12px;padding:18px;">
        <h2 style="margin:0 0 8px;color:#153f70;">Nous avons bien reçu votre demande</h2>
        <p style="margin:0 0 14px;color:#50667d;">Nous revenons vers vous rapidement pour confirmer.</p>
        <p style="margin:0 0 6px;">Nom : <strong>${escapeHTML(reservation.name)}</strong></p>
        <p style="margin:0 0 6px;">Date/heure : <strong>${formatDateTime(reservation.date, reservation.time)}</strong></p>
        <p style="margin:0 0 6px;">Personnes : <strong>${escapeHTML(String(reservation.people || ''))}</strong></p>
        <p style="margin:0;color:#789">ID : ${escapeHTML(reservation.id || '')}</p>
      </div>
    </div>
  `
  const textContent = [
    'Nous avons bien reçu votre demande de réservation.',
    `Nom : ${reservation.name}`,
    `Date/heure : ${reservation.date} ${reservation.time}`,
    `Personnes : ${reservation.people}`,
    `ID : ${reservation.id || ''}`
  ].join('\n')

  return sendEmail({
    to: [{ email: reservation.email, name: reservation.name || '' }],
    subject,
    htmlContent,
    textContent
  })
}

const sendReservationStatusEmail = async (reservation, status) => {
  if (!reservation?.email) return false
  const isConfirm = status === 'confirmed'
  const subject = isConfirm
    ? 'Réservation confirmée - NATA Bar'
    : 'Réservation annulée - NATA Bar'
  const lead = isConfirm
    ? 'Votre réservation est confirmée.'
    : 'Votre réservation a été annulée.'

  const htmlContent = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f6fbff;padding:16px;">
      <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #d8e5f2;border-radius:12px;padding:18px;">
        <h2 style="margin:0 0 8px;color:#153f70;">${lead}</h2>
        <p style="margin:0 0 14px;color:#50667d;">NATA Bar — Louvain-la-Neuve</p>
        <p style="margin:0 0 6px;">Nom : <strong>${escapeHTML(reservation.name)}</strong></p>
        <p style="margin:0 0 6px;">Date/heure : <strong>${formatDateTime(reservation.date, reservation.time)}</strong></p>
        <p style="margin:0 0 6px;">Personnes : <strong>${escapeHTML(String(reservation.people || ''))}</strong></p>
        <p style="margin:0;color:#789">ID : ${escapeHTML(reservation.id || '')}</p>
      </div>
    </div>
  `

  const textContent = [
    lead,
    `Nom : ${reservation.name}`,
    `Date/heure : ${reservation.date} ${reservation.time}`,
    `Personnes : ${reservation.people}`,
    `ID : ${reservation.id || ''}`
  ].join('\n')

  return sendEmail({
    to: [{ email: reservation.email, name: reservation.name || '' }],
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

module.exports = {
  sendReservationAcknowledgement,
  sendReservationStatusEmail,
  sendManagerNewReservationNotification
}

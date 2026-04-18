const brevo = require('@getbrevo/brevo')

const escapeHTML = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const toPrettyLabel = (value) => (value === 'entreprise' ? 'Entreprise' : 'Particulier')

const formatRow = (label, value) =>
  `<tr>
    <td style="padding:6px 10px;border-bottom:1px solid #e6edf5;font-weight:700;color:#244567;">${escapeHTML(label)}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #e6edf5;color:#1e2b39;">${escapeHTML(value)}</td>
  </tr>`

const buildHtmlContent = (quote) => {
  const companyRows =
    quote.requestKind === 'entreprise'
      ? [
          formatRow('Nom entreprise', quote.companyName || '-'),
          formatRow('Responsable', quote.companyContactName || '-'),
          formatRow('N° TVA', quote.vatNumber || '-'),
          formatRow('PEPPOL', quote.peppolId || '-')
        ].join('')
      : ''

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f6fbff;padding:16px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #d8e5f2;border-radius:12px;padding:18px;">
        <h2 style="margin:0 0 8px;color:#153f70;">Nouveau devis événements</h2>
        <p style="margin:0 0 14px;color:#50667d;">Une demande de devis vient d'être envoyée depuis la page événements.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${formatRow('Type', toPrettyLabel(quote.requestKind))}
          ${formatRow('Prénom', quote.firstName)}
          ${formatRow('Nom', quote.lastName)}
          ${formatRow('Email', quote.email)}
          ${formatRow('Téléphone', quote.phone)}
          ${companyRows}
          ${formatRow('Message', quote.message)}
          ${formatRow('ID devis', quote.id)}
          ${formatRow('Créé le', quote.createdAt)}
        </table>
      </div>
    </div>
  `
}

const sendQuoteRequestNotification = async (quote) => {
  const apiKey = String(process.env.BREVO_API_KEY || '').trim()
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const senderEmail = String(process.env.MAIL_FROM || adminEmail || '').trim().toLowerCase()

  if (!apiKey || !adminEmail || !senderEmail) {
    console.warn('Email devis non envoyé: BREVO_API_KEY, ADMIN_EMAIL ou MAIL_FROM manquant.')
    return false
  }

  const apiInstance = new brevo.TransactionalEmailsApi()
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey)

  const payload = new brevo.SendSmtpEmail()
  payload.sender = { email: senderEmail, name: 'NATA Bar' }
  payload.to = [{ email: adminEmail }]
  payload.replyTo = { email: quote.email, name: `${quote.firstName} ${quote.lastName}`.trim() }
  payload.subject = `[NATA] Nouveau devis ${toPrettyLabel(quote.requestKind)}`
  payload.htmlContent = buildHtmlContent(quote)
  payload.textContent = [
    'Nouveau devis événements',
    `Type: ${toPrettyLabel(quote.requestKind)}`,
    `Prénom: ${quote.firstName}`,
    `Nom: ${quote.lastName}`,
    `Email: ${quote.email}`,
    `Téléphone: ${quote.phone}`,
    quote.requestKind === 'entreprise' ? `Entreprise: ${quote.companyName}` : '',
    quote.requestKind === 'entreprise' ? `Responsable: ${quote.companyContactName}` : '',
    quote.requestKind === 'entreprise' ? `TVA: ${quote.vatNumber}` : '',
    quote.requestKind === 'entreprise' ? `PEPPOL: ${quote.peppolId}` : '',
    `Message: ${quote.message}`,
    `ID devis: ${quote.id}`,
    `Date: ${quote.createdAt}`
  ]
    .filter(Boolean)
    .join('\n')

  await apiInstance.sendTransacEmail(payload)
  return true
}

module.exports = {
  sendQuoteRequestNotification
}


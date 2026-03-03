const SibApiV3Sdk = require("@getbrevo/brevo");

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

/**
 * Envoie un email transactionnel via Brevo.
 * @param {Object} params
 * @param {string} params.to      - Email du destinataire
 * @param {string} params.subject - Objet de l'email
 * @param {string} params.html    - Contenu HTML
 * @param {string} [params.toName] - Nom du destinataire (optionnel)
 */
export async function sendEmail({ to, toName, subject, html }) {
  const mail = new SibApiV3Sdk.SendSmtpEmail();
  mail.sender = { name: "NATA Bar", email: "noreply@natabar.be" };
  mail.to = [{ email: to, ...(toName ? { name: toName } : {}) }];
  mail.subject = subject;
  mail.htmlContent = html;

  return apiInstance.sendTransacEmail(mail);
}

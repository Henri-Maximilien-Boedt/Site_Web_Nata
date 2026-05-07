// Sanitiseur HTML minimal sans dépendance.
// Échappe tout, puis convertit \n en <br> uniquement.
// Suffisant pour le contenu d'actualités saisi par l'admin.

const escapeHTML = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const renderUserText = (value) =>
  escapeHTML(value).replace(/\r?\n/g, '<br>')

module.exports = { escapeHTML, renderUserText }

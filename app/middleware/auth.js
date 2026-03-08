/**
 * Middleware d'authentification admin.
 * Vérifie req.session.admin — redirige vers /login si absent.
 */
module.exports = function isAuth(req, res, next) {
  if (req.session && req.session.admin) return next()
  res.redirect('/login')
}

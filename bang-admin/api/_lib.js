const crypto = require('crypto');
// Compara la clave del header con ADMIN_PASSWORD (tiempo constante)
function auth(req, res) {
  const given = Buffer.from(String(req.headers['x-admin-key'] || ''));
  const real = Buffer.from(String(process.env.ADMIN_PASSWORD || ''));
  const ok = real.length > 0 && given.length === real.length && crypto.timingSafeEqual(given, real);
  if (!ok) res.status(401).json({ error: 'Clave incorrecta' });
  return ok;
}
module.exports = { auth };

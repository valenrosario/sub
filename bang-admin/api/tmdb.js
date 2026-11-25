const { auth } = require('./_lib');
// Proxy de TMDB: la clave de TMDB queda en el servidor y nunca llega al navegador.
const ALLOW = [
  /^\/search\/multi$/,
  /^\/(movie|tv)\/\d+$/,
  /^\/(movie|tv)\/\d+\/images$/,
  /^\/(movie|tv)\/\d+\/external_ids$/,
  /^\/tv\/\d+\/season\/\d+$/,
  /^\/tv\/\d+\/season\/\d+\/episode\/\d+\/images$/,
];
module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  const { path, ...q } = req.query;
  if (!ALLOW.some((r) => r.test(path || ''))) return res.status(400).json({ error: 'Ruta no permitida' });
  try {
    const u = new URL('https://api.themoviedb.org/3' + path);
    for (const [k, v] of Object.entries(q)) u.searchParams.set(k, String(v));
    const r = await fetch(u, { headers: { Authorization: 'Bearer ' + process.env.TMDB_TOKEN, accept: 'application/json' } });
    const data = await r.json();
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(r.status).json(data);
  } catch (e) {
    res.status(502).json({ error: 'No se pudo consultar TMDB: ' + e.message });
  }
};

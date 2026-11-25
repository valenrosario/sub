const { auth } = require('./_lib');
// Lee y guarda bang/overrides.json en tu repo de GitHub (la app de TV lo descarga de ahi).
const REPO = () => process.env.GH_REPO || 'valenrosario/sub';
const PATH = () => process.env.GH_PATH || 'bang/overrides.json';
const api = () => `https://api.github.com/repos/${REPO()}/contents/${PATH()}`;
const headers = () => ({ // GH_TOKEN vacio => error claro

  Authorization: 'Bearer ' + process.env.GH_TOKEN,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'bang-admin',
});

async function current() {
  const r = await fetch(api() + '?ref=main', { headers: headers() });
  if (r.status === 404) return { data: { version: 1, items: {} }, sha: null };
  if (!r.ok) throw new Error('GitHub respondio ' + r.status + (r.status === 401 || r.status === 403 || r.status === 404 ? ' (revisa GH_TOKEN: debe tener acceso al repo sub con Contents: Read and write)' : ''));
  const j = await r.json();
  return { data: JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')), sha: j.sha };
}

module.exports = async (req, res) => {
  if (!auth(req, res)) return;
  try {
    if (req.method === 'GET') {
      const { data } = await current();
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const data = req.body;
      if (!data || typeof data !== 'object' || typeof data.items !== 'object') return res.status(400).json({ error: 'Formato invalido' });
      const text = JSON.stringify({ version: 1, items: data.items }, null, 1);
      if (text.length > 900000) return res.status(413).json({ error: 'Demasiado grande' });
      const { sha } = await current();
      const r = await fetch(api(), {
        method: 'PUT',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Bang admin: actualizar correcciones',
          content: Buffer.from(text).toString('base64'),
          branch: 'main',
          ...(sha ? { sha } : {}),
        }),
      });
      if (!r.ok) return res.status(502).json({ error: 'GitHub no dejo guardar (' + r.status + ')' });
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Metodo no permitido' });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};

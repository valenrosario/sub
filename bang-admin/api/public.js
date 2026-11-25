// Lectura publica (sin clave) de las correcciones: la app de TV pide esto. Cache corta => los cambios llegan en segundos.
const REPO = () => process.env.GH_REPO || 'valenrosario/sub';
const PATH = () => process.env.GH_PATH || 'bang/overrides.json';
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO()}/contents/${PATH()}?ref=main`, {
      headers: { Authorization: 'Bearer ' + process.env.GH_TOKEN, Accept: 'application/vnd.github.raw+json', 'User-Agent': 'bang-admin' },
    });
    if (r.status === 404) return res.status(200).json({ version: 1, items: {} });
    if (!r.ok) return res.status(502).json({ error: 'GitHub ' + r.status });
    const j = JSON.parse(await r.text());
    res.status(200).json(j);
  } catch (e) { res.status(502).json({ error: e.message }); }
};

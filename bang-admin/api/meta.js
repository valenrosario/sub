// Metadatos rapidos para la app de TV: una sola llamada a TMDB (token en el servidor), con cache en CDN.
const I = 'https://image.tmdb.org/t/p/';
const H = () => ({ Authorization: 'Bearer ' + process.env.TMDB_TOKEN, accept: 'application/json' });
const T = async (p, q = {}) => {
  const u = new URL('https://api.themoviedb.org/3' + p);
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: H() });
  if (r.status === 429) { await new Promise((z) => setTimeout(z, 700)); return T(p, q); }
  return r.ok ? r.json() : null;
};
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
async function resolve({ id = '', tmdb = '', q = '', year = '', type = 'series' }) {
    let kind = type === 'movie' ? 'movie' : 'tv', tid = String(tmdb).replace(/\D/g, '');
    if (!tid && /^tt\d+$/.test(id)) {
      const f = await T('/find/' + id, { external_source: 'imdb_id' });
      const m = f && ((kind === 'tv' ? f.tv_results : f.movie_results)[0] || f.tv_results[0] || f.movie_results[0]);
      if (m) { tid = m.id; kind = m.media_type || (f.tv_results.includes(m) ? 'tv' : 'movie'); }
    }
    if (!tid && q) {
      const s = await T('/search/multi', { query: q, language: 'es-MX' });
      const list = ((s && s.results) || []).filter((x) => x.media_type === 'tv' || x.media_type === 'movie');
      const nq = norm(q);
      const score = (x) => {
        const n = norm(x.name || x.title), o = norm(x.original_name || x.original_title);
        const y = String(x.first_air_date || x.release_date || '').slice(0, 4);
        return (n === nq || o === nq ? 3 : n.includes(nq) || nq.includes(n) ? 1 : 0) + (year && y && Math.abs(+y - +year) <= 1 ? 1 : 0) + (x.media_type === kind ? 0.5 : 0) + (x.popularity || 0) / 1e4;
      };
      list.sort((a, b) => score(b) - score(a));
      if (list[0] && score(list[0]) >= 1) { tid = list[0].id; kind = list[0].media_type; }
    }
    if (!tid) return null;
    const d = await T(`/${kind}/${tid}`, { language: 'es-MX', append_to_response: 'images,external_ids,content_ratings,release_dates', include_image_language: 'es,en,null' });
    if (!d) return null;
    const imgs = d.images || {};
    const pick = (a) => (a || []).slice().sort((x, y) => (y.vote_average || 0) - (x.vote_average || 0));
    const lg = pick(imgs.logos).find((x) => x.iso_639_1 === 'es') || pick(imgs.logos).find((x) => x.iso_639_1 === 'en') || pick(imgs.logos)[0];
    const bd = pick((imgs.backdrops || []).filter((x) => !x.iso_639_1))[0];
    const ps = pick((imgs.posters || []).filter((x) => x.iso_639_1 === 'es'))[0];
    return {
      type: kind === 'tv' ? 'series' : 'movie',
      tmdb: d.id,
      id: (d.external_ids && d.external_ids.imdb_id) || (d.imdb_id) || null,
      name: d.name || d.title,
      poster: d.poster_path ? I + 'w500' + (ps ? ps.file_path : d.poster_path) : null,
      background: bd ? I + 'w1280' + bd.file_path : d.backdrop_path ? I + 'w1280' + d.backdrop_path : null,
      logo: lg ? I + 'w500' + lg.file_path : null,
      releaseInfo: String(d.first_air_date || d.release_date || '').slice(0, 4),
      runtime: kind === 'movie' ? (d.runtime ? Math.floor(d.runtime / 60) + 'h ' + (d.runtime % 60) + 'min' : '') : '',
      seasons: d.number_of_seasons || 0,
      genres: (d.genres || []).map((g) => g.name),
      description: d.overview || '',
      imdbRating: d.vote_average ? d.vote_average.toFixed(1) : '',
    };
}
const safe = (x) => resolve(x).catch(() => null);
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'POST') {
      // lote: { items: [{q, year, type}] } -> [meta|null] en el mismo orden
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const items = (b.items || []).slice(0, 60), out = new Array(items.length).fill(null);
      let k = 0;
      await Promise.all(Array.from({ length: 12 }, async () => { while (k < items.length) { const i = k++; out[i] = await safe(items[i]); } }));
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(out);
    }
    if (req.query.trending) {
      const t = await T('/trending/all/week', { language: 'es-MX' });
      const out = ((t && t.results) || []).filter((x) => (x.media_type === 'tv' || x.media_type === 'movie') && x.poster_path).slice(0, 20).map((x) => ({
        title: x.name || x.title, type: x.media_type === 'tv' ? 'series' : 'movie', tmdb: x.id,
        year: String(x.first_air_date || x.release_date || '').slice(0, 4), poster: I + 'w342' + x.poster_path,
      }));
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json(out);
    }
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    const m = await safe(req.query);
    return m ? res.status(200).json(m) : res.status(404).json({ error: 'sin resultado' });
  } catch (e) { res.status(502).json({ error: e.message }); }
};

# Bang · Panel

Sitio para elegir posters, fondos, logos, títulos, sinopsis y fotos/nombres de capítulos desde TMDB.
Los cambios se guardan en `bang/overrides.json` (en este repo) y la app Bang de la TV los aplica por encima de lo que traen los plugins.

## Subirlo a Vercel (una sola vez)

1. En Vercel: **Add New → Project** → importá este repo (`valenrosario/sub`).
2. En **Root Directory** poné `bang-admin`. Framework: **Other**.
3. Antes de desplegar, cargá estas **Environment Variables**:

| Nombre | Qué es | Dónde se saca |
|---|---|---|
| `ADMIN_PASSWORD` | La clave para entrar al panel (elegila vos, larga) | La inventás |
| `TMDB_TOKEN` | "Token de acceso de lectura a la API" de TMDB | themoviedb.org → Ajustes → API |
| `GH_TOKEN` | Token de GitHub para guardar los cambios | GitHub → Settings → Developer settings → Fine-grained tokens. Repositorio: solo `sub`. Permiso: **Contents: Read and write** |

   (Opcionales, ya vienen con estos valores: `GH_REPO=valenrosario/sub`, `GH_PATH=bang/overrides.json`.)
4. **Deploy**. Entrá a la URL que te da Vercel e ingresá la clave.

## Cómo se usa

1. Buscá la serie o película por nombre.
2. Elegí póster, fondo y logo en las pestañas. Podés cambiar el título, la sinopsis y, en series, el nombre y la imagen de cada capítulo.
3. **Guardar**. La TV lo toma al abrir la app (hasta 5 minutos después, por la caché de GitHub).

Lo que no elijas sigue viniendo del plugin. "Quitar cambios" vuelve al original.

## Notas

- La clave de TMDB y el token de GitHub quedan solo en Vercel; el navegador nunca los ve.
- El panel pide la clave en cada llamada: sin ella no lee ni guarda nada.
- El código IMDb que aparece en pantalla se usa solo internamente para reconocer el título en la app.

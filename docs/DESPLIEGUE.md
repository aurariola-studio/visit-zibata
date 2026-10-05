# Despliegue

El sitio es 100 % estático: `npm run build` produce `dist/` y cualquier servidor de archivos lo sirve. No
hay backend, base de datos, variables secretas ni servicios de pago.

Desde la v4.6.0 el build escribe **232 páginas HTML** (una por ruta y por idioma), `sitemap.xml`,
`robots.txt` y `404.html`. Los archivos son planos (`dist/lugar/tomassa.html`), no carpetas con
índice, para que `/lugar/tomassa` se sirva directo y no haya que redirigir a `/lugar/tomassa/`.

## Estado actual (2026-10-04)

Código en <https://github.com/aurariola-studio/visit-zibata>. Alojamiento: **Cloudflare**, Worker con
assets estáticos llamado `visit-zibata`, en `visitzibata.com`.

No es un proyecto de Pages: Cloudflare está integrando Pages dentro de Workers y los sitios estáticos
nuevos se crean así. Para el sitio no cambia nada (los mismos archivos de `dist/`, el mismo
`_headers`), solo el comando de publicación.

## Publicar en Cloudflare

Se compila y se publica desde GitHub Actions, **no con la integración de Git de Cloudflare**. Es una
decisión deliberada: esa integración compila por su cuenta y no corre las pruebas, así que publicaría
igual con el presupuesto de peso roto, con axe en rojo o con los tests de CSP fallando. Las puertas de
este repositorio solo sirven si nada se publica sin pasarlas.

Preparación, una sola vez:

1. El Worker `visit-zibata` debe quedar **sin integración de Git**, o publicará dos veces y una de
   ellas sin pasar las puertas.
2. Crea un token de API con la plantilla **Edit Cloudflare Workers** y anota el **Account ID**.
3. En GitHub → Settings → Secrets and variables → Actions:
   - secreto `CLOUDFLARE_API_TOKEN`
   - secreto `CLOUDFLARE_ACCOUNT_ID`
   - variable `PAGES_SITE_URL` (opcional; por omisión `https://visitzibata.com/`)

A partir de ahí, cada push a `main` ejecuta `.github/workflows/deploy.yml`: `npm ci` → Gitleaks →
validación de datos → lint, tipos y tests → build → imágenes de vista previa → presupuesto de
rendimiento → humo E2E → `wrangler deploy`, que sube `dist/` como assets del Worker (ver
`wrangler.jsonc`). Si cualquier paso falla, no se publica nada.

El E2E de aquí es un **humo** (un proyecto, una base, unos siete minutos) y no la suite entera: la
matriz completa, con los cuatro navegadores y las dos bases, la corre `ci.yml` en el pull request y
es la que bloquea la fusión. Repetirla al publicar añadía media hora sin cubrir nada nuevo, y llegó
a tumbar un despliegue por una prueba sensible al tiempo que ya había pasado dos veces. El humo no
sobra, en cambio: al fusionar con squash, el commit que llega a `main` es un commit nuevo que nunca
existió en el pull request, y esto comprueba el artefacto exacto que se va a publicar.

El paso de imágenes va **después** del build y no antes: el build limpia `dist/`, así que unas
imágenes generadas primero desaparecerían sin dejar rastro y cada enlace compartido volvería a
mostrar la imagen de la portada. Los navegadores de Playwright se instalan antes del build porque
la composición de esas imágenes también usa Chromium.

Las acciones están fijadas por SHA y `wrangler` está fijado en el lockfile (Dependabot las actualiza).

La búsqueda de secretos usa el **binario** de Gitleaks con la versión fijada, no `gitleaks-action`:
esa acción exige clave de licencia cuando el repositorio vive en una organización, y desde el
traslado a `aurariola-studio` vive en una. El binario es el mismo escáner, MIT y sin clave. Si algún
día se prefiere volver a la acción, hace falta una clave de gitleaks.io en el secreto
`GITLEAKS_LICENSE`.

### Cabeceras

`dist/_headers` lo genera el build (plugin `zibata-headers` en `vite.config.ts`) a partir de la misma
constante que el `<meta>` de la CSP, para que no puedan divergir. Añade lo que un `<meta>` no puede
declarar: `frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy` y el
`Cache-Control` por tipo de archivo. El formato lo entienden tanto los Workers con assets estáticos
como Pages y Netlify.

### El 404

`wrangler.jsonc` fija `not_found_handling: "404-page"`: una ruta inexistente devuelve el `404.html`
que genera el build, no la portada. Sin eso, un *fallback* tipo SPA convertiría cualquier error de
tecleo en un 200 y Google indexaría basura. Desde que el enrutado salió del hash esto pasa de verdad:
ahí llegan los errores de tecleo en `/lugar/...` y el enlace guardado de un local que ya no se
publica. Hay pruebas E2E que lo comprueban en local, porque un plugin hace que `vite preview` sirva
ese archivo igual que el hosting; contra el sitio publicado conviene confirmarlo una vez con
`curl -I https://visitzibata.com/no-existe`.

## Requisitos del hosting

- **Peticiones `Range`** para PMTiles (GitHub Pages, Netlify, Cloudflare Pages, Vercel, S3, nginx…).
- **Sin *fallback* SPA**: existe un archivo por ruta, así que un camino inexistente debe responder
  404 con el `404.html` del build, no la portada con un 200.
- **Archivos servidos sin barra final añadida**: `/lugar/tomassa` debe entregar `lugar/tomassa.html`
  tal cual. Un hosting que redirija a `/lugar/tomassa/` mete un salto en cada enlace compartido.
- Tipos MIME correctos para `.pmtiles` (`application/octet-stream`), `.webmanifest` y `.woff2`.
- Nada más: ni reescrituras, ni cabeceras especiales, ni certificados propios.

## Publicar en otro servidor

```bash
npm run build                      # dist/ para servir en la raíz del dominio
BASE_PATH=/subdirectorio/ npm run build
SITE_URL=https://mi-dominio/ npm run build   # canonical, hreflang, sitemap y Open Graph absolutos
npm run images:og-places                     # después del build: dist/og/<slug>.jpg
```

`SITE_URL` ya no es solo cosa de Open Graph: de ahí salen el `canonical` y las `hreflang` de las 232
páginas y las URLs del `sitemap.xml`. Sin ella el build funciona, pero esos enlaces quedan relativos
y el sitemap no sirve para enviarlo a un buscador.

En Git Bash (Windows), exporta `MSYS_NO_PATHCONV=1` antes de pasar rutas como `BASE_PATH`.

## Cabeceras en otros hostings

En Cloudflare Pages y Netlify no hay que hacer nada: el build genera `dist/_headers` (ver arriba). En
un hosting que no lea ese archivo (nginx, Apache, S3 con CloudFront), hay que trasladar su contenido a
la configuración del servidor. El `<meta>` de la CSP sigue viajando en el HTML, así que un hosting sin
cabeceras conserva la política; lo que se pierde sin ellas es `frame-ancestors`, que un `<meta>` no
puede declarar.

## Verificación local de una publicación

```bash
SITE_URL=https://visitzibata.com/ npm run build
npm run images:og-places                         # después del build, que limpia dist/
npm run preview -- --port 4173 --strictPort     # sirve dist/ igual que en producción
npm run test:e2e                                 # E2E contra ese build
npm run perf:budget                              # presupuesto de peso
```

`vite preview` sirve el `404.html` del sitio porque el plugin `zibata-404` se lo pide; por omisión
responde un 404 vacío y la prueba de esa página no valdría nada.

Para comprobar el prerenderizado sin abrir el navegador:

```bash
curl -I http://localhost:4173/lugar/tomassa      # 200, sin redirección
curl -I http://localhost:4173/en/place/tomassa   # 200
curl -I http://localhost:4173/lugar/inventado    # 404
grep -c "<url>" dist/sitemap.xml                 # 232
```

Para imitar un hosting en subruta (404 reales, `Range`, 301 de directorios), este repositorio se probó
además con `BASE_PATH=/visit-zibata/` y un servidor estático estricto sobre `dist/`.

## Reversión

No hay migraciones ni estado: revertir es volver a publicar el commit anterior (`git revert` y push, o
re-ejecutar el workflow sobre la etiqueta previa). Los datos viven en el propio repositorio.

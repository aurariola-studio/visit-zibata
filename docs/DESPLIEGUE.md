# Despliegue

El sitio es 100 % estático: `npm run build` produce `dist/` y cualquier servidor de archivos lo sirve. No
hay backend, base de datos, variables secretas ni servicios de pago.

## Estado actual (2026-10-04)

Código en <https://github.com/JesusOrihuela/visit-zibata>. Alojamiento: **Cloudflare Pages**, proyecto
`visit-zibata`.

## Publicar en Cloudflare Pages

Se compila y se publica desde GitHub Actions, **no con la integración de Git de Cloudflare**. Es una
decisión deliberada: esa integración compila por su cuenta y no corre las pruebas, así que publicaría
igual con el presupuesto de peso roto, con axe en rojo o con los tests de CSP fallando. Las puertas de
este repositorio solo sirven si nada se publica sin pasarlas.

Preparación, una sola vez:

1. En Cloudflare, crea el proyecto de Pages `visit-zibata` **sin conectar Git** (Direct Upload). Si ya
   estaba conectado, desconéctalo o publicará dos veces y una de ellas sin pasar las puertas.
2. Crea un token de API con el permiso **Cloudflare Pages: Edit** y anota el **Account ID**.
3. En GitHub → Settings → Secrets and variables → Actions:
   - secreto `CLOUDFLARE_API_TOKEN`
   - secreto `CLOUDFLARE_ACCOUNT_ID`
   - variable `PAGES_SITE_URL`, con barra final (por ejemplo `https://visitzibata.com/`)

A partir de ahí, cada push a `main` ejecuta `.github/workflows/deploy.yml`: `npm ci` → validación de
datos → lint, tipos y tests → build → presupuesto de rendimiento → E2E (Chromium y WebKit) →
`wrangler pages deploy`. Si cualquier paso falla, no se publica nada.

Las acciones están fijadas por SHA y `wrangler` está fijado en el lockfile (Dependabot las actualiza).
En cuentas de organización, Gitleaks necesita `GITLEAKS_LICENSE`.

### Cabeceras

`dist/_headers` lo genera el build (plugin `zibata-headers` en `vite.config.ts`) a partir de la misma
constante que el `<meta>` de la CSP, para que no puedan divergir. Añade lo que un `<meta>` no puede
declarar: `frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy` y el
`Cache-Control` por tipo de archivo. El formato es el de Cloudflare Pages y Netlify.

## Requisitos del hosting

- **Peticiones `Range`** para PMTiles (GitHub Pages, Netlify, Cloudflare Pages, Vercel, S3, nginx…).
- **Sin *fallback* SPA**: las rutas de la app viven en el hash, así que un archivo inexistente debe
  responder 404 (el build genera `404.html`).
- Tipos MIME correctos para `.pmtiles` (`application/octet-stream`), `.webmanifest` y `.woff2`.
- Nada más: ni reescrituras, ni cabeceras especiales, ni certificados propios.

## Publicar en otro servidor

```bash
npm run build                      # dist/ para servir en la raíz del dominio
BASE_PATH=/subdirectorio/ npm run build
SITE_URL=https://mi-dominio/ npm run build   # URLs absolutas de Open Graph
```

En Git Bash (Windows), exporta `MSYS_NO_PATHCONV=1` antes de pasar rutas como `BASE_PATH`.

## Cabeceras en otros hostings

En Cloudflare Pages y Netlify no hay que hacer nada: el build genera `dist/_headers` (ver arriba). En
un hosting que no lea ese archivo (nginx, Apache, S3 con CloudFront), hay que trasladar su contenido a
la configuración del servidor. El `<meta>` de la CSP sigue viajando en el HTML, así que un hosting sin
cabeceras conserva la política; lo que se pierde sin ellas es `frame-ancestors`, que un `<meta>` no
puede declarar.

## Verificación local de una publicación

```bash
npm run build
npm run preview -- --port 4173 --strictPort     # sirve dist/ igual que en producción
npm run test:e2e                                 # E2E contra ese build
npm run perf:budget                              # presupuesto de peso
```

Para imitar GitHub Pages con más fidelidad (404 reales, `Range`, 301 de directorios), este repositorio se
probó además con un servidor estático estricto sobre `dist/` publicado en una subruta.

## Reversión

No hay migraciones ni estado: revertir es volver a publicar el commit anterior (`git revert` y push, o
re-ejecutar el workflow sobre la etiqueta previa). Los datos viven en el propio repositorio.

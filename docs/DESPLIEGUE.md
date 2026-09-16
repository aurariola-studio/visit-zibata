# Despliegue

El sitio es 100 % estático: `npm run build` produce `dist/` y cualquier servidor de archivos lo sirve. No
hay backend, base de datos, variables secretas ni servicios de pago.

## Estado actual (2026-09-15)

**La guía todavía no se ha publicado en internet.** Por decisión del propietario, la versión 1.0.0 se
etiqueta solo en local (sin repositorio remoto). Todo lo que se puede verificar sin publicar está
verificado; lo que no, se declara como no verificado en
[release/FINAL_REMEDIATION_CHECKLIST.md](release/FINAL_REMEDIATION_CHECKLIST.md):

| Comprobación | Estado |
| --- | --- |
| Build de producción en raíz y en subruta | Verificado |
| Servidor estático estricto tipo GitHub Pages (404 reales, `Range`, sin *fallback* SPA) | Verificado en local |
| Suite E2E contra el build, en raíz y en subruta | Verificado |
| Workflows de CI y de publicación | Revisados y con YAML válido; **no ejecutados en GitHub** |
| URL pública, HTTPS del hosting, caché real de GitHub Pages | **No verificado** |

## Publicar en GitHub Pages

1. Sube el repositorio a GitHub (rama `main`).
2. **Settings → Pages → Source: GitHub Actions**.
3. Cada push a `main` ejecuta `.github/workflows/deploy.yml`: `npm ci` → validación de datos → lint, tipos
   y tests → build → presupuesto de rendimiento → E2E (Chromium y WebKit) → publicación.

El sitio queda en `https://<usuario>.github.io/<repositorio>/`. Con dominio propio o repositorio
`<usuario>.github.io`, define las variables de repositorio `PAGES_BASE_PATH=/` y
`PAGES_SITE_URL=https://tu-dominio/`.

Las acciones están fijadas por SHA (Dependabot las actualiza). En cuentas de organización, Gitleaks
necesita `GITLEAKS_LICENSE`.

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

## Cabeceras recomendadas

La política de seguridad de contenido viaja en un `<meta>` del HTML (GitHub Pages no permite cabeceras
propias). Si el hosting sí las admite, conviene añadir:

```
Content-Security-Policy: <misma política que el <meta>; ver docs/SEGURIDAD.md>
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Frame-Ancestors / X-Frame-Options: DENY      (no se puede declarar en <meta>)
Cache-Control: public, max-age=31536000, immutable   para /assets/* (nombres con hash)
Cache-Control: no-cache                              para index.html y *.pmtiles
```

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

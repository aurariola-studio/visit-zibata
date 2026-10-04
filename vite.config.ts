import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import pkg from './package.json' with { type: 'json' }

// BASE_PATH permite publicar en un subdirectorio (GitHub Pages: "/<repo>/") sin acoplar el código a
// un hosting concreto. En local y en hostings en raíz es "/".
const base = process.env.BASE_PATH ?? '/'
// SITE_URL (opcional): URL pública absoluta, para que Open Graph use enlaces absolutos a la imagen.
const siteUrl = process.env.SITE_URL?.replace(/\/?$/, '/')

/** Open Graph exige URLs absolutas; sin SITE_URL se usan rutas relativas a la base. */
function socialMeta(): Plugin {
  return {
    name: 'zibata-social-meta',
    transformIndexHtml: {
      // Después del procesamiento de Vite, que ya antepone la base a la imagen.
      order: 'post',
      handler(html) {
        const prefix = siteUrl ?? base
        let result = html.replace(
          /(property="og:image" content=")[^"]*og-image\.png"/g,
          `$1${prefix}og-image.png"`,
        )
        if (siteUrl) {
          result = result.replace(
            '<meta property="og:type"',
            `<meta property="og:url" content="${siteUrl}" />\n    <link rel="canonical" href="${siteUrl}" />\n    <meta property="og:type"`,
          )
        }
        return result
      },
    },
  }
}

/**
 * Content Security Policy en `<meta>` (GitHub Pages no permite cabeceras propias). Solo en build: el
 * servidor de desarrollo inyecta estilos en línea para HMR. Todo es del propio origen salvo el envío
 * del formulario de sugerencias (api.web3forms.com, solo al pulsar enviar): sin CDN, sin analítica y
 * sin APIs externas al navegar; Google Maps solo se abre como enlace (navegación, no petición).
 * `blob:`/`data:` en imágenes y workers los usa MapLibre internamente. `frame-ancestors` no se puede
 * declarar en `<meta>`: requiere cabecera del hosting (ver docs/SECURITY.md).
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // Único destino externo: el envío de "Sugiere un cambio", y solo cuando la persona pulsa enviar.
  "connect-src 'self' https://api.web3forms.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'zibata-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
        )
      },
    },
  }
}

/**
 * 404.html estático para hostings como GitHub Pages: una ruta inexistente muestra una página propia (sin
 * JavaScript) con enlace a la guía, en vez de la página genérica del hosting.
 */
function notFoundPage(): Plugin {
  return {
    name: 'zibata-404',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Página no encontrada · Zibatá · Comer y beber</title>
    <link rel="icon" type="image/svg+xml" href="${base}favicon.svg" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; img-src 'self'" />
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 1.5rem;
        background: #f4efe6; color: #1f2419; font: 1rem/1.5 system-ui, sans-serif; text-align: center; }
      h1 { font-size: 1.5rem; margin: 0 0 .5rem; }
      a { display: inline-block; margin-top: 1rem; padding: .7rem 1.4rem; border-radius: 999px;
        background: #536c2a; color: #fff; font-weight: 600; text-decoration: none; }
      a:focus-visible { outline: 3px solid #1f2419; outline-offset: 3px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Esta página no existe</h1>
      <p>La dirección no corresponde a ninguna página de la guía.</p>
      <a href="${base}">Ir al mapa de Zibatá</a>
    </main>
  </body>
</html>
`,
      })
    },
  }
}

export default defineConfig({
  base,
  define: {
    // La versión publicada se muestra en "Acerca de": sale de package.json, no de una constante a mano.
    __APP_VERSION__: JSON.stringify(pkg.version),
    // El botón de compartir necesita la misma URL pública que Open Graph: si la guía se sirve a la
    // vez desde github.io y desde el dominio propio, sin esto cada quien compartiría el enlace del
    // sitio por el que entró y los enlaces entrantes de un mismo lugar se repartirían en dos URLs.
    // Vacía en desarrollo y en los tests, donde se usa la ubicación real del navegador.
    __SITE_URL__: JSON.stringify(siteUrl ?? ''),
  },
  // Sin fallback a index.html, igual que GitHub Pages: un asset inexistente responde 404 también en
  // `vite preview` y en los tests E2E (las rutas de la app viven en el hash).
  appType: 'mpa',
  plugins: [react(), socialMeta(), contentSecurityPolicy(), notFoundPage()],
  build: {
    target: 'es2022',
    // MapLibre (~800 KB min) vive en su propio chunk diferido; el aviso por defecto no aporta.
    chunkSizeWarningLimit: 1100,
  },
  test: {
    // Lógica pura en Node (rápido); los tests de componentes declaran `@vitest-environment jsdom`.
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    css: false,
  },
})

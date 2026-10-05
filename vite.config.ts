import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import pkg from './package.json' with { type: 'json' }
import { APP_ROUTE } from './src/lib/url-state.ts'

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
 * 404.html propio. Lo sirve el hosting cuando una ruta no existe, y desde que el enrutado salió del
 * hash eso pasa de verdad: un error de tecleo en `/lugar/...` o el enlace guardado de un local que
 * ya cerró llegan aquí. Antes era un texto suelto de cuando el proyecto no tenía identidad.
 *
 * Sin JavaScript y con el estilo en línea a propósito: es la página que aparece cuando algo falla,
 * así que no debe depender de que el resto cargue. Lo único externo es el símbolo, que es un
 * archivo del propio sitio.
 *
 * Va en los dos idiomas, porque una ruta que no existe no dice en cuál estaba la persona.
 */
function notFoundPage(): Plugin {
  let outDir = 'dist'
  return {
    name: 'zibata-404',
    // Build y preview, no desarrollo. `vite preview` resuelve la configuración como `serve`, así
    // que con `apply: 'build'` el plugin quedaba fuera y `configurePreviewServer` nunca corría.
    apply: (_config, env) => env.command === 'build' || env.isPreview === true,
    configResolved(config) {
      // `resolve` porque `outDir` puede venir relativo a la raíz del proyecto o ya absoluto.
      outDir = resolve(config.root, config.build.outDir)
    },
    /**
     * `vite preview` responde un 404 vacío en vez de servir esta página, así que sin esto la suite
     * E2E no podría comprobar lo que ve de verdad quien escribe mal un enlace.
     *
     * La función devuelta se registra justo después del middleware de reserva de Vite, que ya ha
     * traducido `/lugar/tomassa` a `/lugar/tomassa.html` si ese archivo existe, pero todavía no ha
     * respondido. Por eso "la ruta acaba en .html" equivale a "hay página": cuando no la hay, el
     * camino llega tal cual se pidió y toca contestar aquí.
     */
    configurePreviewServer(server) {
      return () => {
        server.middlewares.use((req, res, next) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') return next()
          if (!req.headers.accept?.includes('text/html')) return next()
          const path = (req.url ?? '/').split('?')[0] ?? '/'
          if (path.endsWith('.html')) return next()
          const page = resolve(outDir, '404.html')
          if (!existsSync(page)) return next()
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(req.method === 'HEAD' ? undefined : readFileSync(page))
        })
      }
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex" />
    <title>Página no encontrada · Visit Zibatá</title>
    <link rel="icon" type="image/svg+xml" href="${base}favicon.svg" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; img-src 'self'" />
    <style>
      :root { --olivo: #536c2a; --tinta: #1f2419; --apagado: #62655a; --papel: #f8f4ed; }
      * { box-sizing: border-box; margin: 0; }
      body { min-height: 100svh; display: grid; place-items: center; padding: 1.5rem;
        background: var(--papel); color: var(--tinta); text-align: center;
        font: 1rem/1.55 "Instrument Sans", ui-sans-serif, system-ui, sans-serif; }
      /* La misma trama de puntos del resto de la marca, muy tenue. */
      body::before { content: ""; position: fixed; inset: 0; pointer-events: none;
        background-image: radial-gradient(var(--olivo) 1px, transparent 1px);
        background-size: 26px 26px; opacity: .07; }
      main { position: relative; max-width: 30rem; display: grid; justify-items: center; gap: .75rem; }
      img { width: 72px; height: 72px; }
      h1 { font-family: "Fraunces", "Iowan Old Style", Georgia, serif; font-weight: 600;
        font-size: 1.75rem; line-height: 1.15; letter-spacing: -.01em; margin-top: .5rem; }
      p { color: var(--apagado); }
      .en { font-size: .875rem; }
      a { margin-top: 1.25rem; padding: .75rem 1.5rem; border-radius: 999px;
        background: var(--olivo); color: #fff; font-weight: 600; text-decoration: none; }
      a:hover { background: #435a22; }
      a:focus-visible { outline: 3px solid var(--tinta); outline-offset: 3px; }
      @media (prefers-reduced-motion: no-preference) { a { transition: background-color .15s; } }
    </style>
  </head>
  <body>
    <main>
      <img src="${base}logo.svg" alt="" width="72" height="72" />
      <h1>Esta página no existe</h1>
      <p>La dirección no corresponde a ningún lugar ni zona de la guía. Puede que esté mal escrita, o que ese lugar ya no esté publicado.</p>
      <p class="en" lang="en">This address is not part of the guide.</p>
      <a href="${base}">Ir a la guía</a>
    </main>
  </body>
</html>
`,
      })
    },
  }
}

/**
 * `_headers` para Cloudflare Pages (y Netlify, que usa el mismo formato).
 *
 * La política de seguridad sale de la MISMA constante que el `<meta>`, a propósito: cuando las dos
 * existen, el navegador aplica la intersección, así que si se tocara una y no la otra el resultado
 * sería un bloqueo difícil de diagnosticar. Se mantienen las dos porque el `<meta>` sigue haciendo
 * falta en un hosting que no sirva cabeceras, y la cabecera añade lo que un `<meta>` no puede
 * declarar: `frame-ancestors` (ver docs/SEGURIDAD.md).
 *
 * El `Cache-Control` va por tipo: los assets llevan hash en el nombre y son inmutables, mientras que
 * el HTML y el manifiesto deben revalidarse o un despliegue nuevo tardaría un día en verse. Las
 * teselas cambian solo cuando se regenera el mapa.
 */
function cloudflareHeaders(): Plugin {
  return {
    name: 'zibata-headers',
    apply: 'build',
    generateBundle() {
      const csp = `${CONTENT_SECURITY_POLICY}; frame-ancestors 'none'`
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: `# Generado por vite.config.ts (plugin zibata-headers). No editar a mano.
/*
  Content-Security-Policy: ${csp}
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  Cross-Origin-Opener-Policy: same-origin
  # La ubicación solo se usa al pulsar el botón de centrar el mapa; lo demás se niega de raíz.
  Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=(), usb=()

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/map/*
  Cache-Control: public, max-age=86400

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/site.webmanifest
  Cache-Control: public, max-age=3600
`,
      })
    },
  }
}

/**
 * En desarrollo, las rutas de la aplicación entregan `index.html`.
 *
 * En producción existe un archivo por ruta (lo genera el prerenderizado), pero aquí no, y el modo
 * `mpa` está puesto a propósito para que un camino inventado responda 404 de verdad, como hará el
 * servidor real. Esta pasarela reconoce **solo** las rutas que la aplicación sirve, así que un
 * error de tecleo sigue dando 404 mientras se desarrolla, igual que en producción.
 */
function devRoutes(): Plugin {
  return {
    name: 'zibata-dev-routes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = (req.url ?? '/').split('?')[0] ?? '/'
        const relative = path.startsWith(base) ? path.slice(base.length) : path.replace(/^\//, '')
        if (APP_ROUTE.test(relative.replace(/\/$/, ''))) req.url = base
        next()
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
  plugins: [
    react(),
    devRoutes(),
    socialMeta(),
    contentSecurityPolicy(),
    notFoundPage(),
    cloudflareHeaders(),
  ],
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

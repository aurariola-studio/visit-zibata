/**
 * El cargador que viaja dentro del HTML, antes de que arranque la aplicación.
 *
 * Es el mismo dibujo que `MapLoader` en su variante `pantalla`: el símbolo de la guía en gris y la
 * frase "Preparando Zibatá". Va en línea, con su CSS, porque tiene que pintarse antes de que llegue
 * el CSS externo: si dependiera de una petición, el primer fotograma sería el artículo del fallback
 * en crudo.
 *
 * El artículo no se toca: sigue detrás, para los rastreadores y para quien no tiene JavaScript. Con
 * JavaScript, este cargador lo cubre y React lo retira al montar, porque `createRoot` vacía `#root`.
 *
 * El CSS es el mismo que el de `.fullscreenState` y `MapLoader` (ver `Experience.module.css` y
 * `MapLoader.module.css`); si cambian los tokens de arena o el tamaño del símbolo, hay que cambiarlo
 * aquí también. Las dos huellas de la CSP salen de este mismo texto, así que el hash y el bloque no
 * pueden separarse.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { en } from '../../src/i18n/en.ts'
import { es } from '../../src/i18n/es.ts'

const CATALOGOS = { es, en } as const

export const CSS_CARGADOR = [
  'body{margin:0;height:100%;overflow:hidden}',
  '.cargador{',
  'position:fixed;inset:0;z-index:10;',
  'display:grid;justify-items:center;align-content:center;gap:1rem;padding:1.5rem;',
  'background:radial-gradient(90% 60% at 50% 40%,#fcfaf6,transparent),#f1ebe0;',
  'font-family:"Special Gothic",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;',
  '}',
  '.cargador .marca{position:relative;display:block;width:6rem;height:6rem}',
  '.cargador .marca svg{position:absolute;inset:0;width:100%;height:100%}',
  '.cargador .gris{filter:grayscale(1);opacity:.45}',
  /* El agua empieza a subir: la misma franja del 4 % con la que arranca `MapLoader`. */
  '.cargador .color{-webkit-mask-image:linear-gradient(to top,#000 4%,transparent 4%);mask-image:linear-gradient(to top,#000 4%,transparent 4%)}',
  '.cargador p{margin:0;font-size:.875rem;line-height:1.5;color:#62655a}',
  '.cargador .oculto{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}',
].join('')

/** Sin JavaScript el cargador no tiene a quién esperar: se esconde y queda el artículo, que además
 * tiene que poder desplazarse (el cuerpo de la app vive con `overflow: hidden`). */
export const CSS_SIN_JS = '.cargador{display:none}body{overflow:auto}'

const huella = (css: string): string =>
  `'sha256-${createHash('sha256').update(css, 'utf8').digest('base64')}'`

export const HUELLA_CARGADOR = huella(CSS_CARGADOR)
export const HUELLA_SIN_JS = huella(CSS_SIN_JS)

/** El símbolo se lee una vez y se repite en las 234 páginas del build. */
let simbolo: string | undefined

/**
 * El símbolo sin la etiqueta que lo envuelve ni su `<title>`, para meterlo en el HTML. Se lee al
 * generar, no al cargar el módulo: así la configuración de Vite puede importar las huellas sin tocar
 * el disco.
 */
function leerSimbolo(): string {
  if (simbolo) return simbolo
  const svg = readFileSync(resolve(process.cwd(), 'public/simbolo.svg'), 'utf8')
  const abre = svg.indexOf('<svg')
  const cierra = svg.lastIndexOf('</svg>')
  simbolo = svg
    .slice(svg.indexOf('>', abre) + 1, cierra)
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .trim()
  return simbolo
}

/** El cargador, en el idioma de la página: el prerender sabe cuál es antes de escribir el HTML. */
export function htmlCargador(locale: 'es' | 'en'): string {
  const copy = CATALOGOS[locale]
  const simbolo = leerSimbolo()
  return (
    '<div class="cargador" role="status">' +
    '<span class="marca" aria-hidden="true">' +
    `<svg class="gris" viewBox="0 0 256 256">${simbolo}</svg>` +
    `<svg class="color" viewBox="0 0 256 256">${simbolo}</svg>` +
    '</span>' +
    `<p aria-hidden="true">${copy['map.loading.preparing']}</p>` +
    `<span class="oculto">${copy['map.loading']}</span>` +
    '</div>'
  )
}

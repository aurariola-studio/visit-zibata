import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PREFIX, ROUTE_FAMILIES, SEGMENTS } from '../src/lib/url-state.ts'

/**
 * El despliegue tiene su propia lista de rutas y no puede importarla: `wrangler.jsonc` es configuración
 * del proveedor, no código. Esta prueba es lo que impide que las dos se separen, y el fallo que evita
 * es silencioso: una ruta que no entra en `run_worker_first` se sirve igual, pero sin pasar por las
 * redirecciones ni por el contador.
 *
 * Se lee el JSON ya interpretado y no el texto: buscar una cadena en el archivo daba verde con la ruta
 * escrita dentro de un comentario o de otra clave.
 */

/** Quita los comentarios `//` y `/* *\/` de un JSONC sin tocar lo que va dentro de cadenas. */
function sinComentarios(texto: string): string {
  let salida = ''
  let i = 0
  while (i < texto.length) {
    const c = texto[i] as string
    const siguiente = texto[i + 1]
    if (c === '"') {
      let j = i + 1
      while (j < texto.length && texto[j] !== '"') j += texto[j] === '\\' ? 2 : 1
      salida += texto.slice(i, j + 1)
      i = j + 1
    } else if (c === '/' && siguiente === '/') {
      while (i < texto.length && texto[i] !== '\n') i++
    } else if (c === '/' && siguiente === '*') {
      const fin = texto.indexOf('*/', i + 2)
      i = fin === -1 ? texto.length : fin + 2
    } else {
      salida += c
      i++
    }
  }
  return salida
}

interface Configuracion {
  workers_dev?: boolean
  preview_urls?: boolean
  vars?: Record<string, string>
  assets?: { run_worker_first?: string[]; not_found_handling?: string }
}

const configuracion = JSON.parse(
  sinComentarios(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8')),
) as Configuracion
const rutas = configuracion.assets?.run_worker_first ?? []

describe('las rutas del despliegue cubren las de la aplicación', () => {
  it('cada familia, en cada idioma, está en run_worker_first', () => {
    for (const [locale, words] of Object.entries(SEGMENTS)) {
      for (const familia of ROUTE_FAMILIES) {
        const patron = `/${PREFIX[locale as keyof typeof PREFIX]}/${words[familia]}/*`
        expect(rutas, `${locale}/${familia}`).toContain(patron)
      }
      // La raíz del árbol de cada idioma también pasa por el Worker, para sus redirecciones, y con
      // barra final incluida: sin ella, `/es/` no entra y el servidor de assets contesta un 307.
      expect(rutas, `${locale} raíz`).toContain(`/${PREFIX[locale as keyof typeof PREFIX]}`)
      expect(rutas, `${locale} raíz con barra`).toContain(
        `/${PREFIX[locale as keyof typeof PREFIX]}/`,
      )
    }
  })

  it('las direcciones de antes del prefijo siguen pasando por el Worker', () => {
    for (const palabra of Object.values(SEGMENTS.es)) {
      expect(rutas, palabra).toContain(`/${palabra}/*`)
    }
    expect(rutas).toContain('/')
  })

  it('la API pasa por el Worker y la 404 es la del build, no una reserva de SPA', () => {
    expect(rutas).toContain('/api/*')
    expect(configuracion.assets?.not_found_handling).toBe('404-page')
  })
})

describe('lo que el despliegue no debe exponer', () => {
  it('el Worker solo se sirve en el dominio: ni workers.dev ni URL de vista previa', () => {
    // Esos nombres de host no los cubren ni Access ni la regla de límite de peticiones.
    expect(configuracion.workers_dev).toBe(false)
    expect(configuracion.preview_urls).toBe(false)
  })

  it('ninguna variable versionada abre el panel ni lleva un testigo', () => {
    const nombres = Object.keys(configuracion.vars ?? {})
    expect(nombres).not.toContain('PANEL_ABIERTO')
    expect(nombres).not.toContain('GITHUB_TOKEN')
    // La rama del panel nunca es una rama de producción.
    expect(configuracion.vars?.GITHUB_RAMA).toBe('panel-contenido')
  })

  it('el flag de desarrollo solo está en el script local, no en ningún archivo de despliegue', () => {
    const paquete = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as {
      scripts: Record<string, string>
    }
    const usan = Object.entries(paquete.scripts)
      .filter(([, orden]) => orden.includes('PANEL_ABIERTO'))
      .map(([nombre]) => nombre)
    expect(usan).toEqual(['worker:dev'])
    for (const archivo of ['deploy.yml', 'ci.yml']) {
      const texto = readFileSync(
        new URL(`../.github/workflows/${archivo}`, import.meta.url),
        'utf8',
      )
      expect(texto, archivo).not.toContain('PANEL_ABIERTO')
    }
  })
})

describe('el workflow de despliegue', () => {
  const texto = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8')

  it('solo publica desde main, también al lanzarlo a mano', () => {
    expect(texto).toContain("if: github.ref == 'refs/heads/main'")
  })

  it('el checkout no deja el token de git a disposición del resto de pasos', () => {
    expect(texto).toContain('persist-credentials: false')
  })

  it('ninguna variable del repositorio se interpola en un script del paso con el token', () => {
    const paso = texto.slice(texto.indexOf('name: Publicar en Cloudflare'))
    expect(paso).not.toMatch(/run:[\s\S]*\$\{\{\s*vars\./)
  })
})

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  ENTRADAS,
  guardarSnapshot,
  huella,
  restaurar,
  rutaDeSnapshot,
  tamanoDeSnapshot,
} from './preparar.ts'

let raiz = ''
const crudo = () => join(raiz, 'raw')
const snapshot = () => join(raiz, 'snapshot')

/** Entradas de mentira: contenido distinto en cada una, y repetido para que el gzip sí comprima. */
function escribirCrudo(sufijo = ''): void {
  mkdirSync(crudo(), { recursive: true })
  for (const entrada of ENTRADAS) {
    writeFileSync(join(crudo(), entrada.crudo), `${entrada.crudo}${sufijo}`.repeat(200))
  }
}

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'mapa-'))
})
afterEach(() => rmSync(raiz, { recursive: true, force: true }))

describe('el snapshot de las extracciones crudas', () => {
  it('ida y vuelta: lo que se guarda es lo que se restaura, byte a byte', () => {
    escribirCrudo()
    guardarSnapshot(crudo(), snapshot())
    rmSync(crudo(), { recursive: true })
    expect(restaurar(snapshot(), crudo())).toBe(ENTRADAS.length)
    for (const entrada of ENTRADAS) {
      expect(readFileSync(join(crudo(), entrada.crudo), 'utf8')).toBe(entrada.crudo.repeat(200))
    }
  })

  it('comprime lo grande y deja tal cual lo que ya lo está o se lee a ojo', () => {
    escribirCrudo()
    guardarSnapshot(crudo(), snapshot())
    for (const entrada of ENTRADAS) {
      const guardado = readFileSync(rutaDeSnapshot(entrada, snapshot()))
      if (entrada.gz) expect(guardado.length).toBeLessThan(entrada.crudo.length * 200)
      else expect(guardado.toString('utf8')).toBe(entrada.crudo.repeat(200))
    }
    expect(ENTRADAS.filter((entrada) => entrada.gz).length).toBeGreaterThan(0)
  })

  it('no reescribe lo que ya es igual: restaurar dos veces seguidas no toca nada', () => {
    escribirCrudo()
    guardarSnapshot(crudo(), snapshot())
    expect(restaurar(snapshot(), crudo())).toBe(0)
  })

  it('pisa una extracción local que no coincide con el snapshot: manda el snapshot', () => {
    escribirCrudo()
    guardarSnapshot(crudo(), snapshot())
    writeFileSync(join(crudo(), 'osm.json'), 'otra versión que alguien bajó a mano')
    expect(restaurar(snapshot(), crudo())).toBe(1)
    expect(readFileSync(join(crudo(), 'osm.json'), 'utf8')).toBe('osm.json'.repeat(200))
  })

  it('el mismo contenido da el mismo archivo: el gzip no lleva fecha', () => {
    escribirCrudo()
    guardarSnapshot(crudo(), snapshot())
    const primero = readFileSync(join(snapshot(), 'osm.json.gz'))
    guardarSnapshot(crudo(), snapshot())
    expect(readFileSync(join(snapshot(), 'osm.json.gz')).equals(primero)).toBe(true)
  })

  it('si falta una pieza, dice cuál y cómo arreglarlo, en vez de fallar a medias', () => {
    escribirCrudo()
    guardarSnapshot(crudo(), snapshot())
    rmSync(join(snapshot(), 'osm.json.gz'))
    expect(() => restaurar(snapshot(), crudo())).toThrow(/osm\.json\.gz.*map:snapshot/)
    rmSync(crudo(), { recursive: true })
    expect(() => guardarSnapshot(crudo(), snapshot())).toThrow(/map:fetch/)
  })

  it('el snapshot del repositorio está completo y no crece sin que se vea', () => {
    const real = fileURLToPath(new URL('../../data/geographic/snapshot', import.meta.url))
    for (const entrada of ENTRADAS) {
      expect(() => readFileSync(rutaDeSnapshot(entrada, real)), entrada.crudo).not.toThrow()
    }
    // Unos 4 MB comprimidos. Un salto grande es un dato nuevo que conviene mirar antes de aceptar.
    expect(tamanoDeSnapshot(real)).toBeLessThan(8 * 1024 * 1024)
  })
})

describe('la marca que decide si hay que regenerar', () => {
  it('cambia con el contenido de cualquiera de los archivos', () => {
    const a = join(raiz, 'a.json')
    const b = join(raiz, 'b.json')
    writeFileSync(a, '1')
    writeFileSync(b, '2')
    const inicial = huella([a, b])
    expect(huella([a, b])).toBe(inicial)
    writeFileSync(b, '3')
    expect(huella([a, b])).not.toBe(inicial)
  })

  it('depende del nombre y del orden: no confunde dos archivos que intercambian contenido', () => {
    const a = join(raiz, 'a.json')
    const b = join(raiz, 'b.json')
    writeFileSync(a, '1')
    writeFileSync(b, '2')
    const antes = huella([a, b])
    writeFileSync(a, '2')
    writeFileSync(b, '1')
    expect(huella([a, b])).not.toBe(antes)
  })

  it('un archivo que no existe cuenta como ausente y no rompe', () => {
    const a = join(raiz, 'a.json')
    writeFileSync(a, '1')
    expect(huella([a, join(raiz, 'no-existe.json')])).toHaveLength(64)
  })
})

describe('los ajustes de edificios invalidan la marca', () => {
  it('el archivo de ajustes está entre lo que decide si hay que regenerar el mapa', async () => {
    const { readFileSync } = await import('node:fs')
    const codigo = readFileSync(new URL('./preparar.ts', import.meta.url), 'utf8')
    expect(codigo).toContain('paths.ajustesEdificios')
  })
})

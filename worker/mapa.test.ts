import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import configJson from '../data/geographic/config.json' with { type: 'json' }
import { atenderApi, type EntornoApi } from './api.ts'
import type { Base } from './cuenta.ts'
import { comparar, situacion, versionDelMapa, versionesDelListado } from './mapa.ts'

/** Lo que devuelve S3 con delimitador: una carpeta por versión, más ruido que no es una versión. */
const listado = (...versiones: string[]) =>
  `<?xml version="1.0"?><ListBucketResult><Name>overturemaps-us-west-2</Name><Prefix>release/</Prefix>
  <IsTruncated>false</IsTruncated>${versiones
    .map((v) => `<CommonPrefixes><Prefix>release/${v}/</Prefix></CommonPrefixes>`)
    .join('')}</ListBucketResult>`

/** Una respuesta real del bucket (2026-11-09), tal cual: el parser se prueba contra lo que S3 de verdad manda. */
const REAL = readFileSync(new URL('./fixtures/overture-listado.xml', import.meta.url), 'utf8')

describe('versionesDelListado', () => {
  it('entiende la respuesta real de S3', () => {
    expect(versionesDelListado(REAL)).toEqual(['2026-09-23.0', '2026-09-23.1', '2026-10-21.0'])
    expect(REAL).toContain('<IsTruncated>false</IsTruncated>')
  })

  it('saca las versiones, ordenadas, sin repetir y sin lo que no tiene su forma', () => {
    const xml = listado(
      '2026-10-21.0',
      '2026-09-23.1',
      '2026-09-23.0',
      '2026-10-21.0',
      'latest.txt',
    )
    expect(versionesDelListado(xml)).toEqual(['2026-09-23.0', '2026-09-23.1', '2026-10-21.0'])
  })

  it('un listado sin carpetas da una lista vacía', () => {
    expect(versionesDelListado(listado())).toEqual([])
    expect(versionesDelListado('no es xml')).toEqual([])
  })
})

describe('comparar', () => {
  it('ordena por fecha y, dentro de una fecha, por número y no como texto', () => {
    expect(comparar('2026-09-23.0', '2026-10-21.0')).toBeLessThan(0)
    expect(comparar('2026-10-21.10', '2026-10-21.9')).toBeGreaterThan(0)
    expect(comparar('2026-10-21.1', '2026-10-21.1')).toBe(0)
  })
})

describe('situacion', () => {
  const disponibles = ['2026-09-23.0', '2026-09-23.1', '2026-10-21.0']

  it('al día si la fijada es la última', () => {
    expect(situacion('2026-10-21.0', disponibles)).toMatchObject({
      estado: 'al-dia',
      ultima: '2026-10-21.0',
    })
  })

  it('hay una nueva si Overture lista una posterior', () => {
    expect(situacion('2026-09-23.1', disponibles)).toMatchObject({
      estado: 'hay-nueva',
      fijada: '2026-09-23.1',
      ultima: '2026-10-21.0',
    })
  })

  it('una nueva con el mismo día pero otro número también cuenta', () => {
    expect(situacion('2026-10-21.0', [...disponibles, '2026-10-21.1']).estado).toBe('hay-nueva')
  })

  it('la fijada que Overture ya no lista se dice, aunque haya una más nueva', () => {
    expect(situacion('2026-07-01.0', disponibles)).toMatchObject({
      estado: 'fijada-retirada',
      ultima: '2026-10-21.0',
    })
  })

  it('sin versiones listadas no afirma nada', () => {
    expect(situacion('2026-10-21.0', []).estado).toBe('desconocido')
  })
})

describe('versionDelMapa con GitHub y Overture simulados', () => {
  const REPO = 'dueno/repositorio'
  const entorno = { GITHUB_REPO: REPO, GITHUB_TOKEN: 'testigo-falso' }

  /** GitHub devolviendo un `config.json` con la versión dada (o ninguno). */
  function conConfig(config: unknown | null) {
    const llamadas: string[] = []
    vi.stubGlobal('fetch', async (url: string | URL | Request) => {
      const ruta = String(url)
      llamadas.push(ruta)
      if (!ruta.includes('/contents/data/geographic/config.json?ref=main')) {
        throw new Error(`llamada inesperada: ${ruta}`)
      }
      if (config === null) return new Response('{}', { status: 404 })
      return new Response(
        JSON.stringify({
          encoding: 'base64',
          content: Buffer.from(JSON.stringify(config)).toString('base64'),
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    })
    return { llamadas, restaurar: () => vi.unstubAllGlobals() }
  }
  const overture = (cuerpo: string, estado = 200) =>
    (async () => new Response(cuerpo, { status: estado })) as unknown as typeof fetch

  it('lee la fijada de main y la compara con el listado', async () => {
    const { llamadas, restaurar } = conConfig({ sources: { overtureRelease: '2026-09-23.1' } })
    try {
      const r = await versionDelMapa(entorno, overture(listado('2026-09-23.1', '2026-10-21.0')))
      expect(r).toEqual({ estado: 'hay-nueva', fijada: '2026-09-23.1', ultima: '2026-10-21.0' })
      expect(llamadas).toHaveLength(1)
    } finally {
      restaurar()
    }
  })

  it('el config.json real del repositorio se entiende', async () => {
    const { restaurar } = conConfig(configJson)
    try {
      const fijada = configJson.sources.overtureRelease
      const r = await versionDelMapa(entorno, overture(listado(fijada)))
      expect(r).toMatchObject({ estado: 'al-dia', fijada, ultima: fijada })
    } finally {
      restaurar()
    }
  })

  it('con la respuesta real de S3: al día con la última y con una nueva pendiente con la anterior', async () => {
    for (const [fijada, estado] of [
      ['2026-10-21.0', 'al-dia'],
      ['2026-09-23.1', 'hay-nueva'],
    ] as const) {
      const { restaurar } = conConfig({ sources: { overtureRelease: fijada } })
      try {
        const r = await versionDelMapa(entorno, overture(REAL))
        expect(r).toEqual({ estado, fijada, ultima: '2026-10-21.0' })
      } finally {
        restaurar()
      }
    }
  })

  it('un config.json ilegible, sin versión o con una que no tiene su forma es "desconocido"', async () => {
    for (const config of [null, {}, { sources: {} }, { sources: { overtureRelease: 'latest' } }]) {
      const { restaurar } = conConfig(config)
      try {
        const r = await versionDelMapa(entorno, overture(listado('2026-10-21.0')))
        expect(r.estado).toBe('desconocido')
        expect(r.fijada).toBeNull()
      } finally {
        restaurar()
      }
    }
  })

  it('un fallo de Overture se dice y deja la fijada a la vista', async () => {
    const { restaurar } = conConfig({ sources: { overtureRelease: '2026-10-21.0' } })
    try {
      const caido = await versionDelMapa(entorno, overture('error', 503))
      expect(caido).toMatchObject({ estado: 'desconocido', fijada: '2026-10-21.0', ultima: null })
      expect(caido.motivo).toContain('503')

      const sinRed = await versionDelMapa(entorno, (async () => {
        throw new Error('sin red')
      }) as unknown as typeof fetch)
      expect(sinRed).toMatchObject({ estado: 'desconocido', fijada: '2026-10-21.0' })
    } finally {
      restaurar()
    }
  })

  it('un listado cortado no se toma por completo', async () => {
    const { restaurar } = conConfig({ sources: { overtureRelease: '2026-10-21.0' } })
    try {
      const cortado = listado('2026-10-21.0').replace(
        '<IsTruncated>false</IsTruncated>',
        '<IsTruncated>true</IsTruncated>',
      )
      expect((await versionDelMapa(entorno, overture(cortado))).estado).toBe('desconocido')
    } finally {
      restaurar()
    }
  })
})

describe('la ruta', () => {
  const sinAccess = { ANALITICA: {} as Base } as EntornoApi

  it('un anónimo recibe 403 y no se consulta nada', async () => {
    const respuesta = await atenderApi(
      new Request('https://visitzibata.com/api/panel/mapa/version'),
      sinAccess,
    )
    expect(respuesta?.status).toBe(403)
  })

  it('solo atiende GET', async () => {
    const respuesta = await atenderApi(
      new Request('http://localhost:8787/api/panel/mapa/version', {
        method: 'POST',
        headers: { 'sec-fetch-site': 'same-origin' },
        body: '{}',
      }),
      { PANEL_ABIERTO: 'si', ANALITICA: {} as Base } as EntornoApi,
    )
    expect(respuesta?.status).not.toBe(200)
  })
})

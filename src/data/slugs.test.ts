import { describe, expect, it } from 'vitest'
import lugaresJson from '../../data/commercial/places.json' with { type: 'json' }
import redirectsJson from '../../data/commercial/redirects.json' with { type: 'json' }

/**
 * La dirección de un local sigue al nombre completo que el negocio se da (docs/DATOS.md):
 *
 *  - el nombre sin acentos ni apóstrofos y sin "y" ni "and": "Romani Pizzas y Ensaladas" es `romani-pizzas-ensaladas`;
 *  - "Zibatá" no va en el link, y se va con la zona que lo precede ("Paseo", "Centro", "Xentric"): "Ramen Express Paseo
 *    Zibatá" es `ramen-express`;
 *  - con varias sucursales, todas llevan el sufijo de su zona (`sinforosa-cafe-paseo-zibata` y `sinforosa-cafe-anahuac`);
 *  - el nombre sigue la misma idea: lleva la zona ("Starbucks Centro Zibatá", "Starbucks Anáhuac") solo si el negocio tiene varias
 *    sucursales, y entonces todas la llevan. Una sucursal única no lleva "Zibatá" ni la zona.
 *
 * Solo cuentan los locales visibles: uno cerrado y oculto no hace "varias" a las demás.
 *
 * La primera investigación había pegado la zona o la ciudad a muchos slugs que no la necesitaban, y había quitado el descriptor
 * a otros (`rometta` para "Rometta Gastrobar"). Se corrigieron a mano en tres tandas: sin esta prueba, el siguiente local nuevo
 * con una dirección que no sigue la regla se colaría sin que nadie lo viera.
 *
 * Recorre los datos reales y no nombra ningún negocio, salvo en las excepciones, que son datos.
 */
const todos = lugaresJson.places
const lugares = todos.filter((lugar) => lugar.active)

/** Cómo se escribe cada zona al final de un nombre con varias sucursales. */
const ETIQUETA_DE_ZONA: Record<string, string> = {
  'paseo-zibata': 'Paseo Zibatá',
  'centro-zibata': 'Centro Zibatá',
  'xentric-zibata': 'Xentric Zibatá',
  'anahuac-queretaro': 'Anáhuac',
  'xentric-anahuac': 'Xentric Anáhuac',
  'plaza-zielo': 'Plaza Zielo',
  'mol-pitahaya': 'MOL Pitahaya',
}

/** El nombre lleva un signo que es parte de su logotipo, no una separación de palabras: se declara aquí y se explica. */
const EXCEPCIONES: Record<string, string> = {
  // "E|B": la barra es del logotipo; `e-b-salon` se leería como tres palabras.
  'eb-salon': 'eb-salon',
  // "H-E-B": los guiones son del logotipo y el propietario la quiere en una sola palabra.
  heb: 'heb',
}

const CONECTORES = new Set(['y', 'and'])
const ZONAS_DEL_NOMBRE = new Set(['paseo', 'centro', 'xentric'])

const sinAcentos = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Las zonas de ETIQUETA_DE_ZONA como lista de palabras, la más larga primero ("Xentric Anáhuac" antes que "Anáhuac"). */
const PALABRAS_DE_ZONA = Object.values(ETIQUETA_DE_ZONA)
  .map((etiqueta) =>
    sinAcentos(etiqueta)
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  )
  .sort((a, b) => b.length - a.length)

/** La base de la dirección: el nombre completo, sin acentos, apóstrofos, conectores ni la ubicación "Zibatá". */
function baseDe(nombre: string): string {
  let palabras = sinAcentos(nombre)
    .replace(/['’`]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  const i = palabras.indexOf('zibata')
  if (i >= 0) {
    const desde = i > 0 && ZONAS_DEL_NOMBRE.has(palabras[i - 1] ?? '') ? i - 1 : i
    palabras = [...palabras.slice(0, desde), ...palabras.slice(i + 1)]
  }
  // Una zona al final del nombre ("Anáhuac", "Xentric Anáhuac", "Plaza Zielo", "MOL Pitahaya") tampoco va en la base.
  for (const zona of PALABRAS_DE_ZONA) {
    const desde = palabras.length - zona.length
    if (desde > 0 && zona.every((palabra, j) => palabras[desde + j] === palabra)) {
      palabras = palabras.slice(0, desde)
      break
    }
  }
  return palabras.filter((palabra) => !CONECTORES.has(palabra)).join('-')
}

/** La zona de la Universidad Anáhuac se abrevia `-anahuac`; las demás van con su id. */
const sufijoDeZona = (plazaId: string) => (plazaId === 'anahuac-queretaro' ? 'anahuac' : plazaId)

const sucursalesPorBase = new Map<string, number>()
for (const lugar of lugares) {
  const base = baseDe(lugar.name)
  sucursalesPorBase.set(base, (sucursalesPorBase.get(base) ?? 0) + 1)
}

const esperada = (lugar: (typeof lugares)[number]): string => {
  const excepcion = EXCEPCIONES[lugar.slug]
  if (excepcion) return excepcion
  const base = baseDe(lugar.name)
  return (sucursalesPorBase.get(base) ?? 0) > 1 ? `${base}-${sufijoDeZona(lugar.plazaId)}` : base
}

describe('direcciones de los locales', () => {
  it('la dirección de cada local sigue al nombre que el negocio se da', () => {
    const desviados = lugares
      .filter((lugar) => lugar.slug !== esperada(lugar))
      .map((lugar) => `${lugar.slug} (debería ser ${esperada(lugar)})`)
    expect(
      desviados,
      'Cambia la dirección del local (slug nuevo y fila place-slug en redirects.json, el id no cambia) o, si el nombre lleva un signo de logotipo, declara la excepción',
    ).toEqual([])
  })

  it('las excepciones se aplican a un local que existe y de verdad se apartan de la regla', () => {
    for (const [slug, esperado] of Object.entries(EXCEPCIONES)) {
      const lugar = lugares.find((otro) => otro.slug === slug)
      expect(lugar, `la excepción ${slug} no corresponde a ningún local`).toBeDefined()
      if (!lugar) continue
      const base = baseDe(lugar.name)
      const reglaSola =
        (sucursalesPorBase.get(base) ?? 0) > 1 ? `${base}-${sufijoDeZona(lugar.plazaId)}` : base
      expect(reglaSola, `la excepción ${slug} ya la daría la regla: sobra`).not.toBe(esperado)
    }
  })

  it('el nombre lleva la zona solo si el negocio tiene varias sucursales, y entonces todas', () => {
    const mal: string[] = []
    for (const lugar of lugares) {
      const varias = (sucursalesPorBase.get(baseDe(lugar.name)) ?? 0) > 1
      const etiqueta = ETIQUETA_DE_ZONA[lugar.plazaId]
      if (varias && !etiqueta) {
        mal.push(`${lugar.name}: falta la etiqueta de la zona ${lugar.plazaId} en ETIQUETA_DE_ZONA`)
      } else if (varias && !lugar.name.endsWith(` ${etiqueta}`)) {
        mal.push(`${lugar.name} (debería terminar en "${etiqueta}")`)
      } else if (
        !varias &&
        (sinAcentos(lugar.name).includes('zibata') ||
          (etiqueta && lugar.name.endsWith(` ${etiqueta}`)))
      ) {
        mal.push(`${lugar.name} (sucursal única: sin Zibatá ni zona en el nombre)`)
      }
    }
    expect(mal).toEqual([])
  })

  it('una dirección de local no se repite', () => {
    const slugs = todos.map((lugar) => lugar.slug)
    expect(slugs.filter((slug, i) => slugs.indexOf(slug) !== i)).toEqual([])
  })

  it('una dirección antigua no tapa la de un local visible', () => {
    const vigentes = new Set(lugares.map((lugar) => lugar.slug))
    const tapadas = redirectsJson.redirects
      .filter((fila) => fila.kind === 'place-slug' && 'slug' in fila)
      .filter((fila) => vigentes.has(fila.slug))
    expect(tapadas).toEqual([])
  })

  it('cada dirección antigua de redirects.json apunta a un local que existe', () => {
    const ids = new Set(todos.map((lugar) => lugar.id))
    const colgadas = redirectsJson.redirects
      .filter((fila) => fila.kind === 'place-slug')
      .filter((fila) => !ids.has(fila.id))
    expect(colgadas).toEqual([])
  })
})

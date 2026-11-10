import { describe, expect, it } from 'vitest'
import {
  areaM2,
  MAX_VERTICES,
  MIN_AREA_M2,
  mismoContorno,
  normalizarContorno,
  puntoEnContorno,
  puntoInterior,
  validarContornoDePlaza,
} from './geometria.ts'

/**
 * Cerca de la plaza real (lat 20.69), con lados de unos 100 m: 0.001° de latitud son ~110 m y de
 * longitud ~104 m. `cuadrado(x, y, lado)` pone una esquina en (lng, lat) y mide `lado` grados.
 */
const cuadrado = (lng: number, lat: number, lado = 0.001) => ({
  type: 'Polygon' as const,
  coordinates: [
    [
      [lng, lat],
      [lng + lado, lat],
      [lng + lado, lat + lado],
      [lng, lat + lado],
      [lng, lat],
    ],
  ],
})
const anilloDe = (g: ReturnType<typeof cuadrado>) => g.coordinates[0] ?? []

const ZIBATA = anilloDe(cuadrado(-100.4, 20.6, 0.3))
const reglas = (g: unknown, op = {}) => validarContornoDePlaza(g, op).map((p) => p.regla)

describe('validarContornoDePlaza', () => {
  it('acepta un cuadrado dentro del contorno', () => {
    expect(validarContornoDePlaza(cuadrado(-100.3, 20.69), { contorno: ZIBATA })).toEqual([])
  })

  it('exige un solo polígono sin huecos', () => {
    expect(reglas({ type: 'MultiPolygon', coordinates: [] })).toEqual(['forma'])
    expect(reglas(null)).toEqual(['forma'])
    const conHueco = cuadrado(-100.3, 20.69)
    conHueco.coordinates.push(anilloDe(cuadrado(-100.2995, 20.6905, 0.0002)))
    expect(reglas(conHueco)).toEqual(['forma'])
  })

  it('rechaza números que no son coordenadas', () => {
    const g = cuadrado(-100.3, 20.69)
    ;(g.coordinates[0] as unknown[])[1] = [Number.NaN, 20.69]
    expect(reglas(g)).toEqual(['forma'])
    expect(
      reglas({
        type: 'Polygon',
        coordinates: [
          [
            [0, 95],
            [1, 95],
            [1, 96],
            [0, 95],
          ],
        ],
      }),
    ).toEqual(['forma'])
  })

  it('exige que el anillo se cierre', () => {
    const g = cuadrado(-100.3, 20.69)
    g.coordinates[0] = (g.coordinates[0] ?? []).slice(0, -1).concat([[-100.2999, 20.69]])
    expect(reglas(g)).toEqual(['cerrado'])
  })

  it('rechaza vértices repetidos seguidos', () => {
    const g = cuadrado(-100.3, 20.69)
    const a = g.coordinates[0] ?? []
    g.coordinates[0] = [a[0] ?? [], a[1] ?? [], a[1] ?? [], a[2] ?? [], a[3] ?? [], a[4] ?? []]
    expect(reglas(g)).toContain('duplicados')
  })

  it('rechaza un contorno con más vértices que el tope', () => {
    const n = MAX_VERTICES + 1
    // Un círculo de n vértices: simple, con área de sobra.
    const anillo = Array.from({ length: n }, (_, i) => {
      const t = (2 * Math.PI * i) / n
      return [-100.3 + 0.002 * Math.cos(t), 20.69 + 0.002 * Math.sin(t)]
    })
    const g = { type: 'Polygon', coordinates: [[...anillo, anillo[0]]] }
    expect(reglas(g)).toContain('vertices')
  })

  it('rechaza un lazo (los lados se cruzan)', () => {
    const lazo = {
      type: 'Polygon',
      coordinates: [
        [
          [-100.3, 20.69],
          [-100.299, 20.691],
          [-100.299, 20.69],
          [-100.3, 20.691],
          [-100.3, 20.69],
        ],
      ],
    }
    expect(reglas(lazo)).toEqual(['autointersecta'])
  })

  it('rechaza un vértice que toca otro lado', () => {
    const g = {
      type: 'Polygon',
      // El quinto vértice cae sobre el lado inferior: el contorno se toca a sí mismo.
      coordinates: [
        [
          [-100.3, 20.69],
          [-100.298, 20.69],
          [-100.298, 20.692],
          [-100.299, 20.69],
          [-100.3, 20.692],
          [-100.3, 20.69],
        ],
      ],
    }
    expect(reglas(g)).toContain('autointersecta')
  })

  it('rechaza un contorno de menos de 200 m²', () => {
    // 0.0001° son ~10 m: un cuadrado de ~110 m².
    expect(reglas(cuadrado(-100.3, 20.69, 0.0001))).toEqual(['area'])
    expect(areaM2(anilloDe(cuadrado(-100.3, 20.69, 0.0001)))).toBeLessThan(MIN_AREA_M2)
  })

  it('mide el área en metros cuadrados', () => {
    // 0.001° x 0.001° a lat 20.69: ~110.6 m x ~104 m.
    const m2 = areaM2(anilloDe(cuadrado(-100.3, 20.69)))
    expect(m2).toBeGreaterThan(11_000)
    expect(m2).toBeLessThan(12_000)
  })

  it('rechaza vértices fuera del contorno de Zibatá', () => {
    expect(reglas(cuadrado(-100.5, 20.69), { contorno: ZIBATA })).toEqual(['fuera-del-contorno'])
  })

  it('rechaza un lado que sale del contorno cóncavo y vuelve a entrar', () => {
    // Contorno en "U": un brazo hueco entre x=-100.3 y x=-100.2.
    const en_u = [
      [-100.4, 20.6],
      [-100.1, 20.6],
      [-100.1, 20.8],
      [-100.2, 20.8],
      [-100.2, 20.7],
      [-100.3, 20.7],
      [-100.3, 20.8],
      [-100.4, 20.8],
      [-100.4, 20.6],
    ]
    // Una plaza con sus cuatro vértices en los dos brazos pero con un lado que cruza el hueco.
    const puente = {
      type: 'Polygon',
      coordinates: [
        [
          [-100.35, 20.75],
          [-100.15, 20.75],
          [-100.15, 20.79],
          [-100.35, 20.79],
          [-100.35, 20.75],
        ],
      ],
    }
    expect(reglas(puente, { contorno: en_u })).toEqual(['cruza-el-contorno'])
  })

  it('admite que un vértice quede sobre el borde del contorno', () => {
    const borde = cuadrado(-100.4, 20.69)
    expect(validarContornoDePlaza(borde, { contorno: ZIBATA })).toEqual([])
  })

  it('exige el marcador dentro del propio contorno', () => {
    const g = cuadrado(-100.3, 20.69)
    expect(reglas(g, { marcador: { lat: 20.6905, lng: -100.2995 } })).toEqual([])
    expect(reglas(g, { marcador: { lat: 20.7, lng: -100.2 } })).toEqual(['marcador'])
  })

  it('rechaza el solape con otra plaza pero deja compartir un borde', () => {
    const otra = { id: 'vecina', anillo: anilloDe(cuadrado(-100.3, 20.69)) }
    // Desplazada la mitad: se solapan.
    expect(reglas(cuadrado(-100.2995, 20.6905), { otras: [otra] })).toEqual(['solapa'])
    // Justo al lado, compartiendo el lado derecho de la vecina: vale.
    expect(reglas(cuadrado(-100.299, 20.69), { otras: [otra] })).toEqual([])
    // Idéntica, o contenida: se solapan aunque no se cruce ningún lado.
    expect(reglas(cuadrado(-100.3, 20.69), { otras: [otra] })).toEqual(['solapa'])
    expect(reglas(cuadrado(-100.2997, 20.6903, 0.0004), { otras: [otra] })).toEqual(['solapa'])
    // Lejos: nada.
    expect(reglas(cuadrado(-100.25, 20.69), { otras: [otra] })).toEqual([])
  })
})

describe('normalizarContorno', () => {
  it('redondea a 6 decimales y deja el exterior en sentido antihorario', () => {
    const horario = [
      [-100.3, 20.69],
      [-100.3, 20.691],
      [-100.299, 20.691],
      [-100.299, 20.69],
      [-100.3, 20.69],
    ]
    const salida = normalizarContorno(horario)
    // Antihorario: el área con signo positiva. Comprobado con la fórmula del topógrafo.
    const doble = salida.slice(0, -1).reduce((s, p, i, a) => {
      const q = a[(i + 1) % a.length] ?? p
      return s + ((p[0] ?? 0) * (q[1] ?? 0) - (q[0] ?? 0) * (p[1] ?? 0))
    }, 0)
    expect(doble).toBeGreaterThan(0)
    expect(salida[0]).toEqual(salida[salida.length - 1])
    expect(
      normalizarContorno([
        [-100.30000049, 20.69],
        [-100.2, 20.69],
        [-100.2, 20.7],
        [-100.30000049, 20.69],
      ])[0],
    ).toEqual([-100.3, 20.69])
  })

  it('deja igual un anillo que ya está antihorario', () => {
    // Ya redondeado a 6 decimales: `-100.3 + 0.001` en coma flotante da -100.29899999999999.
    const ya = anilloDe(cuadrado(-100.3, 20.69)).map((p) => p.map((n) => Number(n.toFixed(6))))
    expect(normalizarContorno(ya)).toEqual(ya)
  })
})

describe('puntoEnContorno', () => {
  it('dice si un local cae dentro', () => {
    const anillo = anilloDe(cuadrado(-100.3, 20.69))
    expect(puntoEnContorno({ lat: 20.6905, lng: -100.2995 }, anillo)).toBe(true)
    expect(puntoEnContorno({ lat: 20.7, lng: -100.2 }, anillo)).toBe(false)
  })
})

describe('mismoContorno', () => {
  const base = anilloDe(cuadrado(-100.3, 20.69)).map((p) => p.map((n) => Number(n.toFixed(6))))

  it('no distingue el sentido ni el vértice por el que empieza', () => {
    const abierto = base.slice(0, -1)
    const cerrar = (puntos: number[][]) => [...puntos, puntos[0] ?? []]
    const invertido = cerrar([...abierto].reverse())
    const rotado = cerrar([...abierto.slice(2), ...abierto.slice(0, 2)])
    const rotadoEInvertido = cerrar([...abierto.slice(1), ...abierto.slice(0, 1)].reverse())
    expect(mismoContorno(base, invertido)).toBe(true)
    expect(mismoContorno(base, rotado)).toBe(true)
    expect(mismoContorno(base, rotadoEInvertido)).toBe(true)
  })

  it('distingue un vértice movido', () => {
    const movido = base.map((p) => [...p])
    movido[2] = [(movido[2]?.[0] ?? 0) + 0.0001, movido[2]?.[1] ?? 0]
    expect(mismoContorno(base, movido)).toBe(false)
  })
})

describe('puntoInterior', () => {
  const LNG = -100.33
  const LAT = 20.68
  const M_LAT = 110_574
  const M_LNG = 111_320 * Math.cos((LAT * Math.PI) / 180)
  /** Un polígono dado en metros desde (LNG, LAT), como anillo cerrado en grados. */
  const enMetros = (metros: number[][]) => {
    const anillo = metros.map(([x = 0, y = 0]) => [LNG + x / M_LNG, LAT + y / M_LAT])
    return [...anillo, anillo[0] ?? []]
  }

  it('un cuadrado de 20 m: el centro, a 10 m de cualquier borde', () => {
    const r = puntoInterior([
      enMetros([
        [0, 0],
        [20, 0],
        [20, 20],
        [0, 20],
      ]),
    ])
    expect(r?.margenM).toBeGreaterThan(9.5)
    expect(r?.lng).toBeCloseTo(LNG + 10 / M_LNG, 6)
  })

  it('una U: el centroide cae en el hueco, el punto interior no', () => {
    const u = enMetros([
      [0, 0],
      [30, 0],
      [30, 30],
      [20, 30],
      [20, 10],
      [10, 10],
      [10, 30],
      [0, 30],
    ])
    const r = puntoInterior([u])
    if (!r) throw new Error('debía haber punto')
    expect(puntoEnContorno({ lat: r.lat, lng: r.lng }, u)).toBe(true)
    expect(r.margenM).toBeGreaterThan(3)
  })

  it('una tira de 2 m de ancho: el margen es ~1 m, y lo dice', () => {
    const r = puntoInterior([
      enMetros([
        [0, 0],
        [60, 0],
        [60, 2],
        [0, 2],
      ]),
    ])
    expect(r?.margenM).toBeGreaterThan(0.8)
    expect(r?.margenM).toBeLessThan(1.05)
  })

  it('un patio interior: el punto no cae en el agujero', () => {
    const exterior = enMetros([
      [0, 0],
      [40, 0],
      [40, 40],
      [0, 40],
    ])
    const patio = enMetros([
      [12, 12],
      [12, 28],
      [28, 28],
      [28, 12],
    ])
    const r = puntoInterior([exterior, patio])
    if (!r) throw new Error('debía haber punto')
    expect(puntoEnContorno({ lat: r.lat, lng: r.lng }, patio)).toBe(false)
    expect(puntoEnContorno({ lat: r.lat, lng: r.lng }, exterior)).toBe(true)
    // Entre el patio y el borde hay 12 m de anillo: el mejor punto queda a unos 6 m de los dos.
    expect(r.margenM).toBeGreaterThan(5)
  })

  it('un anillo degenerado no tiene punto', () => {
    expect(puntoInterior([])).toBeNull()
    expect(
      puntoInterior([
        [
          [LNG, LAT],
          [LNG, LAT],
        ],
      ]),
    ).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import {
  ANADIR,
  CONTEO,
  cambioDe,
  EDAD_MINIMA_MS,
  MAXIMO_POR_PETICION,
  UMBRAL,
} from './favoritos.ts'

describe('lo que pide el navegador', () => {
  it('acepta un gesto normal', () => {
    expect(cambioDe({ anadir: ['tomassa'] })).toEqual({ anadir: ['tomassa'], quitar: [] })
    expect(cambioDe({ quitar: ['tomassa'] })).toEqual({ anadir: [], quitar: ['tomassa'] })
  })

  it('acepta la subida inicial de lo que ya había en el dispositivo', () => {
    const muchos = ['tomassa', 'bendito-bocado', 'el-hornero']
    expect(cambioDe({ anadir: muchos })?.anadir).toEqual(muchos)
  })

  it('filtra lo que no es un slug en vez de tirar el gesto entero', () => {
    // Un identificador raro entre buenos no debe costarle el corazón a nadie.
    const cambio = cambioDe({ anadir: ['tomassa', "' OR 1=1 --", 'MAYUSCULAS', 42, null, '../x'] })
    expect(cambio).toEqual({ anadir: ['tomassa'], quitar: [] })
  })

  it('no repite', () => {
    expect(cambioDe({ anadir: ['tomassa', 'tomassa'] })?.anadir).toEqual(['tomassa'])
  })

  it('rechaza lo que no es un cambio', () => {
    for (const malo of [null, 'texto', 42, [], {}, { anadir: [] }, { anadir: ['NO'] }]) {
      expect(cambioDe(malo)).toBeNull()
    }
  })

  it('rechaza añadir y quitar lo mismo, que es un error de quien llama', () => {
    expect(cambioDe({ anadir: ['tomassa'], quitar: ['tomassa'] })).toBeNull()
  })

  it('pone un tope por petición', () => {
    const demasiados = Array.from({ length: MAXIMO_POR_PETICION + 1 }, (_, i) => `lugar-${i}`)
    expect(cambioDe({ anadir: demasiados })).toBeNull()
  })
})

describe('las reglas del conteo público viven en el servidor', () => {
  it('el umbral y la edad mínima están en el SQL, no en la interfaz', () => {
    // Si estuvieran en el navegador, bastaría con pedir los datos a mano para saltárselas.
    expect(CONTEO).toContain('HAVING cuantos >=')
    expect(CONTEO).toContain('c.creada <=')
  })

  it('el umbral protege a quien guardó algo que casi nadie guardó', () => {
    // Con umbral 1 o 2, publicar el número delataría a quien lo guardó.
    expect(UMBRAL).toBeGreaterThanOrEqual(3)
  })

  it('la edad mínima convierte un ataque instantáneo en uno que hay que sostener', () => {
    expect(EDAD_MINIMA_MS).toBeGreaterThan(0)
  })

  it('dar dos veces el mismo corazón no crea dos filas ni falla', () => {
    expect(ANADIR).toContain('INSERT OR IGNORE')
  })

  it('no se guarda nada de la persona', () => {
    const sql = `${ANADIR} ${CONTEO}`.toLowerCase()
    for (const prohibido of ['ip', 'user_agent', 'correo', 'nombre', 'referente']) {
      expect(sql).not.toContain(prohibido)
    }
  })
})

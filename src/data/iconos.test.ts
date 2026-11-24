import { describe, expect, it } from 'vitest'
import { FRAGMENTO_DE_ICONO } from '../components/icons/fragmentos.ts'
import { ICONOS_DE_MASCOTAS } from '../components/icons/iconos-de-mascotas.tsx'
import { hasCategoryIcon } from '../components/icons/registro-de-iconos.tsx'
import { tieneDibujo } from '../test/iconos.ts'
import { ICONOS } from './iconos.ts'

describe('los nombres de icono', () => {
  it('todos tienen dibujo en el componente', () => {
    for (const nombre of ICONOS) expect(tieneDibujo(nombre), nombre).toBe(true)
  })

  it('un nombre heredado de Object no cuenta como icono', () => {
    for (const nombre of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(hasCategoryIcon(nombre), nombre).toBe(false)
    }
  })

  it('no hay nombres repetidos', () => {
    expect(new Set(ICONOS).size).toBe(ICONOS.length)
  })

  it('la tabla de fragmentos y cada fragmento dicen lo mismo, y ningún nombre está en los dos sitios', () => {
    expect(Object.keys(FRAGMENTO_DE_ICONO).sort()).toEqual(Object.keys(ICONOS_DE_MASCOTAS).sort())
    for (const nombre of Object.keys(FRAGMENTO_DE_ICONO)) {
      expect(hasCategoryIcon(nombre), nombre).toBe(false)
      expect(ICONOS, nombre).toContain(nombre)
    }
  })
})

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * La prueba de trabajo se simula, y por eso vale la pena explicarlo: con el módulo de verdad, cada
 * caso buscaría un secreto válido a base de hashes y la suite tardaría minutos. Lo que se comprueba
 * aquí es `cuenta.ts`; la prueba tiene la suya en prueba-de-trabajo.test.ts, y que el servidor la
 * exija se comprueba en worker/.
 */
const SECRETO = 'secreto-de-prueba-no-abre-nada-aaaaaaaaaaaa'
let encontrado: string | null = SECRETO
vi.mock('./prueba-de-trabajo.ts', () => ({ secretoConPrueba: async () => encontrado }))

/** El módulo guarda el alta en vuelo en un módulo, así que cada prueba lo importa limpio. */
async function cargar() {
  vi.resetModules()
  return import('./cuenta.ts')
}

const respondeBien = () => vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })

beforeEach(() => {
  window.localStorage.clear()
  encontrado = SECRETO
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('la cuenta en el navegador', () => {
  it('no existe hasta que algo la necesita', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { hayCuenta } = await cargar()
    expect(hayCuenta()).toBe(false)
    // Quien solo mira la guía no genera ninguna cuenta.
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('se crea una sola vez y se reutiliza', async () => {
    const fetchMock = respondeBien()
    vi.stubGlobal('fetch', fetchMock)
    const { asegurarCuenta } = await cargar()

    expect(await asegurarCuenta()).toBe(SECRETO)
    expect(await asegurarCuenta()).toBe(SECRETO)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem('zibata:cuenta')).toBe(SECRETO)
  })

  it('el alta manda el secreto en la cabecera, y el servidor no devuelve ninguno', async () => {
    // Desde la prueba de trabajo el secreto lo trae el navegador: el servidor solo guarda su huella.
    const fetchMock = respondeBien()
    vi.stubGlobal('fetch', fetchMock)
    const { asegurarCuenta } = await cargar()
    await asegurarCuenta()
    expect(fetchMock).toHaveBeenCalledWith('/api/cuenta', {
      method: 'POST',
      headers: { 'x-zibata-cuenta': SECRETO },
    })
  })

  it('dos gestos seguidos no crean dos cuentas', async () => {
    const fetchMock = respondeBien()
    vi.stubGlobal('fetch', fetchMock)
    const { asegurarCuenta } = await cargar()

    const [uno, otro] = await Promise.all([asegurarCuenta(), asegurarCuenta()])
    expect(uno).toBe(SECRETO)
    expect(otro).toBe(SECRETO)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('si el servidor no responde, se sigue sin cuenta y sin romper nada', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')))
    const { asegurarCuenta, cabecerasDeCuenta, hayCuenta } = await cargar()
    expect(await asegurarCuenta()).toBeNull()
    expect(await cabecerasDeCuenta()).toBeNull()
    expect(hayCuenta()).toBe(false)
  })

  it('si el servidor rechaza el alta, no se guarda nada', async () => {
    // Un 403 es una prueba que no cumple y un 409 una huella repetida. En los dos casos la guía se
    // queda como estaba y el siguiente gesto vuelve a intentarlo.
    for (const estado of [403, 409, 500]) {
      window.localStorage.clear()
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: estado }))
      const { asegurarCuenta } = await cargar()
      expect(await asegurarCuenta()).toBeNull()
      expect(window.localStorage.getItem('zibata:cuenta')).toBeNull()
    }
  })

  it('si no se encuentra un secreto válido, no se pide nada al servidor', async () => {
    encontrado = null
    const fetchMock = respondeBien()
    vi.stubGlobal('fetch', fetchMock)
    const { asegurarCuenta } = await cargar()
    expect(await asegurarCuenta()).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('un secreto guardado con mala forma se descarta y se pide otro', async () => {
    window.localStorage.setItem('zibata:cuenta', 'basura')
    vi.stubGlobal('fetch', respondeBien())
    const { asegurarCuenta } = await cargar()
    expect(await asegurarCuenta()).toBe(SECRETO)
  })

  it('las cabeceras llevan el secreto con el nombre que espera el Worker', async () => {
    vi.stubGlobal('fetch', respondeBien())
    const { cabecerasDeCuenta } = await cargar()
    expect(await cabecerasDeCuenta()).toEqual({ 'x-zibata-cuenta': SECRETO })
  })

  it('olvidarla la borra de este dispositivo', async () => {
    vi.stubGlobal('fetch', respondeBien())
    const { asegurarCuenta, hayCuenta, olvidarCuenta } = await cargar()
    await asegurarCuenta()
    expect(hayCuenta()).toBe(true)
    olvidarCuenta()
    expect(hayCuenta()).toBe(false)
  })
})

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Un secreto falso con la forma del real: 43 caracteres de base64url. Se escribe legible y repetitivo
 * a propósito. Uno aleatorio de verdad lo marca Gitleaks como clave filtrada, y una excepción
 * permanente en el escáner para callar a un dato de prueba es peor que escribir el dato de prueba
 * de forma que no se confunda con una clave.
 */
const SECRETO = 'secreto-de-prueba-no-abre-nada-aaaaaaaaaaaa'

/** El módulo guarda el alta en vuelo en un módulo, así que cada prueba lo importa limpio. */
async function cargar() {
  vi.resetModules()
  return import('./cuenta.ts')
}

beforeEach(() => {
  window.localStorage.clear()
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
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ secreto: SECRETO }) })
    vi.stubGlobal('fetch', fetchMock)
    const { asegurarCuenta } = await cargar()

    expect(await asegurarCuenta()).toBe(SECRETO)
    expect(await asegurarCuenta()).toBe(SECRETO)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(window.localStorage.getItem('zibata:cuenta')).toBe(SECRETO)
  })

  it('dos gestos seguidos no crean dos cuentas', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ secreto: SECRETO }) })
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

  it('una respuesta rara no se guarda', async () => {
    for (const cuerpo of [{}, { secreto: 123 }, { secreto: 'corto' }, { secreto: `${SECRETO}x` }]) {
      window.localStorage.clear()
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => cuerpo }))
      const { asegurarCuenta } = await cargar()
      expect(await asegurarCuenta()).toBeNull()
      expect(window.localStorage.getItem('zibata:cuenta')).toBeNull()
    }
  })

  it('un secreto guardado con mala forma se descarta y se pide otro', async () => {
    window.localStorage.setItem('zibata:cuenta', 'basura')
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ secreto: SECRETO }) })
    vi.stubGlobal('fetch', fetchMock)
    const { asegurarCuenta } = await cargar()
    expect(await asegurarCuenta()).toBe(SECRETO)
  })

  it('las cabeceras llevan el secreto con el nombre que espera el Worker', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ secreto: SECRETO }) }),
    )
    const { cabecerasDeCuenta } = await cargar()
    expect(await cabecerasDeCuenta()).toEqual({ 'x-zibata-cuenta': SECRETO })
  })

  it('olvidarla la borra de este dispositivo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ secreto: SECRETO }) }),
    )
    const { asegurarCuenta, hayCuenta, olvidarCuenta } = await cargar()
    await asegurarCuenta()
    expect(hayCuenta()).toBe(true)
    olvidarCuenta()
    expect(hayCuenta()).toBe(false)
  })
})

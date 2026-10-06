// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

const CLAVE = '1x00000000000000000000AA'

/** El módulo lee la clave al importarse, así que cada prueba lo carga limpio. */
async function cargar(clave?: string) {
  vi.resetModules()
  if (clave === undefined) vi.stubEnv('VITE_TURNSTILE_SITEKEY', '')
  else vi.stubEnv('VITE_TURNSTILE_SITEKEY', clave)
  return import('./turnstile.ts')
}

const scripts = () => [...document.querySelectorAll('script[src*="challenges.cloudflare.com"]')]

afterEach(() => {
  vi.unstubAllEnvs()
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  Reflect.deleteProperty(window, 'turnstile')
})

describe('el desafío', () => {
  it('sin clave configurada no existe y no pide nada a nadie', async () => {
    const { fichaDeDesafio, hayDesafio } = await cargar()
    expect(hayDesafio()).toBe(false)
    expect(await fichaDeDesafio()).toBeNull()
    // Lo que se está fijando aquí es la promesa de la página de privacidad: sin clave, Cloudflare
    // no entra en el navegador de nadie.
    expect(scripts()).toHaveLength(0)
  })

  it('el script de Cloudflare se descarga al pedir la ficha, nunca al importar el módulo', async () => {
    const { fichaDeDesafio } = await cargar(CLAVE)
    expect(scripts()).toHaveLength(0)

    const pendiente = fichaDeDesafio()
    await Promise.resolve()
    const etiqueta = scripts()[0] as HTMLScriptElement | undefined
    expect(etiqueta).toBeDefined()
    expect(etiqueta?.async).toBe(true)

    // Si el script no carga (red caída, bloqueador de contenido), no hay ficha y se sigue sin ella.
    etiqueta?.dispatchEvent(new Event('error'))
    expect(await pendiente).toBeNull()
  })

  it('un script que ni carga ni falla no deja la promesa colgada', async () => {
    /*
     * El caso que tiró la publicación de la v4.11.0, y el que de verdad puede pasarle a alguien: una
     * red que traga la conexión (portal cautivo, proxy) no dispara ni `load` ni `error`. Sin un
     * reloj por encima de la descarga, la promesa no se resuelve nunca.
     */
    vi.useFakeTimers()
    try {
      const { fichaDeDesafio } = await cargar(CLAVE)
      const pendiente = fichaDeDesafio()
      await vi.advanceTimersByTimeAsync(20_000)
      expect(await pendiente).toBeNull()
      expect(document.body.children).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('devuelve la ficha y se lleva el widget al terminar', async () => {
    const { fichaDeDesafio } = await cargar(CLAVE)
    const remove = vi.fn()
    let responder: ((ficha: string) => void) | undefined
    window.turnstile = {
      render: (_contenedor, opciones) => {
        responder = opciones.callback as (ficha: string) => void
        return 'widget-1'
      },
      remove,
    }

    const pendiente = fichaDeDesafio()
    await vi.waitFor(() => expect(responder).toBeDefined())
    const hijos = document.body.children.length
    expect(hijos).toBe(1)

    responder?.('ficha-de-prueba')
    expect(await pendiente).toBe('ficha-de-prueba')
    expect(remove).toHaveBeenCalledWith('widget-1')
    // Nada queda colgando en la página después de un desafío resuelto.
    expect(document.body.children).toHaveLength(0)
  })

  it('un desafío fallido no deja ficha ni rastro', async () => {
    const { fichaDeDesafio } = await cargar(CLAVE)
    let fallar: (() => void) | undefined
    window.turnstile = {
      render: (_contenedor, opciones) => {
        fallar = opciones['error-callback'] as () => void
        return 'widget-2'
      },
      remove: vi.fn(),
    }

    const pendiente = fichaDeDesafio()
    await vi.waitFor(() => expect(fallar).toBeDefined())
    fallar?.()
    expect(await pendiente).toBeNull()
    expect(document.body.children).toHaveLength(0)
  })
})

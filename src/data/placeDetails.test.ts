// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlaceDetailData } from '../types/domain.ts'
import type { PlacesRepository } from './PlacesRepository.ts'
import { createDetailsStore } from './placeDetails.ts'

const detalle = (id: string): PlaceDetailData => ({
  id,
  description: null,
  links: {},
  phone: null,
  googleMapsUri: null,
  googlePlaceId: null,
})

/** Un repositorio que solo sabe del detalle y cuenta cuántas veces se lo piden. */
function repositorio(respuestas: (Error | PlaceDetailData[])[]) {
  const pedidos = vi.fn(async () => {
    const siguiente = respuestas.shift() ?? []
    if (siguiente instanceof Error) throw siguiente
    return siguiente
  })
  return { repo: { getPlaceDetails: pedidos } as unknown as PlacesRepository, pedidos }
}

const conectar = (valor: unknown) =>
  Object.defineProperty(navigator, 'connection', { value: valor, configurable: true })

describe('createDetailsStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    Reflect.deleteProperty(navigator, 'connection')
    Reflect.deleteProperty(window, 'requestIdleCallback')
    Reflect.deleteProperty(window, 'cancelIdleCallback')
  })

  it('no pide nada hasta que alguien lo pide, y una sola vez aunque lo pidan varios', async () => {
    const { repo, pedidos } = repositorio([[detalle('a')]])
    const almacen = createDetailsStore(repo)
    expect(almacen.getSnapshot().status).toBe('loading')
    expect(pedidos).not.toHaveBeenCalled()
    almacen.load()
    almacen.load()
    await vi.runAllTimersAsync()
    expect(pedidos).toHaveBeenCalledTimes(1)
    const estado = almacen.getSnapshot()
    expect(estado.status === 'ready' && estado.byId.get('a')?.id).toBe('a')
    // Con el detalle ya listo, volver a pedirlo no hace nada.
    almacen.load()
    expect(pedidos).toHaveBeenCalledTimes(1)
  })

  it('el estado es el mismo objeto mientras no cambie, y avisa a quien escucha cuando cambia', async () => {
    const { repo } = repositorio([[detalle('a')]])
    const almacen = createDetailsStore(repo)
    const antes = almacen.getSnapshot()
    expect(almacen.getSnapshot()).toBe(antes)
    const aviso = vi.fn()
    const dejarDeEscuchar = almacen.subscribe(aviso)
    almacen.load()
    await vi.runAllTimersAsync()
    expect(aviso).toHaveBeenCalledTimes(1)
    expect(almacen.getSnapshot()).not.toBe(antes)
    dejarDeEscuchar()
  })

  it('si falla queda en error y volver a pedirlo reintenta de verdad', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { repo, pedidos } = repositorio([new Error('sin red'), [detalle('a')]])
    const almacen = createDetailsStore(repo)
    almacen.load()
    await vi.runAllTimersAsync()
    expect(almacen.getSnapshot().status).toBe('error')
    almacen.load()
    expect(almacen.getSnapshot().status).toBe('loading')
    await vi.runAllTimersAsync()
    expect(pedidos).toHaveBeenCalledTimes(2)
    expect(almacen.getSnapshot().status).toBe('ready')
  })
})

describe('createDetailsStore: ensure', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('pide si nunca se pidió, y tras un fallo no vuelve a pedir por su cuenta: eso es del reintento', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { repo, pedidos } = repositorio([new Error('sin red'), [detalle('a')]])
    const almacen = createDetailsStore(repo)
    almacen.ensure()
    almacen.ensure()
    await vi.runAllTimersAsync()
    expect(pedidos).toHaveBeenCalledTimes(1)
    expect(almacen.getSnapshot().status).toBe('error')
    // Abrir otra ficha (ensure) no borra el aviso de error ni repite la petición.
    almacen.ensure()
    await vi.runAllTimersAsync()
    expect(pedidos).toHaveBeenCalledTimes(1)
    expect(almacen.getSnapshot().status).toBe('error')
    // El reintento explícito sí.
    almacen.load()
    await vi.runAllTimersAsync()
    expect(almacen.getSnapshot().status).toBe('ready')
  })
})

describe('createDetailsStore: pedir al reposo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(navigator, 'connection')
    Reflect.deleteProperty(window, 'requestIdleCallback')
    Reflect.deleteProperty(window, 'cancelIdleCallback')
  })

  it('con requestIdleCallback espera a que el navegador esté libre', () => {
    const { repo, pedidos } = repositorio([[]])
    let cuandoLibre: () => void = () => {}
    window.requestIdleCallback = vi.fn((tarea: () => void) => {
      cuandoLibre = tarea
      return 7
    }) as never
    window.cancelIdleCallback = vi.fn()
    createDetailsStore(repo).loadWhenIdle()
    expect(pedidos).not.toHaveBeenCalled()
    cuandoLibre()
    expect(pedidos).toHaveBeenCalledTimes(1)
  })

  it('sin requestIdleCallback (Safari) espera un rato fijo', async () => {
    const { repo, pedidos } = repositorio([[]])
    createDetailsStore(repo).loadWhenIdle()
    await vi.advanceTimersByTimeAsync(1000)
    expect(pedidos).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(pedidos).toHaveBeenCalledTimes(1)
  })

  it('con el ahorro de datos activado no pide nada al reposo, pero sí cuando alguien lo necesita', async () => {
    conectar({ saveData: true })
    const { repo, pedidos } = repositorio([[]])
    const almacen = createDetailsStore(repo)
    almacen.loadWhenIdle()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(pedidos).not.toHaveBeenCalled()
    almacen.load()
    expect(pedidos).toHaveBeenCalledTimes(1)
  })

  it('cancelar la espera evita la petición', async () => {
    const { repo, pedidos } = repositorio([[]])
    const cancelar = createDetailsStore(repo).loadWhenIdle()
    cancelar()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(pedidos).not.toHaveBeenCalled()
  })
})

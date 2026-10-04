// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { interactionsStore, preferences, recordOpenLocally } from './preferences.ts'

describe('preferencias locales', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: 'zibata:interacciones' }))
  })

  it('cuenta las fichas abiertas y recuerda la última vez', () => {
    recordOpenLocally('cafe-aurora', 1_000)
    recordOpenLocally('cafe-aurora', 2_000)
    expect(interactionsStore.read().get('cafe-aurora')).toEqual({ opens: 2, lastOpenedAt: 2_000 })
    expect(JSON.parse(window.localStorage.getItem('zibata:interacciones') ?? '{}')).toEqual({
      'cafe-aurora': { opens: 2, lastOpenedAt: 2_000 },
    })
    expect(preferences.read().interactions.size).toBe(1)
  })

  it('olvida primero lo que hace más tiempo que no abre (tope de 300)', () => {
    for (let i = 0; i < 305; i++) recordOpenLocally(`lugar-${i}`, i)
    recordOpenLocally('lugar-5', 999)
    const kept = interactionsStore.read()
    expect(kept.size).toBe(300)
    expect(kept.has('lugar-0')).toBe(false)
    expect(kept.has('lugar-5')).toBe(true)
  })

  it('ignora datos corruptos en el almacenamiento', () => {
    window.localStorage.setItem(
      'zibata:interacciones',
      JSON.stringify({ ok: { opens: 1, lastOpenedAt: 5 }, mal: { opens: 'x' }, nulo: null }),
    )
    window.dispatchEvent(new StorageEvent('storage', { key: 'zibata:interacciones' }))
    const unsubscribe = interactionsStore.subscribe(() => {})
    window.dispatchEvent(new StorageEvent('storage', { key: 'zibata:interacciones' }))
    unsubscribe()
    expect([...interactionsStore.read().keys()]).toEqual(['ok'])
  })
})

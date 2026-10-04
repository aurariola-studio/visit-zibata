/**
 * Pequeño almacén local compartido por lo que el usuario marca en su dispositivo (favoritos y
 * calificaciones). Vive en localStorage, se sincroniza entre pestañas y funciona en memoria si el
 * almacenamiento está bloqueado (modo privado). No sale del navegador: este proyecto no tiene servidor.
 */
export interface LocalStore<T> {
  read: () => T
  write: (value: T) => void
  subscribe: (listener: () => void) => () => void
  /** Valor servido durante el render del servidor o antes de hidratar. */
  empty: T
}

export function createLocalStore<T>(
  key: string,
  parse: (raw: unknown) => T,
  serialize: (value: T) => unknown,
  empty: T,
): LocalStore<T> {
  const listeners = new Set<() => void>()
  let cache: T | null = null

  const read = (): T => {
    if (cache !== null) return cache
    try {
      cache = parse(JSON.parse(window.localStorage.getItem(key) ?? 'null'))
    } catch {
      cache = empty
    }
    return cache
  }

  const write = (value: T): void => {
    cache = value
    try {
      window.localStorage.setItem(key, JSON.stringify(serialize(value)))
    } catch {
      // Almacenamiento bloqueado (modo privado): se mantiene en memoria durante la sesión.
    }
    for (const listener of listeners) listener()
  }

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) {
        cache = null
        listener()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  }

  return { read, write, subscribe, empty }
}

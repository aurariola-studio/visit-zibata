import { useSyncExternalStore } from 'react'
import type { LocalizedText } from '../types/domain.ts'
import { en } from './en.ts'
import { es, type MessageKey, type Messages } from './es.ts'

export type Locale = 'es' | 'en'

/**
 * Catálogos disponibles. Para añadir otro idioma: crear su archivo con `satisfies Messages`
 * (TypeScript exige todas las claves), registrarlo aquí y añadirlo al tipo `Locale`. No hay que tocar
 * ningún componente: los textos de interfaz salen de `t()` y los de datos de `localized()`.
 */
const catalogs: Record<Locale, Messages> = { es, en }
const DEFAULT_LOCALE: Locale = 'es'
const STORAGE_KEY = 'zibata:idioma'

const isLocale = (value: unknown): value is Locale => typeof value === 'string' && value in catalogs

/** Idioma elegido a mano en esta guía (se recuerda en este dispositivo). */
function storedLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isLocale(stored) ? stored : null
  } catch {
    return null
  }
}

/**
 * Idioma activo: el elegido a mano; si no, el primero que pide el navegador y esté disponible; si no,
 * español.
 */
function resolveLocale(): Locale {
  const stored = typeof window === 'undefined' ? null : storedLocale()
  if (stored) return stored
  const requested = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [])
  for (const tag of requested) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}

export let locale: Locale = resolveLocale()
let messages: Messages = catalogs[locale]
let pluralRules = new Intl.PluralRules(locale)
const listeners = new Set<() => void>()

/** Cambia el idioma de la interfaz y lo recuerda en este dispositivo. */
export function setLocale(next: Locale): void {
  if (next === locale) return
  locale = next
  messages = catalogs[next]
  pluralRules = new Intl.PluralRules(next)
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Sin almacenamiento (modo privado): el idioma dura lo que la sesión.
  }
  if (typeof document !== 'undefined') document.documentElement.lang = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Re-renderiza al cambiar de idioma. Basta con usarlo en la raíz de la interfaz: sus hijos leen los
 * textos con `t()` al renderizar.
 */
export function useLocale(): Locale {
  return useSyncExternalStore(
    subscribe,
    () => locale,
    () => DEFAULT_LOCALE,
  )
}

export const availableLocales = Object.keys(catalogs) as Locale[]

type Vars = Record<string, string | number>

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}

type Message = string | { one: string; other: string }

function format(message: Message, rules: Intl.PluralRules, vars?: Vars): string {
  if (typeof message === 'string') return interpolate(message, vars)
  const count = Number(vars?.count ?? 0)
  return interpolate(rules.select(count) === 'one' ? message.one : message.other, vars)
}

export function t(key: MessageKey, vars?: Vars): string {
  return format(messages[key], pluralRules, vars)
}

/**
 * Texto en un idioma concreto, sin cambiar el de la interfaz. Lo necesita el botón de idioma: su
 * etiqueta habla en el idioma al que lleva, para no mezclar los dos idiomas en una misma frase.
 */
export function tIn(target: Locale, key: MessageKey, vars?: Vars): string {
  if (target === locale) return t(key, vars)
  return format(catalogs[target][key], new Intl.PluralRules(target), vars)
}

/** Texto de datos (categorías, subcategorías) en el idioma activo, con español como respaldo. */
export function localized(text: LocalizedText): string {
  return (text as Partial<Record<Locale, string>>)[locale] ?? text.es
}

export const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value)

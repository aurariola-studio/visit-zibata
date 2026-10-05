import { useSyncExternalStore } from 'react'
import { localeFromPath } from '../lib/url-state.ts'
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
 * Idioma activo: **manda la URL**, y si no la trae, lo elegido a mano en este dispositivo.
 *
 * Que la URL mande es la consecuencia de tener un árbol por idioma: `/en/place/x` tiene que leerse
 * en inglés aunque el dispositivo recuerde español, porque esa dirección es la versión inglesa de
 * esa página y así la indexan los buscadores.
 *
 * Ya NO se usa el idioma del navegador. Es deliberado y tiene costo: quien llegue por primera vez
 * con el navegador en inglés verá la portada en español y tendrá que tocar el botón de idioma (una
 * vez: a partir de ahí se recuerda). A cambio, `/` es español de forma determinista. Si se dejara
 * el idioma del navegador, un rastreador (que pide inglés) sería reenviado de `/` a `/en/` y la
 * portada en español dejaría de indexarse bien, que es justo lo que este cambio vino a arreglar.
 */
function resolveLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const fromPath = localeFromPath(window.location.pathname, import.meta.env.BASE_URL)
  if (fromPath) return fromPath
  return storedLocale() ?? DEFAULT_LOCALE
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

import type { LocalizedText } from '../types/domain.ts'
import { es, type MessageKey, type Messages } from './es.ts'

export type Locale = 'es'

const catalogs: Record<Locale, Messages> = { es }

/** Idioma activo. Hoy solo "es"; la estructura permite añadir "en" sin tocar componentes. */
export const locale: Locale = 'es'
const messages = catalogs[locale]
const pluralRules = new Intl.PluralRules(locale)

type Vars = Record<string, string | number>

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}

export function t(key: MessageKey, vars?: Vars): string {
  const message = messages[key]
  if (typeof message === 'string') return interpolate(message, vars)
  const count = Number(vars?.count ?? 0)
  const form = pluralRules.select(count) === 'one' ? message.one : message.other
  return interpolate(form, vars)
}

/** Texto de datos (categorías, subcategorías) en el idioma activo, con español como respaldo. */
export function localized(text: LocalizedText): string {
  return (text as Partial<Record<Locale, string>>)[locale] ?? text.es
}

export const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value)

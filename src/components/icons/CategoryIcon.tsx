/**
 * Iconos de categoría. `categories.json` referencia un nombre (`icon`); aquí se resuelve a un
 * componente. Los dibujos NO están aquí: viven en `registro-de-iconos.tsx`, que es un fragmento aparte.
 *
 * Todo icono sale de datos que ya llegan de forma diferida (el catálogo se importa con `import()`), así que
 * ninguno se necesita antes de que haya algo en pantalla con qué pintarlo. El fragmento se pide en cuanto este
 * módulo se evalúa, a la vez que los datos, y mientras no llega cada icono reserva su caja para que nada se
 * mueva. Así el paquete inicial no crece con cada categoría que se añade (ver el historial de
 * `scripts/perf/check-bundle.ts`). Nombres desconocidos usan un icono genérico, así una categoría nueva nunca
 * rompe la UI.
 *
 * Los iconos de un sector con dibujos pesados (hoy Mascotas) viven en su propio fragmento y se piden solo cuando se
 * pinta uno de ellos (ver `fragmentos.ts`): hasta que llega, el icono reserva su caja igual.
 */
import { type LucideProps, UtensilsCrossed } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { IconComponent } from './dibujar.tsx'
import { FRAGMENTO_DE_ICONO, type Fragmento } from './fragmentos.ts'

let dibujos: Record<string, IconComponent> | undefined
let carga: Promise<void> | undefined

function cargarDibujos(): Promise<void> {
  carga ??= import('./registro-de-iconos.tsx')
    .then((m) => {
      dibujos = m.ICONOS
    })
    .catch((error) => {
      // Sin red: el icono se queda en su caja vacía y la guía sigue entera. Se vuelve a intentar al pedirlo otra vez.
      carga = undefined
      throw error
    })
  return carga
}

// Sin esperar a un respiro: los datos del catálogo se piden ahora mismo y los iconos tienen que llegar con ellos.
if (typeof window !== 'undefined') cargarDibujos().catch(() => {})

const CARGADORES: Record<Fragmento, () => Promise<Record<string, IconComponent>>> = {
  mascotas: () => import('./iconos-de-mascotas.tsx').then((m) => m.ICONOS_DE_MASCOTAS),
}
const fragmentos: Partial<Record<Fragmento, Record<string, IconComponent>>> = {}
const cargasDeFragmento: Partial<Record<Fragmento, Promise<void>>> = {}

function cargarFragmento(fragmento: Fragmento): Promise<void> {
  cargasDeFragmento[fragmento] ??= CARGADORES[fragmento]()
    .then((dibujosDelFragmento) => {
      fragmentos[fragmento] = dibujosDelFragmento
    })
    .catch((error) => {
      delete cargasDeFragmento[fragmento]
      throw error
    })
  return cargasDeFragmento[fragmento]
}

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const [cargado, setCargado] = useState(dibujos)
  // Solo sirve para volver a pintar cuando llega un fragmento: lo cargado se lee del módulo.
  const [, avisar] = useState(0)
  const fragmento = Object.hasOwn(FRAGMENTO_DE_ICONO, name) ? FRAGMENTO_DE_ICONO[name] : undefined
  useEffect(() => {
    if (cargado) return
    let vivo = true
    cargarDibujos()
      .then(() => vivo && setCargado(dibujos))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [cargado])
  useEffect(() => {
    if (!fragmento || fragmentos[fragmento]) return
    let vivo = true
    cargarFragmento(fragmento)
      .then(() => vivo && avisar((n) => n + 1))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [fragmento])
  const dibujosDelFragmento = fragmento ? fragmentos[fragmento] : undefined
  if (!cargado || (fragmento && !dibujosDelFragmento)) {
    const { size = 24 } = props
    return (
      <span aria-hidden="true" style={{ display: 'inline-block', width: size, height: size }} />
    )
  }
  // `hasOwn` y no `cargado[name]` a secas: con un nombre como `constructor` el índice devolvería lo
  // heredado de `Object` y React intentaria pintarlo como componente.
  const origen = dibujosDelFragmento ?? cargado
  const Icon = Object.hasOwn(origen, name) ? (origen[name] ?? UtensilsCrossed) : UtensilsCrossed
  return <Icon aria-hidden="true" focusable="false" {...props} />
}

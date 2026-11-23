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
 */
import { type LucideProps, UtensilsCrossed } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { IconComponent } from './dibujar.tsx'

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

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const [cargado, setCargado] = useState(dibujos)
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
  if (!cargado) {
    const { size = 24 } = props
    return (
      <span aria-hidden="true" style={{ display: 'inline-block', width: size, height: size }} />
    )
  }
  // `hasOwn` y no `cargado[name]` a secas: con un nombre como `constructor` el índice devolvería lo
  // heredado de `Object` y React intentaria pintarlo como componente.
  const Icon = Object.hasOwn(cargado, name) ? (cargado[name] ?? UtensilsCrossed) : UtensilsCrossed
  return <Icon aria-hidden="true" focusable="false" {...props} />
}

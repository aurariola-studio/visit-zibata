/**
 * La marca de aurariola.com, reconstruida desde su guía de réplica.
 *
 * Es un anillo ("o" de aureola, por el origen latino de Orihuela: aurum, oro) dibujado en píxeles
 * sobre una teja redondeada, con un único módulo en oro: el cursor, lo que escribe. Esa es la regla
 * que no se toca, nunca hay más de un módulo en color.
 *
 * Rejilla de 256 con paso 32: los módulos caen en 17, 49, 81, 113, 145, 177 y 209, y cada uno mide
 * 30 con radio 4. Se generan desde las filas en vez de escribir veintisiete rectángulos a mano,
 * porque así el dibujo se lee como lo que es y un error de un píxel salta a la vista.
 */

/** Cada fila del anillo: la coordenada y, y las x que llevan módulo. */
const FILAS: [number, number[]][] = [
  [17, [81, 113, 145]],
  [49, [49, 81, 113, 145, 177]],
  [81, [17, 49, 177, 209]],
  [113, [17, 49, 177, 209]],
  [145, [17, 49, 177, 209]],
  [177, [49, 81, 113, 145]],
  [209, [81, 113, 145]],
]

/** El cursor: el único módulo en oro, abajo a la derecha del anillo. */
const CURSOR = { x: 177, y: 177 }

export function AurariolaMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect x="8" y="8" width="240" height="240" rx="52" fill="#14161b" />
      <g fill="#f1efe9">
        {FILAS.flatMap(([y, xs]) =>
          xs.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="30" height="30" rx="4" />),
        )}
      </g>
      {/* Oro de marca sin oscurecer: aquí es un dibujo, no texto, así que le basta con 3:1. */}
      <rect {...CURSOR} width="30" height="30" rx="4" fill="#d6a93e" />
    </svg>
  )
}

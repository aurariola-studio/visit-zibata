import type { LucideProps } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'

export type IconComponent = ComponentType<LucideProps>

/** Icono propio con la misma geometría de trazo que Lucide (24×24, trazo redondeado). */
export function custom(children: ReactNode): IconComponent {
  return function CustomIcon({
    size = 24,
    strokeWidth = 2,
    color = 'currentColor',
    absoluteStrokeWidth: _,
    ...rest
  }) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {children}
      </svg>
    )
  }
}

/**
 * Icono relleno (Material Design Icons, Material Symbols, game-icons): las siluetas de esas familias
 * no se dibujan con trazo, así que llevan `fill` y no `stroke`. Con `size` y `color` se comporta
 * igual que `custom`.
 */
export function solid(children: ReactNode, viewBox = '0 0 24 24'): IconComponent {
  return function SolidIcon({
    size = 24,
    color = 'currentColor',
    absoluteStrokeWidth: _,
    ...rest
  }) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={viewBox}
        fill={color}
        aria-hidden="true"
        {...rest}
      >
        {children}
      </svg>
    )
  }
}

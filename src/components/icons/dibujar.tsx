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
 * Icono relleno (Material Design Icons y Material Symbols): las siluetas de esas familias
 * no se dibujan con trazo, así que llevan `fill` y no `stroke`. Con `size` y `color` se comporta
 * igual que `custom`. `engrosado` añade un contorno del mismo color (en px a tamaño 24) a los dibujos
 * de trazo fino, como los de Fluent Emoji, para que pesen como los demás.
 */
export function solid(children: ReactNode, viewBox = '0 0 24 24', engrosado = 0): IconComponent {
  const contorno = engrosado
    ? {
        strokeWidth: (engrosado * Number(viewBox.split(' ')[2])) / 24,
        strokeLinejoin: 'round' as const,
      }
    : {}
  return function SolidIcon({
    size = 24,
    color = 'currentColor',
    absoluteStrokeWidth: _,
    // Quien llama pasa el grosor de los íconos de trazo (2): aquí es el del dibujo, no el de la interfaz.
    strokeWidth: _grosor,
    ...rest
  }) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={viewBox}
        fill={color}
        stroke={engrosado ? color : undefined}
        {...contorno}
        aria-hidden="true"
        {...rest}
      >
        {children}
      </svg>
    )
  }
}

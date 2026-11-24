import type { LucideProps } from 'lucide-react'
import { type ComponentType, type ReactNode, useId } from 'react'

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

/**
 * Mascota con una insignia (la cruz, el hospital) que muerde su esquina: la línea de la mascota se corta alrededor
 * de la silueta de la insignia con un hueco parejo, sin fondo, así que la mascota se ve entera y las dos piezas se
 * leen como una sola. Todo va con el mismo trazo (`GROSOR_CON_INSIGNIA`): el de la interfaz (2) se ignora, como en
 * `solid`, porque aquí el trazo lo fija la mascota escalada. `mascota` es la mascota ya escalada y colocada, `corte`
 * es la silueta de la insignia más su hueco (se pinta negra en una máscara) e `insignia` es su dibujo.
 *
 * La máscara necesita un id propio por copia: el mismo icono sale varias veces en una página (píldora, tarjetas,
 * panel de escritorio y hoja móvil) y con un id fijo todos los `url(#...)` apuntarían al primero que haya, que puede
 * estar en un contenedor oculto. `useId` da un id por instancia; se le quitan los signos que `url(#...)` no admite.
 */
export const GROSOR_CON_INSIGNIA = 1.56

export function conInsignia(
  mascota: ReactNode,
  corte: ReactNode,
  insignia: ReactNode,
): IconComponent {
  return function ConInsignia({
    size = 24,
    color = 'currentColor',
    absoluteStrokeWidth: _,
    strokeWidth: _grosor,
    ...rest
  }) {
    const id = `corte-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={GROSOR_CON_INSIGNIA}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        <defs>
          <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect width="24" height="24" fill="#fff" stroke="none" />
            <g fill="#000" stroke="none">
              {corte}
            </g>
          </mask>
        </defs>
        <g mask={`url(#${id})`}>{mascota}</g>
        {insignia}
      </svg>
    )
  }
}

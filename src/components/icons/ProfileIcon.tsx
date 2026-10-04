/**
 * El sello de "Tu Zibatá": una persona dentro de un pin de ubicación. Junta las dos cosas que tenía
 * que decir, quién eres y dónde estás, con la forma que todo el mundo lee como "un lugar" sin tener
 * que aprender nada.
 *
 * Trazo de 1,5: a 31 px, que es como sale en la barra, uno de 2 pesaba más que los iconos vecinos.
 */
import type { LucideProps } from 'lucide-react'

export function ProfileIcon(props: LucideProps) {
  const { size = 24, strokeWidth = 1.5, ...rest } = props
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {/* El pin, con la punta donde estaría el lugar. */}
      <path d="M12 21.2c4.6-5.2 6.9-8.8 6.9-11.4a6.9 6.9 0 1 0-13.8 0c0 2.6 2.3 6.2 6.9 11.4Z" />
      {/* La persona dentro: cabeza y hombros, del tamaño justo para leerse a 18 px. */}
      <circle cx="12" cy="7.7" r="2.1" />
      <path d="M8.7 13.5a3.4 3.4 0 0 1 6.6 0" />
    </svg>
  )
}

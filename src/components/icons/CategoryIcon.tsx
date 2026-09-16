/**
 * Iconos de categoría. `categories.json` referencia un nombre (`icon`); aquí se resuelve a un
 * componente. Nombres desconocidos usan un icono genérico, así una categoría nueva nunca rompe la UI.
 */
import {
  Beef,
  Beer,
  ChefHat,
  Coffee,
  CupSoda,
  Drumstick,
  Fish,
  Hamburger,
  IceCreamCone,
  type LucideProps,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Utensils,
  UtensilsCrossed,
} from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'

type IconComponent = ComponentType<LucideProps>

/** Icono propio con la misma geometría de trazo que Lucide (24×24, trazo redondeado). */
function custom(children: ReactNode): IconComponent {
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

const Taco = custom(
  <>
    <path d="M2.5 17.5a9.5 9.5 0 0 1 19 0Z" />
    <path d="M5 12.2c.9-.9 1.8-.4 2.5-1.2.7-.8 1.8-.4 2.5-1s1.6-.6 2.3 0 1.8.2 2.5 1 1.6.3 2.5 1.2" />
  </>,
)

const Pasta = custom(
  <>
    <path d="M3.5 12.5h17a8.5 8.5 0 0 1-17 0Z" />
    <path d="M8 12.5c0-2.5 1.5-3 1.5-5.5S8 4 8 4" />
    <path d="M12 12.5c0-2.5 1.5-3 1.5-5.5S12 3.5 12 3.5" />
    <path d="M16 12.5c0-2.5 1.5-3 1.5-5.5S16 4 16 4" />
  </>,
)

const ICONS: Record<string, IconComponent> = {
  coffee: Coffee,
  'chef-hat': ChefHat,
  taco: Taco,
  fish: Fish,
  beef: Beef,
  hamburger: Hamburger,
  pizza: Pizza,
  pasta: Pasta,
  chopsticks: Soup,
  salad: Salad,
  sandwich: Sandwich,
  drumstick: Drumstick,
  utensils: Utensils,
  'ice-cream': IceCreamCone,
  'cup-soda': CupSoda,
  beer: Beer,
  'utensils-crossed': UtensilsCrossed,
}

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? UtensilsCrossed
  return <Icon aria-hidden="true" focusable="false" {...props} />
}

/**
 * Iconos de categoría. `categories.json` referencia un nombre (`icon`); aquí se resuelve a un
 * componente. Nombres desconocidos usan un icono genérico, así una categoría nueva nunca rompe la UI.
 */
import {
  Beef,
  Beer,
  CakeSlice,
  Candy,
  Cherry,
  Coffee,
  CookingPot,
  Croissant,
  CupSoda,
  Drumstick,
  Dumbbell,
  EggFried,
  Fish,
  Flame,
  Hamburger,
  HandPlatter,
  IceCreamCone,
  LeafyGreen,
  type LucideProps,
  Martini,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Shrimp,
  UtensilsCrossed,
  Wine,
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

/** Tazón de fetuccine con el tenedor al lado. */
const Pasta = custom(
  <>
    <path d="M2.8 14.6h14.4a7.2 7.2 0 0 1-14.4 0Z" />
    <path d="M5.6 12.4c1.2-1.8 3-1.4 4.2-.4 1.2 1 2.8.8 3.8-.6" />
    <path d="M20 21V9.6" />
    <path d="M17.4 3.2v4.2a2.6 2.6 0 0 0 5.2 0V3.2" />
    <path d="M20 3.2v4.2" />
  </>,
)

/** Tazón con palillos: cocina asiática en general. */
const Chopsticks = custom(
  <>
    <path d="M3 13h18a9 8 0 0 1-18 0Z" />
    <path d="m11.5 10.5 7-7.5" />
    <path d="m14.5 10.5 6-5.5" />
  </>,
)

/** Tazón con ingredientes encima: poke y bowls. */
const Bowl = custom(
  <>
    <path d="M3 13h18a9 8 0 0 1-18 0Z" />
    <circle cx="8" cy="10" r="1.6" />
    <circle cx="12.5" cy="8.6" r="2.1" />
    <circle cx="16.8" cy="10.4" r="1.2" />
  </>,
)

/** Torta: bolillo abierto con relleno, distinto del sándwich de pan de caja. */
const Torta = custom(
  <>
    <path d="M3 11c0-3 4-5.5 9-5.5s9 2.5 9 5.5Z" />
    <path d="M3.5 14.5h17" />
    <path d="M4 17.5c0 .8.7 1.5 1.5 1.5h13c.8 0 1.5-.7 1.5-1.5v-1H4Z" />
  </>,
)

/** Waffle: rejilla dentro de un cuadrado redondeado. */
const Waffle = custom(
  <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17" />
  </>,
)

/** Baguette: barra en diagonal con sus tres cortes, como sale del horno. */
const Baguette = custom(
  <>
    <path d="M4.9 19.1c-1.4-1.4-.6-4.4 1.8-6.8l5.6-5.6c2.4-2.4 5.4-3.2 6.8-1.8s.6 4.4-1.8 6.8l-5.6 5.6c-2.4 2.4-5.4 3.2-6.8 1.8Z" />
    <path d="m7.4 14.7 1.9 1.9M10.6 11.5l1.9 1.9M13.8 8.3l1.9 1.9" />
  </>,
)

/** Molcajete con su tejolote: la cocina mexicana de siempre, no un gorro de chef. */
const Molcajete = custom(
  <>
    <path d="M3.4 10.8h17.2a8.6 8.6 0 0 1-17.2 0Z" />
    <path d="M6.9 17.7 5.7 20M17.1 17.7l1.2 2.3" />
    <path d="m14.6 10.6 4.2-5.6" />
  </>,
)

/** Rebanada de pan de caja con sus hombros y el bolillo delante. */
const Pan = custom(
  <>
    <path d="M9.4 15.4V10.6c0-.7-.4-1.1-1-1.5a5.6 5.6 0 0 1 10.2 0c-.6.4-1 .8-1 1.5v4.8" />
    <path d="M12.4 11.4h.01M15.4 10.6h.01" />
    <ellipse cx="10.4" cy="17.4" rx="7.8" ry="3.4" />
    <path d="m7.4 16.4 1-1.6M10.6 16.8l1-1.8M13.8 16.4l.9-1.6" />
  </>,
)

/** Dos rollos de maki, que es como se dibuja el sushi en todos lados. */
const Nigiri = custom(
  <>
    <ellipse cx="8" cy="9.6" rx="4.4" ry="2.2" />
    <path d="M3.6 9.6v5.2c0 1.2 2 2.2 4.4 2.2s4.4-1 4.4-2.2V9.6" />
    <ellipse cx="8" cy="9.6" rx="1.6" ry="0.8" />
    <ellipse cx="17" cy="12.4" rx="4.4" ry="2.2" />
    <path d="M12.6 12.4v5.2c0 1.2 2 2.2 4.4 2.2s4.4-1 4.4-2.2v-5.2" />
    <ellipse cx="17" cy="12.4" rx="1.6" ry="0.8" />
  </>,
)

/** Panqué en su capacillo: la repostería por encargo. */
const Cupcake = custom(
  <>
    <path d="M5.4 12.6h13.2l-1.4 6.2a2 2 0 0 1-2 1.6H8.8a2 2 0 0 1-2-1.6Z" />
    <path d="M4.4 12.6a3.4 3.4 0 0 1 2.8-3.3 4.2 4.2 0 0 1 8.1-1.1 3.2 3.2 0 0 1 4.3 4.4Z" />
    <path d="M10.2 15.2v3.4M13.8 15.2v3.4" />
  </>,
)

/** Bowl con fruta y su cuchara: los bowls de açaí. */
const Acai = custom(
  <>
    <path d="M3.4 11.8h17.2a8.6 8.6 0 0 1-17.2 0Z" />
    <circle cx="8.6" cy="8.6" r="2" />
    <circle cx="13.1" cy="7.4" r="2.3" />
    <path d="m17.4 9.6 3.4-6.2" />
  </>,
)

/** Vaso con popote y rodaja: los jugos y smoothies. */
const Jugo = custom(
  <>
    <path d="M7.2 8.4h9.6l-1.1 10.4a2 2 0 0 1-2 1.8h-3.4a2 2 0 0 1-2-1.8Z" />
    <path d="M6.6 11.8h10.8" />
    <path d="m14.4 8.4 2.9-5.2" />
    <path d="M8.6 5.4c1.3-1.4 3.4-1.4 4.7 0" />
  </>,
)

/** Vaso de boba con las perlas separadas, que antes se apelmazaban. */
const Boba = custom(
  <>
    <path d="M6.8 8h10.4l-1.1 10.8a2 2 0 0 1-2 1.8h-4.2a2 2 0 0 1-2-1.8Z" />
    <path d="M5.8 8h12.4" />
    <path d="m13.6 8 2.6-4.8" />
    <circle cx="10.2" cy="17.4" r="0.8" />
    <circle cx="13.6" cy="17.4" r="0.8" />
  </>,
)

/** Bolsa de papas fritas, sellada arriba y abajo. */
const Papas = custom(
  <>
    <path d="M7 7.2h10v10.2H7Z" />
    <path d="m7 7.2-1.6-2.8h13.2L17 7.2M7 17.4l-1.6 2.8h13.2L17 17.4" />
    <path d="M15 12.3A2.21 2.21 0 0 1 13.9 14.3A2.21 2.21 0 0 1 11.3 14.8A2.21 2.21 0 0 1 9.3 13.4A2.21 2.21 0 0 1 9.3 11.2A2.21 2.21 0 0 1 11.3 9.8A2.21 2.21 0 0 1 13.9 10.3A2.21 2.21 0 0 1 15 12.3Z" />
  </>,
)

/**
 * Mazorca de pie: la línea central parte en dos las hileras de granos, y las dos hojas de la envoltura
 * suben abiertas, una a cada lado. La versión anterior iba inclinada y con los granos punto a punto,
 * que a 20 píxeles, el tamaño al que se ve en la lista, se apelmazaban en un borrón.
 */
const Elote = custom(
  <>
    <path d="M12 2.4c2.6 0 4.5 3.4 4.5 7.9s-1.9 7.9-4.5 7.9-4.5-3.4-4.5-7.9S9.4 2.4 12 2.4Z" />
    <path d="M12 3.4v13.8" />
    <path d="M8.6 7c2.2 1.1 4.6 1.1 6.8 0M8 10.6c2.6 1.2 5.4 1.2 8 0M8.6 14.2c2.2 1.1 4.6 1.1 6.8 0" />
    <path d="M10.2 17.8c-2.6-1-4.3-3.2-5.1-6.6 2.8.3 4.7 2 5.7 5.2Z" />
    <path d="M13.8 17.8c2.6-1 4.3-3.2 5.1-6.6-2.8.3-4.7 2-5.7 5.2Z" />
  </>,
)

/** Bagel con sus semillas, en vez del anillo geométrico de antes. */
const Bagel = custom(
  <>
    <circle cx="12" cy="12" r="8.8" />
    <circle cx="12" cy="12" r="3.2" />
    <path d="M8.4 6.6h.01M15.4 7.4h.01M17.4 13.4h.01M11.6 18h.01M6.4 14.8h.01" />
  </>,
)

/** Trompo en su asador vertical: así se ve un kebab desde la calle. */
const Kebab = custom(
  <>
    <path d="M12 2.6v3.4" />
    <path d="M7.4 6h9.2c0 4.6-.8 7.4-1.9 9.6-.8 1.7-1.7 2.6-2.7 2.6s-1.9-.9-2.7-2.6C8.2 13.4 7.4 10.6 7.4 6Z" />
    <path d="M8.2 10.6h7.6M9.2 14.4h5.6" />
  </>,
)

/** El taco y el consomé del mismo tamaño, sobre la tabla. */
const Birria = custom(
  <>
    <path d="M2.4 20.4h19.2" />
    <path d="M2.8 17.4a5.2 5.2 0 0 1 10.4 0Z" />
    <path d="M5.4 17.4c.9-.8 1.8-.8 2.7 0s1.8.8 2.7 0" />
    <path d="M13.8 13.8h7.8a3.9 3.9 0 0 1-7.8 0Z" />
    <path d="M16.4 11c-.7-.8-.7-1.6 0-2.4M19.2 11c-.7-.8-.7-1.6 0-2.4" />
  </>,
)

/** Comal con dos antojitos vistos desde arriba. */
const Antojito = custom(
  <>
    <circle cx="10.6" cy="13" r="7.4" />
    <path d="m17.4 10.2 4-1.4" />
    <path d="M6.2 12.6a2.2 2.2 0 0 1 4.4 0Z" />
    <path d="M10.4 15.8a2.4 2.4 0 0 1 4.8 0Z" />
  </>,
)

/** Memela vista desde arriba: la masa, la salsa irregular dentro y el queso encima. */
const Memela = custom(
  <>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M18 12A3.09 3.09 0 0 1 16.6 15.6A3.09 3.09 0 0 1 13 17.5A3.09 3.09 0 0 1 9 16.8A3.09 3.09 0 0 1 6.4 13.9A3.09 3.09 0 0 1 6.4 10.1A3.09 3.09 0 0 1 9 7.2A3.09 3.09 0 0 1 13 6.5A3.09 3.09 0 0 1 16.6 8.4A3.09 3.09 0 0 1 18 12.0Z" />
    <path d="M9.6 10.6h.01M12.4 9.8h.01M14.2 12h.01M10.4 13.8h.01M13.2 14.2h.01" />
  </>,
)

/** Tortilla doblada: el doblez liso arriba y el queso saliendo por la curva. */
const Quesadilla = custom(
  <g transform="rotate(-20 12 12)">
    <path d="M20.2 10.4a8.2 8.2 0 0 1-16.4 0Z" />
    <path d="M7.6 15.4v2.2a1.3 1.3 0 0 0 2.6 0" />
    <path d="M11.8 16.6v2.4a1.4 1.4 0 0 0 2.8 0v-.8" />
    <path d="M16 14.8v1.8" />
  </g>,
)

/** Arepa con el borde ondulado y las marcas del comal, que es lo que la hace arepa. */
const Arepa = custom(
  <>
    <path d="M20.2 12A4.24 4.24 0 0 1 19.1 16.1A4.24 4.24 0 0 1 16.1 19.1A4.24 4.24 0 0 1 12 20.2A4.24 4.24 0 0 1 7.9 19.1A4.24 4.24 0 0 1 4.9 16.1A4.24 4.24 0 0 1 3.8 12A4.24 4.24 0 0 1 4.9 7.9A4.24 4.24 0 0 1 7.9 4.9A4.24 4.24 0 0 1 12 3.8A4.24 4.24 0 0 1 16.1 4.9A4.24 4.24 0 0 1 19.1 7.9A4.24 4.24 0 0 1 20.2 12Z" />
    <path d="m7.8 14.6 4.4-4.4M10.4 16.4l5.2-5.2M13.6 17.2l3.8-3.8" />
  </>,
)

/** Plato de pasta a la bolonesa: el estante italiano y su giro general. */
const Italiana = custom(
  <>
    <path d="M2.2 12.6h19.6a9.8 4.6 0 0 1-19.6 0Z" />
    <path d="M5.4 11c1.5-1.9 3.3-1.4 4.6-.4 1.3 1 3 .8 4-.6" />
    <path d="M6.8 8.4c1.7-1.7 3.5-1 4.8.4 1.3 1.4 3.1 1.2 4.3-.4" />
    <circle cx="16.8" cy="11.2" r="1.7" />
    <circle cx="12.4" cy="11.6" r="1.5" />
  </>,
)

/** Hot cakes con su café: los discos van sueltos para que no se lean como un pan con carne. */
const Hotcakes = custom(
  <>
    <path d="M4.4 11h6v4.4a3 3 0 0 1-6 0Z" />
    <path d="M4.4 12H3.2a1.7 1.7 0 0 0 0 3.4h1.2" />
    <path d="M6.2 8.8c-.7-.8-.7-1.6 0-2.4" />
    <ellipse cx="16.4" cy="12" rx="5.4" ry="1.8" />
    <ellipse cx="16.4" cy="15.4" rx="5.4" ry="1.8" />
    <ellipse cx="16.4" cy="18.8" rx="5.4" ry="1.8" />
    <rect x="15.1" y="9.2" width="2.6" height="1.9" rx="0.6" />
  </>,
)

/** Un cerdo: las carnitas son de cerdo y el dibujo lo dice sin rodeos. */
const Cerdo = custom(
  <>
    <path d="M4.4 13c0-4.1 3.4-7 7.6-7s7.6 2.9 7.6 7-3.4 6.6-7.6 6.6S4.4 17.1 4.4 13Z" />
    <path d="M5.6 8.4 4.2 4.4l4.2 1.8M18.4 8.4l1.4-4-4.2 1.8" />
    <rect x="9" y="12.6" width="6" height="4.2" rx="2.1" />
    <path d="M10.8 14.6h.01M13.2 14.6h.01" />
    <path d="M8.4 10.4h.01M15.6 10.4h.01" />
  </>,
)

/** Lámina fina de cecina, de grosor parejo y con el veteado: así se vende, en hoja. */
const Cecina = custom(
  <>
    <path d="M2.8 9.2c3-1.7 6.1 1.7 9.2 0s6.2-1.7 9.2 0v5.6c-3 1.7-6.1-1.7-9.2 0s-6.2 1.7-9.2 0Z" />
    <path d="M6.6 11.6c1.8-.9 3.6.9 5.4 0M13.4 13.4c1.4-.7 2.8.5 4.2-.2" />
  </>,
)

/** Cono de papas a la francesa. La bolsa de papas fritas es otro dibujo, el de Papas Preparadas. */
const PapasFritas = custom(
  <>
    <path d="M6.8 10.6h10.4l-1.1 9a1.5 1.5 0 0 1-1.5 1.3H9.4a1.5 1.5 0 0 1-1.5-1.3Z" />
    <path d="M6.4 13.8h11.2" />
    <path d="M9.6 10.6V5.4M12 10.6V3.4M14.4 10.6V5" />
  </>,
)

/** Pan alargado con la mostaza de punta a punta: la onda es lo que sobrevive a 20 píxeles. */
const HotDog = custom(
  <>
    <rect x="2.2" y="9" width="19.6" height="8" rx="4" />
    <path d="M4.4 13c1.5-1.9 3-1.9 4.5 0s3 1.9 4.5 0 3-1.9 4.5 0" />
  </>,
)

/** Media luna con el repulgue en la curva, que es lo que la separa de la quesadilla. */
const Empanada = custom(
  <>
    <path d="M3.8 17.8a8.2 8.2 0 0 1 16.4 0Z" />
    <path d="m4.8 14.8 1.6 1.3M7.4 11.9l1.3 1.6M10.6 10.1l.8 1.9M14 10.2l-.7 1.9M17 12.1l-1.3 1.5M19.3 15l-1.6 1.2" />
  </>,
)

/** Rollo de pan plano con el corte al bies arriba y la costura del enrollado. */
const Wrap = custom(
  <g transform="rotate(14 12 12)">
    <path d="M6.6 5.6h10.8v12.6a5.4 5.4 0 0 1-10.8 0Z" />
    <path d="M17.4 5.6a5.4 2.6 0 0 1-10.8 0 5.4 2.6 0 0 1 10.8 0Z" />
    <path d="m6.6 14.4 10.8-4.6" />
  </g>,
)

/** Crepa doblada en cuarto. Los dobleces radian de la punta; sin puntos, que serían una pizza. */
const Crepa = custom(
  <>
    <path d="M12 20.4 4.4 9.2a13.2 13.2 0 0 1 15.2 0Z" />
    <path d="M12 20.4 8.6 9.9M12 20.4l3.4-10.5" />
  </>,
)

/** Tazón de fruta, ahora que el açaí tiene el suyo. */
const Fruta = custom(
  <>
    <path d="M3.6 12.8h16.8a8.4 8.4 0 0 1-16.8 0Z" />
    <path d="M7.4 12.8a2.6 2.6 0 0 1 5.2 0" />
    <circle cx="15.6" cy="10.6" r="2.2" />
    <path d="M15.6 8.4c0-1.2 1-2 2.2-1.8" />
  </>,
)

/** Tazón de ramen con su huevo y el vapor. */
const Ramen = custom(
  <>
    <path d="M3.2 12.8h17.6a8.8 8.8 0 0 1-17.6 0Z" />
    <path d="M5.8 10.6c1.4-1.7 3-1.2 4.2-.2 1.2 1 2.8.8 3.8-.6" />
    <path d="M13.4 12.8a2.7 2.7 0 0 1 5.4 0" />
    <circle cx="16.1" cy="11.6" r="0.9" />
    <path d="M7.6 8c-.8-.9-.8-1.8 0-2.7" />
  </>,
)

const ICONS: Record<string, IconComponent> = {
  acai: Acai,
  antojito: Antojito,
  arepa: Arepa,
  bagel: Bagel,
  baguette: Baguette,
  beef: Beef,
  beer: Beer,
  birria: Birria,
  boba: Boba,
  bowl: Bowl,
  'cake-slice': CakeSlice,
  candy: Candy,
  cecina: Cecina,
  cerdo: Cerdo,
  cherry: Cherry,
  chopsticks: Chopsticks,
  coffee: Coffee,
  'cooking-pot': CookingPot,
  crepa: Crepa,
  croissant: Croissant,
  'cup-soda': CupSoda,
  cupcake: Cupcake,
  drumstick: Drumstick,
  dumbbell: Dumbbell,
  'egg-fried': EggFried,
  elote: Elote,
  empanada: Empanada,
  fish: Fish,
  flame: Flame,
  fruta: Fruta,
  hamburger: Hamburger,
  'hand-platter': HandPlatter,
  'hot-dog': HotDog,
  hotcakes: Hotcakes,
  'ice-cream': IceCreamCone,
  italiana: Italiana,
  jugo: Jugo,
  kebab: Kebab,
  'leafy-green': LeafyGreen,
  martini: Martini,
  memela: Memela,
  molcajete: Molcajete,
  nigiri: Nigiri,
  pan: Pan,
  papas: Papas,
  'papas-fritas': PapasFritas,
  pasta: Pasta,
  pizza: Pizza,
  ramen: Ramen,
  popcorn: Popcorn,
  quesadilla: Quesadilla,
  salad: Salad,
  sandwich: Sandwich,
  shrimp: Shrimp,
  taco: Taco,
  torta: Torta,
  'utensils-crossed': UtensilsCrossed,
  waffle: Waffle,
  wrap: Wrap,
  wine: Wine,
}

/** ¿Hay dibujo para este nombre? Una prueba lo exige a cada icono usado en los datos. */
export function hasCategoryIcon(name: string): boolean {
  return Object.hasOwn(ICONS, name)
}

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? UtensilsCrossed
  return <Icon aria-hidden="true" focusable="false" {...props} />
}

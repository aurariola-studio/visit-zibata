/**
 * Iconos de categoría. `categories.json` referencia un nombre (`icon`); aquí se resuelve a un
 * componente. Nombres desconocidos usan un icono genérico, así una categoría nueva nunca rompe la UI.
 */
import {
  Beef,
  Beer,
  BicepsFlexed,
  Bone,
  CakeSlice,
  Cherry,
  Coffee,
  CookingPot,
  Croissant,
  CupSoda,
  Drumstick,
  EggFried,
  Fish,
  Flame,
  Glasses,
  Hamburger,
  HandPlatter,
  HeartPulse,
  IceCreamCone,
  LeafyGreen,
  type LucideProps,
  Martini,
  Microscope,
  Pill,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  ShoppingBasket,
  ShoppingCart,
  Shrimp,
  Stethoscope,
  Store,
  UtensilsCrossed,
  Wine,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { custom, type IconComponent, solid } from './dibujar.tsx'

/** Taco con su relleno: Tacos y Antojitos y la taquería. Hugeicons (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Taco = custom(
  <>
    <path d="M12 9c-4.32 0-8.01 2.94-9.47 7.07c-.53 1.5-.79 2.25-.18 3.09C2.95 20 3.94 20 5.92 20h12.16c1.98 0 2.97 0 3.57-.84c.61-.84.34-1.59-.18-3.09C20.01 11.94 16.32 9 12 9Z" />
    <path d="M21.33 15a3.24 3.24 0 0 0-.24-4.22a3.3 3.3 0 0 1-.9-1.97c-.15-1.68-1.57-3.02-3.34-3.14l-.2-.01a4 4 0 0 1-2.15-.81c-1.44-1.11-3.54-1.11-4.98 0a4 4 0 0 1-2.15.81l-.2.02c-1.78.13-3.2 1.47-3.34 3.14a3.3 3.3 0 0 1-.9 1.98A3.24 3.24 0 0 0 2.67 15m3.46 2H6m.25 0a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0Z" />
    <path d="M8.13 14H8m.25 0a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0Z" />
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

/** Molcajete con su tejolote: la cocina mexicana de siempre. Iconoven (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Molcajete = custom(
  <path d="m11.49 9.57-.98-1.14q-.66-.75.14-1.34l4.83-3.58q.8-.59 1.46.17l.12.14q.66.76-.04 1.48l-4.17 4.3q-.7.72-1.36-.03M4.25 13.5h15.5a7.75 7.75 0 0 1-15.5 0" />,
)

/** Sándwich: Entre Panes. Hugeicons (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Pan = custom(
  <>
    <path d="M2.99 17c0 .93 0 1.4.15 1.77a2 2 0 0 0 1.08 1.08C4.59 20 5.06 20 5.99 20h12c.93 0 1.4 0 1.77-.15a2 2 0 0 0 1.08-1.08c.15-.37.15-.83.15-1.76" />
    <path d="m3.02 13l-.42.66c-.29.45-.44.68-.49.82c-.43 1.07.38 2.23 1.49 2.15c.14-.01.4-.08.9-.22c.14-.04.21-.06.28-.07a2.9 2.9 0 0 1 1.46.04c.07.02.14.04.27.09l.48.17c.63.22.94.33 1.26.36q.25.03.5.01c.32-.02.64-.11 1.28-.3l.31-.09c.82-.24 1.22-.36 1.64-.36s.83.12 1.64.36l.31.09c.64.19.96.28 1.28.3q.25.02.5-.01c.32-.04.64-.14 1.26-.36l.48-.17c.14-.05.2-.07.27-.09c.48-.14.98-.15 1.46-.04c.07.02.14.04.28.08c.51.14.76.21.9.23c1.11.08 1.92-1.08 1.49-2.15c-.06-.14-.2-.37-.49-.82L20.96 13" />
    <path d="M20.99 11.1c0-.64 0-.96-.09-1.26s-.25-.57-.59-1.1l-1.48-2.36c-.88-1.4-1.32-2.11-2.02-2.32c-.69-.22-1.42.11-2.89.78L5.42 8.72c-1.18.53-1.76.8-2.09 1.33c-.33.53-.33 1.21-.33 2.57V13h18z" />
    <path d="M3.99 9.5h16.5" />
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

/** Plato de espagueti: la cocina italiana. Hugeicons (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Italiana = custom(
  <>
    <path d="M21.29 13H2.71c-1.52 0-.22 2.24.46 2.58l2.36 1.18c.24.12.35.18.45.26c.88.78 1.04 2.14 2.15 2.74c.44.24.97.24 2.01.24h3.72c1.05 0 1.57 0 2.01-.24c1.11-.59 1.27-1.96 2.15-2.74c.1-.09.22-.14.45-.26l2.36-1.18c.69-.34 1.98-2.58.46-2.58" />
    <path d="M15 13a6 6 0 0 0-12 0" />
    <path d="M21 13c0-2.76-2.22-5-4.97-5c-.92 0-1.79.25-2.53.7M7 12.22C7 11 7.9 10 9 10s2 1 2 2.22V14M9 6.56c.43-1.77 2.33-2.87 4.24-2.47c1.91.4 3.11 2.15 2.68 3.92" />
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

/** Shaker o botella deportiva: vale igual para un batido que para un local de comida alta en proteína. Material Symbols (Apache 2.0). */
const Proteina = solid(
  <>
    <path d="M9.825 22q-.775 0-1.35-.513t-.65-1.287l-.775-8.65q-.025-.25.088-.462t.337-.338q.2-.125.35-.3t.15-.425q0-.225-.1-.413t-.3-.312q-.25-.125-.375-.387t-.05-.538L7.8 5.75q.075-.35.35-.55t.625-.2H11.5V4H11q-.425 0-.712-.287T10 3t.288-.712T11 2h3q.425 0 .713.288T15 3t-.288.713T14 4h-.5v1h2.725q.35 0 .613.2t.337.55l.675 2.625q.075.275-.05.538t-.375.387q-.2.1-.312.275t-.113.4q0 .275.138.463t.362.312t.35.338t.1.462l-.775 8.625q-.075.775-.65 1.3t-1.35.525z" />
  </>,
)

/** Galleta con mordida: Postres y Dulces. Material Design Icons (Apache 2.0). */
const Galleta = solid(
  <>
    <path d="M12 3a9 9 0 0 0-9 9a9 9 0 0 0 9 9a9 9 0 0 0 9-9c0-.5-.04-1-.13-1.5C20.6 10 20 10 20 10h-2V9c0-1-1-1-1-1h-2V7c0-1-1-1-1-1h-1V4c0-1-1-1-1-1M9.5 6A1.5 1.5 0 0 1 11 7.5A1.5 1.5 0 0 1 9.5 9A1.5 1.5 0 0 1 8 7.5A1.5 1.5 0 0 1 9.5 6m-3 4A1.5 1.5 0 0 1 8 11.5A1.5 1.5 0 0 1 6.5 13A1.5 1.5 0 0 1 5 11.5A1.5 1.5 0 0 1 6.5 10m5 1a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5m5 2a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5M11 16a1.5 1.5 0 0 1 1.5 1.5A1.5 1.5 0 0 1 11 19a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 11 16" />
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
  'biceps-flexed': BicepsFlexed,
  birria: Birria,
  boba: Boba,
  bone: Bone,
  bowl: Bowl,
  'cake-slice': CakeSlice,
  candy: Galleta,
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
  'egg-fried': EggFried,
  elote: Elote,
  empanada: Empanada,
  fish: Fish,
  flame: Flame,
  glasses: Glasses,
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
  proteina: Proteina,
  quesadilla: Quesadilla,
  salad: Salad,
  sandwich: Sandwich,
  'heart-pulse': HeartPulse,
  microscope: Microscope,
  pill: Pill,
  'shopping-basket': ShoppingBasket,
  'shopping-cart': ShoppingCart,
  shrimp: Shrimp,
  stethoscope: Stethoscope,
  store: Store,
  taco: Taco,
  torta: Torta,
  'utensils-crossed': UtensilsCrossed,
  waffle: Waffle,
  wrap: Wrap,
  wine: Wine,
}

/**
 * Los iconos de Fitness y Deporte (`iconos-deporte.tsx`) se cargan aparte, la primera vez que se pinta
 * uno. Hasta que llega el fragmento se reserva la caja del icono, para que nada se mueva al aparecer.
 */
const NOMBRES_DEPORTE = new Set([
  'dermatology',
  'ortodoncia',
  'tooth',
  'artes-marciales',
  'ballet',
  'barbell',
  'barre',
  'bike',
  'boxeo',
  'danza',
  'estiramiento',
  'funcional',
  'natacion',
  'padel',
  'pickleball',
  'pelotas',
  'pilates',
  'taekwondo',
  'yoga',
])

let deporte: Record<string, IconComponent> | undefined
let cargaDeporte: Promise<void> | undefined

function IconoDiferido({ name, ...props }: { name: string } & LucideProps) {
  const [cargado, setCargado] = useState(deporte)
  useEffect(() => {
    if (cargado) return
    cargaDeporte ??= import('./iconos-deporte.tsx').then((m) => {
      deporte = m.ICONOS_DEPORTE
    })
    let vivo = true
    // Si el fragmento no llega (sin red) el icono se queda en su caja vacía: la guía sigue entera.
    cargaDeporte
      .then(() => vivo && setCargado(deporte))
      .catch(() => {
        cargaDeporte = undefined
      })
    return () => {
      vivo = false
    }
  }, [cargado])
  const Icon = cargado?.[name]
  if (Icon) return <Icon aria-hidden="true" focusable="false" {...props} />
  const { size = 24 } = props
  return <span aria-hidden="true" style={{ display: 'inline-block', width: size, height: size }} />
}

/** ¿Hay dibujo para este nombre? Una prueba lo exige a cada icono usado en los datos. */
export function hasCategoryIcon(name: string): boolean {
  return Object.hasOwn(ICONS, name) || NOMBRES_DEPORTE.has(name)
}

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  if (NOMBRES_DEPORTE.has(name)) return <IconoDiferido name={name} {...props} />
  // `hasOwn` y no `ICONS[name]` a secas: con un nombre como `constructor` el índice devolvería lo
  // heredado de `Object` y React intentaría pintarlo como componente.
  const Icon = Object.hasOwn(ICONS, name) ? (ICONS[name] ?? UtensilsCrossed) : UtensilsCrossed
  return <Icon aria-hidden="true" focusable="false" {...props} />
}

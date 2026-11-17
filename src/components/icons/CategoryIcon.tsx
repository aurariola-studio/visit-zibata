/**
 * Iconos de categoría. `categories.json` referencia un nombre (`icon`); aquí se resuelve a un
 * componente. Nombres desconocidos usan un icono genérico, así una categoría nueva nunca rompe la UI.
 */
import {
  Bacon,
  Beef,
  Beer,
  BicepsFlexed,
  Bone,
  CakeSlice,
  Cherry,
  Coffee,
  CookingPot,
  Croissant,
  Cupcake,
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

/** Tazón con palillos: cocina asiática en general. Fluent UI System Icons `bowl-chopsticks` (MIT). */
const Chopsticks = solid(
  <path d="M2.732 1.078a.5.5 0 0 1 .69.154L7.092 7h1.815L5.578 1.77a.5.5 0 0 1 .844-.537L10.092 7H14.5a.5.5 0 0 1 .5.5V8A7 7 0 1 1 1 8v-.5a.5.5 0 0 1 .5-.5h4.407L2.578 1.77a.5.5 0 0 1 .154-.69M2.342 10h11.317A6 6 0 0 0 14 8H2c0 .701.12 1.375.341 2m.46 1A6 6 0 0 0 8 14c2.22 0 4.16-1.207 5.197-3z" />,
  '0 0 16 16',
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

/** Torta: hamburguesa de pan redondo con su relleno. Majesticons `burger-line` (MIT). */
const Torta = custom(
  <>
    <path d="m15 15l3.379-3.379a2.12 2.12 0 0 1 1.5-.621H20a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2h4.515a6 6 0 0 1 4.242 1.757zM3 15h18v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" />
    <path d="M12 4c-4.623 0-8.432 1.756-8.942 6c-.066.55.39 1 .942 1h16c.552 0 1.008-.45.942-1c-.51-4.244-4.319-6-8.942-6M7.001 8H7m5.002 0" />
  </>,
)

/** Waffle: rejilla de cuadros dentro de un cuadrado redondeado. IconOven `waffle` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Waffle = custom(
  <>
    <rect width="17.5" height="17.5" x="3.25" y="3.25" rx="4" />
    <rect width="4" height="4" x="6.25" y="6.25" rx="1" />
    <rect width="4" height="4" x="13.75" y="6.25" rx="1" />
    <rect width="4" height="4" x="6.25" y="13.75" rx="1" />
    <rect width="4" height="4" x="13.75" y="13.75" rx="1" />
  </>,
)

/** Baguette: barra en diagonal con sus tres cortes. Tabler Icons `baguette` (MIT). */
const Baguette = custom(
  <path d="m5.628 11.283l5.644-5.637c2.665-2.663 5.924-3.747 8.663-1.205l.188.181a2.987 2.987 0 0 1 0 4.228L8.836 20.124a3 3 0 0 1-4.089.135l-.143-.135C1.876 17.4 2.9 14.007 5.628 11.283M9.5 7.5L11 11m-4.5-.5L8 14m4.5-9.5L14 8" />,
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

/** Vaso de té con perlas y popote. Fluent Emoji High Contrast `bubble-tea` (MIT). */
const Boba = solid(
  <>
    <path d="M18.65 23.62a1.31 1.31 0 1 0 0-2.62a1.31 1.31 0 0 0 0 2.62m-3.99-1.31a1.31 1.31 0 1 1-2.62 0a1.31 1.31 0 0 1 2.62 0m2.91 3.3a1.31 1.31 0 1 1-2.62 0a1.31 1.31 0 0 1 2.62 0m-5.26 1.31a1.31 1.31 0 1 0 0-2.62a1.31 1.31 0 0 0 0 2.62" />
    <path d="M17 2v5h8a1 1 0 1 1 0 2l-2 20c-.097.605-.5 1-1 1H10c-.5 0-.924-.437-1-1L7 9a1 1 0 0 1 0-2h8V2zm-7.765 9.25L10.91 28h10.18l.16-1.592a1.31 1.31 0 1 1 .137-1.374l1.378-13.784z" />
  </>,
  '0 0 32 32',
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

/** Bagel con sus semillas. IconOven `donut` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Bagel = custom(
  <>
    <circle cx="12" cy="12" r="9.25" />
    <path d="M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6m-5.25.25l1-1m8-1.5L17 7.5m.25 6.5l-.5 1.25m-8.5.5l1 .75" />
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

/** Tortilla doblada: el doblez liso arriba y el queso saliendo por la curva. */
const Quesadilla = custom(
  <g transform="rotate(-20 12 12)">
    <path d="M20.2 10.4a8.2 8.2 0 0 1-16.4 0Z" />
    <path d="M7.6 15.4v2.2a1.3 1.3 0 0 0 2.6 0" />
    <path d="M11.8 16.6v2.4a1.4 1.4 0 0 0 2.8 0v-.8" />
    <path d="M16 14.8v1.8" />
  </g>,
)

/** Arepa: la masa redonda con su borde y sus marcas del comal. Fluent Emoji High Contrast `flatbread` (MIT). */
const Arepa = solid(
  <>
    <path d="m6.69 17.07l.18.18c.24.25.63.25.88 0l9.51-9.51c.24-.24.24-.64 0-.88l-.18-.18a.63.63 0 0 0-.88 0l-9.51 9.51c-.24.24-.24.64 0 .88m1.41 5.77c-.29.29-.29.77 0 1.06s.77.29 1.06 0L23.9 9.16c.29-.29.29-.77 0-1.06a.754.754 0 0 0-1.06 0zm6.83 2.48l-.18-.18a.63.63 0 0 1 0-.88l9.51-9.51c.24-.24.64-.24.88 0l.18.18c.24.24.24.64 0 .88l-9.51 9.51c-.25.24-.64.24-.88 0" />
    <path d="M15 1C7.268 1 1 7.268 1 15v2c0 7.732 6.268 14 14 14h2c7.732 0 14-6.268 14-14v-2c0-7.732-6.268-14-14-14zM3 15C3 8.373 8.373 3 15 3h2c6.627 0 12 5.373 12 12v2c0 6.627-5.373 12-12 12h-2C8.373 29 3 23.627 3 17z" />
  </>,
  '0 0 32 32',
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

/** Un cerdo: las carnitas son de cerdo y el dibujo lo dice sin rodeos. Material Design Icons `pig-variant-outline` (Apache 2.0). */
const Cerdo = solid(
  <path d="M15 10c0-.55.45-1 1-1s1 .45 1 1s-.45 1-1 1s-1-.45-1-1m7-2.5v6.97l-2.82.94L17.5 21H12v-2h-2v2H4.5S2 12.54 2 9.5S4.46 4 7.5 4h5c.91-1.21 2.36-2 4-2a1.498 1.498 0 0 1 1.38 2.08c-.14.34-.26.73-.32 1.15l2.27 2.27zm-2 2h-1L15.5 6c0-.65.09-1.29.26-1.91c-.97.25-1.76.97-2.09 1.91H7.5C5.57 6 4 7.57 4 9.5c0 1.88 1.22 6.65 2 9.5h2v-2h6v2h2l1.56-5.15l2.44-.82z" />,
)

/** Cartón de papas a la francesa. Material Design Icons `french-fries` (Apache 2.0). La bolsa de papas fritas es otro dibujo, el de Papas Preparadas. */
const PapasFritas = solid(
  <path d="M18 11V6h-3V4h-3V2H8v3H6v6H5l2 11h10l2-11zm-2.14 0c-.16.61-.46 1.16-.86 1.62v-4l2 1V11zM17 7v1.5l-2-1V7zm-5-2h2v3.5l-2 1zm0 5.62l2-1v3.83c-.59.35-1.27.55-2 .55zm-1 3.24c-.79-.21-1.5-.64-2-1.24v-3l2-1zM9 3h2v4.5L10 8V5H9zM7 6h2v2.5L8 9v2H7z" />,
)

/** Salchicha en su pan con la mostaza. Material Design Icons `food-hot-dog` (Apache 2.0). */
const HotDog = solid(
  <path d="M21 5.77c-.15-.12-.28-.22-.41-.32l.03-.04c.78-.78.78-2.04 0-2.82s-2.04-.78-2.83 0l-.74.74a3.465 3.465 0 0 0-4.55.32L3.65 12.5a3.465 3.465 0 0 0-.32 4.55l-.74.74c-.79.79-.79 2.05 0 2.83c.78.78 2.04.78 2.82 0l.04-.03c.1.13.2.26.32.41c1.36 1.34 3.58 1.34 4.95 0l10.25-10.28A3.52 3.52 0 0 0 21 5.77M4.77 15.61a1.5 1.5 0 0 1 .29-1.71l8.84-8.84a1.5 1.5 0 0 1 1.71-.29zM19.56 9.3L9.3 19.56c-.58.59-1.53.59-2.12 0c-.58-.56-.58-1.56 0-2.12L17.44 7.18c.56-.58 1.56-.58 2.12 0c.59.59.59 1.54 0 2.12" />,
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

/** Tazón de fruta. Carbon `fruit-bowl` (Apache 2.0). */
const Fruta = solid(
  <path d="M26 15a6 6 0 0 0-3.107-5.253A3.98 3.98 0 0 0 24 7h-2a2 2 0 0 1-2 2a6.004 6.004 0 0 0-5.995 5.892A7 7 0 0 1 12 10a3.996 3.996 0 0 0-3-3.858V4H7v2.142A3.996 3.996 0 0 0 4 10v5H2v1a14 14 0 0 0 28 0v-1Zm-6-4a4.005 4.005 0 0 1 4 4h-8a4.005 4.005 0 0 1 4-4M6 10a2 2 0 1 1 4 0a9 9 0 0 0 1.532 5H6Zm10 18A12.017 12.017 0 0 1 4.042 17h23.917A12.017 12.017 0 0 1 16 28" />,
  '0 0 32 32',
)

/** Tazón de fideos con palillos y la onda del caldo. IconOven `noodles` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Ramen = custom(
  <>
    <path d="M4 10.75h16a.75.75 0 0 1 .75.8A8.75 8.75 0 0 1 16 18.7v1.55a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V18.7a8.75 8.75 0 0 1-4.75-7.15a.75.75 0 0 1 .75-.8m5.5 0L18.25 3m-5 7.75l7-5" />
    <path d="M7 14.25c.9.75 1.6.75 2.5 0s1.6-.75 2.5 0s1.6.75 2.5 0s1.6-.75 2.5 0" />
  </>,
)

/** Shaker o botella deportiva: vale igual para un batido que para un local de comida alta en proteína. Material Symbols (Apache 2.0). */
const Proteina = solid(
  <>
    <path d="M9.825 22q-.775 0-1.35-.513t-.65-1.287l-.775-8.65q-.025-.25.088-.462t.337-.338q.2-.125.35-.3t.15-.425q0-.225-.1-.413t-.3-.312q-.25-.125-.375-.387t-.05-.538L7.8 5.75q.075-.35.35-.55t.625-.2H11.5V4H11q-.425 0-.712-.287T10 3t.288-.712T11 2h3q.425 0 .713.288T15 3t-.288.713T14 4h-.5v1h2.725q.35 0 .613.2t.337.55l.675 2.625q.075.275-.05.538t-.375.387q-.2.1-.312.275t-.113.4q0 .275.138.463t.362.312t.35.338t.1.462l-.775 8.625q-.075.775-.65 1.3t-1.35.525z" />
  </>,
)

/** Galleta con mordida y sus chispas, solo el contorno: Postres y Dulces. Material Design Icons `cookie-outline` (Apache 2.0). */
const Galleta = solid(
  <path d="M20.87 10.5C20.6 10 20 10 20 10h-2V9c0-1-1-1-1-1h-2V7c0-1-1-1-1-1h-1V4c0-1-1-1-1-1a9 9 0 1 0 9 9c0-.5-.04-1-.13-1.5m-9.55 8.46c.68-.14 1.18-.74 1.18-1.46c0-.83-.67-1.5-1.5-1.5a1.498 1.498 0 0 0-.84 2.74c-2.62-.7-4.66-2.93-5.07-5.62C5 12.61 5 12.11 5 11.62c.07.77.71 1.38 1.5 1.38c.83 0 1.5-.67 1.5-1.5S7.33 10 6.5 10c-.68 0-1.25.46-1.43 1.08C5.47 8 7.91 5.5 11 5.07V6.5c0 .83.67 1.5 1.5 1.5h.5v.5c0 .83.67 1.5 1.5 1.5H16v.5c0 .83.67 1.5 1.5 1.5H19c0 4.08-3.5 7.36-7.68 6.96M9.5 9C8.67 9 8 8.33 8 7.5S8.67 6 9.5 6s1.5.67 1.5 1.5S10.33 9 9.5 9m3.5 3.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5s1.5.67 1.5 1.5m5 2c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5s1.5.67 1.5 1.5" />,
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
  cecina: Bacon,
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

/**
 * Los iconos de las subcategorías: los giros que no son ni un sector ni una categoría. Los de sectores y
 * categorías salen en las píldoras de la primera pantalla y se quedan en `CategoryIcon.tsx`; estos solo
 * salen en tarjetas, fichas y filtros de segundo nivel, así que viven aparte para no entrar en el paquete
 * inicial, que tiene presupuesto (`npm run perf:budget`). `CategoryIcon` pide el fragmento en cuanto hay
 * un respiro tras el primer pintado, y si un icono sale antes reserva su caja hasta que llegue. Una prueba
 * (`CategoryIcon.test.tsx`) comprueba el reparto contra `data/commercial/categories.json`.
 */
import {
  Bacon,
  Beer,
  Bike,
  Bone,
  CakeSlice,
  Cherry,
  Coffee,
  Cupcake,
  Drumstick,
  EggFried,
  Fish,
  Flame,
  IceCreamCone,
  Pizza,
  Salad,
  Sandwich,
  Wine,
} from 'lucide-react'
import { custom, type IconComponent, solid } from './dibujar.tsx'

/** Bowl con granola y fruta: los bowls de açaí. UIX `granola-bowl` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Acai = custom(
  <>
    <path d="M2.5 12h19c-.5 5-4.5 7.75-9.5 7.75S3 17 2.5 12m1 0a2.5 2.5 0 0 1 5 0a4.5 4.5 0 0 1 7 0a2.5 2.5 0 0 1 5 0" />
    <path d="M9.5 7.75a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0m7-.25a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
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

/** Arepa: la masa redonda con su borde y sus marcas del comal. Fluent Emoji High Contrast `flatbread` (MIT). */
const Arepa = solid(
  <>
    <path d="m6.69 17.07l.18.18c.24.25.63.25.88 0l9.51-9.51c.24-.24.24-.64 0-.88l-.18-.18a.63.63 0 0 0-.88 0l-9.51 9.51c-.24.24-.24.64 0 .88m1.41 5.77c-.29.29-.29.77 0 1.06s.77.29 1.06 0L23.9 9.16c.29-.29.29-.77 0-1.06a.754.754 0 0 0-1.06 0zm6.83 2.48l-.18-.18a.63.63 0 0 1 0-.88l9.51-9.51c.24-.24.64-.24.88 0l.18.18c.24.24.24.64 0 .88l-9.51 9.51c-.25.24-.64.24-.88 0" />
    <path d="M15 1C7.268 1 1 7.268 1 15v2c0 7.732 6.268 14 14 14h2c7.732 0 14-6.268 14-14v-2c0-7.732-6.268-14-14-14zM3 15C3 8.373 8.373 3 15 3h2c6.627 0 12 5.373 12 12v2c0 6.627-5.373 12-12 12h-2C8.373 29 3 23.627 3 17z" />
  </>,
  '0 0 32 32',
)

/** Bagel con sus semillas. IconOven `donut` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Bagel = custom(
  <>
    <circle cx="12" cy="12" r="9.25" />
    <path d="M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6m-5.25.25l1-1m8-1.5L17 7.5m.25 6.5l-.5 1.25m-8.5.5l1 .75" />
  </>,
)

/** Baguette: barra en diagonal con sus tres cortes. Tabler Icons `baguette` (MIT). */
const Baguette = custom(
  <path d="m5.628 11.283l5.644-5.637c2.665-2.663 5.924-3.747 8.663-1.205l.188.181a2.987 2.987 0 0 1 0 4.228L8.836 20.124a3 3 0 0 1-4.089.135l-.143-.135C1.876 17.4 2.9 14.007 5.628 11.283M9.5 7.5L11 11m-4.5-.5L8 14m4.5-9.5L14 8" />,
)

/** Bailarina con tutú y un brazo en alto: Ballet. Material Design Icons (Apache 2.0). */
const Ballet = solid(
  <>
    <path d="M17 17h-2v6h-2v-6h-2.12l-1.54 1.93l2.37 2.36l-1.42 1.42l-2.36-2.37c-.35-.34-.55-.81-.58-1.3s.12-.98.43-1.36l.54-.68H7l2-4v-3c-.62.47-1.12 1.07-1.47 1.76c-.35.7-.53 1.46-.53 2.24H5a7 7 0 0 1 7-7c1.33 0 2.6-.53 3.54-1.46C16.47 4.6 17 3.33 17 2h2c0 1.32-.38 2.62-1.09 3.73A7 7 0 0 1 15 8.31V13zM14 4c0 .4-.12.78-.34 1.11s-.53.59-.89.74a2 2 0 0 1-2.18-.44c-.28-.28-.47-.63-.55-1.02s-.04-.79.11-1.15c.15-.37.41-.68.74-.9S11.6 2 12 2c.53 0 1.04.21 1.41.59c.38.37.59.88.59 1.41" />
  </>,
)

/** Persona junto a la barra de ballet: Barre. IconOven `barre` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Barre = custom(
  <>
    <path d="M2.75 10.25h7.5m-5.5 0v11" />
    <circle cx="14.5" cy="4.75" r="2" />
    <path d="M14.5 7.5v13.75m0-7.75l6.25-3.25m-6.25-1.5l-4.25 1.5m4.25-1.5l4.25-2.5" />
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

/** Vaso de té con perlas y popote. Fluent Emoji High Contrast `bubble-tea` (MIT). */
const Boba = solid(
  <>
    <path d="M18.65 23.62a1.31 1.31 0 1 0 0-2.62a1.31 1.31 0 0 0 0 2.62m-3.99-1.31a1.31 1.31 0 1 1-2.62 0a1.31 1.31 0 0 1 2.62 0m2.91 3.3a1.31 1.31 0 1 1-2.62 0a1.31 1.31 0 0 1 2.62 0m-5.26 1.31a1.31 1.31 0 1 0 0-2.62a1.31 1.31 0 0 0 0 2.62" />
    <path d="M17 2v5h8a1 1 0 1 1 0 2l-2 20c-.097.605-.5 1-1 1H10c-.5 0-.924-.437-1-1L7 9a1 1 0 0 1 0-2h8V2zm-7.765 9.25L10.91 28h10.18l.16-1.592a1.31 1.31 0 1 1 .137-1.374l1.378-13.784z" />
  </>,
  '0 0 32 32',
)

/** Tazón de arroz con su montón de granos: Poke y bowls. Boxicons `bowl-rice` (MIT). */
const Bowl = solid(
  <path d="M21 10a3.6 3.6 0 0 0-1.8-3a3.66 3.66 0 0 0-3.63-3.13c-.34 0-.68.05-1.01.14C13.88 3.36 12.98 3 12.01 3s-1.87.37-2.55 1.01c-.33-.09-.67-.14-1.01-.14h-.07C6.56 3.91 5.06 5.26 4.82 7a3.58 3.58 0 0 0-1.8 3c-.55 0-1 .45-1 1c0 3.61 1.9 6.87 5 8.66V21c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-1.34c3.1-1.78 5-5.05 5-8.66c0-.55-.45-1-1-1ZM6.11 8.61l.81-.26l-.14-.84c0-.88.73-1.6 1.63-1.62c.95.02 1.72.79 1.72 1.75h2c0-.93-.35-1.77-.92-2.43c.24-.13.51-.2.79-.2c.57 0 1.1.28 1.41.76l.51.77l.81-.44c.25-.14.53-.21.82-.21c.92 0 1.67.73 1.67 1.62l-.14.84l.81.27c.62.21 1.03.76 1.09 1.39H5.02c.05-.63.47-1.19 1.09-1.39Zm9.45 9.56c-.34.17-.56.52-.56.9v.94H9v-.94c0-.38-.21-.73-.56-.9a7.93 7.93 0 0 1-4.38-6.16h15.88a7.94 7.94 0 0 1-4.38 6.16" />,
)

/** Guante de boxeo. Material Design Icons (Apache 2.0). */
const Boxeo = solid(
  <>
    <path d="M19 16V6h3v10zM12 4H7S2 4 2 8v6c0 1.77 1 2.76 2.07 3.31A3.996 3.996 0 0 1 8 14h3v2H8a2 2 0 0 0-2 2a2 2 0 0 0 2 2h5c4 0 4-4 4-4V6s-1-2-5-2" />
  </>,
)

/** Un cerdo: las carnitas son de cerdo y el dibujo lo dice sin rodeos. Material Design Icons `pig-variant-outline` (Apache 2.0). */
const Cerdo = solid(
  <path d="M15 10c0-.55.45-1 1-1s1 .45 1 1s-.45 1-1 1s-1-.45-1-1m7-2.5v6.97l-2.82.94L17.5 21H12v-2h-2v2H4.5S2 12.54 2 9.5S4.46 4 7.5 4h5c.91-1.21 2.36-2 4-2a1.498 1.498 0 0 1 1.38 2.08c-.14.34-.26.73-.32 1.15l2.27 2.27zm-2 2h-1L15.5 6c0-.65.09-1.29.26-1.91c-.97.25-1.76.97-2.09 1.91H7.5C5.57 6 4 7.57 4 9.5c0 1.88 1.22 6.65 2 9.5h2v-2h6v2h2l1.56-5.15l2.44-.82z" />,
)

/** Crepa doblada en cuarto. Los dobleces radian de la punta; sin puntos, que serían una pizza. */
const Crepa = custom(
  <>
    <path d="M12 20.4 4.4 9.2a13.2 13.2 0 0 1 15.2 0Z" />
    <path d="M12 20.4 8.6 9.9M12 20.4l3.4-10.5" />
  </>,
)

/** Capas de la piel: Dermatología. Material Symbols `dermatology-outline-rounded` (Apache 2.0). Vive aquí, con el fragmento diferido, para no pesar en el paquete inicial. */
const Dermatology = solid(
  <path d="M3 21q-.425 0-.712-.288T2 20v-8q0-.825.588-1.412T4 10h4q.2 0 .388.075t.324.213t.213.324T9 11v1q0 1.25.875 2.125T12 15t2.125-.875T15 12v-1q0-.2.075-.388t.212-.325t.325-.212T16 10h4q.825 0 1.412.588T22 12v8q0 .425-.288.713T21 21zm1-2h16v-7h-3q0 2.075-1.463 3.538T12 17t-3.537-1.463T7 12H4zm8-6q-.425 0-.712-.288T11 12q0-2.725.625-5.375T14.35 2.25q.325-.275.725-.238t.675.363t.238.725t-.363.675q-1.75 1.475-2.187 3.7T13 12q0 .425-.288.713T12 13m-5.712 2.288q.212-.213.212-.538t-.213-.537T5.75 14t-.537.213T5 14.75t.213.538t.537.212t.538-.213m1 2.5q.212-.212.212-.537t-.213-.537t-.537-.213t-.537.213T6 17.25t.213.538t.537.212t.538-.213m11.5-2.5q.212-.212.212-.537t-.213-.537T18.25 14t-.537.213t-.213.537t.213.538t.537.212t.538-.213M4 19h16z" />,
)

/** Mazorca de maíz con sus granos y sus hojas. TDesign Icons `corn` (MIT). */
const Elote = custom(
  <>
    <path d="M9 15c1.198-1.86 1.33-4.664.622-6.748L15 4M9 15c1.854-1.194 4.645-1.328 6.723-.63L20 9M9 15L21.219 2.791m0 0C23.076 4.66 21.289 7.391 20 9m1.219-6.209C19.355.917 16.612 2.711 15 4m5 5l-5-5m2.35 8.327l-5.687-5.692" />
    <path
      strokeLinecap="square"
      d="M4 20c3.2 4.4 8 0 10-1.5c3-2.25 4.5-2.5 4.5-2.5s-1.053-1.053-2.777-1.63c-2.078-.698-4.87-.563-6.723.63m-5 5l5-5m-5 5c-4.4-3.2 0-8 1.5-10C7.75 7 8 5.5 8 5.5s1.043 1.043 1.622 2.752c.707 2.083.576 4.887-.622 6.748"
    />
  </>,
)

/** Media luna con el repulgue en la curva, que es lo que la separa de la quesadilla. */
const Empanada = custom(
  <>
    <path d="M3.8 17.8a8.2 8.2 0 0 1 16.4 0Z" />
    <path d="m4.8 14.8 1.6 1.3M7.4 11.9l1.3 1.6M10.6 10.1l.8 1.9M14 10.2l-.7 1.9M17 12.1l-1.3 1.5M19.3 15l-1.6 1.2" />
  </>,
)

/** Tazón de fruta. Carbon `fruit-bowl` (Apache 2.0). */
const Fruta = solid(
  <path d="M26 15a6 6 0 0 0-3.107-5.253A3.98 3.98 0 0 0 24 7h-2a2 2 0 0 1-2 2a6.004 6.004 0 0 0-5.995 5.892A7 7 0 0 1 12 10a3.996 3.996 0 0 0-3-3.858V4H7v2.142A3.996 3.996 0 0 0 4 10v5H2v1a14 14 0 0 0 28 0v-1Zm-6-4a4.005 4.005 0 0 1 4 4h-8a4.005 4.005 0 0 1 4-4M6 10a2 2 0 1 1 4 0a9 9 0 0 0 1.532 5H6Zm10 18A12.017 12.017 0 0 1 4.042 17h23.917A12.017 12.017 0 0 1 16 28" />,
  '0 0 32 32',
)

/** Pesa rusa: el entrenamiento funcional. Material Design Icons `kettlebell` (Apache 2.0). */
const Funcional = solid(
  <path d="m16.2 10.7l.6-2.4c.1-.3.5-1.7-.3-2.9C15.9 4.5 14.7 4 13 4h-2c-1.7 0-2.9.5-3.5 1.4c-.8 1.2-.4 2.5-.3 2.9l.6 2.4C6.7 11.8 6 13.3 6 15c0 2.1 1.1 3.9 2.7 5h6.6c1.6-1.1 2.7-2.9 2.7-5c0-1.7-.7-3.2-1.8-4.3M9.6 9.5l-.5-1.7v-.1s-.2-.7.1-1.1Q9.5 6 11 6h2c.9 0 1.6.2 1.9.5c.3.4.1 1.1.1 1.1l-.5 1.9c-.8-.3-1.6-.5-2.5-.5s-1.7.2-2.4.5" />,
)

/** Salchicha en su pan con la mostaza. Material Design Icons `food-hot-dog` (Apache 2.0). */
const HotDog = solid(
  <path d="M21 5.77c-.15-.12-.28-.22-.41-.32l.03-.04c.78-.78.78-2.04 0-2.82s-2.04-.78-2.83 0l-.74.74a3.465 3.465 0 0 0-4.55.32L3.65 12.5a3.465 3.465 0 0 0-.32 4.55l-.74.74c-.79.79-.79 2.05 0 2.83c.78.78 2.04.78 2.82 0l.04-.03c.1.13.2.26.32.41c1.36 1.34 3.58 1.34 4.95 0l10.25-10.28A3.52 3.52 0 0 0 21 5.77M4.77 15.61a1.5 1.5 0 0 1 .29-1.71l8.84-8.84a1.5 1.5 0 0 1 1.71-.29zM19.56 9.3L9.3 19.56c-.58.59-1.53.59-2.12 0c-.58-.56-.58-1.56 0-2.12L17.44 7.18c.56-.58 1.56-.58 2.12 0c.59.59.59 1.54 0 2.12" />,
)

/** Plato de desayuno visto desde arriba, con su huevo y su tocino: Brunch. UIX `breakfast-plate` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Hotcakes = custom(
  <>
    <path d="M2.5 12a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0-19 0" />
    <path d="M8 8.5c2-.5 3.75 1 3.5 3c-.25 1.5.5 3-1 3.75S7.5 15.5 6 15s-1.75-2.5-1.25-4S6 8.75 8 8.5M8 12h.01m7.74-6za1.5 1.5 0 0 1 1.5 1.5v2.25a1.5 1.5 0 0 1-1.5 1.5a1.5 1.5 0 0 1-1.5-1.5V7.5a1.5 1.5 0 0 1 1.5-1.5m0 7za1.5 1.5 0 0 1 1.5 1.5v2.25a1.5 1.5 0 0 1-1.5 1.5a1.5 1.5 0 0 1-1.5-1.5V14.5a1.5 1.5 0 0 1 1.5-1.5" />
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

/** Brocheta de carne al estilo kebab. Lucide Lab `kebab` (ISC). */
const Kebab = custom(
  <>
    <path d="m12 12l4.2-4.2c.4-.4.4-1 .1-1.5a2.9 2.9 0 1 1 4.8.8" />
    <path d="M15.3 11.3c.9.9.9 2.5 0 3.4l-1.6 1.6c-.9.9-2.5.9-3.4 0c.9.9.9 2.5 0 3.4l-1.6 1.6c-.9.9-2.5.9-3.4 0l-2.6-2.6c-.9-.9-.9-2.5 0-3.4l1.6-1.6c.9-.9 2.5-.9 3.4 0c-.9-.9-.9-2.5 0-3.4l1.6-1.6c.9-.9 2.5-.9 3.4 0Zm-5 5l-2.6-2.6M9 15l-2 2m-5 5l2-2" />
  </>,
)

/** Nadador sobre las olas. Tabler Icons (MIT). */
const Natacion = custom(
  <>
    <path d="M15 9a1 1 0 1 0 2 0a1 1 0 1 0-2 0m-9 2l4-2l3.5 3l-1.5 2m-9 2.75A2.4 2.4 0 0 0 4 17a2.4 2.4 0 0 0 2-1a2.4 2.4 0 0 1 2-1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2-1a2.4 2.4 0 0 1 2-1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 1-.25" />
  </>,
)

/** Sushi: un rollo de maki con su palillo y la salsa. Hugeicons `sushi-02` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Nigiri = custom(
  <>
    <path d="M13 9a2 2 0 1 0 4 0a2 2 0 0 0-4 0Z" />
    <path d="M10 9a5 5 0 1 0 10 0a5 5 0 0 0-10 0Z" />
    <path d="M11.5 2L7.537 16.412M6 22l.825-3M22 12.5L2 18" />
  </>,
)

/** Dentadura con sus brackets y el alambre: Ortodoncia. UIX `braces-smile` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Ortodoncia = custom(
  <>
    <path d="M2.5 7h19c0 6.5-4 10.5-9.5 10.5S2.5 13.5 2.5 7m2 4h15" />
    <path d="M6.25 10.25zA.75.75 0 0 1 7 11a.75.75 0 0 1-.75.75a.75.75 0 0 1-.75-.75a.75.75 0 0 1 .75-.75m3.75 0za.75.75 0 0 1 .75.75a.75.75 0 0 1-.75.75a.75.75 0 0 1-.75-.75a.75.75 0 0 1 .75-.75m4 0za.75.75 0 0 1 .75.75a.75.75 0 0 1-.75.75a.75.75 0 0 1-.75-.75a.75.75 0 0 1 .75-.75m3.75 0za.75.75 0 0 1 .75.75a.75.75 0 0 1-.75.75A.75.75 0 0 1 17 11a.75.75 0 0 1 .75-.75" />
  </>,
)

/** Pala de pádel con su pelota. Material Symbols (Apache 2.0). */
const Padel = solid(
  <>
    <path d="M7.725 17.775q-.75-.3-1.325-.875l-4.225-4.25q-.575-.575-.875-1.312T1 9.825t.3-1.512T2.175 7L5 4.175Q5.575 3.6 6.313 3.3T7.825 3t1.513.3t1.312.875L14.9 8.4q.575.575.875 1.325t.3 1.525t-.3 1.513t-.875 1.312l-.7.7l5.1 5.1q.3.3.3.713t-.3.712t-.712.3t-.713-.3l-5.1-5.1l-.7.7q-.575.575-1.312.875t-1.513.3t-1.525-.3M5.175 11.1q.325 0 .538-.212t.212-.538t-.212-.537t-.538-.213t-.537.213t-.213.537t.213.538t.537.212m1.6-1.575q.325 0 .538-.212t.212-.538t-.213-.537t-.537-.213t-.537.213t-.213.537t.213.538t.537.212m.175 3.35q.325 0 .538-.213t.212-.537t-.213-.537t-.537-.213t-.537.213t-.213.537t.213.538t.537.212m1.4-4.95q.325 0 .538-.213t.212-.537t-.213-.537t-.537-.213t-.537.213t-.213.537t.213.538t.537.212m.2 3.375q.325 0 .537-.213t.213-.537t-.213-.537T8.55 9.8t-.537.213t-.213.537t.213.538t.537.212m.15 3.35q.325 0 .538-.213t.212-.537t-.212-.537t-.538-.213t-.537.213t-.213.537t.213.538t.537.212m1.425-4.95q.325 0 .538-.213t.212-.537t-.213-.537t-.537-.213t-.537.213t-.213.537t.213.538t.537.212m.175 3.35q.325 0 .538-.213t.212-.537t-.213-.537t-.537-.213t-.537.213t-.213.537t.213.538t.537.212m1.6-1.6q.325 0 .538-.212t.212-.538t-.213-.537t-.537-.213t-.537.213t-.213.537t.213.538t.537.212M19.5 9q-1.45 0-2.475-1.025T16 5.5t1.025-2.475T19.5 2t2.475 1.025T23 5.5t-1.025 2.475T19.5 9" />
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

/** Cartón de papas a la francesa. Material Design Icons `french-fries` (Apache 2.0). La bolsa de papas fritas es otro dibujo, el de Papas Preparadas. */
const PapasFritas = solid(
  <path d="M18 11V6h-3V4h-3V2H8v3H6v6H5l2 11h10l2-11zm-2.14 0c-.16.61-.46 1.16-.86 1.62v-4l2 1V11zM17 7v1.5l-2-1V7zm-5-2h2v3.5l-2 1zm0 5.62l2-1v3.83c-.59.35-1.27.55-2 .55zm-1 3.24c-.79-.21-1.5-.64-2-1.24v-3l2-1zM9 3h2v4.5L10 8V5H9zM7 6h2v2.5L8 9v2H7z" />,
)

/** Plato de espagueti, con sus bolas de pasta y su tenedor de lado: Pasta. Hugeicons `spaghetti` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Pasta = custom(
  <>
    <path d="M21.292 13H2.708c-1.52 0-.224 2.238.461 2.581l2.361 1.181c.236.119.354.178.452.264c.878.776 1.038 2.143 2.148 2.737c.442.237.965.237 2.012.237h3.716c1.047 0 1.57 0 2.012-.237c1.11-.594 1.27-1.961 2.148-2.737c.098-.086.216-.145.452-.264l2.36-1.181c.686-.343 1.981-2.581.462-2.581" />
    <path d="M15 13a6 6 0 0 0-12 0" />
    <path d="M21 13c0-2.761-2.225-5-4.97-5c-.924 0-1.789.254-2.53.696M7 12.222C7 10.995 7.895 10 9 10s2 .995 2 2.222V14M9 6.556c.431-1.766 2.328-2.874 4.237-2.475c1.909.4 3.106 2.154 2.675 3.919" />
  </>,
)

/** Paleta de pickleball con su pelota, en espejo para que no se confunda con la de pádel a 14 px. Material Symbols (Apache 2.0). */
const Pickleball = solid(
  <>
    <g transform="matrix(-1 0 0 1 24 0)">
      <path d="M9.3 17.375q-1 0-1.937-.375t-1.688-1.125l-3.8-3.775q-.425-.425-.65-.987T1 9.975t.225-1.137t.65-.988L5.85 3.875q.425-.425.988-.65T7.974 3t1.138.225t.987.65l3.775 3.8q.75.75 1.125 1.688t.375 1.937q0 .9-.312 1.788T14.1 14.7l5.175 5.175q.3.3.3.713t-.3.712t-.7.3t-.7-.3L12.7 16.125q-.725.65-1.612.95t-1.788.3M19.5 9q-1.45 0-2.475-1.025T16 5.5t1.025-2.475T19.5 2t2.475 1.025T23 5.5t-1.025 2.475T19.5 9" />
    </g>
  </>,
)

/**
 * Persona con la pelota de pilates: "Pilates" de The Noun Project (CC0 1.0, vía Wikimedia Commons).
 * Recoloreado al color del texto y con el marco recortado a la figura, que ocupaba la mitad del original.
 */
const Pilates = solid(
  <>
    <path d="M13.978,81.65c4.408,0,7.977-3.582,7.977-7.991c0-4.407-3.569-7.981-7.977-7.981 c-4.409,0-7.992,3.572-7.992,7.981S9.568,81.65,13.978,81.65z" />
    <path d="M78.113,36.355c-0.26-0.174-0.536-0.317-0.813-0.437l-27.547-8.223c-0.112-0.039-0.226-0.073-0.343-0.102 l-0.041-0.012l-0.001,0.001c-0.317-0.077-0.646-0.123-0.988-0.123c-2.12,0-4.192,2.48-4.192,4.246L44.157,51.06L24.856,69.136 c-2.513,3.176-1.188,6.977-1.188,6.977c1.384,4.209,6.116,4.357,6.116,4.357l34.439,0.011c1.837,0,3.329-1.501,3.329-3.364 c0-1.866-1.492-3.366-3.329-3.366l-23.776-0.039L50.46,63.637c1.431-1.487,2.159-3.155,2.159-5.328 c0-1.955-0.156-19.049-0.177-21.304l21.575,6.559c1.783,0.771,3.906,0.2,5.081-1.427C80.431,40.26,79.989,37.667,78.113,36.355z" />
    <path d="M76.087,34.642l8.772-8.792c1.513-1.22,1.993-3.365,1.1-5.162c-1.042-2.052-3.543-2.866-5.576-1.815 c-0.275,0.15-0.531,0.327-0.766,0.517L67.077,31.953L76.087,34.642z" />
    <path d="M76.588,43.903c-10.424,0-18.874,8.45-18.874,18.874c0,3.652,1.04,7.059,2.836,9.948l4.158,0.007 c2.354,0,4.265,1.922,4.265,4.312c0,0.978-0.323,1.873-0.863,2.595c2.55,1.284,5.429,2.012,8.479,2.012 c10.423,0,18.873-8.449,18.873-18.873S87.011,43.903,76.588,43.903z" />
  </>,
  '4.5 4 92 92',
)

/** Shaker o botella deportiva, solo el contorno: vale igual para un batido que para un local de comida alta en proteína. Material Symbols `water-bottle-outline-rounded` (Apache 2.0). */
const Proteina = solid(
  <path d="M15.175 11h-5.35q-.125.3-.3.588t-.425.487L9.825 20h5.35l.725-7.925q-.25-.225-.425-.5t-.3-.575M9.55 7l-.275 1.1q.175.2.313.425T9.825 9h5.35q.1-.25.238-.475t.312-.425L15.45 7zm.275 15q-.775 0-1.35-.513t-.65-1.287l-.775-8.65q-.025-.25.088-.462t.337-.338q.2-.125.35-.3t.15-.425q0-.225-.1-.413t-.3-.312q-.25-.125-.375-.387t-.05-.538L7.8 5.75q.075-.35.35-.55t.625-.2H11.5V4H11q-.425 0-.712-.287T10 3t.288-.712T11 2h3q.425 0 .713.288T15 3t-.288.713T14 4h-.5v1h2.725q.35 0 .613.2t.337.55l.675 2.625q.075.275-.05.538t-.375.387q-.2.1-.312.275t-.113.4q0 .275.138.463t.362.312t.35.338t.1.462l-.775 8.625q-.075.775-.65 1.3t-1.35.525zM12.5 9" />,
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

/** Tazón de fideos con palillos y la onda del caldo. IconOven `noodles` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Ramen = custom(
  <>
    <path d="M4 10.75h16a.75.75 0 0 1 .75.8A8.75 8.75 0 0 1 16 18.7v1.55a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V18.7a8.75 8.75 0 0 1-4.75-7.15a.75.75 0 0 1 .75-.8m5.5 0L18.25 3m-5 7.75l7-5" />
    <path d="M7 14.25c.9.75 1.6.75 2.5 0s1.6-.75 2.5 0s1.6.75 2.5 0s1.6-.75 2.5 0" />
  </>,
)

/** La chaqueta del uniforme con su cinturón: Tae Kwon Do. IconOven `kimono` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Taekwondo = custom(
  <>
    <path d="m3.62 5.5l3.51-2Q8 3 9 3h6q1 0 1.87.5l3.51 2q.87.5.87 1.5v4q0 1-1 1H18q-1 0-1 1v7.25q0 1-1 1H8q-1 0-1-1V13q0-1-1-1H3.75q-1 0-1-1V7q0-1 .87-1.5m5.63-2.25l4.5 8.75m1-8.75l-2.3 4.25M7 7v4.5M17 7v4.5" />
    <path d="M7 12h10v3H7z" />
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

/** Burrito envuelto en su tortilla, cortado en diagonal: Wraps. Fluent Emoji High Contrast `burrito` (MIT). */
const Wrap = solid(
  <path d="m6.28 20.63l-.004.004l8.32 8.32a10.14 10.14 0 0 0 6.538 2.957a10.16 10.16 0 0 0 7.86-2.957l.002-.002c3.466-3.477 3.895-8.844 1.29-12.792a10 10 0 0 0-1.302-1.594L17.014 2.595A6.5 6.5 0 0 0 11.81 0c-1.73 0-3.379.68-4.605 1.906l-.35.35a4.863 4.863 0 0 0-4.62 4.62l-.33.33A6.48 6.48 0 0 0 0 11.81c0 1.728.68 3.378 1.906 4.604q.435.435.94.78zm-2.165-4.995a4.5 4.5 0 0 0 2.395.685c1.2 0 2.34-.47 3.19-1.32L15 9.7c.85-.85 1.32-1.98 1.32-3.19a4.5 4.5 0 0 0-.829-2.609L20.12 8.53a8.49 8.49 0 0 1-1.756 9.68c-2.705 2.657-6.747 3.212-10.01 1.664zM4.25 7.45a2.864 2.864 0 0 1 3.18-3.18a3.14 3.14 0 0 0 2.064-.47a4 4 0 0 1 .35-.266l.016-.014a.1.1 0 0 1 .029-.03l.011-.01c.94-.82 2.3-.92 3.35-.3l-.004.004a1.76 1.76 0 0 0-1.706.456c-.3.3-.47.69-.51 1.08c-.02.21-.18.37-.39.39c-.4.04-.78.21-1.08.51s-.47.69-.51 1.08c-.02.21-.18.37-.39.39c-.4.04-.78.21-1.08.51s-.47.69-.51 1.08c-.02.21-.18.37-.39.39c-.4.04-.78.21-1.08.51s-.47.69-.51 1.08c-.02.2-.17.37-.37.39c-.43.04-.84.23-1.16.57a1.79 1.79 0 0 0-.39 1.64l-.01.01c-.62-1.05-.52-2.41.3-3.35q.02-.012.03-.029l.01-.011q.03-.032.056-.065q.095-.14.204-.273a3.14 3.14 0 0 0 .49-2.092m9.732-3.762q.18.138.348.302q.249.25.438.532L4.524 14.766a3.7 3.7 0 0 1-.534-.436a4 4 0 0 1-.308-.351zM5.877 15.313a1.7 1.7 0 0 1 .433-.933c.32-.34.73-.53 1.16-.57c.2-.02.35-.19.37-.39c.04-.39.21-.78.51-1.08s.68-.47 1.08-.51c.21-.02.37-.18.39-.39c.04-.39.21-.78.51-1.08s.68-.47 1.08-.51c.21-.02.37-.18.39-.39c.04-.39.21-.78.51-1.08s.68-.47 1.08-.51c.21-.02.37-.18.39-.39c.04-.39.21-.78.51-1.08a1.74 1.74 0 0 1 1.03-.507a3.56 3.56 0 0 1-.99 3.137l-5.3 5.3a3.54 3.54 0 0 1-3.153.983M16.02 27.54l-6.058-6.058c3.17.72 6.634-.133 9.103-2.559a9.49 9.49 0 0 0 2.642-8.806L25.6 14.01a15.48 15.48 0 0 1-2.279 15.78a8.17 8.17 0 0 1-7.302-2.251m8.907 1.774a16.48 16.48 0 0 0 2.29-13.688l.353.354c.399.399.748.829 1.047 1.282c2.093 3.172 1.745 7.487-1.037 10.278a8.1 8.1 0 0 1-2.653 1.774" />,
  '0 0 32 32',
)

/** Persona meditando en loto. Material Design Icons (Apache 2.0). */
const Yoga = solid(
  <>
    <path d="M12 4c1.11 0 2 .89 2 2s-.89 2-2 2s-2-.89-2-2s.9-2 2-2m9 12v-2c-2.24 0-4.16-.96-5.6-2.68l-1.34-1.6A1.98 1.98 0 0 0 12.53 9H11.5c-.61 0-1.17.26-1.55.72l-1.34 1.6C7.16 13.04 5.24 14 3 14v2c2.77 0 5.19-1.17 7-3.25V15l-3.88 1.55c-.67.27-1.12.95-1.12 1.66C5 19.2 5.8 20 6.79 20H9v-.5a2.5 2.5 0 0 1 2.5-2.5h3c.28 0 .5.22.5.5s-.22.5-.5.5h-3c-.83 0-1.5.67-1.5 1.5v.5h7.21c.99 0 1.79-.8 1.79-1.79c0-.71-.45-1.39-1.12-1.66L14 15v-2.25c1.81 2.08 4.23 3.25 7 3.25" />
  </>,
)

export const ICONOS_DIFERIDOS: Record<string, IconComponent> = {
  acai: Acai,
  antojito: Antojito,
  arepa: Arepa,
  bagel: Bagel,
  baguette: Baguette,
  ballet: Ballet,
  barre: Barre,
  beer: Beer,
  bike: Bike,
  birria: Birria,
  boba: Boba,
  bone: Bone,
  bowl: Bowl,
  boxeo: Boxeo,
  'cake-slice': CakeSlice,
  cecina: Bacon,
  cerdo: Cerdo,
  cherry: Cherry,
  coffee: Coffee,
  crepa: Crepa,
  cupcake: Cupcake,
  dermatology: Dermatology,
  drumstick: Drumstick,
  'egg-fried': EggFried,
  elote: Elote,
  empanada: Empanada,
  fish: Fish,
  flame: Flame,
  fruta: Fruta,
  funcional: Funcional,
  'hot-dog': HotDog,
  hotcakes: Hotcakes,
  'ice-cream': IceCreamCone,
  jugo: Jugo,
  kebab: Kebab,
  natacion: Natacion,
  nigiri: Nigiri,
  ortodoncia: Ortodoncia,
  padel: Padel,
  papas: Papas,
  'papas-fritas': PapasFritas,
  pasta: Pasta,
  pickleball: Pickleball,
  pilates: Pilates,
  pizza: Pizza,
  proteina: Proteina,
  quesadilla: Quesadilla,
  ramen: Ramen,
  salad: Salad,
  sandwich: Sandwich,
  taekwondo: Taekwondo,
  torta: Torta,
  waffle: Waffle,
  wine: Wine,
  wrap: Wrap,
  yoga: Yoga,
}

/**
 * Los iconos que no hacen falta en la primera pantalla: los de Fitness y Deporte, los de Dentista y
 * Dermatología, y los de giros de Comida que solo salen en tarjetas y fichas (las categorías, que están en
 * las píldoras de la primera pantalla, se quedan en `CategoryIcon.tsx`). Viven aparte para no entrar en el
 * paquete inicial, que tiene presupuesto (`npm run perf:budget`). `CategoryIcon` pide el fragmento en
 * cuanto hay un respiro tras el primer pintado, y si un icono sale antes reserva su caja hasta que llegue.
 */
import { Bike } from 'lucide-react'
import { custom, type IconComponent, solid } from './dibujar.tsx'

/** Barra con sus discos: el gimnasio de pesas. Tabler Icons (MIT). */
const Barbell = custom(
  <>
    <path d="M2 12h1m3-4H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2m0-9v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1m3 5h6m0-5v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1m3 1h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2m4-4h-1" />
  </>,
)

/** Persona estirándose: la categoría Yoga, Pilates y Barre. Tabler Icons (MIT). */
const Estiramiento = custom(
  <>
    <path d="M15 5a1 1 0 1 0 2 0a1 1 0 1 0-2 0M5 20l5-.5l1-2m7 2.5v-5h-5.5L15 8.5l-5.5 1l1.5 2" />
  </>,
)

/** Nadador sobre las olas. Tabler Icons (MIT). */
const Natacion = custom(
  <>
    <path d="M15 9a1 1 0 1 0 2 0a1 1 0 1 0-2 0m-9 2l4-2l3.5 3l-1.5 2m-9 2.75A2.4 2.4 0 0 0 4 17a2.4 2.4 0 0 0 2-1a2.4 2.4 0 0 1 2-1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2-1a2.4 2.4 0 0 1 2-1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 1-.25" />
  </>,
)

/** Pesa rusa: el entrenamiento funcional. Material Design Icons `kettlebell` (Apache 2.0). */
const Funcional = solid(
  <path d="m16.2 10.7l.6-2.4c.1-.3.5-1.7-.3-2.9C15.9 4.5 14.7 4 13 4h-2c-1.7 0-2.9.5-3.5 1.4c-.8 1.2-.4 2.5-.3 2.9l.6 2.4C6.7 11.8 6 13.3 6 15c0 2.1 1.1 3.9 2.7 5h6.6c1.6-1.1 2.7-2.9 2.7-5c0-1.7-.7-3.2-1.8-4.3M9.6 9.5l-.5-1.7v-.1s-.2-.7.1-1.1Q9.5 6 11 6h2c.9 0 1.6.2 1.9.5c.3.4.1 1.1.1 1.1l-.5 1.9c-.8-.3-1.6-.5-2.5-.5s-1.7.2-2.4.5" />,
)

/** Persona meditando en loto. Material Design Icons (Apache 2.0). */
const Yoga = solid(
  <>
    <path d="M12 4c1.11 0 2 .89 2 2s-.89 2-2 2s-2-.89-2-2s.9-2 2-2m9 12v-2c-2.24 0-4.16-.96-5.6-2.68l-1.34-1.6A1.98 1.98 0 0 0 12.53 9H11.5c-.61 0-1.17.26-1.55.72l-1.34 1.6C7.16 13.04 5.24 14 3 14v2c2.77 0 5.19-1.17 7-3.25V15l-3.88 1.55c-.67.27-1.12.95-1.12 1.66C5 19.2 5.8 20 6.79 20H9v-.5a2.5 2.5 0 0 1 2.5-2.5h3c.28 0 .5.22.5.5s-.22.5-.5.5h-3c-.83 0-1.5.67-1.5 1.5v.5h7.21c.99 0 1.79-.8 1.79-1.79c0-.71-.45-1.39-1.12-1.66L14 15v-2.25c1.81 2.08 4.23 3.25 7 3.25" />
  </>,
)

/** Guante de boxeo. Material Design Icons (Apache 2.0). */
const Boxeo = solid(
  <>
    <path d="M19 16V6h3v10zM12 4H7S2 4 2 8v6c0 1.77 1 2.76 2.07 3.31A3.996 3.996 0 0 1 8 14h3v2H8a2 2 0 0 0-2 2a2 2 0 0 0 2 2h5c4 0 4-4 4-4V6s-1-2-5-2" />
  </>,
)

/** Pareja de baile de salón. Material Design Icons (Apache 2.0). */
const Danza = solid(
  <>
    <path d="M14 3.5c0 .83-.67 1.5-1.5 1.5S11 4.33 11 3.5S11.67 2 12.5 2s1.5.67 1.5 1.5M8.5 5C7.67 5 7 5.67 7 6.5S7.67 8 8.5 8S10 7.33 10 6.5S9.33 5 8.5 5m5.5 7l-.78-2.25h2.96l2.16-1.08c.37-.17.52-.63.33-1a.737.737 0 0 0-1-.34l-.82.41l-.49-.84c-.29-.65-1-1.02-1.7-.86l-2.47.53c-.69.15-1.19.78-1.19 1.5v.7l-2.43 1.62h.01c-.08.07-.19.16-.25.28l-.89 1.77l-1.78.89c-.37.17-.52.64-.33 1.01a.753.753 0 0 0 1.01.33l2.22-1.11L9.6 11.5L11 13c-1 3-8 7-8 7s4 2 9 2s9-2 9-2s-5-4-7-8m2.85-.91l-.32.16h-1.2l.06.16c.52 1.03 1.28 2.09 2.11 3.03l-.53-3.41z" />
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

/** Pala de pádel con su pelota. Material Symbols (Apache 2.0). */
const Padel = solid(
  <>
    <path d="M7.725 17.775q-.75-.3-1.325-.875l-4.225-4.25q-.575-.575-.875-1.312T1 9.825t.3-1.512T2.175 7L5 4.175Q5.575 3.6 6.313 3.3T7.825 3t1.513.3t1.312.875L14.9 8.4q.575.575.875 1.325t.3 1.525t-.3 1.513t-.875 1.312l-.7.7l5.1 5.1q.3.3.3.713t-.3.712t-.712.3t-.713-.3l-5.1-5.1l-.7.7q-.575.575-1.312.875t-1.513.3t-1.525-.3M5.175 11.1q.325 0 .538-.212t.212-.538t-.212-.537t-.538-.213t-.537.213t-.213.537t.213.538t.537.212m1.6-1.575q.325 0 .538-.212t.212-.538t-.213-.537t-.537-.213t-.537.213t-.213.537t.213.538t.537.212m.175 3.35q.325 0 .538-.213t.212-.537t-.213-.537t-.537-.213t-.537.213t-.213.537t.213.538t.537.212m1.4-4.95q.325 0 .538-.213t.212-.537t-.213-.537t-.537-.213t-.537.213t-.213.537t.213.538t.537.212m.2 3.375q.325 0 .537-.213t.213-.537t-.213-.537T8.55 9.8t-.537.213t-.213.537t.213.538t.537.212m.15 3.35q.325 0 .538-.213t.212-.537t-.212-.537t-.538-.213t-.537.213t-.213.537t.213.538t.537.212m1.425-4.95q.325 0 .538-.213t.212-.537t-.213-.537t-.537-.213t-.537.213t-.213.537t.213.538t.537.212m.175 3.35q.325 0 .538-.213t.212-.537t-.213-.537t-.537-.213t-.537.213t-.213.537t.213.538t.537.212m1.6-1.6q.325 0 .538-.212t.212-.538t-.213-.537t-.537-.213t-.537.213t-.213.537t.213.538t.537.212M19.5 9q-1.45 0-2.475-1.025T16 5.5t1.025-2.475T19.5 2t2.475 1.025T23 5.5t-1.025 2.475T19.5 9" />
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

/** Bailarina con tutú y un brazo en alto: Ballet. Material Design Icons (Apache 2.0). */
const Ballet = solid(
  <>
    <path d="M17 17h-2v6h-2v-6h-2.12l-1.54 1.93l2.37 2.36l-1.42 1.42l-2.36-2.37c-.35-.34-.55-.81-.58-1.3s.12-.98.43-1.36l.54-.68H7l2-4v-3c-.62.47-1.12 1.07-1.47 1.76c-.35.7-.53 1.46-.53 2.24H5a7 7 0 0 1 7-7c1.33 0 2.6-.53 3.54-1.46C16.47 4.6 17 3.33 17 2h2c0 1.32-.38 2.62-1.09 3.73A7 7 0 0 1 15 8.31V13zM14 4c0 .4-.12.78-.34 1.11s-.53.59-.89.74a2 2 0 0 1-2.18-.44c-.28-.28-.47-.63-.55-1.02s-.04-.79.11-1.15c.15-.37.41-.68.74-.9S11.6 2 12 2c.53 0 1.04.21 1.41.59c.38.37.59.88.59 1.41" />
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

/** Varias pelotas juntas: la categoría Deportes. Andrés Raxón (andrsrxn/icons, MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Pelotas = custom(
  <>
    <path
      d="M21.8 10.93c-.9 2.38-2.74 4.18-3.68 3.82s-.64-2.74.27-5.13c.92-2.38 2.28-4.33 3.22-3.97s1.1 2.9.2 5.28M9.47 6.19c-.92 2.38-.35 2.8.6 3.16c1.45.12 1.9.53 2.8-1.85c.92-2.39 1.22-4.75.27-5.11c-.94-.36-2.76 1.42-3.67 3.8"
      fill="currentColor"
      stroke="none"
      opacity=".2"
    />
    <path d="M8.78 8.84c-.1-1.3.18-2.49.89-3.7a6.81 6.81 0 0 1 11.8 6.8a6.7 6.7 0 0 1-6.34 3.42" />
    <path d="M13.2 2.23s.91 2.24-.16 5.05a8 8 0 0 1-1.45 2.4m6.45 5.21s-1-2.38.14-5.35a7.7 7.7 0 0 1 3.47-4.07" />
    <path
      d="M14.53 12.91c1.11 2.56.93 5.34-.22 5.84c-1.14.5-2.81-1.48-3.92-4.04s-1.36-5.04-.22-5.54s3.25 1.18 4.36 3.74M2.5 18.18c1.11 2.56 3.17 4.37 4.23 3.9c1.05-.45.7-3-.41-5.55c-1.12-2.56-2.7-4.46-3.75-4s-1.18 3.1-.07 5.65"
      fill="currentColor"
      stroke="none"
      opacity=".2"
    />
    <path d="M14.53 12.92a6.7 6.7 0 0 1-3.49 8.82a6.71 6.71 0 1 1 3.49-8.82" />
    <path d="M7 22.13s.37-2.94-.78-5.61a12 12 0 0 0-3.57-4.4" />
    <path d="M14.72 13.82s-3.52-.45-6.7.93s-5.27 4.26-5.27 4.26" />
    <path d="M14.1 19.05s-2.4-1.74-3.57-4.4c-1.15-2.67-.78-5.62-.78-5.62" />
  </>,
)

/** Persona con una patada alta: la categoría Artes Marciales. Material Design Icons `martial-arts` (Apache 2.0). */
const ArtesMarciales = solid(
  <path d="m19.8 2l-8.2 6.7l-1.21-1.04L14 5.58L9.41 1L8 2.41l2.74 2.74L5 8.46l-1.19 4.29L6.27 17L8 16l-2.03-3.5l.35-1.32L9.5 13l.5 9h2l.5-10L21 3.4zM5 3a2 2 0 1 1 0 4c-1.11 0-2-.89-2-2s.9-2 2-2" />,
)

/** La chaqueta del uniforme con su cinturón: Tae Kwon Do. IconOven `kimono` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Taekwondo = custom(
  <>
    <path d="m3.62 5.5l3.51-2Q8 3 9 3h6q1 0 1.87.5l3.51 2q.87.5.87 1.5v4q0 1-1 1H18q-1 0-1 1v7.25q0 1-1 1H8q-1 0-1-1V13q0-1-1-1H3.75q-1 0-1-1V7q0-1 .87-1.5m5.63-2.25l4.5 8.75m1-8.75l-2.3 4.25M7 7v4.5M17 7v4.5" />
    <path d="M7 12h10v3H7z" />
  </>,
)

/** Capas de la piel: Dermatología. Material Symbols `dermatology-outline-rounded` (Apache 2.0). Vive aquí, con el fragmento diferido, para no pesar en el paquete inicial. */
const Dermatology = solid(
  <path d="M3 21q-.425 0-.712-.288T2 20v-8q0-.825.588-1.412T4 10h4q.2 0 .388.075t.324.213t.213.324T9 11v1q0 1.25.875 2.125T12 15t2.125-.875T15 12v-1q0-.2.075-.388t.212-.325t.325-.212T16 10h4q.825 0 1.412.588T22 12v8q0 .425-.288.713T21 21zm1-2h16v-7h-3q0 2.075-1.463 3.538T12 17t-3.537-1.463T7 12H4zm8-6q-.425 0-.712-.288T11 12q0-2.725.625-5.375T14.35 2.25q.325-.275.725-.238t.675.363t.238.725t-.363.675q-1.75 1.475-2.187 3.7T13 12q0 .425-.288.713T12 13m-5.712 2.288q.212-.213.212-.538t-.213-.537T5.75 14t-.537.213T5 14.75t.213.538t.537.212t.538-.213m1 2.5q.212-.212.212-.537t-.213-.537t-.537-.213t-.537.213T6 17.25t.213.538t.537.212t.538-.213m11.5-2.5q.212-.212.212-.537t-.213-.537T18.25 14t-.537.213t-.213.537t.213.538t.537.212t.538-.213M4 19h16z" />,
)

/** Una muela de frente: Dentista. Tabler Icons `dental` (MIT). */
const Tooth = custom(
  <path d="M12 5.5C10.926 4.914 9.417 4 8 4C5.9 4 4 5.247 4 9c0 4.899 1.056 8.41 2.671 10.537c.573.756 1.97.521 2.567-.236q.597-.758 1.262-2.801c.292-.771.892-1.504 1.5-1.5c.602 0 1.21.737 1.5 1.5q.665 2.043 1.262 2.8c.597.759 2 .993 2.567.237C18.944 17.41 20 13.9 20 9c0-3.74-1.908-5-4-5c-1.423 0-2.92.911-4 1.5m0 0L15 7" />,
)

/**
 * Una muela con el aparato: un bracket en el centro de la corona y el alambre que la cruza, que sale a
 * los dos lados. Dibujo propio, en espera de una alternativa de librería.
 */
const DIENTE =
  'M7.4 3.2c-2.2 0-3.9 1.7-3.9 4.1 0 1.9.8 3 1.4 4.8.6 1.8.5 4.4 1.3 6.9.3 1 .9 1.6 1.7 1.6 1.1 0 1.4-1.2 1.7-2.9.2-1.3.7-2.1 1.7-2.1s1.5.8 1.7 2.1c.3 1.7.6 2.9 1.7 2.9.8 0 1.4-.6 1.7-1.6.8-2.5.7-5.1 1.3-6.9.6-1.8 1.4-2.9 1.4-4.8 0-2.4-1.7-4.1-3.9-4.1-1.7 0-2.7.9-4.6.9S9.1 3.2 7.4 3.2Z'
const Ortodoncia = custom(
  <>
    <path d={DIENTE} />
    {/* El bracket (un rectángulo de 4,4 × 3,4 centrado en x = 12) y el alambre, en un solo trazo. */}
    <path d="M9.8 6.9h4.4v3.4H9.8ZM1.8 8.6h20.4" />
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

/** Vaso de té con perlas y popote. Fluent Emoji High Contrast `bubble-tea` (MIT). */
const Boba = solid(
  <>
    <path d="M18.65 23.62a1.31 1.31 0 1 0 0-2.62a1.31 1.31 0 0 0 0 2.62m-3.99-1.31a1.31 1.31 0 1 1-2.62 0a1.31 1.31 0 0 1 2.62 0m2.91 3.3a1.31 1.31 0 1 1-2.62 0a1.31 1.31 0 0 1 2.62 0m-5.26 1.31a1.31 1.31 0 1 0 0-2.62a1.31 1.31 0 0 0 0 2.62" />
    <path d="M17 2v5h8a1 1 0 1 1 0 2l-2 20c-.097.605-.5 1-1 1H10c-.5 0-.924-.437-1-1L7 9a1 1 0 0 1 0-2h8V2zm-7.765 9.25L10.91 28h10.18l.16-1.592a1.31 1.31 0 1 1 .137-1.374l1.378-13.784z" />
  </>,
  '0 0 32 32',
)

/** Un cerdo: las carnitas son de cerdo y el dibujo lo dice sin rodeos. Material Design Icons `pig-variant-outline` (Apache 2.0). */
const Cerdo = solid(
  <path d="M15 10c0-.55.45-1 1-1s1 .45 1 1s-.45 1-1 1s-1-.45-1-1m7-2.5v6.97l-2.82.94L17.5 21H12v-2h-2v2H4.5S2 12.54 2 9.5S4.46 4 7.5 4h5c.91-1.21 2.36-2 4-2a1.498 1.498 0 0 1 1.38 2.08c-.14.34-.26.73-.32 1.15l2.27 2.27zm-2 2h-1L15.5 6c0-.65.09-1.29.26-1.91c-.97.25-1.76.97-2.09 1.91H7.5C5.57 6 4 7.57 4 9.5c0 1.88 1.22 6.65 2 9.5h2v-2h6v2h2l1.56-5.15l2.44-.82z" />,
)

/** Salchicha en su pan con la mostaza. Material Design Icons `food-hot-dog` (Apache 2.0). */
const HotDog = solid(
  <path d="M21 5.77c-.15-.12-.28-.22-.41-.32l.03-.04c.78-.78.78-2.04 0-2.82s-2.04-.78-2.83 0l-.74.74a3.465 3.465 0 0 0-4.55.32L3.65 12.5a3.465 3.465 0 0 0-.32 4.55l-.74.74c-.79.79-.79 2.05 0 2.83c.78.78 2.04.78 2.82 0l.04-.03c.1.13.2.26.32.41c1.36 1.34 3.58 1.34 4.95 0l10.25-10.28A3.52 3.52 0 0 0 21 5.77M4.77 15.61a1.5 1.5 0 0 1 .29-1.71l8.84-8.84a1.5 1.5 0 0 1 1.71-.29zM19.56 9.3L9.3 19.56c-.58.59-1.53.59-2.12 0c-.58-.56-.58-1.56 0-2.12L17.44 7.18c.56-.58 1.56-.58 2.12 0c.59.59.59 1.54 0 2.12" />,
)

/** Cartón de papas a la francesa. Material Design Icons `french-fries` (Apache 2.0). La bolsa de papas fritas es otro dibujo, el de Papas Preparadas. */
const PapasFritas = solid(
  <path d="M18 11V6h-3V4h-3V2H8v3H6v6H5l2 11h10l2-11zm-2.14 0c-.16.61-.46 1.16-.86 1.62v-4l2 1V11zM17 7v1.5l-2-1V7zm-5-2h2v3.5l-2 1zm0 5.62l2-1v3.83c-.59.35-1.27.55-2 .55zm-1 3.24c-.79-.21-1.5-.64-2-1.24v-3l2-1zM9 3h2v4.5L10 8V5H9zM7 6h2v2.5L8 9v2H7z" />,
)

/** Tazón de fruta. Carbon `fruit-bowl` (Apache 2.0). */
const Fruta = solid(
  <path d="M26 15a6 6 0 0 0-3.107-5.253A3.98 3.98 0 0 0 24 7h-2a2 2 0 0 1-2 2a6.004 6.004 0 0 0-5.995 5.892A7 7 0 0 1 12 10a3.996 3.996 0 0 0-3-3.858V4H7v2.142A3.996 3.996 0 0 0 4 10v5H2v1a14 14 0 0 0 28 0v-1Zm-6-4a4.005 4.005 0 0 1 4 4h-8a4.005 4.005 0 0 1 4-4M6 10a2 2 0 1 1 4 0a9 9 0 0 0 1.532 5H6Zm10 18A12.017 12.017 0 0 1 4.042 17h23.917A12.017 12.017 0 0 1 16 28" />,
  '0 0 32 32',
)

/** Baguette: barra en diagonal con sus tres cortes. Tabler Icons `baguette` (MIT). */
const Baguette = custom(
  <path d="m5.628 11.283l5.644-5.637c2.665-2.663 5.924-3.747 8.663-1.205l.188.181a2.987 2.987 0 0 1 0 4.228L8.836 20.124a3 3 0 0 1-4.089.135l-.143-.135C1.876 17.4 2.9 14.007 5.628 11.283M9.5 7.5L11 11m-4.5-.5L8 14m4.5-9.5L14 8" />,
)

/** Bagel con sus semillas. IconOven `donut` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Bagel = custom(
  <>
    <circle cx="12" cy="12" r="9.25" />
    <path d="M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6m-5.25.25l1-1m8-1.5L17 7.5m.25 6.5l-.5 1.25m-8.5.5l1 .75" />
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

/** Torta: hamburguesa de pan redondo con su relleno. Majesticons `burger-line` (MIT). */
const Torta = custom(
  <>
    <path d="m15 15l3.379-3.379a2.12 2.12 0 0 1 1.5-.621H20a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2h4.515a6 6 0 0 1 4.242 1.757zM3 15h18v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" />
    <path d="M12 4c-4.623 0-8.432 1.756-8.942 6c-.066.55.39 1 .942 1h16c.552 0 1.008-.45.942-1c-.51-4.244-4.319-6-8.942-6M7.001 8H7m5.002 0" />
  </>,
)

/** Tazón de fideos con palillos y la onda del caldo. IconOven `noodles` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Ramen = custom(
  <>
    <path d="M4 10.75h16a.75.75 0 0 1 .75.8A8.75 8.75 0 0 1 16 18.7v1.55a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V18.7a8.75 8.75 0 0 1-4.75-7.15a.75.75 0 0 1 .75-.8m5.5 0L18.25 3m-5 7.75l7-5" />
    <path d="M7 14.25c.9.75 1.6.75 2.5 0s1.6-.75 2.5 0s1.6.75 2.5 0s1.6-.75 2.5 0" />
  </>,
)

export const ICONOS_DEPORTE: Record<string, IconComponent> = {
  arepa: Arepa,
  boba: Boba,
  cerdo: Cerdo,
  'hot-dog': HotDog,
  'papas-fritas': PapasFritas,
  fruta: Fruta,
  baguette: Baguette,
  bagel: Bagel,
  waffle: Waffle,
  torta: Torta,
  ramen: Ramen,
  ortodoncia: Ortodoncia,
  tooth: Tooth,
  dermatology: Dermatology,
  'artes-marciales': ArtesMarciales,
  ballet: Ballet,
  barbell: Barbell,
  barre: Barre,
  bike: Bike,
  boxeo: Boxeo,
  danza: Danza,
  estiramiento: Estiramiento,
  funcional: Funcional,
  natacion: Natacion,
  padel: Padel,
  pickleball: Pickleball,
  pelotas: Pelotas,
  pilates: Pilates,
  taekwondo: Taekwondo,
  yoga: Yoga,
}

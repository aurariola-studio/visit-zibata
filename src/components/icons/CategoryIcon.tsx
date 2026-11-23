/**
 * Iconos de categoría. `categories.json` referencia un nombre (`icon`); aquí se resuelve a un
 * componente. Nombres desconocidos usan un icono genérico, así una categoría nueva nunca rompe la UI.
 */
import {
  BicepsFlexed,
  CookingPot,
  Cupcake,
  CupSoda,
  Glasses,
  Hamburger,
  HandPlatter,
  HeartPulse,
  LeafyGreen,
  type LucideProps,
  Martini,
  Microscope,
  Pill,
  Popcorn,
  ShoppingBasket,
  ShoppingCart,
  Shrimp,
  Stethoscope,
  Store,
  UtensilsCrossed,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { custom, type IconComponent, solid } from './dibujar.tsx'

/** Persona con una patada alta: la categoría Artes Marciales. Material Design Icons `martial-arts` (Apache 2.0). */
const ArtesMarciales = solid(
  <path d="m19.8 2l-8.2 6.7l-1.21-1.04L14 5.58L9.41 1L8 2.41l2.74 2.74L5 8.46l-1.19 4.29L6.27 17L8 16l-2.03-3.5l.35-1.32L9.5 13l.5 9h2l.5-10L21 3.4zM5 3a2 2 0 1 1 0 4c-1.11 0-2-.89-2-2s.9-2 2-2" />,
)

/** Barra con sus discos: el gimnasio de pesas. Tabler Icons (MIT). */
const Barbell = custom(
  <>
    <path d="M2 12h1m3-4H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2m0-9v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1m3 5h6m0-5v10a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1m3 1h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2m4-4h-1" />
  </>,
)

/** Galleta con mordida y sus chispas, solo el contorno: Postres y Dulces. Material Design Icons `cookie-outline` (Apache 2.0). */
const Galleta = solid(
  <path d="M20.87 10.5C20.6 10 20 10 20 10h-2V9c0-1-1-1-1-1h-2V7c0-1-1-1-1-1h-1V4c0-1-1-1-1-1a9 9 0 1 0 9 9c0-.5-.04-1-.13-1.5m-9.55 8.46c.68-.14 1.18-.74 1.18-1.46c0-.83-.67-1.5-1.5-1.5a1.498 1.498 0 0 0-.84 2.74c-2.62-.7-4.66-2.93-5.07-5.62C5 12.61 5 12.11 5 11.62c.07.77.71 1.38 1.5 1.38c.83 0 1.5-.67 1.5-1.5S7.33 10 6.5 10c-.68 0-1.25.46-1.43 1.08C5.47 8 7.91 5.5 11 5.07V6.5c0 .83.67 1.5 1.5 1.5h.5v.5c0 .83.67 1.5 1.5 1.5H16v.5c0 .83.67 1.5 1.5 1.5H19c0 4.08-3.5 7.36-7.68 6.96M9.5 9C8.67 9 8 8.33 8 7.5S8.67 6 9.5 6s1.5.67 1.5 1.5S10.33 9 9.5 9m3.5 3.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5s1.5.67 1.5 1.5m5 2c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5s1.5.67 1.5 1.5" />,
)

/** Tazón con palillos: cocina asiática en general. Fluent UI System Icons `bowl-chopsticks` (MIT). */
const Chopsticks = solid(
  <path d="M2.732 1.078a.5.5 0 0 1 .69.154L7.092 7h1.815L5.578 1.77a.5.5 0 0 1 .844-.537L10.092 7H14.5a.5.5 0 0 1 .5.5V8A7 7 0 1 1 1 8v-.5a.5.5 0 0 1 .5-.5h4.407L2.578 1.77a.5.5 0 0 1 .154-.69M2.342 10h11.317A6 6 0 0 0 14 8H2c0 .701.12 1.375.341 2m.46 1A6 6 0 0 0 8 14c2.22 0 4.16-1.207 5.197-3z" />,
  '0 0 16 16',
)

/** Pareja de baile de salón. Material Design Icons (Apache 2.0). */
const Danza = solid(
  <>
    <path d="M14 3.5c0 .83-.67 1.5-1.5 1.5S11 4.33 11 3.5S11.67 2 12.5 2s1.5.67 1.5 1.5M8.5 5C7.67 5 7 5.67 7 6.5S7.67 8 8.5 8S10 7.33 10 6.5S9.33 5 8.5 5m5.5 7l-.78-2.25h2.96l2.16-1.08c.37-.17.52-.63.33-1a.737.737 0 0 0-1-.34l-.82.41l-.49-.84c-.29-.65-1-1.02-1.7-.86l-2.47.53c-.69.15-1.19.78-1.19 1.5v.7l-2.43 1.62h.01c-.08.07-.19.16-.25.28l-.89 1.77l-1.78.89c-.37.17-.52.64-.33 1.01a.753.753 0 0 0 1.01.33l2.22-1.11L9.6 11.5L11 13c-1 3-8 7-8 7s4 2 9 2s9-2 9-2s-5-4-7-8m2.85-.91l-.32.16h-1.2l.06.16c.52 1.03 1.28 2.09 2.11 3.03l-.53-3.41z" />
  </>,
)

/** Taza con vapor y un tazón: la categoría Desayunos y Café. Fluent UI System Icons (MDL2) `breakfast` (MIT). */
const Desayuno = solid(
  <path d="M1408 592q-26 0-45-19t-19-45q0-51 19-98t56-83l79-80q38-38 38-91q0-26 19-45t45-19t45 19t19 45q0 51-19 98t-56 83l-79 80q-38 38-38 91q0 26-19 45t-45 19m-384 0q-26 0-45-19t-19-45q0-51 19-98t56-83l79-80q38-38 38-91q0-26 19-45t45-19t45 19t19 45q0 51-19 98t-56 83l-79 80q-38 38-38 91q0 26-19 45t-45 19m832 176q40 0 75 15t61 41t41 61t15 75v384q0 40-15 75t-41 61t-61 41t-75 15h-57q-2 7-3 13t-4 12v39q0 66-25 124t-69 102t-102 69t-124 25h-384q-78 0-144-35t-110-93H334q-66 0-124-25t-102-68t-69-102t-25-125v-64h256q0-79 30-149t83-122t122-83t149-30q30 0 58 5t56 14V640h1024v128zM654 1152q-53 0-99 20t-82 55t-55 81t-20 100h370v-228q-26-13-54-20t-60-8m-320 512h441q-7-29-7-64v-64H153q10 28 28 51t41 41t52 26t60 10m463 67v1l1 2v-1zm867-131V768H896v832q0 40 15 75t41 61t61 41t75 15h384q40 0 75-15t61-41t41-61t15-75m256-256V960q0-26-19-45t-45-19h-64v512h64q26 0 45-19t19-45" />,
  '0 0 2048 2048',
)

/** Bolillo con sus cortes: la categoría Panaderías y su giro Panadería. TDesign `bread` (MIT). */
const Bolillo = custom(
  <path d="m13.188 4.683l3.068 3.069m-3.068-3.07c-.723-.722-.815-1.01.593-1.527c3.934-1.44 8.422 2.84 7.391 6.9c-.598 2.357-2.214 4.812-4.209 6.889c-2.076 1.994-4.531 3.61-6.889 4.209c-4.06 1.03-8.34-3.458-6.899-7.391c.516-1.408.804-1.317 1.527-.594m8.486-8.485c-2.28-2.279-6.862 1.623-4.71 3.776m0 0l3.536 3.535M8.478 8.46c-2.152-2.153-6.054 2.43-3.776 4.709m0 0l3.07 3.069" />,
)

/** Persona estirándose: la categoría Yoga, Pilates y Barre. Tabler Icons (MIT). */
const Estiramiento = custom(
  <>
    <path d="M15 5a1 1 0 1 0 2 0a1 1 0 1 0-2 0M5 20l5-.5l1-2m7 2.5v-5h-5.5L15 8.5l-5.5 1l1.5 2" />
  </>,
)

/** Tenedor con fideos a un lado: la cocina italiana. Web Hosting Hub Icons `pasta` (OFL 1.1). */
const Italiana = solid(
  <path d="m896.59 320l-257-52q-5 49-41 82.5t-86 33.5h-64V64h64q50 0 86 33.5t41 81.5l257-51q128 0 128 95q0 53-36 75t-92 22m-544 128q-13 0-22.5-9.5t-9.5-22.5V32q0-13 9.5-22.5t22.5-9.5t22.5 9.5t9.5 22.5v384q0 13-9.5 22.5t-22.5 9.5m-128 576q-13 0-22.5-9.5t-9.5-22.5V32q0-13 9.5-22.5t22.5-9.5t22.5 9.5t9.5 22.5v960q0 13-9.5 22.5t-22.5 9.5M.59 352q0-13 9.5-22.5t22.5-9.5h96v64h-96q-13 0-22.5-9.5T.59 352m0-128q0-13 9.5-22.5t22.5-9.5h96v64h-96q-13 0-22.5-9.5T.59 224m0-128q0-13 9.5-22.5t22.5-9.5h96v64h-96q-13 0-22.5-9.5T.59 96" />,
  '0 0 1025 1024',
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

/**
 * Taco con su lechuga y su relleno: Tacos y Antojitos y la taquería. Fluent Emoji High Contrast `taco` (MIT).
 * Las líneas de la lechuga miden la mitad que el resto del dibujo; el segundo trazo las engruesa hacia
 * afuera hasta igualarlas, sin cerrar el hueco con la tortilla.
 */
const Taco = solid(
  <>
    <path d="M2.267 21.89a5.6 5.6 0 0 1-.206-.886a5.75 5.75 0 0 1 .164-2.411a5.6 5.6 0 0 1 1.065-1.999a5.86 5.86 0 0 1 2.593-1.786c.44-.147.888-.188 1.338-.23q.202-.017.406-.04a6 6 0 0 0 .573-.09a5.94 5.94 0 0 0 2.53-1.242l.013-.01q.496-.413.903-.926a5.545 5.545 0 0 1 6.932-1.477c.786.412 1.372 1.003 1.942 1.663l.048.055a3.962 3.962 0 0 1 5.764 2.39a5.64 5.64 0 0 1 2.865 2.36a5.67 5.67 0 0 1 .498 4.78c.195.854.299 1.744.3 2.657v2.782a3.52 3.52 0 0 1-3.52 3.52H5.457a3.52 3.52 0 0 1-3.52-3.52v-2.79c0-.964.114-1.902.33-2.8m4.408 7.38a3.5 3.5 0 0 1-.49-1.79v-1.868a5.6 5.6 0 0 1-2.357-1.285q-.002.106-.002.213v1.96a2.767 2.767 0 0 0 2.77 2.77zm-.489-4.7q.008-.78.114-1.536a3.96 3.96 0 0 1 3.362-6.75a11.86 11.86 0 0 1 8.424-3.494q.75 0 1.476.09c-.468-.519-.909-.918-1.449-1.201a4.546 4.546 0 0 0-5.683 1.211v.001c-1.014 1.279-2.425 2.188-4.018 2.534c-.39.085-.788.121-1.113.15l-.167.016c-.378.037-.668.077-.933.166c-.824.274-1.6.825-2.14 1.476a4.6 4.6 0 0 0-.874 1.641c-.185.63-.23 1.34-.135 1.984a4.62 4.62 0 0 0 3.136 3.712m20.28-8.329A12 12 0 0 1 29 19.938a4.6 4.6 0 0 0-.658-2.157c-.45-.74-1.1-1.34-1.869-1.729a4 4 0 0 1-.008.19M8.186 24.69v2.79c0 .838.682 1.52 1.52 1.52h16.77c.837 0 1.52-.682 1.52-1.52v-2.779c-.01-5.48-4.444-9.911-9.91-9.911c-5.468 0-9.9 4.432-9.9 9.9" />
    <path
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.27 21.89A5.6 5.6 0 0 1 2.06 21A5.75 5.75 0 0 1 2.23 18.59A5.6 5.6 0 0 1 3.29 16.59A5.86 5.86 0 0 1 5.88 14.81C6.32 14.66 6.77 14.62 7.22 14.58Q7.42 14.56 7.63 14.54A6 6 0 0 0 8.2 14.45A5.94 5.94 0 0 0 10.73 13.21M10.74 13.2Q11.24 12.78 11.65 12.27A5.54 5.54 0 0 1 18.58 10.79C19.36 11.21 19.95 11.8 20.52 12.46L20.57 12.51M26.33 14.9A5.64 5.64 0 0 1 29.2 17.26A5.67 5.67 0 0 1 29.69 22.04M6.19 25.61A5.6 5.6 0 0 1 3.83 24.33"
    />
  </>,
  '0 0 32 32',
)

/** Una muela de frente: Dentista. Tabler Icons `dental` (MIT). */
const Tooth = custom(
  <path d="M12 5.5C10.926 4.914 9.417 4 8 4C5.9 4 4 5.247 4 9c0 4.899 1.056 8.41 2.671 10.537c.573.756 1.97.521 2.567-.236q.597-.758 1.262-2.801c.292-.771.892-1.504 1.5-1.5c.602 0 1.21.737 1.5 1.5q.665 2.043 1.262 2.8c.597.759 2 .993 2.567.237C18.944 17.41 20 13.9 20 9c0-3.74-1.908-5-4-5c-1.423 0-2.92.911-4 1.5m0 0L15 7" />,
)

/** Espejo de pie: el sector Belleza y Cuidado Personal. Iconoven `mirror` (MIT); el trazo de origen es de 1,5 y aquí va a 2. */
const Espejo = custom(
  <>
    <rect width="12.5" height="15.5" x="5.75" y="2.75" rx="6.25" />
    <path d="m9.25 9.25l3-3m-2.5 6.5l5-5M12 18.25v3m-3.5 0h7" />
  </>,
)

/** Tijeras: Peluquería. Coolicons `scissors` (MIT). */
const Tijeras = custom(
  <path d="M8.121 15.879L21 3M8.121 8.121L12 12m3 3l6 6M3 6a3 3 0 1 0 6 0a3 3 0 0 0-6 0m0 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0" />,
)

/** Poste de barbería con sus rayas: Barbería. Lucide Lab `barber-pole` (ISC). */
const PosteBarberia = custom(
  <path d="M7 6h10M7 22h10m-9 0V6a4 4 0 0 1 8 0v16M8 11.5l8-4M8 16l8-4m-8 8.5l8-4" />,
)

/** Frasco de esmalte de uñas, solo el contorno: Uñas. Icon Park `nail-polish` (Apache 2.0); el original es de 48 y trazo 4, aquí va a la mitad. */
const Esmalte = custom(
  <g transform="scale(.5)" strokeWidth="4">
    <path d="M18.895 5.89A2 2 0 0 1 20.892 4h6.216a2 2 0 0 1 1.997 1.89l.778 14A2 2 0 0 1 27.886 22h-7.772a2 2 0 0 1-1.997-2.11zM11 28a6 6 0 0 1 6-6h14a6 6 0 0 1 6 6v13a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3z" />
    <circle cx="24" cy="33" r="3" fill="currentColor" />
  </g>,
)

/** Un filete con su hueso: la categoría Carnes y Parrilla. Material Design Icons `food-steak` (Apache 2.0). */
const Filete = solid(
  <path d="M11.9 2C8 2 4.9 5.4 5 9.3c.1 2.6 1.6 4.8 3.7 5.9c1.4.7 2.3 2.1 2.3 3.6v.2c0 1.7 1.3 3 3 3c4 0 5-5 5-13c0 0 0-7-7.1-7M14 20c-.6 0-1-.4-1-1v-.2c0-2.2-1.3-4.3-3.3-5.4C8.1 12.6 7.1 11 7 9.2c0-1.3.5-2.7 1.4-3.7S10.6 4 11.8 4C16.7 4 17 8.2 17 9c0 9.9-1.7 11-3 11m1.8-12.4l-7.5 2.7Q8 9.85 8 9.1c0-.7.2-1.3.5-2l5.2-1.9c1.2.6 1.8 1.5 2.1 2.4m-2.9 7.5l2.8-1c-.1 1.5-.4 2.6-.6 3.3l-1.3.5c0-1-.3-1.9-.9-2.8M16 9.2c0 1.2 0 2.3-.1 3.2l-4 1.5c-.5-.5-1.1-1-1.8-1.3c-.4-.2-.8-.5-1.1-.8z" />,
)

/** Una tienda con su toldo: la categoría Abarrotes. Boxicons `store` (MIT). */
const Tienda = solid(
  <path d="M19.1 2.8c-.38-.5-.97-.8-1.6-.8h-11c-.63 0-1.22.3-1.6.8L2.2 6.4c-.13.17-.2.38-.2.6v1c0 1.04.41 1.98 1.06 2.69c-.03.1-.06.2-.06.31v9c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-9c0-.11-.03-.21-.06-.31C21.59 9.98 22 9.04 22 8V7c0-.22-.07-.43-.2-.6zm.9 4.53V8c0 1.1-.9 2-2 2s-2-.9-2-2V7q0-.12-.03-.24L15.28 4h2.22zM10.78 4h2.44L14 7.12V8c0 1.1-.9 2-2 2s-2-.9-2-2v-.88zM4 7.33L6.5 4h2.22l-.69 2.76Q8 6.88 8 7v1c0 1.1-.9 2-2 2s-2-.9-2-2zM10 20v-4h4v4zm6 0v-4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v4H5v-8.14c.32.08.65.14 1 .14c1.2 0 2.27-.54 3-1.38c.73.84 1.8 1.38 3 1.38s2.27-.54 3-1.38c.73.84 1.8 1.38 3 1.38c.35 0 .68-.06 1-.14V20z" />,
)

/** Una tienda con un reloj: la categoría Conveniencia, que abre a todas horas. Material Design Icons `store-clock-outline` (Apache 2.0). */
const TiendaAbierta = solid(
  <path d="M18 4H2V2h16zm-.5 9H16v5l3.61 2.16l.75-1.22l-2.86-1.69zm6.5 4c0 3.87-3.13 7-7 7c-3.53 0-6.43-2.61-6.92-6H2v-6H1v-2l1-5h16l1 5v.29c2.89.87 5 3.54 5 6.71M3.04 10h13.92l-.6-3H3.64zM4 16h6v-4H4zm18 1c0-2.76-2.24-5-5-5s-5 2.24-5 5s2.24 5 5 5s5-2.24 5-5" />,
)

/** Una caja de carne con su hueso: la categoría Carnicerías. Griddy Icons `meat-boxed` (MIT). */
const Carne = solid(
  <>
    <path d="M19.25 3.995H4.75A2.755 2.755 0 0 0 2 6.745v10.5a2.755 2.755 0 0 0 2.75 2.75h14.5a2.755 2.755 0 0 0 2.75-2.75v-10.5a2.755 2.755 0 0 0-2.75-2.75M8 14.69c-.915-.595-1.5-1.595-1.5-2.69S7.085 9.9 8 9.31v5.385zm-3.25 3.805c-.69 0-1.25-.56-1.25-1.25v-10.5c0-.69.56-1.25 1.25-1.25H8V7.62c-1.79.73-3 2.455-3 4.375s1.21 3.645 3 4.375v2.12H4.75zm4.75 0v-13H12v13zm4-9.58c2.56.285 3.5.88 3.5 1.335c0 .985-1.465 2.725-3.5 3.89zm7 8.33c0 .69-.56 1.25-1.25 1.25H13.5V15.83c2.485-1.2 5-3.565 5-5.58c0-2.15-3.225-2.675-5-2.85V5.495h5.75c.69 0 1.25.56 1.25 1.25z" />
    <path d="M19 15.495h-3.5v1.5H19z" />
  </>,
)

/** Una naranja con su hoja, solo el contorno: la categoría Fruterías. MingCute `orange-line` (Apache 2.0). */
const Naranja = solid(
  <path d="M12.637 4.024c.422-.343.842-.643 1.34-.868c1.282-.578 2.824-.68 4.187-.347c.268.065.573.149.806.304l.415.364l.101.551c.042.834-.605 2.022-1.035 2.699c.704.749 1.295 1.571 1.727 2.508c1.785 3.874.572 8.512-2.862 11.029a9 9 0 0 1-8.82 1.029a9.06 9.06 0 0 1-3.76-2.977a9 9 0 0 1-1.707-4.579C2.579 8.186 7.127 3.7 12.637 4.024m-2.022 4.498l-.101-.55c-.031-.624.313-1.36.573-1.907a6.93 6.93 0 0 0-3.642 1.62C3.329 11.217 4.64 17.93 9.787 19.643a7.07 7.07 0 0 0 4.426 0c3.712-1.236 5.702-5.342 4.371-9.025c-.332-.916-.854-1.695-1.495-2.42c-1.37 1.081-3.259 1.37-4.947 1.058c-.368-.068-.795-.158-1.112-.37Zm2.098-1.201c2.162.245 3.725-.608 4.574-2.643c-2.162-.244-3.725.609-4.574 2.643" />,
)

/** Una copa de vino: la categoría Licorerías. Boxicons `wine` (MIT). */
const CopaDeVino = solid(
  <path d="M11 17.92V20H8v2h8v-2h-3v-2.08c3.18-.4 5.89-2.66 6.76-5.79c.26-.95.31-2.03.14-3.21l-.87-6.06c-.07-.49-.49-.86-.99-.86H5.96c-.5 0-.92.37-.99.86L4.1 8.92c-.17 1.18-.12 2.26.14 3.21c.87 3.13 3.57 5.39 6.76 5.79m6.83-6.33C17.11 14.19 14.71 16 12 16c-2.56 0-4.83-1.63-5.68-4c.72.32 1.47.49 2.22.49c1.46 0 2.92-.6 4.15-1.77c1.5-1.44 3.35-1.61 4.95-.47l.35.25a5 5 0 0 1-.16 1.08ZM6.83 4h10.34l.58 4.03c-2.15-.98-4.57-.55-6.44 1.25c-1.5 1.44-3.35 1.61-4.95.47l-.31-.22l.03-.32l.75-5.2Z" />,
)

/** Flor de loto con su pétalo central: Spa y Masajes. Material Design Icons `spa` en versión angular (Apache 2.0). */
const Spa = solid(
  <path d="M15.49 9.63c-.18-2.79-1.31-5.51-3.43-7.63a12.2 12.2 0 0 0-3.55 7.63c1.28.68 2.46 1.56 3.49 2.63c1.03-1.06 2.21-1.94 3.49-2.63m-6.5 2.65c-.14-.1-.3-.19-.45-.29c.15.11.31.19.45.29m6.42-.25c-.13.09-.27.16-.4.26c.13-.1.27-.17.4-.26M12 15.45C9.85 12.17 6.18 10 2 10c0 5.32 3.36 9.82 8.03 11.49c.63.23 1.29.4 1.97.51c.68-.12 1.33-.29 1.97-.51C18.64 19.82 22 15.32 22 10c-4.18 0-7.85 2.17-10 5.45" />,
)

/** Una ceja, solo el contorno: Cejas y Pestañas. MingCute `eyebrow-line` (Apache 2.0). */
const Ceja = solid(
  <path d="M19.995 14.018c-1.733-.202-3.489-.123-5.211.142a27 27 0 0 0-3.187.7q-1.075.303-2.129.675c-.796.279-1.583.586-2.365.904c-.499.204-.988.413-1.525.499c-1.732.279-3.55-.531-4.288-2.169a3.3 3.3 0 0 1-.288-1.368c.034-2.424 2.518-3.726 4.513-4.422c4.013-1.401 9.767-1.381 13.63.479c1.343.648 2.629 1.571 3.421 2.862c.063.102.343.559.401.776a1.01 1.01 0 0 1-.914 1.255c-.395.021-.78-.138-1.17-.205Zm-.517-2.054c-.735-.541-1.591-.916-2.454-1.2c-3.11-1.025-7.063-1.007-10.202-.102c-1.11.321-4.043 1.339-3.806 2.944c.122.829.957 1.356 1.746 1.39c.388.017.752-.077 1.111-.214c.983-.375 1.948-.79 2.942-1.138c3.388-1.186 7.055-2.001 10.663-1.68" />,
)

/** Labial y su base: Maquillaje. Icon Park `lipstick` (Apache 2.0); el original es de 48 y trazo 4, aquí va a la mitad. */
const Labial = custom(
  <g transform="scale(.5)" strokeWidth="4">
    <path d="M29 24h12v20H29zM7 24h14v20H7zm3-12.545V24h8V4c-6.5 0-8 5.636-8 7.454M7 32h14" />
  </g>,
)

/** Frasco de loción con su dosificador: Piel y Cuerpo. Boxicons `lotion` (MIT). */
const Locion = solid(
  <path d="M8 4h3v1h-1c-.55 0-1 .45-1 1v2H8c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1V6c0-.55-.45-1-1-1h-1V4h5V2H8zm0 16v-4.96c1.66.11 2.62.49 3.63.89c1.14.46 2.32.93 4.37 1.04V20zm8-5.04c-1.66-.11-2.62-.49-3.63-.89c-1.14-.46-2.32-.93-4.37-1.04V10h8zM11 8V7h2v1z" />,
)

const ICONS: Record<string, IconComponent> = {
  'artes-marciales': ArtesMarciales,
  barbell: Barbell,
  'biceps-flexed': BicepsFlexed,
  candy: Galleta,
  bolillo: Bolillo,
  carne: Carne,
  ceja: Ceja,
  chopsticks: Chopsticks,
  'cooking-pot': CookingPot,
  'copa-de-vino': CopaDeVino,
  cupcake: Cupcake,
  'cup-soda': CupSoda,
  danza: Danza,
  desayuno: Desayuno,
  esmalte: Esmalte,
  espejo: Espejo,
  estiramiento: Estiramiento,
  filete: Filete,
  glasses: Glasses,
  hamburger: Hamburger,
  'hand-platter': HandPlatter,
  'heart-pulse': HeartPulse,
  italiana: Italiana,
  labial: Labial,
  'leafy-green': LeafyGreen,
  locion: Locion,
  martini: Martini,
  microscope: Microscope,
  molcajete: Molcajete,
  naranja: Naranja,
  pan: Pan,
  pelotas: Pelotas,
  pill: Pill,
  popcorn: Popcorn,
  'poste-barberia': PosteBarberia,
  'shopping-basket': ShoppingBasket,
  'shopping-cart': ShoppingCart,
  shrimp: Shrimp,
  spa: Spa,
  stethoscope: Stethoscope,
  store: Store,
  taco: Taco,
  tienda: Tienda,
  'tienda-abierta': TiendaAbierta,
  tijeras: Tijeras,
  tooth: Tooth,
  'utensils-crossed': UtensilsCrossed,
}

/**
 * Los iconos de las subcategorías (los giros que no son ni un sector ni una categoría de la primera pantalla)
 * viven en `iconos-diferidos.tsx` y se cargan aparte, porque el paquete inicial tiene presupuesto
 * (`npm run perf:budget`). El fragmento se pide en cuanto hay un respiro tras el primer pintado, sin esperar
 * al primer icono que lo necesite; si uno sale antes, se reserva su caja hasta que llegue, para que nada se
 * mueva al aparecer. Una prueba comprueba que ningún sector ni categoría está aquí y que todo giro que no es
 * ninguna de las dos sí.
 */
const NOMBRES_DIFERIDOS = new Set([
  'acai',
  'antojito',
  'arepa',
  'bagel',
  'baguette',
  'ballet',
  'barre',
  'beer',
  'bike',
  'birria',
  'boba',
  'bone',
  'bowl',
  'frasco',
  'jabon',
  'leche',
  'spray',
  'boxeo',
  'cake-slice',
  'cecina',
  'cerdo',
  'cherry',
  'coffee',
  'crepa',
  'dermatology',
  'drumstick',
  'brunch',
  'elote',
  'empanada',
  'fish',
  'flame',
  'fruta',
  'funcional',
  'hot-dog',
  'plato-desayuno',
  'ice-cream',
  'jugo',
  'kebab',
  'natacion',
  'nigiri',
  'ortodoncia',
  'padel',
  'papas',
  'papas-fritas',
  'pasta',
  'pickleball',
  'pilates',
  'pizza',
  'proteina',
  'quesadilla',
  'ramen',
  'salad',
  'sandwich',
  'taekwondo',
  'te',
  'torta',
  'waffle',
  'wine',
  'wrap',
  'yoga',
  'tinte',
  'secadora',
  'bano-burbujas',
  'masaje',
  'cara-cuidada',
  'rastrillo',
  'cuerpo',
])

let diferidos: Record<string, IconComponent> | undefined
let cargaDiferidos: Promise<void> | undefined

function cargarDiferidos(): Promise<void> {
  cargaDiferidos ??= import('./iconos-diferidos.tsx')
    .then((m) => {
      diferidos = m.ICONOS_DIFERIDOS
    })
    .catch((error) => {
      // Sin red: el icono se queda en su caja vacía y la guía sigue entera. Se vuelve a intentar al pedirlo otra vez.
      cargaDiferidos = undefined
      throw error
    })
  return cargaDiferidos
}

// Un respiro tras el primer pintado: así las tarjetas no salen con el icono en blanco.
if (typeof window !== 'undefined') {
  const alRespirar =
    window.requestIdleCallback ?? ((funcion: () => void) => setTimeout(funcion, 200))
  alRespirar(() => {
    cargarDiferidos().catch(() => {})
  })
}

function IconoDiferido({ name, ...props }: { name: string } & LucideProps) {
  const [cargado, setCargado] = useState(diferidos)
  useEffect(() => {
    if (cargado) return
    let vivo = true
    cargarDiferidos()
      .then(() => vivo && setCargado(diferidos))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [cargado])
  const Icon = cargado?.[name]
  if (Icon) return <Icon aria-hidden="true" focusable="false" {...props} />
  const { size = 24 } = props
  return <span aria-hidden="true" style={{ display: 'inline-block', width: size, height: size }} />
}

/** ¿Es un icono de subcategoría, que se carga aparte? */
export function esIconoDiferido(name: string): boolean {
  return NOMBRES_DIFERIDOS.has(name)
}

/** ¿Hay dibujo para este nombre? Una prueba lo exige a cada icono usado en los datos. */
export function hasCategoryIcon(name: string): boolean {
  return Object.hasOwn(ICONS, name) || NOMBRES_DIFERIDOS.has(name)
}

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  if (NOMBRES_DIFERIDOS.has(name)) return <IconoDiferido name={name} {...props} />
  // `hasOwn` y no `ICONS[name]` a secas: con un nombre como `constructor` el índice devolvería lo
  // heredado de `Object` y React intentaria pintarlo como componente.
  const Icon = Object.hasOwn(ICONS, name) ? (ICONS[name] ?? UtensilsCrossed) : UtensilsCrossed
  return <Icon aria-hidden="true" focusable="false" {...props} />
}

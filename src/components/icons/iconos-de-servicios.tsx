/**
 * Los iconos de Servicios y de las categorías que le siguen (Entretenimiento y Fisioterapia, de Salud), en un
 * fragmento aparte, como los de Mascotas. `CategoryIcon` lo pide solo cuando se pinta uno de estos nombres (ver
 * `fragmentos.ts`): los dos iconos de sector (la campanilla y el boleto) van en el registro general porque salen en
 * la primera pantalla, y el resto no hace falta hasta abrir el sector. Cada sector paga su peso en `iconosDeSectorJs`.
 */
import { custom, type IconComponent, solid } from './dibujar.tsx'

/** Percha: la categoría Lavandería y Sastrería y su giro Lavandería. Material Design Icons `hanger` (Apache 2.0). */
const Percha = solid(
  <path d="M12 4a3.5 3.5 0 0 0-3.5 3.5h2A1.5 1.5 0 0 1 12 6a1.5 1.5 0 0 1 1.5 1.5A1.5 1.5 0 0 1 12 9c-.55 0-1 .45-1 1v1.75L2.4 18.2A1 1 0 0 0 3 20h18a1 1 0 0 0 .6-1.8L13 11.75v-.9a3.5 3.5 0 0 0 2.5-3.35A3.5 3.5 0 0 0 12 4m0 9.5l6 4.5H6Z" />,
)

/** Plancha: el giro Tintorería. Tabler Icons `ironing-3` (MIT). */
const Plancha = custom(
  <path d="M12 15h.01M9 6h7.459a3 3 0 0 1 2.959 2.507l.577 3.464l.81 4.865A1 1 0 0 1 19.82 18H3a7 7 0 0 1 7-7h9.8M9 15h.01M15 15h.01" />,
)

/** Lavadora: el giro Lavandería de Autoservicio. Lucide `washing-machine` (ISC). */
const Lavadora = custom(
  <>
    <path d="M3 6h3m11 0h.01" />
    <rect width="18" height="20" x="3" y="2" rx="2" />
    <circle cx="12" cy="13" r="5" />
    <path d="M12 18a2.5 2.5 0 0 0 0-5a2.5 2.5 0 0 1 0-5" />
  </>,
)

/** Aguja con hilo: el giro Sastrería. Tabler Icons `needle-thread` (MIT). */
const Aguja = custom(
  <>
    <path d="M3 21Q2 20 14.785 4.291a3.5 3.5 0 1 1 5.078 4.791Q4.001 22 3 21M17.5 6.5l-1 1" />
    <path d="M17 7c-2.333-2.667-3.5-4-5-4s-2 1-2 2c0 4 8.161 8.406 6 11c-1.056 1.268-3.363 1.285-5.75.808m-4.511-1.383C4.346 14.86 2 13.5 2 12m17.5-2.5L21 11" />
  </>,
)

/** Cartera: la categoría Bancos y Cajeros y su giro Banco. Lucide `wallet` (ISC). */
const Cartera = custom(
  <>
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </>,
)

/** Tarjeta: el giro Cajero Automático. Lucide `credit-card` (ISC). */
const Tarjeta = custom(
  <>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <path d="M2 10h20M6 14h2" />
  </>,
)

/** Birrete: la categoría Educación y su giro Colegio. Lucide `graduation-cap` (ISC). */
const Birrete = custom(
  <>
    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0zM22 10v6" />
    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
  </>,
)

/** Carriola: el giro Guardería. Tabler Icons `baby-carriage` (MIT). */
const Carriola = custom(
  <path d="M6 19a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M2 5h2.5l1.632 4.897A6 6 0 0 0 11.825 14H14.5a5.5 5.5 0 0 0 0-11H14v6M6 9h14M9 17l1-3m6 0l1 3" />,
)

/** Figuras: el giro Preescolar. Lucide `shapes` (ISC). */
const Figuras = custom(
  <>
    <path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z" />
    <rect width="7" height="7" x="3" y="14" rx="1" />
    <circle cx="17.5" cy="17.5" r="3.5" />
  </>,
)

/** Un bebé: el giro Maternal. Lucide `baby` (ISC). */
const Bebe = custom(
  <>
    <path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
    <path d="M15 12h.01" />
    <path d="M19.38 6.813A9 9 0 0 1 20.8 10.2a2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" />
    <path d="M9 12h.01" />
  </>,
)

/** Una pieza de rompecabezas: el giro Kínder. Lucide `puzzle` (ISC). */
const Rompecabezas = custom(
  <path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z" />,
)

/** Mochila: el giro Primaria. Phosphor `backpack` (línea de 1,5 px: lleva medio píxel de contorno) (MIT). */
const Mochila = solid(
  <path d="M168 40.58V32a24 24 0 0 0-24-24h-32a24 24 0 0 0-24 24v8.58A56.09 56.09 0 0 0 40 96v120a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V96a56.09 56.09 0 0 0-48-55.42M112 24h32a8 8 0 0 1 8 8v8h-48v-8a8 8 0 0 1 8-8m56 136H88v-8a8 8 0 0 1 8-8h64a8 8 0 0 1 8 8Zm-80 16h48v8a8 8 0 0 0 16 0v-8h16v40H88Zm112 40h-16v-64a24 24 0 0 0-24-24H96a24 24 0 0 0-24 24v64H56V96a40 40 0 0 1 40-40h64a40 40 0 0 1 40 40zM152 88a8 8 0 0 1-8 8h-32a8 8 0 0 1 0-16h32a8 8 0 0 1 8 8" />,
  '0 0 256 256',
  0.5,
)

/** Calculadora: el giro Secundaria. Lucide `calculator` (ISC). */
const Calculadora = custom(
  <>
    <rect width="16" height="20" x="4" y="2" rx="2" />
    <path d="M8 6h8m0 8v4m0-8h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
  </>,
)

/** Libros: el giro Preparatoria. Phosphor `books` (línea de 1,5 px: lleva medio píxel de contorno) (MIT). */
const Libros = solid(
  <path d="m231.65 194.55l-33.19-157.8a16 16 0 0 0-19-12.39l-46.81 10.06a16.08 16.08 0 0 0-12.3 19l33.19 157.8A16 16 0 0 0 169.16 224a16.3 16.3 0 0 0 3.38-.36l46.81-10.06a16.09 16.09 0 0 0 12.3-19.03M136 50.15v-.09l46.8-10l3.33 15.87L139.33 66Zm6.62 31.47l46.82-10.05l3.34 15.9L146 97.53Zm6.64 31.57l46.82-10.06l13.3 63.24l-46.82 10.06ZM216 197.94l-46.8 10l-3.33-15.87l46.8-10.07l3.33 15.85zM104 32H56a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h48a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16M56 48h48v16H56Zm0 32h48v96H56Zm48 128H56v-16h48z" />,
  '0 0 256 256',
  0.5,
)

/** Edificio de universidad: el giro Universidad. Lucide `university` (ISC). */
const Universidad = custom(
  <>
    <path d="M14 21v-3a2 2 0 0 0-4 0v3m8-9h.01M18 16h.01" />
    <path d="M22 7a1 1 0 0 0-1-1h-2a2 2 0 0 1-1.143-.359L13.143 2.36a2 2 0 0 0-2.286-.001L6.143 5.64A2 2 0 0 1 5 6H3a1 1 0 0 0-1 1v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2zM6 12h.01M6 16h.01" />
    <circle cx="12" cy="10" r="2" />
  </>,
)

/** Idiomas: el giro Idiomas. Lucide `languages` (ISC). */
const Idiomas = custom(<path d="m5 8l6 6m-7 0l6-6l2-3M2 5h12M7 2h1m14 20l-5-10l-5 10m2-4h6" />)

/** Cerebro: el giro Refuerzo Académico. Lucide `brain` (ISC). */
const Cerebro = custom(
  <>
    <path d="M12 18V5m3 8a4.17 4.17 0 0 1-3-4a4.17 4.17 0 0 1-3 4m8.707-6.706A3 3 0 1 0 12 5a3 3 0 1 0-5.707 1.294" />
    <path d="M17.996 5.125a4 4 0 0 1 2.526 5.77" />
    <path d="M18 18a4 4 0 0 0 2-7.465" />
    <path d="M19.967 17.482a4 4 0 1 1-7.967.517a4 4 0 1 1-7.967-.517" />
    <path d="M6 18a4 4 0 0 1-2-7.465" />
    <path d="M6.004 5.125a4 4 0 0 0-2.526 5.77" />
  </>,
)

/** Ladrillo de juguete: el giro Ludoteca. Lucide `toy-brick` (ISC). */
const Ladrillo = custom(
  <>
    <rect width="18" height="12" x="3" y="8" rx="1" />
    <path d="M10 8V5c0-.6-.4-1-1-1H6a1 1 0 0 0-1 1v3m14 0V5c0-.6-.4-1-1-1h-3a1 1 0 0 0-1 1v3" />
  </>,
)

/** Camión de reparto: la categoría Envíos y su giro Paquetería. Tabler Icons `truck-delivery` (MIT). */
const CamionDeReparto = custom(
  <>
    <path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
    <path d="M5 17H3v-4M2 5h11v12m-4 0h6m4 0h2v-6h-8m0-5h5l3 5M3 9h4" />
  </>,
)

/** Monitor y teléfono: la categoría Reparación de Equipos. Lucide `monitor-smartphone` (ISC). */
const MonitorCelular = custom(
  <>
    <path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8m-2 4v-3.96v3.15M7 19h5" />
    <rect width="6" height="10" x="16" y="12" rx="2" />
  </>,
)

/** Teléfono con engranaje: el giro Reparación de Celulares. Tabler Icons `device-mobile-cog` (MIT). */
const CelularEngranaje = custom(
  <path d="M12 21H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6.5M11 4h2m-1 13v.01M17.001 19a2 2 0 1 0 4 0a2 2 0 1 0-4 0m2-3.5V17m0 4v1.5m3.031-5.25l-1.299.75m-3.463 2l-1.3.75m0-3.5l1.3.75m3.463 2l1.3.75" />,
)

/** Computadora con engranaje: el giro Reparación de Computadoras. Tabler Icons `device-desktop-cog` (MIT). */
const ComputadoraEngranaje = custom(
  <path d="M12 16H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v7M7 20h5m-3-4v4m8.001-1a2 2 0 1 0 4 0a2 2 0 1 0-4 0m2-3.5V17m0 4v1.5m3.031-5.25l-1.299.75m-3.463 2l-1.3.75m0-3.5l1.3.75m3.463 2l1.3.75" />,
)

/** Máscaras de teatro: la categoría Teatro y Espectáculos y su giro Teatro. Material Design Icons `drama-masks` (Apache 2.0). */
const Mascaras = solid(
  <path d="M8.11 19.45a6.95 6.95 0 0 1-4.4-5.1L2.05 6.54c-.24-1.08.45-2.14 1.53-2.37l9.77-2.07l.03-.01c1.07-.21 2.12.48 2.34 1.54l.35 1.67l4.35.93h.03c1.05.24 1.73 1.3 1.51 2.36l-1.66 7.82a6.993 6.993 0 0 1-8.3 5.38a6.9 6.9 0 0 1-3.89-2.34M20 8.18L10.23 6.1l-1.66 7.82v.03c-.57 2.68 1.16 5.32 3.85 5.89s5.35-1.15 5.92-3.84zm-4 8.32a2.96 2.96 0 0 1-3.17 1.39a2.97 2.97 0 0 1-2.33-2.55zM8.47 5.17L4 6.13l1.66 7.81l.01.03c.15.71.45 1.35.86 1.9c-.1-.77-.08-1.57.09-2.37l.43-2c-.45-.08-.84-.33-1.05-.69c.06-.61.56-1.15 1.25-1.31h.25l.78-3.81c.04-.19.1-.36.19-.52m6.56 7.06c.32-.53 1-.81 1.69-.66c.69.14 1.19.67 1.28 1.29c-.33.52-1 .8-1.7.64c-.69-.13-1.19-.66-1.27-1.27m-4.88-1.04c.32-.53.99-.81 1.68-.66c.67.14 1.2.68 1.28 1.29c-.33.52-1 .81-1.69.68c-.69-.17-1.19-.7-1.27-1.31m1.82-6.76l1.96.42l-.16-.8z" />,
)

/** Muletas: la categoría Fisioterapia (Salud) y su giro Fisioterapia. Tabler Icons `crutches` (MIT). */
const Muletas = custom(
  <path d="M8 5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2m3 16h2m-1 0v-4.092a3 3 0 0 1 .504-1.664l.992-1.488A3 3 0 0 0 14 12.092V7m-2 14v-4.092a3 3 0 0 0-.504-1.664l-.992-1.488A3 3 0 0 1 10 12.092V7m0 4h4" />,
)

/** Tenis: el giro Calzado. Lucide Lab `sneaker` (ISC). */
const Calzado = custom(
  <>
    <path d="M14.1 7.9L12.5 10m4.9.1L16 12M2 16a2 2 0 0 0 2 2h13c2.8 0 5-2.2 5-5a2 2 0 0 0-2-2c-.8 0-1.6-.2-2.2-.7l-6.2-4.2c-.4-.3-.9-.2-1.3.1c0 0-.6.8-1.2 1.1a3.5 3.5 0 0 1-4.2.1C4.4 7 3.7 6.3 3.7 6.3A.92.92 0 0 0 2 7Z" />
    <path d="M2 11c0 1.7 1.3 3 3 3h7" />
  </>,
)

/** Nombre de icono a dibujo. Las claves son las de `src/data/iconos.ts`, y `fragmentos.ts` lleva los mismos nombres. */
export const ICONOS_DE_SERVICIOS: Record<string, IconComponent> = {
  percha: Percha,
  plancha: Plancha,
  lavadora: Lavadora,
  aguja: Aguja,
  cartera: Cartera,
  tarjeta: Tarjeta,
  birrete: Birrete,
  carriola: Carriola,
  figuras: Figuras,
  bebe: Bebe,
  rompecabezas: Rompecabezas,
  mochila: Mochila,
  calculadora: Calculadora,
  calzado: Calzado,
  libros: Libros,
  universidad: Universidad,
  idiomas: Idiomas,
  cerebro: Cerebro,
  ladrillo: Ladrillo,
  'camion-de-reparto': CamionDeReparto,
  'monitor-celular': MonitorCelular,
  'celular-engranaje': CelularEngranaje,
  'computadora-engranaje': ComputadoraEngranaje,
  mascaras: Mascaras,
  muletas: Muletas,
}

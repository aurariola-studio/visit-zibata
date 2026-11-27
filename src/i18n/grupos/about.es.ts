import type { Forma } from '../es.ts'

export const aboutEs = {
  'about.open': 'Acerca de esta guía',
  'about.tutorialLead':
    'Cinco preguntas para moverte por el mapa, buscar, leer una ficha, guardar lo tuyo y sugerir un cambio.',

  'about.aboutLead': 'Una guía para saber qué hay en Zibatá y decidir adónde ir.',
  'about.aboutBody':
    'Reúne en un mapa los lugares de la zona con lo que hace falta para decidir. Qué ofrece cada uno, dónde está, a qué hora abre y cómo llegar.',
  'about.aboutSources':
    'Es una guía independiente, de la comunidad para la comunidad, hecha con información pública y actualizada cuando algo cambia.',
  'about.privacyLead':
    'Esta guía no te pide crear una cuenta ni usa cookies de rastreo, y no comparte tus datos con nadie. Esta página también reúne los términos de uso.',
  /*
   * Desde la v4.8.0 la guía sí cuenta visitas, así que el aviso lo dice. El texto es deliberadamente
   * concreto: una promesa vaga ("respetamos tu privacidad") no se puede comprobar, y esta sí, porque
   * describe exactamente lo que guardan las tablas de la base (ver worker/esquema.sql): contadores por día.
   */
  'about.privacyCounts':
    'Para saber los intereses del usuario, contamos cuántas veces se abre cada página y cada lugar, a qué enlaces se sale, qué filtros se usan, si una búsqueda encontró resultados y desde qué tipo de sitio se llega. No guardamos lo que escribes, tu IP ni ningún identificador, y no los vendemos ni los compartimos. Si tu navegador pide no ser rastreado, solo contamos la visita a la página.',
  'about.privacyBody':
    'Los lugares que abres y el idioma se guardan únicamente en este navegador. Tus favoritos, tus calificaciones y las visitas que marcas se guardan aquí y además se envían para que no se pierdan y para que el número de personas que guardaron cada lugar sea cierto. Viajan atados a un identificador al azar, sin correo, sin nombre y sin nada que diga quién eres. Tus calificaciones no se publican nunca, ni siquiera como promedio; sirven para ordenar la guía y no salen del servidor. Ese identificador vive solo en este navegador, así que si borras los datos del sitio se pierde y empiezas de cero. Nada de esto necesita una cuenta y la guía funciona entera sin ella. El conteo de visitas no identifica a nadie. Si algún día creas una, lo que ya tenías pasará a estar en ella, podrás borrarlo desde tu perfil y el conteo seguirá siendo anónimo. Si escribes en "Contacto", lo que escribas se guarda para poder atenderlo, junto con el contacto que dejes si decides dejarlo; eso no va atado a ningún identificador. El responsable de estos datos es Aurariola.com, en Querétaro, México. No recabamos datos sensibles. Usamos la información solo para que la guía funcione (idioma, favoritos, calificaciones, visitas guardadas y conteo anónimo de visitas) y para responderte si nos escribes. Si quieres saber qué datos tenemos, corregirlos, cancelarlos u oponerte a que los usemos, envíanos un mensaje por "Contacto" indicando tu nombre, qué derecho ejerces y una descripción de los datos; también puedes borrar lo guardado en este navegador desde la configuración del mismo. Publicaremos cualquier cambio a este aviso en esta página con la fecha de actualización.',
  'about.privacyLocation':
    'Tu ubicación se utiliza solo al pulsar el botón para centrar el mapa y no se guarda ni se transmite. El mapa y las tipografías se sirven desde este mismo sitio, y guardar un lugar tampoco llama a nadie de fuera, de modo que usar la guía no genera ni una petición a terceros. Los enlaces a Google Maps, redes sociales o reparto abren sitios externos, cada uno con su propia política.',

  'about.termsTitle': 'Términos de uso',
  'about.termsWhat':
    'Esta guía es un proyecto independiente. No tiene relación comercial con ninguno de los lugares que aparecen. Nadie paga por estar, por salir más arriba ni por aparecer destacado, y no hay publicidad. Que un lugar esté aquí no es una recomendación ni un respaldo, solo que existe en la zona y hay datos suficientes para describirlo.',
  'about.termsData':
    'La información se reúne de fuentes públicas y de lo que corrige cada negocio, y se revisa por temporada. Aun así puede estar desactualizada. Los horarios cambian, un teléfono deja de servir y un local cierra sin avisar. La guía se ofrece tal como está, sin garantía de que cada dato sea exacto hoy. Para algo que importe (el horario antes de salir, un precio, una reserva), confírmalo directo con el lugar.',
  'about.termsFix':
    'Si un dato de tu negocio está mal, o prefieres no aparecer, escribe por "Contacto" y se corrige o se quita en la siguiente actualización. No hace falta explicar por qué. Basta con pedirlo.',
  'about.termsContent':
    'Los textos, el mapa y el código de la guía son de quien la mantiene. El nombre, el logotipo y la marca de cada negocio son de ese negocio, y aquí se usan solo para identificarlo. Los enlaces a Google Maps, redes sociales o reparto llevan a sitios de terceros, y lo que ocurra ahí se rige por sus propias reglas.',
  'about.contributeLead': '¿Falta un lugar, hay un dato incorrecto o quieres escribirnos?',
  'about.contributeBody':
    'Escribe quien sea, vecino, cliente o el propio negocio. Toda corrección suma, sea un horario, un teléfono, las redes o la descripción. También puedes ejercer tus derechos ARCO o hacer cualquier consulta.',
  'about.contributeMeanwhile':
    'Lo que escribas llega directo a quien mantiene la guía, sin pasar por ningún servicio de terceros. No hace falta cuenta ni correo. El contacto es opcional y solo sirve para responderte. La guía se revisa por temporada, y lo que pida corregir un negocio entra en la siguiente actualización.',

  'about.credits': 'Datos y créditos',
  'about.creditsBody':
    'Mapa propio con datos de OpenStreetMap, Overture Maps y ESA WorldCover, dibujado con MapLibre. Suelo y relieve con Copernicus DEM GLO-30 (© DLR e.V. y Airbus, provisto por la Unión Europea y la ESA, vía Mapterhorn) y "Contains modified Copernicus Sentinel data 2026". Alturas de los edificios estimadas con Open Buildings 2.5D (Google Research), no medidas. Iconos de Lucide, Tabler, Hugeicons, Iconoven, Material Design Icons, Material Symbols, Coolicons, Jam Icons, Icon Park, MingCute, Boxicons, Andrés Raxón y Simple Icons, banderas de circle-flags y logotipos de reparto de Wikimedia Commons.',
  'about.version': 'Versión {version}',
} as const

export type GrupoAbout = Forma<typeof aboutEs>

# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado semántico.

## [4.5.0]: 2026-10-05

### Corregido

- **Gitleaks fallaba desde el traslado a la organización.** `gitleaks-action` exige clave de licencia
  cuando el repositorio pertenece a una organización: *"[aurariola-studio] is an organization. License
  key is required."*. Pasa a usarse el **binario** con la versión fijada (8.30.1), que es el mismo
  escáner bajo licencia MIT y no pide clave. El `checkout` del workflow de publicación gana
  `fetch-depth: 0`, porque el escaneo recorre la historia y no solo el árbol de trabajo.

## [4.4.0]: 2026-10-04

### Cambiado

- **El lema deja de ser "Comer y beber" y pasa a "La guía de zibateños para zibateños"**, porque el
  proyecto apunta más allá de la comida. En inglés va "By locals, for locals": el gentilicio no tiene
  equivalente y forzarlo sonaría a traducción. Cambia en el `<h1>`, el título, Open Graph, el
  manifiesto y la imagen social. Y también en los textos que describen la guía: el resumen de zonas,
  los tres pasos del tutorial, "Acerca de esta guía" y la hoja de perfil. Se fue "busca un antojo" y
  se fue "lo que más se te antoja", que acotaban a comida sin nombrarla. El criterio es que ningún
  texto de interfaz prometa un alcance menor que el del proyecto.
- **Sobre el mapa, la marca es solo el símbolo.** Antes la barra superior llevaba nombre y lema, que
  competían con el buscador justo donde más falta hace el ancho. El nombre sigue estando para quien
  escucha, en el `<h1>` oculto, así que no se pierde nada. Las pantallas de carga y de error sí
  conservan el lockup completo: ahí la marca está sola y tiene sitio.
- **La firma de autoría pasa a ser el lockup oficial de aurariola.com**: su símbolo, "un proyecto de"
  y el wordmark, tal como lo define su guía de marca. Antes era un "by aurariola.com" inventado. El
  símbolo se reconstruye desde la guía (anillo de píxeles sobre teja, rejilla de 256 con paso 32) y
  respeta su regla principal: **un solo módulo en oro**, el cursor.
- En la franja del mapa la firma va sin el conector: con el lockup entero, la leyenda de
  independencia pasaba a dos renglones incluso a 1920 px. En "Acerca de esta guía" va completo.

### Nota de accesibilidad

El oro de marca (`#b7791f`) va **tal cual en el símbolo**, que es un dibujo y le basta con 3:1. En el
punto del wordmark, que es texto de 11 px, se usa `--gold-700` (`#8a5a10`): el oro de marca se queda
en 3,3:1 sobre las superficies arena cuando hace falta 4,5:1.

### Pendiente

La guía de marca pide **Kode Mono** para el wordmark y no está empaquetada: hoy cae a la monoespaciada
del sistema. Añadirla cuesta unos 12 KB de fuente para cuatro palabras, así que es una decisión del
propietario, no del código.

## [4.3.0]: 2026-10-04

### Añadido

- **Licencias explícitas, que en un repositorio público faltaban.** Sin archivo `LICENSE` lo
  predeterminado es "todos los derechos reservados": el código estaba a la vista y legalmente nadie
  podía usarlo ni contribuir. Son dos licencias porque son dos cosas: **MIT** para el código y
  **CC BY 4.0** para los datos comerciales y la investigación. Las capas del mapa siguen bajo ODbL
  1.0, que es obligación heredada de OpenStreetMap y manda sobre lo anterior.
- **`SECURITY.md` y `CONTRIBUTING.md` en la raíz**, apuntando a los documentos de `docs/`. GitHub
  busca esos nombres exactos, así que con `docs/SEGURIDAD.md` y `docs/CONTRIBUIR.md` no aparecía el
  botón de reportar una vulnerabilidad.
- **`.nvmrc`**: los workflows fijaban Node 24 pero quien clonara no tenía forma de saberlo.

### Corregido

- **Gitleaks nunca se había ejecutado.** Estaba solo en `ci.yml`, que corre con pull requests, y
  hasta ahora todo fue directo a `main`. Ahora también corre en el workflow de publicación.
- **`ci.yml` probaba la subruta `/zibata-comer-y-beber/`**, nombre anterior al rebranding.

### Cambiado

- **El presupuesto de `initialJs` sube de 120 a 122 KB**, con la razón escrita al lado del número
  como las dos subidas anteriores de `dataJs`: el botón de compartir de la v4.1.0 cuesta 0,7 KB gzip
  medidos con y sin la función, y solo quedaban 0,1 de margen. Queda anotado que si el paquete vuelve
  a crecer, lo siguiente es partir el catálogo de i18n por idioma (unos 5 KB, porque hoy viajan los
  dos y solo se usa uno), no otra subida del límite.
- **`SITE_URL` apunta por omisión a `https://visitzibata.com/`**, el dominio del proyecto.
- **El destino en Cloudflare es un Worker con assets estáticos, no un proyecto de Pages**, con su
  `wrangler.jsonc`. Cloudflare está integrando Pages dentro de Workers y los sitios estáticos nuevos
  se crean así. Para el sitio no cambia nada (los mismos archivos, el mismo `_headers`, que los
  Workers con assets también leen); cambia el comando (`wrangler deploy`) y el permiso que necesita
  el token. `not_found_handling: "404-page"` conserva los 404 reales, que es lo que impide que un
  error de tecleo responda 200 y acabe indexado.

## [4.2.0]: 2026-10-04

### Cambiado

- **La publicación pasa de GitHub Pages a Cloudflare Pages, y se hace desde GitHub Actions, no con la
  integración de Git de Cloudflare.** Esa integración compila por su cuenta y no corre las pruebas:
  publicaría igual con el presupuesto de peso roto, con axe en rojo o con los tests de CSP fallando.
  Las puertas de este repositorio solo sirven si nada se publica sin pasarlas, así que el workflow
  valida, compila, mide y prueba, y solo entonces llama a `wrangler pages deploy`.
- **La página 404 decía "Zibatá · Comer y beber"**, un resto del rebranding de la 4.0.0.

### Añadido

- **`dist/_headers`, generado por el build** desde la misma constante que el `<meta>` de la CSP, para
  que no puedan divergir: cuando las dos existen el navegador aplica la intersección, y tocar una sin
  la otra daría un bloqueo difícil de diagnosticar. Añade lo que un `<meta>` no puede declarar
  (`frame-ancestors`), más `Referrer-Policy`, `X-Content-Type-Options`, `Cross-Origin-Opener-Policy`,
  `Permissions-Policy` y el `Cache-Control` por tipo de archivo.
- **`wrangler` como dependencia de desarrollo fijada en el lockfile**, en vez de descargarla sin fijar
  al publicar: es la misma disciplina con la que las acciones van fijadas por SHA.

## [4.1.0]: 2026-10-04

### Añadido

- **Botón de compartir en la ficha de cada lugar**, con la hoja del sistema donde la hay y el
  portapapeles donde no. Si el navegador no trae ninguna de las dos, el botón no se dibuja: uno que
  no puede hacer nada estorba más de lo que ayuda.
- **La URL que se comparte es la canónica del lugar, no la de la vista.** El hash arrastra la
  categoría activa, así que compartir lo que hay en pantalla daría una URL distinta por cada filtro
  desde el que alguien comparta el mismo local. Que todos los enlaces entrantes converjan en una
  sola URL es lo único que este botón aporta de verdad al SEO. La raíz sale de `SITE_URL` cuando se
  compiló con ella (`__SITE_URL__`), para que compartir desde github.io y desde el dominio propio
  dé el mismo enlace.

### Nota sobre el alcance

El botón **no** hace indexable una ficha, y conviene no darlo por hecho: los rastreadores no indexan
fragmentos, de modo que `#/lugar/tomassa` es para Google la misma URL que la portada, y la vista
previa de un enlace compartido es siempre la de Open Graph de `index.html`, porque los rastreadores
de los chats no ejecutan JavaScript. Eso depende de sacar el enrutado del hash (MARCA.md §6).

### Por qué no está en la tarjeta del índice

Se pidió por tarjeta y se implementó ahí primero, pero medido no cabe. El botón ocupa 36 px de la
fila y, a 375 px de ventana, **19 de 86 tarjetas pasaban a cortarse con puntos suspensivos**: las
líneas de giros cortadas subían de 0 a 12 y los nombres de 2 a 11, deshaciendo el ajuste de la v3.2.0.
Barriendo anchos, la fila solo deja de cortarse a partir de 448 px de tarjeta, y en escritorio la
tarjeta del panel mide entre 306 y 386 px: una consulta de contenedor dejaría el botón visible solo
en tableta vertical. La ficha es la vista individual del lugar y ahí sí hay sitio.

## [4.0.0]: 2026-09-29

### Cambiado

- **La guía se llama Visit Zibatá y tiene marca nueva: una brújula cuya aguja es la letra Z.** El
  símbolo anterior era un volumen isométrico dentro de una baldosa, que decía "plaza" pero no decía
  ni el lugar ni que esto fuera una guía. La pieza nueva se dibuja una sola vez: media Z, de la
  punta al centro, y la otra mitad es esa misma girada 180 grados. Encajan exactas porque el punto
  medio de la diagonal de una Z es su centro. El trazo nace en cero en las dos puntas y engorda
  hacia el centro, así que la pieza entera es a la vez la aguja de una brújula y la letra, y donde
  cambia de color es el pivote. El aro y la rosa repiten el olivo de la mitad de arriba: nada se
  lee como un objeto pegado encima.
- **El contorno de la Z se construye como una letra, no desplazando una línea central a los dos
  lados por igual.** Ese método falla en los codos: por fuera no puede cerrar más apretado que el
  propio grosor, y en una vuelta tan cerrada como la de una Z eso da media luna; por dentro las dos
  orillas se cruzan, el lazo se recorre al revés y el relleno lo cancela, dejando una grieta donde
  debía haber esquina. Ahora cada tramo se desplaza por su cuenta y se juntan en la esquina, con
  inglete por dentro y una vuelta de tensión regulada por fuera.
- **Hay dos cortes del mismo dibujo, como una tipografía tiene su versión de texto.** Por debajo de
  40 px el trazo, el aro y las puntas van más gordos y el hueco entre las dos mitades baja de 12 a
  8: con el corte grande, a 16 px el hueco se come la diagonal y la Z se parte en dos piezas
  sueltas. Aun así, a 16 px la letra es más una insinuación que una letra: es el límite de meter
  una letra dentro de un aro.
- **El símbolo entra por `<img>` desde `public/logo.svg`, no en línea en el paquete.** En línea
  suma cerca de 3 KB gzip y el paquete inicial está en 119,8 de 120 KB de presupuesto.
- **Los cinco PNG de icono salen de `public/logo.svg`** con `npm run images:icons`, que antes solo
  generaba los dos "maskable" y llevaba el símbolo copiado dentro. Sobre el olivo del fondo el
  símbolo va en papel y en lima clara: el lima de la marca queda demasiado cerca del olivo y la
  aguja pierde sus dos mitades.

### Añadido

- **Firma de autoría "by aurariola.com"** en la franja inferior y en "Acerca de esta guía", en
  monoespaciada y con el punto en oro. El oro de esa marca (#b7791f) se queda en 3,3:1 sobre las
  superficies arena y no llega al 4,5:1 que pide un texto de 11 px, así que se usa el mismo oro
  oscurecido hasta 5:1 (`--gold-700`).

### Corregido

- **La franja de la guía ya no sale en la imagen social.** Pasa de `<div>` a `<footer>`, que es lo
  que es, y el generador puede ocultarla: las clases de los módulos CSS llevan un hash distinto en
  cada build y no se pueden seleccionar desde fuera.
- **`npm run images:og` documentaba que servía contra `npm run preview`, y no.** El build inyecta
  una CSP con `style-src 'self'` que bloquea el `addStyleTag` del propio script. Solo corre contra
  `npm run dev`, que es ahora el valor por omisión.

## [3.2.0]: 2026-09-29

### Cambiado

- **El ritmo vertical de la ficha pasa a ser una escala de tres pasos, escrita en el CSS.** Antes
  eran 16 px dentro de la cabecera y 20 px entre secciones: un sistema, pero con los dos pasos tan
  cerca que se leían como un descuido. Ahora son 4 px entre un texto y su pie, 12 px entre las
  piezas de un mismo bloque y 20 px entre los bloques de la ficha. La proporción de 3 a 5 entre el
  paso de dentro y el de fuera es lo que los hace legibles como dos niveles. De paso baja el aire
  alrededor de las estrellas y la cabecera pasa de 213 a 201 px.
- **El dibujo de los elotes lleva la línea central y las dos hojas hacia arriba**, una a cada lado,
  que es lo que se pidió. Se probaron tres separaciones de hoja a 64, 28 y 20 px: con las hojas
  largas la silueta se emborrona al tamaño de la lista.

### Añadido

- **Dos pruebas de regresión** que faltaban: una comprueba que la flecha de desplazamiento aparece
  sobre el mapa y que su centro y su altura coinciden con los de las pastillas; la otra, que el
  ritmo vertical de la ficha sigue siendo uniforme en cada uno de sus niveles. Las dos vigilan
  fallos que se colaron porque nada los miraba.

## [3.1.0]: 2026-09-29

### Arreglado

- **Las flechas para desplazar las pastillas de filtro no aparecían sobre el mapa.** La barra
  superior alinea a la izquierda para que el buscador no se estire, y sin `align-self: stretch` la
  fila de filtros crecía hasta su ancho de contenido (2739 px en escritorio): se salía de la
  pantalla, pero dentro de su propio carril no desbordaba, así que el componente no tenía nada que
  detectar y nunca dibujaba la flecha.
- **Las flechas no quedaban centradas con las pastillas.** El carril llevaba un relleno vertical
  desigual (2 px arriba, 4 px abajo), así que la flecha, centrada sobre el carril, caía 2 px baja
  respecto de las pastillas. El relleno se iguala y la flecha pasa a medir lo mismo que una
  pastilla.
- **El hueco sobre la leyenda de traducción era enorme** (26 px). La descripción y su leyenda eran
  dos hijos del panel, que separa a los suyos con 20 px, y encima sumaban el margen propio. Ahora
  son un solo bloque y el hueco es de 6 px.
- **El dibujo de Elotes y Esquites era un borrón a 20 píxeles.** Iba inclinado 42 grados y con los
  granos punto a punto, que a ese tamaño se apelmazan. Se redibujó de pie, con los granos en
  hileras y una hoja abajo.

### Cambiado

- La leyenda de traducción pasa a "Automatic Translation" ("Traducción automática" en español) y
  baja de 13 a 12 px.
- "Contact and social" pasa a "Contact and socials".

## [3.0.0]: 2026-09-29

### Añadido

- **La guía se lee entera en inglés.** Las 18 categorías y los 58 giros estrenan o corrigen su
  `label.en`, en Title Case y sin calcos: "Entre Panes" deja de ser "Between bread" y pasa a
  "Sandwiches & Wraps", "Antojitos" a "Street Snacks" y "Papas Preparadas" a "Loaded Chips". Antes
  faltaban 31 giros y una categoría, y catorce de los que había mezclaban minúsculas.
- **Las 15 descripciones de plaza en inglés.** Las escribe la guía, así que su inglés es texto
  propio y va sin leyenda.
- **Las descripciones de los locales, traducidas y marcadas como tal.** En inglés se lee la
  traducción con la leyenda "Machine translation" y un botón que devuelve al original en español,
  porque el texto lo escribió el negocio y quien quiera leerlo tal cual debe poder. 90 de los 101
  locales activos estrenan traducción; los otros 11 ya venían en inglés y se muestran sin leyenda.

### Cambiado

- **`description` pasa de texto suelto a `{ es, en }`** en locales y plazas, con el mismo patrón que
  ya usaban las etiquetas. En el CSV son dos columnas, `description` y `descriptionEn`. El buscador
  indexa los dos idiomas.
- **El giro "Café" lleva la taza**, no el filtro de café de especialidad.

### Rendimiento

- **El presupuesto de `dataJs` sube de 30 a 34 KB.** Las etiquetas y las descripciones viajan ahora
  en dos idiomas y el paquete de datos pasa de 28.6 a 32.0 KB. Es el mismo caso que en v1.5.0, y
  queda registrado junto al límite: si el dato vuelve a crecer, antes de subir el número toca partir
  el paquete por idioma, que hoy no se hace porque obligaría a recargar los datos al cambiar de
  idioma en caliente.

### Quitado

- **Cuatro restos sin uso**: el dibujo `pour-over`, que se quedó sin giro al darle la taza a Café;
  el componente `StarScale`, que no renderizaba nadie; la constante `CONTACT_URL`, cuyo comentario
  prometía que la interfaz la mostraba sola y no la leía nadie; y `loadDataset`, un agregador sin
  llamadas. La lista de iconos de la documentación estaba desactualizada y se regenera del propio
  componente.

## [2.0.0]: 2026-09-29

Vuelta grande: se revisaron los 101 locales uno por uno y salieron cambios de fondo en el modelo.

### Quitado

- **El tercer nivel (`tags`).** Era un cajón invisible que solo alimentaba al buscador, y complicaba
  el modelo sin que nadie lo viera. Lo que vivía ahí y merecía existir se convirtió en giro; lo demás
  se fue. Fuera del esquema, del CSV, del índice de búsqueda y de la documentación.
- **El giro "Café de Especialidad"**, fusionado con "Cafetería" en uno solo llamado **Café**, que
  deja de ser el general de su estante: no hay un "esto en general" que abarque café y desayuno a la
  vez, así que se ponen los dos giros, o brunch.

### Añadido

- **Siete giros nuevos**: Cecina (Mexicana), Empanadas (Tacos y Antojitos), Wraps y el general
  Entre Panes (Entre Panes), Papas Fritas y Hot Dogs (Comida Rápida) y Crepas (Postres y Dulces).
- **Seis dibujos nuevos**, probados a 64, 28 y 20 px y comparados con los que ya existían para que
  ninguno se confunda: la cecina en lámina, el cono de papas a la francesa (distinto de la bolsa de
  Papas Preparadas), el hot dog con la mostaza de punta a punta, la empanada con su repulgue, el
  wrap con la costura del enrollado y la crepa doblada en cuarto. La crepa se rehízo dos veces: el
  primer intento se leía como rebanada de pizza.

### Cambiado

- **"Crepas y Waffles" se parte en dos**: Crepas y Waffles, cada uno por su lado.
- **"Alitas y Hamburguesas" pasa a "Comida Rápida"** para recoger también Papas Fritas y Hot Dogs.
  Cuando un estante junta más platos de los que caben en su nombre, se le busca uno que los abarque
  en vez de alargar la lista.
- **Los giros se llaman por la comida, no por el local**: Taquería pasa a **Tacos** y Marisquería a
  **Mariscos**, porque se dice "quiero tacos" y no "quiero taquería". Las cocinas enteras siguen
  igual ("quiero comida italiana") y Panadería, Repostería y Pastelería también, que ahí el nombre
  del oficio es el de lo que se come.
- **"Casera" vuelve a ser "Comida Casera"**: era la única de las seis renombradas donde el arranque
  genérico formaba parte del nombre que la gente usa.
- **35 locales reasignados** siguiendo la revisión uno por uno, sin inventar nada: cada cambio sale
  de un comentario. Los ids de giro no se tocan, así que ningún enlace se rompe.

## [1.27.0]: 2026-09-29

### Cambiado

- **En la ficha, principales y secundarios se pintan igual.** Se acabó el gris y el dibujo tenue del
  secundario: ahí todos son lo que se vende en el local, y el orden ya dice cuál manda. El nivel
  sigue decidiendo quién lleva icono en la lista y quién sale en la ilustración redonda, que es
  donde falta sitio. Con eso desaparece el atributo `data-nivel`, que ya no pintaba nada.

### Añadido

- **Dos pruebas que faltaban del contrato de los dos niveles.** El filtro ya tenía la suya, pero
  nadie comprobaba que un giro secundario se busque igual que un principal ni que arrastre igual en
  el orden personal, que es justo lo que quiere decir "el nivel es peso visual, no visibilidad".

## [1.26.0]: 2026-09-29

### Arreglado

- **La diferencia de estilo entre principales y secundarios no se estaba aplicando.** Los tres
  selectores apuntaban a `li` y el marcado había pasado a `span` al convertir la lista en párrafo:
  el formateador reescribió las comillas del archivo entre un paso y el siguiente, y la sustitución
  dejó de coincidir en silencio. Los dos niveles se veían idénticos en la ficha.
- **Una prueba de foco fallaba de vez en cuando.** El foco del título lo pone un efecto y la prueba
  no lo esperaba, así que a veces le ganaba la carrera. Ahora espera.

### Cambiado

- **La ficha decide sola entre una fila y un renglón por giro**, según el ancho que de verdad tiene
  el bloque, con una consulta de contenedor y no una media query: con el panel estrecho o la
  pantalla partida la ventana es ancha y el hueco no. El corte son 21 rem, el ancho del caso peor
  (tres giros y treinta y seis letras, que ocupan 323 px), así que dentro de una misma vista todos
  los locales se leen igual. A 375 px el bloque mide 267 px y va en columna; a 450 px mide 342 px y
  va en fila con 19 px de holgura.
- **El título de la ficha reparte sus líneas** (`text-wrap: balance`), para que no quede un renglón
  largo arriba y una palabra suelta abajo ("La Marmota Wings and / Beer").

## [1.25.0]: 2026-09-29

### Quitado

- **El sistema de nombres cortos** (`short` en la taxonomía). Tener dos nombres para el mismo giro,
  uno para la lista y otro para la ficha, costaba más de lo que resolvía. Los giros que sobraban de
  largo se renombraron de verdad, uno solo para todas partes.

### Cambiado

- **El giro general de una cocina se llama como su estante**: Cocina Italiana pasa a Italiana,
  Cocina Mexicana a Mexicana, Cocina Asiática a Asiática, Cocina Internacional a Internacional,
  Comida Saludable a Saludable y Comida Casera a Casera. El arranque genérico no decía nada que el
  adjetivo no dijera ya. Los ids no cambian (`cocina-italiana` sigue siendo `cocina-italiana`),
  así que ningún local se toca.
- **La línea de la lista deja de tener un tope fijo de nombres y pasa a tener un presupuesto.**
  Caben los giros que entren en 25 letras, siempre al menos uno, y el resto se cuenta. El tope de
  dos no bastaba sin los nombres cortos: "Jugos y Smoothies · Alto en Proteína" son dos nombres y
  se cortaban igual. De paso, donde caben tres ahora se leen los tres ("Pasta · Italiana · Pizza").
  Medido sobre los 86 locales de las once plazas: cero cortados.
- **La ficha lleva un renglón por giro**, no uno por nivel. Repartirlos dos y uno partía la lista
  por donde no hay junta. El nivel se lee en el estilo de cada renglón: el principal en verde y
  negrita, el secundario en gris y con el dibujo más tenue. Los renglones se apretaron a 17 px, así
  que tres giros ocupan 52 px y la cabecera pasa de 97 a 107 px en un teléfono.

## [1.24.0]: 2026-09-29

### Añadido

- **Nombre corto para los giros de nombre largo** (`short` en la taxonomía, hoy diecinueve: Pub y
  Cervecería -> Cervecería, Cocina Mexicana -> Mexicana, Jugos y Smoothies -> Jugos). Solo se usa
  donde hay una sola línea; la ficha sigue leyendo el nombre completo.

### Cambiado

- **La línea de giros de la lista ya no se corta.** Se nombran dos giros como mucho, con su nombre
  corto, y el resto se cuenta ("Alitas · Hamburguesas +1"); la lista entera con los nombres
  completos queda en el `title`. Se probaron cinco formas contra los ocho locales de línea más larga
  a 375 px: la de antes cortaba ocho de ocho, esta no corta ninguno.
- **Los dibujos de la ilustración redonda comparten una sola placa** en vez de llevar una cada uno.
  Con una por dibujo se tocaban entre sí y rozaban el borde del círculo, y el tercero no cabía: por
  eso Castore, con tres giros principales, solo enseñaba dos. Ahora la placa crece con la cuenta
  (46%, 66% y 82% de ancho) y los tres se ven con aire alrededor.
- **La ficha ya no dice "También" delante de los secundarios.** El renglón de abajo, más tenue y con
  sus iconos, ya dice lo mismo sin gastar una palabra. Cada nivel sigue en su renglón, y los dos
  juntos miden 38 px, así que la cabecera no crece.

## [1.23.1]: 2026-09-29

### Arreglado

- **La ilustración redonda volvía diminutos los dibujos.** Al meter el icono compuesto, el ancho de
  cada placa pasó a medirse contra un contenedor que se encogía al tamaño de su propio contenido, así
  que el porcentaje se medía contra sí mismo. El contenedor ocupa ahora todo el marco y el dibujo
  llena más su placa (64% en vez de 56%).
- **La línea de giros se cortaba a media palabra en la lista.** En un contenedor flex,
  `text-overflow` no alcanza al texto suelto: hacía falta envolverlo. Ahora recorta con puntos
  suspensivos y el texto completo queda en el `title`. No era culpa de los secundarios: de las
  dieciséis líneas que pasan de treinta caracteres, once son de puros principales.
- **En la ficha, cada nivel tiene su renglón.** Antes los tres giros iban en una sola línea que se
  partía por donde caía; ahora los principales van arriba y los secundarios debajo, con su "También"
  y en tono más tenue.

## [1.23.0]: 2026-09-28

### Añadido

- **Dos niveles de giro.** Cada local reparte sus giros entre **principales** (lo que lo define) y
  **secundarios** (lo demás que se vende ahí), con el tope de tres contando entre los dos. El nivel
  es peso visual, no visibilidad: los dos filtran, se buscan y pesan igual en el orden personal, así
  que un secundario sigue llevando al local a su estante. Lo que cambia es dónde se dibuja cada uno:
  en la lista solo los principales llevan icono y los secundarios se leen; la ilustración redonda
  del local sin foto enseña hasta dos dibujos, siempre de los principales; y la ficha es la única
  vista que enseña el dibujo de todos, con el del secundario más tenue.
- **Doce locales estrenan secundario**, y ninguno inventado: son los que ya declaraban esa línea en
  sus propios `tags` (Cosi Fan Tutte hace pizza, Bocuze hace brunch, La Marmota tiene cervecería).

### Cambiado

- La columna `secundarios` se suma al CSV de importación, al esquema (con la regla de tres entre los
  dos niveles y la prohibición de repetir un giro) y a la tubería de `research/decisions.json`.

## [1.22.3]: 2026-09-28

### Arreglado

- **La quesadilla estaba al revés**: al doblar una tortilla redonda el doblez es el lado recto y la
  curva es por donde se abre, así que el queso salía por donde no. Le di la vuelta.
- **El elote se rehace desde cero**, calcado de la referencia: mazorca inclinada con los granos
  dibujados uno por uno, no con rayas, y la hoja grande abajo.
- **La memela pierde el plato**: queda la masa, la salsa como mancha irregular dentro y el queso
  encima.

## [1.22.2]: 2026-09-28

### Arreglado

- **El bolillo del icono de "Entre Panes" vuelve**: se había perdido al rehacer la rebanada, que
  ahora va detrás, más chica y con sus hombros. También se rehacen la mazorca (inclinada y sola, con
  los granos en rombo), la memela (en su plato y vista desde arriba, con el borde irregular de la
  masa) y la quesadilla (tres gotas de queso de largos distintos).

## [1.22.1]: 2026-09-28

### Arreglado

- **Cuatro iconos, dos de ellos contra referencias nuevas**: la rebanada de pan de caja recupera sus
  hombros y su miga, la mazorca se rehace con la hoja separada del cuerpo y su palo, la memela deja
  de ser un círculo plano y pasa a tener canto, y el queso de la quesadilla cuelga en gota, cargado a
  un lado para que no parezca el mango de un paraguas.

## [1.22.0]: 2026-09-28

### Añadido

- **Giro "Ramen"** en Asiática. Castore MX se presenta como hamburguesas, alitas y ramen, las tres con
  la misma jerarquía, así que ahora lleva esos tres giros y sale en dos estantes. Pierde "Desayunos"
  porque el tope siguen siendo tres giros por local.

### Arreglado

- **Nueve iconos**: Italiana pasa a un plato de pasta a la bolonesa (en plato plano, para no
  confundirse con el tazón con tenedor del giro Pasta), las papas a una bolsa sellada, el brunch
  cambia el vaso por una taza de café, el elote se rehace con su contorno de bultos y su hoja, la
  memela queda en una sola pieza con el relleno visible, el queso de la quesadilla se agranda hasta
  verse, la rebanada de pan de caja se ensancha y el cerdo de las carnitas mejora orejas y hocico.

## [1.21.1]: 2026-09-28

### Arreglado

- **Nueve iconos rehechos comparándolos contra la referencia**, no de memoria: poner tu imagen al
  lado de mi versión enseñó lo que faltaba, que siempre era el detalle que los hace reconocibles. La
  arepa recupera su borde ondulado, las memelas van sobre el plato, la quesadilla va ladeada, los
  hot cakes pasan a discos sueltos (unidos parecían una hamburguesa), la birria empareja el tamaño
  del taco y el consomé, y la rebanada de pizza, el pan de caja, el elote y el bote de papas se
  ajustan a tu ejemplo.

## [1.21.0]: 2026-09-28

### Cambiado

- **"Pizza y Pasta" se funde en "Italiana"**, con Cocina Italiana de giro general y Pizza y Pasta
  dentro. Es tu decisión, tomada a sabiendas de que Domino's y El Hornero caen en un estante con
  nombre de cocina: quien quiere italiano busca "Italiana", la ficha del local nunca imprime la
  categoría y El Hornero se sigue leyendo "Parrilla Argentina · Pizza". Queda escrito en DATOS.md.
- **El açaí se separa de la fruta**: "Açaí" y "Bowls de Fruta" son dos giros. All Berries lleva los
  dos, porque su propio texto dice "Açai & fruit bowls".
- **Castore MX Game & Snack** pasa de Botanas a Hamburguesas y Alitas, revisado en campo. El giro
  "Botanas" se queda vacío a propósito, esperando al primero que sí venda botana de bolsa.

### Arreglado

- **Catorce iconos redibujados sobre las referencias que mandaste**: rebanada de pizza con tazón de
  pasta (Italiana), tenedor y fetuccine (Pasta), dos rollos de maki (Sushi), pan de caja con barra
  (Entre Panes), bote con papas asomando, vaso de esquites con elote (Elotes), hot cakes con bebida
  (Brunch), arepa con marcas de comal, dos memelas encimadas, tortilla doblada escurriendo queso
  (Quesadillas), taco con su consomé (Birria), un cerdo (Carnitas), el comal con medios círculos
  (Antojitos) y el tazón de fruta.

## [1.20.0]: 2026-09-28

### Añadido

- **"Italiana" es su propio estante**, con Cocina Italiana de giro general. Tenías razón en que un
  giro no puede abarcar más que la categoría que lo contiene: colgar la cocina italiana de "Pizza y
  Pasta" prometía menos de lo que sirve el local. Así queda como Mexicana y Asiática, y la pizza
  sigue sin arrastrar a Domino's ni a El Hornero a un estante de cocina italiana.
- **"Bebidas"**, con Jugos y Smoothies y Boba dentro. Ninguno de los dos vivía donde se busca: nadie
  filtra "Postres y Dulces" para un té de tapioca ni "Saludable" para un jugo.

### Cambiado

- **Las alitas se van con las hamburguesas**, y el estante pasa a llamarse "Alitas y Hamburguesas".
  Tres de los cinco locales con alitas ya hacían hamburguesas, y ninguno servía las alitas como
  botana de bolsa. "Para Picar" se queda con lo que sí se pica: botanas, papas, elotes y gaspachos.
- **Memelas y Quesadillas se separan de "Antojitos"**, igual que las arepas, porque los dos locales
  lo dicen en su propio texto: "las tradicionales Memelas de la Rana" y "nuestras quesadillas
  fritas". "Antojitos" se queda para el que vende de todo un poco.
- **"Bowls de Açaí" pasa a "Bowls de Fruta"**, que también cubre los de granola y fruta sola, y
  **"Gastrobar" a "Restaurante Bar"**.
- La prueba que prohibía la palabra "alitas" en el nombre de una categoría se sustituye por la que
  comprueba la regla nueva: una cocina entera solo puede ser el giro general de su estante.

### Arreglado

- **Catorce iconos**: jitomate (Italiana), pizza entera (el estante), maraña de fetuccine (Pasta),
  dos rebanadas (Entre Panes), nigiri con la lonja encima, mazorca con los granos en rombo, bolsa de
  frituras, campana de servicio (Brunch), tazón con carne (Birria), pierna (Carnitas), comal
  (Antojitos), memela, quesadilla, arepa partida y las perlas del boba, que se apelmazaban.

## [1.19.0]: 2026-09-28

### Cambiado

- **Cocina Italiana cambia de estante**: pasa de "Internacional" a "Pizza y Pasta". Una cocina con
  nombre propio vive donde vive su plato, como la parrilla argentina, y en Internacional solo queda
  lo que no tiene un plato que lo represente (bistró, fusión). Cosi Fan Tutte ya sale al filtrar
  Pizza y Pasta, que es donde lo busca quien quiere comida italiana.
- **"Botanas" pasa a "Para Picar"** como nombre del estante. El nombre viejo dejaba fuera las
  alitas, que son cinco locales y ninguno las sirve como plato fuerte. El giro "Botanas" se queda
  dentro para lo que sí es botana.
- **"Bowls" pasa a "Bowls de Açaí"**: el envase no es el antojo, y con el nombre anterior cabía
  cualquier tazón, incluido el de ensalada o el de poke.
- **"Antojitos de Masa" pasa a "Antojitos"** y **"Gastrobar" a "Bar con Cocina"**, que es como se
  dice hablando. "Gastrobar" sigue funcionando como sinónimo de búsqueda.

### Arreglado

- **Once iconos redibujados**: pan de caja (Entre Panes), nigiri, huarache (Antojitos), arepa
  partida, consomé (Birria), cazo con pala (Carnitas), hotcakes (Brunch), mazorca, bolsa de
  frituras (Papas), trompo (Kebabs) y moño de pasta. Cada uno se eligió probándolo a 20 px, que es
  el tamaño al que se ven en la guía, y no a tamaño de lienzo.

## [1.18.1]: 2026-09-27

### Cambiado

- **Sello del perfil**: una persona dentro de un pin de ubicación, que era la combinación pedida. El
  pin se lee como "un lugar" sin tener que aprender nada y la persona cabe dentro sin apelmazarse,
  también a 18 px.

### Documentación

- El artefacto de taxonomía se queda solo con el árbol: cada categoría con sus giros, cuántos lugares
  lleva cada uno y tres ejemplos, para revisar la división antes que ninguna otra cosa. La lista
  completa de los 101 lugares queda plegada al final.

## [1.18.0]: 2026-09-27

Decimoctava ronda: la taxonomía nueva entra en la guía. Un local ya no tiene categoría y subcategoría:
tiene giros.

### Cambiado

- **Los locales llevan de uno a tres giros, en orden** (`giros[]`), y nada más. Desaparecen del dato
  `category`, `subcategory` y `alsoIn`: la categoría se deduce de los giros con el catálogo. Los
  101 locales quedaron migrados en una sola pasada, sin ninguno sin giro.
- **Las categorías son estantes, no etiquetas del local**: agrupan giros, viven solo en el catálogo y
  en la barra de filtros, y se nombran por el antojo y nunca por la cocina. Por eso "Italiana" vuelve
  a ser "Pizza y Pasta" (una parrilla que hace pizza no es italiana) y "Cocina Italiana" pasa a ser un
  giro dentro de "Internacional". Quedan 17 categorías y 48 giros.
- **Cada categoría puede tener un giro general** (Cafetería, Cocina Mexicana, Hamburguesas), el cajón
  de "es esto, en general", así que ningún local se queda sin giro y la ficha siempre dice lo mismo.
- **La ficha y la tarjeta enseñan los iconos de todos los giros**, en el mismo orden que los nombres;
  donde solo cabe uno (la ilustración redonda, el escalón del podio) va el del primero.
- **Quince dibujos nuevos** (sope, consomé, cazo, hotcakes, nigiri, pan, bagel, kebab, cupcake, açaí,
  jugo, boba, papas, elote y aceite) y fuera los que ya no usa nadie. Ninguno se repite entre dos
  giros: hay una prueba que lo exige.
- **El podio del perfil marca mejor los escalones** (el alto lo declara cada puesto en vez de salir del
  relleno, que es como el segundo acabó a la altura del tercero) y suelta la plaza: solo lugar y giros.
- **Sello del perfil otra vez desde cero**: una persona de pie sobre el rombo de una plaza, que es la
  forma con la que este producto dibuja Zibatá. Dice las dos cosas que tenía que decir.
- **"Toca para deshacer, solo hoy"**: el punto medio entre el aviso que explicaba el gesto y el que
  explicaba el plazo.
- El importador de CSV y el generador del dataset hablan de giros; la columna `category` más
  `subcategory` pasa a una sola, `giros`, separada por punto y coma.

### Documentación

- [docs/DATOS.md](docs/DATOS.md) explica el modelo nuevo: giros, estantes, giro general, iconos y
  cuándo nace un giro. La propuesta y su revisión siguen en el artefacto de taxonomía.

## [1.17.0]: 2026-09-27

Decimoséptima ronda: el podio se ve como un podio, la hoja del perfil cabe sin desplazarla y el sello
vuelve a empezar, esta vez sin personas.

### Cambiado

- **"Tus tres de siempre" se ve como un podio**: el primero al centro y más alto, cada escalón con su
  puesto en grande y la zona debajo, y arriba el icono del giro en el color que su plaza tiene en el
  mapa. Lo que se lee sigue siendo lugar, giro y zona: el criterio que los ordena no se enseña.
- **La hoja del perfil cabe sin desplazarse** en un teléfono normal y en escritorio: los antojos
  pasan a pastillas, las insignias se aprietan un punto, los tres enlaces del pie caben en una fila y
  la hoja aprovecha hasta el 90 % del alto. En pantallas de menos de 740 px de alto suelta el
  subtítulo y los iconos del podio para seguir cabiendo.
- **"Vas por X lugares" pasa a "Has visitado X lugares de Zibatá, en X de sus X zonas."**
- **Sello del perfil, otra vez desde cero**: ahora es una libreta, que es lo que hay detrás del botón
  (visitas, favoritos y notas), y no una silueta de persona.
- **La fecha de la última visita se lee completa**: "Última visita: 25/Sept/2026", con el mes
  abreviado en el idioma activo y sin punto.
- **"Toca para deshacer" pasa a "Solo hoy puedes deshacerla"**, que dice lo que antes no se decía: el
  plazo.

### Documentación

- La propuesta de taxonomía se explica en cuatro frases y una tabla de ejemplos, y responde a las dos
  preguntas de esta ronda: qué pasa con un local que hace dos cosas igual de importantes sin un tag
  que las englobe (lleva los dos tags y sale en las dos categorías; el principal solo decide el
  icono) y cómo quedan los filtros (igual que hoy: un local entra en una categoría si cualquiera de
  sus tags pertenece a ella).

## [1.16.0]: 2026-09-26

Decimosexta ronda: el perfil se vuelve una vista, el sello se dibuja otra vez desde cero y el
contador de visitas se mete dentro de su botón.

### Cambiado

- **Tu Zibatá es para mirar, no para tocar**: las insignias de zona dejan de ser botones (para ir a
  una zona está el mapa), queda una sola frase arriba, "Vas por 4 lugares de Zibatá, en 1 de sus 11
  zonas", y se va el pie de "Te faltan 11 zonas por estrenar".
- **"Tu podio" pasa a ser "Tus tres de siempre"**: sin números, sin medallas y sin enseñar la cuenta
  que los ordena. De cada lugar se ve lo que importa, nombre, giro y plaza, con el icono de su giro
  en el color que su plaza tiene en el mapa. El orden sigue siendo el mismo por dentro.
- **Lo que más se te antoja ya no cuenta las fichas abiertas**: solo visitas, notas y corazones.
  Abrir una ficha es curiosidad, no gusto.
- **Sello del perfil dibujado de nuevo**: una persona con una hoja de olivo, con trazo de 1,5 en vez
  de 1,9, que a 31 px pesaba más que el resto de la barra.
- **La cuenta de visitas va dentro del botón**, con la misma forma que la cifra de las pastillas de
  categoría, así que se lee como parte de la misma acción. Sin visitas, el aviso dice "Registra tu
  primera visita".
- **Formulario**: "Opcional" a secas en el correo, "Tu mensaje" en vez de "Qué hay que cambiar" (el
  formulario acepta cualquier comentario, no solo correcciones) y el rótulo de "¿Quién escribe?" ya
  guarda la misma distancia con sus pastillas que las demás etiquetas con su campo.

### Corregido

- **La separación entre "¿Quién escribe?" y sus pastillas era cero**, aunque el CSS declarara 8 px:
  una `legend` no es un elemento flexible, así que el `gap` del contenedor nunca la separaba de
  nada. Ahora lo pone su propio margen y mide lo mismo que en los otros tres campos, 6 px medidos.
- **El resumen de visitas usaba el plural del número equivocado**: con una visita a un lugar decía
  "Llevas 1 visita a 1 lugar" pero con tres visitas a un lugar decía "Llevas 3 visita a 1 lugar". La
  frase nueva depende de un solo número.

### Documentación

- Propuesta de taxonomía v3 en el artefacto de revisión: fuera los seis tipos de lugar, un solo
  concepto en el dato del local (los giros, de uno a tres) y un giro general por categoría para el
  local que es la categoría entera. Con eso, crecer (comida china, frituras, otro tipo de local) es
  añadir filas al catálogo sin migrar ningún local.

## [1.15.0]: 2026-09-26

Decimoquinta ronda: el perfil cabe en una pantalla, la ficha respira con un solo ritmo y el registro
de visitas ocupa una sola línea.

### Cambiado

- **El perfil, más corto y mejor jerarquizado**: las zonas pasan a insignias pequeñas con el nombre
  corto ("Plaza Luna" se lee "Luna"), el resumen de visitas deja de fingir que es un titular y vuelve
  a ser texto, y los antojos siguen en tres.
- **El podio se decide por lo que dice la persona**, en cascada: estrellas, visitas registradas,
  corazón, fichas abiertas, visita más reciente, frecuencia a esa plaza y, si todo empata, orden
  alfabético. Pasa a llamarse "Tu podio" porque ya no solo mira favoritos, y cada puesto enseña por
  qué está ahí. Los tres metales salen de la propia paleta (olivo, lima y arena).
- **El sello del perfil dibuja mejor a su habitante**: la persona manda sobre el techo y el dibujo
  llena el círculo del botón igual que dentro de la hoja.
- **Registrar una visita ocupa una sola línea**: botón, la cuenta en su propia insignia (también
  cuando es cero) y, a la derecha, "Primera visita", "Última: 25 sept" o "Toca para deshacer".
- **Un solo ritmo en la ficha de lugar**: --space-5 entre bloques y --space-4 entre las filas de la
  cabecera, sin márgenes sueltos en las piezas. La fila de estrellas ajusta su alto al dibujo para no
  arrastrar aire.
- **Formulario**: "¿Quién escribe?" en vez de "Escribes como", "Negocio" en vez de "El negocio", las
  pastillas se despegan de su rótulo y "Opcional" deja de tocar la etiqueta.

### Documentación

- Los casos difíciles de la taxonomía (Mr. Miches, El Hornero, La Barra Verde, Rometta, Domino's,
  Tacos Carly, birria, carnitas, Masaru, Romani, Boba Station, Castore y los dos que solo decían qué
  tipo de lugar son) quedan explicados y revisables en el artefacto de taxonomía, junto con la regla
  que sale de ellos: el giro principal es el más específico que aplique.

## [1.14.0]: 2026-09-26

Decimocuarta ronda: el perfil deja de recomendar y se vuelve un mapa de lo que ya hiciste, el control
de visitas se despeja y el formulario acepta a quien sea.

### Cambiado

- **El perfil es una foto del presente**: fuera "Algo nuevo para ti". "Tu paso por Zibatá" pasa de
  párrafo a pastillas de zona con el color que cada plaza tiene en el mapa, llenas las estrenadas y de
  contorno las que faltan, y tocar una la abre en el mapa. "Tus favoritos" se ve como un podio de tres,
  ordenado por las veces que has ido, con el resto resumido en una línea.
- **El control de visitas deja de verse amontonado**: el botón y la cuenta van en una sola fila, la
  cuenta con peso propio y sin partirse en dos líneas, el aviso debajo en una línea corta, y el bloque
  se despega de la dirección. "Visita de hoy registrada" se acorta a "Visita registrada".
- **Copia de las notas**: "Calificar con x estrellas" al elegir y "Calificado con x estrellas" una vez
  puesta.
- **El formulario de sugerencias cabe sin desplazarse y lo abre cualquiera**: primero se pregunta si
  escribes como vecino, como el negocio o como otro, los campos cortos comparten fila y el aviso dice
  a dónde va el mensaje: "Al enviar, tu mensaje se envía por Web3Forms y se recibe por correo. La guía
  no guarda ninguna información."
- **El cuarto paso del tutorial ya enseña una estrella**, no un tenedor, y el dibujo de cada paso va
  dentro de su propio recuadro, con la tarjeta más compacta.
- **El sello del perfil dibuja al habitante más grande** (1,65 rem): dentro de la hoja se veía bien y
  en la barra se veía pequeño.

### Documentación

- Propuesta de taxonomía de la ronda 14 (dos ejes, siete reglas, 16 categorías, 31 giros, seis tipos
  de lugar y 15 iconos nuevos), en un artefacto de revisión aparte. Los datos de `data/commercial` no
  cambian todavía: primero se revisa la estructura.

## [1.13.0]: 2026-09-26

Decimotercera ronda: vuelven las estrellas, esta vez con medias de verdad; el perfil se queda con lo
que sirve, y el canal de sugerencias ya está abierto.

### Añadido

- **Formulario de sugerencias en marcha**: con la clave de Web3Forms puesta en `.env.local`
  (`.env.example` documenta el formato), "Sugiere un cambio" muestra el formulario y entrega por
  correo. La dirección sigue sin aparecer en el código.
- **Icono de habitante** para el sello del perfil: una persona bajo el techo de su casa, en vez de la
  silueta genérica de usuario.
- **"Algo nuevo para ti"** en el perfil: un lugar que todavía no visitas, elegido con el mismo orden
  personal que ordena las listas.

### Cambiado

- **Las notas vuelven a ser estrellas**, con medias: la mitad izquierda pone el medio punto y la
  derecha el entero, y al pasar por encima la escala se llena hasta donde caería la nota y el texto
  dice cuál es. Las notas guardadas no cambian de valor.
- **Registrar una visita se explica solo**: el botón dice "Registrar visita", y al lado va la cuenta
  con la fecha de la última. Registrada la de hoy, el mismo botón la deshace y lo dice.
- **El perfil se queda con cuatro bloques** (tu paso por Zibatá, tus favoritos, lo que más se te
  antoja y algo nuevo), en filas de una línea: se acabaron las tarjetas grandes y los desplegables.
- **La atribución del mapa se alinea con la franja de la guía**: las dos piezas del pie arrancan en el
  mismo borde.
- Texto del cuarto paso del tutorial, más claro y sin jerga.
- **Fuera las comillas angulares de todo el proyecto** (interfaz, código, documentación y datos),
  junto al guion largo. La convención queda escrita en [AGENTS.md](AGENTS.md).
- El tutorial viaja en su propio trozo de JS: solo se descarga en la primera visita de la sesión.

### Eliminado

- **BeeWaffle** sale de la guía: cerró (verificado en campo el 2026-09-26). Quedan 101 locales.
  Trecielos ya estaba fuera desde el 2026-09-20.

## [1.12.0]: 2026-09-26

Duodécima ronda: la guía aprende a contar visitas, las notas pasan a tenedores con medios, y "Sugiere
un cambio" tiene por fin un formulario.

### Añadido

- **Visitas**: en cada ficha, "Ya vine" marca el día que fuiste y lleva la cuenta. El mismo día se
  puede deshacer, al siguiente ya no, y cada visita suma. Pesa en el orden personal más que abrir una
  ficha, que no es lo mismo que haber ido.
- **Formulario de "Sugiere un cambio"** con Web3Forms: campos propios, diseño de la guía y envío solo
  al pulsar. El correo de destino vive en Web3Forms, nunca en el código. Sin clave configurada, la
  página explica que el canal todavía no está abierto y no dibuja el formulario.
- **Cuarto paso del tutorial**: qué se puede hacer en una ficha (marcar visita, guardar y calificar).

### Cambiado

- **Las calificaciones son tenedores, y admiten medios**: la unidad de toda la vida en una guía de
  comer, de 0,5 en 0,5. La mitad izquierda de cada tenedor es el medio y la derecha el entero. Las
  notas enteras que ya existían siguen valiendo.
- **"Tu Zibatá" se cuenta con visitas**, no con fichas abiertas: por dónde has pasado, qué zonas te
  faltan por estrenar, tus favoritos y tus notas (con sus lugares solo al desplegarlas). Los antojos
  solo aparecen cuando hay marcas de verdad detrás.
- **La atribución plegada deja de descolgarse**: MapLibre le daba 4 px menos de alto que a su propio
  botón y abría un hueco bajo la franja de la guía.
- La hoja de "Tu Zibatá" y el formulario viajan en su propio trozo de JS, así que el arranque no
  engorda por algo que casi nunca se abre.

### Eliminado

- **Sushi Itto** sale de la guía: cerró (verificado en campo el 2026-09-25). Quedan 102 locales.

## [1.11.0]: 2026-09-25

Undécima ronda: la guía se recategoriza entera con la descripción de cada local, entra DiDi Food y "Tu
Zibatá" pasa a contar cómo te ha ido en Zibatá.

### Añadido

- **Enlaces de reparto de verdad**: 39 locales con Rappi, 36 con Uber Eats y 3 con DiDi Food, una
  plataforma nueva con su icono de aplicación (`public/brands/didi-food.svg`) y su campo `didiFood` en
  el esquema. Una ficha puede mostrar hasta ocho enlaces.
- **Giros nuevos** salidos del análisis: "Desayunos" (separado de "Brunch"), "Bar", "Papas Preparadas"
  y "Comida Rápida".
- **"Tu Zibatá" responde a una pregunta**: cuánto llevas abierto de la guía y en cuántas zonas, tus
  favoritos y tus calificaciones con su promedio, y qué giro se te antoja más. Cada lugar abre su ficha
  desde ahí.

### Cambiado

- **Recategorización completa de los 103 locales** con la descripción en lenguaje natural de cada uno
  ([research/taxonomy-review.md](research/taxonomy-review.md)). Los bares se ordenan por lo que son y no
  por el trago que sirven, el desayuno deja de confundirse con el brunch y "Snacks" deja de ser un
  cajón. 49 locales tienen más de un giro, con un tope de tres.
- **La atribución de OpenStreetMap arranca plegada**: a la vista queda la ⓘ y el texto aparece al
  pulsarla, como en cualquier mapa.
- **Textos de "Acerca" y "Sugiere un cambio"**: la guía se presenta como "de la comunidad para la
  comunidad", hecha con información pública.

### Eliminado

- Los giros "Coctelería", "Micheladas" y el "Snacks" genérico, que describían el tipo de bar o no
  describían nada.

## [1.10.0]: 2026-09-25

Décima ronda: los iconos de reparto tal como se ven en el teléfono, "plaza" deja de ser la palabra para
todo y los textos de la guía hablan de para qué sirve, no de cómo está hecha.

### Añadido

- **Iconos de aplicación de Rappi y Uber Eats** (`public/brands`), compuestos con los vectores de
  dominio público de Wikimedia Commons sobre el color de cada aplicación. Los enlaces de reparto son
  ahora esa ficha de color y el resto de contactos mantiene su círculo.
- `tIn()` en `src/i18n`: traduce a un idioma concreto sin cambiar el de la interfaz.

### Cambiado

- **"Zona" en lugar de "plaza"** en toda la interfaz. La Universidad Anáhuac o el campo de golf no son
  plazas, y la palabra tenía que servir para lo que venga. Los datos y el código siguen usando `plaza`
  como identificador.
- **La etiqueta del botón de idioma se escribe en el idioma de destino** ("View the guide in English"),
  en vez de mezclar los dos en una misma frase.
- **La franja de la guía deja libre la atribución**: sube 10 px por encima del control de
  OpenStreetMap y se ajusta a su contenido, así que en pantalla normal la leyenda va en una sola fila.
- **El círculo de "Tu Zibatá" mide lo mismo que la barra de búsqueda**, con el alto calculado una sola
  vez para las dos piezas.
- **"Tu Zibatá" habla de la experiencia**: qué has guardado y calificado y cómo ordena eso la guía. Que
  todo viva en este navegador pasa a la línea final, y las cifras quedan centradas en su tarjeta.
- **Textos de "Acerca" y "Privacidad" reescritos**: la esencia de la guía por delante del estado actual
  del proyecto, registro más medido en privacidad y sin dos puntos ni puntos y coma.
- **Descripciones de las zonas corregidas** con la revisión en campo del mantenedor, y "Plaza Loop"
  pasa a llamarse **Plaza Loop Urban**.

### Eliminado

- **Centro Médico Comercial Zibatá** sale de las listas y del mapa hasta tener datos suficientes. Con
  él desaparece su volumen generado en `public/map/plaza-buildings.geojson`.
- Las marcas de trazo de Arcticons, que dejan de usarse.

## [1.9.0]: 2026-09-24

Novena ronda: marcas de verdad en los enlaces, una escala tipográfica documentada y "Tu Zibatá" con
forma de sección de usuario.

### Añadido

- **Marcas reales de Rappi y Uber Eats** en los enlaces de reparto (Arcticons, CC BY-SA 4.0), en el
  mismo trazo que el resto de iconos. Sustituyen a la bicicleta y la bolsa genéricas.
- **Banderas de verdad** en el selector de idioma: SVG de circle-flags (MIT) servidos como archivo
  estático, en vez de dibujos propios.
- Escala tipográfica documentada en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md): qué tamaño se usa en
  cada sitio, con qué familia y con qué peso.

### Cambiado

- **Los títulos bajan un peldaño**: los de panel y hoja de 40 a 30 px; el nombre de la ficha sube de 22
  a 24 px. Toda la escala vive en `tokens.css` y ningún componente fija tamaños sueltos.
- **El selector de idioma muestra el idioma que estás viendo**, no al que vas, y mide lo mismo en los
  dos: la etiqueta accesible sigue diciendo a dónde lleva pulsarlo.
- **"Tu Zibatá" sale de la tarjeta de búsqueda**: ahora es un círculo suelto en la esquina superior
  derecha, con silueta de persona en vez de la hoja, y la hoja se presenta como una sección de usuario
  (avatar, "Invitado", "sin cuenta · solo en este dispositivo") lista para el día que haya cuentas.
- **Textos de la guía reescritos** en capas (titular, cuerpo y detalle), como se recomienda para avisos
  de privacidad: qué es la guía y quién la mantiene, qué se guarda en tu navegador y qué no sale de él,
  y cómo proponer un cambio.
- "Corregir un dato" pasa a llamarse **"Sugiere un cambio"** (ruta `#/info/sugerir`).
- La franja de la guía va pegada a la atribución, con menos aire, para que las dos se lean como un pie.

### Quitado

- La página "Apoyar la guía": se retoma después del MVP, con link de pago de Mercado Pago
  ([docs/ESCALABILIDAD.md](docs/ESCALABILIDAD.md)).

## [1.8.0]: 2026-09-24

Octava ronda: tu rincón en la guía, la ficha mejor repartida y el guion largo fuera del proyecto.

### Añadido

- **Tu Zibatá**: el sello del final de la barra superior reúne lo que has marcado en este dispositivo
  (favoritos, calificaciones y fichas vistas), dice que no sale de ahí y lleva a las páginas de la guía.
  Se llena cuando ya hay marcas y muestra cuántos favoritos llevas. Es el sitio reservado para la cuenta
  el día que exista.
- **Apoyar la guía** (`#/info/apoyar`): quién la mantiene, qué cuesta y cómo ayudar mientras no haya
  forma de invitar un café.
- Enlaces de reparto reales: Uber Eats en Tortas Fifthy Fifthy y Rappi en Tacos la Chusma.
- Banderas SVG (México y Estados Unidos) en el botón de idioma.

### Cambiado

- **Los giros van debajo del nombre**, no encima: son el detalle del lugar.
- **Giro principal revisado**: D'Lu, OMA Bakery, Wake Cup y Enoff son cafeterías con panadería como
  segundo giro; Punta Cacao es brunch con pastelería. En "Panadería y Repostería" quedan como principal
  las cuatro que solo hacen pan o pastel.
- La descripción sigue justificada pero **ya no parte palabras con guion**.
- Los enlaces de contacto van **siempre alineados a la izquierda**, con el tamaño justo para que los
  siete posibles cubran el ancho de la tarjeta en una fila.
- Títulos de ficha un escalón más pequeños: con Fraunces casi ningún nombre pasa de dos líneas.
- La franja de la guía ocupa menos y las hojas se centran también en móvil.
- Leyenda más corta: "Guía independiente de establecimientos y servicios de la zona".
- El icono de café de especialidad tiene el cono más estrecho y la taza más grande.
- **Fuera el guion largo de todo el proyecto** (interfaz, comentarios y documentación), salvo la
  expresión regular que lee los horarios que escriben los negocios y la transcripción archivada de NVDA.

### Corregido

- **El buscador ya no pierde el foco** al escribir la primera letra con una ficha abierta: el panel que
  se monta detrás ya no le quita el foco a quien está escribiendo.
- Erratas en ocho fichas: "ingrediented organicos", "Panaderia", "Taqueria", "pero si los mejores",
  "especializado cecina", "RESTAURANT -BAR" y dos signos de admiración de apertura que faltaban.

### Quitado

- El botón de información de la barra en móvil: ahora vive dentro de "Tu Zibatá", que deja la barra con
  tres controles y el buscador completo.

## [1.7.0]: 2026-09-23

Séptima ronda: la ficha aprovecha el ancho, la información de la guía sale de su escondite con ruta
propia y los títulos estrenan tipografía.

### Añadido

- **Tres rutas de información**: `#/info/acerca`, `#/info/privacidad` y `#/info/corregir`. Cada una es su
  propia página, se puede enlazar y compartir, y lleva a las otras dos. En escritorio se llega desde la
  franja inferior del mapa; en móvil, desde el botón de información de la barra superior.
- **Categoría "Panadería y Repostería"** con los giros panadería, pastelería y repostería. Las panaderías
  que además son cafetería conservan ese segundo giro y siguen en "Desayunos y Café".
- **Myköna Frozen Yogurt** (Plaza Condesa) con su web, redes, teléfono, horario y ubicación exacta; ocupa
  el local de La Michoacana de Mi Corazón, que pasa a `removed` con su historial.
- El esquema de enlaces admite **Rappi y Uber Eats**; sin enlace del negocio no se dibuja botón.
- Iconos propios nuevos: **molcajete** (cocina mexicana), **galleta** (repostería), y baguette y cono de
  filtrado redibujados.
- Ubicación exacta de Tortas Fifthy Fifthy y descripción para Tim Hortons, Starbucks (Centro Zibatá) y
  Grünen Lush.

### Cambiado

- **Fraunces 600 es la tipografía de los títulos** (autoalojada, solo ese peso). Los rótulos del mapa
  siguen en Instrument Serif.
- **La ficha aprovecha el ancho**: descripción justificada con partición de palabras, "Cómo llegar" a todo
  el ancho y los enlaces de contacto repartidos a lo largo de la fila (hasta ocho en una sola línea).
- Los giros pueden ocupar **dos líneas** antes de recortarse.
- **El número de resultados aparece siempre** que algo acote la lista, también al elegir solo una plaza.
- El botón que abre la lista se llama **"Explora Zibatá"**, para no competir con el filtro "Todas las
  plazas".
- El **selector de idioma** lleva icono SVG (nunca un emoji de bandera) y en pantallas estrechas se queda
  solo con el símbolo.
- El **buscador** usa un aviso corto en móvil y reserva el hueco del botón de borrar únicamente cuando hay
  texto: el texto ya no se corta.
- Mismo aire arriba y abajo del separador de "En construcción".
- La leyenda de independencia se acorta: "Guía independiente de los establecimientos y servicios de la
  zona: no los representa ni está afiliada a ellos".

### Quitado

- El pie de información del panel de plazas: ahora vive a la vista desde el primer segundo.
- La hoja "Acerca de esta guía" con todo amontonado: son tres páginas independientes.

## [1.6.0]: 2026-09-23

Sexta ronda: la ficha se lee de un vistazo, la búsqueda mira en todo Zibatá y los extras salen de su
escondite.

### Añadido

- **Cambio de idioma en la barra superior** (`LocaleSwitch`): un botón que nombra el idioma al que lleva,
  visible en cualquier vista. Antes había que abrir una hoja para encontrarlo.
- **Pie de la guía** en el panel: la leyenda de guía independiente y tres enlaces ·corregir un dato,
  privacidad y "Acerca de esta guía"· que abren la hoja por su sección.
- Aviso visible de independencia: la guía no representa a los establecimientos ni está afiliada a ellos.
- `displayName()` en el pipeline del mapa: los nombres que OSM guarda en mayúsculas se rotulan con
  capital inicial ("PARQUE NANDÚ" → "Parque Nandú").
- Guardia de mantenimiento para los negocios cerrados (`scripts/research/closed-records.test.ts`): ninguno
  se publica y ninguno se queda sin motivo, fecha ni fuente.

### Cambiado

- **Las descripciones se publican como las escribió el negocio**: con sus emojis y respetando sus saltos
  de línea (máximo tres). Antes todo se unía en una línea corrida y sin emojis.
- **Los giros van en una sola línea** en la ficha: las subcategorías reales, separadas por " · ", sin la
  fila aparte de "También". La categoría la sigue diciendo el icono.
- **La búsqueda mira en todo Zibatá** aunque haya una plaza abierta; la plaza vuelve a acotar en cuanto
  se borra la búsqueda.
- **Contacto y redes: solo el icono**, en un círculo de 44 px con su nombre accesible. Caben todos en una
  fila y queda sitio para los enlaces que falten.
- El botón "Cómo llegar" es más pequeño y no ocupa el ancho del panel; el nombre del lugar se queda en su
  etiqueta accesible, que es donde hacía falta.
- El estado del horario ya no repite la hora ("Abierto", no "Abierto · Cierra a las 21:00"): la tabla que
  va debajo ya la dice.
- El selector de plaza se llama "Filtrar por plaza", para no competir con el botón "Ver plazas" que abre
  la lista.

### Quitado

- El texto "Confirmadas y en obra: todavía sin locales abiertos" y la nota del pie anterior.
- El selector de idioma dentro de la hoja "Acerca de" (ahora vive en la barra superior).

## [1.5.0]: 2026-09-22

Quinta ronda: los 103 locales revisados por el propietario, árboles que parecen árboles y la guía en
dos idiomas.

### Añadido

- **Contenido verificado local por local**: 100 descripciones escritas por los propios negocios, 92
  horarios, 88 ubicaciones exactas y 78 teléfonos. El pipeline unifica el formato (emojis fuera,
  teléfonos en E.164, horarios leídos del texto libre) y reporta lo que no puede leer sin adivinar.
- **Dos giros por local**: El Hornero aparece en Parrilla y en Pizzería; Escarola, en Saludable y en
  Sándwiches. La ficha lo dice ("También: …") y los filtros y la búsqueda lo respetan.
- **Categoría "Internacional y Casera"** y giro "Baguettes"; icono de cafetera de filtro para el café de
  especialidad (el grano parecía un frijol).
- **Acerca de esta guía**: hoja con selector de **español/inglés**, privacidad, cómo corregir un dato,
  lo que viene y los créditos de los datos. La interfaz está traducida entera al inglés.
- El orden personal da **segundas oportunidades** (lo que no abres desde hace 60 días vuelve a asomar),
  acepta **señales de la comunidad** para cuando haya cuentas y ordena también **las pastillas de
  categoría** según lo que sueles elegir.
- Evaluaciones pedidas: [docs/MARCA.md](docs/MARCA.md) (propuesta "Visit Zibatá") y
  [docs/ESCALABILIDAD.md](docs/ESCALABILIDAD.md) (crecer más allá de comer y beber).

### Cambiado

- **Árboles**: tronco y copa en dos pisos (antes eran prismas), verdes más apagados y traslúcidos, y
  también en parques y camellones, no solo donde la imagen satelital ve copa. Ninguno invade ya una
  calle ni se monta en un edificio: el despeje descuenta el radio de la copa y depende de la clase de
  vía.
- **Ficha del lugar**: el logo va redondo junto al nombre, como en las redes, y sin galería; cabe sin
  desplazarse. Las miniaturas de la lista también son redondas.
- En público se muestran los **corazones** de un lugar, nunca la media de estrellas: esa media ordena tu
  lista, pero no señala a un negocio pequeño.
- Se retiró el **número de local**: cada plaza numera a su manera y confundía más de lo que ayudaba.
- Presupuesto de peso: teselas 1 900 → 2 100 KB (el arbolado) y datos 20 → 30 KB (el contenido
  verificado), con un guardia nuevo para la tesela más pesada, que es lo que afecta al render.

### Corregido

- "Todo" contaba giros en vez de lugares cuando un local tenía dos.
- La hoja "Acerca de" se montaba dentro del panel: ahora cubre la pantalla completa.
- Instagram de Masaru retirado (ya no existe) y nombre corregido: Chilakiles → **Los Chikaliles**.

## [1.4.0]: 2026-09-21

Cuarta ronda de ajustes del propietario: árboles reales, orden personal y taxonomía por antojo.

### Añadido

- **Árboles 3D** solo donde hay arbolado real según ESA WorldCover (vía Overture): ~5 200 copas en las
  cañadas, el corredor central y el golf. OSM no tiene árboles mapeados en Zibatá.
- **Orden personal** de las listas: favoritos, calificaciones y fichas abiertas (solo en este
  dispositivo) suben lo que te gusta y lo parecido; una de cada cuatro posiciones es para algo que aún no
  has abierto. Sin historial, el orden curado. Preparado para una fuente con cuentas
  (`setPreferenceSource`).
- **Formulario de verificación** para que el propietario confirme ubicación, giro, descripción y redes
  local por local, y `npm run data:apply-review` para aplicarlo.
- Categoría **Snacks**; iconos propios para cada giro (tortilla, torta, waffle, bagel, lúpulo, cacao…).

### Cambiado

- **Taxonomía por antojo**: la categoría responde a "¿qué se me antoja?" y la subcategoría al giro de
  cada local, revisado uno por uno (`research/taxonomy-review.md`). "Bar y Bistró" pasa a **Bar y
  Botana**; Bocuze a Café Bistró; Kazu's Kitchen a Cocina Japonesa; La Gaspachería y Al Grano a Snacks.
- Instagram de Burger & Fries Forever: @burgernfriesmx.

### Corregido

- **Plaza Luna sin edificio**: el mapa no se había regenerado tras darla de alta. Ahora lleva volumen y
  una prueba impide que vuelva a pasar con otra plaza.
- **Xënica cruzaba la calle**: su huella se centraba en el punto del enlace de Maps, que cae sobre la vía.
  `map:suggest-plaza` coloca ahora el rectángulo del lado libre y `map:build` avisa si una plaza cruza una
  calle.

## [1.3.0]: 2026-09-20

Tercera ronda de ajustes del propietario: silueta corregida, taxonomía más fiel y plazas nuevas.

### Añadido

- **Plaza Luna** con Baguettia y Smoothie Lab; sucursales de **Luka, Sinforosa y Starbucks** en el campus
  Anáhuac (registros aparte, uno por sucursal). 103 locales en 11 plazas activas.
- **Xënica** y **Centro Médico Comercial Zibatá** como plazas "Próximamente", ubicadas con los enlaces del
  propietario.
- Enlaces de Maps verificados para MOL Pitahaya, Xentric Zibatá y Plaza Luna; la ficha de un local lleva a
  su propia puerta solo si su ubicación está verificada (hoy, Smoothie Lab) y si no, a la plaza.
- Iconos propios por subcategoría: sushi, alitas, bebidas, bowls, panadería, brunch, pastelería,
  coctelería, jugos, mariscos…

### Cambiado

- **Taxonomía**: "Hamburguesas y Alitas" pasa a **Hamburguesas** (las alitas, a Bar y Bistró);
  "Bowls y Sándwiches" se divide en **Tortas y Sándwiches** y **Saludable**; "Té de Burbujas" pasa a
  **Bebidas**. Enoff es cafetería/brunch y NOMAD, "Alto en Proteína", con la descripción del propietario.
- "Próximamente" en el mapa es una insignia redonda con icono de obra, como la cifra de locales; con la
  vista alejada solo se ve la insignia, para que dos obras vecinas no se pisen.
- Calificación: "Califica este lugar" / "Gracias por calificar".

### Corregido

- **Silueta**: el contorno sigue el polígono del Master Plan del propietario, georreferenciado contra las
  vías de OSM (88 % de coincidencia). Sale el romboide al oriente del Ejido San Vicente que la versión
  anterior incluía (10,9 → 10,3 km²).
- Las etiquetas de las plazas ya no se dibujan encima del panel lateral ni de la barra superior.
- Las pastillas de categoría del panel arrancan alineadas con el resto del contenido.
- Burger & Fries Forever: se retira el Instagram antiguo que ya no es el oficial.

## [1.2.0]: 2026-09-20

Segunda ronda de ajustes del propietario: contenido al día, silueta del Master Plan y afinado del mapa.

### Añadido

- **Contenido**: 98 locales en 10 plazas activas (antes 76). Altas en el campus Anáhuac, Xentric Anáhuac,
  Xentric Zibatá, Plaza Zielo, Centro Zibatá, Paseo Zibatá, Plaza Condesa y Plaza Loop, que estrena
  inventario (Tacos el Pata, Enoff y NOMAD junto a Burger & Fries Forever).
- **Verificación en sitio como fuente**: un registro puede sostenerse en una URL pública o en una
  comprobación en sitio fechada (`campo:AAAA-MM-DD`). Muchos negocios de barrio no tienen presencia
  pública y dejarlos fuera no hacía la guía más veraz, solo más pobre.
- **Silueta del Master Plan**: `npm run map:masterplan` amplía el contorno hasta la MEX 57D y la QRO 540
  (geometría real de OpenStreetMap) rodeando el Ejido San Vicente. Zibatá pasa de 6,7 a 10,9 km² e
  incluye el suelo del futuro Town Center, aunque siga vacío.
- **Plazas "Próximamente"**: una plaza confirmada y en obra (hoy Distrito Nandú) aparece en el mapa con
  contorno punteado y en la lista con su leyenda, sin entrar en filtros ni conteos.
- **Calificación por estrellas** por lugar, guardada en este dispositivo, junto al corazón. La foto de lo
  marcado (`localProfileSnapshot`) es lo que subiría una futura cuenta para no perder nada.
- Categoría **Carnes y Parrilla**, separada de Mexicana.

### Cambiado

- **Color**: las dos familias se generan desde HSL y viven en registros distintos ·plaza en color pleno,
  categoría en tinte muy claro·, así que ya no parece que una plaza y una categoría compartan color. El
  tono de cada categoría se declara en los datos (`hue`), no en el código.
- **Límite de exploración**: se limita el centro de la pantalla (contorno + ~440 m) en vez del encuadre
  completo. Con la cámara inclinada, un `maxBounds` ajustado obligaba a MapLibre a recentrar y dejaba
  plazas fuera de pantalla en los teléfonos.
- El encuadre general se calcula sin inclinación y después se inclina: en pantallas bajas la vista ya no
  se aleja de más.
- "Cómo llegar" usa el nombre y la dirección de la plaza como destino: Google ya no rotula la ruta con un
  local de dentro.
- El punto de "mi ubicación" es más discreto, va por debajo de las etiquetas y no intercepta toques.
- Los E2E leen los conteos del dataset (`placesInPlaza`) en vez de llevarlos escritos a mano.
- El idioma se resuelve del navegador entre los catálogos registrados (hoy solo español) y se refleja en
  `<html lang>`: añadir inglés es registrar `en.ts`, sin tocar componentes.

### Corregido

- **Marcadores trabados**: la pasada extra de colocación se repetía sin fin cuando dos plazas se turnaban
  la etiqueta; ahora solo se repite mientras se aprendan anchos nuevos.
- **Orden de capas de los marcadores**: quien está más abajo en pantalla (más cerca) va por encima; el
  tallo de una plaza lejana ya no cruza sobre la etiqueta de una cercana.
- La barra de desplazamiento del panel ya no se pega al borde redondeado ni se recorta en la esquina.
- 11 negocios cerrados salieron de la guía (Los Morros de Sonora, Ciao Bella, Bistrot Marino, Ramen
  Express, Tacos La Capilla, Sixties Burger, La Borra del Café (dos sucursales), Ichos, Trecielos y
  Quetacos).

## [1.1.0]: 2026-09-16

Ronda de ajustes pedidos por el propietario tras usar la guía. Sin cambios de arquitectura.

### Añadido

- **Plaza Loop** (10 plazas activas), con geometría tomada del polígono `shop=mall` de OpenStreetMap, y
  Burger & Fries Forever movido ahí desde Plaza Condesa.
- El generador del dataset acepta **plazas nuevas** que no estaban en la lista beta
  (`research/decisions.json` → `plazas[].new`); procedimiento en [docs/DATOS.md](docs/DATOS.md).
- **Color de identidad**: un tono por plaza en el mapa y en la cabecera de su panel, y un tono por
  categoría en listas y fichas (`src/config/palette.ts`). Antes el color de cada placa salía de un hash
  del identificador y no significaba nada.
- Marcador **punto** (24 px, pulsable) cuando una plaza no tiene sitio ni para su cifra: ninguna plaza
  desaparece del mapa por falta de espacio.
- Estructura preparada para señales sociales futuras (corazones de la comunidad y calificación media):
  `socialStats.ts` + `SocialStats.tsx`, sin efecto mientras no haya una fuente registrada.
- `boundaryExtensions` en la configuración GIS: suelo ya planeado sin calles todavía (Master Plan) que se
  suma al contorno cuando haya una fuente georreferenciada.

### Cambiado

- **Taxonomía**: de 16 categorías (seis con tres lugares o menos) a 10, todas con cuatro o más; lo
  específico baja a subcategoría. Nombres en Mayúsculas Principales. La taxonomía curada vive ahora en
  `research/taxonomy.json`.
- "Cómo llegar" lleva **siempre a la plaza**, nunca a la puerta del local (su ubicación exacta no está
  verificada).
- Horario y número de local se muestran solo en la ficha, no en las listas: los publica una minoría y
  dejaban filas desiguales.
- Los límites de exploración pasan del bbox de extracción al **contorno real de Zibatá + ~330 m**.
- El encuadre general reserva la columna de controles y deja más aire abajo (la cámara inclinada baja los
  puntos cercanos): en la vista inicial ninguna plaza queda bajo el panel.
- La lista de plazas muestra el número de lugares como texto y un rombo del color de la plaza, en vez de
  una insignia numerada que se leía como un ranking.
- Tutorial: no aparece sobre un enlace directo a una plaza o un lugar, el botón de cerrar se alinea con los
  márgenes de la tarjeta y las ilustraciones se rehicieron (el gesto del paso 1 y el volumen de los pasos
  2 y 3, que salía cortado).

### Corregido

- La fila de categorías no se podía desplazar con ratón: la rueda vertical ahora desplaza en horizontal y
  aparecen flechas en los extremos (solo con puntero fino).
- "Limpiar filtros" quedaba descentrado en su pastilla cuando no había cifra de resultados.
- El botón de cerrar del panel salía cortado con la hoja a media altura (la zona con scroll no tenía
  margen superior).
- Sin fotografías, la ficha ya no muestra un marcador de imagen ni el aviso "Aún sin fotografías"; con
  fotografía, la imagen principal ocupa menos alto.

### Eliminado

- La insignia "+N" de plazas agrupadas (su función la cumple ahora el marcador punto).
- El botón de vista 2D/cenital: la guía se queda solo con la vista 3D.

## [1.0.0]: 2026-09-15

Primera versión completa de la guía: datos verificados, mapa propio y la ronda final de correcciones,
endurecimiento y documentación. El detalle de cada corrección, con su evidencia, está en
[docs/release/FINAL_REMEDIATION_CHECKLIST.md](docs/release/FINAL_REMEDIATION_CHECKLIST.md).

### Contenido

- Dataset verificado: **76 locales en 9 plazas activas**, 135 registros auditados con estado, confianza,
  motivo y fuentes (investigación del 2026-09-14).
- Teléfono y WhatsApp de Masaru desde su sitio oficial; cobertura de contenido medida y documentada.
- Punto del marcador de Centro Zibatá corregido para que caiga dentro de su propio polígono.

### Añadido

- Enlace "Ir al buscador" como primer elemento con teclado.
- Aviso cuando un enlace apunta a un lugar que ya no está en la guía, con limpieza de la URL.
- Aviso de falta de conexión (la guía ya cargada sigue siendo usable).
- `Escape` cierra la ficha, el panel y el tutorial.
- Política de seguridad de contenido (CSP) en el build, `404.html` propio e iconos "maskable" separados.
- Presupuesto de peso (`npm run perf:budget`) y proyectos E2E de tableta y WebKit (iPhone emulado).
- Documentación: mapa, pruebas, seguridad, accesibilidad, despliegue y guía de contribución.

### Cambiado

- Validación de datos en el navegador sin Zod: **JS inicial 131,6 → 107,7 KB gzip (−18 %)**; un registro
  inválido se omite con aviso en lugar de bloquear la guía.
- Búsqueda: prioridad por inicio de palabra ("bar" ya no trae "barista" ni "gastrobar"), términos de una
  letra ignorados de forma coherente con el indicador de filtros, y caché de la última consulta.
- Mapa: teselas z13 sin huellas menores de 60 m² (−23 % de peso en la vista inicial móvil), alturas
  estimadas con más variación (13 → 59 valores), rótulos que quedaban bajo los marcadores retirados,
  rumbo de la cámara según la forma del área libre y "+N" que acerca hasta revelar las plazas agrupadas.
- Interfaz: la barra superior se mide para reservar espacio al mapa; los controles pasan a fila cuando no
  caben en columna; la hoja expandida deja visible la barra; una sola región `aria-live`.
- Accesibilidad: pastillas con nombre accesible ("Todo, 76 lugares"), marca separada del lema y controles
  de MapLibre en español (correcciones salidas de la sesión con NVDA).
- Reloj compartido para el estado "abierto/cerrado" (un temporizador en vez de uno por tarjeta).

### Corregido

- Una plaza seleccionada nada más cargar podía quedar descartada por la sincronización inicial de la URL.
- Un marcador con el foco del teclado podía ocultarse al moverse la cámara y perder el foco.
- Arrastrar la hoja inferior y soltar sobre el asa deshacía el gesto.
- El contador de favoritos incluía identificadores que ya no están en la guía.
- README: coincidencia cartográfica real (96 %/89 % a 11 m) y alcance real de la accesibilidad.

### Seguridad

- CSP verificada con control negativo; 0 peticiones externas en los recorridos E2E.
- `gitleaks` sin hallazgos; `npm audit` sin vulnerabilidades; acciones de CI fijadas por SHA.

### No incluido (limitaciones declaradas)

- La guía **no está publicada**: la versión se etiqueta en local, sin repositorio remoto.
- **Safari real en iOS** sin probar (solo WebKit emulado).
- Horarios en 3/76 locales y sin fotografías propias: límite de las fuentes públicas permitidas.
- 61 de los 76 locales son `likely_active` (evidencia documental reciente, sin verificación en campo).

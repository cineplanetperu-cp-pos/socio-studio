# Referencia funcional · v8

Las funciones de socios, visitas, beneficios y tickets se conservan. Para el acceso y la persistencia de v8, consulta README.md y GUIA_FIREBASE_GITHUB.md: el modo principal usa Firebase Authentication y Firestore; las referencias al guardado local de este documento describen la vía de migración anterior.

# Socio Studio v7.1 · Socios, beneficios y control de efectivo

Esta versión retira el POS de ventas. Conserva Socios y una cartelera para registrar consumos. Añade Beneficios y control manual de ingresos/retiros realizados en Odoo.

## Abrir y editar

Abre dist/index.html o dist/socio-cineplanet.html en un navegador moderno. Edita dist/index.html en Visual Studio Code y ejecuta npm run build para regenerar la copia descargable. El HTML no requiere librerías ni compilación. El proyecto también incluye manifiesto, iconos y caché estática opcional para navegadores compatibles.

La interfaz ya no tiene carrito, precios/tarifas de entradas, pagos, productos de dulcería, caja de ventas, sesiones de venta ni pantalla del cliente. display.html se retiró del proyecto. No hay integración ni llamadas de escritura a Odoo, Cineplanet o SUNAT.

## Socios y cartelera

Se conservan la clave local socio-studio.v2, los socios, categorías, puntos, visitas y movimientos editables. Clásico/Plata/Oro/Black usan los umbrales locales 0/16/30/60. El cálculo existente sigue usando los últimos 12 meses, incluyendo los ajustes manuales vigentes.

Cartelera gestiona películas activas/pausadas, título, género, duración y clasificación. No vende entradas ni define precios o funciones. Registrar visita selecciona del catálogo activo y conserva un título histórico y la referencia de la película. Se mantiene una fecha de asistencia diaria y el valor Clásico 1 / Prime 2.

El perfil tiene un acceso directo a los beneficios del socio, y la sección Beneficios permite seleccionar un socio por nombre/DNI.

## Beneficios

- Disponibles: calcula categoría actual, puntos, días/meses habilitados y cupo del periodo.
- Canjes: historial con socio, beneficio, cantidad, puntos, complejo, película opcional, responsable, autorizante y referencia.
- Asignaciones manuales: beneficios adicionales o entregas que requieren revisar campaña/stock.
- Catálogo por categoría: consulta y edición de las reglas.

Cada regla permite definir categorías, periodicidad (mensual/anual/una vez/por uso/manual), cuota, puntos por unidad, vigencia en días, días de semana, meses, estado y referencia.

Se precargan plantillas de Entrada/Combo Socio por puntos, precio de martes, Prime Oro/Black, Entrada Black mensual, regalo de inicio de año y cumpleaños. Calendario y bienvenida Black quedan pausados y requieren confirmación/asignación manual. Cumpleaños también se asigna manualmente porque este sistema no conoce ni verifica la fecha de nacimiento o la emisión del beneficio en Cineplanet.

Las asignaciones manuales son extraordinarias e independientes de los cupos automáticos. Se puede seleccionar una plantilla o escribir cualquier beneficio, indicando unidades, vigencia, costo en puntos, motivo, responsable y autorizante.

Antes del canje, el operador confirma identidad, emisión real, restricciones y disponibilidad. El sistema registra el uso local: no comprueba la cuenta ni el saldo oficial de Cineplanet y no emite códigos de canje oficiales.

### Puntos, cupos y anulaciones

Un canje con puntos crea un movimiento de puntos enlazado al socio. Registrar un canje aquí no genera visitas ni puntos automáticamente. La anulación conserva el canje original, restaura el cupo y agrega una devolución exactamente por los puntos que se descontaron. Cambiar después el costo de la regla no modifica esa devolución.

Los movimientos de puntos enlazados a un canje se gestionan desde Beneficios, evitando corregirlos separadamente y duplicar o perder saldo. El canje y el saldo se guardan juntos en una única escritura local. La aplicación no soporta edición simultánea desde varias pestañas o equipos.

La disponibilidad automática utiliza la categoría actual del registro local; no reconstruye la categoría oficial al día de emisión ni carga beneficios reales retroactivos. Confirmar en Cineplanet/Odoo que el beneficio realmente fue emitido es parte del registro manual. Las restricciones por feriados, distribuidor y stock no se validan automáticamente.

### Referencias revisadas

Revisión: 6 de noviembre de 2026.
- Página pública peruana: https://www.cineplanet.com.pe/socio-cineplanet
- Referencia histórica 2025 de preguntas del programa, alojada por terceros: https://es.scribd.com/document/1020371623/Preguntas-Frecuentes-Del-Programa-Socio-Cineplanet-10-11-2025-VF

La página pública consultada muestra los umbrales y ejemplos para Clásico. Los detalles Black/plazos de algunas plantillas proceden de referencias históricas y de la solicitud del usuario: requieren confirmar vigencia. No se mezclaron automáticamente beneficios de otras regiones. Calendarios y bienvenida no se garantizan como beneficios oficiales vigentes.

## Control de efectivo

Efectivo → Ingreso o Retiro → completar → Registrar y emitir ticket.

Cada registro incluye importe en soles, fecha/hora de la operación en Odoo (Perú), complejo, referencia de caja externa, motivo, responsable, autorizante y referencia opcional. Se genera un número interno EF-AAAAMMDD-NNNN y un comprobante que puede consultarse, descargarse o imprimirse nuevamente.

El historial permite buscar por motivo, responsable, autorizante o referencia y filtrar por fechas/tipo. Muestra ingresos, retiros y neto de los registros vigentes. El neto no es el saldo real ni el cierre de caja de Odoo: un retiro se puede registrar aunque no haya ingresos previos en esta bitácora, porque el dinero pertenece a una caja externa.

No se modifica un comprobante ya guardado: se anula con motivo y autorizante y, si procede, se registra uno nuevo. La anulación no ejecuta ningún cambio en Odoo; el comprobante se marca ANULADO y se conserva la trazabilidad.

## Ticket y tiqueteras

Configuración → General y Ticket de efectivo permiten cargar una imagen horizontal de cabecera (PNG/JPG/WebP, hasta 5 MB), con vista previa, optimización y opción de retirarla. La imagen se ajusta al ancho del papel. Los archivos rasterizados se guardan una sola vez y los comprobantes históricos conservan su referencia aunque se cambie el diseño. Se incluyen en el respaldo completo.

Configuración → Ticket de efectivo mantiene marca, razón social, RUC opcional, dirección, teléfono, encabezado, pie, papel de 58/80 mm y líneas de firmas. Tiene vista previa. Cada movimiento conserva una copia del diseño para mantener los comprobantes históricos.

La impresión usa el cuadro nativo del navegador. Selecciona la tiquetera y el papel adecuado y desactiva encabezados y pies del navegador. La hoja utiliza márgenes de 3 mm y ancho imprimible aproximado de 52/74 mm. No se enlazan impresoras de red ni se envían comandos ESC/POS directamente.

El ticket es un comprobante interno sin validez tributaria. El nombre del autorizante es un dato declarado por el operador, no una autorización electrónica autenticada.

## Configuración

General, Complejos, Cartelera, Beneficios, Ticket de efectivo y Datos/respaldos. No se conservan opciones administrativas del POS de ventas. General define organización, complejo, responsable y referencia de caja externa predeterminados.

## Datos, migración y respaldos

Todo se guarda junto en la clave local socio-studio.v2. workspace.schemaVersion 1 contiene cartelera, reglas, asignaciones, canjes, efectivo, ticket y auditoría. Los socios conservan sus movimientos y ledgerVersion 1.

Al abrir datos anteriores, se leen únicamente cartelera y diseño del ticket de la antigua clave local para conservar esa configuración. Las ventas, sesiones, productos y fondos del POS anterior no se convierten en movimientos externos de Odoo. Los datos antiguos del navegador no se borran ni se sobrescriben; ya no forman parte de los módulos del proyecto actual.

Exportar → JSON completo, o Configuración → Datos y respaldos, descarga todos los módulos nuevos. La restauración completa muestra cantidades antes de reemplazar los datos. La importación desde Socios sigue agregando solamente DNI nuevos desde CSV/JSON, por lo que para trasladar canjes y relaciones de puntos debe usarse el respaldo completo.

La demo utiliza datos temporales separados y no modifica los registros reales. El HTML/ZIP descargado contiene código, no los datos locales del usuario. Para otro equipo/navegador/dirección, exporta el JSON completo e impórtalo allí. El servicio de caché estática no almacena respuestas de API ni respaldos.

## GitHub Pages y uso local

Sube los archivos descomprimidos (incluidos index.html y .nojekyll) a un repositorio. GitHub Pages puede servir esta aplicación estática. No subas los respaldos con información de socios, autorizantes o efectivo a un repositorio público.

## Validación

183 comprobaciones de lógica aprobadas: regresiones de socios, migración, cupos por categoría/periodo, consumo y devolución de puntos, asignaciones manuales, recibos de efectivo, historial, respaldo completo, recarga y aislamiento de la demo. Se verificó la retirada del código y de los activos del POS de ventas. La inspección visual y la impresión en una tiquetera física no estuvieron disponibles en este entorno.


## Complejos precargados y personalizados

Configuración → Complejos contiene 44 sedes del filtro público de Cineplanet Perú consultado el 6 de noviembre de 2026. Fuente: https://www.cineplanet.com.pe/peliculas/lightyear/ (sección Filtros → Cine). Se mantuvieron los nombres públicos, sustituyendo el prefijo CP por Cineplanet para que coincida con los registros existentes.

Puedes crear, editar y pausar complejos. El catálogo alimenta el complejo predeterminado y los formularios de visitas, movimientos manuales, canjes y efectivo. La edición de un nombre no modifica el historial; al pausar el complejo predeterminado se limpia ese valor. Los nombres de registros históricos pueden conservarse al editar. No hay sincronización automática con Cineplanet. El catálogo se incorpora a respaldos antiguos compatibles sin eliminar socios ni operaciones.

## Perfil administrador y acceso inicial

Al abrir la aplicación, configura nombre, usuario y contraseña del administrador de este navegador. El correo es opcional y solo de contacto. No existen credenciales predeterminadas. Guarda el código de recuperación que se muestra una vez y continúa al sistema. Después, el ingreso requiere usuario y contraseña; la sesión termina al recargar/cerrar la página o al pulsar Cerrar sesión.

El perfil de la esquina superior derecha permite modificar nombre, usuario y correo y cambiar la contraseña; requiere la contraseña actual. La recuperación usa el código guardado, no envía correos. La contraseña exige al menos 10 caracteres. Los verificadores usan Web Crypto PBKDF2 SHA-256 con 310000 iteraciones y salt aleatorio; no se guardan contraseñas ni códigos de recuperación en texto plano. Tras cinco intentos fallidos se aplica una pausa local de 30 segundos. Usa un navegador moderno con Web Crypto, HTTPS o localhost.

El perfil y los verificadores se guardan aparte, en socio-studio.admin.v1, y no se incluyen en los respaldos comerciales ni en el HTML/ZIP. En otro navegador se crea su propio perfil y luego se restaura el respaldo completo. Recuperar contraseña o cerrar sesión no borra socios, registros ni comprobantes. La demostración no permite editar el perfil real.

Este es un control de acceso local de un único administrador, no un servicio de cuentas multiusuario ni cifrado de los datos del navegador. Alguien que controle el navegador o sus herramientas puede acceder al almacenamiento. En el sitio alojado se conserva además el acceso privado de Sites; publicar este HTML en GitHub Pages no crea autenticación de servidor. No se añadieron servicios de identidad externos.

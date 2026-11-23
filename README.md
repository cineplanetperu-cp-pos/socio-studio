# Socio Studio v8 · Firebase Authentication + Firestore

Socios, visitas, cartelera, complejos, beneficios, canjes y control manual de efectivo con acceso autorizado y registros compartidos entre equipos. No contiene POS de ventas ni ejecuta operaciones en Odoo.

Lee [la guía completa](GUIA_FIREBASE_GITHUB.md) para crear Firebase y GitHub desde cero. Todavía debes crear tu proyecto, configurar sus valores y autorizar los usuarios: esta entrega no afirma una conexión de producción inexistente.

## Preparación

Requiere Node.js 24 LTS y, para probar los emuladores, Java 21.

```sh
npm ci
npm run build
npm run check
npm test
npm run test:rules
```

Completa `firebase.config.json`, habilita Correo/Contraseña en Firebase Authentication, crea Firestore Standard y autoriza cada UID en `workspaces/{workspaceId}/access/{uid}` con `role: "admin"` y `active: true`. No se admiten permisos concedidos desde el navegador ni usuarios sin correo verificado.

```sh
npx firebase login
npx firebase use --add
npm run build
npm run check:release
npx firebase deploy --only firestore:rules,firestore:indexes,hosting
```

La configuración web de Firebase es pública. Nunca incorpores claves privadas ni un JSON de cuenta de servicio.

## Fuente y archivos

- `dist/index.html`: interfaz y lógica funcional existente. Las secciones de configuración y sincronización se regeneran; no las mantengas manualmente.
- `src/firebase-core.js`: SDK, serialización y repositorio de transacciones.
- `src/firebase-ui.js`: acceso, verificación, perfiles, sincronización, confirmaciones y migración local.
- `firebase.config.json`: valores públicos de tu aplicación y espacio de trabajo.
- `firestore.rules`: lista de acceso administrada fuera del navegador, aislamiento y escrituras autorizadas.
- `firestore.indexes.json`: exclusión de índices del contenido serializado.
- `dist/socio-cineplanet.html`: copia autónoma generada con CSS, JavaScript y configuración incorporados. Necesita conexión para Firebase y HTTPS o localhost para acceder.
- `scripts/`: generación del HTML, guía y ZIP; comprobaciones de entrega y configuración.
- `tests/`: lógica local, integración de interfaz y pruebas reales de Auth/Firestore en emuladores.
- `.github/workflows/check.yml`: CI sin credenciales de producción, con pruebas de reglas.

El ZIP no contiene historia Git, identidad del alojamiento original, datos de usuarios ni secretos. `npm run build` lo regenera de forma reproducible con una lista explícita de archivos.

## Sincronización y consistencia

Los datos se guardan en un espacio común por proyecto y workspace. Firestore usa caché en memoria, escuchas de actualización y transacciones con revisión esperada. El guardado en pantalla es provisional hasta recibir confirmación; no se imprimen tickets pendientes. Un conflicto carga el estado actual y exige revisar y repetir. Si falla la confirmación, se conserva una copia descargable de la operación durante la sesión.

La unidad transaccional incluye socios, sus movimientos y los módulos de configuración/beneficios/efectivo. La serialización se divide en bloques para evitar documentos de más de 1 MiB. Se impone un máximo de 4 MB por estado completo, con hasta 88 bloques. Cada guardado reescribe el conjunto; está diseñado para un volumen inicial, no para una operación masiva. Revisa las cuotas y costes de tu proyecto.

Los registros no se guardan en la clave local antigua. El acceso Abrir versión local para exportar conserva los datos y el perfil previos como fuente de migración. No importa nada sin confirmación. Para migrar, exporta el JSON local y restáuralo una sola vez en el espacio Firebase; una restauración sustituye el conjunto compartido.

El perfil local y su código de recuperación solo se usan en esa vía de migración. En la nube, el acceso y la recuperación por correo dependen de Firebase Authentication. Todos los usuarios de esta versión son administradores autorizados del mismo espacio. No hay roles limitados ni aprobación electrónica del autorizante escrito en un ticket.

Consulta `docs/FUNCIONES.md` para las funciones de socios y tickets. Sus reglas locales de visitas y puntos se conservan; la persistencia activa de v8 es la descrita aquí y en la guía de Firebase.

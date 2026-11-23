# Socio Studio: acceso y datos compartidos en Firebase

Guía del 6 de noviembre de 2026. Esta versión incorpora Firebase Authentication y Firestore. Todavía no existe tu proyecto ni tu repositorio: los crearás con tu propia cuenta. El código no contiene credenciales de administrador ni claves de cuentas de servicio.

## 1. Descargar y conservar el respaldo local

Extrae el proyecto completo y ábrelo con Archivo → Abrir carpeta en Visual Studio Code. Abre la terminal desde la carpeta que contiene `package.json` y `firebase.json`.

En el sistema actual, descarga Configuración → Datos y respaldos → Respaldo completo. También puedes usar Abrir versión local para exportar en la pantalla inicial de esta nueva versión. Entra con el administrador local anterior y exporta el JSON. Esta vía no importa ni mezcla registros automáticamente.

Guarda el respaldo fuera de la carpeta del proyecto. El ZIP y el HTML contienen código, no los registros reales de tu navegador.

## 2. Instalar herramientas y comprobar el proyecto

Instala Git y Node.js 24 LTS. Para las pruebas de seguridad con emuladores instala también Java 21. Desde la terminal:

```sh
git --version
node --version
npm ci
npm run build
npm run check
npm test
npm run test:rules
```

La aplicación utiliza el SDK web oficial de Firebase 13.2.0. El navegador lo carga desde gstatic. Las dependencias instaladas con `npm ci` son herramientas de desarrollo y pruebas; no se publican en Hosting.

`npm test` comprueba la lógica de la aplicación y la integración de la interfaz. `test:rules` inicia los emuladores de Authentication y Firestore con el proyecto ficticio `demo-socio-studio`, prueba las reglas y termina. No usa tu proyecto de producción ni tus socios.

## 3. Crear el proyecto Firebase y registrar la aplicación web

En https://console.firebase.google.com/ crea un proyecto y registra una aplicación web con el botón `</>`. El nombre visible puede ser Socio Studio. Anota el ID real del proyecto.

Copia los valores públicos del bloque `firebaseConfig` que muestra Firebase en el archivo raíz `firebase.config.json`. Conserva `mode` en `firebase` y el mismo `workspaceId` para todos los equipos. Su estructura es:

```json
{
  "mode": "firebase",
  "workspaceId": "cineplanet-peru",
  "firebase": {
    "apiKey": "VALOR_DE_TU_APP_WEB",
    "authDomain": "TU_ID_DE_PROYECTO.firebaseapp.com",
    "projectId": "TU_ID_DE_PROYECTO",
    "appId": "VALOR_DE_TU_APP_WEB"
  }
}
```

Sustituye los valores de ejemplo por los de tu proyecto; no inventes un ID. El objeto de configuración web identifica la aplicación y no sustituye las reglas de acceso. Nunca copies un archivo de Firebase Admin SDK ni una clave privada dentro de este archivo.

`npm run build` incorpora esa configuración y los archivos de `src/` al HTML autónomo. El HTML descargado también puede conectarse al mismo espacio, pero para iniciar sesión debes servirlo por HTTPS o localhost. No edites a mano las secciones generadas del HTML.

## 4. Activar acceso por correo y crear el primer administrador

En Firebase → Authentication → Método de acceso habilita Correo electrónico/Contraseña. En Authentication → Usuarios añade tu primer usuario con correo y una contraseña fuerte. Copia su UID.

Revisa Authentication → Configuración → Dominios autorizados: agrega tu dominio definitivo y `localhost` si vas a probar localmente. El acceso actual utiliza correo y contraseña y la verificación de correo de Firebase.

No hay registro público que conceda permisos desde la aplicación. Cada cuenta adicional se crea y autoriza con el mismo procedimiento. El perfil local anterior no se convierte en una cuenta Firebase; su contraseña tampoco se sube.

## 5. Crear Firestore y autorizar el UID

Crea Cloud Firestore en la edición Standard y modo de producción. Elige la región disponible que se ajuste a tu operación. Se incluyen reglas cerradas para publicar en el paso siguiente; no habilites acceso público ni modo de prueba.

En la consola de Firestore crea un documento en `workspaces` cuyo ID sea `cineplanet-peru` (o el `workspaceId` que configuraste). Puedes poner un campo descriptivo `name` con el valor `Socio Studio`.

Dentro de ese documento crea la subcolección `access`. Crea un documento con ID igual al UID del usuario de Authentication y estos campos:

```json
{
  "role": "admin",
  "active": true
}
```

`active` debe ser un booleano, no el texto "true". Repite la autorización para cada cuenta de administrador que deba acceder al mismo espacio. Puedes revocar una cuenta cambiando `active` a `false` en la consola. La aplicación no puede concederse permisos ni modificar esta lista.

No crees manualmente `state/head`, `blocks` ni `profiles`: el sistema los administra. Los administradores habilitados comparten todo el espacio; esta entrega no tiene un rol limitado de cajero ni permisos por socio.

## 6. Vincular la CLI y publicar reglas, índices y web

La CLI ya está incluida en las herramientas del proyecto. Desde la terminal:

```sh
npx firebase login
npx firebase projects:list
npx firebase use --add
```

Selecciona el proyecto real que coincide con `firebase.config.json` y usa `default` como alias. No vuelvas a inicializar Hosting ni sobrescribas `dist/index.html`: la configuración ya está incluida.

Prepara la entrega y comprueba que la configuración real esté completa:

```sh
npm run build
npm run check:release
npm test
npx firebase deploy --only firestore:rules,firestore:indexes,hosting
```

La orden publica las reglas de acceso, la exclusión de índices del contenido serializado y los archivos de `dist/`. Conserva el plan y las cuotas que hayas elegido en Firebase. El SDK no necesita Functions ni Cloud Storage para esta implementación; las imágenes de tickets forman parte de los registros de Firestore.

`check:release` falla si todavía faltan valores reales o si el alias local apunta a otro proyecto. Una descarga recién entregada puede revisarse y probarse antes de configurar Firebase, pero no está conectada a una nube inventada.

## 7. Entrar e importar el respaldo una sola vez

Abre la URL de Hosting e ingresa con el correo y la contraseña del usuario Firebase. La primera vez, usa Enviar correo de verificación. Abre el enlace que recibas y pulsa Ya verifiqué mi correo. Luego el sistema comprobará el UID autorizado y cargará el espacio.

Si la nube está vacía, entra en Configuración → Datos y respaldos → Restaurar respaldo completo y selecciona el JSON del paso 1. Revisa las cantidades y confirma. Esta restauración sustituye los datos compartidos: afecta a todos los equipos del mismo espacio y no debe hacerse varias veces con respaldos antiguos.

Comprueba los socios, puntos, movimientos, cartelera, complejos, beneficios y comprobantes. Después abre la misma web en otro navegador o equipo e ingresa con una cuenta autorizada. Deberás ver los mismos registros y la actualización de los cambios.

Desde ese momento el respaldo es para recuperación o traslado deliberado, no para sincronizar manualmente entre computadoras. El código conserva las claves locales antiguas únicamente para migración y no las sobrescribe con información de la nube.

## 8. Crear el repositorio GitHub

Crea un repositorio vacío, por ejemplo `socio-studio`, sin añadir README ni gitignore desde GitHub. Puede ser privado. Desde la carpeta extraída, reemplaza `TU_USUARIO` por el real:

```sh
git init -b main
git add .
git commit -m "Publicar Socio Studio con acceso y datos compartidos"
git remote add origin https://github.com/TU_USUARIO/socio-studio.git
git push -u origin main
```

Si Git solicita tu nombre y correo para los commits, configúralos antes de repetir el commit. Inicia sesión mediante Git o Visual Studio Code. Nunca pegues contraseñas, tokens o claves de cuentas de servicio en el repositorio.

La carpeta descargada no contiene el historial ni la identidad del alojamiento original. Los respaldos comerciales y las credenciales se excluyen de la exportación. No necesitas GitHub Pages; Firebase alojará la web.

## 9. Conectar GitHub con Firebase Hosting

Después del primer despliegue y de subir el repositorio:

```sh
npx firebase init hosting:github
```

Autoriza GitHub, selecciona `TU_USUARIO/socio-studio`, la rama `main` y la publicación automática si la deseas. Como tarea previa al despliegue utiliza:

```sh
npm ci && npm run build && npm run check:release && npm test
```

El asistente oficial crea los workflows y guarda la credencial de despliegue en GitHub Secrets. Conserva `dist` como carpeta pública. Revisa que sus workflows usen Node 24. El workflow de validación incluido además prueba las reglas con Java 21 y los emuladores.

Sube los archivos generados:

```sh
git add .github/workflows firebase.json
git commit -m "Conectar publicación de Hosting desde GitHub"
git push
```

Revisa GitHub → Actions. La integración oficial publica Hosting; no se presupone que su cuenta de servicio tenga permisos para actualizar Firestore. Si cambias `firestore.rules` o `firestore.indexes.json`, prueba las reglas y publícalas explícitamente con tu cuenta autorizada antes de publicar la web:

```sh
npm run test:rules
npx firebase deploy --only firestore:rules,firestore:indexes
```

Los previews de Hosting apuntarán al proyecto configurado en el código. Para ensayar cambios sin tocar registros reales usa otro proyecto Firebase y otra autorización; el nombre de un preview no crea una base de datos separada.

## 10. Trabajar desde varios equipos

Los equipos comparten los registros del mismo `projectId` y `workspaceId`. Cada navegador inicia sesión en Firebase. La sesión se conserva en la pestaña según Firebase; al cerrarla debes volver a ingresar. El nombre de perfil se sincroniza y el cambio/recuperación de contraseña utiliza Firebase Authentication.

Las modificaciones requieren conexión. Mientras aparece Guardando cambios, espera la confirmación. Los tickets de efectivo solo se habilitan para imprimir después del guardado. No hay una cola oculta de operaciones sin conexión.

Si otro equipo guarda antes, el sistema carga la versión nueva y pide revisar y repetir la operación. No aplica automáticamente un cambio antiguo encima de los datos nuevos. Si una operación falla o no se puede confirmar, puedes descargar su copia de recuperación; compárala con la nube antes de volver a importarla para evitar duplicados.

La restauración completa también se controla por revisión. Si se actualizó el espacio desde que abriste un formulario, debes cerrarlo, revisar la información nueva y abrirlo otra vez para registrar el cambio.

## Alcance y límites de esta versión

Firestore almacena el estado compartido en bloques pequeños y cada operación actualiza el conjunto dentro de una transacción con revisión. Esto conserva juntos puntos, canjes y anulaciones y evita el límite de un solo documento de Firestore. Se admite un estado serializado de hasta 4 MB; si crece más, la aplicación bloquea la escritura y pide revisar el tamaño sin sobrescribir lo existente.

Esta estructura está pensada para el volumen inicial de la herramienta. Cada guardado lee o escribe varios bloques; no equivale a consultas paginadas de un sistema masivo. Consulta en Firebase el consumo de operaciones, almacenamiento y los límites de tu plan. El límite del formulario de respaldo sigue siendo 10 MB, y la validación de publicación en nube aplica su límite de 4 MB.

El código y el formulario de acceso pueden ser públicos en Hosting. Los registros requieren un usuario verificado y autorizado por las reglas del servidor. El nombre del autorizante de un retiro sigue siendo un dato declarado; no se convirtió en un segundo flujo de aprobación electrónica.

Las pruebas locales no reemplazan la validación final de tu proyecto, correo, dominio y tiquetera. Sin el proyecto y sus usuarios creados no puede verificarse una conexión real de producción desde esta entrega.

## Fuentes oficiales

- SDK web: https://firebase.google.com/docs/web/setup
- Usuarios, verificación y contraseña: https://firebase.google.com/docs/auth/web/manage-users
- Transacciones: https://firebase.google.com/docs/firestore/manage-data/transactions
- Pruebas de reglas: https://firebase.google.com/docs/rules/unit-tests
- Hosting y GitHub: https://firebase.google.com/docs/hosting/github-integration

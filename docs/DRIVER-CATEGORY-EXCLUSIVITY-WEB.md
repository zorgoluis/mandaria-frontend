# Categorías excluyentes 1.0.0 — integración Web local

2026-10-28, America/Mexico_City. Sustituye el bloqueo contractual del informe de impacto de esta fecha; su historia se conserva. Backend ahora publica DRIVER-CATEGORY-EXCLUSIVITY-CONTRACT.md y HANDOFF.md, proyección driverCategory, migración66 y conciliación administrativa. Implementación Web sobre main/ffb07b1, versión1.11.0 intacta. Backend y Android originales sólo leídos, sin mensajes a agentes, commit/push ni despliegue.

## Cambios

- src/driver-category/contract.ts y components.tsx: contrato1.0.0, revisión decimal string exacta, categorías FLEET/INDEPENDENT/NONE/REVIEW_REQUIRED, pertenencia CURRENT/HISTORICAL/REVIEW_REQUIRED y aprobación separadas. Datos ausentes/incompatibles no conceden permiso.
- src/independent-drivers/pages.tsx/types.ts/queries.ts: categoría en listado/detalle; retiro del selector de candidatos por proveedor que promovía coexistencia. Consulta por Driver ID conocido, sin crear perfiles para conseguir identificadores. Rehabilitación sólo con categoría compatible, motivo explícito y relectura de revisión antes del POST. Conflictos refrescan proyección. Perfil aprobado histórico no es independiente vigente.
- src/driver-category/service.ts/intent.ts/reconcile.tsx: SUPER_ADMIN concilia únicamente legado con flotilla. POST /api/v1/admin/drivers/:driverId/category/reconcile-legacy-fleet, body exacto {requestId,expectedRevision,reason}. Confirmación humana y relectura; IndexedDB con AES-GCM no exportable, partición actor/entorno/Driver, inserción atómica y exclusión entre pestañas antes de envío. Replay conserva cuerpo/clave; recibo verifica categoría FLEET/HISTORICAL, requestId y motivo. Lectura coincidente no resuelve autoría. Timeout/red/401 conservan intención; sólo recibo o REVISION_CONFLICT permiten reconocimiento explícito, después de refrescar. No endpoint ficticio de consulta/cierre.
- src/driver-portal/pages.tsx/types.ts: lectura canónica /driver/me, bloqueo de nuevas tomas incompatible incluso si perfil histórico APPROVED. Revalida categoría/capacidad antes del TAKE y refresca conflictos. Servicios propios activos independientes conservan acceso a su recorrido de ejecución/RELEASE según permisos existentes; no se cambia pagador ni se completa un servicio en esta tarea.
- src/independent-zones/panel.tsx: consulta por profileId real intacta; nuevas ediciones sólo para CURRENT/INDEPENDENT y relectura administrativa al confirmar. CanEdit ausente deniega por defecto. Historial visible no equivale a autorización. Recuperación de intención previa mantiene el protocolo de ofertas y su replay.
- src/drivers/pages.tsx, src/fleet-exit/pages.tsx y src/services/errors.ts: límites de incorporación, EXIT_PENDING no habilita independiente, separación de salida/aprobación y mensajes públicos de conflicto/revisión/selector retirado. Política del proveedor ADMIN_DISPATCH/DRIVER_TAKE/PAUSED/DRAINING, START/RECHECK y asistencia/movementContext permanecen.

## Contratos y límites reales

GET /driver/me y GET administrativo del perfil independiente exponen driverCategory. Se consumen esos DTO; no se deduce categoría desde providerId ausente, profile.status, mode ni receptionMode. La revisión se conserva como string incluso por encima de Number.MAX_SAFE_INTEGER. Las consultas se refrescan al confirmar y por invalidación/poll del perfil; no se añadió socket nuevo.

Bloqueo aún vigente: GET /admin/drivers/:driverId/independent devuelve404 si nunca hubo perfil; el backend no ofrece catálogo administrativo de candidatos sin perfil ni lectura canónica de categoría para ese caso. El portal permite consultar un ID conocido y explica la limitación; no envía alta a ciegas ni interpreta404 como NONE. La primera habilitación posterior a salida de un conductor sin perfil NO está integrada completamente. Para perfiles existentes compatibles, rehabilitación/resolución a independiente usa POST existente con motivo; no se exige aprobación del dueño para salir.

No hay baja general de independiente CURRENT ni incorporación de Driver existente a otra flotilla. Suspender/rechazar mantiene pertenencia. Conciliar legado a FLEET no es un botón de conversión general. Restricciones, saldo, vehículos, documentación, zonas, turnos, servicios e historia no se transfieren. Ninguna aprobación/conciliación inicia recepción.

## Verificación nueva y evidencia

[evidencia HTTP Web](evidence/driver-category-20261028/web-category-http.json), [runner y cierre](evidence/driver-category-20261028/evidence.json), [manifiesto](evidence/driver-category-20261028/verification.json). Se compararon382 archivos src/prisma del snapshot con backend original, hashes idénticos; compilación en copia de test-results y dependencias backend sólo leídas. No copia de .env, no generación Prisma sobre dependencias compartidas.

HTTP real: seis grupos Web PASS mediante módulos reales authService/independentDrivers/driverPortal/categories compilados con esbuild, fetch nativo, Nest escuchando loopback y PostgreSQL18 WSL puerto55489 desechable. Sólo sessionStorage se adapta en el proceso Node; respuestas HTTP no se simulan. Se prueban login/categoría, aprobación FLEET409, suspensión conservando INDEPENDENT, rehabilitación, aplicación NUEVA de conciliación, revisión incorrecta409, replay exacto, clave reutilizada409 y cambio a DRIVER con403 de perfil/conciliación. Driver legado nuevo sintético99999999-9999-4999-8999-999999999999; ningún vínculo con MDR-000001. Credenciales/tokens aleatorios no se guardan en evidencia.

El runner backend se volvió a ejecutar en esa copia:16 grupos de migraciones/guards/carreras/salida/compatibilidad, separados de los seis grupos Web. No son16 pruebas de navegador. EXIT_PENDING del runner usa evaluación diferida controlada; no acredita entrega activa de extremo a extremo. Dos sesiones y selector antiguo409 pertenecen a esas comprobaciones del runner. Base fresca y upgrade65→66 aplicados; cluster propio detenido con stop PASS y Nest cerrado en finally.

Regresiones Web: suite global nueva1613/1613,80 archivos,0 omitidas. La corrida anterior1612/1613 falló por fixture de finalización sin driverCategory; se actualizó el fixture al contrato, sin relajar guardas, omitir pruebas ni aumentar tiempos. Fixtures del portal ahora incluyen categoría canónica y ya no prueban aprobación implícita de afiliados. Nuevas unitarias cubren categorías/aprobaciones/histórico, revisiones grandes, validación de comandos, cifrado y partición de intención; UI con mocks prueba bloqueo FLEET/NONE/REVIEW_REQUIRED y perfil histórico/no canónico. Corrida focal final posterior a ajustes menores se registra en manifiesto; no se suma a la global.

Tipos producto/tests, lint y build se ejecutan separadamente. Build Vite sin .env, API loopback explícita y outDir test-results/category-build-final; conserva advertencia conocida chunk>500kB. Lint excluye únicamente test-results y .tmp generados (snapshots completos de otro repositorio); incluye todo src/test y scripts. Primer lint general se interrumpió al recorrer snapshots; no se declara PASS de esa invocación. Validación final y hashes en manifiesto.

Incidencias del harness preservadas: imports/loader/define esbuild corregidos antes de levantar servidor; junction requirió permiso de escritura en snapshot; primer HTTP recibió429 tras logins previos del runner y cerró correctamente, siguiente respeta Retry-After sin modificar límites; ampliación del fixture legado tuvo sustitución textual incorrecta del tipo UUID, corregida en copia. Otro comando se lanzó desde directorio incorrecto y no ejecutó runner. Error inicial de temporales Vitest resuelto con TEMP/TMP dentro de test-results. Corridas fallidas no se presentan como aceptación. Una corrida focal solapada con global se interrumpió y se volvió a ejecutar separadamente para evitar carga innecesaria.

## Reproducción autorizada local

Desde raíz Web:

1. node scripts/prepare-category-http.mjs (copia nueva src/prisma, scripts runner y compila backend; no modifica origen). Requiere dependencias backend instaladas, esbuild allí existente y permiso para junction local. No instala paquetes.
2. En la ruta de snapshot que imprime: node scripts/verify-driver-category-local.mjs --run --wsl. Sólo WSL Mandaria-Postgres/PostgreSQL18, puerto55489 libre; nunca matar un ocupante ni reutilizar datos existentes. Crea cluster nuevo y lo cierra en finally. Informes bajo .tmp/driver-category-verification-* del snapshot.
3. TEMP y TMP al directorio test-results/category-temp; node node_modules/vitest/vitest.mjs run --reporter=json --outputFile=test-results/category-global-final.json.
4. node node_modules/typescript/bin/tsc -b; node node_modules/typescript/bin/tsc --project tsconfig.test.json; node node_modules/eslint/bin/eslint.js . --ignore-pattern 'test-results/**' --ignore-pattern '.tmp/**'. Build con configFile:false/envDir:false/plugin React, define VITE_API_URL loopback y salida aislada, sin reconstruir servidor compartido.

## Handoff Driver / matriz pendiente

Handoff documental, sin mensaje enviado. Driver debe consumir el mismo driverCategory1.0.0, retirar nuevas elecciones MODE, conservar recuperación de body/clave antiguos y recepción explícita. Los resultados aquí no acreditan UI Android, GPS ni ningún servicio reservado. Seguir contratos backend de replay de MODE, permisos y ejecución existente.

Pendientes: primera habilitación sin perfil/lectura administrativa canónica; aceptación de conciliación durable en navegador real con cierre/reapertura/reauth y dos pestañas; matriz HTTP nueva con servicio activo, TAKE atrasado y asistencia/RELEASE; invalidación socket multiinstancia; UI Android. Los tests de salida/asistencia anteriores son históricos y no sustituyen estos casos del nuevo contrato. No se declara compatibilidad conjunta completa ni aceptación remota.

## Restricción posterior — 2026-10-28

La reproducción HTTP anterior es histórica y ya no está autorizada tal cual: prepare-category-http.mjs está deshabilitado porque fabricaba legado dual. Se requiere fixture entregado por backend. Estado actual, evidencia con dobles y prerrequisitos: [continuación de categorías y salida](DRIVER-CATEGORY-FLEET-EXIT-WEB-20261028.md). No usar las cifras anteriores como aceptación de la nueva superficie DRIVER.

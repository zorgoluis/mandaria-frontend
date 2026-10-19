# Compatibilidad de sesión y recibos de baja — 2026-10-17

Actualización de presentación posterior: el mensaje vigente incorrecto citado abajo y la etiqueta DRIVER están corregidos en Web; [detalle y validación focalizada](RESTRICTION-REVIEW-WEB.md). La recuperación, marcadores y sesiones permanecen intactos; su evidencia integrada anterior no se repitió.

Actualización 2026-10-18: [fix y recuperación CANCELLED desde Web](CANCELLED-COMMAND-RECEIPT-WEB.md), [evidencia nueva](cancelled-receipt-web-evidence.json). APPLIED con result.status=CANCELLED ya se acepta cuando el endpoint backend acredita RESOLVE. No cambia el HTTP público ni se admite el sobre interno como fallback. Asignación, KEEP/RELEASE y bloqueo global pasaron pérdida después de commit y GET real tras recarga; un mensaje vigente incorrecto tras bloqueo queda documentado aparte. Backend completo con fix antes de Web; despliegues mixtos no acreditados. Las restricciones y rechazos CANCELLED del informe original siguiente son históricos y quedan sustituidos sólo para ese contrato. Cancelación personal, entrega y restauración no se amplían ni se vuelven a ensayar.

## Continuidad y fuentes reales

Web: `feature/driver-verification`, HEAD `56c7bad0524cbbf05b45fa687a8ec625694a6ca0`
más la implementación de baja sin commit de la tarea anterior, conservada. No se
cambió de rama ni se integró QA. AGENTS.md no existe en este checkout. Se leyeron
README, BITACORA, VERIFICATION y la continuidad documental.

Backend: `feature/driver-verification`, HEAD
`b300c250df9fcc4aea8bcd76a1d6ed7c93e04e9a` **más correcciones sin commit**. Se leyó
`docs/DOCUMENT-DELETION-COMPATIBILITY-IMPLEMENTATION.md`, su handoff exacto,
OpenAPI, API_ACCESS, índice de evidencia y controllers/guards/servicios/proyección.
La base b300c25 no se tomó como prueba de presencia: el runner verificó rutas en
OpenAPI, el discriminante en el JS compilado, importó ese JS y ejercitó ambas rutas
por HTTP real. [Evidencia saneada con 13 SHA-256](deletion-compatibility-evidence.json)
incluye fuentes, artefactos compilados y versiones usadas; comprobación final de
huellas: 13 iguales, 0 cambios. No se recompiló ni modificó Backend.

Las 28 unitarias y 59 E2E del handoff son resultados **reportados por Backend**;
no se repitieron ni se cuentan como pruebas Web.

## Contratos y comportamiento

| Acción | Contrato | Aplicación en Web |
|---|---|---|
| Identidad de sesión | GET `/api/v1/auth/me?projection=session`, bearer actual | Login, bootstrap/restauración, refresh y revalidación de autoridad |
| Identidad estándar | `accessMode: STANDARD`, `identity` con campos públicos reales | Mantiene `User`, roles, navegación y reglas existentes |
| Identidad restringida | `accessMode: DELETION_RESTRICTED`, `identity:{id}`, `capabilities` exactas | Contexto separado; nunca inventa correo, rol, perfil ni permiso operativo |
| Recibo administrativo | GET `/api/v1/admin/privacy/deletion-requests/:id/commands/by-key/:key` | Sólo lectura explícita para SUPER_ADMIN iniciador; sin body ni cabecera de idempotencia |
| Recibo aplicado | `APPLIED`, requestId, key, recordedAt, result validado | Aceptación histórica mínima persistida; recibo completo sólo en memoria; refresca listado y consultas del folio |
| No disponible | 404 `COMMAND_RECEIPT_UNAVAILABLE`, también errores 401/403/5xx | Conserva marcador/incertidumbre; no inventa ABSENT, EXPIRED, fracaso o permiso de reenvío |

Se conserva la proyección completa para sus consumidores propios. Un 403 de esa
proyección no expira una identidad válida. Refresh sigue rotando el token mediante
el mecanismo anterior y ahora consulta una vez la identidad mínima; no agrega
authTime ni convierte refresh en reautenticación. Los 401 mantienen el límite de
un refresh; las mutaciones de baja siguen usando apiOnce, sin reenvío automático.
Los mensajes Nest REAUTH_REQUIRED/ACCOUNT_CLOSING se traducen desde `message`
conservando `code: HTTP_401/HTTP_403`; no se reclasifican como códigos de dominio.

El contexto restringido sólo monta `/privacy/deletion`, detalle por folio y
`/privacy/active-service`. Redirige las rutas administrativas, nuevos servicios,
asignaciones y expedientes al seguimiento. El canal `/privacy/deletion-access`
se muestra incluso mientras bootstrap está pendiente. Los datos privados se
limpian ante cambio de identidad/autoridad; las referencias inciertas permanecen
aisladas por entorno/cuenta. Consultas tardías abortadas no marcan como aceptado
un recibo de una cuenta anterior.

La resolución comprometida reutiliza `/driver/me`, detalle propio y release/deliver
existentes. La capacidad sólo permite consultar: las acciones requieren una
asignación independiente coincidente y las comprobaciones LEGACY ya existentes;
no cambia trackingMode ni implementa patches/transiciones alternativas. Flotilla,
modo no acreditado o endpoint denegado no habilitan esas acciones. El backend
conserva la autorización final. **La entrega/liberación comprometida no se ejecutó
en la integración real de esta tarea**; su denegación está cubierta con fixture.

Los marcadores previos se reutilizan: `{actor,key,op,id,accepted?}`. Para resolve,
retention-decisions y restore-policy, id es obligatorio. No se guardan body,
evidencia, motivos, contraseña, JWT ni recibos completos. Después de recargar se
consulta el GET, nunca se reconstruye ni repite el POST administrativo. Los enlaces
apuntan al detalle administrativo y no al privado del titular. El recibo puede
tener un snapshot histórico o los dos acknowledgments exactos del handoff; no se
deduce qué action de resolve ocurrió. CANCELLED y formas desconocidas se rechazan.
Cancelación y assisted-access siguen fuera de esta recuperación.

## Archivos de esta adaptación

- `src/auth/session.ts`, `AuthProvider.tsx`, `context.ts`, `Login.tsx`:
  discriminante validado, identidad restringida separada y renovación de contexto.
- `src/services/api.ts`, `errors.ts`: proyección mínima y mensajes Nest conservados.
- `src/app/App.tsx`: guards/rutas restringidas y canal privado independiente del
  estado de bootstrap; sin cambios a roles o permisos de negocio.
- `src/deletion/receipt.ts`, `service.ts`, `pending.ts`, `hooks.ts`, `pages.tsx`,
  `contract.ts`: recuperación GET, validación/proyección, actor, caché y revisión
  histórica separada. Revisión admite cero conforme al mínimo del contrato.
- `src/deletion/ActiveService.tsx`: superficie limitada del servicio comprometido,
  reutilizando clientes, componentes y condiciones existentes.
- Pruebas: api, invitations-api, verification-service, deletion-service,
  deletion-pages, session-compatibility y regresión de flows completa.
- `scripts/verify-deletion-compatibility.mjs`: runner acotado de navegador/HTTP/BD;
  documentación de continuidad y evidencia, sin dependencias nuevas.

## Integración real reproducida

El runner inició sólo el clúster propio detenido indicado en el handoff:
PostgreSQL 18, `127.0.0.1:55441`, directorio
`mandaria-backend/.tmp/compatibility-implementation/pgdata`. Verificó por SQL base,
host, puerto y data_directory antes de crear fixtures. Preservó los datos anteriores
y creó una base nueva a partir de **sólo el esquema** de
`deletion_compatibility_20261017_test` (`pg_dump --schema-only --no-owner
--no-privileges`): sin archivos de migración nuevos/modificados, sin ejecutar suites
ni cambiar .env. La base del recorrido aprobado es
`deletion_compatibility_web_1792219301750_test`; permanece para inspección.

Nest usa AuthController/AuthService, UsersService, guards, DTO, filtro HTTP y
controllers/servicio de baja **reales**, Prisma y PostgreSQL reales. El doble local
de almacenamiento se inyecta exclusivamente en el arnés; registró **0 operaciones**.
Correo capturado/no enviado, secretos efímeros en memoria. No arranca todo AppModule
ni aplica su throttling global; no acredita el dashboard completo ni producción.
Vite loopback4196, API loopback4195, envDir:false, sin .env; Chromium usa la Root real
de Web y HTTP sin mocks de respuestas. Se bloquean hosts externos.

### A — sesión: PASS real

Login restringido devuelve únicamente `identity.id`, Web conserva su seguimiento.
La proyección completa devuelve 403 sin logout; la operación de servicios disponibles
devuelve 403. Una URL operativa redirige al seguimiento. Recarga con refresh y
proyección mínima mantiene identidad, y el folio propio devuelve estado real.
El administrador estándar entra a su bandeja/detalle y puede ejecutar la decisión
autorizada de B. Contadores del navegador principal: 2 login, 4 refresh, 8 consultas
de proyección, 1 consulta completa deliberada, 2 GET de recibo; sin bucle ni pageerror.

### B — pérdida después del commit: PASS real

El administrador prepara y confirma REQUEST_IDENTITY_INFORMATION desde Web. El
arnés intercepta únicamente `res.json` de ese POST, cuando el servicio ya devolvió
de su transacción. **Antes** de destruir el socket, consultas independientes de BD
confirman un comando, un evento y delta de revisión 1. El proxy devuelve error de
transporte/500 a Web, que conserva el marcador incierto.

Tras recargar la página y restaurar la misma cuenta, el botón consulta la misma
clave con GET; no repite POST. Evidencia de cierre: **1 POST original, 1 comando
original persistido, 1 evento original**, recibo histórico revisión 2. Un segundo
comando distinto, explícito desde el arnés, avanza el estado actual a revisión 3;
el GET del primer recibo continúa mostrando 2. El otro administrador, en otro
contexto de navegador con login real, recibe **404 COMMAND_RECEIPT_UNAVAILABLE**
para ese mismo recibo. No se modifica retención ni se guarda un almacén alternativo.

El recibo **depurado** no se provocó contra la base real: su respuesta uniforme
404, errores y conservación del marcador se prueban de forma **simulada** en Vitest.
No se presenta esa prueba como purga integrada.

## Resultados, evidencia y límites

Comandos/resultados exactos en [VERIFICATION](../VERIFICATION.md), sección
2026-10-17. Evidencia saneada: [JSON](deletion-compatibility-evidence.json), sin JWT,
contraseña, clave de comando ni documentos. Capturas locales ignoradas por Git:
[restringido escritorio](../test-results/deletion-compatibility/restricted-desktop.png),
[seguimiento 320 px](../test-results/deletion-compatibility/restricted-followup-320.png),
[recuperación tras recarga](../test-results/deletion-compatibility/admin-recovered-after-reload.png).
Las dos últimas se inspeccionaron visualmente. El runner verifica foco inicial
del diálogo, etiquetas, errores, confirmación y ausencia de overflow horizontal.

Repetición: `node scripts/verify-deletion-compatibility.mjs` requiere el checkout
backend con los artefactos compilados del handoff y este clúster local identificado.
Cada ejecución crea/conserva una base nueva `_test`; no limpia datos anteriores.
No usar VM, base operativa ni credenciales de Spaces. La prueba no utiliza ni
acredita almacenamiento externo. El runner cierra navegador, Vite, Nest y conexiones
y detiene el clúster sólo si lo inició; se comprobó después que no hay servidor
PostgreSQL propio ni listeners4195/4196 activos.

Pendientes: resolución real de un servicio comprometido, catálogos y limitación
de 100 solicitudes de la API, recuperación de cancelación/asistencia no idempotente,
recibos depurados no recuperables. **Spaces sigue fuera de alcance, pendiente y
fail-closed.** Sin cambios de fuentes Backend, migraciones, permisos reales,
.env operativo, QA, main, commit, push, despliegue o activación.

## 2026-10-17 — C1/C2 desde navegador: BLOCKED en preflight

Nueva ejecución para recibo realmente depurado y entrega LEGACY bajo ACCOUNT_CLOSING. Ambos recorridos quedan **BLOCKED**; las acciones funcionales, PostgreSQL, HTTP auxiliar, móvil y teclado/foco quedan **NOT RUN**. No hay conteos nuevos de efectos ni estados finales comprobados. Los PASS HTTP backend y la compatibilidad Web anterior conservan exclusivamente su carácter histórico.

Se ejecutó completo `node scripts/verify-deletion-browser-smoke.mjs` y exactamente un diagnóstico adicional `node scripts/verify-deletion-browser-smoke.mjs --diagnostic`. Ambos terminaron exit 1 con reporte. El segundo acredita arranque de Chromium y navegación a /login en Vite loopback 4208, pero no encontró el botón de login en 10 segundos. No fue una terminación nativa sin reporte. No se atribuye este resultado al intento backend anterior, cuya causa sigue sin acreditarse.

**Error de preparación del arnés Web:** envDir:false sin inyectar VITE_API_URL, obligatorio según src/config/env.ts. Omisión comprobada por lectura; no se capturó pageerror para atribuir directamente el timeout a una excepción específica. No se acredita defecto de producto. Se detuvieron los intentos después del diagnóstico conforme al límite solicitado; no se cambió de herramienta. El script conserva la configuración ejecutada para reproducibilidad, no se presenta como runner aprobado.

No se arrancó backend/PostgreSQL, creó clúster/base, migró ni sembró; no hubo mutaciones ni finalize/maintenance/deliver. No hay captura o traza funcional: login nunca alcanzó el hito de captura. Vite y Chromium propios cerrados; puerto 4208 sin listener al comprobar cierre. Se conservan JSON de smoke/diagnóstico y caché Vite en test-results/deletion-browser-final (ignorado). No se detuvo ningún proceso ajeno.

[Evidencia saneada y huellas](deletion-browser-final-evidence.json): 13 archivos Web, 14 backend y arnés Web ejecutado. Trece huellas backend coinciden con el JSON histórico; difiere verify-deletion-final-contract.mjs, cuya huella final fue documentada por backend después de su ejecución. No se modificó backend. Cambios locales previos conservados, rama feature/driver-verification y HEAD Web 56c7bad/backend b300c25; el SHA base no representa esas implementaciones sin commit.

Validación adicional: node --check PASS. No pruebas de producto/build porque no se modificó producto; no se repitieron las 152 pruebas históricas. Sin QA, .env, correo/Spaces reales, commit, push ni despliegue.

Pendiente para una nueva ejecución: corregir configuración efímera del smoke suministrando origen API local, capturar pageerror saneado, acreditar preflight antes de crear clúster exclusivo y ejecutar ambos recorridos completos. No existe handoff de defecto backend: ninguno se ejercitó. Usuario informó backend Docker en puerto 43000; no se accedió ni se asumió que su base cumple el aislamiento requerido.


## 2026-10-17 — Reejecución autorizada: smoke PASS, aislamiento BLOCKED

Corregido VITE_API_URL en el arnés, mediante configuración efímera sin .env. Nueva ejecución completa de node scripts/verify-deletion-browser-smoke.mjs: exit 0, Chromium y login real PASS; captura revisada en test-results/deletion-browser-rerun/smoke-login.png. Reportes anteriores conservados en deletion-browser-final. Sintaxis PASS; formato aplicado después sin cambios funcionales. No pruebas de producto/build por ausencia de cambios de producto.

Inspección Docker autorizada y sólo lectura: backend mandaria-backend-1 publica 127.0.0.1:43000; apunta a postgres:5432/mandaria, con volumen persistente mandaria_postgres_data. MAIL_PROVIDER=resend; DOCUMENT_DELETION_LOCAL_ENABLED no está presente en el entorno del contenedor. No se acreditaron base exclusiva sintética, correo capturado ni almacenamiento simulado. No se consultaron datos ni ejecutaron mutaciones contra esta instancia. El acceso inicial al daemon falló por permisos del sandbox; la inspección elevada posterior sí terminó correctamente.

C1 recibo depurado y C2 entrega LEGACY: **BLOCKED por aislamiento**, no ejecutados funcionalmente; sin conteos nuevos ni estados finales acreditados. No es fallo de producto/backend ni persiste el bloqueo anterior de render. Pendiente ejecutar ambos en instancia exclusiva con datos sintéticos, correo/storage simulados y reloj inyectable del arnés aprobado; no basta con usar el puerto existente. No se alteraron contenedores, backend, .env, QA o datos. Vite/Chromium propios cerrados y puerto4208 libre. Sin commit/push.

Huellas, inspección saneada y resultados: [evidencia de reejecución](deletion-browser-rerun-evidence.json).

## 2026-10-17 — Instancia exclusiva: C1 PASS; C2 BLOCKED

Se preparó backend real AppModule desde el checkout existente, sin modificarlo, y PostgreSQL local en loopback55444. Directorio y base exclusivos por intento; identidad SQL comprobada antes de migrar/sembrar. La base final deletion_final_1792223093288_test recibió las42 migraciones existentes. Web4218 y API4217, configuración efímera sin .env. Docker43000 no se consultó ni alteró en esta ejecución.

Overrides de prueba conforme al arnés backend: correo capturado en memoria, DeletionStorageDouble, ruta local fija y DELETION_CLOCK inyectado. Sólo se omite el timer documental: finalize/maintenance son los métodos reales; guards, DTO, filtros, throttling y reglas SQL permanecen. No se contactó correo/Spaces/Google real ni se cambió el reloj del sistema.

### C1 — recibo realmente depurado: PASS

Preparación: usuarios sintéticos y solicitud ACCOUNT asistida mediante HTTP. Acción UI real: administrador inicia sesión, abre folio, selecciona IDENTITY_AND_AUTHORITY_VERIFIED, introduce referencia sintética y confirma por modal con checkbox/teclado. Middleware confirma en PostgreSQL un comando antes de destruir la respuesta; el proxy devuelve502. Marcador generado por Web, no sembrado.

GET auxiliar acredita recibo inicial. Finalize real sobre ámbito vacío registra H. Con reloj inyectado a auditUntil-1ms, maintenance conserva recibo y fechas; a auditUntil lo depura realmente. Sin borrar filas o cambiar fechas por SQL. Resultado: comandos1→0, eventos del folio0, PURGED, cuenta inactiva y un gate USER durable; mantenimiento repetido estable.

Tras navegar a Mis solicitudes y recargar, recuperación mediante botón y Enter: GET real404 COMMAND_RECEIPT_UNAVAILABLE. Texto observado: «El recibo no está disponible. Puede no haberse registrado todavía o haber sido depurado; el resultado sigue siendo desconocido. No envíes otra mutación.» Marcador idéntico, sin accepted ni clave nueva; sesión conservada, sin confirmación histórica falsa. Un único POST administrativo, sin reenvío. Capturas revisadas desktop1280 y móvil390, sin overflow horizontal; foco de botones comprobado. No se muestra estado actual como si fuese recibo recuperado.

### C2 — servicio comprometido: BLOCKED en el arnés

Preparación, separada de UI: provider/driver/perfil/unidad sintéticos; habilitación independiente por HTTP; políticas y recarga mediante helpers existentes; dos solicitudes B2B, cotización/aceptación y toma del primero por HTTP real. Sin assignment insertado ni triggers deshabilitados. Referencia documental pendiente sintética sin bytes para que H no se cierre por resolver logística.

Acciones UI acreditadas: login DRIVER inicialmente habilitado, apertura del servicio comprometido, solicitud ACCOUNT con contraseña y confirmación. POST202 seguido de GET /auth/me?projection=session200. El arnés exigía que apareciera login y agotó la espera de5s; esa expectativa es incorrecta como condición universal. No se capturó el body de esa proyección, por lo que no se atribuye un modo exacto ni defecto al producto. No se llegó a recarga restringida, entrega, pruebas de prohibiciones ni estado final de entrega. Cero POST deliver del navegador.

Comprobación posterior exclusivamente de lectura, identidad nuevamente verificada: baja ACCOUNT INVENTORY, confirmedAt presente, closedAt null; una asignación ACTIVE y dispatch CLAIMED, segundo OPEN. Cero DELIVERY_COMPLETED, un SERVICE_AWARD, cero SERVICE_REFUND; dos gates USER activos en total (C1+C2). Son estados parciales nuevos, no una entrega aprobada ni comparación completa de ledger/plazos después de entregar.

### Intentos, límites y cierre

Preparación inicial falló por alias Python no disponible; utilidad generada con Node antes de iniciar entorno. Primer run: health consultado bajo prefijo erróneo,404 y cierre sin mutaciones. Ruta real /health corregida por lectura de setup.ts. Segundo run: C1 avanzó hasta purga, pero una promesa de respuesta sin manejo oportuno abortó al buscar recuperación en listado administrativo en vez de Mis solicitudes; sin reporte final, no se acredita PASS de ese intento. Se identificó y detuvo sólo su clúster propio. Único diagnóstico adicional corrigió navegación/manejo de promesa: acreditó C1 y terminó con reporte al fallar la expectativa de login en C2. Se respetó el límite, sin nuevos intentos de navegador. El intento backend histórico conserva su causa desconocida; este fallo no se le atribuye.

Inspección final de sólo lectura corrigió receivedAt por createdAt en su consulta (error de utilidad, sin mutaciones). Archivo completo ejecutado después: PASS y clúster detenido. Cuatro utilidades nuevas verificadas con node --check PASS; no cambios de producto, por tanto sin suites/build nuevos. No se repiten pruebas históricas. No correcciones Web de producto ni handoff de defecto backend acreditado.

Fuentes backend:14 huellas sin cambios al cierre; Web y arneses actuales identificados en evidencia. Se conservan los tres directorios sintéticos test-results/deletion-isolated/1792222938899,1792223000348,1792223093288 y reportes previos. Backend/Web propios cerrados, clústeres propios detenidos. Sin QA, .env, datos reales, cambios backend, commit, push o despliegue.

Pendiente C2: en una nueva ejecución autorizada, consultar el modo de sesión real después del POST202 y sólo reautenticar si corresponde; luego recargar, entregar desde Web y verificar resultado visible, ledger/outbox, gates y H. No se puede declarar DELIVERED/COMPLETED con la evidencia actual.

[Evidencia saneada](deletion-isolated-evidence.json) incluye peticiones, conteos, hashes, capturas y límites; los reportes históricos permanecen intactos.

## 2026-10-17 — C2 retomado: entrega restringida PASS

Se corrigió únicamente el arnés: una proyección200 DELETION_RESTRICTED con resolución activa continúa sin exigir otra pantalla de login; sólo401 pide reautenticación.403 y proyección STANDARD no habilitan autoridad. Regresión determinista completa: cuatro casos PASS con node --test scripts/deletion-session-check.test.mjs. Sin cambios en producto Web ni backend.

Se retomó la base y asignación pendientes de la ejecución anterior: deletion_final_1792223093288_test, clúster propio55444. Identidad SQL (base, host, puerto y directorio) verificada antes de actuar. No se crearon otra baja, otro servicio ni otra asignación; no se migró ni repitió C1. Como la contraseña sintética previa no fue persistida, se rotó temporalmente sólo su hash para iniciar sesión real y se restauró al cerrar. Gates y fechas no se alteraron para preparar el caso.

Backend AppModule real, API4217 y Web4218; mismos doubles de correo capturado, almacenamiento y routing. Timer documental omitido; no se llamó finalize/maintenance en esta ejecución. Docker43000 intacto y no consultado. No credenciales reales, .env, Spaces, Google Routes ni correo real.

### Resultado nuevo acreditado

- Login Web real, recarga y GET /auth/me?projection=session200: identidad restringida, sin autoridad general. El arnés tomó CONTINUED_RESTRICTED, sin exigir otro login ni entrar en bucle.
- Servicio propio LEGACY visible en desktop1280 y móvil390; revisar entrega, checkbox y confirmación por teclado/foco. Un único POST deliver del navegador200, respuesta DELIVERED. Ninguna ruta DETAILED/GPS.
- PostgreSQL: Dispatch DELIVERED, DeliveryAssignment COMPLETED, exactamente un DELIVERY_COMPLETED. Ledger completo idéntico al anterior: un SERVICE_AWARD original y cero SERVICE_REFUND.
- Tras recarga, desaparecen las acciones de entrega y se mantiene la identidad restringida. Texto visible: «No hay resolución activa informada. Actualiza la identidad antes de continuar.» Es coherente con activeDeliveryResolution=false; **no es una constancia histórica de entrega ni muestra explícitamente DELIVERED**. Ese estado se acreditó por respuesta real y PostgreSQL, no se dedujo sólo de la ausencia de servicio activo. No se añadió almacenamiento paralelo de recibos ni acceso histórico no autorizado.
- Seguimiento de la baja desde UI y captura móvil: H pendiente; closedAt null. Deadline idéntico y gates completos idénticos. Constancia de baja409 auxiliar. Entregar no acreditó eliminación documental ni adelantó H.
- HTTP auxiliar, diferenciado de clicks UI: tomar segundo servicio403, entregar servicio ajeno403, consultar adjuntos403; prohibiciones de toma/documentos conservadas después. No se finalizó el servicio propio mediante API auxiliar.
- C1 no se repitió: sin POST administrativo ni GET de recuperación. Sus filas PURGED se compararon sólo por lectura y permanecieron idénticas. Su PASS anterior conserva su evidencia histórica, no se cuenta como otra prueba.

### Verificación y cierre

Archivo completo ejecutado: node C:/Users/zorgl/Documents/mandaria-backend/node_modules/tsx/dist/cli.mjs scripts/verify-deletion-delivery-resume.mjs, exit0 y PASS. Una ejecución integrada de C2, sin aborto ni diagnóstico adicional. Cuatro regresiones del arnés PASS; sintaxis de utilidades PASS. No suite/build de producto porque no hubo cambios de producto.

Capturas y reporte conservados en test-results/deletion-isolated/1792223093288/delivery-resume-1792223525761. Revisadas capturas de servicio móvil, estado posterior desktop y seguimiento móvil; aserciones de overflow horizontal en ambos estados y seguimiento PASS. Evidencia pública saneada con peticiones, hashes de Web/backend/arnés y límites: [deletion-delivery-resume-evidence.json](deletion-delivery-resume-evidence.json).

Cierre: navegador/API/Web propios cerrados, contraseña sintética restaurada, PostgreSQL detenido (pg_ctl status3) y sin listeners4217/4218/55444.14 huellas backend y7 Web sin cambios; historial y modificaciones previas preservados. Sin código backend, Docker43000, QA, commit, push ni despliegue. C1 PASS histórico más C2 PASS nuevo cierran estos recorridos de integración local con la limitación de presentación posterior indicada; no acreditan borrado real en Spaces ni aptitud productiva.

## 2026-10-17 — Validación exclusiva nueva: recibo depurado en navegador PASS

Esta ejecución cubre únicamente recuperación administrativa tras depuración real. No repite entrega ni reutiliza sus cifras como evidencia nueva. Rama feature/driver-verification, HEAD Web56c7bad0524cbbf05b45fa687a8ec625694a6ca0 y backendb300c250df9fcc4aea8bcd76a1d6ed7c93e04e9a más cambios locales conservados. Worktrees verificados, sin cambio de rama; AGENTS.md ausente en Web. Leídos continuidad, informes, contratos y arneses backend en modo lectura.

### Entorno y preparación

Clúster nuevo exclusivo test-results/deletion-isolated/1792223822827/pgdata, loopback55444 y base deletion_final_1792223822827_test. Host/puerto/directorio comprobados y, adicionalmente, nombre de base destino verificado por SQL antes de migrar o sembrar. Procedimiento existente de migraciones y AppModule real; no cambios backend ni .env. Web4218/API4217. Primero smoke de login, health200 y escritura de preflight.json PASS.

Preparación declarada: tres usuarios sintéticos (dos administradores y titular sin expediente/servicio) y solicitud ACCOUNT asistida por HTTP auxiliar. Correo capturado en memoria, DeletionStorageDouble y routing local fijo. Guards/DTO/filtros/throttling reales. Sólo timer documental omitido para invocar finalize/maintenance reales de forma controlada. No Docker43000, servicios ajenos, Spaces, Google ni correo reales.

### Acciones reales y efectos

Administrador inicia sesión en Web, abre el folio, elige IDENTITY_AND_AUTHORITY_VERIFIED, introduce evidencia sintética y confirma el modal con checkbox y teclado. El arnés verifica en PostgreSQL el comando confirmado antes de cortar la respuesta; Web observa502 del proxy y conserva su marcador original generado por la aplicación (no sembrado).

Antes de purga:1 comando,1 evento de esa decisión,1 evento RESTRICTED y1 gate USER activo; confirmedAt presente. Son tipos de eventos distintos de una sola operación, no duplicados ni un supuesto único evento total. GET auxiliar del recibo200. Marcador comprobado por actor, folio, operación resolve y clave original; no se publica su clave ni payload.

Finalize real cierra el ámbito vacío. DELETION_CLOCK avanza primero a auditUntil−1ms y maintenance conserva el recibo; dos GET auxiliares devuelven contenido idéntico sin alterar plazo. En auditUntil=H+30 días, maintenance real depura: comandos1→0, eventos documentales0 y solicitud PURGED, cuenta inactiva y gate durable. No DELETE manual ni UPDATE de fechas; reloj del sistema intacto. Maintenance repetido conserva fila/gate.

Web navega a Mis solicitudes y recarga, perdiendo memoria. Botón de recuperación con foco/Enter ejecuta GET real con folio y clave originales:404 COMMAND_RECEIPT_UNAVAILABLE. Se verificó la ruta exacta en memoria contra el intento original, sin imprimir claves. Un GET nuevo del navegador; POST administrativo antes/después de recargar:1/1. Marcador idéntico, sin accepted ni clave nueva, sesión preservada y ausencia de confirmación histórica falsa. Estado durable idéntico después de consultar; no se recrean comandos ni efectos.

Texto observado: «El recibo no está disponible. Puede no haberse registrado todavía o haber sido depurado; el resultado sigue siendo desconocido. No envíes otra mutación.» No atribuye fracaso ni inexistencia de efectos. Sin vista de recibo recuperado ni confusión con estado actual. Consulta sigue disponible; no botones de reintento, cancelación o cierre técnico inventado. Se conserva la referencia y el acceso a consulta de folio.

### Visual, verificación y cierre

Misma solicitud revisada en1280×800 y390×844: mensaje legible, sin overflow horizontal, capturas saneadas revisadas. Foco verificado en confirmación/consulta, activación con Enter y navegación Tab fuera de consulta. Una sola ejecución completa del nuevo scripts/verify-deletion-receipt-only.mjs: exit0/PASS, sin aborto ni diagnóstico. Sintaxis del arnés y helper de entorno PASS. Cambios sólo arnés especializado, comprobación adicional de identidad de base y documentación; sin correcciones de producto, suites ajenas ni build innecesario.

[Evidencia saneada nueva](deletion-receipt-only-evidence.json): SHA/huellas utilizadas, reloj, peticiones, conteos y capturas en test-results/deletion-isolated/1792223822827.14 hashes backend y7 Web sin cambios. Temporales sintéticos y reportes históricos conservados. API/Web/navegador propios cerrados; PostgreSQL detenido (status3), sin listeners4217/4218/55444. Sin entrega, cambios backend, Docker43000, QA, commit, push ni despliegue.

Alcance: una decisión administrativa sobre ámbito documental vacío y comportamiento ante404 uniforme. No acredita eliminación en Spaces ni aptitud productiva. La UI no distingue un recibo depurado de otras causas de indisponibilidad; conserva correctamente la incertidumbre.

## 2026-10-17 — Revisión y preparación de publicación de la feature

Checkout vigente C:/Users/zorgl/Documents/mandaria-frontend, feature/driver-verification, HEAD56c7bad0524cbbf05b45fa687a8ec625694a6ca0. Origin https://github.com/zorgoluis/mandaria-frontend.git; fetch dirigido y comparación inicial0/0. W-01 y verificación documental ya publicados en56c7bad; no se duplican. Revisados diff de producto/pruebas, archivos nuevos, arneses, JSON y continuidad; cambios pendientes propios de baja/seguimiento. Sin hunks ajenos identificados. Worktrees y temporales ajenos conservados; AGENTS.md ausente en este checkout.

Huellas históricas contrastadas: entrega,7/7 fuentes Web y4/4 archivos de arnés; recibo depurado,7/7 fuentes Web y4/4 arneses. Coinciden íntegramente, sin cambios funcionales posteriores relevantes; ninguno de esos recorridos se repitió. El helper de entorno incorporó posteriormente una comprobación adicional de identidad de destino, acreditada en la ejecución del recibo; no cambia la entrega retomada. Evidencia histórica reutilizada expresamente, no contada como nueva.

Verificación nueva para el snapshot a publicar: siete archivos focalizados completos152/152 PASS (api, invitations-api, verification-service, deletion-service, deletion-pages, session-compatibility y flows); cuatro pruebas completas del arnés de sesión PASS; tipos de pruebas PASS; lint pertinente PASS; build incluye tsc -b y Vite PASS. Se repitió esta validación local porque los reportes anteriores de tipos/build/pruebas no aportaban un manifiesto completo de huellas del snapshot actual. No suite general ni backend. Advertencia de chunk Root695.31kB >500kB conservada, no silenciada.

Revisión de inclusión: sin .env, JWT reales, credenciales, claves privadas, URLs firmadas, datos de negocio reales, node_modules, dist, perfiles o trazas/logs crudos. Fixtures de credenciales son literales sintéticos o valores aleatorios sólo en memoria. Evidencia JSON saneada y metadatos de entornos locales; capturas y bases sintéticas siguen locales e ignoradas, no se añaden al commit. Sintaxis de todos los arneses candidatos y parseo JSON PASS. git diff --check PASS; índice explícito por archivos, sin git add general.

Reproducción: verify-deletion-receipt-only crea clúster/base nuevos con dependencias backend locales existentes y nunca entrega servicios. verify-deletion-delivery-resume requiere el clúster sintético documentado y una asignación ACTIVE pendiente; no es un comando para repetir una entrega ya completada. Rutas locales de los arneses reflejan el entorno acreditado. verify-deletion-isolated y scripts anteriores preservan historia de diagnóstico; no se presentan como ejecuciones integrales aprobadas de su contenido actual. No reejecutarlos indiscriminadamente ni usar una base desconocida.

Se preparan dos commits coherentes: producto/pruebas de baja y sesión; arneses/documentación/evidencia. Se verificará de nuevo la referencia remota inmediatamente antes del push normal, con refspec exclusivo de feature/driver-verification. Esta entrada registra revisión previa, no anticipa éxito del push. No merge, rebase, QA, main, cambios/publicación backend, App/Landing o despliegue.

Límites vigentes: constancias parciales; drenaje real en Spaces pendiente, sin eliminación total ni aptitud productiva. Tras entregar, UI informa que no hay resolución activa, sin constancia histórica explícita de entrega. Revisión y manifiesto de huellas: [deletion-publication-review.json](deletion-publication-review.json).

Revisión final del índice: diff --cached --check detectó líneas vacías sobrantes al final de deletion-isolated-browser.mjs. Se retiraron únicamente esas líneas; contenido ejecutable idéntico. Huellas original/publicable reconciliadas en deletion-publication-review.json, sin reescribir evidencia histórica. Sintaxis y cuatro pruebas del helper comprobadas; no repetición de entrega/recibo por ausencia de cambio funcional.
# Actualización operativa V2 — 2026-10-18

Adaptación vigente documentada en [handoff V2](DOCUMENT-DELETION-V2-WEB.md).
Mantiene projection=session, 403 sin cierre indiscriminado, canal privado,
servicio comprometido LEGACY, marcadores mínimos y recuperación administrativa
GET original. Recibos históricos no sustituyen situación vigente. Las mutaciones
V2 recuperables usan resolve; no se repite POST ante pérdida. CANCELLED no está
en commandSnapshot backend: decisiones administrativas de esa solicitud quedan
en lectura hasta disponer de recuperación segura. No se inventa soporte.

91 pruebas Web focalizadas nuevas del snapshot actual; navegador sintético en
1280/320, tipos, lint y build. Detalle y ejecuciones históricas diferenciadas en
VERIFICATION y `deletion-v2-web-evidence.json`. No se repitieron la entrega real
restringida ni la depuración real del recibo; sus evidencias quedan intactas.
No backend/DB/Docker43000, QA, commit, push ni despliegue. Constancias parciales,
Spaces real pendiente y sin aptitud productiva.

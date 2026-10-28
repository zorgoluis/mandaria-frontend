## 2026-10-26 — Revisión final y commit local QA de MDR-000001

Diff revisado sobre QA5173644: supervisor local de preparación, evidencia UI de reclamo/asignación, dos muestras GPS y continuidad. Sin cambios de producto, dependencias, configuración ni versión (Web1.11.0). Las menciones históricas «pendiente»/«sin commit» describen sus etapas originales; este commit incorpora el cierre posterior sin sobrescribirlas.

Revisión NUEVA: sintaxis Node, ESLint y Prettier del supervisor PASS; seis hashes históricos coinciden; seis copias GPS coinciden byte a byte con fuentes Driver/Coita; correlación de ambas muestras y los dos POST de negocio (claim200/assignment201) verificada. Capturas revisadas visualmente, registros sin credenciales/tokens. No se repitieron HTTP operativo, GPS, suite global, tipos ni build; sus cifras anteriores siguen históricas. Sin hallazgos nuevos de producto. Primera comparación nominal GPS indeterminada se conserva como limitación.

Evidencia GPS ahora autocontenida bajo docs/evidence/reserved-assignment-20261026/: coita-sample{1,2}-map.png, coita-sample{1,2}-observation.json y driver-sample{1,2}.jsonl. review-manifest.json registra origen, SHA256, correlaciones y alcance. Sólo datos sintéticos. Sin backend/móvil modificados, push o despliegue; no nuevas muestras ni hitos.

## 2026-10-26 — Acuse final del cierre GPS Driver

Responsable Driver confirma GPS detenido, servicio Android ausente y cierre exclusivo del AVD5582, conservando datos; Coita/servidores intactos. Muestra2: accuracy5m/delta0.173m reportados por Coita; muestra1 indeterminada por falta de coordenadas/accuracy conservadas. Sin nuevas capturas ni hitos. Detalle añadido al handoff PROVIDER-INTERACTIVE-LOCAL-20261026.md; PICKED_UP revisión4 intacto. Sin nuevas pruebas Web, commit/push o despliegue.

## 2026-10-26 — MDR-000001: PICKED_UP y dos muestras observadas

Web reclamó/asignó el pedido reservado a Ana/fleet1; Driver avanzó por UI real a PICKED_UP revisión4 (2026-10-27T04:47:35Z) y publicó dos posiciones simuladas mediante LocationManager/FGS. Coita capturó ambos marcadores/tiles RECENT: locationVersion="11"→"12", publicVersion="13", assignmentGeneration="4". capturedAt/receivedAt UTC:04:48:16.343/04:48:30.685 y04:51:49.530/04:52:03.342. Segunda enviada tras acuse/readiness de primera. GPS detenidoUI; asignación ACTIVE, sin completion.

[Handoff y evidencia](docs/PROVIDER-INTERACTIVE-LOCAL-20261026.md) conserva correlaciones, versiones de APK, fuentes Driver/Coita y límites. Segunda posición coincide nominal dentro1m; primera diferencia exacta sin causa acreditada. No se declara borrado por expiración, dispositivo físico, replay ni suite global nueva. Android atribuido a responsables. Web1.11.0/QA5173644 intactos, sin producto, commit/push o despliegue; historia/cambios previos conservados.

## 2026-10-26 — Pedido reservado reclamado y asignado por UI

Nueva autorización humana ejecutada: cadena checkout a6764b7a-b75c-4578-ba82-562df3fe9001→pedido cb9609f4-c9b5-40a3-8dce-148f1aa9db2d→intento4e86bc19-3bfa-4a6a-8502-62f2697aaa03→MDR-000001/MQ-000001→dispatch7e9272b5-10ca-4ceb-b1c1-3fbf78cbf632 comprobada por responsables antes de reclamar. UI claim20004:40:07.525Z y assignment20104:40:33.972Z; Ana/fleet1, ADMIN_DISPATCH. GET Web/Driver confirma assignment0aebcbc2-b8e1-45f2-b6c1-2c9c190f0ee9 ACTIVE; ejecuciónrev1 sin hito al asignar. Costo mostrado4créditos, envío55MXN CASH/RECIPIENT y comida PREPAID separados.

Handoff docs/PROVIDER-INTERACTIVE-LOCAL-20261026.md y captura/tráfico sanitizado docs/evidence/reserved-assignment-20261026/. Revisión automática inicial rechazó reclamo por externalReference distinta; resuelto mediante lectura de la cadena real, sin bypass. Driver/Coita coordinados para PICKED_UP y dos muestras LocationManager/FGS; muestras aún pendientes al registrar esta entrada. Sin nuevos tests de código, servicios reiniciados, flags, versión, commit/push ni despliegue. Historial conservado.

## 2026-10-26 — Handoff reservado/GPS: lectura21:31 México

Web5173 HTTP200, supervisor Mandaria56597 ready/PID41072; health404 no se interpreta como caída. Coita65397 ECONNREFUSED. Sin sesión UI disponible para revalidar datos privados. No hay asignación reservada acreditada en evidencia Web: MDR/dispatchId/assignmentId/orderId/fase y ACTIVE vigente pendientes. Datos UI originales históricos. Driver21:16 informó401/contexto, sin asignación y cero muestras; no es una comprobación nueva de Web. Dos muestras LocationManager/FGS PENDIENTES.

Actualizado docs/PROVIDER-INTERACTIVE-LOCAL-20261026.md con correlaciones, requisitos y límites. Sólo lecturas/status y documentación frontend; sin login, reinicios, mutaciones, GPS por script, flags, credenciales, FCM, mensajes externos, backend/App, commit/push ni despliegue. Historial preservado.

## 2026-10-26 — Web local preparada; reclamo/asignación pendientes

QA 5173644, Web1.11.0, árbol inicial limpio. Preview de build nuevo en localhost:5173, API efectiva127.0.0.1:56597/api/v1 comprobada en navegador real. Login PROVIDER_ADMIN, proveedorA, ADMIN_DISPATCH, conductores/vehículos y saldo100 verificados; lista de servicios disponibles vacía. Ana activa pero Desconectado; fleet1 activa y sin asignar. Sin despacho reservado/dispatchId confirmado: no reclamo, asignación, cargo, cancelación ni entrega. Handoff requiere recorrido Coita MPQ→conversión→consentimientoMQ→aceptación y revisión de elegibilidad del conductor.

NUEVO:143/143 regresiones con mocks en6archivos, tipos producto/tests, lint global, build aislado y sintaxis/lint supervisor PASS; warning chunk>500kB conservado.35 registros HTTP sanitizados, sin4xx/5xx, distintos de pruebas con mocks. No aceptación integral ni reejecución de cifras históricas. Frontend PID21788 queda encendido; backends intactos. Sin defectos nuevos de producto; sólo supervisor/evidencia/documentación, sin versión/commit/push/despliegue. [Informe y comandos](docs/PROVIDER-INTERACTIVE-LOCAL-20261026.md), [manifiesto](docs/provider-interactive-local-evidence.json). Historial inferior conservado.

## 2026-10-26 — Revisión y commit separado QA de aprobaciones

Diff final revisado sobre QA f3ae9c8, conservando el commit de sincronización1.13.3/B2B. Se incorpora el harness de revocación, replay, invalidación material y nueva propuesta con dos votos, junto con informes, evidencia HTTP y continuidad. Las9 huellas previas coinciden; informe16/16 completo, cero errores de navegador, backend sin cambios y entorno cerrado. Sin hallazgos ni correcciones adicionales.

Se reutilizan explícitamente las ejecuciones HTTP16/16 y regresiones93/93 de la verificación original; no se reejecutan durante esta revisión. La ausencia de TTL temporal sigue documentada y no se presenta como expiración probada. Commit local autorizado ahora; las menciones anteriores «sin commit» describen sus etapas originales. Web1.11.0 intacta; sin backend/móvil, push ni despliegue. Historia preservada.

## 2026-10-26 — Revisión y commit QA de sincronización 1.13.3/B2B

Diff revisado sobre QA 8dc67e6: metadatos públicos1.13.3, fuentes regenerables del paquete, evidencia y compatibilidad. Las24 huellas de sincronización y el ZIP coinciden; las9 huellas de aprobaciones pendientes permanecen intactas. Sin hallazgos ni correcciones adicionales. Se conservan los resultados recientes118/118,10/10, tipos/lint/build y navegador local; no son nuevas ejecuciones de esta revisión.

Commit local autorizado exclusivamente para sincronización/B2B. Harness, informes, evidencia HTTP y entradas de continuidad de aprobaciones se dejan pendientes mediante selección parcial de los documentos compartidos. ZIP local ignorado, sin envío/publicación; Web1.11.0 intacta, sin push ni despliegue. Las menciones previas «sin commit» describen sus etapas originales.

## 2026-10-26 — Sincronización documental backend 1.13.3

QA 8dc67e6, Web 1.11.0 intacta. Backend QA f2f942e046901551f4e4d144479d6b5bbeac0014/1.13.3 coincide con la entrega Git indicada; no acredita servicio remoto ni despliegue. Comparación canónica: OpenAPI público Web1.13.1→1.13.3 y backend interno/público1.13.2→1.13.3 sólo difieren en info.version. Schema administrativo idéntico; no se rehacen las siete secciones, movementContext ni asistencia, y no se integra FCM Android en Web.

Actualizados OpenAPI público/manifiesto mediante sync existente, textos del paquete y fecha del generador. ZIP local .tmp/b2b-integrator-package-2026-10-26.zip: 11 archivos permitidos, SHA256 a914ace0310c2afa17afde9974ec731f2d75a9fc7e1b4d299be281a2ec6e69c4. Extracción real, hashes, allowlist, enlaces y bytes deterministas PASS. Fuera de public/dist, ignorado por Git; paquete anterior conservado, sin envío.

Ejecuciones NUEVAS: comparación y sync --check PASS; 10/10 tests Node de paquete/rutas; 118/118 Vitest en5 archivos (25 portal+93 asistencia),10.61s; tipos/lint/build PASS; navegador local16 recorridos/10 descargas, cero errores/peticiones externas o API; formato script/manifiesto y whitespace PASS. Prettier OpenAPI señala formato ya presente en HEAD1.13.1: ambos logs conservados, se respeta la copia autorizada exacta. Aviso previo chunk>500kB persiste. Sin fallos nuevos funcionales.

[Informe, comandos, límites y paquete](docs/BACKEND-1.13.3-WEB-SYNCHRONIZATION.md); evidencia nueva docs/evidence/backend-1133-sync-2026-10-26/ y manifiesto docs/backend-1133-sync-evidence.json. Global1597 y HTTP16 anteriores HISTÓRICOS, no reejecutados porque no cambió comportamiento. Revocación/invalidez material probadas, TTL temporal ausente y distinto de expiración del cursor. Las nueve huellas de evidencia de aprobaciones pendiente permanecen intactas. Historial y cambios ajenos preservados; sin backend/App, dependencias/.env/flags, versión, Docker, commit/push, publicación o despliegue.

## 2026-10-26 — Revocación e invalidación de aprobaciones ASSISTED_RELEASE

Sobre QA 8dc67e6, Web 1.11.0 intacta, se amplía sólo el harness UNREACHABLE/NEW_ACTION. HTTP real NUEVO: revocar el segundo voto devuelve DRAFT/count=1; replay exacto estable; APPLY rechaza APPROVALS_REQUIRED sin efectos. Repetir el voto del otro actor no reemplaza el revocado. Reaprobar explícitamente restablece READY. Una contribución material por API invalida la propuesta: STALE/PROPOSAL_STALE sin efectos. Nueva propuesta exige dos votos nuevos; aplicación LIBERADO, recibo/replay y un único reembolso.

Bloqueo concreto: la aprobación no tiene TTL en OpenAPI/DTO, tabla AssistanceApproval ni votes/barrera SQL del backend 1.13.3. No se puede acreditar expiración temporal inexistente; no se alteraron relojes ni registros para simularla. Invalidación material y expiración de cursor no equivalen a caducidad del voto. [Contrato, recorrido y límites](docs/ASSISTED-RELEASE-APPROVAL-LIFECYCLE-HTTP.md).

Ejecuciones NUEVAS: node scripts/verify-admin-references-http.mjs, **16/16 grupos HTTP PASS** (aserciones ampliadas dentro de UNREACHABLE), cero errores de navegador, 65 migraciones, cursor expirado tras cinco minutos reales, cierre confirmado y fuentes backend sin cambios. Backend QA f2f942e, 1.13.3, copiado y compilado en entorno sintético aislado. Primer sondeo /health encontró ECONNREFUSED durante el arranque; el readiness posterior y el recorrido completo pasaron, sin cambiar tiempos.

Regresiones NUEVAS: npx vitest run src/test/admin-references.test.tsx src/test/admin-reference-access.test.tsx src/test/assistance.test.tsx src/test/assistance-api.test.ts, **93/93 PASS, 4 archivos, 7.31 s**. Sintaxis y Prettier PASS. Sin fallos de producto que corregir. Global1597/tipos/lint/build del pase conjunto anterior son HISTÓRICOS, no reejecutados. Evidencia en docs/evidence/approval-lifecycle-2026-10-26/ y manifiesto docs/approval-lifecycle-web-evidence.json.

Propuesta inicial en Web; sustituta, revisiones y aplicación por HTTP. No acredita UI Android ni llamadas humanas. Permanecen límites de otros proofSource, pérdida de rol/actividad de aprobadores y custodia/economía. Backend/móvil, versión, dependencias/configuración/.env intactos; cambios ajenos backend preservados. Sin Docker, datos reales, commit/push ni despliegue. Historia inferior preservada.

## 2026-10-26 — Revisión y commit local QA de la verificación conjunta

Diff final revisado sobre QA 5924964: sólo logs, manifiesto y continuidad de EXISTING_RELEASE, ACCESS_RECOVERED y UNREACHABLE. Las cuatro huellas SHA-256 coinciden y los logs respaldan 1597/1597 pruebas en 79 archivos, tipos/lint/build PASS. Sin hallazgos ni correcciones adicionales; aviso conocido de chunk >500 kB.

Se reutilizan las ejecuciones de la verificación conjunta inmediatamente anterior; no se ejecutaron nuevamente durante esta revisión. HTTP permanece histórico. Commit local autorizado ahora por el usuario; las menciones anteriores «sin commit» y commitCreated=false describen la etapa de ejecución. Web 1.11.0 intacta; sin cambios de producto, backend/móvil, push o despliegue. Historial preservado.

## 2026-10-26 — Verificación conjunta QA de las tres variantes de asistencia

Ejecuciones NUEVAS sobre QA `59249641962c6074e817e2277a98e4d3af540515`, con árbol inicial limpio y Web **1.11.0**: incluye EXISTING_RELEASE `79e938d`, ACCESS_RECOVERED `f52b782` y ASSISTED_RELEASE/UNREACHABLE `5924964`. AGENTS.md no existe en el repositorio ni en los ancestros consultados; continuidad y documentación actuales leídas.

- `npm test`: **1597/1597 PASS, 79/79 archivos**, 110.08 s, salida 0.
- `npm run typecheck:test`: PASS, salida 0.
- `npm run lint`: PASS, salida 0.
- `npm run build`: PASS, salida 0; conserva el aviso conocido de chunk >500 kB.

Suite global completa, sin omisiones ni cambios de permisos, configuración, concurrencia o tiempos. Se ejecutó fuera del sandbox por el ENOENT de temporales documentado anteriormente; no hubo fallo nuevo ni corrección necesaria. Tipos/lint/build ejecutados en el entorno habitual. Logs nuevos en `docs/evidence/qa-assistance-combined-2026-10-26/`; comandos, commits y huellas en [manifiesto conjunto](docs/qa-assistance-combined-evidence.json).

HTTP no se reejecutó en esta tarea: los informes previos de EXISTING_RELEASE (14), ACCESS_RECOVERED (15) y UNREACHABLE (16, incluye las tres variantes) permanecen históricos, sin atribuirlos a esta ejecución global. Las pruebas Web con mocks no acreditan nuevas llamadas Nest/PostgreSQL ni UI Android. Continúan los límites de cobertura exhaustiva de proofSource, expiración/revocación de aprobaciones, custodia/economía y operación remota descritos en los informes HTTP.

Sin cambios de producto, harness, versión, dependencias, backend o móvil; sin commit/push ni despliegue. Sólo evidencia y continuidad nuevas; historial inferior preservado.

## 2026-10-25 — Revisión y commit local QA de UNREACHABLE

Diff final revisado sobre QAf52b782: ASSISTED_RELEASE/NEW_ACTION/UNREACHABLE con inventario y doble aprobación, corrección del harness que reutiliza sesiones existentes, evidencia y continuidad. Las15 huellas previas coinciden; HTTP16/16 completo, cero errores de navegador, backend sin cambios por el harness y entorno cerrado. Dos sesiones de la misma identidad no suman dos votos; dos administradores distintos habilitan la aplicación y el replay conserva un único reembolso. Sin correcciones adicionales en esta revisión.

Se reutilizan explícitamente las ejecuciones recientes HTTP16/16 y regresiones93/93, sintaxis/formato PASS; no se reejecutaron ahora. Global1597 y tipos/lint/build anteriores siguen históricos. Backend utilizado1.13.3/f2f942e por trabajo ajeno, Web1.11.0 intacta. Commit local autorizado por el usuario; las menciones anteriores «sin commit» describen sus etapas originales. Sin backend/móvil, push ni despliegue; historial preservado.

## 2026-10-25 — ASSISTED_RELEASE UNREACHABLE con doble aprobación

Sobre QA f52b782 y Web1.11.0 intacta, se completa HTTP local de ASSISTED_RELEASE/NEW_ACTION/UNREACHABLE. Nueva asignación ACTIVE obtenida por Fleet TAKE; ORIGIN verificado con cuatro confirmaciones; constancia DRIVER UNREACHABLE vigente; inventario positivo. Sin constancia de no localización, el inventario se rechaza COUNTERPARTY_UNVERIFIED. La propuesta preparada en navegador exige dos votos: cero/uno rechazan APPLY; otra sesión de la misma identidad sigue contando uno. Segundo SUPER_ADMIN distinto produce READY; aplicación HTTP deja LIBERADO, asignación CANCELLED, dispatch OPEN y un solo reembolso. Consulta del intento y replay exacto conservan recibo; aplicar con nueva clave rechaza PROPOSAL_STALE sin duplicar efectos. No se registra un Fleet RELEASE adicional.

HTTP NUEVO `node scripts/verify-admin-references-http.mjs`: **16/16 PASS**, cero errores de navegador,65 migraciones, cursor expirado tras cinco minutos reales y cierre Nest/PostgreSQL confirmado. Incluye nuevamente ACCESS_RECOVERED y EXISTING_RELEASE/CONTACTABLE. Backend realmente ejecutado: QA `f2f942e046901551f4e4d144479d6b5bbeac0014`, paquete1.13.3 por trabajo ajeno;379 huellas coinciden con la copia compilada. Las15 fuentes de asistencia son iguales a la evidencia anterior1.13.2. No se restauró checkout ni se amplió alcance a FCM. Cambios ajenos BITACORA.md, docs/OFFER-FCM-DRIVER-AGENT-PROMPT.md y nul preservados.

Corrección del harness: primer ensayo HTTP429 por login adicional para segunda sesión. Se usan las sesiones ya creadas por API/navegador, sin ampliar límites de autenticación, relajar permisos o tiempos. Informe fallido conservado con cierre confirmado. Regresiones NUEVAS `npx vitest run src/test/admin-references.test.tsx src/test/admin-reference-access.test.tsx src/test/assistance.test.tsx src/test/assistance-api.test.ts`: **93/93 PASS,4 archivos**,8.40s. Sintaxis Node de los tres scripts y Prettier PASS. Global1597 y tipos/lint/build anteriores permanecen HISTÓRICOS, no se reejecutaron; no hubo cambios de producto.

Evidencia y fallos separados en `docs/evidence/unreachable-release-2026-10-25/`; manifiesto `docs/unreachable-release-web-evidence.json`; [recorrido y límites](docs/ASSISTED-RELEASE-UNREACHABLE-HTTP-VERIFICATION.md). Propuesta/lectura final en navegador; inventario, revisiones y aplicación por HTTP; actas humanas sintéticas. Se completa UNREACHABLE/NEW_ACTION con doble aprobación, sin afirmar matriz exhaustiva de proofSource, revocaciones/expiraciones, custodia o economía, llamadas reales, UI Android o disponibilidad remota. Sin backend/móvil, cambio de versión Web, dependencias/configuración/.env, Docker, commit/push ni despliegue. Historial preservado.

## 2026-10-25 — Revisión y commit local QA de ACCESS_RECOVERED

Diff final revisado sobre QA79e938d: harness ampliado hasta aplicación ACCESS_RECOVERED, consulta del recibo mediante receipt.result, replay y controles de sesión/servicio, evidencia y continuidad. Las 13 huellas previas coinciden; HTTP15/15 completo, sin errores de navegador, backend intacto y entorno cerrado. Una resolución, sesión vigente y asignación ACTIVE sin efectos físicos/económicos nuevos. Sin correcciones adicionales durante esta revisión.

Se reutilizan explícitamente las ejecuciones recientes HTTP15/15 y regresiones93/93, sintaxis/formato PASS; no se reejecutaron ahora. Global1597 y tipos/lint/build anteriores permanecen históricos. Commit local autorizado por el usuario, incluyendo evidencia fallida y final separadas. Las menciones anteriores «sin commit» describen sus etapas originales. Web1.11.0 intacta; sin backend/móvil, push o despliegue. Historial preservado.

## 2026-10-25 — ACCESS_RECOVERED aplicado y verificado por HTTP local

Sobre QA79e938d, Web1.11.0 intacta. Se amplía el harness existente: login DRIVER sintético posterior a la apertura, sesión seleccionada por newSessionId, propuesta Web con evidencia/identidad verificadas, rechazo APPROVALS_REQUIRED antes de revisión, aprobación por segundo SUPER_ADMIN y aplicación HTTP. El recibo devuelve ACCESO_RECUPERADO, la propuesta APPLIED; consulta del intento y replay exacto conservan el mismo resultado. GET y refresco Web confirman el estado. Una sola resolución; asignación ACTIVE con endedAt=null, dispatch/ejecución sin cambio, cero liberaciones y reembolsos; sesión vigente del conductor con refresh emitido desde la apertura y /driver/me200 antes/después. Tokens sólo en memoria, no en evidencia.

HTTP NUEVO: `node scripts/verify-admin-references-http.mjs` **15/15 PASS**, cero errores de navegador,65 migraciones, expiración real del cursor tras cinco minutos y cierre Nest/PostgreSQL confirmado. Incluye nuevamente EXISTING_RELEASE/CONTACTABLE sin duplicar efectos. Backend QA `204d4f712fb150f872e006a891595f8d64b6a2c7`,1.13.2,377 fuentes comprobadas; runtime compilado desde copia actual, no dist viejo. Cambios documentales ajenos backend (BITACORA, VERIFICATION, documentos OFFER-FCM y nul) preservados.

Único fallo nuevo: aserción del harness leía result directamente en la consulta de intentos; el contrato devuelve receipt.result. Se corrigió sólo el harness, se conservó el informe fallido y se repitió completo. Sin correcciones nuevas de producto ni backend. Pruebas NUEVAS: `npx vitest run src/test/admin-references.test.tsx src/test/admin-reference-access.test.tsx src/test/assistance.test.tsx src/test/assistance-api.test.ts` **93/93 PASS,4 archivos**,5.43s; sintaxis Node de ambos scripts y Prettier focalizado PASS. Global1597 y tipos/lint/build previos se conservan como HISTÓRICOS, no se reejecutaron para este cambio de harness.

Evidencia: `docs/evidence/access-recovered-2026-10-25/`; manifiesto `docs/access-recovered-web-evidence.json`; [recorrido y límites](docs/ACCESS-RECOVERED-HTTP-VERIFICATION.md). Propuesta/refresco en navegador; revisión y aplicación por HTTP. No se acredita UI Android, llamadas reales, revocación de todas las sesiones anteriores, UNREACHABLE/doble aprobación ni disponibilidad remota. Se resuelve el pendiente de aplicación ACCESS_RECOVERED, conservando entradas anteriores como historia. Sin backend/móvil, versión, dependencias/configuración/.env, Docker, commit/push o despliegue.

## 2026-10-25 — Revisión y commit local QA de EXISTING_RELEASE

Diff final revisado sobre QA9e4af36: recorrido HTTP completo EXISTING_RELEASE/CONTACTABLE, refresco de permisos con revisión invariable, regresión, harness y evidencia. Las 24 huellas previas de fuentes/documentación/evidencia coinciden; informe HTTP completo14/14, sin errores de navegador y con cierre confirmado. Sin nuevas correcciones de producto durante esta revisión. Suite global1597/1597, tipos/lint/build y HTTP14 se reutilizan del pase reciente comprobado; no son nuevas ejecuciones de esta revisión.

Commit local autorizado ahora por el usuario, incluyendo continuidad y avisos históricos actualizados. Las menciones anteriores «sin commit» corresponden a sus etapas originales. Versión1.11.0 intacta; backend/móvil sin cambios; sin push ni despliegue. Se conservan los límites de ACCESS_RECOVERED completo, UNREACHABLE y UI Android. Historial preservado.

## 2026-10-25 — Contraste del adjunto de referencias backend 1.13.2

El adjunto recibido vuelve a describir la integración ya implementada en QA9e4af36 y completada por los cambios pendientes de EXISTING_RELEASE. Se conserva íntegramente ese trabajo. Comprobación documental NUEVA: backend QA `204d4f712fb150f872e006a891595f8d64b6a2c7`, paquete1.13.2; 377 huellas de las fuentes ejecutadas coinciden con el checkout actual; 22 huellas de implementación/evidencia coinciden antes de esta actualización; schema Web de las siete secciones idéntico a OpenAPI. Los únicos cambios backend visibles siguen siendo BITACORA.md y nul, ajenos y preservados. AGENTS.md no existe en el repositorio ni ancestros consultados.

No fue necesario rehacer código de producto ni ejecutar otra vez las pruebas: se reutilizan explícitamente los resultados recientes del mismo árbol (global1597/1597, tipos/lint/build PASS, HTTP14/14 con cierre confirmado). Esto es un contraste documental y de huellas, no una nueva ejecución funcional. Se añaden avisos a los dos informes históricos para evitar interpretar contactSourceRef, participationId o movementContext como ausentes. Los límites de ACCESS_RECOVERED completo, UNREACHABLE y UI Android permanecen explícitos; EXISTING_RELEASE/CONTACTABLE está completado con datos sintéticos. Sin nuevo commit/push, versión, backend/móvil, Docker o despliegue. Historia preservada.

## 2026-10-25 — EXISTING_RELEASE completo por HTTP local

Ampliación sobre QA `9e4af36`, Web 1.11.0 intacta. Se completa el pendiente de EXISTING_RELEASE / CONTACTABLE con datos sintéticos: TAKE/RELEASE Fleet reales generan el recibo original; dos identidades verificadas y ocho confirmaciones; inventario positivo sin obligaciones; propuesta preparada en navegador; revisión HTTP de segundo SUPER_ADMIN; aplicación y replay exacto. GET y refresco Web confirman LIBERADO. Los controles antes/después conservan una liberación, un reembolso, asignación CANCELLED sin cambios y cero obligaciones/movimientos/cobro. Sin insertar recibos artificiales ni modificar estados de asistencia directamente en base.

Ejecución HTTP NUEVA: `node scripts/verify-admin-references-http.mjs`, **14/14 PASS**, cero errores de navegador, 65 migraciones, cursor expirado tras cinco minutos reales y Nest/PostgreSQL cerrados. Fuentes backend comprobadas sin cambios. Se verifican rechazos por inventario/confirmaciones ausentes y falta de aprobación; no se omiten barreras para completar el recorrido. Las declaraciones humanas son sintéticas; revisión/aplicación se ejercitan por HTTP, no se atribuyen a formularios Web.

Fallo Web verificado y corregido: Actualizar expediente conservaba referencias/permisos cuando el flag cambiaba sin incrementar la revisión. El contenido se renueva con dataUpdatedAt, reconsulta permisos y descarta preparación anterior, conservando el intento durable exterior. Regresión nueva incluida. El harness normaliza datetime-local para segundos cero. Una ejecución interrumpida no produjo informe y su PostgreSQL residual fue identificado/cerrado; no se declara PASS. Primera suite global bloqueada por ENOENT de temporales del sandbox (79 archivos sin tests ejecutados); repetida sin ese aislamiento, sin cambiar configuración o tiempos.

Validación NUEVA final: `npm test` **1597/1597 PASS, 79 archivos**,101.05s; tipos, lint, build y formato focalizado PASS. Archivo focalizado de asistencia **44/44 PASS**,5.98s. Permanece el aviso conocido de bundle>500kB. Informes fallidos y finales separados en `docs/evidence/existing-release-2026-10-25/`; [recorrido y límites](docs/EXISTING-RELEASE-HTTP-VERIFICATION.md), manifiesto `docs/existing-release-web-evidence.json`. Los informes anteriores (incluido HTTP12 y global1596) siguen siendo históricos; esta entrada resuelve su pendiente de EXISTING_RELEASE, no el de ACCESS_RECOVERED completo o UNREACHABLE/UI Android/operación real.

Sin cambios backend/móvil, versión, dependencias, configuración, .env, commit/push ni despliegue. Se preservan los cambios ajenos de backend BITACORA.md y nul; no se tocaron. Historia inferior intacta.

## 2026-10-25 — Revisión final y commit local QA de referencias administrativas

Diff revisado sobre QA b55f772, conservando los commits de B2B y zonas. Las 32 huellas de implementación y evidencia coincidieron antes de esta actualización. Sin correcciones adicionales de producto durante la revisión.

Comprobación NUEVA: `npx vitest run src/test/admin-references.test.tsx src/test/admin-reference-access.test.tsx src/test/assistance.test.tsx src/test/assistance-api.test.ts`: **92/92 PASS, 4 archivos**, 5.89s. Log archivado en `docs/evidence/qa-combined-admin-references-2026-10-25/admin-references-commit-review.txt`. La suite global 1596/1596, tipos, lint, build y HTTP 12/12 de la implementación anterior se conservan con huellas verificadas; no se reejecutaron en esta revisión. Cierre sintético confirmado en el reporte HTTP, sin errores de navegador. EXISTING_RELEASE completo sigue pendiente; ACCESS_RECOVERED acredita propuesta y barrera de revisión, no aplicación completa.

Commit local autorizado ahora por el usuario: integración, pruebas, evidencia HTTP y continuidad. La mención «sin commit» de la entrada anterior describe aquella etapa. Web 1.11.0 intacta; sin push, publicación, despliegue ni modificaciones backend/móvil. Historial preservado.

## 2026-10-25 — QA conjunta y referencias administrativas de asistencia

Verificados juntos los commits QA `263a4b9` (B2B/paquete) y `b55f772` (zonas). Baseline NUEVA antes de ampliar: `npm test` **1566/1566 PASS, 77 archivos**,108.61s; `npm run typecheck:test`, `npm run lint`, `npm run build` PASS. No se corrigieron fallos de esos commits ni se reutilizó la cifra histórica1563 como ejecución actual.

Por aclaración expresa del usuario se implementó después el adjunto de referencias administrativas: siete secciones tipadas/validadas contra OpenAPI, selectores SUPER_ADMIN, paginación completa, partes/canales autorizados, participación real para primera obligación, sesión y recibo original en propuestas, declaración SHIPPING_DECLARATION exacta y evidencia con hash del servidor. PROVIDER_ADMIN/movementContext, B2B, zonas y desvinculación conservados. Sin crear permisos desde caché. Catálogos sólo en memoria, cancelación/limpieza por actor/caso; cuerpos sensibles excluidos del intento durable y reinicio limitado a consulta/cierre técnico, conservando identidad y replay exacto en memoria.

Suite GLOBAL final NUEVA: `npm test` **1596/1596 PASS,79 archivos**,105.33s. Tipos de tests, lint global, build y formato focalizado PASS. Schema de respuesta generado comparado con OpenAPI local: coincidencia exacta. Se conserva aviso de bundle>500kB. Ningún test omitido, ningún permiso relajado y sin aumentar tiempos de pruebas para ocultar fallos.

HTTP NUEVO final: `node scripts/verify-admin-references-http.mjs` **12/12 comprobaciones PASS**, Nest/PostgreSQL sintéticos y65 migraciones. Incluye siete secciones/paginación, proveedor403 y cursores ajenos, fuente alterada/ajena/obsoleta, contribución→acta→identidad desde navegador, respuesta perdida/recibo/replay exacto, sesión→propuesta con barrera de revisión, primera obligación, parada→parte, cobro original→DECLARED sin modificar original, recibo histórico con requestId exacto,1280/320px/teclado/flagOFF y cursor expirado tras cinco minutos reales. Cierre Nest/PostgreSQL confirmado; fuentes backend verificadas sin cambio.0 errores de navegador. El recibo de liberación es fixture histórico; **no se acredita EXISTING_RELEASE completo**. Capturas revisadas sin referencias privadas, cuerpos o credenciales.

Backend leído: commit `204d4f7`, paquete1.13.2; ampliación asistencia1.0.0/schemaVersion1,65 migraciones. Su handoff refiere pruebas originales1.13.1, sin acreditar disponibilidad remota. Harness compila una copia actual en scratch WSL, utiliza dependencias locales, PostgreSQL desechable y datos sintéticos, bloquea red externa e ignora .env. El código/backend móvil no se modifica. Los43E2E/765unit/40B2B backend son HISTÓRICOS, no pruebas Web.

Fallos nuevos corregidos: el formulario UNKNOWN exigía importe HTML pese a enviar null; fixture unitario de evidencia incompleto; sincronización inicial del puente WSL; selección de evidencia obligatoria en inventario; fixture de conductor que intentaba usar una ruta LEGACY con modalidad DRIVER_TAKE (se usa el conductor sintético ya habilitado por APIs FLEET); fixture de huella obsoleta que violaba la restricción de asignación activa (sólo cambia updatedAt en datos desechables). No se modificaron reglas backend para resolverlos. La captura móvil se realiza con animaciones deshabilitadas para no fotografiar una transición del menú.

Documento de integración, contratos y límites: [FLEET-ASSISTANCE-ADMIN-REFERENCES-WEB.md](docs/FLEET-ASSISTANCE-ADMIN-REFERENCES-WEB.md). Evidencia nueva: `docs/evidence/qa-combined-admin-references-2026-10-25/`; manifiesto `docs/admin-references-web-evidence.json`. EXISTING_RELEASE completo permanece pendiente: el selector del recibo histórico no acredita inventario sin obligaciones, confirmaciones, aprobaciones ni aplicación. No se prueba UI Android, llamadas humanas, operación remota o proveedores reales. Web1.11.0 intacta; sin commit/push, publicación, despliegue, Docker ni .env. Historial inferior preservado.

## 2026-10-25 — Revisión y commit separado QA de zonas del independiente

Diff de zonas revisado sobre QA263a4b9, conservando el commit B2B separado. SUPER_ADMIN usa profileId real, catálogo activo paginado y protocolo de ofertas con requestId en body; intención cifrada y replay exacto, conflicto con revisión explícita y lista vacía confirmada. Se incluyen la estabilización de fixtures/etiquetas y maxWorkers4 documentados. Sin cambios adicionales de código de producto durante esta revisión.

Nueva comprobación: `npx vitest run src/test/independent-zones-api.test.ts src/test/independent-zones.test.tsx src/test/driver-portal.test.tsx src/test/delivery-assignments-api.test.ts src/test/delivery-assignments.test.tsx`:107/107 PASS,5 archivos. Las34 huellas anteriores de fuentes/evidencia verificadas coinciden (se excluyen los dos documentos compartidos de continuidad ampliados por B2B). HTTP18/18 PASS con cierre confirmado y backend intacto se reutiliza, no se reejecuta. Suite global1563/1563, tipos/lint/build previos permanecen como evidencia histórica, no nuevos resultados de esta revisión. Android UI sigue pendiente.

Commit local autorizado de zonas, pruebas, evidencia HTTP, handoff y continuidad; versión Web1.11.0 intacta. Manifiesto actualizado con huellas de revisión y Git, manteniendo la evidencia de la ejecución original. Sólo se normalizan espacios finales de logs y EOF documental para el diff; no se alteran comandos/resultados. Sin backend/móvil, push, publicación, despliegue ni activación. Historial inferior preservado.

## 2026-10-25 — Revisión y commit local QA del portal B2B

Diff B2B revisado; fuentes públicas, paquete regenerable y evidencia incluidos en commit local autorizado. Se preservan sin incluir los cambios pendientes de zonas (incluida su continuidad local). Se normalizan a LF las fuentes textuales del ZIP para regenerarlo idéntico tras checkout Windows; 10/10 comprobaciones de paquete/rutas reejecutadas PASS y SHA256 del ZIP sin cambio. Las 25 pruebas de portal, tipos/lint/build y navegador anteriores se reutilizan como evidencia, no como nueva ejecución. No se modifica versión ni se hace push, publicación, envío o despliegue.

## 2026-10-25 — Portal B2B sincronizado y paquete local para integradores

QA19d30bc, Web1.11.0 sin incremento. Sincronizadas las cinco fuentes públicas del backend1.13.1;20 operaciones método+ruta exactas y schemas de automaticDispatchSearch/search. Visor/descarga leen el mismo asset. Revalidación contra backend9af2185:1.13.0→1.13.1 sólo cambia info.version; búsqueda automática corrige atraso local y no se anuncia como novedad de1.13.1. Tres referencias fuera del paquete aprobado se resuelven a secciones públicas, sin copiar handoffs. Nueva navegación de búsqueda y tabla GPS corregida a320px. Se conservó el trabajo previo de zonas/desvinculación/asistencia.

Paquete local de11 archivos y ZIP determinista en `.tmp/b2b-integrator-package-2026-10-25.zip`, SHA256 `e2744137f5e5395d87b644fbeb1f540753662ddb0aa477becd59ccff16ac00f0`. Rotulado «Borrador para revisión — no enviado/no publicado», fuera de public/dist y sin enlace público al ZIP. Fuentes y regeneración: `docs/b2b-integrator-package/` y `node scripts/package-b2b-integrators.mjs`. Incluye cambios, matriz de disponibilidad, plan sintético, comunicación existente/nueva y manifiesto sin informes internos. Destinatario/canal/entorno/soporte/fecha y disponibilidad remota por confirmar; distribución requiere instrucción posterior.

Pruebas NUEVAS: `npx vitest run src/test/developers.test.tsx`25/25 PASS; `node --test scripts/b2b-integrator-package.test.mjs scripts/check-developers-entry.test.mjs`10/10 PASS; `node scripts/sync-public-b2b.mjs --check`, `npm run typecheck:test`, `npm run lint`, `npm run build` y formato focalizado PASS. Build conserva advertencia de chunk>500kB. Navegador `node scripts/verify-b2b-integrator-browser.mjs`:16 recorridos y10 descargas reales en1440/320px, MIME/bytes/schemas correctos,0 errores y0 llamadas externas/API, red externa bloqueada. ZIP real extraído por Windows, allowlist/hashes exactos y regeneración idéntica. Se corrigieron carreras del harness, mapeo de enlaces codificados y expectativas estáticas obsoletas TLS de nginx (configuración intacta).

No se ejecutó suite global Vitest ni HTTP funcional backend en esta tarea;1563 pruebas/18 HTTP de zonas y40 B2B backend son HISTÓRICOS, no resultados nuevos. No se declara disponibilidad remota ni receptor de integrador probado. [Informe y comandos](docs/B2B-INTEGRATOR-PACKAGE-WEB.md), [evidencia](docs/b2b-integrator-evidence.json). Sin modificar backend/móvil, .env, dependencias, datos reales, Docker, migraciones, versión, commit/push, despliegue, publicación, credenciales, mensajes o activación remota. Historial inferior preservado.

## 2026-10-25 — Zonas propias del independiente y sincronización backend 1.13.1

Web 1.11.0 sobre QA base 19d30bc, sin cambio de versión ni commit. Integración SUPER_ADMIN de GET/PUT offer-zones con profileId real, catálogo activo paginado, confirmación de lista vacía e intención cifrada durable por actor/entorno/perfil. Replay conserva body/requestId; el recibo histórico no sustituye proyección vigente; conflicto exige revisión humana. No se rehacen desvinculación 1.0.0 ni asistencia/movementContext.

Validación nueva: suite GLOBAL final `npm test` **1563/1563 PASS, 77 archivos**, 99.25s; tipos de tests, lint global, build y formato focalizado PASS. Se conservan advertencia de chunk >500kB y los informes históricos inferiores. Baseline de esta tarea:1508 PASS/20 FAIL; se corrigieron fixtures de trackingMode/etiquetas y se limitó la concurrencia jsdom a4 sin omitir tests ni ampliar deadlines. Los fallos nuevos de fixtures/composición y clic previo a habilitación también quedaron corregidos; pases intermedios archivados.

HTTP nuevo `node scripts/verify-client-sync-http.mjs`: **18 comprobaciones PASS** con Nest/PostgreSQL sintéticos en WSL; zonas visibles en lectura DRIVER sin selección/turno automáticos, pérdida de respuesta/replay, otro administrador, vaciado y flag OFF. Se reejecutaron salida/movementContext y se ampliaron ACCOUNT_CLOSING/reauth, cursor expirado tras cinco minutos reales y custodia resuelta por APIs existentes. Backend compilado desde fuentes actuales verificadas; procesos cerrados y backend intacto. Routing/mail simulados y FCM/socket desactivados. Esto no acredita UI Android ni reutiliza cifras históricas backend como resultados Web.

Implementación, matriz y límites: [informe](docs/INDEPENDENT-OFFER-ZONES-WEB.md). Reproducción móvil pendiente: [handoff](docs/INDEPENDENT-OFFER-ZONES-MOBILE-HANDOFF.md). Comandos, intentos fallidos, logs, capturas y huellas: [manifiesto](docs/client-sync-web-evidence.json), [evidencia](docs/evidence/client-sync-2026-10-25/report.json). No hay bloqueo local de zonas por el futuro contexto de asistencia. Retención de siete días y ciertos errores se cubren con Vitest simulado, no HTTP real. Sin backend/móvil, dependencias, .env, datos operativos, Docker, versión, commit/push, mensajes externos, despliegue o activación remota. Historial inferior preservado.

## 2026-10-24 — Revisión para commit local QA y versión Web 1.11.0

Diff final de desvinculación y transición independiente revisado; 41 huellas previas de implementación/evidencia coinciden. Versión Web incrementada de1.10.0 a1.11.0 en package.json y package-lock.json, sin cambios de dependencias; el contrato funcional permanece1.0.0. Build con1.11.0 PASS, con la advertencia conocida de chunk >500kB. Evidencia HTTP vigente:12 comprobaciones PASS; se reutiliza sin atribuir una nueva ejecución al cambio de versión. También se conservan63 pruebas nuevas PASS,325 focalizadas y los límites/fallos globales documentados abajo.

Commit local autorizado en QA con código, pruebas, continuidad y evidencia. El manifiesto registra esta revisión previa al commit y sus huellas; el SHA del commit corresponde a la revisión Git que contiene esta entrada. Sin push, despliegue, activación remota ni cambios backend/driver. Historial inferior preservado.

## 2026-10-24 — Desvinculación Web 1.0.0 implementada localmente

QA base 829d012. La autorización posterior sustituye el alcance documental previo: cliente tipado validado con OpenAPI, navegación proveedor/admin, START/RECHECK por capacidades, detalle histórico, avisos y recuperación cifrada por cuenta/entorno/proveedor implementados. SUPER_ADMIN no inicia salidas; APPLIED/PENDING no se presenta como desvinculación completada. Se conserva asistencia/movementContext y operación FLEET/independiente previa.

Validación Web: 325 pruebas focalizadas PASS; tras retirar recibos privados en memoria al perder autoridad y conservar el recibo COMPLETED ante el 404 esperado del contexto, 63 pruebas nuevas PASS y build PASS. Tipos, lint global y formato focalizado PASS. Suite global anterior al último ajuste: 1506 PASS/21 FAIL; 18 fallos de asignaciones (17 UI y1 etiquetas) coinciden con deuda histórica. Los3 fallos de dispatch/finalización sensibles a carga pasan al ejecutar sus archivos completos aparte (96/96). Se actualizaron las expectativas de navegación por sus enlaces vigentes. Build conserva advertencia de chunk >500kB.

HTTP final: 12 comprobaciones PASS, incluida conciliación histórica después de COMPLETED; procesos cerrados y backend intacto. Comandos, capturas, huellas y límites en [informe de integración](docs/FLEET-EXIT-INDEPENDENT-TRANSITION-WEB.md) y [manifiesto](docs/fleet-exit-web-evidence.json). No se atribuyen a Web las177 E2E/765 unitarias/40 B2B previas del backend. Se mantienen documentadas las ramas no ejecutadas por HTTP. Sin backend/driver, dependencias, configuración, .env o versión modificados; sin Docker, datos reales, commit/push, despliegue o activación remota. Historial inferior conservado.

## 2026-10-24 — Diseño Web de desvinculación y transición independiente 1.0.0

QA base 829d012; sólo diseño documental, sin implementación de la ampliación. [Documento de integración](docs/FLEET-EXIT-INDEPENDENT-TRANSITION-WEB-DESIGN.md): experiencias PROVIDER_ADMIN/SUPER_ADMIN separadas, navegación y archivos previstos, estados de afiliación/salida/elegibilidad, rutas/DTO futuros, intención cifrada y recuperación START por affiliationId, privacidad histórica, avisos HTTP y matriz X01–X30 prevista.

Comprobación documental y estática exclusivamente: cuatro documentos backend leídos en sólo lectura y recorridos Web contrastados. API nueva no disponible; no se ejecutaron pruebas funcionales, mocks ni HTTP. Pendientes concretos de scope provider, filtros de avisos, schema REJECTED, allowlist de cuenta restringida y selector Web de zonas identificados; políticas S1–S10 conservadas. Sin código, dependencias, configuración, .env, backend/driver, datos operativos, Docker, commit/push o despliegue. Asistencia/movementContext, FLEET e independiente previos permanecen vigentes. Historial inferior conservado.

## 2026-10-24 — Revisión y commit local de movimientos del proveedor

Diff final revisado para commit local autorizado en QA: movementContext PROVIDER_ADMIN, declaraciones, disputas, recuperación y evidencia HTTP. Las 33 huellas del manifiesto coinciden con fuentes y artefactos del pase validado; se reutilizan 158 pruebas focalizadas, 20 comprobaciones HTTP reales, tipos/lint/build y revisión visual. No se repiten suites ni se modifica código. Sin push, despliegue o activación. La revisión Git que contiene esta entrada identifica el commit; el manifiesto conserva el estado anterior al commit durante la verificación.

## 2026-10-24 — movementContext PROVIDER_ADMIN integrado localmente

Web vigente: C:/Users/zorgl/Documents/mandaria-frontend, QA base 1ec1a83. El backend actual ya ofrece proyección provider: se sustituye el bloqueo histórico general. Selección de combinaciones autorizadas, dinero exacto, declaración pendiente, disputa por movement.id y recuperación cifrada implementadas; las contrapartes ambiguas siguen bloqueadas con explicación.

Validación propia Web: 158 pruebas focalizadas, 20 comprobaciones HTTP reales contra Node/PostgreSQL aislados en WSL, tipos/lint/build PASS y revisión visual. Se conservan consola SUPER_ADMIN, FLEET 1.0.0 e independiente 1.1.0. Entorno de ensayo cerrado; backend intacto. [Informe vigente y límites](docs/FLEET-ASSISTANCE-PROVIDER-MOVEMENTS-WEB.md) · [Evidencia](docs/fleet-assistance-provider-movements-evidence.json). Activación remota/producción pendiente por separado; sin commit, push, despliegue ni cambios de .env. Las entradas inferiores son históricas.

## 2026-10-23 — Revisión para commit local de asistencia en QA

Commit local autorizado con implementación y evidencia HTTP actualizada; sin push ni despliegue. Diff revisado y huellas de fuentes/capturas contrastadas con el manifiesto: coinciden. Se reutilizan 119 pruebas focalizadas y 14 comprobaciones HTTP reales, tipos/lint/build y revisión visual del pase final, sin repetir suites ni modificar código. Los bloqueos de referencias backend siguen documentados; no se declara integración completa ni activación productiva. El SHA del commit se obtiene de la revisión Git que contiene esta entrada.

## 2026-10-23 — Asistencia Web contra backend actual (continuación)

QA base 7488fc8; se conserva la implementación previa. La ampliación movementContext es sólo DRIVER y no concede referencias al dueño. Ahora el upload conserva únicamente huellas, exige reselección del original tras reinicio y mantiene la reserva hasta confirmar atómicamente el siguiente paso. Selectores administrativos aprovechan identidades históricas y participationId de obligaciones existentes; filtros de estado, envío, proveedor y límite integrados. Proyecciones antiguas sin capacidades no conceden comandos.

[Informe vigente, pruebas y bloqueos exactos](docs/FLEET-ASSISTANCE-WEB-CURRENT.md). Validación final: 119 pruebas focalizadas, 14 comprobaciones HTTP real, tipos/lint/build PASS y capturas revisadas; entorno de ensayo cerrado. No se declara integración completa: faltan canales registrados, referencias propias del dueño y selectores documentados. Backend actual comparado con Windows y recompilado en scratch WSL para HTTP sintético. Sin .env compartidos, Docker, backend/driver modificados, proveedores reales, commit/push ni despliegue. Las entradas siguientes conservan los resultados históricos.

## 2026-10-23 — Asistencia y conciliación: Web local y HTTP

Web vigente en C:/Users/zorgl/Documents/mandaria-frontend, QA base 7488fc8. UI por rol, cliente tipado, intentos cifrados y recuperación, evidencia privada y propuestas/votos implementados. Chrome → Nest WSL → PostgreSQL sintético: 11 comprobaciones HTTP PASS; 95 pruebas focalizadas PASS, typecheck:test, lint y build PASS. Capturas dueño 1280/320 y admin 1280 revisadas. Suite global no repetida; fallos históricos no declarados resueltos.

Integración aún incompleta: faltan referencias autorizadas de canal registrado, participación, partes/movimientos propios y otros selectores; se bloquean comandos dependientes. El HTTP real confirmó que incluso admin recibe contactSourceRef redactado. [Implementación, recorridos y faltantes exactos](docs/FLEET-ASSISTANCE-WEB.md) · [Evidencia](docs/fleet-assistance-web-evidence.json). Backend/DB de prueba cerrados, fuentes backend intactas; sin .env, datos/proveedores reales, commit/push o despliegue. Esta entrada actualiza el contexto; las entradas inferiores conservan su historial.

## 2026-10-23 — Integración HTTP FLEET local verificada

Web vigente en C:/Users/zorgl/Documents/mandaria-frontend (QA, base 58f4d519). Chrome → Vite → Nest en WSL → PostgreSQL aislado: **10 escenarios PASS**, autenticación y autorización reales con identidades sintéticas. Recuperación de gasto tras respuesta perdida: mismo cuerpo/UUID, operaciones 2 → 3 → 3, ACTIVE conservado y ledger sin cambios. Corregido el mensaje del cursor malformado que el backend devuelve como 409 ECONOMIC_CONTEXT_CHANGED.

34 pruebas FLEET PASS; tipos de pruebas, build y lint focalizado PASS. Capturas 1280/320 revisadas. Backend y PostgreSQL de ensayo detenidos, auxiliares cerrados. Sin despliegue ni proveedores reales; sin cambios de .env, Docker o fuentes backend. [Informe HTTP](docs/FLEET-DIRECT-TAKE-HTTP-INTEGRATION.md) y [evidencia HTTP](docs/fleet-direct-take-http-evidence.json). Esta entrada sustituye el estado “integración pendiente” de las entradas históricas siguientes; sus resultados anteriores se conservan.

## 2026-10-23 — Web FLEET implementada localmente

Contexto vigente: C:/Users/zorgl/Documents/mandaria-frontend, rama QA, base 58f4d519; checkout inicialmente limpio, sin AGENTS.md. Se sustituye sólo el alcance anterior de diseño: contexto/capacidades, observación privada por segmentos y gasto por conductor implementados; ADMIN_DISPATCH preservado y DRIVER_TAKE/PAUSED sin mutaciones de envío. Contratos FLEET 1.0.0 e independiente 1.1.0 consultados en backend local, sólo lectura.

296 pruebas focalizadas finales PASS; suite completa previa al último endurecimiento 1352 PASS/20 fallos previos documentados. Build PASS; Chrome sintético 1280/320, foco/Enter y privacidad PASS. Tipos/lint y manifiesto final en [informe y límites](docs/FLEET-DIRECT-TAKE-WEB.md) y [evidencia](docs/fleet-direct-take-web-evidence.json). Integración HTTP real pendiente: WSL conserva clústeres de prueba detenidos, sin API activa. No confundir fixtures o evidencia backend histórica con E2E Web. Sin .env, Docker, backend/App, datos reales, commit/push, despliegue ni activación. Las entradas siguientes son historia preservada.

## 2026-10-21 — Integración de main en QA

Merge de main 8b864c5 sobre QA 0409015, rama merge/main-into-qa. Ejecutado en este worktree: tsc -b, typecheck:test, ESLint y vite build PASS; build mantiene advertencia de chunk >500 kB. Vitest completo: 1323 PASS / 21 FAIL de 1344. Línea base QA limpio en worktree temporal: 972 PASS / 22 FAIL de 994. Fallas comunes deterministas: delivery-assignments (17), delivery-assignments-api (1) y flows (2), también presentes en main. Intermitentes por carga: dispatch (merge) y delivery-completion/customer-registration-design (QA); pasan al ejecutar sus archivos completos aislados (dispatch + delivery-completion 96/96).

Pruebas modificadas: session-compatibility añade CUSTOMER aceptado y rol desconocido rechazado; verification-pages sustituye la ruta de incidencias de main por la página detallada de QA; verification-service usa una respuesta por llamada, porque el parseo estricto de QA no admite reutilizar un body consumido. Archivos completos verification-pages, verification-service y session-compatibility: 77/77 PASS. Prettier: avisos previos en api.test.ts (QA) y representatives.test.tsx (main), sin cambios. No se ejecutó navegador, backend, PostgreSQL ni VM.
## 2026-10-21 — Revisión para publicar historial en main

Commit/push autorizados. Fetch nuevo 0/0 e índice vacío; seis archivos propios revisados, sin cambios ajenos en este checkout. Se reutilizan 104 pruebas Web y 25 E2E backend de la tarea anterior, tipos/build/lint; no se repiten suites. Backend compatible requerido para la nueva consulta paginada. SHA remoto se comprobará tras push normal. Sin despliegue ni activación.
## 2026-10-21 — Historial de aceptaciones personales

Implementado en main base 7f4356b, inicialmente limpio. Nueva sección en onboarding con enlaces por ID/version/fecha, identificación vigente por receipt actual, paginación 20, estado vacío y fallo con reintento. Caché por actor/página, gcTime 0; desmontaje y cambio de página no muestran datos anteriores. No se almacenan URLs ni se envían aceptaciones. La lectura no modifica bloqueos de V2 ni admisión.

Requiere GET /api/v1/driver/verification-acceptances, implementado localmente en backend, sólo DRIVER personal autenticado. Respuesta paginada estándar, campos mínimos; máximo 100. Sin migraciones. Fallo del endpoint se muestra como error, nunca como pérdida del historial. Historial FLEET fuera de alcance.

Validación nueva: 104 pruebas PASS en archivos completos verification-pages (45), documentary-availability y onboarding-production (59); nuevos casos para V1/V2, paginación/carga, error/reintento y descarte de caché al desmontar. typecheck:test, ESLint focalizado, build y diff PASS. Advertencia previa chunk >500 kB. Backend: 25 E2E HTTP/PostgreSQL aislados, incluidos paginación, acceso propio, aislamiento ajeno y ningún cambio de aceptaciones. No navegador/VM nuevos; no acreditar integración desplegada. Evidencia anterior conservada.

Archivos propios: src/verification/acceptance-history.tsx (nuevo), pages.tsx, service.ts, src/test/verification-pages.test.tsx y continuidad. Sin activación, aceptación, aprobación sintética, commit, push ni despliegue. Pendiente desplegar backend/Web compatibles y comprobar navegación real.
## 2026-10-21 — Revisión para commit/push del enlace histórico

Autorizado publicar en main. Fetch nuevo: 0/0, índice vacío; cinco archivos propios revisados, sin cambios ajenos en este checkout. Se reutilizan 41 pruebas Web y 24 E2E backend, tipos/build/lint de la tarea anterior; no se repiten suites. Backend compatible requerido para recibir latestAcceptance. Diff e índice revisados; SHA remoto se confirmará tras push normal. Sin despliegue, aceptación de términos ni activación.
## 2026-10-21 — Enlace a aceptación histórica con versión vigente pendiente

Solicitud implementada en main base a97cec1e, inicialmente limpio. DriverOnboarding usa terms.acceptance vigente y, en su ausencia, terms.latestAcceptance como comprobante anterior con aclaración de que no sustituye términos vigentes. El campo es opcional: backend antiguo o valor null no generan enlace inventado. Mantiene bloqueos, casillas sin marcar y ausencia de envío automático. Backend compatible añade sólo referencia personal de lectura; sin migración.

Validación nueva: 41/41 en archivo completo verification-pages.test.tsx (cuatro casos nuevos), typecheck:test, ESLint focalizado, build y diff correctos. Build mantiene advertencia previa de chunk >500 kB. Backend validó 24/24 E2E con PostgreSQL aislado, conservando V1 antes/después de aceptación V2; no se ejecutó navegador ni VM para esta corrección. Fallos intermedios por inserción fuera del componente, aclaración ausente y consulta asíncrona corregidos y excluidos del resultado final.

Archivos: src/verification/pages.tsx, types.ts, src/test/verification-pages.test.tsx y estas bitácoras. Backend expone GET /api/v1/driver/onboarding -> terms.latestAcceptance {id,version,acceptedAt}|null, limitado a DRIVER personal del actor, orden fecha/id descendente. No cambia permisos, recuperación ni aceptaciones. Pendiente despliegue manual y verificación VM; no constituye historial completo. Sin activación, documentos reales, commit, push ni despliegue.
## 2026-10-21 — Revisión para publicar corrección del mensaje en main

Autorización explícita de commit/push sólo Web. Fetch nuevo: main a468d1e61897c573fde47e19a9a5dca74f53b196 sincronizada 0/0 e índice vacío. Revisados seis archivos propios: dos traductores, pruebas de páginas, informe y continuidad. Sin cambios ajenos en este checkout. Se reutiliza la validación anterior de 51 pruebas, tipos, lint y build; no se repiten suites. Diff sin errores. Push normal a origin/main; confirmación del SHA remoto se entregará al propietario. Los términos V2 permanecen exclusivamente como propuestas del repositorio backend. Sin publicación de textos, admisión ni despliegue.
## 2026-10-21 — Mensaje de documentos faltantes en confirmación

Main base a468d1e, checkout inicialmente limpio. Causa comprobada: useCommand notificaba con format.message, pero Confirm/ActionForm mostraba ApiError.message del normalizador general, sin traducción de VERIFICATION_DOCUMENTS_PENDING. Se añadió sólo ese código a normalizeError y se alineó la traducción documental: Faltan documentos requeridos con formato validado. Revisa las categorías del expediente y completa las cargas pendientes. No se inventa qué documento falta; backend no expone esa lista. Conflictos desconocidos conservan mensaje genérico y no se muestran cuerpos crudos.

Regresión nueva: identidad y unidad fallaron antes con el mensaje genérico; después pasan dentro del diálogo, un solo comando, misma revisión y cancelación sin reenvío. Validación final: 51/51 en archivos completos verification-pages.test.tsx (37) y verification-recovery.test.ts (14); typecheck:test, ESLint focalizado, build y diff correctos. Advertencia previa de chunk >500 kB permanece. Datos simulados; no nueva prueba de navegador, HTTP/VM o PostgreSQL.

No se modificaron permisos, recepción de archivos, comandos, marcadores, recuperación ni backend. Textos V2 de bicicletas preparados separadamente en backend/docs/legal-review-2026-10-21-bicycles, sin tocar las V1 publicadas. Sin publicación, admisión, commit, push o despliegue. Ver docs/DOCUMENTARY-MISSING-REQUIREMENTS-MESSAGE.md.
## 2026-10-20 — Publicación de excepción de bicicletas a main

Commit/push autorizados, sin despliegue ni admisión. Fetch nuevo: main base 62a4fcb sincronizada 0/0. Seis archivos propios revisados; no cambios ajenos en checkout. Evidencia reutilizada: 45 pruebas Web, build/tipos/lint de tarea anterior; no se repiten suites. Revisión nueva de diff, índice y remoto. Requiere backend que exponga registrationCardRequired; ausencia mantiene requisito conservador. SHA remoto se comprobará después del push normal.
## 2026-10-20 — Excepción documental de bicicletas

Main inicialmente limpio, base 62a4fcb. Se consume registrationCardRequired del detalle de expediente: sólo false explícito omite tarjeta de circulación en selector y explica excepción en formulario. Mantiene propiedad/uso autorizado y adjuntos históricos, sin inferir tipo por identificador. Ausencia/null conservan requisito para backend anterior. Backend debe publicar el campo calculado sobre tipo persistido. No permisos, mutaciones, recuperación ni flags modificados.

Validación nueva: 45/45 pruebas en verification-pages.test.tsx y verification-upload.test.tsx; build, typecheck:test y ESLint focalizado PASS. Incluye exención, requisitos conservadores y evidencia histórica. Advertencia de chunk >500 kB preexistente. Sin navegador/HTTP/PostgreSQL/VM en esta tarea. Backend valida 37 pruebas sintéticas de reglas/gate. No activar admisión, commit, push ni despliegue. No modifica los textos contractuales publicados ni elimina documentos. Pendiente integración del despliegue compatible. Historial preservado.
## 2026-10-20 — Revisión para publicar corrección del visor en main

Autorización del propietario: commit/push exclusivamente Web, sin despliegue ni admisión. Fetch nuevo de origin/main: 0/0 respecto a base 0e290ed180afd3aa3be08189bc20786d5d47cbd6. Siete archivos propios revisados: nginx.conf, evidence.tsx, verification-pages.test.tsx, arnés, informe y continuidad BITACORA/VERIFICATION. No había cambios ajenos en este checkout. Se reutiliza validación de la tarea anterior (40 pruebas, tipos, build, lint y navegador sintético para ambos roles); no se repiten suites ni se presenta como ejecución nueva. Revisión nueva: diff y contenido, remoto, índice y sintaxis del arnés. Publicación por push normal; SHA y resultado se confirmarán contra remoto. VM pendiente del despliegue manual del propietario; no cambios backend, secretos, admisión ni configuración efectiva.
## 2026-10-20 — Visor privado: CSP blob y errores de renderizado

Solicitud: corregir visor para conductor/SUPER_ADMIN sin activar admision ni desplegar. Base main 0e290ed180afd3aa3be08189bc20786d5d47cbd6, checkout inicialmente limpio. nginx img-src omitia blob:, utilizado por Evidence tras recuperar el archivo autenticado. Se permite blob: solo en img-src; no cambia acceso, proxy, caché, permisos ni otras directivas. Evidence confirma visualizacion solo tras onLoad; onError informa fallo y revoca URL. Cierre/desmontaje conservan revocacion.

Verificacion nueva: 40/40 en archivos completos verification-pages y verification-upload (incluye dos regresiones por rol), build, typecheck:test y ESLint focalizado PASS. Build mantiene advertencia de chunk >500 kB. Navegador local con componente compilado y CSP extraida de nginx: politica antigua reproduce fallo; corregida renderiza PNG sintetico 800x500 para DRIVER y SUPER_ADMIN; cierre elimina vista. Transporte simulado, sin backend/VM/Spaces ni prueba nueva de permisos HTTP. Capturas viewer-fixed-driver.png y viewer-fixed-admin.png en visualizaciones/documentary-synthetic. Arnes reproducible scripts/serve-evidence-csp.mjs recibe ruta PNG sintetica. No utilizar documentos reales.

Incidencias del desarrollo: primer script de edicion fallo por encoding y solo ejecuto 38 pruebas anteriores; corregido con UTF-8 y repetidos archivos completos: 40. Primer arranque de arnes sin VITE_API_URL mostro error; corregido con URL loopback explicita, sin leer .env. Ambos resultados incompletos excluidos de validacion final.

Pendiente: tras despliegue autorizado comprobar cabecera efectiva, visor con cuentas reales de prueba y capas proxy que puedan imponer otra CSP. No se ejecuta nginx/Docker. No cambia estado documental ni admision, sin commit/push/despliegue. Ver docs/EVIDENCE-VIEWER-CSP-FIX.md.

## 2026-10-20 — Revisión de commit/push autorizados a main

Fetch nuevo, main 950eca7 coincide con origin/main (0/0); índice vacío al comenzar. Selección exclusiva del ajuste administrativo sin alta, regresiones, informe/evidencia y continuidad. Cinco huellas coincidentes con validación final; no se repiten suites. Evidencia reutilizada: 57 Web y backend 27 unitarias/17 E2E. No se acredita navegador integrado. Commit/push autorizados; se verificará SHA remoto. Sin publicación de términos, cambios de configuración, activación, merge, VM ni despliegue.

## 2026-10-20 — Verificación final del layout de publicación

Corregida consulta residual de Warning exclusivamente en publicaciones SUPER_ADMIN; los otros flujos conservan sus controles. Recuperación y publicación probadas bajo VerificationLayout real. **57/57 únicos PASS** en dos archivos completos, sustituyendo las 30 anteriores; build/tipos/lint finales correctos. Huellas actualizadas; sin navegador real, commit/push/publicación/despliegue/activación.

## 2026-10-20 — Publicación sin habilitar alta

Implementado ajuste mínimo autorizado en main: pantalla administrativa consume runtimeEnvironment de policy, sin consultar requirements; entorno ausente/test bloqueado. Permisos, confirmaciones y recuperación intactos. [Informe](docs/PUBLICATION-WITHOUT-INTAKE.md).

Verificación nueva: 30/30 pruebas del archivo completo de onboarding production, build, tipos de pruebas, ESLint focalizado y diff PASS. Backend aparte 17 E2E PostgreSQL y 27 unitarias; no se acredita navegador integrado. Warning de bundle previo persiste. Sin publicar textos reales, cambiar flags, admisión, commit/push/despliegue. Cambios previos conservados.

## 2026-10-20 — Revisión para publicación de conservación Web

Commit/push autorizados sólo para feature/driver-verification. Base 97850b8c447c71d6ae245bc8df3ce46413650da2; fetch inicial 0/0. Producto y arneses coinciden con las huellas vigentes; se reutilizan los resultados históricos sin ejecutar suites o integración. Se añaden únicamente resumen portable, referencias y extracto de evidencia. Backend requerido aún incluye cambios sin commit sobre 2c458fc955f699ce958dabf5fe89dcc58892a031; no se declara una pareja publicada probada. Otros worktrees y cambios ajenos conservados. [Revisión, comprobaciones y límites](docs/RETENTION-WEB-PUBLICATION-REVIEW.md). El resultado remoto se comprueba al terminar; no hay merge, despliegue ni activación.

## Verificación nueva — cierre conjunto de conservación, 2026-10-20

Nuevas: 183 pruebas únicas en seis archivos completos; tipos producto/pruebas, build/lint PASS. Integración final CALENDAR/UNKNOWN/NOTICE/EXCEPTION/INCIDENT/PERMISSIONS PASS consolidada; PostgreSQL, backend y Web reales locales, correo/storage simulados, reloj controlado, escritorio/320. A–F y recuperación con un POST/0→1→1 siguen históricos. Correcciones finales de lectura cubiertas por 44 pruebas de los dos archivos completos; capturas anteriores no acreditan rótulos posteriores.

Los intentos fallidos no se acreditan: fixture inicial sin cupos; límite real al sexto login, con sólo EXCEPTION repetida; aserción Web esperando refetch corregida. No hubo abortos nativos en esta tarea. Ajustes posteriores: distinción NOT_DISCLOSED y planes depurados, cubiertos por archivos completos; no se repite integración intacta. Evidencia/huellas y diferencias detalladas en [informe canónico](docs/RETENTION-WEB-PUBLICATION-REVIEW.md).

Pendientes exclusivamente externos: configuración efectiva/ensayo operativo de VM, avisos/calendario reales, copias/horizonte/custodia y cobertura efectiva de responsables ya designados. Decisiones sobre saldo/devoluciones y autorización final de textos siguen pendientes; no bloquean artificialmente el cierre del código. RESOLVED y GPS/App fuera de alcance. Trabajo previo/ajeno e historia conservados; procesos propios detenidos y bases sintéticas retenidas. Sin .env modificado, servicios reales, Docker, QA, commit, push, merge, despliegue, políticas publicadas ni activación.

## 2026-10-20 — Cierre de publicación y referencia backend confirmada

## 2026-10-20 — Conservación de imágenes a 30 días, cierre local

Implementación propia en feature/driver-verification, worktree fleet-representative-web, HEAD 97850b8c447c71d6ae245bc8df3ce46413650da2 sin cambios; sin commit/push. Calendario por folio, distinción proveedor/entrega, excepción IMAGE_ATTACHMENT, declaración de copias/restauración y confirmación SUPER_ADMIN con recuperación original. No se encontró AGENTS.md ni propuesta previa; matriz creada desde DTO/OpenAPI/servicio actuales. Otros worktrees y trabajo previo conservados.

A–F PASS completo en ensayo 1792525812779: Web/backend reales, PostgreSQL propio identificado antes de migrar, reloj inyectado y correo/storage simulados. Primer 1792525715228 falló sólo por seed REJECTED directo; corregido según transiciones backend y un único lanzamiento adicional. Recuperación: un POST, comandos/planes 0→1→1. B dos objetos sin residuos en simulador; C aviso fallido sin borrado/renovación; D excepción por Web conserva dos objetos; F cuenta ajena denegada y sin reapertura. Procesos propios detenidos y ambas bases conservadas.

33 pruebas nuevas + 215 regresiones afectadas distintas (248 casos); tipos producto/pruebas, lint/build finales PASS. Primer registro focalizado global exit 1 por selector nuevo y error posterior del wrapper; no se acredita globalmente PASS, aunque los ocho archivos de regresión terminaron completos. Archivos finales corregidos PASS. Chrome 155.0.8059.85, escritorio/320, teclado/foco/errores/texto largo, sin overflow. Tras revisión visual sólo cambió rótulo de INVENTORY sin confirmación y zona horaria, con regresión; A–F no repetido. Huellas integradas/actuales separadas: capturas históricas anteriores a ese texto.

Backend 2c458fc955f699ce958dabf5fe89dcc58892a031 + retención sin commit, migración 20261020000100_document_image_retention y formato 4. 27 huellas iguales antes/después; 16 también coinciden con evidencia backend histórica. Sus 123/53/33 no son pruebas nuevas ni pareja de SHA publicada probada. No GET titular por expediente ni detalle completo de excepciones: no inferir fechas/vigencia. Constancias limitadas; pendiente Spaces real, textos B/C/D/I, historia y capacidad operativa de Luis Fernando Salgado Gonzalez/Carlos Bryan Corado Suarez, ya designados. RESOLVED y Android/GPS separados. Sin backend/App/Landing, .env, políticas, QA, merge, despliegue o activación.

[Informe](docs/DOCUMENTARY-RETENTION-30D-WEB.md) · [Matriz](docs/DOCUMENTARY-RETENTION-30D-WEB-PROPOSAL.md) · [Evidencia](docs/retention-30d-web-evidence.json). Documentación local sin commit.


Web publicó `6bdeda4021bf01d822746b97189759ba0cf07d7a` en `origin/feature/driver-verification`, desde `e657e715cadb1d6727fbde55a9202b6deaa2fdb9`, con 37 archivos propios. Consulta `ls-remote` satisfactoria: SHA remoto igual al local, 0/0 e índice/checkout limpios. Al continuar, fetch acotado confirma la misma referencia. Otros worktrees y cambios ajenos conservados. Este cierre añade sólo documentación; no cambia producto ni evidencia del ensayo.

El backend recibió concurrentemente el commit local `2c458fc955f699ce958dabf5fe89dcc58892a031`, rama `codex/fleet-representative-verification`. Ya no queda pendiente identificar su commit de implementación. Contraste en lectura: de las 26 referencias A–F, 19 archivos publicados conservan la huella probada y coinciden con los blobs del commit al normalizar LF; cuatro archivos dist y el borrador legal local también conservan sus bytes, pero no están publicados en ese commit. Los dos informes de diseño/implementación cambiaron editorialmente para registrar la revisión y excluir el enlace al borrador ajeno. Sus bytes publicados coinciden con la documentación local actual; no se presenta su huella antigua como vigente. Además, las 26 huellas de producto/contrato/arnés del informe backend coinciden con sus archivos y blobs publicados. No se consultó su remoto ni se modificó backend.

Dependencia concreta: ese contenido backend, migración `20261019000200_fleet_representative_verification` y recuperación formato 3. Es correspondencia de contenido con A–F histórico, no una ejecución nueva de la pareja de SHA ni validación de versiones mezcladas. Los informes backend aún mencionan Web pendiente desde su propio corte; no reabren A–F, acreditado en el informe Web. Se reutilizan las 40 focalizadas, tipos/lint/build y visual Chrome **155.0.8059.82**; las 130 anteriores siguen históricas y `spawn UNKNOWN` original sin causa determinada. Sin nuevas suites o servicios.

Pendientes reales: integración/despliegue coordinados futuros del backend compatible y su migración, textos/avisos/declaración aprobados y publicación autorizada, destino privado/CORS/custodia y preparación operativa. Recuperación posterior a revocación sigue limitada. No recepción real, activación, políticas publicadas ni LOCAL_TEST convertido; constancias parciales no garantizan eliminación total. V2 real en Spaces, RESOLVED y Android/GPS separados. Este cierre no ejecuta merge/rebase, QA, despliegue ni cambios backend/App/Landing.

Verificaciones nuevas: lectura Git y contraste de blobs/huellas; referencias y JSON del complemento, revisión de diff e índice antes de publicar. [Registro](docs/fleet-representative-publication-review.json). No nueva integración.

## 2026-10-19 — Revisión para publicar el expediente del representante

Correspondencia comprobada: 33/33 huellas Web/arnés, 26/26 backend, 7/7 capturas, los seis reportes de segmentos y los dos reportes finales de pruebas. A–F sigue PASS consolidado con reanudaciones y fallos preservados; recuperación 0→1→1, un POST, selección A/B sin envío automático. Se reutilizan las 40 pruebas focalizadas (29+11), tipos app/test, lint, build y visual 1280/320/teclado. Las 130 anteriores siguen históricas; ninguna suite ni recorrido se ejecutó de nuevo para publicar. Navegador acreditado: Chrome **155.0.8059.82**; causa original de `spawn UNKNOWN` aún sin determinar.

Verificaciones nuevas de publicación: revisión del diff y archivos nuevos, 3 JSON de evidencia, 51 enlaces locales de informes y 141 imports relativos, sintaxis de seis scripts, siete capturas inspeccionadas, patrones de secretos y `git diff --check` PASS. No cambió producto. Git usa autocrlf: el inventario conserva SHA-256 de bytes locales y de texto normalizado LF para contrastar el índice sin confundir finales de línea con cambios funcionales.

Backend consultado sólo en lectura: rama `codex/fleet-representative-verification`, HEAD base `0fd7e2d058ba2c73c30f5edc21e229c11eefabdd` y cambios pertinentes todavía sin commit. Requiere contrato `FLEET-REPRESENTATIVE-PRIVATE-DOCUMENTS-IMPLEMENTATION.md`, migración `20261019000200_fleet_representative_verification`, recuperación formato 3 y las huellas probadas. SHA final backend pendiente; no se atribuye el ensayo a una pareja de SHA base ni se acredita un despliegue mixto.

Sólo evidencia sintética saneada: se excluyen .env, secretos operativos, URLs firmadas, documentos reales, perfiles, bases, node_modules, dist, logs/trazas y temporales; no se borran. Las credenciales literales del arnés son fixtures sintéticos de la base aislada, no credenciales operativas. Pendientes: backend compatible, textos y declaración aprobados para el tratamiento, publicación jurídica autorizada, almacenamiento privado/CORS/custodia y preparación operativa reales. Recuperación tras revocación limitada; constancias parciales no garantizan eliminación total. V2 real en Spaces, RESOLVED y Android/GPS permanecen separados. Sin cambios backend/App/Landing, QA, merge, rebase, despliegue, recepción real ni activación.

[Revisión previa al commit](docs/fleet-representative-publication-review.json). El estado remoto se debe consultar de nuevo antes y después del push; este registro es previo a ese resultado. Historial inferior intacto.

## 2026-10-19 — Representante: integración A–F consolidada y cierre visual

[Informe actual](docs/FLEET-REPRESENTATIVE-WEB.md), [JSON saneado de integración](docs/fleet-representative-integration-evidence.json). Rama/HEAD sin cambios: `feature/driver-verification` / `e657e715cadb1d6727fbde55a9202b6deaa2fdb9`; todo local sin commit. Checkout principal y modificaciones previas preservados. Contraste inicial: 27 fuentes/pruebas Web y cuatro arneses iguales al cierre histórico; 26 backend iguales.

- Launcher mínimo `1792438743097` PASS: Chrome instalado **155.0.8059.82**, Node 24.15.0 win32/x64, headless, sandbox habilitado, perfil/temporales propios, página loopback/teclado y cierre. Sin backend/base. Chromium anterior 153.0.8010.12 existe pero su `spawn UNKNOWN` sigue sin causa demostrada; no se repitió ese lanzamiento. Sin elusión de aprobaciones, instalaciones o protecciones desactivadas.
- A–F **PASS consolidado con reanudaciones**, no una ejecución ininterrumpida verde. Base `representative_web_1792438944140_test` y cluster propio, identidad antes de usar; seis segmentos con reportes y cleanup. Fallos conservados: scroll inmediato, enumeración administrativa antes de cargar, contexto dashboard tras reanudar, timeout 5 s frente a polling 10 s y expectativa 404 anterior al gate. Ajustes condicionados al estado real, sin sleeps arbitrarios ni relajación de comprobaciones. Último `resume-1792439761412` exit 0; los anteriores exit 1 no se cuentan como PASS completos.
- A/D/E en `9224118`: privacidad antes de campos/archivos, creación/JPEG/PNG/confirmación/presentación por interfaz; pérdida posterior al commit y recarga/GET original; comandos y efectos **0→1→1**, un POST. A/B integrado: A conserva B, un PUT/un adjunto; clic explícito de B produce dos/dos. Coordinador y cuenta de otra flotilla sin datos ni bytes, HTTP404 antes del bloqueo.
- B: decisión SUPER_ADMIN por Web en `9402312`, tres evidencias y checklist contractual; recibo APPLIED recuperado por GET y estado vigente del representante en `9557453`. Una decisión, sin aprobar otros casos ni admisión. C en `9557453`: aceptación FLEET personal separada, un recibo vinculado al expediente, sin aceptación DRIVER ni conversión de historia LOCAL_TEST, admisión false.
- F en `9761412`: reutiliza solicitud confirmada preparada por API real, sin repetirla ni declarar prueba Web de baja. Lectura/carga/confirmación 409 **DELETION_RESTRICTED**; cambio de cuenta y ausencia de campos/imágenes privados. Código exacto conforme a `authorize`: gate antes de titularidad explica 409 posterior frente a 404 previo. La espera original de 5 s falló; se acredita reconsulta posterior y cambio de contexto, no una transición retrospectiva dentro de aquel plazo.
- Único fix Web: la reconsulta de privacidad desmontaba el archivo pendiente para la misma versión confirmada. Regresión inicial FAIL preservada; separada confirmación vigente de revalidación en curso, manteniendo envío bloqueado y retirada por nueva versión/error/pérdida de autoridad. Archivos completos **29 representantes +11 carga =40 PASS**; un caso nuevo. Corrección de tipo del selector en la prueba y repetición completa de representantes PASS. 91 casos intactos del cierre histórico reutilizados, no nuevas ejecuciones. No suite de 130, A–H, baja/CANCELLED ni suites backend repetidos.
- Tipos app/test, lint pertinente y build PASS; build sin .env, Root 758.88 kB con advertencia >500 kB. Sintaxis de arneses, enlaces/JSON/huellas y diff comprobados al cierre. Ningún cambio de dependencias o diseño.
- Visual de diez estados a 1280/320 sin overflow: aviso largo/teclado, foco modal, menú móvil/Escape y retorno de foco, pendiente/error, presentación, revisión, aprobación, FLEET y restricción. Siete capturas sintéticas inspeccionadas y conservadas sin edición de bytes; primeras capturas de transición móvil quedan locales. Cierre usa sidebar estabilizado. Visual reutilizado entre segmentos y nuevas capturas de restricción diferenciadas en JSON.
- Backend `codex/fleet-representative-verification`, base `0fd7e2d058ba2c73c30f5edc21e229c11eefabdd` + cambios sin commit: **26/26 huellas** antes/después de cada segmento y al cierre. Web/arnés: 33 huellas sin cambios durante cada segmento. Dos fuentes cambian respecto a las 130 históricas y tienen cobertura nueva. No se declara probada una pareja de SHA base sola ni producción.
- Seeds declarados: cuentas/flotillas/memberships, historia LOCAL_TEST y política sintética por servicio. No prueba nueva de registro/correo ni publicación por UI. Reanudaciones reconstruyen sólo almacenamiento simulado con hashes origen/normalizado iguales a SQL, sin repetir cargas o mutaciones. Correo capturado, red externa bloqueada, no Docker/.env/43000/Spaces/correo real. Recursos propios cerrados; base conservada.

Sin recorridos A–F pendientes en el alcance local. Pendientes reales: versión backend compatible/migración/formato 3, revisión/publicación jurídica, almacenamiento privado/CORS/custodia y operación; recuperación tras revocación sigue limitada. Constancias parciales no garantizan eliminación total; V2 real, RESOLVED y Android/GPS separados. Sin backend/App/Landing modificado, QA, commit, push, merge, despliegue ni activación. Historial y fallos inferiores conservados; documentos nuevos locales sin commit.

## 2026-10-19 — Representación privada: validación focalizada y ensayo bloqueado

[Informe](docs/FLEET-REPRESENTATIVE-WEB.md), [huellas de entrada](docs/fleet-representative-contract-before.json), [evidencia saneada de cierre](docs/fleet-representative-web-evidence.json). Implementación en worktree aislado de `feature/driver-verification`, base/HEAD `e657e715cadb1d6727fbde55a9202b6deaa2fdb9`, sin commit. Checkout principal main y sus cuatro cambios documentales previos preservados; sin actualizaciones remotas.

- **130/130 casos únicos PASS**, usando último resultado completo por archivo: representantes 28, carga 11, páginas 27, recuperación 14, alta productiva 28 y servicio 22. Último lote de interfaz 55/55 después del mensaje DELETION_RESTRICTED y su regresión; los otros archivos se completaron en esta misma tarea. La revisión final añadió 22/22 del servicio de comandos, sin repetir los 108 anteriores. No se suman repeticiones. Selector ambiguo inicial corregido, sin omitir aserciones.
- Cubiertos permisos propios/ajenos/coordinador/SUPER_ADMIN, privacidad y política ausente/obsoleta, consentimientos separados, SELF y orden de páginas, rechazo/firma conjunta/revisión esperada, FLEET sólo acreditado vigente, revocación, recuperación GET sin replay y estado histórico separado, aislamiento de contexto/respuesta tardía, tipos de archivo y A/B para las tres categorías nuevas, restricción documental e historia LOCAL_TEST. Son fixtures, no integración real.
- Tipos app/test, ESLint de fuentes/pruebas afectadas y build PASS tras el último cambio de producto. Build programático sin .env con API loopback; se mantiene aviso de chunk >500 kB. Sintaxis de cuatro scripts, JSON, enlaces y `git diff --check` comprobados al cierre. No se ejecutaron suites completas ni se repitieron A–H/baja/CANCELLED.
- Único ensayo integrado `1792437444597`: PostgreSQL propio identificado por host/puerto/base/data_directory antes de migrar y sembrar; backend local real y Vite preparados, almacenamiento en memoria y correo capturado. Preparación PASS; SETUP completo FAIL por `browserType.launch: spawn UNKNOWN`. LINK/PRIVACY_RECOVERY/DOSSIER/REVIEW/FLEET/FOREIGN_ACCESS/RESTRICTION/VISUAL BLOCKED. Ninguna navegación, captura, aprobación, aceptación ni conteo 0→1→1 acreditados; privacidad POST=0, almacenamiento PUT=0.
- Un único diagnóstico adicional, Chromium instalado sin API/base, reprodujo `spawn UNKNOWN`. No determina causa ni defecto de producto. El mecanismo normal autorizó ambos lanzamientos; no hubo rechazo ni elusión de aprobación. Límite de diagnóstico agotado; no más intentos. Visual escritorio/320 px, teclado/foco y overflow pendientes.
- Backend base `0fd7e2d058ba2c73c30f5edc21e229c11eefabdd`, rama `codex/fleet-representative-verification`, cambios locales pertinentes aún sin commit. Las 26 huellas fuente/documentación/pruebas/runtime de entrada coinciden antes/después y al cierre. No se acredita una pareja de SHA integrada. 64 E2E/38 unitarias/33 B2B backend son antecedentes históricos.
- Limpieza de recursos PASS: Vite/backend cerrados, navegador no iniciado y PostgreSQL detenido; comprobación independiente `pg_ctl status` no server running, cero listeners propios. Temporales/reportes crudos permanecen excluidos. Sólo evidencia sintética saneada y hashes en docs; sin documentos reales, URLs firmadas, tokens o credenciales operativas.

Pendiente inmediato: resolver el arranque de Chromium y completar una ejecución acotada de los seis recorridos y visual, sin reabrir pruebas intactas. Dependencia del contrato/migración backend y textos autorizados; tras revocación no existe recuperación mínima acreditada de privacidad/creación y el marcador se conserva. Sin aptitud productiva, recepción real o admisión. V2 real en Spaces, RESOLVED y Android/GPS siguen separados. No backend modificado, QA, .env, Docker, servicios reales, commit, push, merge o despliegue; documentación local sin commit. Historial anterior conservado.

## 2026-10-19 — Propuesta de representación: validación exclusivamente documental

[Propuesta y handoff](docs/FLEET-REPRESENTATIVE-WEB-PROPOSAL.md). Main 763b7f5397320b1872fbbfc32ffd37a91b5411ec, inicio limpio e índice vacío; rama/worktrees conservados. AGENTS.md ausente en checkout/ascendientes consultados. Lectura de continuidad, diseño backend y apartado H; referencias identificadas por fecha/huella, sin tratar el paquete editorial como contrato publicado. Se detectaron seis fuentes modificadas concurrentemente; la segunda lectura (18:18:32 UTC, doce referencias con las dos nuevas) sí encuentra implementación candidata del representante. OpenAPI 1.12.0 no incluye aún sus rutas/categorías; no se localizó informe final. Diferencia documental registrada, no fallo de producto ejecutado. Git backend no consultable por sandbox; no se inventa SHA.

Validación exclusivamente documental: diez secciones y 190 enlaces locales comprobados sin faltantes; historial previo conservado, índice vacío y sólo cuatro documentos cambiados. git diff --check PASS; documento nuevo revisado sin diagnósticos de espacios mediante diff contra /dev/null (exit1 propio de la adición). Los casos de acceso, privacidad, carga W-01, firma conjunta, revisión, recuperación, sustitución y accesibilidad quedan especificados **para una implementación futura**, no ejecutados ni convertidos en tests/fixtures. A–H y 129 pruebas históricas de avisos conservan su alcance anterior, sin servir de validación del representante. Ninguna suite, build, navegador, Docker, PostgreSQL, backend, cuenta real, Spaces o correo ejecutados.

Pendiente consolidar el contrato candidato con OpenAPI, respuestas/permisos actuales, declaración, firma conjunta, transición e inventario de baja/restauración. Escenario concreto sin recuperación acreditada: privacidad/creación aplicada, respuesta perdida y vínculo revocado antes del GET, que reautoriza antes de leer el comando. No se inventa canal ni se ejecuta ese escenario. Sólo cuatro documentos locales, sin cambios de producto/backend/Landing/Android, QA, commit, push, merge, publicación, despliegue o activación. No se contactó a otros agentes. Historial anterior preservado.

## 2026-10-19 — Revisión estática para publicar avisos y bloqueos

Base local/remota 1d4486e1b0c6fbd987ad846213de7bfdb05e8c1d verificada mediante fetch limitado; rama feature/driver-verification, origin correcto, sin divergencia e índice inicial vacío. [Inventario y alcance](docs/DOCUMENTARY-AVAILABILITY-WEB.md). Revisión de 25 candidatos propios sin cambios funcionales posteriores: 16 huellas fuente/arnés, nueve protegidas, 27 entradas del inventario histórico, cuatro capturas y cinco reportes locales coincidentes. JSON, enlaces relativos, sintaxis del arnés, revisión de secretos y git diff --check PASS.

Se reutilizan los 129 casos PASS de seis archivos completos y tipos/lint/build/visual acreditados abajo, sin ejecutarlos de nuevo. Evidencia sintética sigue separada de A–H histórico; backend compatible por contrato y huellas, sin pareja de SHA integrada nueva. Staging selectivo, revisión del índice, commit/push sólo de rama y consulta del SHA remoto son los pasos posteriores autorizados; este registro no los acredita anticipadamente. Otros worktrees y artefactos excluidos preservados. Sin cambios backend, QA, merge o despliegue.

## 2026-10-19 — Disponibilidad documental: matriz y regresiones Web

[Informe](docs/DOCUMENTARY-AVAILABILITY-WEB.md), [registro de huellas/resultados](docs/documentary-availability-evidence.json). Web feature/driver-verification, HEAD 1d4486e1b0c6fbd987ad846213de7bfdb05e8c1d sin cambiar; índice vacío. Todo el cambio y su documentación quedan locales sin commit/push.

- Último resultado completo por archivo: disponibilidad 29, onboarding-production 28, verification-pages 27, upload 8, recovery 14 y deletion-service 23: **129/129 PASS**. Inicial 126/128 por dos clics anteriores a la nueva consulta; esperas corregidas sin omitir envíos/asserts. Después se añadió transición de modo; lote final de disponibilidad/páginas/carga 64/64, otros tres archivos 65/65 anteriores. No se suman repeticiones ni se ejecuta toda la suite histórica.
- Matriz LOCAL_TEST/PRODUCTION/desactivado/política ausente/red/401/403/otros; producción con productionReady false; respuestas antiguas canceladas; cambio de actor, ámbito y entorno; aceptación obsoleta; retirada e historial independientes; marcador pendiente intacto; registro sin GET protegido; rechazo editorial sin modificar texto ni publicar automáticamente. Conservadas regresiones de W-01, idempotencia, recibos y estado actual.
- Tipos app/test, ESLint completo y build PASS. Build con envDir/configFile desactivados y URL loopback sintética, sin .env. Aviso de chunk Root 732.80 kB >500 kB. Sintaxis del arnés, JSON, enlaces y diff --check PASS. Dos errores de tipado iniciales en las pruebas corregidos; no aborto nativo.
- Visual con fixtures HTTP, **no integración real**: reporte 1792428589474 PASS, seis estados ×1280/320, doce capturas, siete comprobaciones; sin overflow, errores de render, solicitudes inesperadas ni mutaciones. Teclado, foco, lectura íntegra larga y tres consentimientos independientes; cuatro capturas inspeccionadas/saneadas conservadas. Los fallos anteriores de ruta Chromium, loopback y dos selectores no cuentan como PASS; loopback se ejecutó mediante aprobación normal. Vite/Chromium propios cerrados.
- Backend sólo lectura: nueve referencias conservan huella. Contrato real contrastado con OpenAPI/controller/DTO/servicio/pruebas; referencia 6e16e548e26850c25adbafd3a8ff15c5e7947657 reportada por handoff, no confirmada por Git (Permission denied del sandbox). Dos fuentes de rechazo editorial difieren del A–H histórico. Web A–H: 17/27 huellas iguales, diez diferentes por esta tarea; nueve fuentes protegidas sin cambios. Sin afirmar nueva pareja de SHA integrada.

No se repiten A–H ni ensayos de baja; su evidencia permanece histórica y no acredita los cambios nuevos fuera de las pruebas con fixtures. Pendientes: backend compatible y destino, textos/aviso previo/consentimientos y aprobación jurídica/operación. Sin despliegue o activación acreditados. Constancias parciales, limpieza V2 real en Spaces, RESOLVED y Android/GPS mantienen sus límites. Sin cambios backend, .env, QA, VM, políticas, commit, push o merge. Historial anterior preservado.

## 2026-10-19 — Revisión estática para publicación de alta documental

[Registro de publicación](docs/onboarding-production-publication-review.json). Base local/remota comprobada mediante fetch limitado: fcc81e98e23b569723c78304caa6098e64b01963, feature/driver-verification, sin divergencia; índice vacío al empezar. Revisión completa de diff y archivos nuevos, conservación del historial y otros worktrees. Primer commit de 17 archivos: 88a6ec8; el registro documental se crea antes del segundo commit y del push, sin atribuirles éxito anticipado.

- Correspondencia nueva de lectura: 27/27 huellas Web A–H, 23/23 backend fuente/runtime, 6/6 fuentes protegidas; 7/7 capturas seleccionadas y 4/4 reportes históricos locales. No hay diferencias funcionales sin cobertura. Las tres diferencias frente a la evidencia previa a A–H son arneses ya cubiertos por la ejecución integrada. Se conserva la separación entre contenido probado, SHA base histórico y futuro commit backend compatible no confirmado.
- Se reutilizan, sin ejecutar otra vez, A–H PASS y las 98 pruebas únicas de archivos completos, tipos/lint/build y visual 1280/320 históricos. No se inició navegador, backend, PostgreSQL, Docker, correo ni Spaces en esta revisión. Ningún cambio de producto.
- Sintaxis de cinco scripts PASS, cuatro JSON de evidencia válidos antes de añadir este registro; 148 enlaces relativos existentes, 12 a artefactos locales excluidos; 138 importaciones relativas resueltas, incluidas las plantillas de arnés. La primera comprobación textual de importaciones confundió una plantilla generada con la ubicación del script; se corrigió el comprobador estático usando el AST y la ubicación virtual, sin modificar producto ni ejecutar suites. No fue un fallo del runner integrado.
- Selección de archivos explícita y revisión del índice: 17 archivos de implementación/pruebas corresponden al contenido revisado; 13 blobs sólo normalizan CRLF/LF. Arneses y evidencia se revisan por separado. Sin .env, secretos reales, credenciales, URLs privadas/firmadas, documentos reales, builds, perfiles o trazas crudas. Valores de credenciales de ensayo en el helper son literales sintéticos, nunca credenciales operativas. Capturas sintéticas revisadas y huellas verificadas. git diff --check PASS.

La publicación requiere backend con el contrato/migración/runtime cuyas huellas constan en la evidencia; el SHA base no basta. No se acredita despliegue mixto, activación ni preparación productiva general. Se mantiene aprobación jurídica y validación de infraestructura/operación pendientes; limpieza Spaces V2, RESOLVED y Android/GPS fuera. Consulta remota previa al push y SHA final deben verificarse al completar la publicación autorizada. Sin backend modificado, QA, merge o despliegue. Las secciones siguientes conservan resultados históricos y sus límites originales.

## 2026-10-19 — Integración real aislada del alta documental: PASS A–H

[Matriz y límites](docs/DOCUMENTARY-ONBOARDING-PRODUCTION-WEB.md), [evidencia integrada saneada](docs/onboarding-production-integration-evidence.json) y [preflight](docs/onboarding-integration-preflight.json). Una petición normal de aprobación, permitida; una ejecución `node scripts/verify-onboarding-production-web.mjs`, run 1792397072142, exit0. No repetición de las 98 pruebas con fixtures ni tipos/lint/build, ya que producto/pruebas no cambiaron. El FAIL 1792395222480 por selector y el rechazo posterior por límite de diagnóstico quedan como históricos; no se borran ni se convierten retroactivamente en PASS.

- Nuevos PASS: A publicación SUPER_ADMIN desde Web; B pérdida real de respuesta después del commit y recuperación GET original sin repetir POST; C registro independiente/confirmación de correo capturado/login; D consentimiento personal separado; E identidad y unidad con cinco uploads JPEG/PNG, complete y submit; F cinco previsualizaciones privadas y dos decisiones administrativas explícitas; G aceptación sola PENDING/OFFLINE/perfil PENDING/cero expedientes; H historia LOCAL_TEST intacta. 12 puntos internos PASS, cero FAIL/BLOCKED. Respuestas funcionales reales, sin fixtures HTTP.
- Recuperación: antes 0 versiones/comandos/eventos, revisión 1; después del commit 1/1/1, revisión 2; después del GET 1/1/1, revisión 2. Un POST de publicación, GET 200 APPLIED con misma clave, cero duplicados; admisión false en todos los cortes. Una aceptación, cinco PUT, 15 operaciones SDK y un correo de registro capturado; no se acredita entrega de correo de decisiones o a buzones reales.
- Preparación declarada: SUPER_ADMIN confirmado y cuenta/perfil/sujeto/expediente LOCAL_TEST históricos. Política, nuevo independiente, aceptación, identidad, bicicleta, archivos, presentación y revisión creados desde Web; no mediante seed. Imágenes y textos sintéticos sin validez legal. PostgreSQL propio 55459 con identidad de clúster y base objetivo comprobada antes de migrar; API 4227/Web 4228, sin .env/Docker/base principal. Backend/Prisma/guardias/SDK reales, transportes de correo/almacenamiento simulados.
- Fuentes: Web base fcc81e98e23b569723c78304caa6098e64b01963 en feature/driver-verification y backend base 06457dedd9b2f533862a0477b04b36b69e1990f0 más cambios locales. 27 huellas Web y 23 backend ejecutadas siguen coincidiendo; frente a entrada sólo cambian 3 arneses Web. No se modificó producto/backend. Se reutiliza la evidencia histórica 98 fixtures/tipos/lint/build y visual 1280/320, sin atribuirles ejecución nueva.
- Correcciones del arnés: selector histórico ya corregido, reporte incremental, dependencias explícitas, conteos tras commit/GET, revisión de identidad y unidad, JPEG adicional y segunda consulta libpq sin entorno heredado. Sintaxis de tres scripts PASS. Capturas reales 1280×900: 8; inspección de cinco y conservación de tres saneadas. JSON, enlaces, huellas de capturas y git diff --check verificados.
- Cleanup PASS: browser/Vite/backend/base propios STOPPED, postmaster.pid ausente y apagado registrado. Artefactos crudos permanecen excluidos en test-results. Sin secretos ni claves/URLs firmadas en evidencia saneada. Índice vacío; historial y cambios ajenos preservados, sin commit/push/merge/QA/despliegue/activación.

El alcance A–H queda completo. Pendientes de uso real: backend compatible con migración/runtime, textos y autorizaciones jurídicos, HTTPS/CORS/destinos reales y operación. No se valida el SHA backend base por sí solo ni un despliegue mixto. FLEET y recuperación de aceptación no se ejecutaron aquí. Limpieza V2 en Spaces, RESOLVED y Android/GPS siguen fuera. La documentación nueva queda local sin commit; lo siguiente conserva la revisión anterior y su límite entonces vigente.

## 2026-10-19 — Alta documental productiva: validación Web local y límite integrado

Base Web fcc81e98e23b569723c78304caa6098e64b01963, feature/driver-verification, inicialmente limpio. Backend 06457dedd9b2f533862a0477b04b36b69e1990f0 más cambios sin commit; no modificado. Fuentes y contrato en [informe](docs/DOCUMENTARY-ONBOARDING-PRODUCTION-WEB.md) y [evidencia](docs/onboarding-production-web-evidence.json).

- Cinco archivos completos, 98 casos únicos por último resultado: onboarding-production 27, verification-pages 27, verification-service 22, verification-recovery 14, verification-upload 8. Lote inicial 94/94 previo a ampliación; lote posterior 97/98 falló sólo por selector alt antiguo, sin ocultarlo. Repetición final de páginas/onboarding 54/54, junto con 44/44 de servicio/recuperación/carga del lote anterior. No se suman repeticiones.
- TypeScript app/test, ESLint y build PASS; aviso de chunk Root >500 kB conservado. Sintaxis de arneses/JSON/enlaces/diff revisados. TEMP/TMP propio por ENOENT del runner inicial. Expectativas de texto y helpers de Fast Refresh corregidos; no aborto nativo.
- Revisión visual independiente PASS: 8 capturas 1280/320, sin overflow final/errores/solicitudes inesperadas/mutaciones; texto íntegro, scroll/Space/Tab, foco visible, fondo inerte del diálogo, Escape/retorno, historial y política ausente. Botones largos permiten envolver texto; capturas del diálogo limitadas al viewport nativo. Render con fixtures, no integración.
- Integración real **parcial y FAIL global**: intento 1792395222480 alcanzó AppModule/PostgreSQL propios y política ausente. Paró al buscar un texto antiguo del aviso histórico. Selector corregido, pero el lanzamiento posterior fue rechazado por revisión automática por exceder el límite interpretado de diagnóstico; no se ejecutó ni se eludió. Tras delegación del usuario se dejó pendiente. No se acredita publicación/registro/aceptación/recuperación/cargas/revisión integrada.
- Preparación: dos paradas sandbox psql 10013 (segunda diagnóstico), una por ruta de dist inexistente. Identidad de base comprobada antes de migrar en los intentos autorizados, configuración sintética con envFile deshabilitado, SDK/Resend reales con transportes en memoria. Cuatro clústeres apagados. Sin Docker, producción, .env ni transportes reales. Las 31 huellas de fuentes backend históricamente probadas coinciden; no se atribuyen sus 122+38 casos a una ejecución Web conjunta.

Pendiente concreto: completar arnés integrado con autorización adicional; disponer del backend/migración compatibles; aprobación jurídica de textos y finalidades, configuración/CORS/destinos reales y operación. No aptitud productiva general ni activación acreditada. Baja/entrega/CANCELLED no se repitieron por no cambiar su código, sesión o HTTP. Limpieza V2 real y RESOLVED siguen separados; Android/GPS fuera. Sin backend modificado, QA, commits, push o despliegue. Cambios y documentos de esta tarea quedan sin commit; se conserva el historial siguiente.

## 2026-10-18 — Cierre local de la publicación manual Web

[Informe final local](docs/DOCUMENT-DELETION-WEB-STAGE-CLOSURE.md) y [registro de correspondencia](docs/deletion-web-stage-closure.json). Documentación nueva local **sin commit**. Se conserva debajo toda la evidencia histórica y el incidente de publicación bloqueada; el commit manual posterior no convierte aquel intento fallido en una consulta ejecutada.

Comprobaciones nuevas, exclusivamente estáticas/de lectura:

- Web `feature/driver-verification`, HEAD `ef3df330cdd4c25a9d8416e16656287c50631b85`, padre a87081c; un commit manual de30 archivos y checkout inicialmente limpio. Los29 candidatos de la revisión previa coinciden por SHA-256; inventario30/30, sin archivos ajenos incorporados detectados ni dependencias relativas ausentes en98 importaciones. Blobs comparados normalizando exclusivamente CRLF/LF.
- Evidencia final Web:38/38 comparaciones (20 invariantes +6 fuentes finales +12 del navegador) corresponden al contenido versionado. No hay un cambio posterior de producto sin cobertura en este alcance. Las diferencias respecto de las evidencias más antiguas conservan su explicación y cobertura posterior; no se atribuye equivalencia total donde no existe.
- Backend HEAD `5907bca3555d06b0f981f61cd3c3d179f49a66e4`, sólo lectura.71/71 huellas del índice publicado y12/12 referencias no compiladas de la última revisión Web coinciden con archivos/blobs actuales. De11 referencias no compiladas del recorrido CANCELLED,10 exactas; la copia previa del servicio coincide con el SHA probado y sólo cambia currentMessage, con reporte histórico15/15. Contrato leído en fuente/OpenAPI: projection=session, GET por clave, APPLIED/CANCELLED, 404 incierto, V2/constancias, H/incidencias, gates y KEEP/RELEASE, BLOCKED y Conductor.
- Comparación de archivos backend rastreados con blobs de HEAD: sólo BITACORA/VERIFICATION tienen diferencias; dos informes de cierre adicionales son locales no versionados. Git status backend no disponible en este entorno; no se afirma un inventario completo de no rastreados/índice. No se modificó ningún archivo backend. Sus textos antiguos sobre Web bloqueada en a87081c no sustituyen el HEAD Web comprobado aquí.
- Referencias de ocho documentos publicados:150 enlaces relativos con destino local,135 versionados y15 a test-results excluido. Esos15 no son enlaces disponibles en un clon sin artefactos locales, ni dependencias de compilación. Dos anclas comprobadas. Comprobación final PASS:15 JSON válidos,97 enlaces relativos del nuevo cierre/continuidad existentes, formato de archivos nuevos y `git diff --check`.81 archivos backend observados conservaron sus huellas al cierre; resultados en el registro.

Resultados reutilizados, no nuevos: entrega restringida real aislada, recibo realmente depurado y cuatro recuperaciones CANCELLED;89 pruebas completas de presentación Web y22 casos de servicio de la etapa anterior; tipos/lint/build y navegador sintético14 capturas. No se suman como una ejecución conjunta. La pareja de SHA publicada localmente tiene correspondencia contractual y de contenido, **no una ejecución integrada nueva**. Ninguna suite, navegador, build/tipos/lint de producto, backend, PostgreSQL, Docker o Spaces ejecutados en este cierre.

Publicación reportada por el usuario; origin almacenado coincide con HEAD, pero **confirmación remota actual pendiente**. No se intentó fetch/ls-remote. El fallo anterior del servicio de aprobación fue por capacidad antes de ejecutar la acción, sin determinación de inseguridad; no se eludió. Se completa el alcance local documental sin afirmar sincronización actual con el servidor.

Pendientes separados: Spaces V2 real; tareas RESOLVED; términos/privacidad/custodia/cobertura y preparación operativa; integración restante V2 y rollback/rollout coordinado con backend compatible. Cinco huellas antiguas backend siguen como trazabilidad ajena pendiente, no como nuevo fallo de estos recorridos. Constancias de alcance acreditado no garantizan eliminación total. Sin despliegue, activación, cambios de producto/backend, commit, push, merge o QA; Android/GPS fuera. Este cierre y su continuidad quedan sin commit.

## 2026-10-18 — Auditoría previa a publicación de V2

Base `a87081c6b6c91d8feef5598ec33db734ec7592e5`, rama `feature/driver-verification`; remoto confirmado `https://github.com/zorgoluis/mandaria-frontend.git`. Fetch inicial: 0 commits locales exclusivos y 0 remotos exclusivos. Staged inicialmente vacío; se revisan 29 archivos pendientes propios y se añade únicamente documentación de esta auditoría. [Registro y huellas](docs/deletion-v2-publication-review.json).

- Comprobaciones nuevas: 38 comparaciones de fuentes con la última evidencia de restricciones, 54 huellas de capturas/reportes locales referenciados, JSON válido, 112 enlaces relativos y 98 importaciones locales existentes, revisión de secretos/exclusiones, sintaxis de los tres arneses pendientes y `git diff --check`. Staged vacío; staging y revisión de su diff quedan pendientes por el bloqueo de permisos descrito abajo.
- Evidencia histórica reutilizada, sin nuevos recorridos: recuperación CANCELLED real; entrega restringida; recibo realmente depurado; presentación sintética de mensajes/Conductor. Diferencias entre huellas antiguas y actuales identificadas en el registro, sin atribuirles equivalencia total. Cambios posteriores cubiertos por las pruebas completas y revisión de presentación documentadas abajo; la lógica de recuperación, permisos y envío conserva su cobertura.
- Últimos resultados de presentación: 89/89 en dos archivos completos (57 V2 + 32 páginas), tipos, lint y build PASS; servicio conserva sus 22 casos PASS anteriores. Estos resultados no son una nueva ejecución conjunta. No hay cambios de producto posteriores sin cobertura; no se repiten pruebas, tipos ni build para esta auditoría documental. Advertencia histórica de chunk Root714.49kB >500kB preservada.
- No se incluyen `.env`, credenciales, claves del canal privado, URLs firmadas, documentos reales, perfiles, dependencias, build ni trazas/reportes crudos. Las referencias `test-results` identifican evidencia local deliberadamente excluida, no archivos requeridos para compilar. Los arneses y fuentes sintéticas necesarios sí se incluyen.

La discrepancia de huella del helper `deletion-isolated-browser.mjs` respecto a entrega/depuración ya estaba reconciliada como líneas vacías finales en [la revisión publicada anterior](docs/deletion-publication-review.json); su contenido actual coincide con aquella versión publicada. No se modifica ni se reejecutan dichos recorridos. No se inicia backend, Docker43000 ni producción. V2 y fix CANCELLED compatibles son necesarios; tareas RESOLVED y drenaje real de Spaces siguen pendientes backend. Constancias parciales no acreditan eliminación total; revisión sintética no acredita integración real. Commits/push de rama no equivalen a despliegue.

Resultado de publicación: **bloqueada antes de staging**. Dos solicitudes de `git add` explícito fallaron en el revisor automático por capacidad del modelo; la herramienta confirmó que no ejecutó la acción y que no era una determinación de inseguridad. No se eludió el control. Cero commits nuevos, sin push y HEAD sin cambios. No se acredita revisión de diff staged inexistente ni comprobación posterior de SHA remoto. Al reanudar deben completarse ambas revisiones, actualizar referencias remotas y verificar nuevamente ausencia de divergencia antes de publicar.

## 2026-10-18 — Mensajes de revisión y etiqueta DRIVER

Rama feature/driver-verification, HEAD a87081c6b6c91d8feef5598ec33db734ec7592e5. Cambio Web de presentación en operational-contract/operational-review, con fuentes previas y comparación contra copias. Se preserva trabajo pendiente anterior. [Informe](docs/RESTRICTION-REVIEW-WEB.md), [evidencia](docs/restriction-review-web-evidence.json), [fuentes](docs/restriction-review-web-sources.json).

- `npx vitest run src/test/deletion-v2.test.tsx src/test/deletion-pages.test.tsx`: **89 PASS**, dos archivos completos (57+32), primera ejecución.24 casos nuevos en V2, conservando sus33 previos; se refuerza el caso histórico/actual existente de páginas. Precedencia BLOCKED, motivos null/desconocido, gate pendiente/KEEP/RELEASE, fechas vencidas/ausentes/incoherentes, tarea separada, Conductor y fallback, permisos/acciones y cuerpos anteriores intactos.
- `npm run typecheck:test`: PASS. `npx eslint src/deletion/operational-contract.ts src/deletion/operational-review.tsx src/test/deletion-v2-fixtures.ts src/test/deletion-v2.test.tsx src/test/deletion-pages.test.tsx`: PASS. `npm run build`: PASS,2320 módulos; aviso Root714.49kB>500kB conservado.
- `node --check scripts/verify-restriction-review-web.mjs` y `node --check scripts/verify-deletion-v2-web.mjs`: PASS. El arnés anterior sólo adapta un selector a la nueva estructura; no se ejecutó el recorrido V2 amplio.
- `node scripts/verify-restriction-review-web.mjs`: PASS/exit0. Final `test-results/restriction-review-1792381848860/report.json`,14 capturas1280/320 de bloqueo, tarea, pendiente Conductor, KEEP, RELEASE, vencido y foco. Cero overflow, errores, solicitudes inesperadas, mutaciones, marcadores o recuperación. Render React/Chromium real con API/identidad sintéticas; no acredita integración HTTP/PostgreSQL.
- Primera revisión visual `1792381752769`: PASS/12 capturas. Se añadió captura de tarea y se quitaron fechas agregadas de objetos no comunicados de la fixture, conservando producto idéntico; final14 capturas. Ambos reportes preservados, sin abortos ni ejecuciones incompletas, sin duplicar conteos. Inspección visual escritorio/320 con legibilidad y foco visible.
- Comparación exacta normalizando CRLF: lógica de acciones/permisos y formulario/envío de OperationalReview sin cambios; validReviewAt y reviewResult idénticos. Hashes de contrato, servicio, páginas, sesión/HTTP, hooks, recibos y marcadores conservados. `git diff --check` PASS; staged vacío.

Backend sólo leído:15 archivos observados sin cambios desde baseline; el documento de análisis se actualizó concurrentemente y se guardan ambas huellas. Servicio fuente/compilado ya incluían corrección separada al iniciar el registro de huellas, distinta del informe histórico CANCELLED. No se atribuyen a esta tarea las15 pruebas backend declaradas allí. La reapertura de tareas RESOLVED sigue pendiente independiente; no se modifica su lifecycle.

Vite/Chromium propios detenidos y4198 libre. Sin backend, PostgreSQL, .env, Docker, Spaces, datos reales, QA, commit, push o despliegue. No se repiten las cuatro pérdidas de respuesta, entrega, depuración ni restauración. La evidencia anterior conserva su fecha/huellas; no es nueva integración de estos mensajes. Constancias parciales y drenaje real pendiente; no acredita eliminación total ni aptitud productiva.

## 2026-10-18 — Recuperación administrativa CANCELLED real

Web feature/driver-verification HEAD a87081c6b6c91d8feef5598ec33db734ec7592e5; backend b300c250df9fcc4aea8bcd76a1d6ed7c93e04e9a más fix sin commit. Versiones exactas, precondiciones y procedimiento en [handoff](docs/CANCELLED-COMMAND-RECEIPT-WEB.md); [evidencia](docs/cancelled-receipt-web-evidence.json) registra hashes y distingue el FAIL preparatorio. Se conservan cambios y evidencias V2 anteriores.

- `npx vitest run src/test/deletion-service.test.ts src/test/deletion-pages.test.tsx src/test/deletion-v2.test.tsx`: 3 archivos completos, 86 PASS (22+31+33). Parsing APPLIED/CANCELLED, formas incompatibles/sobre interno, habilitación limitada, separación histórico/actual, recuperación sin POST, marcadores y permisos.
- Después de reforzar la regresión 404/401/403/500 con igualdad exacta de marcador/clave, ausencia de éxito falso y texto de incertidumbre, se preservan los cuatro casos previos restore-policy y se añade resolve404. Último `npx vitest run src/test/deletion-pages.test.tsx`: 32 PASS. Consolidado final87 casos únicos (22+32+33); no se suman repeticiones. No hubo cambios de producto después del recorrido integrado.
- `npm run typecheck:test`: PASS antes y después del ajuste final de test. `npx eslint src/deletion/receipt.ts src/deletion/pages.tsx src/deletion/review.tsx src/deletion/operational-review.tsx src/test/deletion-service.test.ts src/test/deletion-pages.test.tsx src/test/deletion-v2.test.tsx`: PASS; lint del único test posteriormente ajustado también PASS.
- `npm run build`: PASS, tsc y Vite2320 módulos. Advertencia Root712.66kB>500kB conservada.
- `node --check scripts/verify-cancelled-receipt-web.mjs` y `node --check scripts/verify-deletion-v2-web.mjs`: PASS. El arnés sintético anterior sólo actualiza su expectativa CANCELLED habilitada; no se reejecuta ni se presenta su evidencia antigua como actual.
- Preflight CLI backend tsx + nuevo arnés `--preflight-only`: PASS/exit0, reporte1792379339151, SQL/health200/login reales. Completo1792379401491: FAIL/exit1 con reporte por409 ACTIVE_REQUEST_EXISTS de precondición de segunda solicitud solapada, antes de las decisiones Web. Diagnóstico por código; semilla corregida a otro titular. Completo1792379629311: PASS/exit0. No aborto nativo ni ejecución sin reporte.
- Navegador real: ACKNOWLEDGE_TASK, REVIEW_RESTRICTION KEEP y RELEASE, BLOCK_CLEANUP_AUTHORIZATION global. Para cada uno, otra conexión confirma comando/evento persistidos antes de perder la respuesta; Web recibe502, conserva marcador, recarga y usa GET real original200 APPLIED/CANCELLED.4 POST Web,4 comandos,4 eventos; sin reenvío.5 GET navegador (incluye histórico posterior),8 GET repetidos sin efectos,4 GET ajenos404. Sesión preservada; histórico5 y actual6 separados. Fechas/presupuestos intactos, cuenta inactiva y otros gates conservados.0 entregas.
- 18 capturas locales1280/320 y comprobación de no overflow, foco del modal y confirmación/recuperación por teclado. Revisión visual representativa identifica **FAIL de presentación vigente** CANCELLED-CURRENT-MESSAGE; recuperación PASS no equivale a pantalla totalmente aprobada. Estado final real BLOCKED/AUTHORIZATION_UNDER_REVIEW con dos gates activos mientras mensaje dice revisión completada. Reproducción y referencia backend/Web en handoff; backend no corregido. Etiqueta DRIVER genérica previa también registrada.

Los tres arneses/utilidades y fuentes ejecutadas se identifican por SHA256.15 fuentes/artefactos backend y producto Web verificados sin cambios durante el recorrido. git diff --check PASS, staged vacío; puertos propios4217/4218/55444 verificados libres. PostgreSQL temporal propio y Nest/Vite/Chromium cerrados; sin Docker43000, .env existente, Spaces real o servicios ajenos. Sin repetición de entrega/recibo depurado/restauración/suites backend. Evidencia histórica sigue histórica. Constancias pueden ser parciales, drenaje Spaces pendiente; no acredita eliminación total, despliegues mixtos ni aptitud productiva. Sin staging, commit, push, QA o despliegue.

## 2026-10-13 — Onboarding y verificación documental desde main

### Referencias y alcance

Frontend worktree `C:/Users/zorgl/.codex/worktrees/driver-verification-web/mandaria-frontend`, rama `feature/driver-verification`, base/HEAD `06d976619322d9811b5325fc73cd16d15e00d829`. Backend read-only `feature/driver-verification` HEAD `90b72433f8a5476ece5fda4437dc15a0a6a314f2` **más working tree sin commit**. Huellas SHA-256, mapeo de pantallas/endpoints, privacidad y procedimiento de recuperación en [DRIVER-VERIFICATION-WEB.md](docs/DRIVER-VERIFICATION-WEB.md). El análisis anterior se conserva con actualización en [compatibilidad](docs/DRIVER-VERIFICATION-MAIN-COMPATIBILITY.md).

QA principal y sus cuatro cambios documentales previos preservados. No existe AGENTS.md ni BITACORA.md en la base main seleccionada; se crea BITACORA de esta rama. No se copió implementación QA ni se modificó backend, App, Landing, .env, nginx, versiones, flags, cobros, créditos o cinco intentos.

### Comandos ejecutados y resultados

- `npm ci --offline --ignore-scripts`: dependencias existentes instaladas, 345 paquetes, auditoría reportó 0 vulnerabilidades. Ninguna dependencia añadida; no equivale a auditoría integral de seguridad.
- `npx vitest run src/test/verification-recovery.test.ts src/test/verification-service.test.ts`: primera ejecución24/24; ampliaciones posteriores indicadas abajo, no se suman duplicados.
- `npx vitest run src/test/verification-pages.test.tsx src/test/api.test.ts src/test/driver-portal.test.tsx src/test/independent-drivers-api.test.ts src/test/delivery-completion.test.tsx`: los cuatro archivos existentes pasaron completos (111 casos); páginas tuvo una espera defectuosa en el fixture de notificación, corregida y repetida como archivo completo.
- `npx vitest run src/test/verification-pages.test.tsx src/test/verification-recovery.test.ts src/test/verification-service.test.ts`: 45/45 en ese estado; ampliado posteriormente.
- `npx vitest run src/test/verification-service.test.ts src/test/api.test.ts`: 41/41 finales (20 documentales +21 HTTP centralizado).
- `npx vitest run src/test/verification-pages.test.tsx src/test/driver-portal.test.tsx`: driver38/38 con dos nuevas regresiones; se corrigió constructor FormData de dos fixtures, sin modificar semántica de producto para aprobar.
- `npx vitest run src/test/verification-pages.test.tsx`: 27/27 finales, incluido PUT fallido/éxito y confirmación explícita de adjunto incompleto. Archivo repetido íntegro también tras protección adicional de respuesta tardía:27/27.
- `npx vitest run src/test/flows.test.tsx src/test/verification-recovery.test.ts`: 58/58 finales (45 flujos +13 recuperación). Expectativas de navegación actualizadas a Verificación documental por rol; fallos previos de expectativas no se acreditan.
- Regresión adicional HTTP408 en `npx vitest run src/test/verification-recovery.test.ts`: 14/14; conserva marcador y no trata timeout HTTP como fracaso confirmado.
- Consolidado de casos únicos finales: **219/219 en8 archivos completos afectados**, de los cuales61 en los tres archivos documentales nuevos. No es ejecución de suite general ni un único run simultáneo. No hubo aborto del runner; fallos ordinarios de desarrollo y aserciones fueron corregidos y sus archivos completos reejecutados.
- `npm run typecheck:test`: PASS (TypeScript tests). `npm run build`: PASS, ejecuta `tsc -b && vite build`; 2307 módulos, aviso de chunk Root aproximadamente643kB >500kB, sin silenciarlo ni modificar bundling/configuración.
- `npx eslint src/verification src/test/verification-fixtures.ts src/test/verification-pages.test.tsx src/test/verification-recovery.test.ts src/test/verification-service.test.ts src/services/api.ts src/services/errors.ts src/app/App.tsx src/auth/Login.tsx src/layouts/AdminLayout.tsx src/driver-portal/types.ts src/driver-portal/pages.tsx src/independent-drivers/types.ts scripts/verify-documentary-web.mjs`: PASS. Revisión final incluye además los dos archivos modificados de regresión driver-portal/flows.
- `node scripts/verify-documentary-web.mjs`: PASS, 9 comprobaciones de navegador, 0 errores de consola/render, ninguna llamada QA ni red externa; servidor y navegador temporales cerrados.
- `git diff --check`: PASS. Sin commit, push o despliegue.

### Cobertura y nivel de evidencia

| Escenario | Evidencia nueva |
| --- | --- |
| Independiente sin proveedor, correo/registro/login de retorno seguro, rol pendiente | Componentes/servicios simulados, navegación real de React; no correo real. |
| Términos completos, checkbox desmarcado, versión/hash, separación FLEET/DRIVER, respuesta perdida | Unitarias de componentes/recuperación y navegador fixture con teclado. Representante no tiene botón de aceptación personal. |
| Identidad/licencia y propia/rentada/prestada | DTOs exactos en pruebas; no se fabrica licencia o aprobación. |
| JPEG/PNG, PDF/tipos rechazados, tamaño, URL vencida, PUT fallido, completar carga | Fetch/almacenamiento **simulados**; no Spaces, no normalización real acreditada. |
| Privacidad, acceso autenticado PNG, revocación objectURL, salida de pantalla | Pruebas de ausencia en cache/storage y respuesta tardía; PUT sin Authorization/referrer Mandaria. |
| Presentar/retirar explícitos, corrección en nuevo recurso, decisión sólo SUPER_ADMIN, conflicto | Mocks fieles a expectedVersion/códigos; sin transacciones PostgreSQL reales. |
| Notificación fallida no revierte APPROVED | Fixture de decisión/aviso separados. |
| ABSENT, APPLIED histórico con estado vigente distinto, CLOSED_NO_EFFECTS, timeout cierre | Mocks de recibos; no acreditan carrera de locks en backend. Clave/cuerpo no se reenvían automáticamente. |
| Cambio de cuenta, marcador mínimo, recarga sin cuerpo y almacenamiento dañado | Unitarias de store y guard; consulta/cierre ajenos bloqueados, ningún cuerpo sensible persistido. |
| Restricción de nuevas asignaciones / servicio comprometido legacy | DriverPortal38 casos y traducciones de errores reales del contrato. Dos nuevas regresiones: pendiente sin proveedor y revisión vencida con servicio INDEPENDENT ya comprometido. Backend sigue siendo autoridad. |
| Flotilla y navegación | ProviderScope existente con recursos autorizados simulados; claves/remontaje por proveedor y roles. Aislamiento real de memberships/DB pendiente. |

### Revisión visual nueva (fixtures exclusivamente)

Vite temporal en loopback4198, con envDir deshabilitado; APIs interceptadas con fixtures **intencionalmente** y PNG generado con texto «EVIDENCIA SINTÉTICA — NO DOCUMENTO». Sin claves, tokens reales, documentos personales, correo, storage real, HAR ni sesiones persistidas. Capturas locales ignoradas por Git:

- `test-results/documentary-web/registration-desktop.png`
- `test-results/documentary-web/onboarding-desktop.png`
- `test-results/documentary-web/onboarding-mobile.png`
- `test-results/documentary-web/identity-mobile.png`
- `test-results/documentary-web/fleet-desktop.png`
- `test-results/documentary-web/review-desktop.png`
- `test-results/documentary-web/review-mobile.png`
- `test-results/documentary-web/report.json`

1440×1000 escritorio /390×844 emulación móvil. Lectura visual de capturas y aserción de ausencia de desbordamiento horizontal; captura con animaciones finalizadas para no confundir transición del drawer con contenido superpuesto. Tab desde texto completo a checkbox, Space y Tab/Enter aceptan explícitamente; antes no había mutación. Checklist administrativo inicialmente desmarcado; cierre de evidencia con teclado retira imagen. No se acredita dispositivo físico, lector de pantalla, VM, hosting o CSP desplegados.

### Integración real y pendientes

**No ejecutada** nueva integración Web→backend HTTP→PostgreSQL. El backend reporta su clúster temporal de pruebas detenido; no se identificó entorno activo seguro ni se conectó una base desconocida. Sus pruebas HTTP/SQL anteriores son evidencia histórica backend, no resultado de esta Web. Spaces y correo reales tampoco fueron usados. Requisitos de infraestructura sintética, endpoints incompletamente tipados en OpenAPI, privacidad/baja/purga/producción y handoffs Landing/App están separados en el informe de implementación. No declarar activación ni cierre productivo.

---

## 2026-10-13 — Compatibilidad documental Driver/Vehicle sobre backend main

Estado actual: análisis finalizado, implementación no iniciada. Web QA `e303739`, checkout principal limpio al inicio; backend feature/driver-verification/main `1fa2cb1` con 32 migraciones, QA `9ad39b9` con 46, comparados sólo lectura. Referencias locales sin fetch. [Informe completo](docs/DRIVER-VERIFICATION-MAIN-COMPATIBILITY.md).

Cierre: avance concurrente backend documental a `90b7243` y QA a `674e172`; diff de código/prisma y OpenAPI comparado vacío respecto a las referencias iniciales. Matriz contractual sin cambio; backend limpio al cierre. No se hicieron esos commits desde esta tarea.

Solicitud: contrastar contratos y diseñar registro/revisión de independientes y flotillas sin integrar QA. Cambios: sólo informe, BITACORA, README y VERIFICATION. Recomendación futura: Web main `06d9766` con adaptación explícita de rutas DETAILED/recuperación aún presentes; no compatibilidad integral acreditada. Bloqueos: provider null/alta DRIVER, expediente privado versionado por identidad/unidad, notificación durable, recuperación propia y decisiones de transición/purga. Existentes, servicios comprometidos y cinco intentos preservados.

Verificaciones NUEVAS: Git refs/status/diff/tree, controladores/DTO/proyecciones y OpenAPI main/QA, consumidores/rutas/guards; revisión documental. No pruebas funcionales, HTTP/DB, navegador, suites, tipos/lint/build, instalaciones ni servicios. Evidencia histórica siguiente no acredita onboarding nuevo. Sin cambios backend/app/configuración, merge, commit/push/despliegue ni mensajes a agentes.

## 2026-10-12 — Aprobación manual de cuenta Negocio: implementación Web

## 2026-10-13 — Presentación del cierre de ejecución

Checkout: `C:/Users/zorgl/Documents/mandaria-frontend`, rama `QA`, base `2e595048cf62cce4d8ed47ca6ac69140f2012fc8`; limpio al iniciar. AGENTS.md no existe en este checkout. Se revisaron BITACORA, README y VERIFICATION.

- Causa: ExecutionProgress identificaba el paso actual sólo por phase, aun con custodia terminal. Ahora DELIVERED/RETURNED trasladan el resaltado y aria-current="step" al cierre; AT_DROPOFF conserva su significado de último hito y todos los hitos siguen visibles. RETURNED mantiene el texto diferenciado de devolución. Sin cierre, la fase continúa siendo actual incluso sin asignación/acciones: no se infiere entrega.
- Archivos: src/execution/components.tsx, src/test/execution.test.tsx, scripts/verify-execution-terminal.mjs, BITACORA.md y VERIFICATION.md. Se reutiliza el CSS existente. Revisión estática de consumidores: dispatch/pages.tsx (proveedor), dispatch/admin.tsx (administración), driver-portal/pages.tsx (repartidor/independiente), execution/incidents.tsx (incidencias), directamente o mediante ExecutionPanel. Sin cambios de permisos, operaciones, historial ni contratos.
- `npx vitest run src/test/execution.test.tsx`: archivo completo, 40/40 aprobadas (tres casos nuevos: entregado, devuelto y transición desde destino sin entrega).
- `npx eslint src/execution/components.tsx src/test/execution.test.tsx scripts/verify-execution-terminal.mjs`: aprobado.
- `npm run typecheck:test`: aprobado. `npm run build`: TypeScript y Vite aprobados; advertencia de chunk mayor de 500 kB, existente.
- `node scripts/verify-execution-terminal.mjs`: Chromium con fixtures del componente, 1440 y 390 px. Un único aria-current coherente por estado, sin errores de render ni desbordamiento. Capturas revisadas: test-results/execution-terminal/1440.png y 390.png. Lista semántica conservada; no se añadieron controles ni tabulaciones artificiales.
- Límites: evidencia nueva frontend sintética, separada de las verificaciones históricas siguientes. No acredita integración backend, pantallas completas con sesión, lector de pantalla, móvil físico ni VM. No se consultó ni entregó MDR-000002; no se modificaron servicios reales. Servidor visual temporal detenido. Sin backend, configuración, commit, push o despliegue.

### Base y fuentes

- Checkout **principal** `C:/Users/zorgl/Documents/mandaria-frontend`, rama **QA**, HEAD base `a5fe19a6c0375207e552f1b04580ba7bbe04b3e7`. Índice vacío al inicio; conservados README/VERIFICATION/V1.17/propuesta pendientes y cambio de logo del registro. No se usó el worktree f1fe.
- Backend consultado sólo lectura: QA `9ad39b9a2bf1c87d40905dcd404f6c39b824d4cb`, contrato publicado/migración46. Contraste con Git, OpenAPI humano, API_ACCESS, BUSINESS-APPROVAL-IMPLEMENTATION, ejemplos y código de business-approval/customers. Sus cambios ajenos BITACORA y `nul` se conservaron.
- Nuevo módulo `src/customer-business/`: `contract.ts`, `service.ts`, `pending.ts`, `pages.tsx`, `business.css`.
- Consumidores modificados: `src/app/App.tsx`, `src/auth/AuthProvider.tsx`, `Login.tsx`, `src/layouts/AdminLayout.tsx`, `src/services/errors.ts`; `src/customer/{contract.ts,service.ts,RegistrationPage.tsx,identity.tsx,ProfilePage.tsx,pages.tsx,MyShipments.tsx}`. Logo/CSS de registro previo conservado. Nada del contrato humano se publicó en /developers.
- Pruebas nuevas: `src/test/business-{fixtures.ts,recovery.test.ts,service.test.ts,pages.test.tsx}`. Actualizadas regresiones de registro, perfil, servicios, listado, cotización, detalle MDR y `customer.test.tsx`. Scripts visuales nuevos/actualizados: `verify-business-approval.mjs`, `verify-registration-design.mjs`, `verify-profile-design.mjs`.

### Comandos ejecutados y resultados

Desde el checkout principal, sin suite completa ni otra etapa CHECK:

```powershell
npx vitest run src/test/business-recovery.test.ts src/test/business-service.test.ts src/test/business-pages.test.tsx src/test/customer.test.tsx src/test/customer-service.test.ts src/test/customer-profile-design.test.tsx src/test/customer-registration-design.test.tsx src/test/customer-shipments-design.test.tsx src/test/customer-reconciliation.test.tsx src/test/customer-request-design.test.tsx
# 149/149 PASS en 10 archivos completos, antes de agregar 2 regresiones finales y el archivo de cotización.
npx vitest run src/test/business-pages.test.tsx src/test/customer-quote-design.test.tsx
# 29/29 PASS (25 páginas comerciales + 4 cotización, incluyendo pagadores vacíos).
npx vitest run src/test/business-recovery.test.ts
# 16/16 PASS, incluye nueva regresión explícita cambio de SUPER_ADMIN.
npx vitest run src/test/business-pages.test.tsx
# 26/26 PASS, incluye cancelar confirmación y volver a revisar sin cambiar datos.
npm run typecheck:test
# PASS: TypeScript de las pruebas.
npm run build
# PASS: tsc -b + Vite; 2343 módulos. Root final ~762.67 kB (gzip 210.19).
```

Total sin duplicar casos reejecutados: **155 pruebas distintas, 11 archivos completos**. No se redujeron pruebas para obtener verde. Las primeras ejecuciones detectaron codificación accidental en textos/aserciones, expectativa antigua BUSINESS y problemas de espera/tipado de la nueva prueba; se corrigieron y reejecutaron los archivos completos pertinentes. No hubo aborto EPERM del runner ni resultados parciales acreditados.

Lint focalizado ejecutado y aprobado:

```powershell
npx eslint src/customer-business src/app/App.tsx src/auth/AuthProvider.tsx src/auth/Login.tsx src/customer/MyShipments.tsx src/customer/ProfilePage.tsx src/customer/RegistrationPage.tsx src/customer/contract.ts src/customer/identity.tsx src/customer/pages.tsx src/customer/service.ts src/layouts/AdminLayout.tsx src/services/errors.ts src/test/business-fixtures.ts src/test/business-recovery.test.ts src/test/business-service.test.ts src/test/business-pages.test.tsx src/test/customer.test.tsx src/test/customer-service.test.ts src/test/customer-profile-design.test.tsx src/test/customer-registration-design.test.tsx src/test/customer-shipments-design.test.tsx src/test/customer-request-design.test.tsx src/test/customer-quote-design.test.tsx scripts/verify-business-approval.mjs scripts/verify-profile-design.mjs scripts/verify-registration-design.mjs
# PASS. Tras las regresiones finales se repitió lint de páginas comerciales y sus pruebas.
```

También: Prettier únicamente archivos editados; `git diff --check` PASS. Se conserva advertencia de build por chunk >500 kB, sin cambiar empaquetado/configuración.

### Matriz focalizada (fixtures/mocks)

| Área | Resultado acreditado |
|---|---|
| Registro, resend, anexión | Sólo PERSONAL; negocio opcional no activa acceso. Logo oficial conservado. |
| REGISTER histórico | PERSONAL/businessApplicationRequired orienta a solicitud; RESET/VERIFY conservados. |
| Formulario | Trim, máximos, note vacía omitida, revisión actual, confirmación, cancelación conserva campos. |
| Cliente comercial | PENDING/REJECTED Personal no equivalen a acceso Negocio; revisión, readmisión bloqueada y descenso con Receipt. Retiro y terminal remiten a nueva solicitud explícita. |
| Administración | SUPER_ADMIN, conflicto por abiertas, motivo obligatorio REJECT, revisión, grant leído, revocación/readmisión sin activación implícita; notas sólo administrativas. |
| Recuperación | APPLIED/REJECTED/CLOSED/NOT_OBSERVED, cuerpo perdido, replay mismo cuerpo/clave, cierre perdido, recarga, usuario y administrador distintos, respuesta tardía tras logout, doble clic, Web Locks y almacenamiento fallido. |
| Recibo/caché | Resultado original separado de revisión actual más nueva; lectura actual antes de limpiar; no Receipt en perfil; rechazo administrativo APPLIED diferenciado de comando REJECTED. |
| HTTP | Rutas sin duplicar prefijo, targets reales por operación, GET query/close JSON, paginación sin totalPages, 429 Retry-After sin reenvío automático. |
| Continuidad | MDR comprometida mantiene consentimiento/GPS/enlaces bajo REVIEW_REQUIRED/RESTRICTED; recuperación logística existente pasa sin mezclar protocolos. |
| Compatibilidad | Campos ausentes bloquean sólo dependencias; [] no concede REQUESTER; capacidad null no habilita por sí sola. |

### Revisión visual local — NO backend real

```powershell
node scripts/verify-business-approval.mjs
node scripts/verify-registration-design.mjs
node scripts/verify-profile-design.mjs
# PASS en los tres.
```

Chromium headless, Vite con `envDir:false`, clave Google vacía, API interceptada exclusivamente con fixtures sintéticos y tráfico externo bloqueado. No se cargó configuración local privada. Los servidores temporales fueron cerrados por sus scripts.

- Cliente/admin a **1440 y 390 px**: sin overflow, paneles legibles, tabla responsive, CTA, form, refetch, marcador tras recarga, permisos por URL. Registro/perfil: 1440/1000/390.
- Teclado: Tab entre campos, foco en diálogo, Escape, reenfoque, controles accesibles. Login del harness sintético acredita retorno de CTA, no autenticación backend real.
- Capturas locales en `test-results/business-approval/`: `customer-1440.png`, `customer-390.png`, `admin-1440.png`, `admin-390.png`, `confirmation-mobile.png`, `customer-pending.png`, `recovery-mobile.png`; `result.json` con resultado. Revisadas visualmente capturas finales de cliente escritorio y administración móvil. Registro/perfil conservan sus carpetas de evidencia.
- Corregidos durante revisión: paneles con estilo compartido, doble activo del menú y carga infinita del detalle administrativo al fallar su lectura (regresión 404). Ajustes del harness: JSX y sesión anónima antes de recarga; capturas responsive esperan finalizar transición del sidebar.

### Resultado y límites

Implementación y validación focalizada **frontend local** aprobadas. Ruta estable Landing **`/customer/business`**, no declarada desplegada. Procedimiento HTTP/recuperación y comportamiento por perfil en [documentación](docs/BUSINESS-APPROVAL-WEB-PROPOSAL.md), estado en [BITACORA](BITACORA.md).

No se ejecutó integración navegador → backend real → PostgreSQL para este módulo. Los **69/69 E2E backend publicados** son evidencia histórica independiente, no pruebas Web/VM de esta tarea. No se comprobaron despliegue ni transacciones/concurrencia reales. El entorno destino debe tener contrato 9ad39b9/migración46; campos ausentes no habilitan nuevas operaciones. Marcadores locales no equivalen a un ledger compartido entre dispositivos.

Backend no modificado; no .env/configuración/versiones/flags, Docker, migraciones, mensajes a otros agentes, servicios externos, Coita, operaciones reales, commit, push o despliegue. Se conserva historial anterior a continuación.

---

## 2026-10-12 — Aprobación manual Negocio: análisis documental

Frontend principal QA `a5fe19a6c0375207e552f1b04580ba7bbe04b3e7`, limpio al inicio. Backend sólo lectura QA `ce45dff84b3f3e4c388b5d90cf5b8a095bc36210`, 45 directorios de migraciones: sin avance respecto de la base del diseño; cambios documentales y nul ajenos preservados. Leídos README/VERIFICATION/continuidad y ambos documentos BUSINESS-APPROVAL del backend. AGENTS.md/BITACORA.md ausentes en raíz frontend.

Nueva propuesta `docs/BUSINESS-APPROVAL-WEB-PROPOSAL.md`: inventario de consumidores reales, rutas/DTO candidatos, pantallas, copy, matriz, transición, cache/recuperación comercial, compatibilidad y pruebas futuras. Actualizados únicamente README.md, esta continuidad y docs/V1.17-WEB.md además de la propuesta. Producto, API, OpenAPI generado, migraciones, configuración y versión intactos.

Verificaciones documentales nuevas: Git branch/HEAD/status, recuento de directorios de migración, búsquedas rg de consumidores y de contrato comercial en src/OpenAPI, revisión de código, referencias de archivos y diff. No se ejecutaron tests, tipos, lint, build, navegador ni otra etapa CHECK: una propuesta no se acredita con suites del producto actual. Las 32 pruebas históricas del registro (entrada siguiente) prueban su comportamiento anterior, no aprobación manual.

Hallazgos: altas/anexión/tipo aún permiten BUSINESS; confirm ignora campos de respuesta; profile/type actual sin key/Receipt; capacidades sin businessAccess. Aceptación ya depende de consent-context por MDR, frontera a conservar. Pendientes precisos: identificador de cuenta propio para recovery, query/body de intentos, snapshot «seis campos» frente a cinco comerciales, DTO/paginación/admin, readmisión REVOKED y contrato implementado. Correos de decisión no incluidos según diseño actualizado. Sin implementación, DB, Docker, backend, otros repositorios, mensajes a otros chats, commit, push o despliegue.

## 2026-10-12 — Registro público de clientes (QA)

Checkout principal `C:/Users/zorgl/Documents/mandaria-frontend`, QA sobre `2e189b8`. Nuevos `src/customer/RegistrationPage.tsx`, `registration.css`, `src/test/customer-registration-design.test.tsx`, `scripts/verify-registration-design.mjs`; ajustes en `identity.tsx`, regresión de registro/reenvío en `customer.test.tsx`, README y V1.17-WEB.

Diseño independiente del panel: dos columnas con marca/lema, Figtree local, inputs y selector Personal/Negocio en píldora, asteriscos, errores al blur/envío, bloqueo de doble envío, loading y confirmación con foco accesible. Menos de 1000px: franja de marca y formulario a una columna. Negocio requiere nombre comercial según el diseño; backend sigue admitiéndolo opcionalmente. No cambia el perfil ni el contrato del servidor.

Adaptaciones al contrato real (backend sólo lectura: customers.dto.ts, customers.controller.ts y customers.service.ts): RegisterCustomerDto contiene email/type/displayName/businessName, no teléfono. No se presenta ni envía teléfono que no podría guardarse. ACCEPTED es genérico y no indica correo previamente registrado; no se inventa ese estado ni una casilla basada en él. Se conserva reenvío explícito tras la solicitud aceptada mediante `/customer-registration/resend`, enviando el perfil completo en memoria; la bandera del service elige endpoint y no es un campo DTO. No se reenvía automáticamente ni se persisten contactos. La confirmación no promete aprobación, envío o entrega de correo; enlace a login disponible.

Verificación ejecutada:
- `npx vitest run src/test/customer-registration-design.test.tsx src/test/customer.test.tsx --pool=threads --maxWorkers=1`: **32/32 PASS**, seis pruebas nuevas y 26 regresiones. Personal, negocio obligatorio, validación inline, DTO normalizado sin campos inventados, foco en confirmación, doble envío, admisión deshabilitada, errores de campo sin detalle técnico y reenvío explícito.
- `npm run typecheck:test`: PASS. `npm run lint`: PASS; eslint final focalizado sobre archivos afectados/script: PASS.
- `npm run build`: PASS. Aviso existente de chunk Root 736.17 kB (gzip 203.25 kB).
- `node scripts/verify-registration-design.mjs`: **PASS**, Chromium 1440/1000/390 px sin overflow horizontal, teclado en selector, validación, solicitud BUSINESS, payload exacto y reenvío manual. Capturas revisadas en `test-results/registration-design/width-1440.png`, `width-390.png`, `mobile-success.png`; además width-1000, mobile-validation y result.json. Sin errores pageerror. API interceptada con datos sintéticos: no backend/correo real ni creación de usuarios. Fuentes y servicios temporales retirados al finalizar.
- Primer intento de tests tenía selector ambiguo Nombre/Nombre del negocio; el primer arnés visual buscaba Nombre sin asterisco. Corregidos sólo los selectores; ejecución final aprobada.
- `git diff --check`: PASS.

Sin backend, configuración, producción, commit, push ni despliegue. El campo teléfono y la detección de correo registrado no están soportados por el contrato actual; no se implementan ficticiamente.

## 2026-10-12 — Seguimiento público: rediseño de /track (QA)

Checkout principal `C:/Users/zorgl/Documents/mandaria-frontend`, rama QA. Conservados todos los cambios pendientes anteriores. Nuevos `src/location/PublicTrackingScreen.tsx`, `shared-tracking.css`, `src/test/public-tracking-design.test.tsx`, `scripts/verify-public-tracking-design.mjs`; ajustes `components.tsx`, `LocationMap.tsx`, `googleMaps.ts`, `google-map.test.tsx`, README y V1.18-WEB.

- `npx vitest run src/test/public-tracking-design.test.tsx src/test/location.test.tsx src/test/google-map.test.tsx src/test/google-loader.test.ts --pool=threads --maxWorkers=1`: **53/53 PASS**. Diez casos nuevos del panel (frescura/caducidad, panel expandible, terminal/incidencia/transferencia/antes de recogida, permisos y red) y un caso del mapa público. Regresiones existentes conservan extracción del fragmento, no persistencia, fotografías fuera de orden, retirada, carga tardía, SDK fallido y recuperación de enlaces.
- Tras reforzar la comprobación de bounds: `npx vitest run src/test/google-map.test.tsx --pool=threads --maxWorkers=1`: **10/10 PASS**. Mantiene instancia, no recentra cuando el punto sigue dentro del área del mapa, marcador gris en STALE y animaciones canceladas al desmontar.
- `npm run typecheck:test`: PASS; `npm run lint`: PASS; eslint focalizado final de los siete archivos TS/script: PASS.
- `npm run build`: PASS final. Advertencia existente de tamaño: Root 732.41 kB, gzip 202.25 kB.
- `node scripts/verify-public-tracking-design.mjs`: PASS, repetido tras corregir padding heredado de main. Chromium 1440/900/390 px sin overflow horizontal, teclado para expandir panel, recientes/desactualizadas/sin señal/terminal/enlace denegado. Un SDK cargado, sin Authorization Mandaria en petición de SDK, sin errores pageerror. Capturas revisadas: `test-results/public-tracking-design/width-1440.png`, `width-390.png`, `mobile-expanded.png`; también 900px y estados especiales. Los datos y el SDK son **simulados**, marcados en las capturas: no acredita cartografía Google ni integración backend real. No llamadas externas, claves reales ni operaciones reales. Servicios temporales cerrados y fuentes temporales eliminadas.
- `git diff --check`: PASS.

Hallazgos durante implementación: dos tests iniciales coincidían con texto duplicado de enlace faltante; se eliminó la repetición del título. La animación inicial mezclaba el reloj de performance con el de RAF en JSDOM: usa ahora únicamente timestamps de RAF. Lint detectó Date.now en render sin muestra; se retiró esa lectura innecesaria. Revisión visual detectó padding global de main y se anuló sólo en el layout público. Todos corregidos antes de la validación final.

Decisiones contractuales: a diferencia del boceto, DELIVERED no conserva posición: se retira conforme a usableSample/terminalLocation. Sin muestra autorizada no se carga Google ni se conserva un centro anterior; se muestra fondo neutro, nunca coordenadas inventadas. Frescura y borrado respetan freshUntil/eraseAfter, sin cambiar polling/backoff. Diferencia enlaces denegados de fallos temporales. Token, transporte Tracking, secuencia de versiones y reglas de privacidad no cambian. El modo de presentación del mapa es opcional; el mapa del cliente conserva su presentación. La transición visual de 300 ms no representa trayectoria GPS. Cambio de generación desmonta el mapa anterior. En móvil el panel reserva espacio fuera del mapa para no cubrir controles/atribución; se puede desplazar internamente al expandirlo.

Pendiente: comprobar estos ajustes visuales con Google real (teselas, zoom, fullscreen y atribución efectiva) en sesión autorizada. No se repite ni se reclama una nueva integración backend/PostgreSQL. Sin commit, push ni despliegue.

## 2026-10-12 — Mi perfil cliente (QA)

Rediseño en el checkout principal `C:/Users/zorgl/Documents/mandaria-frontend`, rama QA, conservando todos los cambios pendientes. Contenido con identidad, iniciales, correo de sesión, tarjetas de datos/tipo, confirmaciones, skeleton, errores y adaptación móvil. El layout existente sólo cambia enlaces/estado activo de Mi perfil y observa la caché del perfil para actualizar el nombre, sin nuevas consultas para usuarios operativos.

Archivos: nuevos `src/customer/ProfilePage.tsx`, `profile-format.ts`, `profile.css`, `src/test/customer-profile-design.test.tsx`, `scripts/verify-profile-design.mjs`; ajustes en `src/customer/identity.tsx`, `src/layouts/AdminLayout.tsx`, README y V1.17-WEB.

- `npx vitest run src/test/customer-profile-design.test.tsx src/test/customer.test.tsx src/test/flows.test.tsx --pool=threads --maxWorkers=1`: **81/81 PASS** (8 nuevas de perfil y regresiones existentes). Guardado/revisión, confirmación del tipo, conservación de ediciones de otra sección, consulta fallida, respuesta perdida, negocio no borrable, capacidad desconocida, verificación sin doble envío y layout/caché. La primera ejecución perfil+customer pasó 33/33 antes de añadir el caso de layout.
- `npm run typecheck:test`: PASS, incluida repetición tras la última prueba. `npm run lint`: PASS; eslint focalizado final de prueba/script: PASS.
- `npm run build`: PASS (TypeScript y Vite). Advertencia de chunk Root 726.23 kB (gzip 200.76 kB), sin errores.
- `node scripts/verify-profile-design.mjs`: PASS. Chromium 1440/1000/390 px, sin overflow; teclado sobre radiogroup, bloqueo por solicitud abierta, guardado, confirmación al consultar con edición pendiente y cooldown de correo. Capturas de escritorio/móvil revisadas visualmente: `test-results/profile-design/width-1440.png`, `width-390.png`; además width-1000 y result.json. Sin errores de ejecución en página. Vite/Chromium temporales cerrados.
- `git diff --check`: PASS.

Contrato conservado: nombre/negocio/tipo/revisión vienen del perfil, correo/verificación de Auth y solicitudes abiertas de capabilities. Cambiar tipo requiere capacidad conocida sin abiertas y confirmación, con expectedRevision. Una respuesta incierta bloquea nuevas escrituras hasta consultar el perfil. Cambios remotos de revisión no sobreescriben el borrador. No se borra un businessName existente con vacío, porque el DTO lo prohíbe. La respuesta ACCEPTED de verificación no acredita entrega de correo: se muestra «Verificación solicitada» y cooldown local de 60 s (respeta Retry-After cuando existe). El estado de verificación sigue siendo el de sesión; no se añade restauración de tokens al consultar perfil.

Límites: tests de servicios y API visual simulados con datos sintéticos; no es integración real backend ni acredita entrega de correo. Sin cambios backend, configuración, credenciales, commit, push ni despliegue.

## 2026-10-12 — Mis envíos (QA)

Checkout principal `C:/Users/zorgl/Documents/mandaria-frontend`, QA, conservando cambios anteriores. Nuevos `src/customer/MyShipments.tsx`, `shipments.css`, `src/test/customer-shipments-design.test.tsx` y `scripts/verify-shipments-design.mjs`; ajustes en `pages.tsx`, fixture de `customer.test.tsx`, README y V1.17-WEB. Contrato backend leído, no modificado.

- `npx vitest run src/test/customer-shipments-design.test.tsx src/test/customer.test.tsx --pool=threads --maxWorkers=1`: **32/32 PASS**. Seis casos nuevos: orden/enlaces/paginación, solicitud activa fuera de página, vacío permitido/bloqueado, skeleton sin filas anteriores y capacidad BUSINESS. Conservadas regresiones de alta PERSONAL/BUSINESS y conversión.
- `npm run typecheck:test`: PASS. `npm run lint`: PASS; tras ajuste final, eslint focalizado sobre los cinco archivos TypeScript/script afectados: PASS.
- `npm run build`: PASS final (incluye TypeScript). Advertencia existente: chunk Root 717.76 kB, gzip 198.29 kB.
- `node scripts/verify-shipments-design.mjs`: PASS. Chromium a 1440/900/390 px, sin overflow horizontal; paginación, teclado Enter, clic físico en celda de estado navega por el enlace de toda la fila, vacío y tres skeletons. Capturas revisadas `test-results/shipments-design/width-1440.png` y `width-390.png`; también width-900, mobile-empty, mobile-loading y result.json.
- Primera ejecución del arnés quiso pulsar el td directamente, pero el enlace extendido de la fila intercepta correctamente ese clic. Se ajustó la prueba a clic físico en el centro de la celda; recorrido final aprobado. No se alteró la navegación para acomodar el test.
- `git diff --check`: PASS. Vite/Chromium temporales cerrados y archivos temporales retirados.

Límites: pruebas unitarias con servicios simulados y visualización con fixtures de componente, sin backend/Google real ni operaciones reales. El contrato del listado sólo acredita CREATED/CANCELLED; se mantiene su orden descendente desde backend. Sin commit, push, despliegue ni cambios de configuración.

## 2026-10-12 — Confirmar y seguimiento, Paso 3 (QA)

Checkout principal `C:/Users/zorgl/Documents/mandaria-frontend`, QA, base b91f2ad; conservados los cambios pendientes de Pasos 1/2 y precarga. Rediseño limitado al contenido. Archivos y decisiones contractuales en `docs/V1.17-WEB.md`.

### Comandos y resultados

- `npx vitest run src/test/customer-request-design.test.tsx src/test/location.test.tsx src/test/customer-reconciliation.test.tsx src/test/customer.test.tsx src/test/flows.test.tsx --pool=threads --maxWorkers=1`: **132/132 PASS, cinco archivos**. Siete pruebas nuevas: consentimiento explícito y doble clic sin éxito optimista, confirmación sólo desde estado servidor, vencimiento, contexto terminal/incompleto, cancelación cerrada con motivo/confirmación/errores, custodia y CANCELLED, actualización y payload FINAL de aceptación conservado.
- Tras últimos ajustes de botón vencido e icono, `npx vitest run src/test/customer-request-design.test.tsx src/test/location.test.tsx --pool=threads --maxWorkers=1`: **36/36 PASS**. No se repitieron suites ajenas.
- `npm run typecheck:test`: PASS final.
- `npm run lint`: PASS; tras último ajuste `npx eslint src/customer/pages.tsx src/customer/RequestActions.tsx src/location/components.tsx src/location/TrackingLinks.tsx src/shipping/Payment.tsx src/test/customer-request-design.test.tsx src/test/fixtures/request-design.ts scripts/verify-request-design.mjs`: PASS.
- `npm run build`: PASS final. Advertencia de chunk grande existente, Root 714.23 kB (gzip 197.39 kB).
- `node scripts/verify-request-design.mjs`: PASS final. Chromium 1440/1024/390px, sin overflow horizontal, autorización antes del contenido en móvil, teclado Enter/Space en acordeón y aceptación, cancelación inicialmente deshabilitada, autorización sólo tras marcar casilla, confirmación con estado simulado, vencimiento y CTA deshabilitado. Sin errores de renderizado. Capturas revisadas en `test-results/request-design/width-1440.png`, `width-390.png`; también width-1024, mobile-cancellation, mobile-authorized, mobile-expired y result.json.
- `git diff --check`: PASS. Vite/Chromium temporales cerrados, archivos temporales del arnés retirados.

### Hallazgos y límites

Revisión visual detectó colisión de la cuadrícula de Paso 1 que estrechaba el checkbox; corregida con selector acotado al Paso 3 y evidencia regenerada. TypeScript detectó un enum incorrecto sólo en fixture de frescura: corregido a UNAVAILABLE. El contrato del cliente ofrece último avance/fecha, no un historial completo; no se inventó timeline de eventos anteriores ni estado AUTHORIZED.

**Todo este recorrido nuevo usa fixtures frontend/API simuladas.** No acredita navegador → backend → PostgreSQL ni Google real. El arnés hizo un POST de aceptación interceptado por fixture y ninguna emisión/revocación de enlace ni cancelación real. Sin claves reales, servicios externos, cambios backend, .env, producción, commit, push o despliegue. Se conserva la evidencia histórica previa como tal.

## 2026-10-12 — Asteriscos en campos requeridos

`ConversionForm.tsx` y `conversion.css`: leyenda “* Campos obligatorios” y marca visual derivada del atributo required, incluidos los grupos de opciones. Valor de mercancía marcado únicamente con adelanto. Sin alterar datos o precarga editable.

- `npx eslint src/customer/ConversionForm.tsx`: PASS.
- `npx vitest run src/test/customer-conversion-design.test.tsx --pool=threads --maxWorkers=1`: 8/8 PASS.
- `git diff --check`: PASS. Sin commit ni push.

## 2026-10-12 — Precarga editable del pagador

Cambio focalizado en `ConversionForm.tsx`; pruebas en `customer-conversion-design.test.tsx`. Nombre/teléfono sugeridos desde origen, protección independiente de campos editados o vaciados, respuesta tardía del perfil y envío sin captura duplicada.

- `npx vitest run src/test/customer-conversion-design.test.tsx src/test/customer-contact.test.tsx src/test/customer.test.tsx --pool=threads --maxWorkers=1`: **40/40 PASS, tres archivos**.
- `npm run typecheck:test`: PASS.
- `npx eslint src/customer/ConversionForm.tsx src/test/customer-conversion-design.test.tsx`: PASS.
- Pruebas con APIs simuladas; sin nuevas operaciones backend, revisión visual o build en este ajuste de comportamiento. Se conserva la evidencia anterior del diseño. Sin commit ni push.

## 2026-10-12 — Rediseño Detalles de la solicitud (Paso 2)

Checkout: `C:/Users/zorgl/Documents/mandaria-frontend`, rama QA, base b91f2ad, conservando todos los cambios pendientes de Paso 1/direcciones/contacto. No se utilizó el worktree f1fe para estos cambios. Implementación y archivos descritos en `docs/V1.17-WEB.md`.

### Verificaciones ejecutadas

- `npx vitest run src/test/customer-conversion-design.test.tsx src/test/customer.test.tsx src/test/customer-address.test.tsx src/test/customer-contact.test.tsx src/test/customer-quote-design.test.tsx src/test/customer-reconciliation.test.tsx src/test/flows.test.tsx --pool=threads --maxWorkers=1`: **120/120 PASS, siete archivos**. Incluye cinco casos nuevos de conversión y retorno con paquete/coordenadas, más regresiones de recuperación y ActionForm.
- Casos: precio del backend sin cálculo, resumen vivo, nombre automático/restaurable, PREPAID sin valor permitido, adelanto positivo obligatorio, hasta dos decimales, teléfonos inválidos, pagador sólo REQUESTER, vencimiento mientras está abierta la pantalla, ninguna conversión automática, conservación exacta de coordenadas tras editar direcciones y datos del paquete al volver a cotizar.
- `npm run typecheck:test`: PASS. `npm run lint`: PASS. `npm run build`: PASS; advertencia existente de chunk grande, Root 709.76 kB (gzip 196.44 kB).
- `node scripts/verify-conversion-design.mjs`: PASS final. Chromium a 1440/1024/390 px, sin overflow horizontal; radios por teclado, CTA, errores inline, importe, caducidad, estado móvil y submit simulado. Capturas revisadas en `test-results/conversion-design/`: `desktop-empty.png`, `desktop-error.png`, `width-1440.png`, `width-1024.png`, `width-390.png`, `mobile-expired.png`, más `result.json`. Se corrigió superposición visual del prefijo monetario y se regeneró evidencia.
- Primera pasada visual alcanzó vencimiento pero el selector exacto de texto no contemplaba el botón hijo del aviso; corregido el arnés, no el estado de la aplicación. Primer lint detectó parámetro sin uso en test; corregido antes del PASS final.
- `git diff --check`: PASS. Servidor Vite y navegador temporales detenidos; archivos temporales del arnés retirados.

### Límites

Pruebas unitarias con APIs simuladas. Revisión visual del contenido aislado, con perfil, Google y submit sintéticos; no acredita conversión contra backend ni Google reales. No se duplicó layout/sidebar. El backend siguió como referencia de sólo lectura; no cambios de .env, claves, infraestructura o contratos. Mercancía obligatoria sólo con adelanto por decisión explícita del propietario. No commit, push ni despliegue.

## 2026-10-11 — Diseño Cotizar envío Paso 1 en QA

Sobre b91f2ad y conservando todos los cambios locales de direcciones/contacto. Aplicado el diseño adjunto sólo al contenido, con fuente Figtree OFL local, timeline, paquete, stepper, resumen sticky, radios/switch y CTA condicionado a coordenadas válidas. Sin nuevo layout, precios inventados o cambios backend. Places API (New) agregado al selector usando el SDK existente, con selección explícita y protección ante respuestas antiguas. ActionForm conserva validación/dirty/errors y añade ubicación opcional del submit; rutas y reconciliación permanecen.

### Comandos y resultados

- `npm run typecheck:test`: PASS.
- `npm run lint`: PASS; warnings iniciales de cleanup resueltos antes de ejecución final.
- `npm run build`: PASS, advertencia Root de 702.58 kB. Ajustes posteriores únicamente de alineación CSS/atribución y del arnés visual; no nuevo build después de esos ajustes.
- `npx vitest run src/test/customer-quote-design.test.tsx src/test/customer-autocomplete.test.tsx src/test/customer.test.tsx src/test/customer-location.test.tsx src/test/customer-address.test.tsx src/test/customer-contact.test.tsx src/test/customer-reconciliation.test.tsx src/test/flows.test.tsx --pool=threads --maxWorkers=1`: **127/127 PASS, ocho archivos**. Incluye contrato exacto, pagadores permitidos, CTA, resumen, teclado Places, carreras, errores y regresión del formulario compartido. Expectativas antiguas de select/opciones y CTA activo fueron adaptadas al diseño solicitado; categorías conservan etiquetas contractuales.
- `node scripts/verify-quote-design.mjs`: PASS. Chromium 1440/1024/390px, sin overflow horizontal, selección de sugerencias mediante flechas/Enter, radio y switch por teclado, resumen actualizado y submit simulado. Figtree local cargada. Vite/Chromium temporales cerrados. No servidor backend ni envío real.
- Capturas revisadas: `test-results/quote-design/desktop-empty.png`, `desktop-ready.png`, `width-1024.png`, `width-390.png`; `result.json`. Primera captura tenía codificación incorrecta sólo en fixture: corregido charset del SDK simulado y capturas regeneradas. Revisión final alinea marcadores con títulos y resumen con la tarjeta de ruta.
- `npx eslint src/customer/AddressAutocomplete.tsx scripts/verify-quote-design.mjs` y `git diff --check`: PASS tras últimos ajustes.

### Límites

Google Places y submit simulados en navegador, APIs simuladas en tests. No se leyó clave real ni se enviaron consultas externas (salvo descarga pública de fuente/licencia durante implementación). Places real requiere habilitación/restricciones/cuotas del propietario; no se modificaron .env, backend, nginx o configuración de Google. No se acredita hosting/CSP desplegado. Sin commit, push, despliegue ni activación. Continuidad detallada en V1.17-WEB y README; historial anterior conservado.

## 2026-10-11 — Nombre de origen precargado sin botón

Por ajuste solicitado, OriginContact consulta automáticamente el perfil y muestra displayName inicialmente. No hay botón. El valor editado (incluido vacío) tiene prioridad sobre respuesta tardía/refetch; se conserva aislamiento por actor y teléfono manual. Sustituye el comportamiento opcional con botón de la entrada anterior.

- `npx vitest run src/test/customer-contact.test.tsx src/test/customer.test.tsx --pool=threads --maxWorkers=1`: **32/32 PASS**, incluidos precarga, edición/borrado durante consulta, error, cambio de usuario, refetch y conversión con coordenadas conservadas.
- `npm run typecheck:test`: PASS. `npx eslint src/customer/OriginContact.tsx src/test/customer-contact.test.tsx`: PASS. `git diff --check`: PASS.
- Servicios simulados; sin nueva prueba visual/Google/backend ni repetición de build para este ajuste focalizado. Conservados cambios pendientes de direcciones. Sin commit ni push; rama QA.

## 2026-10-11 — Contacto de origen opcional del solicitante

QA, conservando los cambios pendientes de direcciones. OriginContact consulta GET /customer/profile sólo mediante «Usar mi nombre de perfil». Recupera displayName, permite edición y no sobrescribe entrada anterior o hecha mientras llega la respuesta. Reinicio por actor/MPQ, doble envío protegido y captura manual ante error. Destino/pagador intactos.

El DTO real CustomerProfileViewDto y la sesión User no exponen teléfono: origen.phone sigue manual con explicación visible. No se inventó contrato ni se modificó backend. Implementación en src/customer/OriginContact.tsx e integración en pages.tsx; continuidad en docs/V1.17-WEB.md.

- `npm run typecheck:test`, `npm run lint`, `npm run build`: PASS. Build advierte Root de 694.77 kB, sin error.
- `npx vitest run src/test/customer-contact.test.tsx src/test/customer.test.tsx src/test/customer-address.test.tsx src/test/customer-reconciliation.test.tsx --pool=threads --maxWorkers=1`: **65/65 PASS, cuatro archivos**.
- Seis casos nuevos: consulta opcional/edición/teléfono manual; nombre previo protegido; edición y borrado ante respuesta tardía/doble clic; error; aislamiento al cambiar usuario. Regresión de conversión conserva direcciones editadas y coordenadas originales.
- Servicios simulados: no nueva prueba de backend real ni visual en navegador. `git diff --check`: PASS. Sin commit, push ni despliegue.

## 2026-10-11 — Geocodificación inversa de direcciones en conversión MPQ

QA sobre b91f2ad, checkout principal. Sugerencias de origen y destino desde las coordenadas recibidas en la precotización, también por URL directa. Nuevo SuggestedAddress compartido; reutiliza SDK y Geocoding API existentes. Dirección editable, coordenadas de conversión intactas; protección ante escritura/borrado/autofill y respuestas tardías, navegación o timeout. Sin cambios backend, .env, claves ni dependencias.

Validación final:

- `npm run typecheck:test`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS; advertencia de tamaño Root 693.47 kB.
- `npx vitest run src/test/customer-address.test.tsx src/test/customer-location.test.tsx src/test/customer.test.tsx src/test/customer-reconciliation.test.tsx src/test/google-loader.test.ts src/test/google-map.test.tsx --pool=threads --maxWorkers=1`: **81/81 PASS, seis archivos**.
- Diez casos del nuevo campo: ambas sugerencias y edición, escritura y borrado durante consulta, autofill, respuesta de otra precotización, vacío/error/longitud excesiva, sin clave y timeout. Regresión de formulario por URL MPQ: sugiere ambos puntos, edita direcciones, envía coordenadas originales y no consulta otra vez por editar.
- Durante implementación se corrigieron la inserción inicial del componente y una fixture de pagador incompatible con el tipo contractual. La aserción de número de consultas se realiza antes del submit: el flujo de recuperación de comandos existente puede desmontar/remontar el formulario durante la conversión. Ejecución final aprobada.
- `git diff --check`: PASS.

Google y API Mandaria simulados en tests; no se ejercitó Google real, backend real ni revisión visual en navegador en esta tarea. No se leyeron claves ni se hicieron consultas externas de geocodificación. Continuidad: docs/V1.17-WEB.md. Sin commit, push, despliegue ni activación.

## 2026-10-11 — Integración de main en QA, pendiente de commit

Base QA `6801fa3`; main incorporado `06d9766`. Merge local con `git merge --no-commit --no-ff main` en el checkout principal, permaneciendo en QA. No se modificó backend ni configuración operativa.

- Resueltos cinco conflictos: README.md, VERIFICATION.md, src/dispatch/components.tsx, src/driver-portal/pages.tsx y src/test/delivery-requests.test.tsx. Conservadas ambas entradas documentales, imports de ShippingPaymentBlock y búsqueda, y las dos pruebas independientes (integración nullable del cliente y enlace a búsqueda administrativa).
- Se incorporan estados/ventanas de búsqueda automática, polling y manejo DISPATCH_RETRY_PENDING de main. Se conserva V1.17, GPS/Google Maps/enlaces V1.18, recuperación, hitos de consulta, permisos legacy, instrucciones económicas, selector de ubicación y scroll lateral de QA.
- Comparación documental: todas las líneas no vacías de QA permanecen en README/VERIFICATION; todas las de VERIFICATION de main también. README conserva la política de referencia más reciente de QA (sólo origen para Google), en lugar de restaurar la antigua descripción global no-referrer de main. El transporte Tracking conserva su protección propia.

Validación ejecutada sobre el resultado combinado:

- `npm run typecheck:test`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS (incluye TypeScript de aplicación). Advertencia de chunk Root de 691.93 kB; no error de compilación.
- `npx vitest run src/test/dispatch-search.test.tsx src/test/dispatch.test.tsx src/test/driver-portal.test.tsx src/test/delivery-requests.test.tsx src/test/collection-instructions.test.tsx src/test/execution.test.tsx src/test/execution-reconciliation.test.ts src/test/customer.test.tsx src/test/customer-reconciliation.test.tsx src/test/customer-location.test.tsx src/test/location.test.tsx src/test/google-map.test.tsx --pool=threads --maxWorkers=1`: **308/308 PASS, 12 archivos**.
- `git diff --cached --check`, archivos sin resolver y búsqueda de marcadores: sin incidencias.

Estas regresiones son pruebas frontend con servicios/SDK simulados según cada archivo; no acreditan una nueva integración real con backend, Google o PostgreSQL del resultado combinado. Las evidencias reales anteriores se conservan con sus versiones originales. Sin despliegue, activación, commit ni push. Merge resuelto y preparado en el índice, pendiente de commit autorizado.

## 2026-10-07 — Recorrido conjunto V1.18: navegador → backend → PostgreSQL → Google REAL

Checkout utilizado exclusivamente: C:/Users/zorgl/Documents/mandaria-frontend, rama v1.18-GPS_seguimiento_temporal, HEAD f36f771. Conservados VERIFICATION y scripts/verify-google-real.mjs pendientes; no se usó ni copió configuración del worktree f1fe. Backend b97b9d1be54a2c37601e51990d66ccaf73d0203f; hash SHA256 de dist/location/location.service.js registrado en [evidencia estructurada](docs/checks/v118-google-joint.json). No cambios backend.

PostgreSQL18.6 temporal exclusivo en127.0.0.1:55439. Copias nuevas desde mandaria_v118_web_20261007_test: mandaria_v118_google_joint_20261007_test, mandaria_v118_google_race_20261007_test, mandaria_v118_google_race2_20261007_test y recorrido final mandaria_v118_google_race3_20261007_test. Fuente y evidencias previas conservadas. Migraciones41/42 verificadas antes de mutar; una asignación activa del servicio sintético MDR-000029 ya en PICKED_UP. Contraseñas aleatorias sólo en memoria y hashes actualizados únicamente en copias de prueba.

| Paso mínimo | Resultado conjunto |
|---|---|
| Servicio autorizado visible | PASS: servicio sintético existente PICKED_UP, actor CUSTOMER propietario y DRIVER de asignación real |
| GPS DRIVER real | PASS: apertura de stream y PUT location por actor/asignación vigentes; sin rutas administrativas de GPS |
| Detalle completo cliente | PASS: login real, ruta existente, lectura real, Google con teselas/atribución, punto y precisión40m |
| Enlace real /track | PASS: emisión desde UI contra backend, secreto sólo en memoria, fragmento retirado antes del SDK y lectura anónima real |
| Segunda muestra | PASS: sequence2, posición17.421/-93.38 en ambos mapas y una sola instancia Map por pantalla |
| Pérdida de visibilidad | PASS: DRIVER abre incidencia VEHICLE_FAILURE mediante contrato real; ambas pantallas retiran coordenadas y ambos círculos se desprenden del mapa |
| Respuesta anterior | PASS final: respuesta GPS real preincidencia, con sample, termina3ms después de retirada visible; no restaura marcador ni coordenadas |

### Carrera sin interceptar APIs

Sin Playwright route interception, SDK simulado, respuestas fabricadas ni clock inyectado. Vite sólo hace proxy normal /api al Nest aislado127.0.0.1:43181. Observador pasivo de finish del servidor identifica lectura completada; CDP Network.emulateNetworkConditionsByRule limita únicamente la URL GPS del cliente (latencia10s, descarga10bytes/s). Con bytes reales aún en tránsito, el DRIVER reporta incidencia; la UI consulta estado mediante su botón existente. Tras retirar el mapa se restaura la red. response.finished se registra desde el inicio de la espera; se exige completedAt > hiddenAt y sample presente, además de overlays retirados. El SDK Google no se sustituye: constructores delegan al constructor real únicamente para contar instancias e inspeccionar círculos.

Primer recorrido se detuvo por selector de captura ambiguo (.location-panel también correspondía al enlace); se corrigió sólo el arnés. Recorridos intermedios conservaron respuesta antigua sin restauración pero fallaron la aserción temporal estricta: NO acreditan el orden de la carrera. La regla CDP con URL exacta del último recorrido sí lo acredita. Se reutilizó el setup mínimo de dos pantallas en las copias necesarias, sin suites completas. Todos los resultados intermedios se conservan; prevalece el final de v118-google-race3.

### Seguridad, CSP y evidencia

Recorrido final:66 solicitudes Google inspeccionadas en memoria, cero coincidencias de los tokens/identificadores/contacto sintéticos monitorizados y cero llamadas detectadas a Routes/Places/Geocoding. Sin errores de consola ni violaciones CSP. No se persistieron HAR, URLs, headers, claves ni tokens. Clave Web cargada privadamente por Vite; flags GPS/enlaces y secretos JWT aleatorios sólo en proceso aislado, CWD temporal sin .env backend. Routing local_fake, correo local_outbox, webhooks polling0. No comunicaciones externas excepto Google autorizado.

CSP de nginx.conf aplicada como header local por Vite, sin plugin React Refresh inline. Esto acredita la política en ese servidor local, NO nginx ni headers productivos. Capturas recortadas al panel GPS cliente y destinatario, sin formulario de clave/enlace, cuenta, contactos ni barra de direcciones: test-results/v118-google-race3/customer-map.png y recipient-map.png; copias iniciales revisadas visualmente muestran cartografía real y atribución. Resultados/identity/network sanitizados en ese directorio y docs/checks/v118-google-joint.json.

Comando ejecutado: node scripts/verify-google-joint.mjs. node --check, Prettier y ESLint focalizado del arnés PASS. Sin defectos nuevos de producto demostrados; no se repitieron build, tipos ni suites completas del producto previamente aprobadas. Las pruebas SDK simulado y HTTP reales anteriores permanecen separadas; esta entrada acredita ahora el recorrido conjunto.

Nest, Vite y Chromium propios cerrados por finally. PostgreSQL detenido después de verificar cero otros clientes; datos de las copias conservados. No se detuvieron servicios ajenos. Límite: emisor GPS sintético por HTTP, no captura desde teléfono/APP DRIVER; pérdida por incidencia, no operación física ni cobro. No acredita nginx desplegado ni declara V1.18 completa o activada. Sin Docker, producción, commit, push o despliegue.

## 2026-10-07 — Reintento Google real: origen autorizado

Checkout principal C:/Users/zorgl/Documents/mandaria-frontend, rama v1.18-GPS_seguimiento_temporal. Después del ajuste de restricciones realizado por el propietario, Google ya no devuelve RefererNotAllowedMapError para http://localhost:5173. Clave leída únicamente por Vite desde configuración privada; no copiada ni impresa.

- Componente LocationCard del cliente con Google REAL y datos sintéticos: una instancia Map, dos Circle, imágenes/teselas y atribución visibles. Actualización a17.021 conserva una instancia; retirada de muestra por botón usando teclado deja ambos círculos sin mapa. Capturas escritorio1280 y móvil390 revisadas, sin claves ni tokens visibles.
- SharedTracking en /track con Google REAL y API de seguimiento simulada: fragmento retirado antes del callback de carga del SDK; una instancia, dos círculos, teselas y atribución. STALE visible; al llegar eraseAfter, temporizador frontend retira mapa/coordenadas. No se aceleró el reloj del equipo ni se acredita expiración backend con este fixture.
- Recorridos finales:26 y27 solicitudes Google inspeccionadas en memoria; cero coincidencias de Bearer/Tracking, referencia/contacto sintéticos privados o token sintético bruto/codificado. Cero llamadas adicionales detectadas a Routes/Places/Geocoding; sin errores de consola ni violaciones CSP. No HAR ni URLs/cabeceras persistidas. La inspección no es una garantía exhaustiva sobre futuras versiones del SDK.
- CSP efectiva del arnés: copia de la política nginx.conf en headers Vite, con JSX automático sin React Refresh. No ejecuta ni certifica nginx desplegado. SDK fallido/fallback textual ya observado realmente en el intento anterior rechazado por Google.

Comandos: node scripts/verify-google-real.mjs; GOOGLE_REAL_SHARED=true para la segunda superficie; prettier y eslint del arnés PASS. Resultados sanitizados y capturas en test-results/google-real y test-results/google-real-shared. Durante preparación de /track hubo un intento sin llamadas Google por connect-src hacia API HTTP externa; se alineó únicamente la API simulada al mismo origen del arnés. Un selector del fixture de cliente y un ajuste de finales CRLF provocaron recorridos incompletos/una interrupción antes del recorrido final aprobado. No se interpretan como defectos del producto. No se modificó código funcional ni se repitieron suites/build del producto ya aprobados.

Límites: se valida SDK real dentro de los componentes existentes, no login/detalle completo → backend real → PostgreSQL. Retirada al ocultar pestaña, controles internos de Google por teclado y hosting/nginx real permanecen sin nueva acreditación real; conservan sólo pruebas previas cuando corresponda. No activación, backend, Docker, producción, commit, push ni despliegue. V1.18 no declarada completa.

## 2026-10-07 — Google real desde checkout principal: bloqueo de referencia

Directorio confirmado: C:/Users/zorgl/Documents/mandaria-frontend, rama v1.18-GPS_seguimiento_temporal, base f36f771. La clave VITE_GOOGLE_MAPS_API_KEY sí está disponible aquí; la comprobación anterior de ausencia correspondía al worktree de Codex y no a este checkout. No se copió, imprimió ni registró la clave.

Arnés scripts/verify-google-real.mjs: Maps JavaScript API REAL con LocationCard y datos sintéticos, sin backend real. Origen local http://localhost:5173. Resultado: RefererNotAllowedMapError de Google; requiere autorizar ese origen en las restricciones Web de la clave. No se modificaron restricciones ni credenciales. SDK llegó a crear mapa y dos círculos, pero Google rechazó el origen y no cargó teselas: NO aprobado como mapa funcional. La interfaz retiró el mapa y mostró fallback textual.

Inspección en memoria de 16 solicitudes Google: sin coincidencias de Authorization Bearer/Tracking, marcador MDR privado sintético ni contacto sintético; cero llamadas adicionales detectadas a Routes/Places/Geocoding. No se guardaron HAR, URLs ni cabeceras; sólo contadores y códigos sanitizados en test-results/google-real/result.json. La ausencia de coincidencias tiene el alcance limitado de esta carga rechazada, no certifica todo el SDK autorizado.

La política CSP de nginx.conf se suministró como header del servidor local Vite: cero violaciones en el intento Google, pero no se ejecutó nginx ni se certificaron headers desplegados. Intentos iniciales del arnés, sin solicitudes Google: React Refresh incompatible con scripts inline restringidos; se deshabilitó ese plugin sólo en el arnés y se usó JSX automático. Otra muestra sintética tenía accuracy120m fuera del contrato; se corrigió a40m. No defectos nuevos del frontend demostrados.

Pendiente tras autorización del origen: teselas/atribución efectiva, actualización sin reconstrucción, retirada y caducidad con mapa funcional, móvil/escritorio/teclado, /track y eliminación del fragmento antes del SDK, inspección completa de tráfico y recorrido con backend real. Pruebas anteriores simuladas/backend mantienen su alcance independiente. No se generaron capturas de la carga rechazada ni se cambió configuración operativa, backend o producción. Sin Docker, activación, commit, push o despliegue.

## 2026-10-06 — Continuación V1.18 real: transferencia y fronteras temporales

PASS nuevos con Chromium → Nest real → PostgreSQL18.6 aislado: transferencia (antiguo DRIVER sin acceso, receptor con nueva muestra, custodia única/progreso/ledger), incidencia sin coordenadas en ambas superficies, retorno terminal sin restauración por respuesta HTTP antigua, STALE60s+1ms, purga600s, vencimiento24h y ambas ramas de min(vencimiento,cierre+1h). Frontend e395929 + cambios previos; backend b97b9d1be54a2c37601e51990d66ccaf73d0203f; migraciones41/42. Bases exclusivas boundaries/grace, no fuente modificada.

Detalle de comandos, aislamiento, errores del arnés corregidos, evidencia y límites en [V1.18-WEB](docs/V1.18-WEB.md#continuación-real--2026-10-06-2026-10-07-utc); [resultados](docs/checks/v118-boundaries.json). LocationClock controlado únicamente en Nest de pruebas; respuestas API reales y persistencia PostgreSQL. No se aceleró ni acreditó el worker que usa reloj SQL real. Temporizadores frontend con fixtures y once escenarios reales anteriores de respuesta perdida/reconciliación se conservan separados, sin repetición.

Nuevo scripts/verify-location-boundaries.mjs: node --check PASS, eslint focalizado PASS, Prettier aplicado. Ejecuciones finales normal con V118_SKIP_TIME=true y V118_EARLY_EXPIRY=true PASS; límites60/600 aprobados en primer recorrido conservado. No defectos nuevos de producto demostrados; no se repitieron tipos/build/suites previamente aprobados al no cambiar producto. Revisión visual de captura escritorio transferencia y móvil terminal sin coordenadas ni secretos. Clúster y procesos propios detenidos, datos conservados.

[Propuesta cartográfica](docs/V1.18-MAP-PROPOSAL.md): Leaflet/raster MapTiler sujeto a evaluación comercial, privacidad, claves/orígenes, atribución y CSP. Sin dependencias, claves, proveedor ni configuración nuevos. Sin backend, Docker, producción, commit, push o despliegue. V1.18 no declarada completa/activada.

## 2026-10-06 — V1.18 Web: GPS y enlaces temporales (local)

Conservado V1.17 sobre frontend e395929 / codex/merge-main-qa. Backend b97b9d1be54a2c37601e51990d66ccaf73d0203f consultado únicamente como referencia. Implementación/procedimiento/archivos: [V1.18-WEB](docs/V1.18-WEB.md); [resultados estructurados](docs/checks/v118-web.json). Sin activación, commit, push, despliegue ni cambios backend/.env/nginx. No declara V1.18 completa.

### Cambios

Módulo src/location, posición/frescura y enlaces en detalle cliente, /track público separado de AuthProvider, captura temprana y reapertura de fragmento, transporte Tracking separado, marcadores mínimos y cuatro estados contractuales. Orden BigInt, invalidación por estado/generación, caducidad local, pausa/revalidación, backoff/jitter/Retry-After. Catálogo añade dos scopes sin preselección. Portal /developers/location y sincronizador con cinco operaciones adicionales B2B revisadas. No existe /close de tracking. No biblioteca cartográfica disponible: coordenadas y precisión, mapa pendiente.

### Pruebas focalizadas con fixtures

- Primer lote:170 casos,157 PASS y13 fallos de expectativas antiguas (catálogo nueve scopes y15 operaciones públicas). Se actualizaron a once scopes y20 operaciones revisadas; no se cambió el backend para satisfacer pruebas.
- `npx vitest run src/test/flows.test.tsx src/test/developers.test.tsx src/test/integration-credentials-api.test.ts --maxWorkers=1`:79/79 PASS.
- `npx vitest run src/test/location.test.tsx src/test/customer.test.tsx src/test/customer-reconciliation.test.tsx src/test/api.test.ts --maxWorkers=1`:98/98 PASS. **177 casos únicos en siete archivos**, no sumar repetidos.
- Tras ajustes finales de caducidad/recibos: location.test.tsx29/29 PASS.
- Cubre frescura60s/caducidad600s, BigInt, respuestas cruzadas/transferencia/incidencia/terminal, rol, scopes opt-in, fragmento/recarga, transporte sin JWT, Retry-After, pausa y foreground, doble clic, emisión perdida/replay sin secreto, revocación incierta, cuatro estados,409, actor distinto, respuesta tardía y datos mínimos persistidos. Servicios simulados: estos casos no acreditan transacciones backend.

### Navegador → backend real → PostgreSQL

PostgreSQL18.6 temporal exclusivo. El puerto anterior65063 rechazó bind (Permission denied de Windows); mismo clúster de pruebas iniciado sólo en127.0.0.1:55439 con opción de proceso. Nueva copia **mandaria_v118_web_20261007_test** desde **mandaria_v118_direct_order2_test**, migraciones41/42 comprobadas antes de mutaciones. No base comercial. Chromium→Vite4181→proxy43182→Nest real43181→PG55439. CWD temporal vacío; flags sólo del proceso; routing local_fake, correo local_outbox y webhooks polling0. Sin Docker, producción ni servicios externos.

Comando: `node scripts/verify-location-real.mjs`. Continuación focalizada: `$env:V118_FINAL='true'; node scripts/verify-location-real.mjs` (después se retiró la variable). El script requiere esta copia sintética; no ejecutarlo contra una base desplegada. Preparación inicial encontró dos errores de harness: faltaba presupuesto de routing explícito y la política de cuotas no coincidía con la plantilla. Se alinearon únicamente variables del proceso con la plantilla; no se alteró backend ni se contó como integración aprobada esos intentos.

| Caso real | Resultado |
|---|---|
| Titular CUSTOMER login y GPS TO_PICKUP | PASS, posición17.42/-93.38 y precisión12m de HTTP real |
| Emisión y destinatario antes de recogida | PASS, sólo primera respuesta tiene URL; anónimo, fragmento retirado, sin GPS antes de PICKED_UP |
| Destinatario después de PICKED_UP | PASS, GPS autorizado tras hitos sintéticos DRIVER por HTTP |
| Recarga sin fragmento | PASS, pide enlace original sin recuperar token de storage |
| Emisión aplicada con respuesta perdida | PASS, timeout20s + reload + GET APPLIED_SECRET_UNAVAILABLE, sin replay ni recuperación del secreto |
| Revocación con respuesta perdida | PASS, marcador retenido + GET APPLIED_REVOKED y metadata actual |
| Reabrir fragmento en misma pestaña | PASS tras corregir defecto de consumo del hash; no recarga completa obligatoria |
| Enlace revocado | PASS, error genérico y ninguna coordenada |
| Intento retenido antes de llegar a backend | PASS, PENDING_OR_UNKNOWN después de reload; emisión bloqueada |
| Cierre técnico frente a ISSUE tardío | PASS, revoke explícito/revisión actual/UUID nueva; GET SUPERSEDED y POST original liberado recibe409 |
| Privacidad y errores navegador | PASS, no URL/token compartido/password en storage; sin pageerror. Refresh token humano conserva estrategia V1.17 |

Son ejecuciones reanudadas: seis casos del primer recorrido y cinco de la continuación, no once escenarios en una corrida ininterrumpida. Primer recorrido se detuvo al reabrir un enlace con navegación sólo de fragmento; se corrigió hashchange y se acreditó después. El proxy no fabrica JSON/estados: retiene cuerpo de respuesta real tras HTTP200 hasta timeout o guarda la petición original en memoria antes de enviarla. Luego la libera con misma clave/cuerpo. Sin operaciones físicas, confirmaciones de cobro ni entregas administrativas.

### Visual y calidad

Escritorio1440×1000, móvil390×844 y navegación Tab del destinatario con backend real; sin overflow móvil. Capturas sintéticas inspeccionadas en test-results/v118-real: owner-desktop.png, recipient-mobile.png, owner-reconciled.png, revoked-mobile.png. No se capturó la URL secreta ni contraseñas. La captura inicial aún muestra el aviso técnico de mapa pendiente; el texto final se simplificó a ubicación aproximada, visible en owner-reconciled.png.

- `npm run typecheck:test`:PASS.
- `npm run lint`:PASS.
- `npm run build`:PASS, advertencia existente de chunk principal >500kB.
- `node scripts/sync-public-b2b.mjs --backend C:/Users/zorgl/Documents/mandaria-backend`:PASS; sólo cinco artefactos públicos y hashes.
- Mismo comando con `--check`:PASS.
- `git diff --check`:PASS; avisos LF/CRLF sin conflictos.

### Límites y pendientes

No nuevo recorrido real de transferencia/incidencia/terminal, frontera exacta de caducidad, cambio de usuario o429 real; cubiertos por fixtures focalizados donde corresponde, sin afirmar controles backend por mocks. No mapa cartográfico ni APP DRIVER/dispositivo GPS. No validación productiva de headers/analítica, concurrencia masiva, cuotas comerciales o backups. Conservados todos los historiales de continuidad anteriores.

Entorno cerrado: Chromium, Vite4181, proxy43182 y Nest43181 detenidos por el harness; PostgreSQL55439 detenido tras comprobar cero conexiones ajenas. Bases/evidencias conservadas, sin detener servicios preexistentes.

## 2026-10-06 — V1.17: navegador → backend real → PostgreSQL

Validación nueva de los nueve escenarios solicitados, completada en ejecuciones reanudadas conservando la misma base. No es un recorrido completo ininterrumpido ni certificación de toda V1.17. No se repitieron las suites HTTP/fixtures aprobadas: únicamente recorridos fallidos/pendientes y regresiones de los defectos demostrados.

### Entorno identificado

Frontend `e90ca6c` + cambios existentes en `codex/merge-main-qa`. Backend baseline `609f6970535ff48237046dd91f74e60cb408c4d9` + implementación local A–E/reconciliación; se importó su `dist/AppModule` real sin modificar backend ni sustituir servicios Nest. PostgreSQL18.6 temporal loopback65063; base **mandaria_v117_browser_20261006_test**, nueva/exclusiva desde plantilla sintética migrada `mandaria_v117_recovery2_clean_test`. Antes de usarla se verificaron nombre, versión y migración40 `20261006000300_human_command_reconciliation`.

Cadena real: Chromium → Vite127.0.0.1:4178 → proxy de transporte127.0.0.1:43172 → Nest127.0.0.1:43171 → PostgreSQL65063. Sin `page.route`, `context.route`, respuestas fabricadas ni fixtures HTTP. Backend seleccionó sus adaptadores existentes `ROUTING_PROVIDER=local_fake` y `MAIL_PROVIDER=local_outbox`; admisión durable, tarifas, cupo, JWT, recibos y transacciones son reales. Correo guardado en carpeta temporal privada; links consumidos desde el navegador sin imprimir tokens. Contraseñas sintéticas aleatorias sólo en memoria; al reanudar se renovó únicamente el hash de esos usuarios de prueba, sin cambiar roles ni perfiles. Todas las variables/flags fueron exclusivos del proceso. CWD temporal vacío evita cargar .env operativo. No Docker, proveedores externos, producción o Coita.

### Matriz nueva

| Caso desde interfaz | Resultado y evidencia |
|---|---|
| 1 Registro/verificación/acceso | PASS: PERSONAL registrado mediante formulario, correo local REGISTER real, enlace confirmado y emailVerifiedAt persistido; login humano. BUSINESS también registrado así. |
| 2 PERSONAL cotizar/convertir/consentir/consultar | PASS: MPQ→MDR-000001→MQ, importe55.00MXN del backend, hash final y consentimiento desmarcado; aceptación y seguimiento Buscando ejecutor. |
| 3 Segunda solicitud/cancelación | PASS: ruta nueva muestra Cupo no disponible sin botón de cotizar; cancelación legal desde formulario. SQL confirma CANCELLED y lifecycle cerrado. |
| 4 BUSINESS múltiples/pagador | PASS tras corrección: MDR-000002 REQUESTER/PICKUP y MDR-000003 RECIPIENT/DELIVERY, ambas CREATED/lifecycle abierto; pantalla Activas:2. |
| 5 Pérdida/recarga sin cuerpo | PASS: MPQ aplicada en backend, respuesta perdida por proxy, reload conserva marcador; GET APPLIED recupera MPQ sin reconstruir cuerpo. |
| 6 Cierre explícito/timeout/bloqueo | PASS: petición original retenida antes de llegar al backend; GET PENDING_OR_UNKNOWN; cierre confirmado por checkbox, respuesta retenida hasta timeout20s; marcador permanece, reload+GET CLOSED_NO_EFFECTS; petición original liberada después recibe409 COMMAND_ATTEMPT_CLOSED. Preparación posterior explícita, sin comando automático. |
| 7 Consentimiento otra sesión | PASS: contexto Chromium nuevo, login propio y URL MDR sin mapa MPQ local; consent-context real recupera MQ/importe/vigencia/hash; aceptación sólo después de checkbox. |
| 8 Política original/actual | PASS: A cambia a REQUESTER y pierde cuerpo de respuesta200; B cambia a RECIPIENT; A recupera recibo APPLIED REQUESTER, pantalla mantiene RECIPIENT vigente. |
| 9 Cambio de usuario/admin | PASS: al cambiar BUSINESS→PERSONAL con marcador ajeno se conserva bloqueo sin consulta/cierre; análogo A→B en política. Volver al actor original permite reconciliar. El límite UI no sustituye la autorización backend probada por HTTP anteriormente. |

SQL complementario (lectura, sin alterar resultados): cero DeliveryAssignment, cero ShippingCollectionDeclaration y cero B2bOutboxEvent. No se simularon cobros/entregas administrativas. La solicitud PERSONAL fue aceptada y cancelada legalmente; no fue entregada.

### Inyección de fallos de transporte

`scripts/customer-real-harness.mjs` reenvía método/URL/cabeceras/body a Nest; jamás genera un recibo ni estado de negocio.

- `lose`: consume respuesta real completa y corta socket sin enviarla. Sirvió para MPQ; al aplicarlo inicialmente a política Chromium repitió el POST por el fallo de conexión. Ese ensayo no se cuenta como prueba de conservación de incertidumbre de política.
- `delay-request`: conserva en memoria la petición original del navegador y demora su envío a Nest hasta una liberación explícita. Después del cierre real se libera exactamente esa petición, y Nest devuelve409.
- `timeout`: una vez recibida la respuesta real del cierre, la retiene25s; el fetch del producto vence a20s. GET posterior consulta la misma clave real.
- `partial-response`: para la política final envía cabeceras200 y sólo el primer byte del JSON real, reteniendo el resto hasta timeout. No sustituye contenido: trunca transporte. Demuestra conservación del marcador tras cuerpo perdido; el hash de clave en la traza confirma **un único POST** para esa intención.

### Defectos frontend encontrados y corregidos

1. **BUSINESS bloqueado después de la primera solicitud** — `src/customer/pages.tsx`: interpretaba `capacity.occupied` como límite, pero backend lo define como existencia de solicitudes tanto PERSONAL como BUSINESS. Ahora gobiernan `canPrequote` y `canCreateRequest`. Backend conserva el límite PERSONAL. Regresión nueva con BUSINESS ocupado y creación permitida.
2. **HTTP200 incompleto tratado como éxito** — `src/services/api.ts`: `response.json().catch(() => undefined)` convertía JSON abortado/truncado en resolución exitosa. Se observó aviso Query data cannot be undefined y se reprodujo con prueba focalizada fallida antes del arreglo. Ahora rechaza como fallo de transporte, conserva abortos del consumidor y respeta204. Prueba unitaria nueva y política con cuerpo real truncado acreditan que la incertidumbre no se borra.

Sin defecto backend demostrado ni backend modificado. El primer fallo de script PERSONAL fue un selector que esperaba otro texto; se corrigió a Cupo no disponible y se continuó desde ahí. Tras el fallo BUSINESS se reanudó desde4, y tras ajustar el mecanismo de política desde8. Se conservaron resultados parciales; no se suman los fallos como aprobaciones.

### Comandos/resultados y archivos

```powershell
node scripts/verify-customer-real.mjs
$env:V117_BROWSER_RESUME='true'
node scripts/verify-customer-real.mjs
$env:V117_BROWSER_FROM='4'
node scripts/verify-customer-real.mjs
$env:V117_BROWSER_FROM='8'
node scripts/verify-customer-real.mjs
```

Los scripts son harness local para esta base sintética, no una configuración operativa ni un comando contra cualquier DATABASE_URL. Inicio PostgreSQL con pg_ctl del directorio temporal identificado; creación con createdb -T de la plantilla40. Mismos datos durante las reanudaciones. Apps/proxy/navegadores se cierran al acabar cada ejecución.

- `npx vitest run src/test/api.test.ts -t 'partial HTTP 200' --maxWorkers=1`: FAIL antes de corregir (resolvía undefined); no atribuirlo a backend.
- `npx vitest run src/test/customer.test.tsx src/test/api.test.ts src/test/customer-reconciliation.test.tsx src/test/customer-service.test.ts --maxWorkers=1`: **87/87 PASS**, cuatro archivos; regresiones pertinentes por los dos defectos.
- `npm run typecheck:test`, `npm run lint`, `npm run build`: PASS. Advertencia de chunk Root658.10kB, sin error.
- Capturas reales inspeccionadas: `test-results/v117-browser-real/personal-consent.png`, `business-two-active.png`, `close-timeout.png`, `policy-current-after-old-receipt.png`. Escritorio1440×1000; no capturas con passwords/tokens. Sin pageerror en recorridos aprobados; errores de red intencionales esperados.
- Evidencia consolidada: [docs/checks/v117-browser-real.json](docs/checks/v117-browser-real.json). Reportes parciales inicial/business-defect/transport/final en test-results, ignorados por Git; sólo metadatos de transporte, estados y datos sintéticos. Sin cuerpos de login, tokens ni secretos.
- Archivos de este incremento: `src/customer/pages.tsx`, `src/services/api.ts`, `src/test/customer.test.tsx`, `src/test/api.test.ts`, `scripts/customer-real-harness.mjs`, `scripts/verify-customer-real.mjs`, esta continuidad, V1.17-WEB y evidencia nueva. Cambios previos conservados.

### Separación de evidencias y límites

1. **Anteriores fixtures**: 65 pruebas + revisión visual interceptada, documentadas abajo. No prueban backend ni PostgreSQL.
2. **Anteriores HTTP reales**: cinco casos Nest/Supertest/PostgreSQL en otra base exclusiva, sin navegador; conservados abajo, no repetidos.
3. **Nuevas navegador→backend→PostgreSQL**: matriz anterior con HTTP de la aplicación real y adaptadores locales de correo/routing. Nueve escenarios acreditados a través de reanudaciones, no una pasada completa ininterrumpida.

No acreditados: correo SMTP/proveedor externo, rutas externas, navegador móvil contra backend real (la revisión móvil anterior fue con fixtures), toda la suite A–E, ejecución física/cobro/entrega o funcionamiento desplegado. No se activó admisión real ni se declara V1.17 completa. Sin commit, push o despliegue.

Cierre del entorno de esta validación: navegador, Vite4178, proxy43172 y Nest43171 cerrados; PostgreSQL65063 detenido después de confirmar ausencia de sesiones ajenas. Base sintética y evidencias conservadas. No se detuvieron servicios preexistentes.

## 2026-10-06 — V1.17: cierre contractual de reconciliación humana

Conservada implementación previa en worktree `codex/merge-main-qa`, baseline `e90ca6c`. Consultados V1.17-COMMAND-RECONCILIATION, V1.17-DEMAND-IMPLEMENTATION, OpenAPI humano y API_ACCESS. No backend/.env/producción/portal público modificado en este cierre; no commit/push/despliegue ni activación.

### Cambios

- `src/customer/reconciliation-contract.ts`, `reconciliation.ts`, `AttemptRecovery.tsx`: HumanAttemptResult, rutas humanas exactas, Idempotency-Key original, POST cierre sin body; recibo/coherencia/estado vigente antes de desbloquear. Tres estados, cierre y preparación separados con confirmación; timeout conserva marcador y ofrece GET. canPrepareNewAttempt y COMMAND_ATTEMPT_CLOSED no se confunden con DRIVER.
- `src/customer/pages.tsx`, `service.ts`, `consent.ts`: consent-context desde MDR propia sin MPQ local obligatoria, importe/vigencia/hash FINAL, referencias nullable, terminal/expiración y consentimiento explícito. Recibo histórico no sobrescribe estado actual.
- `src/customer/pending.ts`, `src/shipping/Policy.tsx`, `src/services/errors.ts`: marcador mínimo compatible, política recuperada por recibo propio, bloqueo entre actores y errores contractuales. Sin reenvíos automáticos ni persistencia de datos personales.
- `src/test/customer-reconciliation.test.tsx`, pruebas cliente existentes, `scripts/verify-customer-fixtures.mjs`, `docs/V1.17-WEB.md`, `docs/checks/v117-web-reconciliation.json` y esta continuidad.

### Comandos y resultados

- `npm run typecheck:test`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS (tsc -b y Vite); advertencia existente de chunk principal >500 kB, sin error.
- `npx vitest run src/test/customer-reconciliation.test.tsx src/test/customer-service.test.ts src/test/customer.test.tsx src/test/customer-tracking.test.ts --maxWorkers=1`: **65/65 PASS**, cuatro archivos. Incluye 23 casos de reconciliación nuevos: rutas/body ausente, tres estados, cierre confirmado/perdido, reload, usuario/admin diferente, respuesta tardía al desmontar, doble clic, APPLIED antiguo/actual terminal, error cerrado, almacenamiento y consentimiento desde otro dispositivo. Fixtures de servicios, no prueba de transacciones backend.
- `node scripts/verify-customer-fixtures.mjs`: PASS. Chromium1440×1000 y390×844, consentimiento desde URL MDR sin mapa local, confirmaciones por teclado/Space, aceptación perdida y recuperación después de reload sin otro POST, cierre técnico perdido/reload/CLOSED y preparación explícita sin POST de política. API interceptada, salida externa bloqueada. Sin pageerror ni overflow móvil. Vite4177 temporal cerrado por script.
- Capturas inspeccionadas: `test-results/v117-customer/consent-mobile.png`, `recovery-desktop.png`, `close-mobile.png`, `closed-desktop.png`; script también produce desktop/móvil de consentimiento, recuperación, política y cierre. Sólo fixtures sintéticos.
- `git diff --check`: PASS; avisos de normalización LF/CRLF, sin conflictos ni whitespace inválido.

### HTTP real y PostgreSQL exclusivo

Identificados antes de uso: backend baseline **609f6970535ff48237046dd91f74e60cb408c4d9**, implementación local A–E más reconciliación no desplegada; hashes de fuente/dist/handoff/OpenAPI en `docs/checks/v117-web-reconciliation.json`. PostgreSQL18.6 temporal previamente detenido, sólo127.0.0.1:65063. Se inició ese clúster de pruebas y creó exclusivamente **mandaria_frontend_reconciliation_20261006_test** desde `mandaria_v117_recovery2_clean_test`. SQL verificó nombre/base/versión y migraciones38,39,40; última **20261006000300_human_command_reconciliation**. No se utilizó backend Docker previo ni base comercial.

Comandos ejecutados desde backend sin editar sus archivos, con variables sólo del proceso:

```powershell
$env:NODE_ENV='test'
$env:DOTENV_CONFIG_PATH='C:/Users/zorgl/AppData/Local/Temp/mandaria-v117-z5t2IE/absent.env'
$env:DATABASE_URL='postgresql://postgres@127.0.0.1:65063/unused'
$env:TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:65063/mandaria_frontend_reconciliation_20261006_test'
node node_modules/vitest/vitest.mjs run --config vitest.config.e2e.ts test/direct-demand.e2e-spec.ts --pool=forks --maxWorkers=1 --no-cache -t 'recovers original|GET is read only|policy recovery|close fences|consent context|consent-context|races' --reporter=default --reporter=json --outputFile=C:/Users/zorgl/.codex/worktrees/f1fe/mandaria-frontend/test-results/v117-real-reconciliation.json
node node_modules/vitest/vitest.mjs run --config vitest.config.e2e.ts test/direct-demand.e2e-spec.ts --pool=forks --maxWorkers=1 --no-cache -t 'recovers exact final terms' --reporter=default --reporter=json --outputFile=C:/Users/zorgl/.codex/worktrees/f1fe/mandaria-frontend/test-results/v117-real-consent-context.json
```

Primer filtro: **4 PASS,19 omitidos**; segundo: **1 PASS,22 omitidos** (consent-context no coincidió con el primer filtro). Cinco casos únicos; no sumar omitidos ni declarar toda la suite aprobada.

| Caso HTTP/Nest con transacciones PostgreSQL | Resultado |
|---|---|
| Recibos originales crear/convertir/aceptar sin cuerpos tras reiniciar app/proceso | PASS |
| GET no modifica; cierre contra creación/conversión/aceptación tardía y concurrente | PASS |
| Política histórica tras nueva revisión, actores separados y POST cerrado | PASS |
| Cierre durante routing autorizado: consumo retenido, MPQ no publicada, recibo durable | PASS |
| consent-context desde MDR propia/otra sesión: hash final, MQ/TTL, ajeno404 y terminal | PASS |

El harness existente usa Nest real/Supertest, JWT humano y PostgreSQL real. Routing es doble determinista, correo local_outbox, polling externo deshabilitado; flags sólo en proceso de pruebas. La prueba de routing en curso utiliza consumo durable real y proveedor de ruta simulado. No se atribuye a mocks frontend la garantía transaccional. No se prueba navegador contra backend real en esta ejecución ni toda la versión A–E.


Entorno temporal al finalizar este cierre: sin sesiones cliente ajenas, se detuvo el PostgreSQL65063 iniciado para la prueba mediante pg_ctl stop; se conservaron la base sintética y sus datos. No se detuvo ningún servicio preexistente. Build final: Root658.09kB, advertencia >500kB sin error. Resultados finales repetidos tras el refresco previo a desbloqueo:65/65, tipos, lint, build y script visual PASS.
### Fallos intermedios y límites

EPERM inicial de Vite al escribir caché en node_modules enlazado: repetido con permisos y PASS. Fallos iniciales de tests eran expectativas antiguas de recuperación/selector del botón mientras está ocupado y fixture incompleto; corregidos. Lint detectó ref en render y Date.now impuro: guard de actor en layout effect y reloj de estado; comprobaciones finales aprobadas. No aborto nativo pendiente.

Corrección documental: OFFER **ya estaba soportado por backend**; la afirmación anterior de omisión fue incorrecta, no constituye cambio funcional. No se habilita cobro desde ofertas. Las antiguas brechas de recibos/cierre y consent-context quedan superadas por este complemento. Se conserva historial anterior abajo.

Pendientes fuera de esta verificación: navegador con backend real extremo a extremo, correo/routing externos, resto de escenarios A–E/operativos no seleccionados, despliegue/activación autorizados. No declarar V1.17 activada ni toda la versión cerrada. Procedimiento operativo vigente en [docs/V1.17-WEB.md](docs/V1.17-WEB.md).

## 2026-10-06 — V1.17 Web: clientes directos y configuración del pagador

Base frontend e90ca6c en worktree codex/merge-main-qa, inicialmente limpio. Backend A–E leído como referencia sin modificar. AGENTS.md/BITACORA.md no existen en la raíz; README y VERIFICATION conservados. Alcance, inventario de archivos/rutas, contratos, procedimiento y bloqueos exactos: [docs/V1.17-WEB.md](docs/V1.17-WEB.md). Sin nuevas dependencias.

### Comandos finales ejecutados

- npm run typecheck:test: PASS.
- npm run lint: PASS.
- npm run build: PASS, incluye tsc -b; advertencia de chunk Root 652.47 kB, sin error.
- npx vitest run src/test/customer-service.test.ts src/test/customer.test.tsx src/test/customer-tracking.test.ts src/test/delivery-requests.test.tsx src/test/flows.test.tsx src/test/developers.test.tsx src/test/collection-instructions.test.tsx src/test/execution.test.tsx src/test/execution-reconciliation.test.ts src/test/execution-attempt-service.test.ts --maxWorkers=1: **227/227 PASS, 10 archivos**. No se ejecutaron suites ajenas.
- node scripts/sync-public-b2b.mjs --backend C:/Users/zorgl/Documents/mandaria-backend: PASS; después mismo comando con --check: PASS. Sólo allowlist pública y hashes; no OpenAPI humano publicable.
- node scripts/verify-customer-fixtures.mjs: PASS. Vite temporal 127.0.0.1:4177 cerrado al finalizar. Chromium 1440×1000 y 390×844, registro y foco por Tab; creación MPQ PERSONAL, conversión con contacto pagador separado, consentimiento con hash final distinto al MPQ, pérdida de respuesta aplicada, reload y consulta sin segundo POST, política SUPER_ADMIN sólo GET y confirmación desmarcada, portal anónimo. Todas las APIs interceptadas, sin backend real ni tráfico externo. Sin overflow móvil ni pageerror.
- git diff --check: PASS.

### Cobertura y evidencia

Pruebas nuevas: resend completo/202 genérico, reset/nuevo login, VERIFY autenticado, perfil compatible con rol operativo, PERSONAL/BUSINESS y pagadores permitidos, cupo ocupado, hash/importe/vencimiento exactos, respuesta perdida/cuerpo inmutable/clave estable, reload sin cuerpo, cambio de usuario, lock entre pestañas, 401/403/409/429/503, cancelación confirmada sin confundir expiry, política UUID/revisión, shipping OFFER/CURRENT/HISTORICAL/DECLARED/incompleto y publicVersion BigInt. Regresión administrativa para IntegrationClient null, más ejecución/reconciliación/legacy y portal existentes. Servicios simulados; no prueban locks PostgreSQL ni ownership real del backend.

Capturas inspeccionadas: test-results/v117-customer/register-desktop.png, consent-desktop.png, consent-mobile.png, policy-desktop.png, policy-mobile.png. Results.json contiene sólo resultados/contadores sintéticos. No tokens ni secretos reales. La captura móvil inicial coincidía con la transición del sidebar al cambiar viewport: repetida tras finalizar la transición.

### Fallos encontrados y corregidos

- MPQ en caché conservaba estado anterior tras convertir y ocultaba el consentimiento: corregida invalidación de consultas cliente tras comandos confirmados; recorrido visual repetido completo.
- Vista administrativa asumía IntegrationClient no nulo: corregida para titular directo y cubierta por regresión.
- Esquema OpenAPI omite OFFER operativo y nullable de IntegrationClient, aunque las implementaciones reales los emiten: adaptaciones acotadas/documentadas, sin backend modificado.
- Durante desarrollo fallaron tipado/lint (importaciones, limpieza del token y JSX) y dobles de Web Locks/una importación de test. Corregidos; resultados intermedios fallidos no sumados como PASS. Un primer build tuvo EPERM al escribir caché de dependencias fuera del worktree; comprobación repetida con permisos y final aprobada. No aborto nativo del runner en la ejecución final.

### No verificado y límites

Sin integración real del backend A–E, correos/routing, PostgreSQL, nginx ni producción. No se abrió el backend Docker anterior como sustituto de la versión nueva; sin Docker ni flags modificados. Respuestas perdidas sin cuerpo conservan bloqueo cuando el contrato no permite acreditar resultado/no-efectos; las rutas de recuperación logística de DRIVER no se reutilizan para demandas o políticas. Pendiente backend: recuperación autorizada de creación MPQ por clave y recibos/cierre para las otras intenciones cuando falta cuerpo y las lecturas no resuelven; referencia MPQ desde MDR para otro dispositivo. Ver detalle operativo en V1.17-WEB.

Sin .env/configuración, backend, datos reales, commit, push, despliegue ni activación. No se declara V1.17 completa.

## 2026-10-11 — Compatibilidad visual con backend patches

**Resultado:** recorridos focalizados aprobados; ningún defecto frontend demostrado ni cambio de código de producto. No se fuerza LEGACY ni se modifica el bloqueo defensivo.

### Versiones y aislamiento

- Frontend principal: `C:/Users/zorgl/Documents/mandaria-frontend`, `main f0b2e4e448f78c17558b7e650d7ad0ac220914bd`. Durante la preparación hubo un cambio externo de QA a main (reflog 16:09:40); no lo realizó este trabajo. Se repitió únicamente este recorrido en main, comprobando HEAD antes y después. No se acredita QA con esta evidencia.
- Backend: `C:/Users/zorgl/.codex/worktrees/mandaria-web-contract/mandaria-backend`, `patches 30f625b`; contrato OPERATIONAL-WEB-COMPATIBILITY.md. Se utilizó su compilación dist y cliente Prisma existentes, sin modificar backend ni ejecutar build, migraciones o suites backend.
- PostgreSQL18 privado: loopback `127.0.0.1:56862`, base exclusiva `contract_web_visual_test`, copia de `contract_3_test` ya migrada. Verificadas las 32 migraciones de patches, no las 43 de QA. Cluster temporal `mandaria-contract-J9Xupc`; datos sintéticos conservados.
- Nest local `43185`, Vite `4185` con proxy /api hacia ese Nest. Routing nativo `local_fake`, correo `local_outbox` temporal, polling de webhooks desactivado sólo en el proceso. Sin .env modificado, VM, Docker, Coita, servicios externos o actividad productiva.

### Recorridos navegador → backend → PostgreSQL

| Caso | Resultado real |
| --- | --- |
| Proveedor, servicio nunca asignado | GET con trackingMode=null, sin aviso de modo desconocido y toma habilitada |
| Tomar y asignar | Login PROVIDER_ADMIN; claim y selección de conductor/vehículo mediante la UI y permisos reales |
| Asignación vigente | GET con trackingMode=LEGACY, conductor y vehículo visibles, entrega habilitada |
| Entrega proveedor | Confirmación desde PROVIDER_ADMIN; detalle refrescado y GET DELIVERED |
| Independiente | Login DRIVER independiente; TAKE con vehículo propio; Mi servicio y driver/me.activeDeliveryAssignment coherentes con LEGACY |
| Entrega independiente | Confirmación por ese DRIVER; GET DELIVERED y activeDeliveryAssignment=null |

Prueba negativa **simulada, separada de la integración real**: sobre un tercer servicio real se interceptó exclusivamente su GET de detalle para retirar trackingMode. La UI mostró el aviso defensivo y TOMAR SERVICIO quedó deshabilitado. No se omitió ni forzó el campo en backend. Los demás recorridos no interceptaron APIs.

### Ejecución y evidencia

- `node scripts/verify-patches-web.mjs`: exit0; seis resultados agrupados aprobados; `errors: []` (sin pageerror). Chromium real mediante Playwright; capturas inspeccionadas de proveedor asignado, independiente asignado y bloqueo por campo ausente.
- Runner focalizado: prepara fixtures sintéticas usando sólo helpers de siembra existentes del backend, no ejecuta sus suites. Las claves y contraseñas se generan en memoria; no se guardan en la evidencia.
- Evidencia local ignorada en Git: `test-results/patches-web/identity.json`, `results.json`, `provider-assigned.png`, `independent-assigned.png`, `missing-field.png`. Las capturas contienen únicamente datos sintéticos. identity enumera las migraciones reales.
- Ajustes previos del runner: normalización CRLF al extraer la siembra, selectores adaptados a radios reales y espera del selector de vehículo independiente; no fueron defectos de producto.
- `node --check scripts/verify-patches-web.mjs`, ESLint del runner y `git diff --check`: aprobados. Sin suites generales ni build de producto, puesto que no cambió código de aplicación.
- Vite, Nest y navegador temporales cerrados. Cluster propio detenido tras comprobar ausencia de otros clientes; datos conservados.

Límites: verificación local de estos flujos legacy, no de nginx/despliegue, ejecución detallada, GPS o clientes directos exclusivos de otras ramas. La entrega sintética sólo ejercita el flujo autorizado; no hubo entrega física ni cobro real. No commit, push ni despliegue.

## 2026-10-06 — Integración local de main y QA

## 2026-10-10 — Búsqueda automática de hasta cinco intentos

Implementación y validación local juntas. Fuentes leídas: README/continuidad de este repositorio (sin AGENTS.md propio), mandaria-backend/docs/AUTOMATIC-DISPATCH-SEARCH-HANDOFF.md y esquema DispatchSearchResponse/referencias ProviderDispatchResponse, DriverDispatchResponse y AdminDispatchResponse del OpenAPI final local. Backend sólo leído; no se copió ni publicó el OpenAPI general.

- Nuevo SearchStatus compartido y contrato search opcional: intento/maxAttempts/ventana/causa siempre provienen del backend. El reloj sólo presenta el tiempo; aun en la quinta ventana, cero no determina EXHAUSTED ni cambia la ronda.
- Integrado en tarjetas y detalles de proveedor/independiente, servicio actual independiente y auditoría administrativa. Solicitud enlaza a despachos filtrados por MDR; su endpoint administrativo no expone search. RETRY_PENDING bloquea tomar aunque el reloj local discrepe; EXHAUSTED informa que no se encontró ejecutor. STOPPED distingue servicio/integración no disponibles. EXECUTOR_FOUND recuerda una toma histórica y no implica que conserve ejecutor después de liberarse. Cancelación logística se presenta sin conclusiones comerciales.
- React Query conserva claves/refetch, agrega sondeo de 15 segundos a listas/detalles sin él y espacia errores (60–120 segundos). Sigue consultando durante la espera y al cero local; no hace POST por temporizador ni por conflicto. 409 DISPATCH_RETRY_PENDING en claim/take refresca mediante las funciones existentes, muestra espera y exige nueva decisión humana para una toma posterior.
- Legacy sin search conserva presentación y permisos; no se modifican instrucciones financieras, collectionInstructions, flujo de créditos ni reglas de cierre detallado/legacy. Corregido aviso administrativo que prometía expiración final al vencer cualquier ventana.

Validación final:

- npx vitest run src/test/dispatch-search.test.tsx src/test/dispatch.test.tsx src/test/driver-portal.test.tsx src/test/collection-instructions.test.tsx src/test/delivery-requests.test.tsx --pool=threads --maxWorkers=1: **151/151 PASS, cinco archivos**. Sólo componentes afectados y regresión financiera asociada.
- Casos nuevos: contador hasta cero en quinta ronda sin inferir cierre; espera prolongada sin incrementar; ventana nueva recibida; respuesta/refetch tardío; 409 intermedio en proveedor e independiente con una sola toma; agotamiento; cancelación; toma histórica/liberación; causas de detención; ausencia de search; auditoría y enlace desde solicitud; permisos de toma conservados en detalle; errores de sondeo.
- npx tsc -b --pretty false y npx tsc --project tsconfig.test.json --pretty false: PASS. ESLint sobre archivos fuente y pruebas afectados: PASS. git diff --check: PASS.
- Primera ejecución de Vitest con pool predeterminado: tres archivos no cargaron por ENOENT en caché temporal del sandbox; no se contabilizó como válida. Con threads/1 worker, una expectativa nueva suponía exactamente dos GET; refreshDriverPortal ya invalida y refetchea, produciendo tres. Se ajustó la prueba para exigir refetch y exactamente un comando take; corrida final completa focalizada aprobada. Errores transitorios de preparación (alias Python no disponible, cierre JSX e import faltante) corregidos antes de la validación final.

Límites: pruebas de componentes con servicios simulados y reloj controlado, no validación del worker/PostgreSQL ni E2E operativo/visual en navegador. No se ejecutó suite completa, backend, activación, operaciones reales, cambios de entorno, commit, push ni despliegue. Activación/despliegue coordinado permanecen pendientes de autorización operativa, conforme al handoff. Historial previo conservado abajo.


Preparada en codex/merge-main-qa desde QA bcd70cf, integrando main 0a44d6e sin commit ni push. Los únicos conflictos textuales fueron README.md y VERIFICATION.md: se conservaron las entradas completas de ambas ramas. Comparación de líneas previas: ninguna ausente de ninguno de los dos documentos en ambas ramas.

Se conserva ejecución/reconciliación y portal público de QA, junto con solicitudes de socio, rutas, navegación y dashboard de main. nginx.conf mantiene exactamente la configuración de main: servidor interno; TLS y proxies delegados a mandaria-proxy. Las instrucciones históricas de nginx anteriores no describen esta nueva topología. No se verificó nginx ni el proxy externo en ejecución.

Validación local sobre la combinación:
- npm run typecheck:test: PASS.
- npm run lint: PASS.
- npm run build: PASS (incluye TypeScript); advertencia existente de chunk Root de 618.50 kB.
- npx vitest run src/test/partner-applications.test.tsx src/test/flows.test.tsx src/test/developers.test.tsx src/test/execution.test.tsx src/test/execution-reconciliation.test.ts src/test/execution-attempt-service.test.ts src/test/collection-instructions.test.tsx --maxWorkers=1: 180/180 PASS, 7 archivos. Pruebas frontend con servicios simulados; no acreditan integración backend.
- git diff --check HEAD y listado de archivos sin resolver: sin incidencias.

Sin operaciones reales, Docker, despliegue ni cambios backend. Merge preparado en el worktree aislado; QA y main no se movieron. Sin nueva verificación visual ni integración real.

## 2026-10-09 — Selector de origen/destino para cotización cliente

Cambios previos del login conservados. Nuevos `src/customer/LocationPicker.tsx`, `location-selection.ts`, `src/test/customer-location.test.tsx`; modificados `customer/pages.tsx`, `location/googleMaps.ts`, `index.css`, `test/customer.test.tsx` y README. Sin cambios backend, configuración, dependencias ni credenciales.

Reutiliza cargador Google Maps; importa geocoding sólo al buscar, selección explícita de resultado, geolocalización sólo a petición y mapa por clic o centro (teclado). Errores genéricos seguros, permiso denegado, respuesta tardía, desmontaje y ausencia de key sin inventar coordenadas. Campos de origen/destino independientes; una nueva búsqueda invalida la selección. Bloqueo de precotización incompleta antes de crear intención/idempotencia.

Contrato contrastado en backend `customers/direct-demand.dto.ts` y `delivery-prequotes/prequote-conditions.ts`: PrequoteStop sólo type/sequence/latitude/longitude; normalizador exige máximo seis decimales. Se redondea al construir DTO, se conserva idempotencia existente y no se envían etiquetas de Google ni contactos en precotización. Google no calcula precio ni valida cobertura: backend conserva esas decisiones.

### Validación focalizada

- `npx vitest run src/test/customer-location.test.tsx src/test/customer.test.tsx src/test/google-map.test.tsx --maxWorkers=1`: 43 pruebas (9 nuevas del selector, 25 del cliente y 9 de mapa existente). Cubren selección explícita, edición, búsqueda vacía/error/coordenadas inválidas, respuestas atrasadas, permiso denegado, clic repetido, mapa/centro, cleanup y envío exacto del DTO con seis decimales. Corrigidas aserciones iniciales del fixture (output también tiene role=status, firma posicional de apiOnce y expectativa de redondeo); los intentos fallidos no acreditan aprobación.
- ESLint focalizado en seis módulos/test modificados; `npm run typecheck:test`; `npm run build` (incluye tsc -b). Se conserva aviso de chunk principal >500 kB (~688 kB).
- `node test-results/verify-customer-location.mjs`: recorrido Chromium con API, Google y ubicación sintéticos, 1440×1000 y 390×844; búsqueda con Enter, resultado, mapa y ubicación actual, sin overflow, coordenadas observadas en petición simulada. Capturas revisadas en `test-results/customer-location/` (ignoradas por Git). API interceptada responde 422 intencionalmente tras comprobar cuerpo; no se creó una precotización real.
- El primer fixture visual carecía del preámbulo React y luego de charset UTF-8; corregido antes del recorrido completo. Vite HMR genera avisos de WebSocket local bloqueado por Chromium; no errores de render pageerror. Es una limitación del servidor de pruebas, no una verificación de consola limpia con Google real.

Pendiente: habilitación/comprobación real de Geocoding API y referentes de la clave existente; mapa cartográfico real, precisión/permiso de dispositivo real y cotización con backend. No se accedió a Google real, producción ni Coita; sin operaciones reales, commit, push o despliegue. La revisión visual simulada no acredita disponibilidad ni facturación de Google.

## 2026-10-04 — Resincronización editorial del OpenAPI público

Referencia interna leída: B2B-FRONTEND-HANDOFF.md, «Resincronización editorial». No se copió ese documento ni docs/openapi.json completo. Se conservaron todos los cambios pendientes del portal. Sin cambios funcionales ni modificaciones backend.

- Ejecutados `node scripts/sync-public-b2b.mjs` y `node scripts/sync-public-b2b.mjs --check`: PASS; allowlist pública y hashes coinciden con backend. En esta resincronización cambian el OpenAPI público y su hash en manifest.json.
- **Cerrada la discrepancia editorial anterior:** DeliveryStatusResponse.executionProgress.description exige comparar publicVersion numéricamente por solicitud; revision sólo describe la ejecución interna. El campo revision conserva tipo number, minimum 1 y obligatoriedad en PublicExecutionProgressResponse. La guía/copiar ejemplo siguen comparando BigInt(publicVersion).
- Revisión estática de src/execution/types.ts, commands.ts, components.tsx e incidents.tsx: revision permanece en progreso/historial; expectedRevision continúa capturando e.revision en comandos/incidencias/resoluciones para concurrencia. No se reemplazaron ni modificaron esos campos; no se publican comandos administrativos en el OpenAPI B2B.
- `npx vitest run src/test/developers.test.tsx --maxWorkers=1`: 22/22 PASS; fortalecidas aserciones documentales de descripción y revision. Incluye ejemplos idénticos al contrato, comparación BigInt, anonimato y exclusión de operaciones internas. Fetch de componentes simulado; no es integración backend.
- Descarga HTTP local mediante servidor Vite temporal en 127.0.0.1:4174 (`createServer`, fetch y cierre en finally): PASS, HTTP 200, Content-Type application/json, JSON válido e igualdad estructural con public/developers/assets/openapi-b2b.json y backend/docs/openapi-b2b.json. Servidor temporal cerrado. No se reconstruyó dist: futuros builds deben incorporar el artefacto actualizado.
- Continuidad: README y esta entrada; la advertencia anterior se conserva como historial y queda resuelta por esta resincronización. Prueba documental actualizada en src/test/developers.test.tsx.

No se repitieron suites operativas, build ni revisión visual completa. Descarga verificada en fuente local, no en nginx ni producción. Disponibilidad QA y despliegue pendiente sin cambios. Sin commit, push ni despliegue.

## 2026-10-04 — Portal de seguimiento B2B público

Alcance documental sobre QA `b122a62`, inicialmente sin cambios pendientes. Leídos PUBLIC-B2B-TRACKING.md y PUBLIC-B2B-TRACKING-VERIFICATION.md del backend como referencia de sólo lectura. Disponibilidad declarada: checkout QA; publicación y despliegue pendientes. El informe backend no se presenta como una verificación ejecutada desde frontend.

### Archivos y comportamiento

- Sincronizados por `scripts/sync-public-b2b.mjs`: OpenAPI B2B, guía pública, guía de webhooks y manifiesto. Los dos ejemplos existentes de la allowlist mantienen contenido. Nunca se editó manualmente el JSON generado ni se distribuyeron documentos de verificación/administración.
- `src/developers/pages.tsx`, nuevo `src/developers/tracking.md`: ejecución, entrada y referencia conectadas; aviso QA, tipos/modos exactos, comparación decimal, asignación/transferencia, custodia/retorno, sondeo compartido/backoff/finales y continuidad de delivery.completed. Ejemplos cargados directamente desde las respuestas 200 del OpenAPI público; fotografías independientes, no una secuencia inventada.
- `src/index.css`: corte de texto en prosa pública para impedir overflow móvil por cadenas largas de estados.
- `src/test/developers.test.tsx`: contratos exactos y nullable, ejemplos idénticos al JSON, anonimato sin API y comparación BigInt del ejemplo copiable (atrasadas/iguales, números mayores que MAX_SAFE_INTEGER, valores inválidos y MDR distintas).
- `scripts/verify-developer-tracking.mjs`: verificador reproducible del portal compilado; sólo loopback 4173, bloquea API y tráfico externo, sin credenciales.
- README y esta continuidad; historial anterior conservado abajo.

### Verificaciones ejecutadas

- `node scripts/sync-public-b2b.mjs` y `node scripts/sync-public-b2b.mjs --check`: PASS, los cinco artefactos y hashes coinciden con backend normalizando CRLF.
- `npx vitest run src/test/developers.test.tsx --maxWorkers=1`: 22/22 PASS. Pruebas de componentes usan fetch simulado de archivos públicos reales; no prueban autorización ni concurrencia backend.
- `npm run typecheck:test`: PASS.
- `npm run lint`: PASS. ESLint focalizado adicional para script/componentes/pruebas nuevos.
- `npm run build`: PASS, incluye `tsc -b`. Advertencia de chunk principal >500 kB (Root ~599 kB), sin error; no se amplió el alcance a dividir la aplicación.
- `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort` + `node scripts/verify-developer-tracking.mjs`: PASS sobre build local, Chromium a 1440×1000 y 390×844. Acceso anónimo directo, navegación referencia↔seguimiento, recarga, Tab/Enter, descarga mediante enlace y comparación del JSON con el artefacto, Content-Type application/json, sin overflow ni errores de renderizado y sin peticiones API/externas. Capturas revisadas en `test-results/developer-tracking/` (ignoradas por Git): desktop/mobile, top y example. No se prueba nginx con la vista previa Vite.
- Primera conexión visual a 5173 agotó tiempo; un intento externo confirmó puerto ocupado y se usó 4173 sin detener el servicio previo. Primer recorrido alcanzó móvil y detectó overflow por texto largo: corregido en CSS; también se permitió envolver las celdas de tablas de la guía para legibilidad. Se repitió el recorrido sobre el build corregido. Los intentos fallidos no se cuentan como aprobación.
- `git diff --check`: PASS (sólo avisos de normalización LF/CRLF de Git).

### Límites y seguimiento

- Discrepancia editorial backend: `DeliveryStatusResponse.properties.executionProgress.description` del OpenAPI todavía dice comparar `revision`; el nuevo handoff y `publicVersion.description` exigen publicVersion para ordenar fotografías completas. El portal explica la regla nueva. Se preservó el artefacto exacto; BACKEND debe corregir esa descripción y luego volver a sincronizar. No bloquea la publicación de las instrucciones correctas, pero la referencia descargable conserva esa frase contradictoria.
- No se ejecutó integración HTTP backend, PostgreSQL, capacidad/benchmark, nginx ni despliegue. No se modificaron componentes operativos ni se repitieron sus suites. Sin Docker, Coita, producción, activación, commit o push.
- Después del despliegue autorizado, comprobar versión/campos de todas las instancias, origen API, descarga JSON/MIME y rutas directas en hosting real. El objetivo de 15 segundos no constituye SLA ni capacidad garantizada.

## 2026-10-03 — F-01 cerrado con integración real

## 2026-10-04 — Cierre del contrato de trackingMode y avance histórico propio

Incremental sobre cambios pendientes de la misma rama QA; no se descartaron. Contrato leído: backend docs/DRIVER-APP-EXECUTION.md, sección Cierre de limitaciones WEB; DTO ProviderAdvanceAttemptResponse y proyecciones trackingMode. Backend no modificado.

- trackingMode superior explícito: LEGACY conserva cierre anterior autorizado; DETAILED no habilita avance/entrega en web; null nunca habilita entrega. Campo ausente/desconocido, carga, error e inconsistencias no se convierten en legacy. Fixtures existentes actualizados al contrato.
- GET /provider/dispatches/:dispatchId/execution-attempt y POST .../execution-attempt/close mediante apiOnce, providerId original e Idempotency-Key original, sin body. Modal de confirmación, sin replay ni comandos de avance nuevos.
- Marcador mínimo durable histórico separado de resoluciones SUPER_ADMIN, sólo actor/dispatchId/providerId opcional/key, por origen API. Migración de intención anterior en memoria preserva clave exacta. Timeout/errores/DTO incoherente mantienen marcador; APPLIED requiere revisión entera positiva y CLOSED_NO_EFFECTS revisión null, ambos con canStartNewAttempt=false. Permisos, doble clic, respuesta tardía, recarga y cambio de identidad cubiertos. No se restauran permisos administrativos de avance.
- Recuperación DRIVER y resolución/reconciliación SUPER_ADMIN conservadas.

### Ejecución realizada

- npx vitest run src/test/provider-historical-attempt.test.tsx src/test/execution-attempt-service.test.ts src/test/execution.test.tsx src/test/execution-reconciliation.test.ts src/test/delivery-completion.test.tsx src/test/dispatch.test.tsx src/test/driver-portal.test.tsx --maxWorkers=1: **7 archivos, 198 pruebas PASS**. Sólo módulos directamente afectados y regresiones de recuperación.
- npm run lint: PASS. Revisión ESLint adicional de módulos modificados/script visual: PASS.
- npm run build: PASS (incluye tsc -b); chunk Root 587.55 kB, advertencia de tamaño >500 kB, no error.
- npm run typecheck:test: PASS.
- node scripts/sync-public-b2b.mjs --check: PASS, artefactos públicos coinciden; no se agregaron rutas humanas ni se copió OpenAPI general.
- node scripts/verify-driver-authority.mjs: PASS con fixtures Chromium; proveedor detallado/legacy, DRIVER detallado, proveedor con marcador histórico, null y campo ausente; 1440x1000 y 390x844. Tab/Enter/Escape para controles/diálogos. Sin overflow, errores de render ni escritura operativa. Marcador y datos exclusivamente sintéticos. Capturas locales ignoradas en test-results/driver-authority/, incluidas historical-confirm-mobile.png y provider-unknown-desktop.png; se esperó la carga final para capturar modos incompletos.
- git diff --check: PASS.

Durante adaptación se corrigieron un fixture de oferta que heredaba el modo anterior, una propiedad duplicada en fixture y una opción no admitida por el tipado de Testing Library. Las verificaciones fallidas anteriores no se presentan como aprobadas; se ejecutó de nuevo la selección final. La primera captura de campo ausente se tomó durante carga y fue reemplazada tras esperar la proyección final.

Archivos nuevos: src/execution/historical-store.ts, historical-recovery.tsx y src/test/provider-historical-attempt.test.tsx. Archivos modificados: tipos/servicio/commands/components de execution; tipos/reglas/páginas de dispatch; driver-portal/pages.tsx; delivery-assignments/panel.tsx; tests/fixtures relacionados; script visual; README y guías de continuidad. Se conserva el historial de verificaciones previas abajo.

### Pendientes

Integración real con backend/migraciones nuevas y app Driver no ejecutada: Docker permaneció apagado. Mocks no acreditan locks, permisos reales ni carreras transaccionales. Claves antiguas que ya se perdieron antes de persistir no pueden reconstruirse; soporte debe revisar acceso si el actor perdió cuenta/membership. No hay ya bloqueo contractual de recibos propios PROVIDER_ADMIN: la ruta nueva lo resuelve cuando se dispone de la clave original y permisos. Sin producción, activación, commit, push o despliegue.


## 2026-10-04 — Autoridad APP REPARTIDOR / web de consulta

Base QA 1b8f426. Referencia read-only: backend docs/DRIVER-APP-EXECUTION.md y selectores/servicio de ejecución. No se arrancó Docker ni se consultó backend real. Los recorridos manuales previos no validan esta nueva autoridad.

### Archivos

- src/execution/components.tsx: sin formulario de hitos en web; DRIVER tampoco registra incidencias detalladas nuevas. Mensajes de app, historia PHONE_REPORT preservada, recuperación antigua por consulta.
- src/execution/commands.ts, service.ts, types.ts: DTO DriverAttempt y GET de recibo del mismo actor/asignación/clave. Reenvío de comandos retirados bloqueado. Resoluciones SUPER_ADMIN y almacenamiento durable existentes conservados.
- src/dispatch/rules.ts, pages.tsx y src/driver-portal/pages.tsx: entrega sólo legacy con proyección OWNER completa, carga/error/refetch y correspondencia de asignación controlados. Detallado siempre de consulta para avance/entrega, independientemente de permisos viejos.
- src/test/{execution,dispatch,driver-portal,delivery-completion,execution-attempt-service}.test.*: pruebas adaptadas y nuevas. scripts/verify-driver-authority.mjs: revisión reproducible con red interceptada y datos sintéticos.
- README.md, docs/DETAILED-EXECUTION.md y docs/EXECUTION-RECONCILIATION.md: autoridad actual, recuperación anterior, límites y continuidad; historial conservado.

### Comandos y resultados realmente ejecutados

- node scripts/sync-public-b2b.mjs y node scripts/sync-public-b2b.mjs --check: PASS; artefactos iguales al backend, sin diferencias de contenido. Sólo 15 operaciones B2B; sin rutas DRIVER ni OpenAPI general.
- npx vitest run src/test/execution.test.tsx src/test/execution-reconciliation.test.ts src/test/execution-attempt-service.test.ts src/test/dispatch.test.tsx src/test/driver-portal.test.tsx src/test/delivery-completion.test.tsx src/test/developers.test.tsx --maxWorkers=1: **7 archivos, 185 pruebas PASS**.
- npm run lint: PASS.
- npm run build: PASS, incluye tsc -b. Advertencia existente: chunk Root de 581.28 kB (>500 kB), no error.
- npm run typecheck:test: PASS.
- node scripts/verify-driver-authority.mjs: PASS con Chromium y fixtures, proveedor detallado/legacy y DRIVER detallado en 1440x1000 y 390x844. Sin overflow horizontal, pageerrors ni POST operativo. Tab/Enter/Escape verificaron controles y diálogos conservados; no se confirmó ninguna operación. Capturas revisadas visualmente en test-results/driver-authority/ (ignoradas): provider-detailed-mobile.png, provider-legacy-desktop.png, driver-detailed-desktop.png y otras tres variantes. results.json contiene el resumen.
- git diff --check: PASS.

Incidencias de validación: la primera ejecución dentro del sandbox falló con ENOENT al cargar módulos transformados desde el temporal de Vitest; no se contó como prueba aprobada. Fuera del sandbox se ejecutaron las pruebas; se corrigió una expectativa del texto anterior y se repitió la selección final. La primera revisión visual encontró Vite detenido; se inició sólo Vite con variable de proceso local, sin editar .env ni arrancar Docker. Las capturas se repitieron esperando el final de la transición responsive.

### Límites y pendientes

Mocks verifican UI, rutas solicitadas y conservación de recuperación; no acreditan autorización/transacciones backend ni operación real de app. Pendiente construir/verificar APP REPARTIDOR y recorrido integrado autorizado con el contrato nuevo. No se publica ni activa nada.

Para antiguos avances PROVIDER_ADMIN inciertos, el contrato no permite consultar/cerrar recibos con ese rol. La web conserva bloqueo y comunica soporte; hace falta procedimiento/backend específico si tales intentos existen. Intentos DRIVER antiguos aún en memoria se consultan con la misma clave; si la pestaña antigua ya se perdió, no se pueden reconstruir claves no persistidas. Las resoluciones SUPER_ADMIN sí conservan su marcador durable previo. Detalle y límites del discriminante legacy en docs/DETAILED-EXECUTION.md.


Resumen y entidad completa separados; asignación vigente resuelta por ID/estado/dispatch/proveedor desde historial no paginado. Bloqueo durante carga, error o divergencia; actualización por revisión. No se modificó Badge ni backend y se conservaron cambios existentes.

**125/125 pruebas focalizadas** (dispatch, delivery-assignments, delivery-completion, execution); TypeScript, lint y build exit 0 (advertencia Root ~579 kB). Navegador real + PostgreSQL aislado: cinco hitos y DELIVERED del proveedor, transferencia A→B, antiguo proveedor sin operaciones, receptor continúa y entrega. Payload real sin status; sin errores de render, cargo adicional o evento duplicado. No repetida la suite de reconciliación real previamente aprobada.

[Detalles, archivos, comandos, límites e historial](docs/EXECUTION-REAL-INTEGRATION.md). [Huellas/resultados sanitizados](docs/checks/f01-closure.json). F-01 deja de ser bloqueo vigente. Sin .env, backend, producción, Docker, commit, push ni despliegue.

---

## 2026-10-03 — Integración real con PostgreSQL aislado

Backend real: **16/16 E2E** completos, migraciones 32/32 y build aprobados. Chromium sobre frontend actual: retorno/APPLIED con respuesta descartada, PENDING_OR_UNKNOWN tras recarga, cierre/409 original tardío, cambio de administrador, transferencia única sin nuevo cargo, continuación/entrega del receptor y legacy aprobados. Sin mocks de ejecución; routing local de fixtures, worker B2B deshabilitado y cero envíos.

**Integración global parcial:** F-01 rompe detalle PROVIDER_ADMIN detallado activo: assignment resumida sin status se trata como DeliveryAssignment completo y Badge falla con toLowerCase. No se modificó frontend conforme a la solicitud. No se demostró defecto backend; no hubo cambios de implementación backend.

[Informe, matriz, versiones, comandos y reproducción](docs/EXECUTION-REAL-INTEGRATION.md). [Evidencia sanitizada y hashes](docs/checks/execution-real-integration.json). Frontend base 65c4d77 y backend base 004b750, ambos con cambios locales preexistentes. Clúster nuevo loopback; sin .env, Docker, producción, Coita, commit, push ni despliegue. Historial anterior conservado.

---

## 2026-10-03 — Cierre y verificación actual de integración de intentos

Se encontró la integración ya preparada sin commit; se conservó y contrastó con el contrato backend. AGENTS.md/BITACORA.md no existen en este frontend; continuidad en README, este archivo y docs. Backend no modificado en esta tarea.

Cambios adicionales actuales: mensajes de respuesta incierta actualizados (tras recarga admite consulta y cierre explícito); APPLIED atribuye correctamente el resultado a la clave cuando el recibo y auditoría coinciden, sin acreditar cobro. Nueva regresión de interfaz verifica que abrir el diálogo no envía POST, confirmar envía sólo close, timeout conserva el marcador y la consulta posterior sigue bloqueando sin resolver automáticamente. Se conservan marcador mínimo, tipos y rutas ya preparados.

Ejecutado ahora, no reutilizado de entradas inferiores:

- npm run typecheck:test: exit 0.
- npm run lint: exit 0.
- npm run build: exit 0 (tsc -b y Vite); advertencia preexistente chunk Root ~578 kB.
- Cuatro archivos completos con Vitest: **79/79**, exit 0: execution-reconciliation 24, execution.test 32, execution-attempt-service 2, api 21. Reporte local test-results/reconciliation-current.json. Sin omitidos ni abortos en esta ejecución de pruebas.
- Chromium local con red externa bloqueada y fixture sintética: 1366x900 y 390x844, confirmación visible, Escape, ausencia de overflow horizontal, cierre incierto y marcador tras recarga. Capturas attempt-current-desktop.png y attempt-current-mobile.png inspeccionadas visualmente; cero errores de página. Reporte test-results/execution-preview/attempt-current-visual.json. Primer script visual utilizó view=admin, que la fixture interpreta como DRIVER: timeout esperando botón; corregido a view=incident y recorrido completo aprobado. No se cuenta el intento fallido.
- git diff --check: exit 0 al cierre. Servidor Vite de esta tarea detenido.

Límites: carreras close/resolve, permisos y respuesta perdida son mocks; no se verificaron locks ni llamadas reales backend en esta tarea. Reinicio simulado de módulos/navegador preserva almacenamiento. Pendiente prueba integrada autorizada contra backend con migración correspondiente. No garantiza bloqueo entre dispositivos ni tras borrado deliberado de almacenamiento. No modificación backend, activación, Docker, commit, push o despliegue.

---

## 2026-10-03 — Integración del recibo durable de intentos

Implementado en main sobre 65c4d77. Backend sólo consultado: docs/EXECUTION-ATTEMPT-RECONCILIATION.md y execution.controller/service/responses. AGENTS.md y BITACORA.md no existen en la raíz; continuidad existente README/VERIFICATION y docs preservada.

Archivos: src/execution/{types,service,commands,reconcile,components}, src/test/execution-reconciliation.test.ts y execution-attempt-service.test.ts, README y docs/EXECUTION-RECONCILIATION.md. Marcador mínimo sin cambios. GET/POST close usan clave original en cabecera y sin body, mediante apiOnce sin reintentos. APPLIED comprueba ID y actor de resolución y evidencia existente; CLOSED_NO_EFFECTS refresca antes de liberar un nuevo formulario; desconocido/timeout conserva bloqueo. 409 cerrado impide replay volátil y requiere consulta. Otra cuenta no puede reconciliar ni cerrar intento ajeno.

### Ejecutado

- npm run typecheck:test: exit 0 (incluye pruebas nuevas).
- npm run lint: exit 0; npx eslint src/test/execution-attempt-service.test.ts: exit 0 para el último archivo añadido.
- npm run build: exit 0, tsc -b + Vite; advertencia existente Root ~578 kB.
- npx vitest run src/test/execution-reconciliation.test.ts src/test/execution.test.tsx src/test/api.test.ts: 76/76, tres archivos.
- npx vitest run src/test/execution-attempt-service.test.ts: 2/2. Total focalizado: 78 pruebas.
- git diff --check: sin errores.

Primera corrida Vitest: ENOENT en temporales de sandbox, dos suites no arrancaron y API 21 pasó. Una repetición fuera del sandbox resolvió el problema y pasó 76/76. No fallo funcional ocultado.

### Visual y límites

Chromium headless con fixture sintética local: 1366x900 y 390x844; diálogo legible, sin overflow móvil, Tab enfoca confirmación, Escape cierra, Enter abre, cierre simulado mantiene bloqueo, recarga conserva marcador. Sin errores de página. Capturas locales ignoradas: test-results/execution-preview/attempt-desktop.png y attempt-mobile.png; inspeccionadas visualmente. Vite inicial aislado produjo timeout de conexión; instancia local fuera del sandbox permitió completar la revisión.

Carreras close/resolve probadas con respuestas simuladas (ambos ganadores), no locks reales. Tests cubren APPLIED con ID exacto, PENDING_OR_UNKNOWN, CLOSED_NO_EFFECTS true/false, respuesta perdida de cierre, doble cierre, 409 del original tardío, permisos, identidad cambiada y marcador tras recarga. Sin POST automático de resolución. Ninguna operación física ni llamada real al backend en pruebas visuales. Pendiente integración real con backend/migración instalada y usuarios autorizados cuando se habilite una validación controlada; no se activó DETAILED_EXECUTION_ENABLED. Persistencia local no garantiza bloqueo en otro dispositivo ni tras borrar almacenamiento. Sin backend modificado, commit, push, Docker o despliegue.

---
## 2026-10-04 — Solicitudes de socio: vista «Abiertas» con varios estados

El backend ahora acepta `status` con varios valores separados por comas (handoff actualizado, sección de bandeja administrativa). La bandeja usa por defecto «Abiertas» (`status=RECEIVED,CONTACTED`). En la URL, `status` vale `OPEN` (o no aparece), uno de los cinco estados o `ALL`, que omite el filtro. Si la URL trae una lista con comas, se rechaza como filtro inválido y no se llama al backend. El contador del dashboard no cambia: sigue contando sólo `RECEIVED`.

Archivos: `src/partner-applications/pages.tsx`, `src/partner-applications/types.ts` (`status` pasa a ser texto con uno o varios estados) y `src/test/partner-applications.test.tsx`.

### Ejecutado

- `npx vitest run src/test/partner-applications.test.tsx --maxWorkers=1`: **25/25 PASS**. Cubre la vista por defecto con `RECEIVED,CONTACTED`, las opciones del filtro, el cambio entre un estado, `ALL` y `OPEN` (con `status` y `page` en la URL), un estado único restaurado desde la URL, los estados inválidos `PENDING` y `RECEIVED,CONTACTED` sin llamada, y el contador del dashboard con `RECEIVED`. Servicios simulados.
- `npx vitest run src/test/flows.test.tsx`: 45/45 PASS.
- `npx tsc -b`, `npm run typecheck:test`, `npm run lint`, `npm run build`: PASS. `prettier --check` de los archivos tocados: PASS.

### No ejecutado

- No hubo comprobación contra el backend real: `localhost:3000` rechazó la conexión (contenedor detenido) y no se arrancó Docker. No se repitió la suite completa ni la revisión visual.

## 2026-10-04 — Solicitudes de socio (Fase 1, SUPER_ADMIN)

Fuente: `mandaria-backend/docs/PARTNER-APPLICATIONS-HANDOFF.md` (manda sobre `mandaria-landing/docs/solicitudes-socio/CONTRATO.md`). Backend local en Docker (`feat/solicitud-repartidor`, sin commit). Sin cambios de backend, commit, push ni despliegue.

### Archivos

- Nuevo `src/partner-applications/` (`types.ts`, `service.ts`, `queries.ts`, `format.ts`, `pages.tsx`) y `src/test/partner-applications.test.tsx`.
- `src/app/App.tsx` (rutas SUPER_ADMIN `/admin/partner-applications` y `/:reference`), `src/layouts/AdminLayout.tsx` (menú), `src/dashboard/Dashboard.tsx` (contador `RECEIVED`), `src/services/errors.ts` (tres códigos), `src/index.css` (badges/pasos; se retiró `.delivery-stat-grid`, ya sin uso).
- `src/test/flows.test.tsx`: la lista esperada del menú SUPER_ADMIN ya fallaba antes de esta tarea (le faltaba «Incidencias de custodia»); se actualizó con esa entrada y la nueva.

### Diferencias con el contrato (reportadas)

- Paginación `page`/`pageSize`, no `cursor`/`limit` (handoff).
- **`status` admite un solo valor por petición** (`PartnerApplicationListQueryDto`, `@IsIn`). La vista por defecto es `RECEIVED`, no «abiertas» (`RECEIVED`+`CONTACTED`); «Todos los estados» omite el filtro. Si se quiere la bandeja de abiertas en una sola página, Backend debe aceptar varios estados.
- `PARTNER_APPLICATION_LINK_INVALID` agrupa todas las causas; como no se lee `message`, la interfaz las enumera. El formulario sólo ofrece proveedores FLEET e invitaciones con el correo exacto, y antes de enviar rechaza una invitación que sea de otro proveedor.

### Ejecutado

- `npx vitest run src/test/partner-applications.test.tsx`: **22/22 PASS** (lista, filtros y paginación, URL inválida, menú y contador, 403 para PROVIDER_ADMIN/DRIVER, contacto, acciones según `allowedTransitions`, nota obligatoria en APPROVED/REJECTED/DISCARDED, APPROVED→REJECTED con nota nueva, 404 y 409 por `code`, vínculos FLEET/INDIVIDUAL, invitación de otro proveedor y vínculos conservados tras rechazar). Servicios simulados.
- `npx vitest run` (suite completa): 698 PASS / 19 FAIL. 18 son de `delivery-assignments*.test.ts(x)` y fallan igual sin estos cambios (etiquetas de asignación desalineadas con su prueba; se comprobó con `git stash`). 1 de `dispatch.test.tsx` fue un tiempo agotado por carga: aislado, 47/47 PASS.
- `npm run typecheck:test`, `npm run lint`, `npm run build`: PASS (advertencia de chunk >500 kB ya existente, Root 618 kB).
- `npm run format:check`: FAIL en los mismos 14 archivos que ya fallaban antes (docs, assets públicos y pruebas ajenas); ninguno de esta tarea.
- Revisión real: backend Docker `:3000`, Vite `localhost:5173` y Edge vía Playwright, con el SUPER_ADMIN bootstrap local (`MANDARIA_BACKEND_ENV`, sin imprimir credenciales). Se crearon SOC-000005…000009 con `curl` al endpoint público (dos tandas, respetando 5/10 min; 202, y el duplicado devolvió la misma referencia). Script en `test-results/partner-applications/` (ignorado por Git). Resultados: contador del dashboard, lista RECEIVED por defecto con «2 envíos», filtro de tipo y `q`, enlaces `tel:`/`wa.me/52…`/`mailto:`, RECEIVED→CONTACTED→APPROVED→REJECTED con notas, aprobar sin nota bloqueado, 409 `PARTNER_APPLICATION_INVALID_TRANSITION` real (cambio concurrente por API) con recarga de transiciones, 404 `PARTNER_APPLICATION_NOT_FOUND` real, vínculo de proveedor FLEET registrado (200) y visible, y 409 `PARTNER_APPLICATION_LINK_INVALID` real por API (`providerId` en INDIVIDUAL). En móvil (390 px) no hay desbordamiento horizontal y no hubo errores de navegador. Capturas revisadas: desktop (dashboard, lista, detalle, 409, aprobada individual y FLEET vinculada) y móvil (lista y detalle).

### No verificado / límites

- Registrar un `invitationId` real (exigiría crear una invitación y una cuenta INVITED); sólo está cubierto en Vitest. El 409 de vínculo en la interfaz también se probó sólo en Vitest.
- SOC-000005 y SOC-000006 tienen nombres con caracteres corruptos porque el `curl` de Git Bash no envió UTF-8; no es un fallo de la interfaz. Las siguientes se enviaron desde archivos UTF-8 y se ven bien. Son datos locales de prueba.
- El proveedor que recibe a los repartidores independientes sigue pendiente del propietario.
- Sin nginx, producción ni `https://app.mandaria.com.mx`.

## 2026-10-03 — Reconciliación de resoluciones tras recarga/cierre

Se conservaron los cambios anteriores sin commit en `main`. **Resuelto el bloqueo seguro en frontend; recuperación de un intento no aplicado con cuerpo perdido depende de BACKEND.** Sin cambio/activación de backend, configuración, despliegue, commit ni push. El historial anterior permanece debajo.

### Cambios

- `src/execution/reconciliation-store.ts`: marcador mínimo localStorage por origen API, guardado/verificado antes del POST. IDs de actor/despacho/incidencia/asignación, revisión, tipo y clave. Sin cuerpo, motivos, contactos, receptor, confirmaciones, tokens o secretos. Sin expiración automática de incertidumbre. Eventos storage actualizan las vistas abiertas; no se presenta localStorage como lock distribuido.
- `src/execution/reconcile.ts`: reconciliación sólo GET con incidencia/resolución, asignaciones e historial paginado, más relecturas de estabilidad. No identifica un recibo por clave ni atribuye el cierre al intento local.
- `commands.ts`, `components.tsx`, `incidents.tsx`: bloqueo durable de nueva resolución, incluso tras cambio de usuario; aviso «Pendiente de reconciliación» y acción de lectura. Replay exacto sólo mientras existe cuerpo original en memoria; nunca se reconstruye tras recargar. Si se cambia identidad durante lectura se interrumpe y no se retira el marcador.
- Nuevas pruebas `execution-reconciliation.test.ts`, extendidas `execution.test.tsx`. README y documentación de continuidad actualizados. [Procedimiento operativo y bloqueo exacto para BACKEND](docs/EXECUTION-RECONCILIATION.md).

### Ejecutado en esta tarea

| Comando | Resultado |
| --- | --- |
| `npm run typecheck:test` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npm run build` | Exit 0, incluye `tsc -b`; advertencia de chunk Root ~575 kB |
| `npx vitest run src/test/execution-reconciliation.test.ts src/test/execution.test.tsx src/test/api.test.ts` | **66/66**, tres archivos, exit 0 |
| `git diff --check` | Exit 0 |

Pruebas de reconciliación: 14; ejecución/interfaz: 31; transporte/API: 21. Una corrida previa de los dos primeros archivos pasó 40/40 antes de ampliar casos. Sin abortos del runner. No se repitieron suites ajenas, Docker ni CHECK operativo.

### Evidencia y límites

- Recarga/reapertura simulada reiniciando módulos JavaScript, manteniendo exclusivamente el localStorage anterior. TRANSFER/RETURN_TO_ORIGIN confirmados con respuesta perdida: resolución y evento presentes, asignaciones coherentes, retiro del marcador y cero POST adicionales.
- Operación no aplicada: incidencia abierta, sin resolución; **bloqueo conservado**, incluso si se intenta generar nueva clave/cuerpo. Esa lectura no distingue «falló» de «todavía en vuelo».
- Incertidumbre: red, asignaciones contradictorias, evento ausente, revisión cambiante; todos retienen marcador y bloqueo. Historial paginado probado.
- Cambio de cuenta: no hay consulta/replay del intento anterior; el formulario de esa incidencia continúa bloqueado. Cambio durante la primera lectura detiene las siguientes y conserva el marcador.
- Marcador escrito antes de transporte y sin datos privados del formulario; almacenamiento no disponible impide POST, corrupción falla de forma cerrada. Prueba de interfaz tras perder estado volátil: ofrece lectura y no ofrece replay ni nueva resolución.
- Son mocks/frontend. No se cerraron pestañas de un navegador real en este seguimiento, no se hicieron resoluciones reales ni se verificaron nuevamente los locks/recibos del backend. La documentación anterior de evidencia visual sigue siendo histórica.

### Bloqueo para BACKEND

El backend guarda recibos exitosos de `DeliveryExecutionCommand` y ofrece replay con clave/cuerpo idénticos, pero no una lectura de recibo/estado del intento ni una garantía terminal «sin efectos». Hace falta ese contrato autorizado, serializado con las escrituras y capaz de garantizar que el intento original no confirme más tarde. «No encontrado» o incidencia abierta no son prueba suficiente. No se inventó endpoint ni se habilitó la repetición con otra clave.

El marcador sólo protege el mismo perfil/origen mientras se conserve el almacenamiento; no garantiza bloqueo en otro dispositivo o tras borrar datos. Un control universal de intentos pendientes también corresponde a Backend. Procedimiento: reabrir con la cuenta iniciadora, consultar incidencia, reconciliar por lectura; si no hay cierre coherente, escalar sin borrar marcador ni repetir la operación física.

---

## 2026-10-02 — Interfaces de ejecución detallada

**Implementadas y verificadas localmente con fixtures; sin activación ni validación operativa real.** Rama `main`, árbol inicialmente limpio. Backend sólo leído. Historial anterior conservado. Sin Docker, Coita, producción, .env/configuración modificada, commit, push o despliegue.

### Archivos y comportamiento

Nuevo dominio `src/execution/{types,service,format,commands,components,incidents,payment}`: fases, historial, cola y resolución, idempotencia exacta y condiciones económicas. Integrado en dispatch proveedor/admin, driver-portal, delivery-assignments, collection-instructions, App, AdminLayout, cliente HTTP/errores y CSS. Pruebas nuevas `execution-fixture.ts`, `execution.test.tsx`; extendidas api, dispatch, driver-portal y developers. Portal agrega `/developers/execution`; artefactos públicos sincronizados mediante script existente. Inventario y contrato completo: [docs/DETAILED-EXECUTION.md](docs/DETAILED-EXECUTION.md). README actualizado.

Se corrigieron durante la revisión: inferencia del ejecutor desde claim histórico; instrucciones de adelanto después de recogida; permisos económicos durante refetch; borrado de formulario por polling; bloqueo comercial del independiente que aún tiene custodia; confirmaciones que debían reiniciarse al cambiar receptor; overflow móvil del ejemplo JSON público. SUPER_ADMIN no avanza ni entrega y DRIVER de flotilla sólo consulta.

### Comandos y resultados realmente ejecutados

| Comando | Resultado final |
| --- | --- |
| `node scripts/sync-public-b2b.mjs` | Exit 0; se copiaron artefactos revisados, sin edición manual |
| `node scripts/sync-public-b2b.mjs --check` | Exit 0; artefactos coinciden con backend |
| `npm run typecheck:test` | Exit 0 |
| `npm run lint` | Exit 0 |
| `npm run build` | Exit 0; incluye TypeScript `tsc -b`; advertencia por chunk Root ~568 kB, no error |
| Vitest focalizado, comando debajo | **197/197, ocho archivos**, exit 0, sin omitidas ni canceladas |
| `git diff --check` | Exit 0 |

```sh
npx vitest run src/test/execution.test.tsx src/test/api.test.ts src/test/dispatch.test.tsx src/test/driver-portal.test.tsx src/test/collection-instructions.test.tsx src/test/developers.test.tsx src/test/delivery-assignments.test.tsx src/test/delivery-completion.test.tsx --reporter=default --reporter=json --outputFile=test-results/execution-preview/tests.json
```

Desglose final: execution 29, api 21, dispatch 39, driver-portal 32, collection-instructions 22, developers 8, delivery-assignments 22, delivery-completion 24. Roles/rutas, cinco transiciones, legacy, incidencia abierta, retorno, transferencia FLEET/INDEPENDENT, selección providerId, custodio comercialmente suspendido, cambio de acceso, 409/receptor inelegible, doble envío, respuesta perdida y replay idéntico, confirmaciones vacías/reiniciadas, lectura sin éxito optimista, permisos económicos y regresión de entrega. API transport prueba Idempotency-Key y cuerpo exacto, sin retry en 401/409/500.

Primeros intentos detectaron una expectativa legacy obsoleta y errores TypeScript de una fixture/corrección textual; se corrigieron, sin silenciar tipos. Las corridas posteriores pasaron. No hubo aborto del runner. No se ejecutaron suites ajenas ni otro CHECK operativo. Una consulta HTTP a localhost fue bloqueada por el sandbox; repetida con permiso de red local, respondió correctamente.

### Revisión visual local

Vite en `127.0.0.1:5178`, fixtures sintéticos con llamadas operativas interceptadas en memoria y fetch deshabilitado. Sin cuentas ni secretos reales. Componentes productivos dentro del layout real; la prueba de composición de las páginas de proveedor/repartidor se complementa con Vitest. No equivale a login o flujo E2E real backend.

- Escritorio 1366×900: progreso, historial, detalle/retorno y selector de transferencia con administrador receptor.
- Móvil 390×844: progreso proveedor, consulta flotilla, formulario de transferencia y guía pública. Tras corregir inline code, ancho del portal 375/375 px útiles, sin overflow horizontal.
- Teclado: Enter abre modal de avance, foco inicial en cerrar, Tab alcanza confirmación vacía; Escape cierra y devuelve foco al botón iniciador. Tab en transferencia pasa del selector de administrador a la primera confirmación. Ninguna confirmación inicialmente marcada.
- Consola inspeccionada de fixture administrativo y portal público: sin errores/advertencias capturados.
- Ruta directa anónima `/developers/execution` carga guía real local. Descarga desde enlace `openapi-b2b.json`: JSON parseable y SHA256 idéntico al artefacto público. GET local: HTTP 200, `Content-Type: application/json`, OpenAPI 3.0.0. Esto verifica Vite, no nginx desplegado.

Evidencia local ignorada por Git, en `test-results/execution-preview/`: `progress-desktop.jpg`, `progress-mobile.jpg`, `admin-desktop.jpg`, `transfer-desktop.jpg`, `transfer-mobile.jpg`, `fleet-mobile.jpg`, `independent-dialog.jpg`, `public-mobile.jpg`, fixture local y `tests.json`. Una captura fullPage falló; las capturas de viewport posteriores funcionaron. La navegación desde el formulario con cambios quedó abortada; las otras superficies se revisaron en pestañas separadas sin enviar operaciones.

### Pendientes y límites reales

- No se activó `DETAILED_EXECUTION_ENABLED`. Integración real, locks, transacciones, persistencia y autorizaciones de backend no se verificaron con mocks frontend. Sus resultados pertenecen al documento de Backend, consultado como referencia.
- Recuperación de comandos en memoria, conservada al navegar dentro de la pestaña y aislada por identidad. No sobrevive a recarga/cierre/crash: aviso y beforeunload; ante pérdida, reconciliar estado con SUPER_ADMIN sin generar otra operación a ciegas. No se persisten motivos/contactos.
- Driver flotilla sólo recibe progreso desde driver/me; no existe contrato de timeline paginado para ese actor. Actores de historial vienen como ID/rol, sin nombre: se muestran los datos disponibles.
- Refetch periódico de 15 s/foco y tras operaciones; no revocación visual instantánea entre pestañas. Backend valida cada escritura.
- Build advierte tamaño del chunk; no se cambió configuración para ocultarlo. No se encontró un dato/endpoint faltante que bloquee las interfaces solicitadas.

---

## 2026-10-01 — Corrección de entrada SPA /developers en nginx

**Preparada localmente, no desplegada.** Evidencia aportada por propietario: `/developers` devuelve 301 hacia `/developers/`, ésta 403; ruta profunda y OpenAPI real 200; Swagger bloqueado. No se hicieron peticiones a producción en esta tarea.

### Diff y alcance

- `nginx.conf`: únicamente dos ubicaciones exactas HTTPS `/developers` y `/developers/`, cada una con `try_files /index.html =404;` y `expires -1;`. Evitan seleccionar el directorio físico `developers` mediante `$uri/`; sirven la entrada SPA y fallan con 404 si ésta no existe.
- `scripts/check-developers-entry.test.mjs`: regresión estática de ambas entradas y conservación de archivos reales, JSON inexistente y fallback de rutas profundas.
- `README.md`: causa, comportamiento esperado, comandos y matriz de validación real pendiente.
- Este documento conserva debajo todo el historial.

El diff no modifica assets, regex JSON, fallback general, proxies API/health/docs, TLS ni map/guardas de Swagger. Se conserva HTTP→HTTPS. Backend, .env, versión y aplicación React intactos.

### Ejecutado ahora

- Antes de corregir nginx: `node --test --test-isolation=none scripts/check-developers-entry.test.mjs`: **1/3**, exit 1. Fallaron exactamente las dos entradas por ausencia de ubicaciones exactas. Es evidencia de regresión estática, no reproducción HTTP.
- Después: mismo comando, **3/3**, exit 0, sin omitidos/cancelados.
- `node scripts/check-swagger-policy.mjs`: exit 0, 16 rutas Swagger y 9 no afectadas, interruptor 1 y dos guardas/proxies conservados. No representa peticiones HTTP.
- `git diff --check`: exit 0; revisión del diff nginx confirma sólo 11 líneas añadidas.
- Disponibilidad local: `Get-Command nginx` / `nginx.exe` no encontró ejecutable. **No se ejecutaron nginx -t ni pruebas reales con nginx**, ni se instaló nginx.

### Pendiente para operación

Validar `nginx -t` en el entorno efectivo y, sólo después de publicación autorizada, comprobar ambas entradas HTTPS 200 HTML sin redirect/Location, ruta profunda 200, JSON existente 200 parseable, JSON/asset inexistentes 404 sin fallback, Swagger bloqueado y proxies API/health conservados. Pasos en README. La revisión estática no acredita comportamiento del servidor desplegado.

No build/tests React: no cambió código de aplicación. Sin Docker, backend modificado, recarga, despliegue, commit ni push.

---

## 2026-10-01 — Restricción reversible de Swagger público

Solicitud aprobada por propietario: bloquear documentación completa en nginx conservando posibilidad de reabrir. **Preparado localmente; no desplegado.** Sin backend modificado, Docker, commit ni push.

### Archivos y alcance

- `nginx.conf`: map único de `$uri` a `$block_public_swagger`; patrón insensible a mayúsculas `^/(?:api/v1/)?docs`, valor 1 bloquea y 0 habilita. Ambos servidores HTTP/HTTPS retornan 404 antes del proxy/fallback. Se conservan los bloques de proxy API/docs/health, SPA y archivos B2B. No se agrega autenticación por query/cookie/cabecera ni navegador.
- `scripts/check-swagger-policy.mjs`: comprobación estática del patrón, ambas guardas, rutas afectadas/no afectadas y presencia de proxies/fallback conservados. No es parser nginx ni simulación del normalizador HTTP.
- `README.md`: rutas reales, procedimientos bloquear/reabrir (nginx -t obligatorio antes de recargar), matriz posterior y túnel SSH con puertos/destinos a verificar.

Fuente consultada: setup.ts y swagger-module.js de la dependencia instalada del backend. UI /docs, /docs/, /docs/index.html; JSON /docs-json; YAML /docs-yaml; init JS, CSS/bundles/favicons y LICENSE bajo /docs/. Prefijo global no aplicado a Swagger. Se bloquean también subrutas anidadas y el alias defensivo /api/v1/docs; no se encontró otro montaje Swagger en setup.

### Verificaciones ejecutadas

- `node scripts/check-swagger-policy.mjs`: exit 0; **16 rutas Swagger y 9 rutas no afectadas**, interruptor 1, dos guardas y proxies conservados.
- `npx eslint scripts/check-swagger-policy.mjs`: exit 0.
- `git diff --check`: exit 0.
- Revisión del diff nginx: sólo map y dos guardas; no cambios a upstream, TLS, redirecciones ordinarias, portal ni descarga B2B.
- Comprobación de disponibilidad de nginx: no hay ejecutable en el entorno. **No ejecutados nginx -t, recarga ni pruebas HTTP reales**. No se repiten build/tests React porque no se modificó la aplicación.

### Exposición directa y soporte

Compose backend consultado: binding host `127.0.0.1:${PORT:-3000}:3000`; upstream nginx backend:3000; Nest escucha 0.0.0.0 dentro del entorno. No son pruebas de listeners/firewall del servidor desplegado. Puerto host, usuario y host SSH se documentan como valores a confirmar, sin inventarlos ni abrir acceso. Túnel local atado a 127.0.0.1 hacia listener backend privado confirmado; soporte usa /docs directamente por el túnel.

Si otro puerto backend o proxy público entrega Swagger, este bloqueo puede eludirse. Pendiente operación: verificar listeners/firewall y virtual hosts alternativos, nginx -t en entorno efectivo, recarga autorizada y matriz HTTP (incluye mayúsculas, escapes, barras repetidas, dot segments y parámetros). En restringido: 404 sin Swagger/fallback; entradas inválidas pueden ser 400. En habilitado: rutas reales UI/JSON/YAML/assets accesibles y resto sin regresión. La revisión estática no acredita esos resultados en despliegue.

Reversión: cambiar únicamente el valor del patrón 1→0, nginx -t y sólo tras éxito recargar; verificar UI/JSON/YAML/assets y portal/API/health. Restaurar restricción con 0→1 y el mismo procedimiento. No eliminar Swagger backend ni cambiar su contrato.

---

## 2026-10-01 — Preparación de publicación con origen confirmado

Propietario confirmó Web https://mandaria.com.mx, API https://mandaria.com.mx/api/v1 y portal /developers. Sin despliegue, Docker, backend modificado ni activación/envíos reales. Sin commit/push en esta tarea. Historial anterior conservado abajo.

### Cambios

- `src/config/env.ts`: exige origen sin pathname para prevenir /api/v1 duplicado. Transporte central añade prefijo a auth/login/me/refresh/logout, api, apiOnce y publicApi. Únicos consumidores VITE: cliente HTTP y portal; scripts E2E usan otra variable. `.env.example` documenta publicación sin sustituir desarrollo local ni escribir .env.
- `src/developers/pages.tsx`: destinos confirmados, ejemplo copiable server-to-server, servidor real del JSON y aviso condicional si no coincide con publicación.
- `nginx.conf`: assets de documentación con MIME explícito, 404 sin fallback y revalidación; JSON fuera de ese directorio devuelve 404. Rutas SPA y proxies API/Swagger/health permanecen intactos. Revisión del diff local, no validación nginx en ejecución.
- Artefactos generados: guía pública, OpenAPI y manifest actualizados exclusivamente mediante sincronización, después de que backend entregara dominio confirmado. Handoff interno no publicado.
- Tests de configuración/URLs/portal y README con comandos de build y comprobación posterior.

### Ejecutado

1. `node scripts/sync-public-b2b.mjs` y `node scripts/sync-public-b2b.mjs --check`: exit 0. Origen backend ya actualizado a https://mandaria.com.mx; copia coincide.
2. `npx vitest run src/test/api.test.ts src/test/developers.test.tsx src/test/webhooks-api.test.ts`: **31/31**, 3 archivos, exit 0. Cubre origen confirmado con prefijo único en todos los transportes y auth/refresh, rechazo de configuración con ruta, portal anónimo y referencia. Primera ejecución 30/31: selector de test ambiguo cuando servidor del artefacto y origen confirmado coinciden; se delimitó al párrafo del artefacto y la repetición pasó. No hubo petición real: fetch simulado.
3. `npm run typecheck:test`: exit 0.
4. `npm run lint`: exit 0.
5. `$env:VITE_API_URL='https://mandaria.com.mx'; npm run build`: exit 0, incluye TypeScript. Variable sólo del proceso; .env intacto. Advertencia de chunk Root ~541.15 kB / 147.13 kB gzip.
6. Verificación Node local del dist: cinco artefactos coinciden con public, JSON parseable y las 15 operaciones tienen exactamente un /api/v1 al unir server+ruta. No OpenAPI general añadido.

### Límites y pendientes

No hay nginx disponible en este entorno: no se ejecutó `nginx -t` ni se simula que Vite acredite reglas nginx. MIME efectivo, 404 sin fallback, acceso directo/recarga y conservación del proxy requieren comprobación en el hosting tras despliegue autorizado; pasos en README. La descarga/navegación visual local anteriores siguen documentadas, pero no acreditan la instalación real. Ya no falta dominio ni entrega backend actualizada. Persiste únicamente validación de hosting/integración y aviso de tamaño del bundle; no se cambia el acceso a Swagger.

---

## 2026-10-01 — Confirmación de la entrega revisada B2B

Continuación del mismo alcance, sin repetir la implementación ni la revisión visual ya completada. Releídos handoff, contrato administrativo y configuración. Los cinco artefactos públicos ya integrados coinciden exactamente con la entrega revisada; el handoff continúa sólo como referencia interna y no se publica.

- Contraste: GET/PUT endpoint, POST secret, GET summary, eventos/lista/detalle y salud coinciden con el handoff. Boolean enabled explícito; 404 sólo representa ausencia al consultar endpoint; estados PENDING/DELIVERED/EXHAUSTED/NO_DELIVERY y razones NO_ENDPOINT/BEFORE_BOUNDARY/NOT_YET_PICKED_UP correctos; failureKind y destino histórico correctos. No se incorporan rescue/deliver ni el listado antiguo limitado a 100.
- Ajuste encontrado: `src/services/errors.ts` descartaba requestId. Ahora conserva code/requestId como metadata sin incorporar mensajes internos a la UX. Prueba agregada en `src/test/webhooks-api.test.ts`.
- `node scripts/sync-public-b2b.mjs --check`: exit 0, entrega vigente idéntica.
- Casos negativos antes bloqueados: ejecutados mediante `node --input-type=module` con importaciones aisladas por URL en el mismo proceso y copias temporales, sin spawn. **3/3 aprobados**: coincidencia, rechazo de guía desactualizada y rechazo de operación no revisada. Esto resuelve la limitación EPERM documentada en la entrada anterior; el backend no fue escrito.
- `npx vitest run src/test/webhooks-api.test.ts src/test/api.test.ts`: **20/20**, 2 archivos, exit 0. Complementa las 90/90 anteriores; no se suman como pruebas únicas porque hay casos repetidos.
- `npm run typecheck:test`, `npm run lint`, `npm run build`: exit 0. Build incluye TypeScript; aviso de chunk Root 540.25 kB / 146.89 kB gzip, sin error.
- `git diff --check`: exit 0. Inventario de public/dist: sólo openapi-b2b.json; no OpenAPI general ni handoff interno.
- La descarga efectiva, rutas públicas anónimas y revisión visual escritorio/móvil/teclado de la entrada anterior siguen siendo aplicables: no hubo cambios visuales ni de artefactos. No se repitieron capturas.

Configuración revisada sin alterarla: .env local y .env.example usan http://localhost:3000. src/config/env.ts centraliza VITE_API_URL; Dockerfile lo recibe como argumento de build, sin ejecutar Docker. No existe en estos datos un origen confirmado de publicación. El portal muestra el origen configurado y advierte que el JSON mantiene https://api.mandaria.example como placeholder. Confirmar el origen real y MIME/fallback en el hosting corresponde a publicación, sin bloquear este desarrollo.

Persisten sólo las limitaciones de integración real/hosting y el aviso de tamaño descritos abajo. Las verificaciones backend son reportadas por BACKEND, no ejecutadas ni acreditadas por mocks frontend. Sin backend/nginx/Swagger/.env modificados, activaciones, envíos, commit, push o despliegue.

---

## 2026-10-01 — Webhooks administrativos y portal público

Validación frontend focalizada. Se conserva íntegro el historial inferior. Sin operaciones reales, backend editado, Docker, Coita, cambios de .env/nginx/versión/configuración, commit, push ni despliegue.

### Alcance y archivos

- `src/webhooks/{types,service,queries,format,settings,pages}`: APIs existentes, configuración/sincronización, secreto efímero, resumen/eventos/intententos, salud.
- `src/services/api.ts`: transporte de generación de secreto de un solo intento, sin refresh/repetición de la mutación.
- `src/integrations/pages.tsx`, `src/app/{App,Root}.tsx`: módulo SUPER_ADMIN y separación de rutas públicas respecto de AuthProvider.
- `src/developers/pages.tsx`, `src/index.css`, `public/developers/assets/`, `scripts/sync-public-b2b.mjs`: portal, guías y contrato B2B revisados, descarga y huellas. No se importó OpenAPI general.
- `src/test/{webhooks,webhooks-api,developers}.test.*` y fixture de servicios en `flows.test.tsx`. Dependencias Markdown en package/lock. README actualizado.

### Ejecuciones

- `npx tsc -b --pretty false`: exit 0.
- `npm run typecheck:test`: exit 0 después de declarar tipos Node para lectura de los artefactos en el test del portal.
- `npm run lint`: exit 0, sin advertencias después de corregir la limpieza del ref en el efecto.
- `npx vitest run src/test/webhooks.test.tsx src/test/webhooks-api.test.ts src/test/developers.test.tsx src/test/flows.test.tsx src/test/integration-credentials-api.test.ts`: **5 archivos, 90/90 pruebas**, exit 0. Primera ejecución: 89/90, por referencia de test a un input desmontado tras actualizar la revisión remota; se corrigió el test para consultar el input vigente.
- `npm run build`: exit 0; incluye TypeScript. Vite advierte un chunk Root de 540.15 kB (146.85 kB gzip), pendiente optimizar división de código si se prioriza rendimiento inicial.
- `node scripts/sync-public-b2b.mjs --check`: exit 0, artefactos y manifest coinciden con la entrega backend local.
- Intento adicional de comprobar casos negativos del sincronizador con copias temporales: bloqueado antes de ejecutar hijos por EPERM en spawnSync. Un diagnóstico confirmó status null / EPERM; no se reiteró. **Rechazo de fuente desactualizada/operación adicional no validado dinámicamente**; lista/rechazo revisados en código. No se escribió al backend.

Cobertura focalizada: roles SUPER_ADMIN/PROVIDER_ADMIN/DRIVER, logout y respuestas tardías, acceso anónimo sin restauración; configuración ausente vs 401/403/red, guardado y refetch, edición limpia/sucia y conflicto remoto; confirmación, doble clic, respuesta perdida, limpieza al cerrar/pagehide/desmontaje y ausencia del secreto en caché/almacenamiento; estados, filtros, paginación, cliente de evento y destinos; salud compartida/instancia; descarga y rutas directas de documentación, contrato de 15 operaciones; regresión de credenciales e integraciones.

### Revisión visual real de navegador, datos simulados

Servidor Vite local temporal en 127.0.0.1:5178, origen API de proceso no operativo (sin cambiar .env). Fixture de administración con servicios simulados y fetch de red bloqueado, usuario/URLs sintéticos; ningún secreto real. Artefactos públicos servidos por Vite.

- Escritorio 1366×900: detalle de integración, formulario webhook, confirmación de rotación, referencia pública.
- Móvil 390×844: guía webhook y detalle de evento con intento histórico en tabla adaptada. Sin desbordamiento horizontal medido.
- Teclado: salto a main, Tab desde URL a checkbox, Escape cierra confirmación y navegación a details.
- Descarga efectiva de `openapi-b2b.json` completada desde el enlace. Guía revisada renderizada; referencia muestra las 15 operaciones.
- Consola del portal y del fixture: sin errores ni warnings capturados.
- Capturas locales ignoradas por Git: `test-results/webhooks-preview/{webhooks-desktop,portal-desktop,portal-mobile,event-mobile}.jpg`. Fixture sólo en ese directorio ignorado; no pertenece al producto/build.

### Qué no acredita esta validación

Mocks frontend no prueban RBAC/SSRF/cifrado, comportamiento del worker, transporte, rotación efectiva ni aislamiento backend. No se generaron secretos reales ni se activaron envíos. No se probó recepción comercial, producción ni fallback de nginx. Se consultó el handoff revisado y código local; sus pruebas backend reportadas no se ejecutaron aquí. Pendientes: confirmar equivalencia desplegada, origen API definitivo y E2E autorizado en entorno de pruebas. No falta un endpoint backend para la UI implementada según la referencia local.

---

## 2026-09-29 — Continuación: pruebas de cuentas locales reales

Por instrucción del usuario se conservaron las dos cuentas como datos exclusivamente locales de desarrollo, con instrucciones de uso en el directorio ignorado `test-results/local-accounts/`. Sus contraseñas no forman parte de Git ni de seeds o despliegues.

Validación directa contra la API local: **24 comprobaciones correctas**, exit 0. Login, identidad/rol, refresh e identidad conservada, logout y rechazo del refresh revocado en ambas cuentas; membership del proveedor, listado vacío de servicios, rechazo de provider sin membership; driver/me sin asignación ni capacidad independiente; bloqueo de administración global para ambos roles. Una comprobación inicial esperaba erróneamente 403 al consultar ofertas independientes: el contrato local establece 409 / INDEPENDENT_NOT_APPROVED. Se confirmó en la política existente y se corrigió la expectativa; la ejecución posterior completa pasó. No hubo cambio de producto por este hallazgo ni ejecución de suites ajenas.

Estas pruebas usaron HTTP real, sin mocks, pero **no acreditan instrucciones de cobro reales ni transiciones de un servicio**: el proveedor y el driver siguen PENDING y no hay dispatches. La revisión visual anterior continúa siendo simulada. Sin activaciones, despachos/cobros, cambios de backend/configuración, commit, push o despliegue.

---

## 2026-09-29 — V1.13-D: instrucciones de cobro para ejecutores

Implementación frontend con validación focalizada y datos simulados. **No acredita integración real ni cobros.** Esta entrada conserva debajo el historial anterior; no constituye otro CHECK.

### Contrato y superficies

Referencia de sólo lectura: `mandaria-backend/docs/V1.13-D-EXECUTOR-COLLECTION-INSTRUCTIONS.md` (2026-09-29).

- Proveedor: `/services`, `/services/:id`, diálogo de tomar servicio y diálogos de asignar/reasignar. Se lee el campo raíz de dispatch; SUMMARY sigue sin mostrar detalles.
- Independiente: `/driver/services`, `/driver/services/:id`, diálogo de tomar y `/driver/my-service`.
- Repartidor asignado: `GET /driver/me` → `activeDeliveryAssignment.collectionInstructions`. La superficie existente de bloqueo de la capacidad independiente muestra las instrucciones asignadas sin habilitar dicha capacidad. Una asignación FLEET en una cuenta con ambas capacidades tampoco consulta el endpoint de dispatch independiente ni habilita entregar/liberar como independiente.
- Tipos ampliados: ProviderDispatch, DriverDispatch, DriverSelf.activeDeliveryAssignment y AssignmentWithPayment. El historial GET de asignaciones no incorpora el campo: no se reconstruyen instrucciones para sus filas.
- No existe en Web una acción de `PATCH /driver/availability`; no se agregó una. Su integración queda pendiente si se implementa esa superficie. No se creó una pantalla de ejecución de flotilla.

### Presentación y vigencia

Componente compartido en `src/collection-instructions/`: valida todos los valores soportados antes de indicar un cobro. OFFER sólo informa condiciones; CURRENT indica comida pagada, sin adelanto ni cobro de comida, y únicamente envío al destinatario en efectivo al entregar; HISTORICAL conserva referencia sin instrucción vigente. Importe decimal y moneda se imprimen desde el campo recibido, sin float, sumas ni inferencias desde mercancía/créditos/PREPAID. Datos incompletos o desconocidos muestran un aviso no operativo. Campo ausente conserva el bloque legacy.

Se reutilizan invalidaciones/refetch tras claim/take/release/entrega y asignación/reasignación/cancelación. La invalidación de asignaciones también alcanza la caché driver-portal; durante lecturas de estas superficies se oculta la instrucción almacenada y se muestra actualización. Los errores de autorización siguen los estados de error existentes. No se almacena la respuesta de una mutación como instrucción vigente; se vuelve a consultar la proyección autorizada. Cancelar una asignación no necesariamente termina el claim del proveedor: su detalle refleja la nueva lectura del backend, mientras el repartidor anterior pierde activeDeliveryAssignment.

La detección de cambios externos sigue dependiendo del refetch existente (navegación/foco/actualización); no hay garantía de tiempo real ni nuevos sockets. La entrega física no se presenta como confirmación de cobro.

### Archivos

- `src/collection-instructions/{types.ts,validation.ts,CollectionInstructionsBlock.tsx}`: contrato, validación y presentación comunes.
- `src/dispatch/{types.ts,components.tsx,pages.tsx}`: proveedor.
- `src/driver-portal/{types.ts,pages.tsx}`: independiente y repartidor asignado.
- `src/delivery-assignments/{types.ts,components.tsx,queries.ts}`: asignación y refresco.
- `src/index.css`: legibilidad y adaptación al ancho disponible.
- `src/test/{collection-fixture.ts,collection-instructions.test.tsx,dispatch.test.tsx,driver-portal.test.tsx}`: fixtures y pruebas focalizadas.

### Verificaciones ejecutadas

1. `npx tsc -b --pretty false`: exit 0; repetido tras el ajuste final.
2. `npm run typecheck:test`: exit 0; repetido tras el ajuste final.
3. `npm run lint`: exit 0; repetido tras el ajuste final.
4. `npx vitest run src/test/collection-instructions.test.tsx src/test/dispatch.test.tsx src/test/driver-portal.test.tsx src/test/delivery-assignments.test.tsx src/test/delivery-completion.test.tsx`: **134 pruebas, 5 archivos, exit 0**.
5. Tras añadir dos pruebas de rutas y ajustar validación/presentación: `npx vitest run src/test/collection-instructions.test.tsx src/test/dispatch.test.tsx src/test/driver-portal.test.tsx`: **90 pruebas, 3 archivos, exit 0**. Las dos suites de asignación/entrega no se repitieron. No se suman ejecuciones repetidas como casos nuevos.
6. Revisión visual con Chromium/Playwright sobre componentes reales en un montaje local de simulación: 1280×1000, 768×1024 y 390×844. OFFER, CURRENT, HISTORICAL, legacy, campo incompleto y repartidor de flotilla. Sin desbordamiento horizontal ni errores pageerror. Se inspeccionaron capturas; tras detectar texto pequeño se mejoró la legibilidad y se repitió la captura. Red externa bloqueada y Vite apuntando a un puerto inactivo sólo en el proceso, sin cambiar .env. Artefactos locales ignorados en `test-results/collection-instructions/`.
7. `git diff --check`: exit 0.

Cobertura nueva: estados de aplicabilidad, importe/moneda exactos incluso fuera del rango seguro de float, valores desconocidos/incompletos, ausencia y compatibilidad legacy, listado proveedor/independiente, proyección driver/me, desaparición al finalizar la asignación, y reemplazo de proyección mediante los helpers de refetch para cambios operativos. Los tests de caché simulan respuestas; no prueban una transacción real del backend.

No hubo aborto del runner ni diagnóstico adicional. No se ejecutó la suite completa, build de distribución, Docker ni scripts E2E operativos. No se accedió a Coita ni se realizaron despachos/cobros reales. Sin cambios de backend, .env, versión, configuración operativa, activación, commit, push o despliegue. Pendiente: integración real contra backend con V1.13-D desplegado y cuentas autorizadas, fuera de esta validación simulada.

### Seguimiento local — cuentas autorizadas por el usuario (2026-09-29)

Tras autorizar expresamente la creación/inserción de cuentas, se creó un proveedor sintético separado y dos identidades nuevas: PROVIDER_ADMIN con membership ADMIN y DRIVER con perfil asociado. Proveedor y perfil DRIVER permanecen PENDING; no se activaron capacidades ni se crearon servicios, asignaciones operativas o cobros. Usuarios insertados únicamente en la base local de desarrollo, con Argon2id; proveedor, membership y perfil creados mediante API existente. No se ejecutaron seeds generales ni se cambiaron cuentas previas.

Login real y GET /auth/me correctos para ambos roles; GET /provider/profiles devolvió el proveedor asociado y GET /driver/me confirmó que no hay asignación activa. Se cerraron las sesiones de comprobación. Las contraseñas aleatorias permanecen sólo en un archivo local ignorado por Git, restringido al usuario del sistema; no se incluyen en esta documentación.

Backend en ejecución: GET /health 200 y Swagger activo con collectionInstructions en las cuatro proyecciones esperadas. Esta comprobación acredita autenticación y lectura real de las cuentas, **no la visualización real de instrucciones**, porque las cuentas nuevas no tienen dispatches. Siguen pendientes los datos operativos sintéticos autorizados para esa validación. No se modificaron código/backend, .env ni configuración operativa.

---

# Estado actual — Mandaria Web V1.11-B (MVP Delivery Completion)

Fecha: 2026-09-23. Rama `v1.11-mvp_delivery_completion`. Backend real Mandaria 1.11.0 (`v1.11-mvp-delivery-completion`) con `ROUTING_PROVIDER=local_fake`. Detalle en [docs/V1.11-B.md](docs/V1.11-B.md).

| Comprobación                            | Resultado                                                             |
| --------------------------------------- | --------------------------------------------------------------------- |
| `tsc -b`, lint, `typecheck:test`, build | PASS                                                                  |
| `format:check`                          | PASS                                                                  |
| Vitest                                  | 484/484 en 23 archivos (460/22 antes de V1.11-B; 24 pruebas nuevas)   |
| Proveedor en navegador real             | Detalle → confirmar → `DELIVERED`, asignación `COMPLETED`: PASS       |
| Repartidor independiente en navegador   | Mi servicio → confirmar → queda libre y puede volver a tomar: PASS    |
| Cancelar el diálogo                     | 0 mutaciones, el servicio sigue `CLAIMED`: PASS                       |
| Doble clic                              | Exactamente 1 petición `POST .../deliver` sin body: PASS              |
| Estado terminal                         | Sin liberar, asignar, reasignar, cancelar, entregar ni deshacer: PASS |
| `DISPATCH_DELIVERED`                    | Reclamar y tomar un servicio entregado lo muestran traducido: PASS    |
| Créditos                                | Saldo y ledger idénticos antes y después; sin `SERVICE_REFUND`: PASS  |
| Aislamiento de roles                    | DRIVER, SUPER_ADMIN y PROVIDER_ADMIN cruzados: 401/403 reales: PASS   |
| Responsive                              | 375, 768 y escritorio sin overflow; acción del portal de 48 px: PASS  |

La confirmación de entrega no genera movimientos de créditos: el `SERVICE_AWARD` cobrado al reclamar o tomar el servicio permanece como movimiento histórico.

# Histórico — Mandaria Web V1.10-F (Credits & Monetization Administration)

Fecha: 2026-09-23. Rama `v1.10-credit-monetization`. Backend local real Mandaria 1.10.0 (rama `v1.10-credit-monetization`, OpenAPI 1.10.0) con `ROUTING_PROVIDER=local_fake`. No se modificó backend ni Coita Eats. No se hizo commit ni push. Detalle en [docs/V1.10-F.md](docs/V1.10-F.md).

| Comprobación                       | Resultado                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc -b`, `lint`, `typecheck:test` | PASS                                                                                                                                        |
| `build`, `format:check`            | PASS                                                                                                                                        |
| Vitest                             | 460/460 en 22 archivos (414 de la línea base + 46 nuevas)                                                                                   |
| `npm run test:e2e:credits` (Edge)  | PASS 10/10 fases contra el backend real                                                                                                     |
| Recarga y ajuste reales            | Atómicos, con `Idempotency-Key`: repetición idempotente (200 + `Idempotent-Replayed: true`) y `CREDIT_IDEMPOTENCY_CONFLICT` con otro cuerpo |
| Ledger y políticas                 | Sin rutas de escritura: `PATCH`/`DELETE` de ledger y de políticas y `POST /credits/refund` responden 404                                    |
| Aislamiento por rol                | PROVIDER_ADMIN y DRIVER: 403 reales en rutas administrativas; 0 peticiones `/admin/` desde sus sesiones                                     |
| Créditos ≠ dinero                  | Ninguna superficie de créditos muestra `ni`MXN`; `creditCost: null` se muestra «Sin costo registrado»                                       |
| Responsive 1440/820/390            | Sin desbordamiento horizontal                                                                                                               |

Escenario real: proveedor `98a9056b…` (saldo 0) y repartidor independiente `58ad8d2e…`; política `LOCAL_DELIVERY/PROVIDER v1` → 5 créditos para 4 200 m. Movimientos escritos y compensados: +25/−25 por API y +10/−10 desde la interfaz; el saldo quedó como se encontró. Mutación que permanece: la habilitación independiente de ese repartidor, necesaria para que exista su cuenta de créditos.

Discrepancia documentada (no se modificó el backend): el ledger **no** expone `reversesEntryId` ni `refundReason` aunque V1.10-E los persiste; la web enlaza cargo y devolución sólo por el `referenceId` compartido. Ver [docs/API-CONTRACT.md](docs/API-CONTRACT.md).

# Histórico — Mandaria Web V1.9-C (Service Coverage Administration)

Fecha: 2026-09-21. Rama `v1.9-independent_driver`. Backend local real Mandaria 1.9.0 (`v1.9-independent_drivers`) con `ROUTING_PROVIDER=local_fake`. Detalle en [docs/V1.9-C.md](docs/V1.9-C.md).

| Comprobación                        | Resultado                                                       |
| ----------------------------------- | --------------------------------------------------------------- |
| `tsc -b`, lint, `typecheck:test`    | PASS                                                            |
| `format:check`, build               | PASS                                                            |
| Vitest                              | 414/414 en 20 archivos (386 de la línea base + 28 nuevas)       |
| A–D contra backend real y navegador | Crear, desactivar, 409 → reactivar por PATCH: PASS              |
| Regresión de Dispatch desde la Web  | D1 conserva candidatos, D2 sin el proveedor, D3 con él: PASS    |
| Proveedor en sólo lectura           | Refleja exactamente al SUPER_ADMIN; mutaciones directas 403/404 |
| Aislamiento de roles por API        | PROVIDER_ADMIN, DRIVER e IntegrationClient bloqueados: PASS     |
| Responsive 375/768/escritorio       | Sin desbordamiento; acciones de 44 px en pantallas pequeñas     |

La cobertura afecta a los nuevos Dispatches; los candidatos de los Dispatches existentes no se recalculan, y un proveedor con la cobertura desactivada ya no puede reclamarlos (`PROVIDER_NOT_ELIGIBLE`).

# Histórico — Mandaria Web V1.8-B y CHECK final V1.8

Fecha: 2026-09-19. Rama `v1.8-provider_driver_vehicle_assignment`. Backend local real Mandaria V1.8.0 (rama `QA`, idéntica a `origin/v1.8-provider_driver_vehicle_assignment` en todos los archivos consumidos) ejecutado con `ROUTING_PROVIDER=local_fake`: no se llamó a Google Routes. No se modificó backend ni Coita Eats. Detalle en [docs/V1.8-B.md](docs/V1.8-B.md).

## Calidad ejecutada

| Comprobación                    | Resultado                                              |
| ------------------------------- | ------------------------------------------------------ |
| Web `npm run build`             | PASS                                                   |
| Web `npm run lint`              | PASS                                                   |
| Web `npm run typecheck:test`    | PASS                                                   |
| Web `npm run format:check`      | PASS                                                   |
| Web `npm test`                  | PASS: **345 tests**, 16 archivos (311 antes de V1.8-B) |
| Backend `prisma validate`       | PASS                                                   |
| Backend `npm run build`         | PASS                                                   |
| Backend `npm run lint` (oxlint) | PASS                                                   |
| Backend `npm test`              | PASS: **91/91**, 12 archivos                           |
| Backend `npm run test:e2e`      | **146/150**; 1 fallo ajeno a V1.8 (ver Riesgos)        |

## CHECK final V1.8 — navegador y backend reales

`npm run test:e2e:assignment` (`scripts/verify-assignment.mjs`): **17 comprobaciones, dos corridas consecutivas en verde**, con escenario fresco sembrado entre ellas. El script aborta si el proveedor de rutas no es `local_fake`.

| Escenario                  | Evidencia                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| 1 Flujo principal          | `POST /assignment` → 201 desde la web; backend confirma 1 ACTIVE (Carlos + MOTO-03)          |
| 2 Mercancía prepagada      | Envío y mercancía separados; sin adelanto falso; sin total sumado                            |
| 3 Adelanto en efectivo     | Monto a entregar, aviso de efectivo y «Mandaria no conoce el saldo»; sin wallet              |
| 4 Repartidor ocupado       | `409 DRIVER_BUSY`; desaparece de `available-drivers`                                         |
| 5 Vehículo ocupado         | `409 VEHICLE_BUSY`; desaparece de `available-vehicles`                                       |
| 6 Reasignación             | Anterior a `REASSIGNED` con motivo; nueva `ACTIVE`; historial visible                        |
| 7 Protección de liberación | `409 DISPATCH_HAS_ACTIVE_ASSIGNMENT`; botón deshabilitado; tras cancelar libera y habilita   |
| 8 Aislamiento de proveedor | Otro proveedor sólo `SUMMARY` sin datos operativos; historial vacío; listas con 409          |
| 9 Concurrencia             | Dos reasignaciones simultáneas → **`200, 200`**; exactamente 1 ACTIVE por despacho y recurso |
| 10 Cancelación oficial     | Solicitud cancelada con asignación activa → despacho `CANCELLED`, 0 asignaciones activas     |
| 11 Historial               | Todos los intentos conservados, orden descendente, una sola vigente                          |
| 12 Deadline                | `assignmentDeadline` presente y distinto de `expiresAt`; UX de demora                        |

Además: visibilidad por rol (SUPER_ADMIN sólo audita), regresión de navegación V1.7, responsive a 390 px sin desbordes y auditoría de secretos (nada en `localStorage`, sólo `mandaria.refresh` en `sessionStorage`, ningún token en la URL).

## Regresión en navegador

| Script                        | Cobertura                                              | Resultado             |
| ----------------------------- | ------------------------------------------------------ | --------------------- |
| `npm run test:e2e`            | Auth, refresh, dashboard, integraciones, proveedores   | PASS: 17 fases        |
| `npm run test:e2e:pricing`    | Zonas, tarifas, cotizaciones, PROVIDER_ADMIN bloqueado | PASS: 14 fases        |
| `npm run test:e2e:assignment` | Dispatch, claim, release y asignación V1.8             | PASS: 17 × 2 corridas |

## Bugs encontrados y corregidos

Ninguno en el producto. Los siete fallos de la sesión fueron del propio script de verificación —importes fijos en vez de leídos del backend, re-ejecutabilidad, alcance y orden del reset de asignaciones, aserciones de aislamiento e historial demasiado estrictas— y todos quedaron corregidos.

## Riesgos y pendientes

1. **Backend, prueba inestable ajena a V1.8.** `test/delivery-quotes.e2e-spec.ts` → «20 concurrent quote calls» falla con `Test timed out in 5000ms` (el valor por omisión de vitest, sin `testTimeout` configurado). En tres corridas aisladas pasó una y falló dos, siempre por timeout y nunca por aserción. Es de V1.6 y no se tocó.
2. **Cobertura de servicio sin interfaz.** El proveedor necesita una `ProviderServiceCoverage` ACTIVA para recibir despachos; sin ella se abren con cero candidatos, y los candidatos se congelan al abrirlos. Es funcionalidad V1.7 que Mandaria Web no administra.
3. **Los Drivers nacen `PENDING`** y `available-drivers` sólo lista los `ACTIVE`; hay que activarlos por API antes de poder asignarlos.
4. **`assignmentDeadline`, `assignmentOverdue` y `assignment` no figuran en el `openapi.json`** del backend aunque sí se devuelven. Conviene regenerar el Swagger para que el contrato publicado coincida con el código.
5. No correr `npm test` a la vez que una regresión de Playwright: la competencia por CPU hace expirar temporizadores en jsdom y produce fallos que no son reales.

# Histórico — Mandaria Web V1.8-B (implementación)

Fecha: 2026-09-18. Rama `v1.8-provider_driver_vehicle_assignment`. Contrato verificado contra el backend V1.8.0: la rama `QA` del checkout local y `origin/v1.8-provider_driver_vehicle_assignment` son idénticas en todos los archivos consumidos y ambas publican OpenAPI 1.8.0. No se modificó backend ni Coita Eats. No se hizo commit ni push. Detalle en [docs/V1.8-B.md](docs/V1.8-B.md).

| Verificación             | Baseline antes de V1.8-B | Resultado final                  |
| ------------------------ | ------------------------ | -------------------------------- |
| `npm run build`          | PASS                     | PASS                             |
| `npm run lint`           | PASS                     | PASS                             |
| `npm run typecheck:test` | PASS                     | PASS                             |
| `npm run format:check`   | PASS                     | PASS                             |
| `npm test`               | PASS: 311 tests, 14      | PASS: **345 tests, 16 archivos** |

34 pruebas nuevas: 22 de UI (`delivery-assignments.test.tsx`) y 12 de contrato (`delivery-assignments-api.test.ts`). La única expectativa previa que cambió es la de V1.7 que afirmaba «la asignación de repartidor y vehículo llegará en una próxima etapa»: V1.8 la sustituyó por el panel real y el test ahora verifica el estado pendiente de asignación.

**Validación en navegador pendiente.** Requiere el backend V1.8 en ejecución con datos locales sembrados; no estaba levantado al cerrar esta entrega. Queda por confirmar en vivo un único punto deducido del código y no del Swagger: que `GET /provider/dispatches/:id` incluye `assignment`, `assignmentDeadline` y `assignmentOverdue`.

# Histórico — Mandaria Web V1.7-B

Fecha: 2026-09-16. Rama `v1.7-dispatch_engine`. Backend local real Mandaria V1.7.0 (OpenAPI 1.7.0) iniciado con `ROUTING_PROVIDER=local_fake`, `DISPATCH_TTL_MINUTES=3` y `MAIL_PROVIDER=local_outbox` por variables de proceso (`.env` intacto: no se llamó a Google Routes ni se enviaron correos). No se modificó backend ni Coita Eats. No se hizo commit ni push. Detalle en [docs/V1.7-B.md](docs/V1.7-B.md).

| Verificación                                    | Resultado                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `npm run build`                                 | PASS                                                                            |
| `npm run lint`                                  | PASS                                                                            |
| `npm run typecheck:test`                        | PASS                                                                            |
| `npm test`                                      | PASS: **311 tests**, 14 archivos (266 previos + 45 nuevos)                      |
| `npm run format:check`                          | PASS                                                                            |
| `npm run test:e2e:dispatch` (Edge)              | PASS: **10/10 fases** con Dispatches reales (Quote aceptada por la integración) |
| `test:e2e` · `provider-admin` · `logistics`     | PASS 17/17 · 14/14 · 9/9                                                        |
| `delivery-requests` · `pricing` · `invitations` | PASS 11/11 · 14/14 · 11/11                                                      |

Escenario real: MDR-000096 (COURIER_ADVANCE) y MDR-000097 (PREPAID) con Quote ACCEPTED → Dispatch OPEN y candidatos Rápidos de Coita (A) y Mandados del Centro (B). A tomó MDR-000096, B recibió "Este servicio ya fue tomado por otro proveedor." (409 real), A liberó con motivo y ya no puede retomarlo (409 `DISPATCH_RECLAIM_NOT_ALLOWED`), B lo tomó. MDR-000097 expiró en tiempo real: botón deshabilitado y 409 `DISPATCH_EXPIRED`. A no puede cambiar a B por query string (403) ni enviar `providerId` en el body del claim (400). SUPER_ADMIN audita sin acciones; un DRIVER creado por invitación real no tiene acceso (403).

Expectativas previas modificadas (cambio intencional del menú): listas exactas en `flows.test.tsx`, `verify-provider-admin.mjs` y `verify-logistics.mjs` incluyen `Servicios` (PROVIDER_ADMIN) y `Despachos` (SUPER_ADMIN, después de Zonas de servicio para conservar el orden validado de V1.6). Scripts de regresión: logout apuntado al disparador del menú de usuario, porque las invitaciones pendientes también tienen botones con correos en su nombre.

Datos locales creados: coberturas LOCAL_DELIVERY de A y B en `LOCAL_OCOZOCOAUTLA`, credenciales temporales de integración (revocadas), MDR-000095…098 con sus Quotes y Dispatches, MDR-000099…102 para la suite V1.5 y un DRIVER `web17-driver-*` en B. Auditoría de 111 artefactos contra 17 secretos (contraseñas del `.env` y tokens de activación): 0 coincidencias.

# Histórico — Verificación final E2E — Mandaria V1.6.1

Fecha: 2026-09-16. Web + Backend reales locales; backend con `MAIL_PROVIDER=local_outbox` y `USER_INVITATION_TTL_HOURS=1` por variables de proceso (`.env` intacto). Sin cambios manuales en BD, sin seeds nuevos y sin scripts manuales en el flujo persona → invitación → activación → contraseña → login → rol → relación Provider/Driver.

| Escenario                                                                                                     | Resultado |
| ------------------------------------------------------------------------------------------------------------- | --------- |
| 1 · SUPER_ADMIN invita PROVIDER_ADMIN a Provider A → activación → login → Mi proveedor A → B bloqueado        | PASS      |
| 2 · PROVIDER_ADMIN A invita DRIVER → activación → login real DRIVER → `/driver/me` en Provider A              | PASS      |
| 3 · A→B, PA→PROVIDER_ADMIN, PA→SUPER_ADMIN, Driver→invite, IntegrationClient→invite: bloqueados, sin User     | PASS      |
| 4 · PENDING, RESEND, token viejo inválido, nuevo válido, ACCEPTED, reuso inválido, REVOKE                     | PASS      |
| 4 · EXPIRED en tiempo real (TTL 1 h): 410, mensaje Web, "Expirada", reenvío la reabre                         | PASS      |
| 5 · Email ACTIVE, INVITED y variantes de mayúsculas/espacios: 409 correctos, User reutilizado, sin duplicados | PASS      |
| 6 · `test:e2e` 17/17 · `provider-admin` 14/14 · `logistics` 9/9 · `delivery-requests` 11/11 · `pricing` 14/14 | PASS      |

Backend: `prisma validate`, build, lint, 69 tests unitarios, 124 e2e y `docs:check` en PASS. Frontend: TypeScript, build, lint, 266 tests y formato en PASS. Auditoría de 99 artefactos generados contra 31 valores secretos (contraseñas del `.env`, tokens de activación): 0 coincidencias.

Bug real corregido: el detalle de cotización mostraba el código crudo `DELIVERY_REQUEST_CANCELLED` como motivo (V1.6; el test unitario lo esperaba así). Ahora se traduce y cualquier código desconocido usa un texto genérico. Scripts de regresión ajustados (no la app): `verify-logistics` limita las tablas a la de repartidores y reutiliza el proveedor INDEPENDENT que ya tiene a Luis; `verify-pricing` espera a que el menú se renderice antes de leerlo.

Mutaciones locales: cuentas `final161-*`, integración `FINAL161_*` con credencial revocada, Provider A `maxDrivers` 3 → 5 desde la Web (necesario para invitar un repartidor) y los datos habituales de las suites de regresión.

# Estado previo — Mandaria Web V1.6.1-B

Fecha: 2026-09-16. Rama `v1.6.1-creation_user`. Backend local real Mandaria V1.6.1 (OpenAPI 1.6.1) iniciado con `MAIL_PROVIDER=local_outbox` por variable de proceso (su `.env` no se modificó; no se enviaron correos reales). No se modificó backend ni Coita Eats. No se hizo commit ni push. Detalle en [docs/V1.6.1-B.md](docs/V1.6.1-B.md).

| Verificación                             | Resultado                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm run build`                          | PASS                                                                                  |
| `npm run lint`                           | PASS                                                                                  |
| `npm run typecheck:test`                 | PASS                                                                                  |
| `npm test`                               | PASS: **266 tests**, 12 archivos (208 previos + 58 nuevos)                            |
| `npm run format:check`                   | PASS                                                                                  |
| `npm run test:e2e:invitations` (Edge)    | PASS: **11/11 fases** sobre el código final                                           |
| `npm run test:e2e:provider-admin` (Edge) | PASS: **14/14** (A → A, B bloqueado, sin membership, refresh/expiración, SUPER_ADMIN) |

Expectativas previas modificadas: la lista exacta del menú SUPER_ADMIN en `flows.test.tsx` incluye `Invitaciones`; `flows.test.tsx` y `logistics.test.tsx` simulan el servicio de invitaciones para no llamar a la red.

Regresión PROVIDER_ADMIN: la primera corrida falló en su fase SUPER_ADMIN por un bug preexistente (aviso `beforeunload` sin ediciones en el login), corregido en esta versión. Dos corridas encadenadas inmediatamente después de la suite de invitaciones fallaron en fases distintas por `429` reales de `/auth/refresh` (confirmados en el log del backend); tras esperar la ventana de rate limit, la corrida aislada pasó 14/14.

Datos locales creados: cuentas `web161-pa-*`, `web161-driver-*` y `web161-revoked-*` en `LOCAL_MANDADOS_CENTRO` (una corrida completa y dos parciales mientras se ajustaba el script: cada una dejó un PROVIDER_ADMIN activado y una invitación DRIVER revocada; la completa además un DRIVER activado). No se cambiaron límites de proveedores. `LOCAL_RAPIDOS_COITA` estaba en capacidad (3/3) y se usó para verificar el 409 real `PROVIDER_DRIVER_LIMIT_REACHED` y el botón deshabilitado.

# Histórico — Mandaria Web V1.6-B

Fecha: 2026-09-15. Rama `v1.6-routing_service_plane`. Backend local real Mandaria V1.6.0 (OpenAPI 1.6.0). No se modificó backend ni Coita Eats. No se hizo commit ni push.

| Verificación                        | Resultado                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `npm run build`                     | PASS                                                                          |
| `npm run lint`                      | PASS                                                                          |
| `npm run typecheck:test`            | PASS                                                                          |
| `npm test`                          | PASS: **208 tests**, 10 archivos; 139 de V1.3–V1.5 sin cambios de expectativa |
| `npm run format:check`              | FAIL preexistente en todo el repo: copia Windows con CRLF, Prettier espera LF |
| `npm run test:e2e:pricing` (Edge)   | PASS: **14/14 fases** en dos corridas consecutivas sobre el código final      |
| `npm run test:e2e` (regresión V1.3) | PASS: 17/17 en dos corridas; la tercera seguida se detuvo en un 429 real      |

La única expectativa de test previa que cambió es la lista exacta del menú de SUPER_ADMIN en `flows.test.tsx`, que ahora incluye `Cotizaciones` y `Zonas de servicio`.

Escenario real de la validación de navegador: zona `LOCAL_OCOZOCOAUTLA` con tarifa LOCAL_DELIVERY de 5 bandas. Cada corrida clona la versión activa, edita bandas en kilómetros, provoca y traduce un hueco, restaura las bandas originales y activa la versión nueva, de modo que la tarifa efectiva no cambia (v1 → v2 → v3 con las mismas bandas). El backend local no tenía DeliveryRequests ni Quotes, así que esas dos fases se ejecutaron contra sus estados vacíos y el resto de cotizaciones está cubierto por los 27 tests de `quotes*.test.*`. El script no crea Quotes: hacerlo llamaría al proveedor de rutas configurado, un servicio externo de pago.

La tercera corrida consecutiva de `npm run test:e2e` se detuvo en el filtro de proveedores con el 429 real del backend (`Demasiados intentos. Espera un minuto antes de continuar.`), visible en `test-results/manual/failure-masked.png`. No es una regresión: confirma el manejo de 429 de la UI.

# Histórico — Mandaria Web V1.5-B

Fecha: 2026-09-15. Rama `v1.5-delivery_request`. Backend local real Mandaria V1.5.0 (OpenAPI 1.5.0). No se modificó backend ni Coita Eats. No se hizo commit ni push.

| Verificación                                | Resultado                                                            |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `npm run build`                             | PASS                                                                 |
| `npm run lint`                              | PASS                                                                 |
| `npm run typecheck:test`                    | PASS                                                                 |
| `npm test`                                  | PASS: **139 tests**, 6 archivos; incluye V1.3/V1.4                   |
| `prettier --check --end-of-line auto .`     | PASS (working copy Windows con CRLF; CI Linux usa LF)                |
| `npm run test:e2e:delivery-requests` (Edge) | PASS: 11/11 fases en dos corridas consecutivas sobre el código final |

Escenarios reales creados por la API B2B V1.5 (integración local `WEB_V15_VALIDATION`, credencial temporal revocada): por corrida una solicitud FOOD/PREPAID/CREATED, una FOOD+GROCERIES/COURIER_ADVANCE/CREATED, una PARCEL/CANCELLED por la integración y una DOCUMENT cancelada desde la UI. Corridas finales: MDR-000029…032 y MDR-000033…036; corridas previas fallidas por la validación dejaron MDR-000005…028 como historial local. Bugs corregidos: sincronización de filtros con la transición de URL y selects truncados en móvil (ver [docs/V1.5-B.md](docs/V1.5-B.md)).

# Histórico — Mandaria Web V1.4-B

Fecha: 2026-09-15. Proyecto existente `mandaria-web`, backend local real OpenAPI 1.4.0. Implementación y validación V1.4-B completadas dentro de su alcance. No se modificaron backend ni Coita Eats y no se implementaron funcionalidades V1.5. No se hizo commit ni push. Rama observada al finalizar: `1.4-vehiculo_condcutor_asignacion`.

## Calidad ejecutada

| Verificación                                          | Resultado                                              |
| ----------------------------------------------------- | ------------------------------------------------------ |
| `npm run build`                                       | PASS: TypeScript estricto y build Vite                 |
| `npm run lint`                                        | PASS                                                   |
| `npm run typecheck:test`                              | PASS                                                   |
| `npm test`                                            | PASS: **97 tests**, 4 archivos; incluye regresión V1.3 |
| `npm run format:check`                                | PASS                                                   |
| `node --check scripts/verify-logistics.mjs`           | PASS                                                   |
| `git diff --check`                                    | PASS                                                   |
| Revisión de secretos contra valores del entorno local | 50 archivos revisados, 0 coincidencias                 |
| CI / Docker                                           | Pendientes; no ejecutados en esta tarea                |

## Matriz real de navegador

Ejecutado `scripts/verify-logistics.mjs` en Chromium contra `http://localhost:5173` y Mandaria Backend `http://localhost:3000`. **9 grupos PASS, 0 fallos**. El login usa email/password reales; no se manipularon roles, localStorage ni respuestas.

| Flujo                                | Resultado y evidencia                                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SUPER_ADMIN                          | Login, Dashboard, Integrations, Providers y navegación PASS                                                                                                                |
| PROVIDER_ADMIN A                     | Login, dashboard propio, filtros de repartidor/vehículo, detalle, uso 3/3 y URL de alta bloqueada al límite PASS                                                           |
| Refresh / sesión                     | Recarga rota refresh real; revocar el refresh de la sesión de prueba provoca 401, limpieza y login; nuevo login/logout PASS                                                |
| Drivers y Vehicles por proveedor     | Datos reales de A y B, con comprobación de providerId de todos los registros recibidos PASS                                                                                |
| A→B / B→A                            | URL de proveedor ajeno 403 sin tabla; GET/POST del backend ajeno 403; ID ajeno bajo proveedor propio 404 seguro PASS                                                       |
| Integrations / administración global | Menús ausentes y URLs bloqueadas; endpoints administrativos rechazan al rol PROVIDER_ADMIN PASS                                                                            |
| Sin membership                       | Estado vacío en módulos y parámetros manipulados; APIs 403 sin seleccionar un proveedor arbitrario PASS                                                                    |
| Assign / unassign / reassign         | Operaciones desde UI con persistencia real e historial cerrado/actual PASS                                                                                                 |
| Asignaciones inválidas               | Inactivo, mantenimiento, suspendido, driver suspendido, ocupado, ya asignado y cross-provider rechazados PASS                                                              |
| Conflicto concurrente visible        | Vehicle pasa a MAINTENANCE después de abrir selector; POST devuelve 409 y el diálogo muestra mensaje español seguro PASS                                                   |
| INDEPENDENT                          | Alta real de Luis (User DRIVER ya existente), BICI-V14B sin placa, activación, detalle y asignación PASS                                                                   |
| Responsive                           | Listas drivers/vehicles en 1440×1000, 820×1180 y 390×844; sin desbordamiento de página, tabla desplazable y drawer móvil PASS                                              |
| Consola / URLs / almacenamiento      | Sin excepciones ni errores inesperados; localStorage e IndexedDB vacíos, sessionStorage sólo refresh durante sesión y vacío tras logout; sin secretos en URLs/consola PASS |

Se observaron **10 mensajes HTTP nativos esperados** de Chromium al provocar 401/403/404/409. No son excepciones de la aplicación. En esta tarea la expiración se probó mediante revocación real del refresh; no se volvió a esperar el vencimiento temporal del access token de 900 segundos. La prueba temporal completa sigue documentada en el checkpoint V1.3 y su script; los tests automatizados de 401/refresh continúan pasando.

Artefactos locales ignorados por Git: `test-results/logistics/report.json` y seis capturas de escritorio/tablet/móvil. El script conserva sólo reporte y capturas; nunca HAR, traces, tokens ni storageState. Las capturas de fallos de intentos intermedios no sustituyen el reporte final exitoso.

## Datos locales y bugs corregidos

- Quedaron **Carlos→MOTO-01, Pedro→MOTO-02 y José→BICI-01**, todos activos, con el historial real de la prueba conservado.
- Se crearon **Luis** y **BICI-V14B** en el proveedor INDEPENDENT de validación existente; quedaron asignados. No se crearon usuarios ni se cambiaron memberships. No hay DELETE logístico para retirar fixtures.
- Se corrigió el nombre accesible de los campos: `Field` separa etiqueta y ayuda para que Chromium no incluya las opciones del select en su nombre.
- Se corrigió la invalidación de caché al editar límites/estado de Provider: las nuevas tarjetas de capacidad se actualizan. Incluye prueba de regresión.
- El origen `127.0.0.1:5173` no estaba habilitado por CORS; la prueba utiliza `localhost:5173`, permitido por backend. No fue necesario cambiar archivos/configuración del backend.
- Un intento demasiado rápido alcanzó el límite real de refresh y mostró correctamente 429. El script ahora espacia recargas sin desactivar la protección.
- Se detectó que Mario ya tenía perfil en B. El backend rechazó duplicarlo y la UI informó correctamente el conflicto; el alta se validó con Luis, que no tenía perfil.

Arquitectura, endpoints, DTOs, decisiones, limitaciones y reproducción en [V1.4-B.md](docs/V1.4-B.md). No se inventaron listados globales ni agregados globales; tampoco selección administrativa de Users para PROVIDER_ADMIN o filtros de vehículos libres que el backend no expone. CI sigue pendiente localmente y fuera de Git por instrucción previa.

---

# Histórico: checkpoint PROVIDER_ADMIN de Mandaria Web V1.3

La validación real pendiente de **PROVIDER_ADMIN** se completó el 2026-09-15: cuentas A/B/sin membership, aislamiento UI y backend, expiración real, refresh, logout y regresión SUPER_ADMIN. Build, lint, tipos y 44 tests pasaron. No fueron necesarias correcciones al runtime de la aplicación.

Ver [reporte reproducible de PROVIDER_ADMIN](docs/PROVIDER-ADMIN-VALIDATION.md). El bloqueo Docker de la entrega original continúa fuera del alcance de esta validación; CI sigue pendiente localmente.

---

# Histórico: verificación de la implementación inicial V1.3

Fecha: 2026-09-15. Entorno: Windows, Node.js 24, Mandaria Backend V1.2 local y PostgreSQL existente. Repositorio de trabajo: `mandaria-frontend`; paquete independiente `mandaria-web`, rama QA.

## Estado de entrega

**No se declara V1.3 terminada.** La implementación está disponible, pero permanecen pendientes el Docker build y la validación real de PROVIDER_ADMIN/memberships. No se modificaron backend, Coita Eats, bases de datos ni cuentas directamente. Se ejecutaron operaciones de prueba autorizadas exclusivamente mediante la API de Mandaria.

## Verificaciones ejecutadas

| Verificación                                                                      | Resultado                                                                          |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| React/Vite/TypeScript strict, build producción                                    | PASS                                                                               |
| ESLint                                                                            | PASS                                                                               |
| Tipado de tests                                                                   | PASS                                                                               |
| Vitest + Testing Library                                                          | 35 PASS, 2 archivos                                                                |
| Login SUPER_ADMIN real                                                            | PASS                                                                               |
| Restauración al recargar y refresh rotatorio real                                 | PASS                                                                               |
| Logout real y acceso protegido posterior                                          | PASS                                                                               |
| Login incorrecto, expiración, refresh concurrente, 401/403                        | PASS en tests automatizados                                                        |
| Rutas y navegación por SUPER_ADMIN/PROVIDER_ADMIN                                 | PASS en tests automatizados                                                        |
| Dashboard con totales y datos reales                                              | PASS                                                                               |
| Integraciones: listado, crear, activar y suspender                                | PASS en navegador real                                                             |
| Coita Eats                                                                        | No aparece en el listado recibido; no se creó ni hardcodeó                         |
| Credenciales: crear, advertencia única, copiar, cerrar, rotar, revocar            | PASS en navegador real                                                             |
| Secreto no recuperable después de cerrar/recargar                                 | PASS                                                                               |
| Secreto ausente en localStorage/sessionStorage/IndexedDB y consola                | PASS en navegador real; caché QueryClient también probado en tests                 |
| Providers: crear FLEET/INDEPENDENT, defaults, detalle, límites, activar/suspender | PASS en navegador real                                                             |
| Búsqueda y filtros de tipo/estado                                                 | PASS en navegador real                                                             |
| Memberships: asociar y retirar sin borrar User                                    | PASS con servicios simulados; pendiente en backend real                            |
| PROVIDER_ADMIN real, perfil propio, 403 manual                                    | PENDIENTE: no hay cuenta local con ese rol; requiere aprovisionamiento del backend |
| Empty/error/network/403/404                                                       | Implementados; cubiertos por pruebas según el flujo                                |
| Responsive 1024, 768, 390 px                                                      | PASS en navegador; sin overflow horizontal de página; tablas desplazables          |
| Consola del navegador                                                             | Sin errores en la ejecución completa                                               |
| Docker build                                                                      | BLOQUEADO por motor Docker Desktop                                                 |
| GitHub Actions                                                                    | Configurado, no ejecutado remotamente                                              |

Prueba reproducible: `npm run test:e2e`, con cuentas locales configuradas como explica README. Reporte detallado y capturas en `test-results/manual/` (ignorados por Git). No se guardan tokens, secretos, HAR ni estados de autenticación.

## Bloqueos reales

### Docker

Se intentó `docker build --build-arg VITE_API_URL=http://localhost:3000 -t mandaria-web:v1.3 .`. Falló antes de construir: no existe el pipe `dockerDesktopLinuxEngine`. Se intentó iniciar Docker Desktop, también mediante `docker desktop start --timeout 45`, sin éxito. El log local muestra un fallo al inicializar Inference Manager y acceder al socket `dockerInference`. No se reseteó Docker ni se alteró su configuración/datos. Repetir el build con un motor funcional; Dockerfile y Nginx no se consideran validados por ejecución.

### Cuenta PROVIDER_ADMIN

`GET /users` devolvió cero cuentas PROVIDER_ADMIN. No existe endpoint de creación de User. Se solicitó preparar una cuenta mediante el backend y registrar sus credenciales sólo en `.env.e2e` ignorado. No se inventó un endpoint, no se cambió el rol de una cuenta existente y no se accedió a la base directamente. Tests verifican el aislamiento de rutas, perfil y asociaciones con dobles de servicio, pero eso no sustituye el login real exigido en el DoD.

## Registros de prueba y seguridad

Se crearon integraciones con nombre `Validación Web ...` y códigos `WEB_...`, y proveedores `WEB_FLEET_...` / `WEB_INDEPENDENT_...`. Permanecen en el backend porque no hay endpoint para eliminarlos. Las credenciales generadas en la ejecución completa fueron revocadas; también se revocaron expresamente las dos credenciales dejadas por ejecuciones interrumpidas. No se conservaron sus secretos.

Se corrigieron durante validación: selector de tipo mal formado, tipado de render de errores, restauración inicial con React, mock async de logout, etiqueta accesible del secreto y selector de prueba de búsqueda. Las pruebas fallidas no se cuentan como validaciones exitosas; se repitió la ejecución completa hasta pasar los flujos disponibles.

## Pendientes para cerrar V1.3

1. Aprovisionar una cuenta PROVIDER_ADMIN local y ejecutar el tramo real de asociación, login, perfil propio y rechazo de `/integrations`.
2. Ejecutar Docker build y comprobar SPA fallback/headers del contenedor con motor disponible.
3. Revisión humana de operación y aprobación del despliegue. Las pruebas de navegador realizadas fueron automatizadas, no una sesión manual del propietario.

V1.4 no se implementa aquí. Sus módulos de repartidores y vehículos podrán agregarse cuando existan contratos de API confirmados.

## Revisión final adicional

- Prettier format:check y git diff --check: PASS.
- Auditoría npm de dependencias de producción: 0 vulnerabilidades.
- Comparación de archivos publicables y assets compilados contra los secretos reales del backend: ninguna coincidencia, sin imprimir valores.
- Capturas responsive regeneradas después de completar las transiciones del drawer; cierre con Escape verificado.
- Prueba adicional de respuesta HTTP tardía tras logout: evita afectar sesiones posteriores.
## 2026-10-06 — Google Maps V1.18 (SDK simulado)

Implementación y configuración: [V1.18-WEB](docs/V1.18-WEB.md#google-maps--2026-10-06), [decisión cartográfica](docs/V1.18-MAP-PROPOSAL.md). Conserva implementación previa. 64/64 pruebas focalizadas (google-map, google-loader, location, api); typecheck:test, lint y build PASS. Advertencia de tamaño Root680.94kB, sin error. Primer tsc encontró EPERM al escribir caché compartida; reejecución autorizada aprobada. Una ejecución posterior de lint detectó el TSX temporal del arnés visual; el arnés ahora elimina sus fuentes temporales al cerrar y lint volvió a pasar.

Arnés navegador scripts/verify-google-map.mjs PASS con Google interceptado por SDK sintético: móvil/escritorio, retirada mediante teclado, una carga, sin cabeceras de sesión y referencia sólo origen. Capturas en test-results/google-map. No clave real leída ni servicios Google invocados. Esto no acredita SDK/teselas/CSP reales. Pendiente comprobación con clave restringida del propietario y hosting equivalente; no cambia resultados PostgreSQL anteriores. nginx revisado estáticamente, Docker no ejecutado. Sin backend, activación, commit, push ni despliegue.

## 2026-10-13 — W-01: selección posterior durante carga documental

Worktree `driver-verification-web/mandaria-frontend`, rama `feature/driver-verification`, HEAD `06d976619322d9811b5325fc73cd16d15e00d829`. Se conservaron los cambios previos sin cambiar de rama. No hay AGENTS.md aplicable encontrado en este worktree. Referencia backend de sólo lectura: `driver-verification/mandaria-backend/docs/DRIVER-VERIFICATION-INTEGRATION.md`, W-01; no se editó ese informe.

### Causa comprobada y corrección

`Form` esperaba el submit completo (crear ticket, PUT, completar y refetch), y después vaciaba indiscriminadamente los inputs file actuales. La operación capturaba A en FormData, pero su limpieza borraba B seleccionada durante la espera. La regresión previa al cambio de producto falló exactamente con `input.files[0] === undefined` en rostro, licencia y unidad. Son archivos distintos con mismo nombre, tamaño y lastModified: la corrección no depende de esos metadatos.

`src/verification/common.tsx` captura por input la generación de selección al iniciar; sólo limpia si no llegó otro evento de selección. Mantiene lock, captura de FormData y envío explícito. Muestra el nombre de la carga en curso/confirmada/fallida separado de la selección pendiente. Protege callbacks tras desmontaje. Contraseñas conservan la limpieza previa. `src/verification/evidence.tsx` separa el ciclo de vida por actor/expediente mediante key; una respuesta del anterior no toca la selección, preview ni ocupación del nuevo. La interrupción no anuncia carga confirmada. No se cambió contrato, permisos, formatos, recuperación ni almacenamiento persistente. La previsualización existente corresponde al adjunto leído por API, no a una nueva selección local; no se añadió preview local de B.

### Verificaciones nuevas (no integración real)

- Antes del cambio: `npx vitest run src/test/verification-upload.test.tsx --reporter=dot`: **4 FAIL / 1 PASS**, sin aborto. Tres pérdidas reproducidas de B y error de A sin identificación; éxito sin nueva selección aprobado. Antes de esta reproducción se corrigió el arnés: userEvent/FileList no activaba validación nativa de submit en jsdom; ahora dispara submit y captura el File real del input en FormData. Esos ensayos iniciales no acreditan el defecto.
- Después: `npx vitest run src/test/verification-upload.test.tsx src/test/verification-pages.test.tsx --reporter=dot`: **35/35 PASS**, dos archivos completos (8 nuevos +27 existentes). Promesas controladas, sin sleeps: identidad/licencia/unidad, A/B idénticos en metadata pero diferentes objetos, recurso/categoría capturados, PUT/confirmación únicos, doble submit bloqueado, B enviado sólo explícitamente, error A conserva B, éxito sin B limpia, cambio de expediente con operación nueva pendiente, preview atrasada y revocación al desmontar, cancelación sin falso éxito. Consumidores compartidos registro/términos/formularios existentes cubiertos por el archivo pages completo.
- `npm run typecheck:test`: PASS. Se completaron bytes/mime/hash de un fixture que inicialmente provocó un error de tipos; no se alteró el contrato para aprobarlo.
- `npx eslint src/verification/common.tsx src/verification/evidence.tsx src/test/verification-upload.test.tsx scripts/verify-documentary-upload.mjs`: PASS.
- `npm run build`: PASS (`tsc -b && vite build`), 2307 módulos; permanece advertencia histórica de chunk Root >500kB, sin cambiar configuración.
- `node scripts/verify-documentary-upload.mjs`: PASS, cinco comprobaciones focalizadas de Chromium con HTTP **interceptado deliberadamente**, PNG sintéticos y confirmación A retenida por promesa. Se contrastaron bytes de ambos PUT, sólo dos CREATE_UPLOAD y dos COMPLETE_UPLOAD. Cero pageerror/errores de consola. Vite usa envDir:false y loopback4199; no lee claves/.env. Navegador y servidor propios detenidos en finally.
- Revisión efectiva de capturas escritorio1280 y viewport móvil390, nombre B, mensaje A, preview A, controles. Teclado Enter para cerrar preview y enviar B. No acredita móvil físico ni auditoría accesible exhaustiva.

Evidencia local ignorada: `test-results/documentary-upload/{A-pending-B-selected,A-confirmed-B-pending-desktop,A-confirmed-B-pending-mobile,B-confirmed-mobile}.png` y `report.json`. El script reproducible nuevo es `scripts/verify-documentary-upload.mjs`. No se arrancaron backend/PostgreSQL ni servicios externos: **no se acredita integración real ni almacenamiento/normalización real**. Tampoco se repitieron las suites generales ni pendientes de toma independiente, cambio de términos o cierre ABSENT. No hubo aborto nativo del runner.

### Handoff para repetir integración real W-01

En el entorno aislado ya identificado por backend, abrir borrador propio y elegir PNG/JPEG sintético A; retrasar de forma controlada la respuesta de confirmación/refetch, iniciar carga y seleccionar B mientras A sigue ocupada. Liberar la respuesta: A debe figurar confirmada en su expediente, B seguir visible y ningún PUT de B haberse ejecutado. Abrir preview de A, cerrarla y enviar B explícitamente: verificar bytes/objeto B y una sola confirmación por archivo. Repetir con mismo nombre/tamaño/fecha, fallo de PUT de A y cambio de expediente. No usar documentos reales ni borrar marcadores para eludir incertidumbre. W-01 corregido y acreditado en Web con mocks; **repetición integrada pendiente del responsable backend**.

Archivos de esta corrección: `src/verification/common.tsx`, `src/verification/evidence.tsx`, `src/test/verification-upload.test.tsx`, `scripts/verify-documentary-upload.mjs`, BITACORA.md, VERIFICATION.md y docs/DRIVER-VERIFICATION-WEB.md. Sin backend/App/Landing, QA, .env/configuración/versiones, commit, push o despliegue.

## 2026-10-16 — Baja documental Web

### Base y alcance

Web `feature/driver-verification`, HEAD/base
`56c7bad0524cbbf05b45fa687a8ec625694a6ca0`, inicialmente limpio, contiene W-01.
Se trabajó en el checkout principal sin cambiar de rama/worktree. Backend sólo
lectura en `b300c250df9fcc4aea8bcd76a1d6ed7c93e04e9a` más cambios sin commit.
Las 12 huellas de `docs/deletion-backend-contract.json` se comprobaron de nuevo:
0 diferencias. No se importó QA ni se iniciaron backend, PostgreSQL o Spaces.

Implementación, matriz previa de endpoints/permisos, rutas y bloqueo de sesión
restringida: [DOCUMENT-DELETION-WEB](docs/DOCUMENT-DELETION-WEB.md). Alcance
validado con fixtures fieles al snapshot/DTO, no integración HTTP/BD real.

### Comandos y resultados exactos

- Primera ejecución `npx vitest run src/test/deletion-service.test.ts src/test/deletion-pages.test.tsx`:
  1 archivo pasó (10 tests); 1 suite no se cargó por ENOENT de caché temporal del
  runner dentro del sandbox. **No se acredita como ejecución completa.** Se hizo
  un solo diagnóstico adicional fuera del sandbox con los 7 archivos completos:
  145/145 PASS, 7/7 archivos, 14.44 s; no aborto. Antes de esa ejecución se corrigió
  un fixture con rol inexistente detectado por typecheck; el contrato no se amplió.
- Después de añadir cobertura de regresión y endurecer replay/cancelación de
  lecturas/proyección, comando final completo:

  ```powershell
  npx vitest run src/test/deletion-service.test.ts src/test/deletion-pages.test.tsx src/test/verification-upload.test.tsx src/test/verification-pages.test.tsx src/test/verification-service.test.ts src/test/flows.test.tsx src/test/api.test.ts
  ```

  **154/154 PASS, 7/7 archivos completos, 15.68 s**, sin abortos, sin filtros de
  casos y sin sumar resultados anteriores al total. W-01 y consumidores existentes
  de App/Login/API/avisos quedan incluidos. No se ejecutó toda la suite del proyecto.
- `npm run lint`: **PASS**, repositorio completo.
- `npm run typecheck:test`: **PASS**.
- `npm run build`: **PASS**, `tsc -b && vite build`, 2314 módulos. Persiste aviso
  Vite de chunk Root >500 kB (685.64 kB sin comprimir); no se cambió configuración
  para ocultarlo. Compilar no declara el workflow listo para producción.
- `node scripts/verify-deletion-web.mjs`: **PASS**, 10 comprobaciones, 0 pageerrors
  y 0 peticiones inesperadas. Última repetición tras cambios de producto también
  pasó. Todas las llamadas API son interceptadas; no acreditan permisos reales
  del servidor, correo real, almacenamiento ni borrado.

### Cobertura focalizada

Relaciones reales de elegibilidad frente a rol, cierre personal frente a
desvinculación, representación asistida sin facultad local, confirmación y campos
obligatorios, doble clic, DTO y clave exactos, respuesta perdida, 404 conservando
intento y recuperación sin nuevo POST. Replay administrativo conserva cuerpo/clave;
un rechazo posterior no borra el resultado desconocido original. Marcadores por
actor/API, sin cuerpo/contraseña/token; corrupción bloquea envío.

Constancia consultada en endpoint separado, H con backups pendientes, constancia
parcial, drenaje pendiente, tareas compartidas sin identidad de terceros,
agotamiento de 8 intentos, plazo vencido y servicio activo como pendientes reales.
401/403 no se interpretan como cierre, ni provocan reenvío de mutación. Estados
desconocidos deshabilitan acciones; revisión antigua no sobrescribe nueva. Lecturas
se abortan al desmontar y caché privada se retira; token privado sólo cuerpo y
memoria, limpiar consulta descarta resultado atrasado. Fechas iguales a las
provistas por backend. Las pruebas existentes de auth/API cubren limpieza de
sesión; no se acredita la continuidad integrada del servicio tras USER gate.

### Navegador y evidencia visual sintética

Chromium, escritorio 1440×1000, tablet 768×1024 y móvil 320×740. Vite aislado
`envDir:false`, `configFile:false`, loopback4197; tráfico externo abortado,
formularios con datos sintéticos. Servidor y navegador se cierran en finally.
Diálogo nativo con foco inicial contenido, Escape cierra y devuelve foco al botón
iniciador. Etiquetas de contraseña/código y checkbox, error role=alert y respuesta
role=status presentes. El formulario largo móvil se desplaza dentro del diálogo;
la confirmación fue accionada con éxito. No hay overflow horizontal en ninguna
captura. No se acredita lector de pantalla, dispositivo físico o auditoría WCAG
exhaustiva.

Capturas locales ignoradas por Git, reproducibles por el script:

- [Confirmación escritorio](test-results/deletion-web/desktop-confirmation.png)
- [Confirmación 320 px](test-results/deletion-web/mobile-320-confirmation.png)
- [Drenaje pendiente 320 px](test-results/deletion-web/mobile-320-pending-drain.png)
- [Constancia parcial 320 px](test-results/deletion-web/mobile-320-partial-receipt.png)
- [Constancia tablet](test-results/deletion-web/tablet-partial-receipt.png)
- [Revisión administrativa e intentos agotados](test-results/deletion-web/desktop-admin-exhausted.png)
- [Canal privado y constancia](test-results/deletion-web/desktop-private-receipt.png)
- [Resultado desconocido y recuperación 404](test-results/deletion-web/desktop-unknown-recovery-404.png)
- [Reporte de comprobaciones y rutas HTTP sintéticas](test-results/deletion-web/report.json)

Se inspeccionaron visualmente las capturas de confirmación 320 px y revisión
administrativa escritorio, además de verificar las pantallas con Playwright.
Las otras imágenes se generan y verifican por el arnés; no se atribuye revisión
manual individual a todas.

### Pendientes explícitos

Integración real en PostgreSQL aislado y doble de almacenamiento pendiente; el
[procedimiento de handoff](docs/DOCUMENT-DELETION-WEB.md#procedimiento-de-futura-integración-aislada-no-ejecutado)
requiere comprobar cluster/data_directory y destino nuevo `_test`, sin `.env` de
negocio. No se crearon ni borraron datos reales. No se acreditan sello de drenaje,
backups eliminados, scripts externos de restore, sesión mínima después del bloqueo
de `/auth/me`, o APIs de recuperación/catálogos que no existen. Sin modificaciones
backend, QA, commit, push ni despliegue.

## 2026-10-17 — Compatibilidad de sesión y recibos: navegador + backend real

Informe completo, contratos, archivos y límites:
[DOCUMENT-DELETION-COMPATIBILITY-WEB](docs/DOCUMENT-DELETION-COMPATIBILITY-WEB.md).
Web `feature/driver-verification` HEAD56c7bad más trabajo local preservado;
backend misma rama HEADb300c250 más correcciones locales. La presencia se acreditó
en OpenAPI, fuentes/JS compilado y HTTP real, no por SHA base solamente. 13 huellas
guardadas y verificadas al cierre sin diferencias.

### Pruebas focalizadas y comprobaciones

```powershell
npx vitest run src/test/api.test.ts src/test/invitations-api.test.ts src/test/verification-service.test.ts src/test/deletion-service.test.ts src/test/deletion-pages.test.tsx src/test/session-compatibility.test.tsx src/test/flows.test.tsx
npm run typecheck:test
npm run lint
node scripts/verify-deletion-compatibility.mjs
```

- Vitest final: **152/152 PASS, 7/7 archivos completos, 15.84 s**. Primera ejecución
  con cobertura inicial:148/148; no se suma al resultado final. Tras corregir un
  fixture de cancelación para quitar evidenceRef (su DTO no lo admite), archivo
  `deletion-pages.test.tsx` completo nuevamente **28/28 PASS**, 2.92 s; tampoco se
  suma como casos adicionales. Sin abortos nativos del runner de pruebas.
- `npm run typecheck:test`: **PASS**. `npm run lint`: **PASS**, sin omitir defensas.
- No se ejecutaron suite general, CHECK, suites backend ni build adicional. Los
  28+59 de backend se citan sólo como reporte de su handoff, no como ejecución propia.
- Mocks: discriminantes, permisos de rutas restringidas, canal privado durante
  bootstrap, refresh sin bucles,403 sin expiración, formas de recibo/IDs/revisión0,
  GET sin body/header de mutación, restauración de marcador en cliente nuevo,
  404/401/403/5xx conservando incertidumbre, respuesta tardía tras cambiar actor,
  no persistencia de recibo completo y denegación de servicio activo sin acciones.

### Recorridos reales aprobados

**A PASS:** login y restauración contra proyección mínima; restricted sólo id,
seguimiento propio real, URL operativa redirigida, consulta completa403 y operación
prohibida403 sin logout indebido. Cuenta STANDARD conserva navegación administrativa
y decisión autorizada de B. Navegador principal:2 login,4 refresh,8 proyecciones,
1 consulta completa deliberada,2 GET de recibo; sin bucles ni errores de render.

**B PASS:** decisión REQUEST_IDENTITY_INFORMATION confirmada desde Web. El arnés
destruye el socket sólo después de comprobar en PostgreSQL un comando persistido,
un evento y delta de revisión1, al regresar la transacción real. Web conserva
resultado desconocido ante el error500 del proxy. Recarga/restauración y GET con
misma clave, sin POST repetido: **1 POST original / 1 comando / 1 evento**.
Otro SUPER_ADMIN con login real en navegador separado obtiene **404
COMMAND_RECEIPT_UNAVAILABLE**. Un segundo comando distinto y explícito desde el
arnés lleva el recurso a revisión3; el recibo primero sigue en revisión2.

Recibo depurado: **sólo simulado** mediante su404 uniforme en Vitest; no se adelantó
retención ni se afirmó haber purgado un recibo real. No se ejecutó liberación/
entrega de un servicio comprometido real. No se usaron documentos ni datos reales.

### Entorno, evidencia y cierre

PostgreSQL18 identificado por SQL:127.0.0.1:55441,
`.tmp/compatibility-implementation/pgdata`. Base nueva del pase aprobado:
`deletion_compatibility_web_1792219301750_test`, esquema existente copiado sin datos
de `deletion_compatibility_20261017_test`, sin modificar/aplicar archivos de
migración. Nest con controllers/servicios/guards/DTO/filtro reales y DB real;
AppModule/throttling global no incluidos. Almacenamiento doble local, **0
operaciones**; sin Spaces/correo externo/VM/.env operativo.

Vite4196/API4195 loopback, Root real Web, sin mocks HTTP en A/B. Secretos sólo en
memoria; capturas sin contraseña, JWT, clave administrativa ni datos personales.
Revisión visual efectiva de [seguimiento320px](test-results/deletion-compatibility/restricted-followup-320.png)
y [recuperación administrativa escritorio](test-results/deletion-compatibility/admin-recovered-after-reload.png).
También se generó [inicio restringido escritorio](test-results/deletion-compatibility/restricted-desktop.png).
Sin overflow horizontal; foco inicial del diálogo contenido, etiquetas/confirmación
y errores comprobados. No se acredita lector de pantalla, móvil físico o auditoría
WCAG completa.

[Evidencia saneada conservada](docs/deletion-compatibility-evidence.json): versiones,
huellas, BD, resultados, efecto único y cierre. Capturas y reporte local original
en `test-results/deletion-compatibility/` (ignorado por Git), reproducibles por script.
Finalmente Chromium/Vite/Nest/conexiones cerrados; `pg_ctl status` confirmó
**no server running** para el clúster propio, sin listeners4195/4196. Bases sintéticas
conservadas; no se detuvieron procesos ajenos.

Intentos previos no acreditados: arranque pg_ctl quedó esperando por herencia de
pipes Windows; se identificó y detuvo sólo el runner propio y su clúster después
de comprobar data_directory, y se corrigió stdio. Una comprobación de IP falló por
representación inet con máscara; se usó host(inet_server_addr()) sin debilitar el
host exigido. Dos intentos llegaron a A pero no al detalle administrativo esperado
en la base previa; se aisló el recorrido en una nueva base vacía con el mismo
esquema, preservando los fixtures anteriores. Otro intento acreditó commit único
pero esperaba texto de fallo de red: el proxy devolvió500; se ajustó la expectativa
al error real y el siguiente recorrido pasó A/B. Ningún intento fallido se cuenta
como recorrido completo. No se alteraron roles, guards o retención para aprobarlo.

Spaces, producción, resolución comprometida real y contratos no incluidos siguen
pendientes. Sin cambios de fuentes Backend, migraciones, permisos reales, QA,
trackingMode/patches, main, commit, push, despliegue ni activación.

## 2026-10-17 — Validación pendiente C1/C2: BLOCKED

Solicitud: recibo realmente depurado y entrega LEGACY restringida desde navegador. Smoke inicial y único diagnóstico terminaron exit 1 con reporte. Chromium y navegación acreditados en diagnóstico, login sin completar por timeout. Inspección encontró omisión de VITE_API_URL en configuración efímera del arnés. No es defecto de producto acreditado; se respetó el límite de intentos.

Sin backend/PostgreSQL iniciados, fixtures ni mutaciones: ambos recorridos BLOCKED, efectos/estados finales no comprobados. Vite/Chromium propios cerrados y 4208 libre; Docker 43000 informado por usuario no utilizado. Cambios sólo utilidad, evidencia y documentación; producto y backend intactos. node --check PASS; no suites/build nuevos ni capturas funcionales. Temporales e historia conservados; sin QA, commit/push/despliegue. [Informe](docs/DOCUMENT-DELETION-COMPATIBILITY-WEB.md) y [evidencia](docs/deletion-browser-final-evidence.json).


## 2026-10-17 — Reejecución autorizada: smoke PASS, aislamiento BLOCKED

Corregido VITE_API_URL en el arnés, mediante configuración efímera sin .env. Nueva ejecución completa de node scripts/verify-deletion-browser-smoke.mjs: exit 0, Chromium y login real PASS; captura revisada en test-results/deletion-browser-rerun/smoke-login.png. Reportes anteriores conservados en deletion-browser-final. Sintaxis PASS; formato aplicado después sin cambios funcionales. No pruebas de producto/build por ausencia de cambios de producto.

Inspección Docker autorizada y sólo lectura: backend mandaria-backend-1 publica 127.0.0.1:43000; apunta a postgres:5432/mandaria, con volumen persistente mandaria_postgres_data. MAIL_PROVIDER=resend; DOCUMENT_DELETION_LOCAL_ENABLED no está presente en el entorno del contenedor. No se acreditaron base exclusiva sintética, correo capturado ni almacenamiento simulado. No se consultaron datos ni ejecutaron mutaciones contra esta instancia. El acceso inicial al daemon falló por permisos del sandbox; la inspección elevada posterior sí terminó correctamente.

C1 recibo depurado y C2 entrega LEGACY: **BLOCKED por aislamiento**, no ejecutados funcionalmente; sin conteos nuevos ni estados finales acreditados. No es fallo de producto/backend ni persiste el bloqueo anterior de render. Pendiente ejecutar ambos en instancia exclusiva con datos sintéticos, correo/storage simulados y reloj inyectable del arnés aprobado; no basta con usar el puerto existente. No se alteraron contenedores, backend, .env, QA o datos. Vite/Chromium propios cerrados y puerto4208 libre. Sin commit/push.

Huellas, inspección saneada y resultados: [evidencia de reejecución](docs/deletion-browser-rerun-evidence.json).

## 2026-10-17 — Instancia aislada y recorridos C1/C2

Nueva instancia real, PostgreSQL exclusivo55444/base *_test y42 migraciones existentes; identidad verificada antes de migrar. Web4218/API4217, correo capturado, storage/routing simulados y reloj documental inyectado. Docker43000 y backend intactos.

C1 PASS: decisión administrativa desde UI, pérdida de respuesta después de commit verificado, depuración por mantenimiento real, recarga y GET404. Un POST, marcador/sesión conservados, mensaje de incertidumbre; comandos1→0, PURGED, cuenta inactiva/gate durable. Desktop/móvil y teclado comprobados.

C2 BLOCKED: abrió servicio y confirmó ACCOUNT desde Web (202, proyección200); diagnóstico falló al exigir login. Sin entrega: lectura posterior acredita ACTIVE/CLAIMED,0 eventos de finalización,1 award,0 refunds, H null. No defecto producto/backend acreditado. Abortó un intento anterior por ruta/espera del arnés; único diagnóstico adicional completado y límite respetado, sin repetir navegador. Historia conservada.

Cuatro utilidades nuevas con sintaxis PASS; inspección de lectura completa PASS después de corregir nombre de campo. Sin producto, suites/build nuevos, backend, QA, commit/push/despliegue. Recursos propios cerrados y bases sintéticas conservadas. [Detalle](docs/DOCUMENT-DELETION-COMPATIBILITY-WEB.md) y [evidencia nueva](docs/deletion-isolated-evidence.json).

## 2026-10-17 — C2 entrega restringida retomada: PASS

Arnés corregido para continuar con200 DELETION_RESTRICTED; login adicional sólo ante401. Cuatro pruebas deterministas completas PASS, incluidas403/STANDARD rechazadas. Sin producto Web/backend modificado.

Retomada base exclusiva deletion_final_1792223093288_test tras verificar identidad. Un POST LEGACY de entrega desde UI200: DELIVERED/COMPLETED,1 evento DELIVERY_COMPLETED, ledger idéntico con1 award/0 refunds. Sesión restringida tras recarga, gates/deadline idénticos y H null. Prohibiciones auxiliares403; seguimiento UI verificado. Desktop/móvil/foco/teclado aprobados. UI tras recarga informa que no hay resolución activa, sin constancia histórica explícita de entrega; el estado final está acreditado por respuesta y SQL.

C1 no repetido, ninguna nueva baja/asignación/migración. Fixture de contraseña sintética temporal restaurado. Ejecución integrada completa exit0; sintaxis PASS, sin suites/build de producto.14 hashes backend/7 Web sin cambios. Recursos propios detenidos y temporales conservados; Docker43000 intacto, sin QA/commit/push/despliegue. [Detalle y límites](docs/DOCUMENT-DELETION-COMPATIBILITY-WEB.md) · [Evidencia nueva](docs/deletion-delivery-resume-evidence.json). Los fallos anteriores permanecen históricos, no se borraron ni se sumaron como éxitos.

## 2026-10-17 — Recibo depurado, ejecución exclusiva: PASS

Nuevo clúster/base sintéticos1792223822827, identidad SQL del destino comprobada antes de migrar/sembrar, API4217/Web4218. Smoke y reporte PASS. Decisión IDENTITY_AND_AUTHORITY_VERIFIED realizada desde UI; pérdida de respuesta sólo tras comprobar commit. Un comando/una aplicación de restricciones; mantenimiento real con DELETION_CLOCK depura1→0, sin borrar filas o ajustar fechas por SQL.

Tras recarga: GET con contexto/clave originales devuelve404 COMMAND_RECEIPT_UNAVAILABLE. POST antes/después1/1, marcador y sesión conservados, sin falsa recuperación ni cancelación. Gate/cuenta/estado PURGED durables sin cambios por consulta. Capturas desktop/móvil revisadas, sin overflow; foco/Enter/Tab PASS.

Una ejecución completa del arnés exclusivo exit0; sin aborto. Sintaxis PASS; no producto, suites ajenas ni build.14 hashes backend/7 Web intactos. Recursos propios detenidos, temporales conservados. No entrega, Docker43000, backend, QA, commit/push/despliegue. [Informe](docs/DOCUMENT-DELETION-COMPATIBILITY-WEB.md) · [Evidencia nueva](docs/deletion-receipt-only-evidence.json). Historial conservado, sin sumar cifras anteriores.

## 2026-10-17 — Revisión y preparación de publicación de la feature

Checkout vigente C:/Users/zorgl/Documents/mandaria-frontend, feature/driver-verification, HEAD56c7bad0524cbbf05b45fa687a8ec625694a6ca0. Origin https://github.com/zorgoluis/mandaria-frontend.git; fetch dirigido y comparación inicial0/0. W-01 y verificación documental ya publicados en56c7bad; no se duplican. Revisados diff de producto/pruebas, archivos nuevos, arneses, JSON y continuidad; cambios pendientes propios de baja/seguimiento. Sin hunks ajenos identificados. Worktrees y temporales ajenos conservados; AGENTS.md ausente en este checkout.

Huellas históricas contrastadas: entrega,7/7 fuentes Web y4/4 archivos de arnés; recibo depurado,7/7 fuentes Web y4/4 arneses. Coinciden íntegramente, sin cambios funcionales posteriores relevantes; ninguno de esos recorridos se repitió. El helper de entorno incorporó posteriormente una comprobación adicional de identidad de destino, acreditada en la ejecución del recibo; no cambia la entrega retomada. Evidencia histórica reutilizada expresamente, no contada como nueva.

Verificación nueva para el snapshot a publicar: siete archivos focalizados completos152/152 PASS (api, invitations-api, verification-service, deletion-service, deletion-pages, session-compatibility y flows); cuatro pruebas completas del arnés de sesión PASS; tipos de pruebas PASS; lint pertinente PASS; build incluye tsc -b y Vite PASS. Se repitió esta validación local porque los reportes anteriores de tipos/build/pruebas no aportaban un manifiesto completo de huellas del snapshot actual. No suite general ni backend. Advertencia de chunk Root695.31kB >500kB conservada, no silenciada.

Revisión de inclusión: sin .env, JWT reales, credenciales, claves privadas, URLs firmadas, datos de negocio reales, node_modules, dist, perfiles o trazas/logs crudos. Fixtures de credenciales son literales sintéticos o valores aleatorios sólo en memoria. Evidencia JSON saneada y metadatos de entornos locales; capturas y bases sintéticas siguen locales e ignoradas, no se añaden al commit. Sintaxis de todos los arneses candidatos y parseo JSON PASS. git diff --check PASS; índice explícito por archivos, sin git add general.

Reproducción: verify-deletion-receipt-only crea clúster/base nuevos con dependencias backend locales existentes y nunca entrega servicios. verify-deletion-delivery-resume requiere el clúster sintético documentado y una asignación ACTIVE pendiente; no es un comando para repetir una entrega ya completada. Rutas locales de los arneses reflejan el entorno acreditado. verify-deletion-isolated y scripts anteriores preservan historia de diagnóstico; no se presentan como ejecuciones integrales aprobadas de su contenido actual. No reejecutarlos indiscriminadamente ni usar una base desconocida.

Se preparan dos commits coherentes: producto/pruebas de baja y sesión; arneses/documentación/evidencia. Se verificará de nuevo la referencia remota inmediatamente antes del push normal, con refspec exclusivo de feature/driver-verification. Esta entrada registra revisión previa, no anticipa éxito del push. No merge, rebase, QA, main, cambios/publicación backend, App/Landing o despliegue.

Límites vigentes: constancias parciales; drenaje real en Spaces pendiente, sin eliminación total ni aptitud productiva. Tras entregar, UI informa que no hay resolución activa, sin constancia histórica explícita de entrega. Revisión y manifiesto de huellas: [deletion-publication-review.json](docs/deletion-publication-review.json).

Revisión final del índice: diff --cached --check detectó líneas vacías sobrantes al final de deletion-isolated-browser.mjs. Se retiraron únicamente esas líneas; contenido ejecutable idéntico. Huellas original/publicable reconciliadas en deletion-publication-review.json, sin reescribir evidencia histórica. Sintaxis y cuatro pruebas del helper comprobadas; no repetición de entrega/recibo por ausencia de cambio funcional.
## 2026-10-18 — Web operativa V2: validación sintética final

Base/HEAD Web `a87081c6b6c91d8feef5598ec33db734ec7592e5`, feature/driver-verification, sin commit. Backend leído exclusivamente en checkout principal b300c25 más implementación pendiente; OpenAPI, DTO/controller/service/worker, recibos, pruebas V2 y diseño23 prevalecen sobre propuestas. Once huellas en docs/deletion-v2-sources.json comprobadas sin cambios. Matriz y bloqueos en [DOCUMENT-DELETION-V2-WEB.md](docs/DOCUMENT-DELETION-V2-WEB.md).

Verificaciones nuevas finales:

- `npx vitest run src/test/deletion-v2.test.tsx src/test/deletion-service.test.ts src/test/deletion-pages.test.tsx src/test/session-compatibility.test.tsx`: **4 archivos completos, 91/91 PASS** (33 V2,20 servicio,29 páginas,9 sesión). No sumar ejecuciones intermedias ni resultados históricos.
- `npm run typecheck:test`: PASS. `npx eslint src/deletion src/test/deletion-v2.test.tsx src/test/deletion-v2-fixtures.ts src/test/deletion-service.test.ts src/test/deletion-pages.test.tsx`: PASS. `node --check scripts/verify-deletion-v2-web.mjs`: PASS.
- `npm run build`: PASS, incluye tsc -b;2320 módulos. Root712.72kB, advertencia >500kB conservada. Sin dependencias, configuración o límites modificados para silenciarla.
- `node scripts/verify-deletion-v2-web.mjs`: reporte final PASS en `test-results/deletion-v2-1792376575206/report.json`. Vite4199 con envDir:false, todos los endpoints interceptados y orígenes externos abortados; navegador/API/Web sintéticos, sin servidor backend ni DB. Ocho estados visuales en1280 y320px,16 capturas; overflow horizontal ausente, foco dentro de modal y uso de Enter/Space. KEEP pasado no envía; conflicto409 refresca sin repetir; segunda confirmación explícita retira sólo el gate elegido en fixture y conserva el independiente. Dos POST sintéticos totales (uno409 y uno200), no dos efectos reales. Cero peticiones inesperadas/errores de página. Vite y navegador propios cerrados.
- `git diff --check`: PASS. Fuente/artefactos y evidencia local saneada identificados por SHA-256 en [deletion-v2-web-evidence.json](docs/deletion-v2-web-evidence.json). Capturas revisadas visualmente: incidencia actual aparece antes de historia, móvil sin recortes horizontales, modal específico y constancia diferenciada. La prueba no acredita backend/PostgreSQL/Spaces ni simulación de efectos como efectos reales.

Cobertura: programada vs ejecutada; retraso sin cierre; residuos/errores; H con/sin incidencia; fotografía de recibo distinta de estado; cancelación sin reactivación y bloqueo de resolve no recuperable; invalidación global/parcial; parcial sin restauración; RELEASE individual/KEEP con fecha; permisos/409; responsable/suplente y motivo; vigilancia agotada/ocho ciclos; adopción V1/actuación puntual sin nuevas fechas; respuesta perdida/GET y404 sin POST nuevo; sesión restringida/canal privado; versión desconocida/fechas opcionales; ausencia de campos administrativos en titular. Sondeo30s se detiene ante403, desmontaje o política desconocida.

Ejecuciones de desarrollo: primer Vitest dentro del sandbox falló leyendo caché temporal ENOENT y reportó dos suites no cargadas; no fue PASS. Ejecución fuera del sandbox permitió diagnóstico: cuatro aserciones nuevas usaban equivocadamente readMarkers().items en lugar del array; corregidas en tests, sin modificar lógica para aprobarlas. Lint señaló reloj impuro durante render y exports de utilidades: reloj informativo pasó a hook con cleanup y utilidades a módulo separado; validación temporal pura al presentar y comprobada al submit/servidor. Tipos iniciales detectaron retorno inferido que exigía opcionales y uso incorrecto del array de marcadores; corregidos. Todos los archivos afectados se ejecutaron completos después.

Arnés navegador: primera ejecución `1792376328952` escribió reporte FAIL por selector ambiguo de dos mensajes de409; no aborto nativo. Selector específico corregido, `1792376420332` PASS. Después de revisión visual se subió situación vigente al inicio y se ajustaron fechas sintéticas a T0+7 días; ejecución final `1792376575206` PASS. No sumar las repeticiones. Se conservan reportes y capturas anteriores.

Evidencia histórica reutilizada, sin repetir entrega/depuración: docs/deletion-delivery-resume-evidence.json y docs/deletion-receipt-only-evidence.json permanecen intactos. ActiveService, proyección de sesión, cliente HTTP, marcadores y lectura/proyector del recibo no cambiaron; hooks añade polling opt-in apagado para servicio comprometido, pages/service añaden V2 y resumen. Las siete huellas históricas Web ya no coinciden en pages/service por esta adaptación: no se afirma una integración nueva de esos archivos. Las regresiones completas de sesión y recuperación sí son nuevas. Sin nueva entrega, reloj de purga, PostgreSQL ni cambios backend. Histórico no acredita V2 actual.

Bloqueos: GET commandSnapshot no admite CANCELLED; por ello no se habilitan decisiones administrativas sobre canceladas sin recuperación segura. No existe endpoint de observaciones completas/historia de incidentes, mapa gate→resource completo ni inventarioVerificado en work-items; Web no los inventa. Pasos de integración aislada posterior en handoff. Constancias parciales; drenaje real en Spaces y apertura limitada de restauración pendientes. No eliminación total ni aptitud productiva. Sin Docker43000, QA, commit, push ni despliegue.

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

Merge de main 8b864c5 sobre QA 0409015 (base común 06d9766) en worktree mandaria-frontend-qa, rama merge/main-into-qa. Once conflictos resueltos conservando ambos lados: CSP de Google Maps de QA más blob: de main en img-src; transporte con rama blob de main y parseo estricto/Retry-After de QA; códigos BUSINESS/CUSTOMER y VERIFICATION/LICENSE unidos; Login con next=business y next=onboarding y redirección de sesión restringida; rutas de cliente y de verificación/baja juntas. Bitácoras, README e informe de compatibilidad conservan ambos historiales.

Ajustes propios de QA: main desactivó en Web la ejecución detallada porque su backend no la ofrece; QA sí la ofrece, así que se conservan ExecutionRecovery, la página y el enlace de incidencias de custodia (sin HistoricalOperationsNotice). sessionIdentity acepta CUSTOMER, que main rechazaba y habría impedido iniciar sesión a clientes. verification-entry envía a /dashboard los roles sin expediente propio.

Validación nueva: tsc -b, typecheck:test, ESLint y build PASS (advertencia previa chunk >500 kB). Vitest completo 1323/1344; las 21 fallas coinciden con QA limpio (22 fallas): 20 deterministas preexistentes en delivery-assignments y flows, más fallas intermitentes por carga que pasan aisladas. Dos pruebas ajustadas a la semántica de QA y una nueva para CUSTOMER. Sin navegador, backend real, push ni despliegue. Requiere backend QA con /auth/me?projection=session y los endpoints de verificación y baja de main.
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

## Estado actual e historial — cierre conjunto de conservación, 2026-10-20

Solicitud: cerrar en una tarea las dependencias Backend/Web/Landing. Cierre conjunto completado en feature/driver-verification, HEAD 97850b8c447c71d6ae245bc8df3ce46413650da2 conservado, worktree fleet-representative-web. Contrato backend nuevo consumido en expediente y seguimiento: fechas desconocidas/no accesibles, excepciones con revisión/vigencia, historia depurada e incidencia posterior. Se preservan recuperación, caché y acciones.

Nuevas: 183 pruebas únicas en seis archivos completos; tipos producto/pruebas, build/lint PASS. Integración final CALENDAR/UNKNOWN/NOTICE/EXCEPTION/INCIDENT/PERMISSIONS PASS consolidada; PostgreSQL, backend y Web reales locales, correo/storage simulados, reloj controlado, escritorio/320. A–F y recuperación con un POST/0→1→1 siguen históricos. Correcciones finales de lectura cubiertas por 44 pruebas de los dos archivos completos; capturas anteriores no acreditan rótulos posteriores.

Pendientes exclusivamente externos: configuración efectiva/ensayo operativo de VM, avisos/calendario reales, copias/horizonte/custodia y cobertura efectiva de responsables ya designados. Decisiones sobre saldo/devoluciones y autorización final de textos siguen pendientes; no bloquean artificialmente el cierre del código. RESOLVED y GPS/App fuera de alcance. Trabajo previo/ajeno e historia conservados; procesos propios detenidos y bases sintéticas retenidas. Sin .env modificado, servicios reales, Docker, QA, commit, push, merge, despliegue, políticas publicadas ni activación.

[Informe canónico, matriz y pendientes](docs/RETENTION-WEB-PUBLICATION-REVIEW.md). Documentación y cambios locales sin commit.

# Bitácora — Mandaria Web

## 2026-10-20 — Conservación de imágenes a 30 días, cierre local

Implementación propia en feature/driver-verification, worktree fleet-representative-web, HEAD 97850b8c447c71d6ae245bc8df3ce46413650da2 sin cambios; sin commit/push. Calendario por folio, distinción proveedor/entrega, excepción IMAGE_ATTACHMENT, declaración de copias/restauración y confirmación SUPER_ADMIN con recuperación original. No se encontró AGENTS.md ni propuesta previa; matriz creada desde DTO/OpenAPI/servicio actuales. Otros worktrees y trabajo previo conservados.

A–F PASS completo en ensayo 1792525812779: Web/backend reales, PostgreSQL propio identificado antes de migrar, reloj inyectado y correo/storage simulados. Primer 1792525715228 falló sólo por seed REJECTED directo; corregido según transiciones backend y un único lanzamiento adicional. Recuperación: un POST, comandos/planes 0→1→1. B dos objetos sin residuos en simulador; C aviso fallido sin borrado/renovación; D excepción por Web conserva dos objetos; F cuenta ajena denegada y sin reapertura. Procesos propios detenidos y ambas bases conservadas.

33 pruebas nuevas + 215 regresiones afectadas distintas (248 casos); tipos producto/pruebas, lint/build finales PASS. Primer registro focalizado global exit 1 por selector nuevo y error posterior del wrapper; no se acredita globalmente PASS, aunque los ocho archivos de regresión terminaron completos. Archivos finales corregidos PASS. Chrome 155.0.8059.85, escritorio/320, teclado/foco/errores/texto largo, sin overflow. Tras revisión visual sólo cambió rótulo de INVENTORY sin confirmación y zona horaria, con regresión; A–F no repetido. Huellas integradas/actuales separadas: capturas históricas anteriores a ese texto.

Backend 2c458fc955f699ce958dabf5fe89dcc58892a031 + retención sin commit, migración 20261020000100_document_image_retention y formato 4. 27 huellas iguales antes/después; 16 también coinciden con evidencia backend histórica. Sus 123/53/33 no son pruebas nuevas ni pareja de SHA publicada probada. No GET titular por expediente ni detalle completo de excepciones: no inferir fechas/vigencia. Constancias limitadas; pendiente Spaces real, textos B/C/D/I, historia y capacidad operativa de Luis Fernando Salgado Gonzalez/Carlos Bryan Corado Suarez, ya designados. RESOLVED y Android/GPS separados. Sin backend/App/Landing, .env, políticas, QA, merge, despliegue o activación.

[Informe](docs/DOCUMENTARY-RETENTION-30D-WEB.md) · [Matriz](docs/DOCUMENTARY-RETENTION-30D-WEB-PROPOSAL.md) · [Evidencia](docs/retention-30d-web-evidence.json). Documentación local sin commit.


## 2026-10-20 — Cierre de publicación y referencia backend confirmada

Web publicó `6bdeda4021bf01d822746b97189759ba0cf07d7a` en `origin/feature/driver-verification`, desde `e657e715cadb1d6727fbde55a9202b6deaa2fdb9`, con 37 archivos propios. Consulta `ls-remote` satisfactoria: SHA remoto igual al local, 0/0 e índice/checkout limpios. Al continuar, fetch acotado confirma la misma referencia. Otros worktrees y cambios ajenos conservados. Este cierre añade sólo documentación; no cambia producto ni evidencia del ensayo.

El backend recibió concurrentemente el commit local `2c458fc955f699ce958dabf5fe89dcc58892a031`, rama `codex/fleet-representative-verification`. Ya no queda pendiente identificar su commit de implementación. Contraste en lectura: de las 26 referencias A–F, 19 archivos publicados conservan la huella probada y coinciden con los blobs del commit al normalizar LF; cuatro archivos dist y el borrador legal local también conservan sus bytes, pero no están publicados en ese commit. Los dos informes de diseño/implementación cambiaron editorialmente para registrar la revisión y excluir el enlace al borrador ajeno. Sus bytes publicados coinciden con la documentación local actual; no se presenta su huella antigua como vigente. Además, las 26 huellas de producto/contrato/arnés del informe backend coinciden con sus archivos y blobs publicados. No se consultó su remoto ni se modificó backend.

Dependencia concreta: ese contenido backend, migración `20261019000200_fleet_representative_verification` y recuperación formato 3. Es correspondencia de contenido con A–F histórico, no una ejecución nueva de la pareja de SHA ni validación de versiones mezcladas. Los informes backend aún mencionan Web pendiente desde su propio corte; no reabren A–F, acreditado en el informe Web. Se reutilizan las 40 focalizadas, tipos/lint/build y visual Chrome **155.0.8059.82**; las 130 anteriores siguen históricas y `spawn UNKNOWN` original sin causa determinada. Sin nuevas suites o servicios.

Pendientes reales: integración/despliegue coordinados futuros del backend compatible y su migración, textos/avisos/declaración aprobados y publicación autorizada, destino privado/CORS/custodia y preparación operativa. Recuperación posterior a revocación sigue limitada. No recepción real, activación, políticas publicadas ni LOCAL_TEST convertido; constancias parciales no garantizan eliminación total. V2 real en Spaces, RESOLVED y Android/GPS separados. Este cierre no ejecuta merge/rebase, QA, despliegue ni cambios backend/App/Landing.

[Informe Web](docs/FLEET-REPRESENTATIVE-WEB.md) y [registro de contraste](docs/fleet-representative-publication-review.json). Sólo este complemento documental se prepara para otro commit en la misma rama.

## 2026-10-19 — Revisión para publicar el expediente del representante

Revisión autorizada exclusivamente en `feature/driver-verification`, worktree `C:/Users/zorgl/.codex/worktrees/fleet-representative-web/mandaria-frontend`. HEAD inicial y origin tras fetch acotado: `e657e715cadb1d6727fbde55a9202b6deaa2fdb9`; 0 commits por delante y 0 por detrás, índice inicialmente vacío. Origin confirmado: https://github.com/zorgoluis/mandaria-frontend.git. Se revisan 36 archivos propios más el registro de publicación; no hay hunks ajenos detectados en este checkout. Los otros worktrees y los cuatro documentos pendientes del checkout principal se conservan.

Correspondencia comprobada: 33/33 huellas Web/arnés, 26/26 backend, 7/7 capturas, los seis reportes de segmentos y los dos reportes finales de pruebas. A–F sigue PASS consolidado con reanudaciones y fallos preservados; recuperación 0→1→1, un POST, selección A/B sin envío automático. Se reutilizan las 40 pruebas focalizadas (29+11), tipos app/test, lint, build y visual 1280/320/teclado. Las 130 anteriores siguen históricas; ninguna suite ni recorrido se ejecutó de nuevo para publicar. Navegador acreditado: Chrome **155.0.8059.82**; causa original de `spawn UNKNOWN` aún sin determinar.

Backend consultado sólo en lectura: rama `codex/fleet-representative-verification`, HEAD base `0fd7e2d058ba2c73c30f5edc21e229c11eefabdd` y cambios pertinentes todavía sin commit. Requiere contrato `FLEET-REPRESENTATIVE-PRIVATE-DOCUMENTS-IMPLEMENTATION.md`, migración `20261019000200_fleet_representative_verification`, recuperación formato 3 y las huellas probadas. SHA final backend pendiente; no se atribuye el ensayo a una pareja de SHA base ni se acredita un despliegue mixto.

Verificaciones nuevas de publicación: revisión del diff y archivos nuevos, 3 JSON de evidencia, 51 enlaces locales de informes y 141 imports relativos, sintaxis de seis scripts, siete capturas inspeccionadas, patrones de secretos y `git diff --check` PASS. No cambió producto. Git usa autocrlf: el inventario conserva SHA-256 de bytes locales y de texto normalizado LF para contrastar el índice sin confundir finales de línea con cambios funcionales.

Sólo evidencia sintética saneada: se excluyen .env, secretos operativos, URLs firmadas, documentos reales, perfiles, bases, node_modules, dist, logs/trazas y temporales; no se borran. Las credenciales literales del arnés son fixtures sintéticos de la base aislada, no credenciales operativas. Pendientes: backend compatible, textos y declaración aprobados para el tratamiento, publicación jurídica autorizada, almacenamiento privado/CORS/custodia y preparación operativa reales. Recuperación tras revocación limitada; constancias parciales no garantizan eliminación total. V2 real en Spaces, RESOLVED y Android/GPS permanecen separados. Sin cambios backend/App/Landing, QA, merge, rebase, despliegue, recepción real ni activación.

[Inventario y revisión previa](docs/fleet-representative-publication-review.json). Staging selectivo, commit y push con refspec exclusivo son los pasos siguientes autorizados; esta entrada no los acredita anticipadamente. El historial inferior conserva sus estados al momento de cada ensayo.

## 2026-10-19 — Cierre integrado A–F del representante privado

Autorizada investigación acotada y continuación del ensayo. Rama `feature/driver-verification`, HEAD `e657e715cadb1d6727fbde55a9202b6deaa2fdb9`, mismo worktree y cambios locales; no se cambiaron ramas ni se tocó el checkout principal main con sus cuatro documentos pendientes. AGENTS.md no localizado; README/continuidad/contrato leídos. Al iniciar coincidían 27 huellas Web, cuatro del arnés y 26 backend. Backend sólo lectura, base `0fd7e2d058ba2c73c30f5edc21e229c11eefabdd`, rama `codex/fleet-representative-verification`, implementación aún sin commit.

La prueba mínima con Google Chrome `155.0.8059.82`, sandbox habilitado y temporales/perfil propios pasó página local y teclado, sin API/base. No se demuestra la causa raíz del `spawn UNKNOWN` del Chromium `153.0.8010.12`; no se volvió a lanzarlo ni se desactivaron protecciones. Aprobaciones normales, sin rechazo ni elusión. Nuevos auxiliares `representative-browser.mjs` y `verify-representative-browser.mjs`; arnés existente usa ese launcher.

Ensayo `1792438944140`, PostgreSQL 55469/API 4237/Web 4238, identidad antes de migrar/sembrar y al retomar. Seis segmentos con reportes preservados: inicial FAIL de scroll inmediato; `9224118` A/D/E PASS y checklist administrativo leído antes de cargar; `9402312` decisión aplicada pero representante reanudado en dashboard; `9557453` B/C PASS y espera de 5 s menor al sondeo de 10 s; `9661306` denegaciones/visual correctas y aserción 404 desalineada tras gate; `9761412` F PASS y consolidado completo. Se continuó desde estado persistido, con GET de la decisión y sin duplicar comandos. Backend aplica gate antes de titularidad: 409 DELETION_RESTRICTED después del bloqueo, 404 ajeno antes. No se declaran verdes los procesos anteriores.

Regresión Web demostrada y corregida: refrescar privacidad de la misma versión desmontaba el selector de archivo. Se conserva montado mientras se bloquean envíos; error/nueva versión/pérdida de autoridad siguen retirándolo. Sólo `representatives.tsx` y su prueba cambian producto/pruebas frente al cierre anterior. 29 representantes +11 carga completos PASS; tipos app/test, lint y build PASS (Root 758.88 kB, advertencia >500). Una regresión nueva; 91 casos de archivos intactos reutilizados. No se repitieron las 130 en bloque, A–H ni baja/CANCELLED.

A–F comprobados en Web/API reales con transportes simulados; publicación/cuentas/historia son preparación sintética explícita. Recuperación personal 0→1→1 comandos/efectos, un POST; A preserva B y sólo otro clic envía B. Una decisión, una aceptación FLEET, ninguna aceptación DRIVER, historia LOCAL_TEST igual, admisión false. Reanudaciones de almacenamiento regeneran únicamente fixtures sintéticos cuyos hashes coinciden con adjuntos SQL. Visual en 1280/320, teclado/foco y siete capturas saneadas seleccionadas. [Informe y tabla](docs/FLEET-REPRESENTATIVE-WEB.md), [evidencia y huellas](docs/fleet-representative-integration-evidence.json).

26 huellas backend iguales antes/después de todos los segmentos; fuentes/arnés sin cambiar durante cada ejecución. Navegador/Vite/backend/PostgreSQL propios detenidos; base sintética conservada. Sin backend/App/Landing, .env, Docker, VM, 43000, Spaces/correo reales, QA, commit, push, merge ni despliegue. Documentación local sin commit. A–F no quedan pendientes; continúan backend compatible/migración, textos autorizados, infraestructura privada/custodia y preparación operativa reales; recuperación tras revocación limitada; V2 real/RESOLVED/Android-GPS separados. Historial inferior intacto.

## 2026-10-19 — Expediente privado de representante, implementación local

Se comprobó el checkout principal en main (`763b7f5397320b1872fbbfc32ffd37a91b5411ec`) con cuatro cambios documentales previos. Se preservan sin cambio de rama; implementación en worktree separado `C:/Users/zorgl/.codex/worktrees/fleet-representative-web/mandaria-frontend`, rama `feature/driver-verification`, HEAD `e657e715cadb1d6727fbde55a9202b6deaa2fdb9`. Índice vacío; no fetch, commit ni push. AGENTS.md no localizado en checkout/ascendientes; se leyó README y continuidad. Los demás worktrees no se alteraron.

Se incorporaron vínculos propios DRIVER/PROVIDER_ADMIN, privacidad por versión/hash y consentimientos antes de datos/archivos, formulario SELF/APPOINTMENT/POWER, carga JPEG/PNG y orden de páginas, presentación, revisión SUPER_ADMIN y aceptación FLEET condicionada a autoridad actual. Coordinación no concede facultades. Vincular/revocar exige confirmación y revisión esperada; no modifica membresía ni servicios. Recuperación consulta el comando original; recibo histórico no sustituye el estado actual. El límite backend tras revocación conserva marcador e incertidumbre. Restricción documental muestra seguimiento limitado sin prometer eliminación total. [Informe y matriz](docs/FLEET-REPRESENTATIVE-WEB.md).

Backend sólo lectura: `codex/fleet-representative-verification`, base `0fd7e2d058ba2c73c30f5edc21e229c11eefabdd` más cambios locales; 26 huellas contractuales/runtime coinciden antes/después del ensayo y al cierre. No se confunden sus 64 E2E/38 unitarias/33 B2B históricas con pruebas nuevas. Nuevas pruebas Web: 130 casos únicos de seis archivos completos PASS, tipos app/test, lint focalizado y build PASS; aviso de chunk >500 kB. No se repiten A–H ni recorridos intactos de baja/CANCELLED.

Integración acotada `1792437444597`: identidad de PostgreSQL temporal comprobada, migración y preparación sintética con backend real/Vite; SETUP FAIL al arrancar Chromium (`spawn UNKNOWN`). Un único diagnóstico adicional sin API/base reprodujo el fallo; causa desconocida, sin atribuirla a producto ni al servicio de aprobación. Recorridos y revisión visual BLOCKED, cero POST de privacidad y cero PUT documental, sin capturas ni recuperación acreditada. No hubo más lanzamientos. Recursos propios detenidos y puertos 55469/4237/4238 libres. [Evidencia saneada](docs/fleet-representative-web-evidence.json).

Pendientes concretos: resolver arranque de Chromium y ejecutar los checkpoints preparados bajo nueva autorización; contrato backend con migración compatible; revisión/publicación jurídica de privacidad y preparación privada/operativa antes de recepción real. Recuperación posterior a revocación sigue limitada por contrato. Limpieza real V2/RESOLVED/Android-GPS conservan alcance separado. No backend/App/Landing, .env, Docker, puerto 43000, VM, Spaces/correo reales, QA, commit, push, merge, despliegue ni activación. Documentación nueva local sin commit; historial inferior conservado.

## 2026-10-19 — Propuesta Web del representante legal de flotilla

Sólo documentación: [wireframes y handoff](docs/FLEET-REPRESENTATIVE-WEB-PROPOSAL.md). Checkout encontrado en main, HEAD 763b7f5397320b1872fbbfc32ffd37a91b5411ec, limpio e índice vacío; no se cambió de rama ni integró nada. Tres worktrees previos y artefactos excluidos conservados. AGENTS.md no localizado en checkout/ascendientes; continuidad leída.

Se distinguen procedimiento manual aprobado del apartado H, diseño y código candidato de contrato final/publicación. Durante la tarea cambiaron seis referencias backend; una segunda lectura con corte 18:18:32 UTC sí identifica vínculo propio, privacidad previa, expediente y acreditación antes de FLEET. Se registran ambas lecturas y dos fuentes adicionales (doce referencias). OpenAPI 1.12.0 sigue sin rutas/categorías nuevas y no se localizó informe final. Recuperación tras revocación requiere respuesta contractual mínima: el código candidato exige vínculo antes de leer ciertos comandos aplicados. No se atribuye ejecución ni fallo de producto comprobado. Consulta Git backend no disponible por permisos del sandbox, sin inventar SHA o publicación.

Propuesta de entrada, preparación/privacidad personal previa, documentos ordenados, envío/seguimiento, revisión SUPER_ADMIN, aceptación FLEET posterior y sustitución. Incluye matriz de actores, recuperación/concurrencia, accesibilidad, casos futuros y once preguntas para el contrato final. Se evita aceptar FLEET antes de acreditar facultades, no se heredan imágenes ni autoridad por rol y no se infieren bloqueos de servicios. Sólo enlaces, referencias, coherencia documental y diff; ninguna prueba de producto o integración nueva. Sin componentes/rutas/fixtures, backend, QA, Landing, Android, commit, push, despliegue, publicación o activación. Cuatro documentos locales; historial inferior conservado.

## 2026-10-19 — Revisión de publicación de avisos y bloqueos

Autorizado commit y push sólo en feature/driver-verification. Origin confirmado como https://github.com/zorgoluis/mandaria-frontend.git; fetch acotado con base local/remota 1d4486e1b0c6fbd987ad846213de7bfdb05e8c1d, sin divergencia ni historia previa pendiente. Índice vacío. Se revisan 25 archivos propios, sin cambios ajenos detectados; otros worktrees y artefactos excluidos preservados. [Revisión y alcance](docs/DOCUMENTARY-AVAILABILITY-WEB.md).

16/16 huellas de fuentes/arnés, 9/9 protegidas, 27/27 entradas de correspondencia histórica, 4/4 capturas y 5/5 reportes locales vigentes. Se reutilizan 129 pruebas, tipos/lint/build y visual sintética; sin nuevas suites, A–H o baja. Se seleccionarán rutas explícitas y se revisará el índice antes del commit, con nueva consulta remota antes del push y comprobación de SHA después. Registro previo a esos pasos; no anticipa éxito. Backend compatible por contrato/huellas, sin nueva integración ni aptitud productiva general. Sin cambios backend, merge, QA o despliegue. Las entradas inferiores conservan el cierre anterior sin commit.

## 2026-10-19 — Avisos y bloqueos según disponibilidad documental vigente

Rama feature/driver-verification, HEAD 1d4486e1b0c6fbd987ad846213de7bfdb05e8c1d, inicio limpio e índice vacío. README/continuidad leídos; AGENTS.md no encontrado en checkout/ascendientes. Otros worktrees y archivos excluidos conservados. [Informe](docs/DOCUMENTARY-AVAILABILITY-WEB.md) y [evidencia](docs/documentary-availability-evidence.json).

Mapeo central de requisitos: prueba sólo por LOCAL_TEST; 503 desactivado sin etiqueta de prueba; política ausente bloquea pasos dependientes; PRODUCTION con requisitos permite flujo sujeto a aceptación/permisos; red/401/403/otros no deducen modo. Consultas por actor/ámbito/proveedor/entorno, respuestas tardías canceladas; aceptación anterior no habilita nueva versión. Se preservan aviso/consentimientos, revisión documental, historial, servicios y recuperación. Baja desactivada ya no se describe como exclusiva de ensayo. Rechazo editorial se explica sin limpiar ni publicar borradores automáticamente.

129 casos únicos PASS en seis archivos completos; tipos app/test, lint, build y visual sintética de seis estados a 1280/320 PASS. Dos esperas de pruebas y dos selectores visuales corregidos; incidencias de entorno documentadas, sin fallo de producto inferido. Root 732.80 kB conserva aviso de tamaño. No integración real nueva, A–H o baja repetidos. 17/27 huellas Web A–H iguales; diez diferencias cubiertas por esta validación con fixtures. Nueve fuentes Web protegidas y nueve referencias backend de entrada sin cambios. SHA backend tomado del handoff; Git backend no consultable por sandbox, sin atribuir confirmación nueva.

Pendientes de uso real: backend compatible y combinación del destino, textos/privacidad/autorizaciones finales y preparación operativa. No se acredita activación ni aptitud productiva. Spaces V2 real, RESOLVED y Android/GPS fuera. Documentación y código quedan **sin commit**. Sin cambios backend/.env/QA/VM/políticas, push, merge o despliegue; no se alteró el historial inferior.

## 2026-10-19 — Revisión para publicar alta documental y evidencia A–H

Autorizados commits y push exclusivamente de feature/driver-verification. Repositorio principal Mandaria Web, HEAD inicial fcc81e98e23b569723c78304caa6098e64b01963; origin https://github.com/zorgoluis/mandaria-frontend.git confirmado. Fetch limitado a la rama: local/remoto 0/0, sin divergencia ni commits locales anteriores pendientes. Índice inicialmente vacío. Otros tres worktrees y main/QA preservados; no se encontró AGENTS.md en este checkout ni en sus directorios ascendentes. Continuidad e informes leídos.

37 archivos pendientes propios revisados: adaptación productiva, publicaciones SUPER_ADMIN, consentimientos separados, transición LOCAL_TEST, pruebas, cinco scripts, documentación y siete capturas sintéticas. Se añade el [registro de revisión de publicación](docs/onboarding-production-publication-review.json). El cierre de baja y los cambios propios anteriores ya están contenidos en la base publicada; no se duplican. No se detectaron cambios ajenos entre los candidatos. Se conservan .env, node_modules, dist, perfiles y artefactos/logs locales excluidos, sin incorporarlos ni borrarlos.

27/27 huellas Web del ensayo A–H, 23/23 referencias backend fuente/runtime y seis fuentes protegidas coinciden. Siete capturas y cuatro reportes históricos locales coinciden; las únicas diferencias frente al informe anterior al ensayo son los tres arneses ya acreditados en A–H. Sin diferencias funcionales posteriores ni suites nuevas: se reutilizan A–H PASS, 98 pruebas completas por archivo y tipos/lint/build/visual históricos. JSON, enlaces, importaciones, sintaxis, secretos y diff revisados. Las referencias históricas a test-results son artefactos locales excluidos, no archivos disponibles en un clon.

Primer commit: 88a6ec8, implementación y pruebas, 17 archivos. Segundo grupo: arneses, continuidad y evidencia saneada. Selección explícita; blobs contrastados con contenido revisado, admitiendo exclusivamente normalización CRLF/LF. Este registro es previo al commit documental y push: requiere nueva consulta remota antes de publicar y confirmación del SHA remoto después, sin force, merge o rebase. El resultado final se comunica en la entrega; esta entrada no anticipa una publicación exitosa.

Backend requerido: contrato DOCUMENTARY-ONBOARDING-PRODUCTION-PREPARATION, migración 20261019000100_documentary_production y contenidos identificados en la evidencia integrada. El ensayo usó base 06457dedd9b2f533862a0477b04b36b69e1990f0 más cambios locales; no se ha identificado aquí su commit final compatible ni probado una nueva pareja de SHA. Continúan aprobación jurídica, preparación operativa y validación de destinos reales; sin aptitud productiva, despliegue o activación acreditados. Backend no modificado, sin QA. Limpieza Spaces V2, RESOLVED y Android/GPS fuera. Se conserva íntegro el historial inferior.

## 2026-10-19 — Alta documental: cierre del ensayo integrado A–H

Una sola ejecución solicitada por el mecanismo normal y permitida tras el nuevo encargo: `1792397072142`, 08:04:32–08:04:58 UTC, PASS/exit0. [Informe actualizado](docs/DOCUMENTARY-ONBOARDING-PRODUCTION-WEB.md), [matriz, conteos y huellas](docs/onboarding-production-integration-evidence.json), [diagnóstico previo](docs/onboarding-integration-preflight.json). El intento anterior conserva su FAIL por selector antiguo, sin atribuirlo al producto; el rechazo posterior por límite de diagnóstico no se eludió. No hubo más lanzamientos en esta tarea.

Desde Web: SUPER_ADMIN publicó una política sintética; la respuesta se perdió después del commit real y se recuperó por GET con la misma clave. Un POST, una versión/comando/evento, revisión 1→2 y cero duplicados. Registro independiente y confirmación por correo capturado; aceptación personal con tres casillas separadas; creación, JPEG/PNG, confirmación, presentación y revisión de identidad y bicicleta. Cinco previsualizaciones privadas y dos decisiones explícitas APPROVED. Aceptar solo conservó PENDING/OFFLINE, perfil PENDING, cero expedientes y admisión desactivada. Historia LOCAL_TEST visible e intacta al terminar. Sólo se sembraron la cuenta administrativa y la historia LOCAL_TEST; ninguna de las acciones nuevas del recorrido fue sustituida por escrituras directas.

Misma rama feature/driver-verification y HEAD fcc81e98e23b569723c78304caa6098e64b01963, índice vacío. Se preservó la implementación y todo el trabajo previo. Únicamente cambiaron tres scripts de arnés, documentación y evidencia: reportes incrementales, conteos durables, unidad/JPEG y aislamiento libpq. 24 de 27 archivos Web iguales a la entrada; los 3 distintos son arneses. 23 referencias backend sin cambios; las 27+23 huellas ejecutadas coinciden al cierre. Backend base 06457dedd9b2f533862a0477b04b36b69e1990f0 más cambios locales productivos, no modificado ni recompilado. No se repitieron 98 fixtures/tipos/lint/build ni baja/entrega/CANCELLED. Sintaxis PASS; evidencia JSON, enlaces y diff revisados.

PostgreSQL temporal identificado antes de migrar, Web/backend reales con configuración efímera y transportes simulados; sin Docker/.env/base principal/Spaces/correo reales. Browser, Vite, backend y clúster propios detenidos; ausencia de postmaster.pid y log de apagado comprobados. Ocho capturas integradas; tres saneadas conservadas. La prueba anterior de 320 px/teclado sigue histórica. Pendientes reales: publicar en el futuro backend compatible y migración, aprobación jurídica y preparación de infraestructura/operación; no aptitud productiva ni activación. FLEET y recuperación de aceptación no se acreditan como integración nueva. Limpieza V2/RESOLVED/Android-GPS fuera. Sin QA, commit, push, merge o despliegue; documentación nueva local sin commit. Las entradas inferiores preservan el estado anterior.

## 2026-10-19 — Web: contrato de alta documental productiva, sin activar

En feature/driver-verification, HEAD fcc81e98e23b569723c78304caa6098e64b01963, checkout inicialmente limpio. Backend sólo leído: 06457dedd9b2f533862a0477b04b36b69e1990f0 más alta productiva sin commit; 14 huellas de consulta y 31 fuentes de evidencia backend coinciden. [Informe completo](docs/DOCUMENTARY-ONBOARDING-PRODUCTION-WEB.md), [fuentes](docs/onboarding-production-web-sources.json), [evidencia final](docs/onboarding-production-web-evidence.json).

Política completa del servidor, aceptación personal y FLEET separadas, privacidad y finalidades con casillas propias, renovación ante versión nueva. Nueva /admin/verification-publications sólo SUPER_ADMIN, versiones inmutables, preview exacto, conflictos y recuperación PUBLISH_TERMS/POLICY propia; sin activar policy ni mezclar recibos de baja. Historia LOCAL_TEST preservada, sin promover aceptaciones/archivos/aprobaciones ni editar expedientes de otro entorno. JPEG/PNG, requisitos y revisión del servidor conservados. Ajuste mínimo de wrapping de botones a 320, sin rediseño.

98 casos únicos aprobados en 5 archivos completos por último resultado de cada archivo; tipos, lint, build y 8 capturas 1280/320 con teclado/foco/textos largos. Integración parcial con base temporal identificada: composición real y política ausente comprobadas; siguiente selector falló. El arnés corregido no se reejecutó tras rechazo automático por límite de diagnóstico; usuario delegó mejor opción y se mantuvo pendiente. Se continuó únicamente render sintético independiente. Cuatro clústeres propios detenidos; cero Docker/.env/Spaces/correo reales, modificaciones backend o activación. No se acredita el recorrido integrado incompleto. Incidencias preparatorias y de fixtures conservadas en informe.

No se repiten baja, entrega ni CANCELLED; código de esos recorridos, sesión y HTTP sin cambios. Continúan integración completa de alta, textos/autorización jurídica y preparación operativa, backend compatible, limpieza V2 real y RESOLVED separado; Android/GPS fuera. Sin QA, commit, push o despliegue. Documentación y cambios quedan locales; historial previo conservado.


## Estado actual — cierre local tras publicación manual, 2026-10-18

Completado el cierre documental local solicitado: [informe](docs/DOCUMENT-DELETION-WEB-STAGE-CLOSURE.md) y [correspondencia](docs/deletion-web-stage-closure.json). Web `feature/driver-verification`, HEAD `ef3df330cdd4c25a9d8416e16656287c50631b85`; commit manual único sobre a87081c, 30 archivos dentro del alcance revisado. Checkout inicialmente limpio; 29/29 candidatos y 38/38 comparaciones de evidencia vigentes, sin faltantes en 98 importaciones relativas. No se repiten suites ni recorridos.

Backend leído en `5907bca3555d06b0f981f61cd3c3d179f49a66e4`: 71/71 huellas del índice de publicación y 12/12 referencias de la última revisión Web coinciden con contenido local y blobs Git. Contratos de sesión, GET por clave, CANCELLED, V2, constancias, restricciones y mensajes compatibles en lectura. El delta backend frente a CANCELLED integrado se limita a currentMessage y tiene evidencia posterior de proyección. No es una ejecución integrada nueva de esta pareja de SHA ni valida versiones mezcladas. Su BITACORA/VERIFICATION y dos informes locales posteriores se preservan sin modificar; no se confunden con contenido del commit.

El usuario reportó publicación manual. Origin almacenado Web coincide con ef3df33 y backend con5907bca; **confirmación remota actual pendiente**. No se ejecutaron fetch/ls-remote ni se condicionó el cierre local al servicio de aprobación. Los fallos anteriores por capacidad son incidentes de herramienta, no rechazos de seguridad ni defectos de producto. El informe bloqueado anterior conserva su carácter histórico.

Pendientes: limpieza V2 real en Spaces, lifecycle RESOLVED separado, términos/privacidad y preparación operativa, integración restante V2/restore y coordinación del backend compatible antes de servir Web. Se conserva la brecha histórica de cinco huellas backend sin convertirla en una regresión Web. No se reabren entrega restringida, recibo depurado ni recuperación CANCELLED acreditados. Constancias de alcance acreditado, sin garantía de eliminación total; sin despliegue ni activación. Android/GPS fuera del cierre.

Historial de esta tarea: lecturas y contraste local de commits/huellas/contratos; revisión de dependencias y referencias; creación del informe/JSON y actualización de continuidad. En los ocho documentos publicados se revisan150 enlaces relativos:135 versionados y15 artefactos locales excluidos, todos existentes localmente; dos anclas válidas. Sólo cuatro archivos documentales Web locales **sin commit**, sin cambios de producto, backend, main/QA, otros worktrees, bases, Docker o Spaces.

## Historial — revisión para publicación de V2, 2026-10-18

Publicación autorizada exclusivamente en `feature/driver-verification`, remoto `origin` de Mandaria Web. HEAD inicial `a87081c6b6c91d8feef5598ec33db734ec7592e5`; fetch inicial sin divergencia (0/0). Checkout principal contiene los cambios vigentes y los arneses; otros worktrees y referencias main/QA preservados. Verificación documental/W-01, baja inicial, sesión restringida y los recorridos de entrega/recibo depurado ya estaban publicados.

Revisión de los 29 archivos pendientes de V2, decisiones CANCELLED y presentación de restricciones: código, pruebas, arneses, documentación y evidencia sintética. Sin cambios de producto durante esta revisión. Se añade sólo continuidad y [registro de publicación](docs/deletion-v2-publication-review.json). Exclusiones conservadas localmente: `.env`, dependencias, build y `test-results` con capturas/reportes crudos; ningún archivo ajeno eliminado.

Las 38 comparaciones de huellas de la evidencia final de restricciones coinciden. Las diferencias frente a evidencia histórica anterior están identificadas y cubiertas por las validaciones posteriores; el helper de navegador mantiene la reconciliación de líneas vacías ya publicada. Se reutilizan los resultados históricos de pruebas completas, tipos, lint, build y navegador, sin presentarlos como ejecuciones nuevas. No se repiten CANCELLED, entrega restringida ni recibo depurado. Nuevas comprobaciones: integridad de evidencia, enlaces, dependencias locales, sintaxis de tres arneses, revisión de secretos y `git diff --check`.

Publicación bloqueada por infraestructura de permisos: dos intentos de `git add` con los 13 archivos explícitos de producto/pruebas no llegaron a ejecutarse porque el revisor automático informó falta de capacidad del modelo. No fue una evaluación de inseguridad. Staged continúa vacío y HEAD permanece en el SHA inicial; cero commits nuevos y sin push. La autorización del usuario sigue vigente. Pendientes al restablecerse el servicio: staging/revisión de diff, commits de implementación/pruebas y de arneses/documentación, nuevo fetch, comprobación de avance seguro, push con refspec exclusivo y verificación de SHA remoto.

Web requiere contrato backend V2 y fix CANCELLED compatibles; un SHA backend por sí solo no identifica los cambios locales usados en las pruebas. Reapertura de tareas RESOLVED sigue pendiente backend. Revisión visual sintética no equivale a integración real; constancias parciales no garantizan eliminación total y el drenaje real en Spaces sigue pendiente. Publicar esta rama no despliega la aplicación ni acredita aptitud productiva. Sin merge, rebase, integración QA ni cambios backend/App/Landing.

## Historial — presentación de restricciones, 2026-10-18

Solicitud: corregir mensajes CANCELLED, detalle administrativo y etiqueta DRIVER con el contrato actual, sin tocar permisos, mutaciones ni recuperación. Rama feature/driver-verification y HEAD a87081c6b6c91d8feef5598ec33db734ec7592e5 conservados;25 archivos pendientes anteriores preservados. Lecturas y huellas previas antes de editar. Backend sólo leído; su servicio ya contenía una corrección separada al tomar huellas y el análisis se actualizó durante esta tarea. Ese trabajo no se atribuye a Web.

CANCELLED prioriza BLOCKED; después RESTRICTIONS_UNDER_REVIEW; otros motivos/null/desconocido piden consultar restricciones, sin «revisión completada». OperationalReview separa tarea, active, última decisión/fecha/motivo y próxima revisión. KEEP vencido sigue activo y decidido, fecha ausente no se inventa y datos insuficientes/contradictorios permanecen neutrales. DRIVER=Conductor sólo en este mapa, sin inferir modalidad. Reapertura de tarea RESOLVED permanece pendiente backend; no se compensa en Web.

89/89 pruebas en dos archivos completos (57+32), tipos/lint/build y sintaxis PASS. Comparación de lógica de acciones, formulario completo, validación temporal y mensajes de otros objetos: idénticos. Hashes de recuperación/HTTP/sesión/contratos conservados. Navegador sintético final PASS con14 capturas1280/320, foco y sin overflow; cero mutaciones o GET de recibo, backend no iniciado. Primera revisión visual PASS; final añade captura de tarea y ajuste de fixture, sin duplicar conteos. Chunk Root714.49kB mantiene advertencia existente.

[Handoff](docs/RESTRICTION-REVIEW-WEB.md), [evidencia](docs/restriction-review-web-evidence.json), [fuentes](docs/restriction-review-web-sources.json). Hallazgos Web anteriores corregidos; evidencia real de recuperación permanece histórica. No se repiten entrega/depuración/restauración/Spaces ni cuatro pérdidas. Vite/Chromium propios cerrados; sin backend, datos reales, .env, Docker, QA, commit, push o despliegue. Constancias parciales, drenaje real pendiente; sin aptitud productiva acreditada.

## Historial — recuperación CANCELLED, 2026-10-18

Rama y HEAD conservados: feature/driver-verification, a87081c6b6c91d8feef5598ec33db734ec7592e5. Se preservan los 20 archivos pendientes V2 anteriores. Backend b300c25 más fix local CANCELLED consultado/ejecutado sin modificar; 15 huellas fuente/compilado/contrato verificadas antes y después. Sin staging, commit, push, QA o despliegue.

Lector único de recibos admite APPLIED/CANCELLED validado por backend y mantiene fotografía histórica explícita. Habilitados ACKNOWLEDGE_TASK, REVIEW_RESTRICTION KEEP/RELEASE y bloqueo global, con permisos/asignación/revisión/motivo/evidencia/confirmación existentes. Restauración, adopción cancelada y actuación puntual sin autorización no se abren. Sin cambios en sesión, HTTP ni marcadores. Recibo no disponible conserva incertidumbre y clave; nunca autoriza nuevo POST.

Validación nueva: consolidado final87 casos únicos en tres archivos completos (22+32+33); tipos, lint, build y sintaxis PASS. Preflight real PASS. Primer recorrido completo FAIL en precondición solapada409, diagnosticado y corregido sólo en el arnés; siguiente ejecución PASS con reporte. Cuatro decisiones desde Web con commit comprobado por otra conexión antes de cortar respuesta, recarga y GET original APPLIED/CANCELLED. Cuatro comandos/eventos, sin POST extra; GET repetidos sin efectos y otro administrador404. Recibo histórico5 separado de detalle6 por KEEP real. Cuenta permanece inactiva, plazos/presupuestos intactos y gates independientes conservados.18 capturas en1280/320, teclado/foco y ausencia de overflow.

Revisión visual: defecto CANCELLED-CURRENT-MESSAGE después de bloqueo global, estado BLOCKED/AUTHORIZATION_UNDER_REVIEW con dos gates activos pero mensaje «revisión completada». Backend y traducción Web comparten la prioridad problemática; documentado sin corrección backend. La clase DRIVER tiene etiqueta genérica previa. Estos pendientes impiden declarar toda la presentación aprobada, aunque los cuatro recibos se recuperaron correctamente.

[Handoff y reproducción](docs/CANCELLED-COMMAND-RECEIPT-WEB.md), [evidencia saneada](docs/cancelled-receipt-web-evidence.json), [fuentes](docs/cancelled-receipt-web-sources.json). Servicios/PG propios detenidos, backend sin cambios, Docker43000/Spaces/servicios ajenos no usados. Entrega, recibo depurado, restauración y suites generales V2 no se repiten. Backend completo con fix antes de Web; despliegue mixto no probado. Constancias parciales, drenaje Spaces pendiente, sin eliminación total ni aptitud productiva acreditada.

## Historial — adaptación Web al contrato operativo V2, 2026-10-18

Rama `feature/driver-verification`, base y HEAD conservado `a87081c6b6c91d8feef5598ec33db734ec7592e5`. Árbol inicialmente limpio; implementación vigente localizada en checkout principal, sin tocar otros worktrees. AGENTS.md ausente en Web; continuidad y fuentes backend leídas. Backend read-only b300c25 más cambios locales V2; once huellas registradas y sin cambio al cierre.

Solicitud: revisiones de residuos, incidencias posteriores a H y revisión selectiva de restricciones. Matriz previa y límites en [handoff V2](docs/DOCUMENT-DELETION-V2-WEB.md). Implementados seguimiento propio/privado/constancias con proyección segura, revisión por objeto y acciones reales con confirmación, asignación, motivo y fecha según contrato. H histórico permanece separado; sin reactivación ni restauración implícita. Sondeo opt-in30s con parada en error/permiso/desmontaje; worker sin incremento de revisión refresca resumen desde work-items. Las decisiones CANCELLED quedan bloqueadas por falta de proyección recuperable backend.

Verificación final: 91/91 pruebas en cuatro archivos completos; tipos, lint y build PASS. Navegador sintético en1280/320 con teclado/foco, campos inválidos, conflicto sin reenvío y otra restricción intacta. Evidencia saneada, capturas locales y hashes en [deletion-v2-web-evidence.json](docs/deletion-v2-web-evidence.json). Reportes de desarrollo conservados; fallo inicial de selector del arnés corregido, sin aborto nativo ni resultados sin reporte. Chunk Root712.72kB sigue sobre500kB, advertencia conservada.

Historial de esta tarea: preparación/lecturas y matriz antes de código; proyecciones V2 y formularios; regresiones y arnés sintético; ajuste visual para situar incidencia al inicio; documentación y comprobación final. Corrección mínima del listado: callback explícito impide pasar índice como revisión mínima. No cambios en sesión/HTTP, entrega, marcadores o proyector de recibos. Entrega restringida/recibo depurado permanecen históricos, no se repitieron ni se presentan como nueva integración V2.

Pendiente: contrato recuperable para decisiones sobre canceladas, historia de observaciones/incidencias no expuesta, integración V2 en base nueva aislada. Constancias parciales, drenaje real en Spaces pendiente; no acredita eliminación total ni aptitud productiva. Sin backend, .env, Docker43000, QA, commit, push o despliegue. Cambios anteriores y temporales ajenos conservados.

## 2026-10-13 — Verificación documental local desde main

Creada esta continuidad en el worktree nuevo porque main no tenía BITACORA.md. Se conserva íntegro el historial de README/VERIFICATION y se trae únicamente el análisis documental previo con una actualización que distingue su fotografía histórica del working tree implementado actual. No se copiaron módulos QA.

- Rama feature/driver-verification; base/HEAD main `06d976619322d9811b5325fc73cd16d15e00d829`.
- Backend read-only HEAD `90b72433f8a5476ece5fda4437dc15a0a6a314f2` más implementación sin commit, huellas en [informe](docs/DRIVER-VERIFICATION-WEB.md).
- Registro/correo/login seguro, términos personales/FLEET separados, identidad/licencia, unidades propias/rentadas/prestadas, evidencias privadas, presentación/retiro/corrección y decisión SUPER_ADMIN, notificaciones y recuperación implementadas.
- Marcador mínimo por origen/actor, cuerpo no persistido, ABSENT no significa fracaso, cierre explícito y estado vigente separado del recibo. No replay automático.
- Tipos provider nullable, continuidad de servicio independiente comprometido y traducción de rechazos de nueva asignación. Onboarding sin APIs QA; recuperación operativa histórica no se descarta ni se invoca contra main.
- Validación focalizada y capturas sintéticas documentadas en [VERIFICATION](VERIFICATION.md). Fallos ordinarios de fixtures/expectativas y tipos detectados durante desarrollo corregidos; no se acreditan ejecuciones fallidas ni se duplican conteos.
- Integración real pendiente: el backend reportó su cluster temporal detenido; no se usó base desconocida ni se iniciaron Docker, correo o almacenamiento externos. Sin datos/documentos reales, activación, modificaciones backend/App/Landing, commit, push o despliegue.

## Contexto conservado fuera de esta rama

QA del checkout principal en `e3037397ecb6c6b086fd70c4d78f69f9a9a13cfe`, modificaciones anteriores de README/BITACORA/VERIFICATION y análisis sin alterar. Sus versiones y pruebas no se atribuyen a esta rama main.


## 2026-10-13 — Corrección W-01 de carga documental

En feature/driver-verification HEAD06d9766 se reprodujo la limpieza de B al terminar A antes de cambiar producto: tres casos fallaron por selección vacía y uno por error no identificado. Form ahora limpia por generación de selección y atribuye mensajes al archivo enviado; Evidence remonta estado por actor/expediente e interrupciones no anuncian éxito. Conserva selección editable, un solo envío, JPEG/PNG, contrato y recuperación.

35/35 pruebas focalizadas (8 nuevas +27 previas), tipos, lint y build aprobados; cinco checks de Chromium con respuestas controladas y capturas revisadas escritorio/móvil, teclado. Son mocks; backend y almacenamiento reales no ejecutados. No hubo aborto. Historial, evidencia detallada, comandos, límites y handoff para repetición integrada: [VERIFICATION](VERIFICATION.md#2026-10-13--w-01-selección-posterior-durante-carga-documental). Cambios previos preservados; sin backend, QA, commit/push/despliegue.

## 2026-10-16 — Baja documental Web

Rama vigente feature/driver-verification, base/HEAD 56c7bad0524cbbf05b45fa687a8ec625694a6ca0;
árbol inicialmente limpio con W-01. Backend consultado sólo en lectura en
b300c250df9fcc4aea8bcd76a1d6ed7c93e04e9a más cambios sin commit; 12 huellas guardadas
y verificadas al cierre. Matriz previa, solicitud/confirmación, seguimiento propio,
consulta privada, constancias backend parciales y decisiones administrativas
implementados. No se simulan drenaje, H, facultades, eliminación de backups ni
recuperación ausente del contrato.

Marcadores mínimos por cuenta/API/operación; cuerpo sólo en memoria para replay
administrativo explícito. 404 no descarta incertidumbre; logout no borra intentos.
Limitaciones de `/auth/me`, listado propio, recibos administrativos y catálogos
documentadas en [informe](docs/DOCUMENT-DELETION-WEB.md). Validación completa y
evidencia sintética en [VERIFICATION](VERIFICATION.md); integración real pendiente.
Sin backend/PostgreSQL/Spaces real, QA, commit, push ni despliegue.

## 2026-10-17 — Compatibilidad de sesión y recibos administrativos

Se conservaron los cambios locales de baja en feature/driver-verification (HEAD
Web56c7bad). Adaptación al backend b300c250 más correcciones sin commit confirmadas
por fuentes, OpenAPI, artefactos compilados y respuestas HTTP reales. Identidad
STANDARD/DELETION_RESTRICTED separada, contexto/caché actualizados, navegación mínima
y canal privado no bloqueado por bootstrap. GET de recibo para resolve/retención/
restore con intención mínima persistida; sin replay automático ni almacenamiento
paralelo de recibos. Historial anterior conservado, bloqueo de cancelación intacto.

152 pruebas focalizadas aprobadas en 7 archivos completos, tipos y lint aprobados.
Recorridos A/B en Chromium/Nest/PostgreSQL reales: identidad restringida sin logout
por403; un comando/evento tras commit y pérdida de respuesta; recuperación GET tras
recarga, otro administrador404, revisión histórica2 separada de actual3. Base
sintética nueva con esquema existente, datos preservados; servicios propios detenidos.
13 huellas backend sin cambios. Recibo depurado sólo simulado; servicio comprometido
real y Spaces pendientes. No se repitieron suites backend ni generales, ni se
modificaron migraciones/.env/permisos reales/QA. Sin commit/push/despliegue/activación.
[Informe y reproducción](docs/DOCUMENT-DELETION-COMPATIBILITY-WEB.md),
[evidencia saneada](docs/deletion-compatibility-evidence.json), [validación](VERIFICATION.md).

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

# Bitácora Mandaria Web

## 2026-10-13 — Compatibilidad documental Driver/Vehicle sobre backend main

Estado actual: análisis finalizado, implementación no iniciada. Web QA `e303739`, checkout principal limpio al inicio; backend feature/driver-verification/main `1fa2cb1` con 32 migraciones, QA `9ad39b9` con 46, comparados sólo lectura. Referencias locales sin fetch. [Informe completo](docs/DRIVER-VERIFICATION-MAIN-COMPATIBILITY.md).

Cierre: avance concurrente backend documental a `90b7243` y QA a `674e172`; diff de código/prisma y OpenAPI comparado vacío respecto a las referencias iniciales. Matriz contractual sin cambio; backend limpio al cierre. No se hicieron esos commits desde esta tarea.

Solicitud: contrastar contratos y diseñar registro/revisión de independientes y flotillas sin integrar QA. Cambios: sólo informe, BITACORA, README y VERIFICATION. Recomendación futura: Web main `06d9766` con adaptación explícita de rutas DETAILED/recuperación aún presentes; no compatibilidad integral acreditada. Bloqueos: provider null/alta DRIVER, expediente privado versionado por identidad/unidad, notificación durable, recuperación propia y decisiones de transición/purga. Existentes, servicios comprometidos y cinco intentos preservados.

Verificaciones NUEVAS: Git refs/status/diff/tree, controladores/DTO/proyecciones y OpenAPI main/QA, consumidores/rutas/guards; revisión documental. No pruebas funcionales, HTTP/DB, navegador, suites, tipos/lint/build, instalaciones ni servicios. Evidencia histórica siguiente no acredita onboarding nuevo. Sin cambios backend/app/configuración, merge, commit/push/despliegue ni mensajes a agentes.

## 2026-10-13 — Presentación del cierre de ejecución

Checkout: `C:/Users/zorgl/Documents/mandaria-frontend`, rama `QA`, base `2e595048cf62cce4d8ed47ca6ac69140f2012fc8`; limpio al iniciar. AGENTS.md no existe en este checkout. Se revisaron BITACORA, README y VERIFICATION.

- Causa: ExecutionProgress identificaba el paso actual sólo por phase, aun con custodia terminal. Ahora DELIVERED/RETURNED trasladan el resaltado y aria-current="step" al cierre; AT_DROPOFF conserva su significado de último hito y todos los hitos siguen visibles. RETURNED mantiene el texto diferenciado de devolución. Sin cierre, la fase continúa siendo actual incluso sin asignación/acciones: no se infiere entrega.
- Archivos: src/execution/components.tsx, src/test/execution.test.tsx, scripts/verify-execution-terminal.mjs, BITACORA.md y VERIFICATION.md. Se reutiliza el CSS existente. Revisión estática de consumidores: dispatch/pages.tsx (proveedor), dispatch/admin.tsx (administración), driver-portal/pages.tsx (repartidor/independiente), execution/incidents.tsx (incidencias), directamente o mediante ExecutionPanel. Sin cambios de permisos, operaciones, historial ni contratos.
- `npx vitest run src/test/execution.test.tsx`: archivo completo, 40/40 aprobadas (tres casos nuevos: entregado, devuelto y transición desde destino sin entrega).
- `npx eslint src/execution/components.tsx src/test/execution.test.tsx scripts/verify-execution-terminal.mjs`: aprobado.
- `npm run typecheck:test`: aprobado. `npm run build`: TypeScript y Vite aprobados; advertencia de chunk mayor de 500 kB, existente.
- `node scripts/verify-execution-terminal.mjs`: Chromium con fixtures del componente, 1440 y 390 px. Un único aria-current coherente por estado, sin errores de render ni desbordamiento. Capturas revisadas: test-results/execution-terminal/1440.png y 390.png. Lista semántica conservada; no se añadieron controles ni tabulaciones artificiales.
- Límites: evidencia nueva frontend sintética, separada de las verificaciones históricas siguientes. No acredita integración backend, pantallas completas con sesión, lector de pantalla, móvil físico ni VM. No se consultó ni entregó MDR-000002; no se modificaron servicios reales. Servidor visual temporal detenido. Sin backend, configuración, commit, push o despliegue.

## Estado actual — 2026-10-12

Checkout principal `C:/Users/zorgl/Documents/mandaria-frontend`, **QA** sobre `a5fe19a6c0375207e552f1b04580ba7bbe04b3e7`. Aprobación manual de cuenta Negocio implementada localmente contra el contrato backend publicado `9ad39b9`. Índice sin cambios preparados. Sin commit/push/despliegue.

### Solicitud

Implementar y validar el contrato comercial aprobado, manteniendo los cambios anteriores del logo/diseño/documentación y la continuidad logística V1.17/V1.18.

### Cambios

Nuevo módulo interno customer-business, solicitud e historial propios, decisión/acceso administrativo SUPER_ADMIN, registro/anexión Personal, orientación de token REGISTER antiguo y descenso por Receipt. Recuperación comercial separada de logística, marcadores mínimos, sesiones aisladas, exact replay sólo con cuerpo original, GET/close y refresco de estado actual. Nuevas rutas y CTA `/customer/business`.

### Verificaciones y resultado

155 pruebas frontend distintas en 11 archivos focalizados, TypeScript, lint pertinente y build aprobados; revisión Chromium con API sintética a 1440/390 y registro/perfil a 1440/1000/390, teclado y capturas locales. Resultados y comandos en [VERIFICATION](VERIFICATION.md). No prueba real de backend/DB/VM; 69/69 backend se conserva sólo como antecedente publicado.

### Pendientes y límites

Responsables del entorno deben comprobar backend compatible/migración46 y despliegue; ninguna activación realizada aquí. Aviso de tamaño de chunk Root (~763 kB) conservado. No hay cambio backend solicitado o incompatibilidad bloqueante demostrada por la revisión estática. Protección de marcadores limitada al navegador/origen, autoridad final backend.

### Continuidad preservada

BITACORA no existía en la raíz al comenzar; el historial anterior permanece en README, VERIFICATION, docs/V1.17-WEB y la propuesta comercial, ahora rotulada como histórica. Procedimiento y archivos en [implementación](docs/BUSINESS-APPROVAL-WEB-PROPOSAL.md).

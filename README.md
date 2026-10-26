## 2026-10-25 — UNREACHABLE con doble aprobación verificado

ASSISTED_RELEASE/NEW_ACTION/UNREACHABLE aplicado por HTTP local: dos administradores distintos, un único reembolso; dos sesiones de la misma identidad no bastan. **16/16 HTTP PASS**, **93/93 regresiones PASS**, entorno cerrado. Backend utilizado1.13.3/f2f942e por trabajo ajeno; Web1.11.0 intacta. [Evidencia y límites](docs/ASSISTED-RELEASE-UNREACHABLE-HTTP-VERIFICATION.md). Sin backend/móvil, commit/push o despliegue. Historia inferior preservada.

## 2026-10-25 — ACCESS_RECOVERED completo en HTTP local

Aplicación, consulta de recibo y replay verificados: una resolución, sesión válida y servicio ACTIVE sin liberación/reembolso. HTTP nuevo **15/15 PASS**; regresiones focalizadas **93/93 PASS**; entorno cerrado y backend intacto. [Recorrido y evidencia](docs/ACCESS-RECOVERED-HTTP-VERIFICATION.md). Web1.11.0 sin cambios; sin commit/push o despliegue. Las cifras globales inferiores son históricas.

## 2026-10-25 — Verificación completa de EXISTING_RELEASE

HTTP local nuevo **14/14 PASS**: liberación existente acreditada con inventario, confirmaciones, revisión y replay, sin repetir liberación/reembolso. Corregido el refresco de permisos con igual revisión. Suite global nueva **1597/1597**, tipos/lint/build PASS; Web1.11.0 intacta. [Recorrido, evidencia y límites](docs/EXISTING-RELEASE-HTTP-VERIFICATION.md). Sin backend/móvil, commit/push ni despliegue. Las entradas inferiores conservan la historia previa.

## 2026-10-25 — QA conjunta y referencias administrativas

QA conserva los commits B2B `263a4b9` y zonas `b55f772`. Verificación conjunta nueva:1566/1566; tras integrar las referencias administrativas, suite global1596/1596 en79 archivos, tipos/lint/build PASS. Web1.11.0 intacta, sin commit/push o despliegue. HTTP local nuevo: 12/12 comprobaciones, entorno sintético cerrado. Referencias SUPER_ADMIN con intención privada en memoria y recuperación durable sin cuerpos sensibles; proveedor/movementContext y zonas conservados. Contratos, evidencia HTTP sintética y límites (incluido EXISTING_RELEASE completo pendiente) en [integración administrativa](docs/FLEET-ASSISTANCE-ADMIN-REFERENCES-WEB.md) y [VERIFICATION](VERIFICATION.md). Historia previa conservada.

## 2026-10-25 — Revisión y commit separado QA de zonas del independiente

Diff de zonas revisado sobre QA263a4b9, conservando el commit B2B separado. SUPER_ADMIN usa profileId real, catálogo activo paginado y protocolo de ofertas con requestId en body; intención cifrada y replay exacto, conflicto con revisión explícita y lista vacía confirmada. Se incluyen la estabilización de fixtures/etiquetas y maxWorkers4 documentados. Sin cambios adicionales de código de producto durante esta revisión.

Nueva comprobación: `npx vitest run src/test/independent-zones-api.test.ts src/test/independent-zones.test.tsx src/test/driver-portal.test.tsx src/test/delivery-assignments-api.test.ts src/test/delivery-assignments.test.tsx`:107/107 PASS,5 archivos. Las34 huellas anteriores de fuentes/evidencia verificadas coinciden (se excluyen los dos documentos compartidos de continuidad ampliados por B2B). HTTP18/18 PASS con cierre confirmado y backend intacto se reutiliza, no se reejecuta. Suite global1563/1563, tipos/lint/build previos permanecen como evidencia histórica, no nuevos resultados de esta revisión. Android UI sigue pendiente.

Commit local autorizado de zonas, pruebas, evidencia HTTP, handoff y continuidad; versión Web1.11.0 intacta. Manifiesto actualizado con huellas de revisión y Git, manteniendo la evidencia de la ejecución original. Sólo se normalizan espacios finales de logs y EOF documental para el diff; no se alteran comandos/resultados. Sin backend/móvil, push, publicación, despliegue ni activación. Historial inferior preservado.

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

> [Publicación administrativa sin alta: validación local](docs/PUBLICATION-WITHOUT-INTAKE.md). Requiere backend runtimeEnvironment; sin publicación ni despliegue.

> **2026-10-20 — cierre local de conservación:** Cierre conjunto completado en feature/driver-verification, HEAD 97850b8c447c71d6ae245bc8df3ce46413650da2 conservado, worktree fleet-representative-web. Contrato backend nuevo consumido en expediente y seguimiento: fechas desconocidas/no accesibles, excepciones con revisión/vigencia, historia depurada e incidencia posterior. Se preservan recuperación, caché y acciones. [Matriz y evidencia](docs/RETENTION-WEB-PUBLICATION-REVIEW.md). Configuración productiva y publicación no ejecutadas.

# Mandaria Web — V1.11-B

## 2026-10-20 — Cierre de publicación y referencia backend confirmada

Expediente y evidencia A–F publicados en Web `6bdeda4021bf01d822746b97189759ba0cf07d7a`, remoto comprobado. Backend compatible identificado localmente en `2c458fc955f699ce958dabf5fe89dcc58892a031` por correspondencia de fuentes/contrato/migración con las huellas del ensayo; no una prueba nueva de la pareja de SHA. [Cierre y pendientes](docs/FLEET-REPRESENTATIVE-WEB.md). Textos autorizados, entorno real y preparación operativa pendientes; sin despliegue, recepción real ni activación. Los apartados inferiores conservan el estado histórico, incluido el SHA backend antes pendiente.

## 2026-10-19 — Revisión para publicar el expediente del representante

Expediente privado, recuperación y corrección de selección durante reconsulta de privacidad revisados para publicar sólo la rama autorizada. [Inventario y comprobaciones](docs/fleet-representative-publication-review.json), [informe A–F](docs/FLEET-REPRESENTATIVE-WEB.md). Evidencia existente reutilizada, sin repetir suites. Requiere el backend compatible todavía sin commit, sus huellas/migración y textos autorizados. Publicar la rama no despliega ni activa recepción. Las entradas siguientes son historia de los ensayos.

## Representación privada: integración A–F cerrada — 2026-10-19

A–F completos en un ensayo reanudado sobre la misma base sintética: expediente privado, revisión SUPER_ADMIN, FLEET separado, recuperación sin duplicados, aislamiento y restricciones. Google Chrome 155 instalado sustituyó el launcher que fallaba; la causa raíz de `spawn UNKNOWN` del Chromium anterior sigue sin determinarse. Una corrección mínima conserva el archivo pendiente durante la reconsulta de privacidad, manteniendo los envíos bloqueados hasta terminar. 40 pruebas focalizadas ejecutadas, tipos/lint/build PASS; las 130 anteriores no se repitieron en bloque. Escritorio/320 px y teclado comprobados. [Informe, fallos preservados y límites](docs/FLEET-REPRESENTATIVE-WEB.md) · [Evidencia integrada](docs/fleet-representative-integration-evidence.json). Procesos propios detenidos, base sintética conservada; sin backend modificado, QA, commit, push, despliegue ni activación. Requiere backend compatible, textos autorizados y preparación operativa antes de recepción real. Las entradas inferiores son históricas.

## Expediente privado de representación — 2026-10-19

Implementación local en `feature/driver-verification`, worktree `C:/Users/zorgl/.codex/worktrees/fleet-representative-web/mandaria-frontend`, base `e657e715cadb1d6727fbde55a9202b6deaa2fdb9`. El checkout principal permanece en main y conserva su documentación previa. Entrada propia `/verification/representatives`, detalle documental existente y administración SUPER_ADMIN `/admin/fleet-representatives`. Privacidad previa, evidencias privadas, revisión y aceptación FLEET permanecen separadas de admisión y servicios.

[Informe contractual, rutas y reproducción](docs/FLEET-REPRESENTATIVE-WEB.md) · [Evidencia saneada](docs/fleet-representative-web-evidence.json). 130 pruebas focalizadas PASS, tipos/lint/build PASS. Integración y visual pendientes: Chromium abortó con `spawn UNKNOWN`; el único diagnóstico adicional reprodujo el fallo sin backend/base. El entorno aislado se preparó y cerró; ningún recorrido de navegador se acredita. Requiere el backend local de representación aún sin commit, sus huellas/migración y revisión autorizada de textos. Sin recepción real, admisión, QA, cambios backend, commit, push ni despliegue. Las entradas siguientes conservan el historial.

## Representación legal de flotilla — propuesta documental, 2026-10-19

[Inventario, wireframes A–F y handoff de implementación](docs/FLEET-REPRESENTATIVE-WEB-PROPOSAL.md). Diseño de acceso por vínculo, privacidad personal antes de archivos, acreditación SUPER_ADMIN y aceptación FLEET posterior, separado de conductor/unidad y coordinación operativa. Depende del contrato final backend: se inspeccionó código candidato en curso, todavía distinto de OpenAPI, sin informe final ni publicación acreditada. El handoff delimita recuperación postrevocación y otras confirmaciones necesarias. No hay componentes, rutas, fixtures ni pruebas Web nuevas; no recibir poderes mediante los expedientes actuales. Sólo inspección estática y documentación local, sin publicación o activación. Las evidencias históricas siguientes no acreditan este flujo.

## Publicación de la rama documental — revisión del 2026-10-19

La adaptación de alta documental, sus pruebas y el ensayo A–H se revisan para publicar exclusivamente `feature/driver-verification`. [Inventario y correspondencia previa al commit](docs/onboarding-production-publication-review.json). Se conserva el PASS histórico del recorrido aislado y de las 98 pruebas: no se ejecutaron de nuevo. El backend compatible se identifica por contrato, migración y huellas probadas; su commit final no se ha confirmado en esta revisión. Publicar esta rama no despliega Web ni activa operaciones. Las entradas siguientes conservan las etapas anteriores.

## Alta documental: ensayo integrado completado — 2026-10-19

PASS en el recorrido A–H solicitado: publicación SUPER_ADMIN y recuperación tras respuesta perdida sin duplicados, registro independiente/correo capturado, consentimientos separados, JPEG/PNG, presentación y revisión de identidad y unidad. Aceptar no aprobó ni habilitó; LOCAL_TEST conservó su historia. Una ejecución autorizada con Web/backend reales y PostgreSQL temporal identificado, correo/almacenamiento simulados. [Informe y pendientes actuales](docs/DOCUMENTARY-ONBOARDING-PRODUCTION-WEB.md), [evidencia integrada](docs/onboarding-production-integration-evidence.json). No se repitieron 98 pruebas con fixtures. Se requiere el backend compatible con sus cambios locales y migración, textos aprobados y preparación operativa; no acredita aptitud productiva general. Sin cambios de producto/backend, QA, commit, push, despliegue o activación. La entrada inmediatamente inferior conserva el estado histórico anterior a este cierre.

## Alta documental: contrato productivo — 2026-10-19

Web adaptada localmente a publicaciones inmutables SUPER_ADMIN, términos/privacidad/consentimientos separados y transición de historia LOCAL_TEST. La publicación no activa la admisión ni aprueba expedientes. Requiere el backend con el contrato productivo aún sin commit; no basta su SHA base. [Informe, pruebas y límites](docs/DOCUMENTARY-ONBOARDING-PRODUCTION-WEB.md). 98 casos únicos focalizados aprobados, tipos/lint/build y revisión visual 1280/320. Integración real parcial: composición y política ausente comprobadas; recorrido completo pendiente por el límite de ejecución del arnés. Sin backend modificado, QA, commit, push, despliegue o activación. La entrada LOCAL_TEST inferior se conserva como historial.


## Verificación documental de prueba — 2026-10-13

Implementada desde main en `feature/driver-verification`, sin integrar QA ni activar backend. Incluye registro independiente sin proveedor, correo/términos LOCAL_TEST, expedientes y unidades, archivos privados JPEG/PNG, bandeja SUPER_ADMIN y recuperación mínima ante respuesta perdida. No apto para producción ni documentos reales.

- DRIVER: `/driver/register` → `/driver/verify` → `/login?next=onboarding` → `/driver/onboarding`.
- PROVIDER_ADMIN: `/provider/verification`, proveedor autorizado y aceptación del representante separada de la personal del conductor.
- SUPER_ADMIN: `/admin/verification-cases`; revisión explícita, nunca aprobación por sólo cargar archivos.
- Detalle: `/verification/cases/:id`; comprobante histórico: `/verification/acceptances/:id`.

[Implementación, contratos, privacidad, recuperación y handoffs](docs/DRIVER-VERIFICATION-WEB.md) · [Compatibilidad main e historial](docs/DRIVER-VERIFICATION-MAIN-COMPATIBILITY.md) · [Verificación y límites](VERIFICATION.md).

No se agregaron dependencias ni se cambiaron configuración o versión. El cliente existente añade `/api/v1`; para una futura prueba real usar únicamente un origen local identificado según configuración vigente. No habilitar flags con estas instrucciones. La revisión reproducible `node scripts/verify-documentary-web.mjs` es sintética, no lee .env y detiene su Vite temporal; no acredita backend/PostgreSQL/Spaces reales.

## Diseño: validación documental de repartidores y unidades (2026-10-13)

[Compatibilidad Web con backend main y propuesta por etapas](docs/DRIVER-VERIFICATION-MAIN-COMPATIBILITY.md). Sólo análisis: registro independiente sin proveedor, expedientes privados de identidad/unidad y revisión exclusiva SUPER_ADMIN aún requieren contrato backend. Para una futura rama se recomienda Web main `06d9766` con ajustes explícitos de capacidades; también contiene superficies DETAILED incompatibles con backend main, por lo que no se acredita compatibilidad general. QA se conserva sin integrar ni modificar producto. Referencias, límites y continuidad en BITACORA/VERIFICATION.

## Cuenta Negocio: aprobación manual (2026-10-12)

Implementación local sobre backend QA `9ad39b9`: registro/anexión Personal, solicitud comercial propia, revisión exclusiva SUPER_ADMIN, revocación/readmisión y recuperación comercial durable. Ruta estable para Landing: **`/customer/business`**; visitante pasa por login y vuelve a esa ruta, sin perfil se orienta a anexión/verificación, con pendiente o restricción se muestran los límites reales. No implica despliegue ni activación.

[Implementación, rutas y procedimiento de recuperación](docs/BUSINESS-APPROVAL-WEB-PROPOSAL.md), [resultados](VERIFICATION.md) y [bitácora](BITACORA.md). La propuesta histórica permanece al final del documento. Campos comerciales ausentes bloquean nueva demanda; aceptación/seguimiento de servicios comprometidos mantienen sus fuentes existentes. No borrar el marcador de un intento incierto ni reenviarlo con otra clave. La revisión visual usa APIs sintéticas, no backend real.

## Mis envíos — listado (2026-10-12)

Listado responsive con capacidad y solicitud activa reales, tabla navegable completa, paginación, carga y vacío. Conserva las reglas de alta y recuperación; muestra únicamente los estados disponibles en la API del listado. [Continuidad](docs/V1.17-WEB.md) y [verificación](VERIFICATION.md).



## Confirmar y seguimiento — Paso 3 (2026-10-12)

Nuevo diseño del detalle MDR con estado real, seguimiento, enlaces temporales, pago, autorización explícita y cancelación desplegable. En móvil la autorización aparece primero. Vencimiento y custodia conservan bloqueos; el historial visual se limita al último registro disponible en el contrato. No se inventan eventos ni confirmaciones de cobro. [Continuidad](docs/V1.17-WEB.md) y [verificación](VERIFICATION.md).



## Detalles de la solicitud — Paso 2 (2026-10-12)

Rediseño del contenido con tarjetas, resumen y precio real, validación inline, caducidad y retorno a cotización conservando coordenadas/paquete. Valor de mercancía obligatorio sólo con adelanto; pagador en recogida sólo si lo indican los términos. Nombre del perfil automático y editable, con restauración explícita en el nuevo diseño. Sin cambio de contratos ni persistencia de contactos. [Continuidad](docs/V1.17-WEB.md) y [verificaciones](VERIFICATION.md).


## Cotizar envío — diseño Paso 1 (2026-10-11)

Nuevo contenido de `/customer/new`: ruta, paquete y resumen vivo, controles accesibles y responsive, Figtree local. Autocompletado mediante Places API (New), reutilizando la clave Maps Web; requiere habilitar esa API y revisar sus restricciones/cuotas. No se cambia configuración desde este trabajo. La descripción histórica de búsqueda únicamente por botón queda sustituida en Paso 1; Paso 2 conserva geocodificación inversa editable y nombre automático del perfil. [Contrato y continuidad](docs/V1.17-WEB.md). Verificación con Google/API simulados; pendiente recorrido real de Places.


## Cotización de cliente: origen y destino — 2026-10-09

En `/customer/new`, cada punto se elige buscando una dirección y seleccionando un resultado, usando la ubicación del dispositivo bajo permiso, o haciendo clic en Google Maps. También se puede mover el mapa con teclado y confirmar el centro. Ningún punto está seleccionado por defecto; editar la búsqueda invalida el anterior. La consulta se ejecuta al pulsar Buscar/Enter, no en cada tecla.

Reutiliza `VITE_GOOGLE_MAPS_API_KEY` y el cargador existente; requiere Maps JavaScript API y **Geocoding API** habilitadas para la misma clave/proyecto, con restricciones web por referente y APIs autorizadas. [Documentación oficial del geocodificador](https://developers.google.com/maps/documentation/javascript/geocoding). No se modificaron claves, `.env`, dependencias ni configuración de Google. La geolocalización requiere permiso del navegador y contexto seguro (HTTPS o localhost). Sin clave, mapa/búsqueda se indican no disponibles; ubicación del dispositivo permanece como alternativa.

Se envían únicamente las coordenadas seleccionadas como PICKUP/1 y DROPOFF/2 al comando existente de precotización, redondeadas a seis decimales conforme al normalizador backend. Direcciones/contactos de la solicitud definitiva se completan en la conversión existente; no se agregan campos al DTO de precotización. Sin precios ni rutas calculados por frontend. Validación local con fixtures; Google real y cotización backend real pendientes: ver VERIFICATION.

## V1.18 Web — GPS y enlaces temporales (local)

Detalle cliente con posición/frescura y gestión de enlaces; `/track` anónimo con secreto sólo en memoria y `/developers/location` B2B. Recuperación propia de V1.18, sin reutilizar estados V1.17. Contratos, privacidad, procedimiento, validación y pendientes: [V1.18-WEB](docs/V1.18-WEB.md). Mapa cartográfico y APP DRIVER pendientes; no se declara V1.18 completa ni activada. Continuidad V1.17 conservada.

## V1.17 Web — clientes directos y pagador (2026-10-06)

Interfaz local de identidad cliente, capacidades, MPQ/conversión/consentimiento final, seguimiento, política B2B SUPER_ADMIN y shippingPayment operativo. Conserva roles operativos y lectura de ejecución detallada; no incorpora cobro ni avances DRIVER web. Admisión no activada, sin disponibilidad productiva acreditada. Recuperación durable mínima, límites contractuales, rutas/archivos y procedimiento: [V1.17-WEB](docs/V1.17-WEB.md).

Validación frontend: 227 pruebas pertinentes, tipos, lint, build y recorrido visual con fixtures. Integración real A–E pendiente; no declarar V1.17 completa sólo por esta Web. Continuidad anterior preservada.

## Búsqueda automática de repartidor — 2026-10-10

Integrado el campo opcional search del handoff AUTOMATIC-DISPATCH-SEARCH-HANDOFF.md y docs/openapi.json del checkout local mandaria-backend. La Web muestra el intento confirmado (hasta 5), el contador de windowExpiresAt y los estados SEARCHING, RETRY_PENDING, EXECUTOR_FOUND, CANCELLED, EXHAUSTED y STOPPED en listas/detalles de proveedor, independiente y administración. Desde una solicitud se enlaza al listado de despachos filtrado por MDR; el contrato administrativo de solicitudes no incorpora search, por lo que no se inventa ese campo ni se usa la ruta B2B con sesión humana.

El contador local es informativo: cero conserva la última fotografía y espera confirmación. React Query reutiliza las claves/refetch existentes y sondea cada 15 segundos (60–120 segundos tras errores); sólo realiza lecturas. No incrementa intentos, renueva ventanas, reabre solicitudes ni llama a reintentos. DISPATCH_RETRY_PENDING en claim/take refresca y muestra espera; nunca repite el comando. EXECUTOR_FOUND conserva significado histórico tras una liberación y no prueba asignación vigente. Sin search se mantienen la presentación y reglas legacy. OFFER/OWNER, collectionInstructions, créditos y permisos de ejecución permanecen separados de la búsqueda. Agotamiento no comunica pago devuelto ni comida cancelada.

Capacidad sin activar. Sin cambios de backend, configuración, operaciones reales, commit, push ni despliegue. Validación focalizada y límites en [VERIFICATION.md](VERIFICATION.md).


## Portal: seguimiento público B2B — 2026-10-04

Actualización editorial posterior: OpenAPI público resincronizado; la descripción de executionProgress ya indica ordenar fotografías de una misma solicitud mediante publicVersion. Queda cerrada la discrepancia editorial registrada inicialmente en VERIFICATION. revision interna y expectedRevision de concurrencia permanecen sin cambios. No implica despliegue.

`/developers/execution` documenta publicVersion (comparación BigInt por MDR), trackingMode, assignmentState, terminalOutcome persistente, identidad receptora tras transferencia y atención/cancelación bajo custodia. Consulta compartida desde el backend integrador: objetivo 15 segundos sujeto a límites agregados, backoff y parada al confirmar terminal. Se conserva delivery.completed; sin timeline, GPS ni nuevos webhooks. **Disponible en el checkout QA del backend, pendiente de despliegue; no se acredita producción.**

Actualizar con `node scripts/sync-public-b2b.mjs` y detectar diferencias con `node scripts/sync-public-b2b.mjs --check` (opcional `--backend <ruta>`). El mecanismo conserva la allowlist de cinco artefactos públicos y sus hashes; no copiar OpenAPI general ni documentos administrativos. Los ejemplos de seguimiento se leen del JSON público sincronizado. `src/developers/tracking.md` contiene la explicación pública revisada contra el handoff; al cambiarlo, revisar también este texto y ejecutar las pruebas del portal. No distribuir PUBLIC-B2B-TRACKING.md completo: contiene información interna de implementación/despliegue; su enlace público se dirige a `/developers/execution`.

Verificación local, evidencia visual y discrepancia editorial pendiente del contrato: [VERIFICATION.md](VERIFICATION.md). La sincronización no habilita ninguna capacidad ni ejecuta peticiones de seguimiento.

### Cierre contractual de ejecución (2026-10-04)

El cierre web exige trackingMode=LEGACY explícito y asignación activa propia. DETAILED es de consulta; null/campo ausente/error no habilitan entrega. Los avances históricos propios de PROVIDER_ADMIN se consultan o cierran técnicamente con la clave original y confirmación, sin reenviarlos ni recuperar permisos de avance. Marcador mínimo durable, timeout y permisos: [procedimiento actualizado](docs/EXECUTION-RECONCILIATION.md). Esta entrada sustituye las limitaciones de contrato documentadas anteriormente.


## Autoridad de ejecución — 2026-10-04

El repartidor registra hitos y entrega detallada desde la futura app compatible. Mandaria Web muestra progreso e historial en lectura para proveedor y DRIVER; conserva incidencias/asignaciones autorizadas, resoluciones SUPER_ADMIN y cierre legacy del proveedor/independiente. No usar avisos telefónicos para registrar nuevos hitos administrativos. PHONE_REPORT permanece en la historia y en incidencias recibidas. Recuperación anterior, límites contractuales y pendientes de la app: [docs/DETAILED-EXECUTION.md](docs/DETAILED-EXECUTION.md).


## Intentos de resolución — 2026-10-03

Cierre actual revisado: 79 pruebas focalizadas, TypeScript, lint, build y revisión visual local aprobados. Los cambios ya preparados se conservaron; se completaron mensajes y prueba de confirmación/timeout. Ver VERIFICATION para distinguir esta ejecución de las anteriores. Integración real backend todavía pendiente; función sin activar.

Integrada consulta durable y cierre explícito del intento propio. APPLIED exige auditoría coherente; PENDING_OR_UNKNOWN bloquea; CLOSED_NO_EFFECTS permite sólo preparar una nueva resolución cuando el contrato y el estado vigente lo permiten. Sin repetición automática ni reversión física. [Procedimiento vigente e historial](docs/EXECUTION-RECONCILIATION.md).
## Solicitudes de socio (Fase 1) — 2026-10-04

Bandeja SUPER_ADMIN en `/admin/partner-applications` (menú «Solicitudes de socio») para los leads que envía la landing. Una solicitud **no es una cuenta**: aprobarla no crea proveedores, invitaciones ni repartidores. Contrato: `mandaria-landing/docs/solicitudes-socio/CONTRATO.md`; fuente que manda: `mandaria-backend/docs/PARTNER-APPLICATIONS-HANDOFF.md`. Backend implementado localmente en `feat/solicitud-repartidor`, sin commit ni despliegue.

- Dominio `src/partner-applications/` (`types`, `service`, `queries`, `format`, `pages`). Clave `reference` (`SOC-NNNNNN`, sin distinguir mayúsculas); no existe `id` interno.
- Lista: filtros estado, tipo y `q` en la URL; paginación `page`/`pageSize` (20). Vista por defecto «Abiertas» (`status=RECEIVED,CONTACTED`; el backend acepta varios estados separados por comas); también cada estado por separado y «Todos los estados», que omite el filtro. `submissionCount` > 1 se resalta.
- Detalle: contacto (`tel:`, `https://wa.me/52<phone>`, `mailto:`), botones de estado sólo desde `allowedTransitions` (la máquina de estados no se duplica). `APPROVED`, `REJECTED` y `DISCARDED` piden nota (≤ 500) en un diálogo de confirmación; `APPROVED → REJECTED` nunca precarga la nota anterior. Un 409 de transición vuelve a leer la solicitud.
- «Alta en Mandaria» (sólo `APPROVED`): pasos guiados con enlaces a Proveedores, Repartidores e Independientes. Los vínculos se eligen de proveedores FLEET reales y de invitaciones enviadas exactamente al correo de la solicitud (FLEET: PROVIDER_ADMIN; INDIVIDUAL: DRIVER y sin proveedor). El proveedor que recibe a los independientes sigue pendiente del propietario y no se fija en código.
- Errores por `code`: `PARTNER_APPLICATION_NOT_FOUND`, `PARTNER_APPLICATION_INVALID_TRANSITION`, `PARTNER_APPLICATION_LINK_INVALID` (un solo código para varias causas; el mensaje las enumera y el formulario descarta antes las detectables: invitación de otro proveedor).
- Dashboard SUPER_ADMIN: contador de solicitudes `RECEIVED`.

Verificación real y límites: [VERIFICATION.md](VERIFICATION.md).

## Ejecución detallada — 2026-10-02

Interfaces preparadas sin activar la capacidad: cinco fases según permisos del servidor, historial paginado, incidencias reteniendo custodia, cola SUPER_ADMIN y resolución por devolución/transferencia. Integradas en los servicios existentes de proveedor/independiente y consulta de flotilla. Legacy conserva su flujo. El portal `/developers/execution` consume sólo la guía/OpenAPI B2B revisados.

Contrato, archivos, rutas, recuperación exacta de idempotencia y límites: [DETAILED-EXECUTION.md](docs/DETAILED-EXECUTION.md). Resultados focalizados y evidencia visual: [VERIFICATION.md](VERIFICATION.md). **Actualización 2026-10-03:** transferencias/devoluciones conservan un marcador mínimo tras recarga/cierre. La recuperación por lectura bloquea otra resolución cuando no puede determinarse el cierre. No se persiste el cuerpo privado ni se reconstruye un replay. Procedimiento y bloqueo exacto para Backend: [EXECUTION-RECONCILIATION.md](docs/EXECUTION-RECONCILIATION.md). No se modificó ni activó backend. El historial de versiones a continuación se conserva como continuidad.

Base administrativa independiente para Mandaria Backend V1.4. React + Vite + TypeScript estricto. Nombre de paquete: `mandaria-web`; se desarrolla en el repositorio existente `mandaria-frontend`, independiente de Coita Eats. No accede a PostgreSQL, Prisma ni servicios de Coita Eats.

**Estado:** V1.11-B cierra el MVP con la confirmación manual de entrega: el PROVIDER_ADMIN dueño del servicio lo marca como entregado cuando su repartidor le avisa (fuera de Mandaria) y el repartidor independiente confirma la suya desde su portal. El Dispatch pasa a `DELIVERED`, la asignación a `COMPLETED`, el repartidor y el vehículo quedan libres y no hay movimientos de créditos. `DELIVERED` es terminal: no se deshace. Sin prueba de entrega, seguimiento ni webhooks. Ver [V1.11-B](docs/V1.11-B.md). V1.10-F agrega la administración de créditos y monetización: SUPER_ADMIN consulta el saldo y el historial de créditos de cada proveedor y de cada repartidor independiente desde su propia ficha, registra recargas (pagos confirmados fuera de Mandaria) y ajustes administrativos, y administra las políticas de créditos versionadas con su calculadora; PROVIDER_ADMIN y DRIVER consultan su propio saldo en sólo lectura. Los créditos Mandaria son una unidad interna de consumo y nunca se muestran como dinero. No hay pasarela de pago, recargas automáticas ni devoluciones manuales. Ver [V1.10-F](docs/V1.10-F.md). V1.9-C agrega la administración de cobertura de servicio: SUPER_ADMIN decide desde el detalle del proveedor en qué zonas y tipos de servicio recibe servicios de flotilla (agregar, activar, desactivar; nunca borrar) y PROVIDER_ADMIN consulta «Mi cobertura» en sólo lectura. La cobertura afecta a los nuevos Dispatches; los candidatos de los ya abiertos no se recalculan. Ver [V1.9-C](docs/V1.9-C.md). V1.9-B agrega la administración de repartidores independientes y un portal web temporal para ellos: SUPER_ADMIN habilita, suspende y rechaza la capacidad independiente y administra sus vehículos propios; el repartidor habilitado consulta servicios disponibles, los toma con una sola operación atómica, ve su servicio actual y puede liberarlo. Sin Driver App, sin sockets y sin estados de ejecución. Ver [V1.9-B](docs/V1.9-B.md). V1.8-B agrega la asignación de repartidor y vehículo: el PROVIDER_ADMIN dueño de un servicio tomado asigna, reasigna y cancela la asignación, con el backend como única autoridad de cuál queda vigente. El Dispatch sigue siendo `CLAIMED`; que esté asignado se deriva de la `DeliveryAssignment` real. SUPER_ADMIN sólo audita el historial. Ver [V1.8-B](docs/V1.8-B.md). V1.7-B agrega visibilidad de despachos y toma de servicios: PROVIDER_ADMIN ve los servicios ofrecidos a su proveedor, los toma (el backend decide quién gana) y puede liberarlos; SUPER_ADMIN audita los despachos en sólo lectura. No asigna repartidor ni vehículo (V1.8) y no usa sockets. Ver [V1.7-B](docs/V1.7-B.md). V1.6.1-B agrega invitaciones y activación de cuentas: **production user provisioning no longer requires local seeds**. SUPER_ADMIN invita administradores de proveedor y repartidores; PROVIDER_ADMIN invita repartidores de sus proveedores; la persona invitada crea su contraseña en `/activate-account`. Los seeds locales quedan sólo como herramientas de desarrollo. Ver [V1.6.1-B](docs/V1.6.1-B.md). V1.6-B agrega zonas de servicio, tarifas versionadas y consulta de cotizaciones (sólo SUPER_ADMIN) sobre la administración V1.5 de Delivery Requests. Contrato y decisiones en [V1.6-B](docs/V1.6-B.md), [V1.5-B](docs/V1.5-B.md) y [V1.4-B](docs/V1.4-B.md). Resultados ejecutados en [VERIFICATION.md](VERIFICATION.md). CI y Docker permanecen pendientes; no forman parte de esta tarea.

## Entrada al portal detrás de nginx — 2026-10-01

Corrección preparada, no desplegada. El propietario reporta `/developers` → 301 a `/developers/` → 403, mientras `/developers/reference` y el JSON real responden 200. Existe `developers/` físico para assets; el `try_files $uri $uri/ /index.html` general puede elegir ese directorio en vez de la SPA.

En HTTPS, las ubicaciones **exactas** `/developers` y `/developers/` sirven `try_files /index.html =404;`: usan la entrada SPA sin consultar `$uri` ni `$uri/`. Si falta el build/index, responden 404; no intentan listar el directorio. Se conserva `expires -1`. HTTP mantiene su redirección existente a HTTPS.

Se mantienen archivos reales en `/developers/assets/` con 404 si faltan, JSON inexistente sin fallback HTML, rutas profundas con fallback SPA, interruptor reversible Swagger y proxies API/health.

Regresión estática reproducible (no arranca nginx):

```sh
node --test --test-isolation=none scripts/check-developers-entry.test.mjs
node scripts/check-swagger-policy.mjs
```

Validación real pendiente en el entorno nginx efectivo, sin ejecutar en esta tarea: `nginx -t` y, tras publicación autorizada, GET HTTPS **sin seguir redirects** a `/developers` y `/developers/`: ambos deben devolver 200 con HTML de la SPA, sin 301/403 ni cabecera Location. Repetir con query string y confirmar carga/navegación. Verificar `/developers/reference` 200, `/developers/assets/openapi-b2b.json` 200 JSON válido, `/developers/assets/no-existe.json` y `/developers/no-existe.json` 404 sin HTML SPA. Comprobar Swagger bloqueado y API/health intactos. Ninguna prueba de Vite sustituye esta validación de nginx.

## Swagger completo: restricción pública reversible — 2026-10-01

Configuración preparada, **no desplegada**. Se conserva Swagger en backend. `src/setup.ts` del backend registra `SwaggerModule.setup('docs', app, doc)` sin `useGlobalPrefix`. La dependencia instalada confirma UI `/docs`, `/docs/`, `/docs/index.html`, JSON `/docs-json`, YAML `/docs-yaml` y recursos `/docs/swagger-ui-init.js`, CSS, bundles, favicons y LICENSE bajo `/docs/`. También se cubre cualquier subruta anidada; no existe en el código consultado un montaje raíz `/swagger` alternativo.

### Interruptor central

Al inicio de `nginx.conf`, en contexto `http` (como se incluye actualmente en `/etc/nginx/conf.d/default.conf`), existe una sola política:

```nginx
map $uri $block_public_swagger {
    default 0;
    ~*^/(?:api/v1/)?docs 1;
}
```

**1 = bloqueado, 0 = público.** Cambiar únicamente el valor final de la línea del patrón; mantener `default 0`. Ambos servidores, HTTP y HTTPS, aplican `if ($block_public_swagger) { return 404; }` antes de elegir ubicación/proxy/fallback. `if` sólo ejecuta `return`, no reescribe ni redirige. El map trabaja sobre `$uri` normalizada, sin argumentos, y es insensible a mayúsculas. Abarca el prefijo completo `/docs` (incluye JSON/YAML) y `/api/v1/docs` defensivamente; no depende de cookies, cabeceras, parámetros ni JavaScript. No usar `?swagger=1` ni mecanismos equivalentes.

Los proxies existentes quedan presentes para facilitar reversión. `/developers`, sus archivos B2B, `/api/`, `/health`, certificados ACME y assets mantienen sus reglas. Este bloqueo no revoca copias del contrato descargadas anteriormente.

### Restringir públicamente

1. En el fichero de configuración efectivo, respaldar la configuración y establecer `~*^/(?:api/v1/)?docs 1;`. Mantener el mismo valor en el repositorio para futuras publicaciones.
2. En el **entorno nginx efectivo**, con sus certificados y resolución del upstream disponibles, ejecutar `nginx -t`. Si falla, no recargar: corregir o restaurar el respaldo.
3. Sólo después de éxito, ejecutar `nginx -s reload` en ese mismo entorno, o el procedimiento equivalente del servicio utilizado. No validar una instalación distinta de la que se recarga. El Dockerfile copia este fichero al construir: si se usa imagen inmutable, operación debe preparar la configuración por su procedimiento de publicación; editar el repositorio no altera un contenedor existente. No se ejecutó Docker aquí.
4. Comprobar sin sesión desde fuera de la red privada las rutas y variantes de la matriz inferior. Swagger debe devolver **404**, nunca 200 con UI/JSON/YAML ni HTML del fallback SPA. HTTP también devuelve 404 para esas rutas; no sólo una redirección a HTTPS.
5. Confirmar 200 y navegación directa de `/developers/reference`, 200 `application/json` y JSON válido en `/developers/assets/openapi-b2b.json`; comprobar `/health` y una lectura API autorizada sin operaciones reales.

### Volver a habilitar públicamente

1. Cambiar sólo `~*^/(?:api/v1/)?docs 1;` por `~*^/(?:api/v1/)?docs 0;`. Esto vuelve a exponer **todo** el contrato, no sólo la interfaz. Sin cambio backend, rebuild frontend ni controles de navegador.
2. Ejecutar `nginx -t` en el entorno efectivo. Si no pasa, no recargar.
3. Después de éxito, ejecutar `nginx -s reload` (o recarga del servicio equivalente).
4. Comprobar `/docs` y `/docs/` (UI, admitiendo redirección canónica), `/docs-json` (200 JSON parseable), `/docs-yaml` (200 YAML), `/docs/swagger-ui-init.js`, CSS y bundles (200). HTTP vuelve a redirigir por la regla existente. Las variantes defensivas `/api/v1/docs` no se convierten en nuevos endpoints al revertir: sólo las rutas reales deben servir Swagger.
5. Repetir comprobación de portal, descarga B2B, API y health. Para restringir otra vez, repetir el procedimiento anterior poniendo 1.

### Matriz HTTP posterior (no ejecutada aquí)

Usar `curl --path-as-is -i 'https://mandaria.com.mx/RUTA'` y repetir con HTTP cuando corresponda. En modo restringido, esperar 404 para:

- `/docs`, `/docs/`, `/docs/index.html`, `/docs-json`, `/docs-yaml`.
- `/docs/swagger-ui-init.js`, `/docs/swagger-ui.css`, `/docs/swagger-ui-bundle.js`, `/docs/swagger-ui-standalone-preset.js`, `/docs/favicon-32x32.png`, `/docs/LICENSE`, `/docs/docs/swagger-ui-init.js`.
- `/DOCS`, `/DOCS-JSON`, `//docs`, `/docs//swagger-ui.css`, `/%64ocs`, `/docs%2fswagger-ui.css`, `/x/../docs-json`, `/api/v1/../../docs-yaml`.
- `/api/v1/docs`, `/api/v1/docs-json`, `/api/v1/docs-yaml`, `/docs?public=1`, `/docs-json?download=1`.

Nginx normaliza escapes, barras y segmentos antes de aplicar ubicaciones; las entradas malformadas pueden recibir 400, lo que también deniega acceso. Las pruebas HTTP deben verificar que ninguna variante entrega Swagger o `index.html`. La comprobación Node local sólo revisa el patrón sobre rutas normalizadas y la presencia de reglas: **no sustituye al parser ni a la normalización real de nginx**. Repetir contra cualquier otro virtual host/puerto proxy de la instalación; el repositorio no acredita que no existan configuraciones adicionales en el servidor.

### Soporte mediante túnel SSH privado

Evidencia disponible de sólo lectura: `mandaria-backend/docker-compose.yml` publica el backend como `127.0.0.1:${PORT:-3000}:3000`; nginx apunta a `backend:3000` dentro de su red. El proceso Nest escucha `0.0.0.0` dentro de su entorno. **3000 es un valor por defecto del host, no un puerto desplegado confirmado**. No se consultó `.env` remoto, firewall ni listeners reales.

1. Acceder por SSH al host autorizado y comprobar el listener con `ss -lntp` y la configuración efectiva disponible, sin volcar secretos. Identificar el puerto backend ligado a loopback y comprobar privadamente `/health` y `/docs-json`. No asumir que el nombre de red `backend` resuelve desde el host.
2. Si existe ese listener privado, desde el equipo de soporte usar valores comprobados (los marcadores siguientes no son destinos reales):

```text
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:<PUERTO_LOCAL_LIBRE>:127.0.0.1:<PUERTO_BACKEND_VERIFICADO> <USUARIO_SSH>@<HOST_SSH_AUTORIZADO>
```

3. Abrir `http://127.0.0.1:<PUERTO_LOCAL_LIBRE>/docs` en ese equipo; JSON/YAML por el mismo túnel. Accede directamente al backend privado, sin pasar por el nginx público. Mantener ambos extremos locales a loopback; cerrar SSH al terminar. No hace falta desactivar el bloqueo público. Si no existe un listener privado alcanzable desde el host SSH, detenerse y pedir a operación un destino privado comprobado; no abrir ni publicar un puerto como solución.

**Posible bypass:** si el backend desplegado escucha directamente en una IP/puerto públicos y el firewall permite entrada, `/docs`, `/docs-json` y `/docs-yaml` seguirán accesibles por ese puerto: nginx no puede proteger tráfico que lo evita. El compose consultado limita el binding a loopback, pero no prueba la instalación real. Antes de declarar la restricción efectiva, operación debe comprobar listeners, reglas de red/firewall y ausencia de acceso directo desde fuera. No se modificó ni abrió ningún puerto.

## Publicación confirmada — 2026-10-01

- Web: `https://mandaria.com.mx`
- API: `https://mandaria.com.mx/api/v1`
- Portal: `https://mandaria.com.mx/developers`
- **Valor de build: `VITE_API_URL=https://mandaria.com.mx`**, sin `/api/v1`.

Todos los consumidores de la configuración fueron revisados: el transporte central de `src/services/api.ts` añade `/api/v1` para login, refresh, logout, API autenticada, operaciones públicas y generación única de secretos; el portal muestra el origen explícito. `parseEnv` rechaza rutas, incluido `/api/v1`, en vez de construir un prefijo duplicado. Los scripts E2E usan su variable separada `E2E_API_URL`, también sin prefijo; no se ejecutaron contra publicación. Se conserva `.env` local; `.env.example` documenta ambas opciones. Cambiar variables del contenedor después de compilar no cambia el JS estático: suministrar el valor al build.

Build de publicación local, sin desplegar ni Docker:

```powershell
$env:VITE_API_URL='https://mandaria.com.mx'
npm run build
```

En shell POSIX: `VITE_API_URL=https://mandaria.com.mx npm run build`. El Dockerfile existente recibe la misma variable mediante ARG si operación decide construir su imagen posteriormente; no se cambió ni ejecutó aquí.

El backend ya entregó `servers[0].url=https://mandaria.com.mx` y la guía con los destinos confirmados. Se sincronizaron mediante el script documentado abajo, incluyendo manifest; ninguna copia generada se editó a mano. Las rutas del OpenAPI llevan `/api/v1` y se concatenan al origen sin duplicarlo. La referencia muestra el servidor leído del JSON, y el ejemplo copiable usa `MANDARIA_API_BASE=https://mandaria.com.mx/api/v1` seguido de `/integrations/me`, sin ejecutar peticiones.

### Diff mínimo de hosting preparado

`nginx.conf` conserva TLS, redirect HTTP, proxy `/api/` (sin reescritura de URI), `/docs`, `/health`, `/assets/` y fallback SPA. Agrega únicamente:

- `/developers/assets/` con prioridad `^~`, `try_files $uri =404`, JSON como `application/json` y guías/ejemplo como texto. Revalidación con `expires -1` para no perpetuar documentación antigua. Un archivo ausente devuelve 404 de nginx, nunca `index.html`.
- JSON bajo `/developers/` fuera de assets devuelve 404 JSON. No se interpreta como ruta SPA.

`/developers`, `/developers/reference` y las demás páginas siguen usando el fallback existente `/index.html`. El acceso a Swagger completo no cambia. El diff está preparado localmente: no es confirmación de configuración instalada.

### Comprobaciones después del despliegue (no ejecutadas aquí)

En el entorno de hosting, validar `nginx -t` con su configuración/certificados/red reales antes de aplicar. Después de un despliegue autorizado:

```bash
curl -I https://mandaria.com.mx/developers
curl -I https://mandaria.com.mx/developers/reference
curl -D openapi-headers.txt -o openapi-b2b.json https://mandaria.com.mx/developers/assets/openapi-b2b.json
node -e "const s=JSON.parse(require('fs').readFileSync('openapi-b2b.json','utf8')); console.log(s.servers)"
curl -i https://mandaria.com.mx/developers/assets/missing.json
curl -i https://mandaria.com.mx/developers/missing.json
```

Esperados: páginas 200 HTML y navegación directa/recarga funcional sin sesión; contrato 200 `application/json`, JSON válido y origen confirmado; inexistentes 404 sin HTML de la aplicación. Comparar descarga con manifest normalizando CRLF a LF. Comprobar en navegador que las solicitudes autorizadas usen exactamente `/api/v1` y que proxy/rutas administrativas sigan funcionando, sin activar envíos de prueba. No se accedió a producción para estas comprobaciones.

## 2026-10-01 — Webhooks administrativos y portal B2B

Esta entrada amplía el estado histórico descrito arriba. Se agregó administración de webhooks para SUPER_ADMIN y documentación pública anónima; no habilita envíos ni acredita integración real.

- `/integrations/:id`: destino HTTPS, habilitación explícita, metadata del secreto de firma, deliverFrom, resumen y eventos paginados del cliente. Filtros: estado, solicitud, referencia externa exacta y fechas.
- `/integrations/:id/webhooks/:eventId`: intentos, HTTP, causa, duración y destino histórico separado del actual. Se comprueba el cliente antes de mostrar el evento.
- `/webhooks/health`: métricas compartidas separadas de `thisInstance`. Acceso desde el detalle de integración; sin rescate ni envío manual.
- `/developers` y subrutas `authentication`, `prequotes`, `webhooks`, `errors`, `reference`: acceso anónimo sin montar AuthProvider ni restaurar sesión administrativa. Guías revisadas, ejemplos copiables, referencia y descarga; sin consola de ejecución.

El secreto de firma es distinto de clientSecret B2B. Generación/rotación requiere confirmación y realiza un solo intento HTTP (sin repetición tras 401). El valor sólo vive en el componente, fuera de cachés y almacenamiento; se retira al cerrar, desmontar/navegar, cerrar sesión o salir de la página. Las respuestas tardías se descartan. Una respuesta perdida muestra incertidumbre explícita: el backend pudo rotarlo. No hay convivencia de secretos. Deshabilitar conserva pendientes y no garantiza detener peticiones en vuelo. HTTP 2xx/DELIVERED acredita aceptación por el receptor, no procesamiento comercial.

La configuración distingue GET 404 de errores de autorización/red. Refetch/foco actualiza datos limpios; si hay edición local y revisión remota diferente, se conserva la edición y se bloquea el guardado hasta resolver el conflicto. Las mutaciones invalidan las consultas de webhooks.

### Actualizar la documentación pública

Referencia de sólo lectura: `mandaria-backend/docs/B2B-FRONTEND-HANDOFF.md`. La entrega local revisada del 2026-10-01 ya existe; se copiaron únicamente cinco artefactos aprobados, nunca `docs/openapi.json` ni el handoff interno. `manifest.json` registra SHA-256 por archivo.

1. Solicitar al mantenedor backend una entrega revisada y su verificación `npm run docs:b2b:check`. El frontend no sustituye esa revisión ni ejecuta aquí comandos backend.
2. Revisar el diff de la entrega y actualizar explícitamente la lista de operaciones aprobadas si el contrato cambia.
3. Ejecutar desde frontend:

```bash
node scripts/sync-public-b2b.mjs --backend ../mandaria-backend
node scripts/sync-public-b2b.mjs --check --backend ../mandaria-backend
```

La primera orden copia exclusivamente los archivos públicos aprobados; `--check` no escribe y falla si las copias/huellas difieren del handoff disponible. La lista explícita admite las 15 operaciones revisadas; no publica automáticamente operaciones nuevas. El check necesita el checkout backend correcto y no demuestra por sí solo que su exportación esté actualizada frente al código backend.

El portal muestra el origen centralizado `VITE_API_URL`, sin inferirlo del host. La preparación posterior de publicación descrita arriba sustituye la advertencia inicial de dominio ficticio: el artefacto vigente ya usa el origen confirmado. La revisión visual previa sólo acreditó el servidor local Vite; hosting real sigue pendiente.

Dependencias nuevas: `react-markdown` y `remark-gfm` para representar directamente las guías revisadas y sus tablas, con HTML crudo deshabilitado y enlaces públicos controlados. No se ejecuta código de los ejemplos.

Implementación: `src/webhooks/`, `src/developers/`, integración en App/Root/detalle de integración y transporte `apiOnce` centralizado. Evidencia y límites en [VERIFICATION.md](VERIFICATION.md). No requiere cambios backend para este alcance según el contrato local consultado; despliegue equivalente y prueba E2E real quedan por confirmar; el origen definitivo ya está documentado arriba.

## Requisitos e instalación

- Node.js 24 o posterior compatible, npm 11.
- Mandaria Backend V1.6 con PostgreSQL operativo, migraciones y cuentas aprovisionadas por su procedimiento propio.
- Docker Desktop/motor Docker sólo para construir o ejecutar la imagen.

```bash
npm install
cp .env.example .env
npm run dev
```

PowerShell: `Copy-Item .env.example .env`. Para instalaciones reproducibles: `npm ci`.

## Variables

```env
VITE_API_URL=http://localhost:3000
```

`src/config/env.ts` es el único punto que lee `import.meta.env`. La URL representa la base del backend, sin `/api/v1`; el cliente añade ese prefijo. Debe ser HTTP(S), sin credenciales, query ni fragmentos. Configuración obligatoria validada al arrancar; un fallo muestra una página legible. Reinicia Vite tras cambiar `.env`.

No colocar clientSecret, claves de JWT, Integration Credentials ni credenciales de base de datos en Vite. _\*Todo VITE_* es público y se incorpora al build._* `.env`, `.env.e2e` y sus variantes están ignorados; `.env.example` no contiene secretos.

## Backend y CORS

Inicia Mandaria Backend con sus comandos documentados. El origen de Vite debe estar permitido en `CORS_ORIGINS` del backend. La validación V1.4 utiliza `http://localhost:5173`, permitido por la configuración local existente. `127.0.0.1` es un origen diferente y necesita su propia autorización CORS. No existe proxy hacia Coita Eats ni conexión directa a datos.

La web se autentica como **User** mediante email/password. No hay registro público. El alta de cuentas y los cambios de roles no están disponibles en la API actual.

## Comandos

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run typecheck:test
npm test
npm run test:watch
npm run format
npm run format:check
```

`build` ejecuta TypeScript y genera `dist/`. `test` ejecuta Vitest y Testing Library; `typecheck:test` verifica también los tipos de los tests. No requieren backend ni Docker. El workflow de GitHub Actions continúa pendiente localmente por instrucción del usuario.

### Prueba real de navegador

```bash
npx playwright install chromium
npm run test:e2e
```

Requiere backend y frontend iniciados. Configura localmente `.env.e2e`, **ignorado por Git**, con `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD`; opcionalmente `E2E_PROVIDER_EMAIL` y `E2E_PROVIDER_PASSWORD` de una cuenta PROVIDER_ADMIN existente. No agregues esas variables a Vite. El script de pruebas de Node las lee exclusivamente en memoria.

Alternativa local para una instalación que conserva credenciales bootstrap: define `MANDARIA_BACKEND_ENV` como ruta a su `.env`. El script sólo lo lee para obtener la cuenta de prueba; no imprime valores. `E2E_WEB_URL` puede cambiar el origen de prueba (default `http://localhost:5173`, el mismo host que publica Vite). `E2E_BROWSER_CHANNEL` permite usar un navegador ya instalado, por ejemplo `msedge`, cuando no se descargaron los de Playwright; lo aceptan todos los scripts `test:e2e*`.

El script **crea registros reales de prueba** con código `WEB_...`, genera/rota/revoca credenciales y modifica sus propios proveedores. No eliminará registros: la API carece de eliminación de cliente/proveedor. Una cuenta PROVIDER_ADMIN de prueba, si se configura, se asocia al proveedor creado. No usar cuentas productivas. Las capturas y el reporte quedan en `test-results/manual/`, ignorados por Git. No se capturan pantallas con secretos; capturas de fallo enmascaran inputs y textarea. No se guardan trazas de red, HAR, videos ni estados de autenticación.

### Validación real V1.10-F

`npm run test:e2e:credits` valida con navegador y backend reales: cuentas separadas de proveedor y de repartidor independiente, recarga y ajuste atómicos con `Idempotency-Key` (repetición idempotente y conflicto con otro cuerpo), historial inmutable sin rutas de escritura, políticas versionadas sin PATCH ni DELETE, cálculo del backend, aislamiento por rol (403 reales) y créditos nunca presentados como dinero. El script restaura el saldo que encontró. Ver [docs/V1.10-F.md](docs/V1.10-F.md).

### Validación real V1.7-B

`npm run test:e2e:dispatch` crea Quotes aceptadas reales y valida en navegador: A y B ven el servicio con dinero separado, A lo toma, B recibe el 409 claro, A libera con motivo y no vuelve a verlo, B lo toma, aislamiento por proveedor, expiración real, auditoría SUPER_ADMIN, bloqueo de DRIVER, responsive y auditoría de secretos. Requiere backend con `ROUTING_PROVIDER=local_fake` y `E2E_ROUTING_LOCAL_FAKE=1` (nunca llama a rutas de pago). Ver [docs/V1.7-B.md](docs/V1.7-B.md).

### Validación real V1.6.1-B

`npm run test:e2e:invitations` valida con navegador real invitación de PROVIDER_ADMIN y DRIVER, 409 de invitación duplicada, 429 de enfriamiento, reenvío con rotación de enlace, revocación, activación (inválida, revocada, contraseñas distintas, éxito, enlace reutilizado), login de las cuentas activadas, aislamiento entre proveedores, límite real de capacidad, responsive y auditoría de tokens/contraseñas. Requiere el backend con `MAIL_PROVIDER=local_outbox` y `E2E_MAIL_OUTBOX_DIR`; nunca envía correos reales. Ver [docs/V1.6.1-B.md](docs/V1.6.1-B.md).

### Validación real V1.6-B

`npm run test:e2e:pricing` valida con navegador real la navegación V1.6, el detalle de zona y su cobertura, el historial de versiones, la creación de una versión nueva, la edición de bandas en kilómetros guardadas en metros, la validación traducida, la activación, el histórico de sólo lectura, la superficie de cotizaciones, el detalle de solicitud con Cotizaciones, el responsive del editor y el bloqueo de PROVIDER_ADMIN. Su única mutación es una versión de tarifa clonada de la activa cuyas bandas se restauran antes de activar, de modo que la tarifa efectiva no cambia. Ver [docs/V1.6-B.md](docs/V1.6-B.md).

### Validación específica de PROVIDER_ADMIN

`npm run test:e2e:provider-admin` valida cuentas reales A/B/sin membership y la regresión SUPER_ADMIN. Sólo consulta recursos existentes y administra sus propias sesiones de autenticación; no crea fixtures de negocio. Requiere las cuatro cuentas preparadas por backend y espera el vencimiento real del access token. Configuración, alcance y resultados en [PROVIDER-ADMIN-VALIDATION.md](docs/PROVIDER-ADMIN-VALIDATION.md).

### Validación real V1.5-B

`npm run test:e2e:delivery-requests` valida con navegador real listado, filtros servidor, detalle, paquetes, contexto económico, cancelación, responsive, dashboard, PROVIDER_ADMIN bloqueado y regresión de navegación V1.4. Sólo cancela la solicitud indicada en `E2E_MDR_CANCEL`. Ver [docs/V1.5-B.md](docs/V1.5-B.md).

### Validación real V1.4-B

`npm run test:e2e:logistics` prueba login real, límites, altas, estados, asignaciones, aislamiento A/B, cuenta sin membership, responsive, almacenamiento y regresiones. Usa el backend local, conserva los registros e historial de validación y no modifica roles ni almacenamiento para simular identidades. Requisitos, datos y variables de prueba en [docs/V1.4-B.md](docs/V1.4-B.md).

## Arquitectura y carpetas

```text
src/
  app/             Composición, rutas, error boundary
  auth/            Contexto humano, login y ciclo de sesión
  components/      Formularios, tablas, modales, feedback y estados
  config/          Variables públicas centralizadas
  dashboard/       Resumen con datos paginados reales
  drivers/         Repartidores: listados, altas, estados y detalle
  vehicles/        Vehículos: listados, altas, estados y detalle
  assignments/     Asignar, desasignar e historial
  logistics/       Scope, filtros, capacidad, tipos y caché compartidos
  integrations/    Clientes B2B y credenciales
  layouts/         Sidebar, header, navegación responsive
  providers/       Catálogo, detalle, límites, membresías y perfil propio
  partner-applications/ Bandeja de solicitudes de socio (leads de la landing)
  services/        HTTP, normalizador de errores y QueryClient
  test/            Pruebas de flujos, permisos, HTTP y sesión
  types/           Tipos adaptados al contrato inspeccionado
  users/           Usuarios, perfil y configuración informativa
  utils/           Etiquetas y fechas es-MX
scripts/           Verificación en navegador real
```

Flujo: componente → servicio del dominio → cliente HTTP → Mandaria Backend. QueryClient mantiene únicamente consultas en memoria, sin persistencia. Mutaciones de credenciales se ejecutan directamente: sus respuestas nunca entran al caché de consultas o mutaciones.

## Dependencias y motivos

| Dependencia                      | Motivo                                                               |
| -------------------------------- | -------------------------------------------------------------------- |
| React Router                     | Navegación, parámetros y protección por rol                          |
| TanStack Query                   | Carga, errores, cancelación y actualización de consultas             |
| Lucide React                     | Iconos consistentes, sin assets externos                             |
| Vitest + Testing Library + jsdom | Pruebas de sesión, interacción, roles y flujos críticos              |
| Playwright                       | Verificación real de navegador, responsive, consola y almacenamiento |
| Prettier                         | Formato consistente                                                  |

Se usan formularios HTML nativos con validaciones y `ActionForm`; no se agrega librería de formularios/tablas innecesaria. `ActionForm` comparte loading, errores, bloqueo de doble submit y dirty state, y advierte ante cierre/recarga con cambios. La navegación interna no tiene bloqueo de descarte en esta versión.

## Rutas, pantallas y permisos

| Ruta                                                   | Acceso                                                   |
| ------------------------------------------------------ | -------------------------------------------------------- |
| /login                                                 | Público, sin registro                                    |
| /dashboard                                             | Usuario autenticado; contenido por rol                   |
| /integrations, /integrations/new, /integrations/:id    | SUPER_ADMIN                                              |
| /providers, /providers/new, /providers/:id             | SUPER_ADMIN; el detalle administra la cobertura          |
| /users                                                 | SUPER_ADMIN; cuentas, estado e invitar administrador     |
| /invitations                                           | SUPER_ADMIN; invitaciones, reenviar y revocar            |
| /admin/partner-applications, …/:reference              | SUPER_ADMIN; solicitudes de socio de la landing          |
| /activate-account                                      | Público; activación de cuenta invitada                   |
| /services, /services/:id                               | PROVIDER_ADMIN; servicios ofrecidos, tomar y liberar     |
| /dispatches, /dispatches/:id                           | SUPER_ADMIN; auditoría de despachos, sólo lectura        |
| /settings                                              | SUPER_ADMIN, información del entorno de trabajo          |
| /provider/profile                                      | PROVIDER_ADMIN; asociaciones y cobertura, sólo lectura   |
| /drivers, /drivers/new, /drivers/:id                   | SUPER_ADMIN o PROVIDER_ADMIN, según proveedor autorizado |
| /vehicles, /vehicles/new, /vehicles/:id                | SUPER_ADMIN o PROVIDER_ADMIN, según proveedor autorizado |
| /delivery-requests, /delivery-requests/:publicId       | SUPER_ADMIN; consulta y cancelación, sin edición         |
| /service-zones, /service-zones/new, /service-zones/:id | SUPER_ADMIN; cobertura y moneda de cada zona             |
| /rate-plans/:id                                        | SUPER_ADMIN; versiones de tarifa, sólo DRAFT editable    |
| /delivery-quotes, /delivery-quotes/:publicId           | SUPER_ADMIN; consulta, sin aceptación ni edición         |
| /profile                                               | Usuario autenticado                                      |
| /403 y rutas desconocidas                              | Estados 403 y 404                                        |

Sidebar y rutas usan el rol de `/auth/me`; escribir una URL prohibida muestra 403. El backend sigue siendo autoridad real en cada llamada. Roles futuros tienen perfil y un dashboard sin funciones globales. Un usuario PROVIDER_ADMIN puede elegir entre varias asociaciones propias y consultar proveedores suspendidos, tal como permite V1.2.

## Componentes y diseño

`AdminLayout`, `PageTitle`, `Table`, `Pagination`, `ActionForm`, `Field`, `Confirm`, `Modal`, `Badge` (con `label` opcional para el género de cada dominio), `InfoGrid`, `Loading`, `Empty`, `ErrorState`, `ErrorPage`, `FeedbackProvider` y `SecretDialog`. Diseño verde mineral, superficies claras, iconos lineales y marca inicial propia. Tokens de color, radio, spacing y tipografía en `src/index.css`; sin dependencia visual de Coita Eats. Tablas con desplazamiento horizontal; sidebar pasa a drawer en móvil. Modal nativo con foco, Escape y retorno de foco. Fechas centralizadas en `src/utils/format.ts`, idioma es-MX y zona del navegador.

## Sesión y seguridad

- Backend actual: access + refresh JWT en JSON, sin cookies HttpOnly. `credentials: omit` en fetch.
- Access token sólo en memoria. Refresh en `sessionStorage`, una única clave `mandaria.refresh`, para restaurar la misma pestaña tras recargar. No se usa localStorage. Cerrar la sesión borra el refresh local y llama al endpoint de revocación.
- Restauración: refresh rotatorio → `/auth/me`. Un 401 coordina un único refresh compartido entre peticiones concurrentes, luego reintenta una vez. Otro 401 borra sesión y caché; un 403 nunca intenta refresh.
- Error temporal de red conserva refresh para poder reintentar. Timeout HTTP de 20 segundos. Mutaciones no tienen retries automáticos. Logout limpia la sesión local aun si la revocación remota falla y lo comunica. El backend conserva la validez del access token hasta expirar: limitación de V1.0.
- `sessionStorage` es accesible a JavaScript: una vulnerabilidad XSS podría robar el refresh. Es el compromiso documentado para restauración compatible con este backend. El paso futuro recomendado es cookie HttpOnly/BFF con el correspondiente diseño CSRF; requiere cambio explícito de backend.
- Sin HTML dinámico peligroso, persistencia de caché, analytics ni logs de tokens. Errores del backend pasan por mensajes seguros permitidos; no se muestran SQL, trazas ni texto arbitrario.
- Client Secrets de integración **nunca se almacenan permanentemente en Mandaria Web**. Sólo viven en estado local del diálogo, se eliminan al cerrar/desmontar/cambiar detalle y nunca se incluyen en QueryClient. El portapapeles se usa sólo por acción explícita y pertenece al sistema del usuario.
- Rotar conserva la credencial anterior según backend: la UI lo advierte y requiere revocación explícita. Revocación y cambios de estado tienen confirmación.
- Invitaciones: la web nunca muestra ni persiste tokens de activación ni contraseñas. `/activate-account` retira el token de la URL al cargar, lo envía sólo en el body sin cabecera de sesión (`publicApi`) y limita la referencia global al origen (sin ruta, query ni fragmento). Nadie define contraseñas ajenas.
- La web nunca llama a `/integrations/token` ni utiliza clientId/clientSecret para su propio login.
- Servir producción con HTTPS y origen CORS exacto. Nginx incluye CSP, anti-frame, no-sniff y referrer policy. `connect-src` permite HTTP/HTTPS para una imagen sin dominio fijo; restringirlo al origen real del backend al desplegar. No hay scripts ni fuentes remotos.

## Contrato y límites funcionales

Ver [docs/API-CONTRACT.md](docs/API-CONTRACT.md) para el contrato base, [docs/V1.4-B.md](docs/V1.4-B.md) para el contrato logístico y [docs/V1.6-B.md](docs/V1.6-B.md) para zonas, tarifas y cotizaciones. Las cotizaciones son de sólo lectura: la vigencia (`quoteValidityMinutes`) define hasta cuándo puede aceptarse un precio, **no** cuándo se realiza el servicio, y el valor de mercancía nunca se suma al costo de entrega. Integraciones y usuarios están limitados a 100 elementos por la API. El dashboard global recupera 5 proveedores recientes y dos páginas de 1 elemento para totales por tipo. El dashboard de proveedor muestra capacidad real, repartidores disponibles y vehículos activos mediante conteos del servidor. No calcula ingresos ni entregas.

## Docker / producción

```bash
docker build --build-arg VITE_API_URL=https://api.example.com -t mandaria-web:v1.4 .
docker run --rm -p 8080:80 mandaria-web:v1.4
```

`api.example.com` es un ejemplo: reemplázalo por el backend real. Dockerfile multietapa Node 24 → Nginx. El runtime sólo contiene frontend estático. SPA fallback en `nginx.conf`, assets con caché, HTML sin caché duradero. El API URL es variable **de build**, no cambia al pasar `-e` al contenedor ya construido. No se copian `.env`, fuentes del backend ni secretos a la imagen. El backend debe permitir el origen desde el que se sirve la web.

## Próximas versiones y deuda

V1.4-B administra quién puede transportar y con qué vehículo. V1.5-B administra y observa qué se solicitó transportar. V1.6-B administra dónde puede operar Mandaria y cuánto cuesta una entrega local. V1.6.1-B incorpora administradores y repartidores reales mediante invitación segura, sin acceso al servidor. V1.7-B abre la visibilidad de despachos y la toma de servicios, V1.8-B asigna repartidor y vehículo, V1.9 incorpora al repartidor independiente y su portal, y V1.10-F administra los créditos Mandaria que cuesta adjudicarse un servicio. No se implementaron pasarela de pago, compra de créditos, wallet en pesos, sockets, GPS, tracking, viajes intercity, fletes, scheduling ni aplicaciones Driver/Customer.

Pendientes: ejecución Docker en un motor funcional, eventual paginación servidor de integraciones/usuarios, gestión de cuentas cuando exista API y migración de refresh a cookies seguras. La validación real de PROVIDER_ADMIN y su membership ya está completada; Docker continúa pendiente para el cierre total de la entrega original.
## Mapa Google opcional (V1.18)

Configurar privadamente `VITE_GOOGLE_MAPS_API_KEY` en `.env.local` para desarrollo (reiniciar Vite) o en el entorno de build. `.env.example` deja el valor vacío. Dockerfile admite el build arg del mismo nombre; no basta añadirlo al contenedor después de compilar. No requiere Map ID. La clave Web es pública: restringir dominios y Maps JavaScript API; nunca reutilizar claves backend. Sin clave, el seguimiento textual funciona normalmente. Ver [configuración, CSP, privacidad y validación pendiente](docs/V1.18-MAP-PROPOSAL.md).

### Mi perfil cliente — diseño 2026-10-12

`/customer/profile` presenta identidad, datos editables y cambio de tipo con confirmación. Protege las ediciones locales al consultar y conserva el bloqueo hasta leer el perfil tras un resultado incierto. La verificación de correo sólo confirma recepción de la solicitud. Pruebas del diseño: `npx vitest run src/test/customer-profile-design.test.tsx --pool=threads --maxWorkers=1`; revisión responsive con API sintética: `node scripts/verify-profile-design.mjs`. Resultados y límites en VERIFICATION.md.

### Seguimiento público — diseño 2026-10-12

`/track` tiene layout independiente, mapa con panel flotante en escritorio y panel inferior expandible en móvil. Conserva las restricciones de GPS: terminal, incidencia y posición no autorizada retiran coordenadas; el enlace permanece sólo en memoria. Revisión visual sintética reproducible: `node scripts/verify-public-tracking-design.mjs`. No usa claves reales ni cartografía externa; resultados y pendientes en VERIFICATION.md.

### Registro público de clientes — diseño 2026-10-12

Pantalla con marca/formulario responsive, validación inline y confirmación genérica conforme al contrato. No pide teléfono (no existe en el DTO). Revisión visual con API sintética: `node scripts/verify-registration-design.mjs`; pruebas focalizadas: `npx vitest run src/test/customer-registration-design.test.tsx src/test/customer.test.tsx --pool=threads --maxWorkers=1`. Véase VERIFICATION.md.

## Baja y eliminación documental — prueba local (2026-10-16)

Solicitud por alcance, seguimiento, recuperación por clave, constancias parciales
y revisión SUPER_ADMIN en `/privacy/deletion` y `/admin/privacy/deletion`.
`/privacy/deletion-access` permite consultar con la capacidad privada real expedida
por backend, sin inventar una sesión posterior a la baja. Una solicitud aceptada
no equivale a eliminación; H sólo acredita el alcance operativo y los respaldos
siguen sin acreditación. El drenaje real de Spaces continúa pendiente.

[Contrato, permisos, rutas, límites y futura integración aislada](docs/DOCUMENT-DELETION-WEB.md).
[Pruebas y capturas sintéticas](VERIFICATION.md). No se ha ejecutado integración
real de esta baja, ni modificado backend, integrado QA, hecho commit/push o desplegado.

### Actualización 2026-10-17 — sesión y recuperación compatibles

La sesión usa `auth/me?projection=session`, conservando identidad restringida sin
inventar roles ni habilitar operación general. Los comandos administrativos de
baja se recuperan por GET con su clave original después de recargar. Recibos
históricos y estado actual permanecen separados; 404 no autoriza otra mutación.

Los recorridos de sesión restringida y pérdida de respuesta **después del commit**
se validaron con navegador, backend real y PostgreSQL sintético aislado. Un comando,
un efecto original y recuperación denegada al otro administrador. Esto actualiza
el pendiente de integración de esos dos recorridos, no acredita todo el workflow
ni Spaces. [Cambios, evidencia y límites](docs/DOCUMENT-DELETION-COMPATIBILITY-WEB.md).

### Estado revisado para publicación — 2026-10-17

La baja admite seguimiento y constancias parciales; la sesión restringida usa projection=session y la recuperación administrativa usa GET sin repetir la mutación. La entrega LEGACY restringida y el recibo realmente depurado tienen evidencia de navegador/backend/PostgreSQL aislados en [el informe de compatibilidad](docs/DOCUMENT-DELETION-COMPATIBILITY-WEB.md). Las afirmaciones anteriores fechadas sobre integración pendiente son históricas. Drenaje real en Spaces pendiente: no se acredita eliminación total ni aptitud productiva. Publicación de código en feature/driver-verification no equivale a activación o despliegue.

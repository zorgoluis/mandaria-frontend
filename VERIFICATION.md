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

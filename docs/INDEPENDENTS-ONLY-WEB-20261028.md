# Web: operación independiente — 2026-10-28

## Alcance actual

Decisión posterior que sustituye la prioridad de salida de flotilla en la experiencia visible. Se conservan archivos, APIs históricas, permisos, recuperación y evidencias anteriores; no se revierte su implementación. Navegación sin flotilla, salida ni invitaciones; dashboard administrativo centrado en independientes. No selector de categoría, conversión, proveedor ficticio ni desvinculación automática. Web1.11.0 sin modificación de versión, rama main; sin commit/push o despliegue.

Fuentes leídas: INDEPENDENTS-READINESS-20261028.md, DRIVER-CATEGORY-EXCLUSIVITY-CONTRACT.md, OpenAPI, controladores/DTO actuales de categorías, independientes, recepción y ejecución. Las59 pruebas backend del readiness y185 anteriores NO son pruebas Web nuevas. `contract-check.json` documenta rutas/esquemas locales; no acredita disponibilidad de un proceso.

Comprobación nueva de entorno: `node C:/Users/zorgl/Documents/mandaria-backend/scripts/mandaria-interactive.mjs status` → offline, postgresRunning:false. URL API viva, build servido, capacidades/flags y migraciones efectivas: NO acreditados. No se inició ni resembró instancia compartida. HTTP real nuevo: PENDIENTE, no PASS.

## Cambios y contratos

- `src/layouts/AdminLayout.tsx`, `src/dashboard/Dashboard.tsx`, `src/driver-portal/pages.tsx`: accesos a expediente, vehículo propio, créditos, recepción/zonas/turno, ofertas y servicio; histórico operativo y recibos preservados. Las rutas históricas mantienen sus guardas. No se deshabilitan APIs backend. Registro/onboarding existentes conservan PENDING, revisión SUPER_ADMIN y separación de aprobación comercial/documental.
- `src/driver-category/{service,contract}.ts`, `src/independent-drivers/pages.tsx`: GET `/admin/drivers/:driverId/category` independiente del404 de perfil. NONE permite proponer habilitación con motivo y confirmación; categoría/revisión fresca antes del POST existente. FLEET y REVIEW_REQUIRED bloqueados. Refresco tras conflicto; no revisión numérica ni catálogo global inventado. DriverID conocido procede de una referencia autorizada; no confundir con profileId de zonas.
- `src/driver-portal/{service,attempt-api,attempts,recovery}`: TAKE/RELEASE con Idempotency-Key UUID en header; body sin requestId. Respuesta IndependentCommandResponse validada, no DriverDispatch legacy. Intención cifrada AES-GCM IndexedDB y add atómico por entorno/actor/despacho/operación antes de POST. Fence de sesión impide enviar tras cambio de cuenta durante persistencia. Un intento guardado no se reenvía automáticamente.
- GET `/driver/dispatches/:id/independent-attempt?operation=TAKE|RELEASE`, misma clave: APPLIED recupera resultado original; PENDING_OR_UNKNOWN sólo consulta/cierre explícito, nunca nueva clave. POST de cierre sin body, misma query/header. CLOSED_NO_EFFECTS se reconoce antes de preparar otra intención. 401/403/red conservan intención. UI privada de recuperación permite consulta/cierre con identidad restringida ACCOUNT_CLOSING; no TAKE nuevo. RELEASE no depende de GET del despacho liberado.
- `src/driver-portal/{reception-service,reception-intent,reception}`: GET/PUT offer-reception, zonas propias leídas, START/RENEW/STOP/SELECT_ZONE explícitos con requestId en body y revisión decimal. Intención durable separada del protocolo TAKE/RELEASE, mismo cuerpo en recuperación manual, caducidad de replay7d conservada. Conflicto exige reconocer y revisar. PATCH availability AVAILABLE/OFFLINE; turno no equivale a disponibilidad. Feed HTTP paginado por token opaco, snapshot/revisión coherentes, publicación sólo al completar páginas; siguiente actualización comienza en primera página. Poll15s, foco y reconexión recuperan HTTP, sin replay de mutaciones ni dependencia de sockets/FCM. READY habilita intentar; PREVIEW no.
- `src/driver-portal/execution.tsx`: cinco hitos, execution-completion, REPORT y shipping-collection sólo DRIVER propio y acciones servidor; assignmentId/revisión actual y clave durable. Relectura antes de confirmar, marcadores técnicos en localStorage por entorno/actor/asignación/operación y bloqueo entre pestañas; no guardan cuerpos de declaraciones. GET de intento y cierre conservan clave; ausencia no permite repetir acción física. SUPER_ADMIN no toma ni completa. Se preservan declaraciones y custodia; cobro declarado/recogida/incidencia impiden ofrecer RELEASE. El servicio DETAILED no usa deliver legacy.
- `src/deletion/ActiveService.tsx`: elimina la entrada RELEASE legacy sin clave (backend keyed exige DETAILED); resolución legacy de entrega permanece autorizada. No intenta simular liberación detallada desde una proyección legacy. Ruta privada adicional en App/deletion para recuperar TAKE/RELEASE propios.
- `src/dispatch/admin.tsx`: noProviderAvailable informa sólo ausencia de candidatos de flotilla; no acredita ausencia de independientes ni bloquea TAKE.

La recuperación de ejecución confirma estado técnico, no acredita un nuevo cobro, saldo actual ni movimiento físico. La aprobación no crea turno, recursos heredados ni cuenta de proveedor. Créditos se muestran como movimientos propios del recibo, separados del efectivo.

## Evidencia y matriz

Navegador: `node scripts/verify-independents-only-ui.mjs`; Chromium instalado, Vite127.0.0.1:4270, envDir:false/configFile:false, HTTP totalmente interceptado, destinos externos bloqueados. No Nest/PostgreSQL ni servicio reservado. Fixtures con UUID sintéticos, sin MDR inventado; MQ-999999 sólo fixture del contrato de cobro, no cotización creada. Fechas de DTO son sintéticas. Capturas y `browser.json` en `docs/evidence/independents-only-20261028/`.

| Caso | Evidencia / estado |
| --- | --- |
| Zona propia, revisión grande, turno explícito, READY/PREVIEW | Navegador con dobles y unitarias; HTTP PENDIENTE |
| NONE con Driver real de fixture y perfil404 | Navegador SUPER_ADMIN con dobles; categoría por endpoint nuevo |
| FLEET/REVIEW_REQUIRED/histórico/suspendido, roles | Regresión de componentes/unitarias; HTTP PENDIENTE |
| TAKE, vehículo propio, sin candidatos de flotilla | Navegador con dobles, una petición; no creación real de cargo |
| TAKE/RELEASE timeout, reload y recibo original | Navegador con IndexedDB real y HTTP simulado; detalle liberado404 |
| Cinco hitos, entrega detallada, revisión y clave | Navegador con dobles; no entrega física ni backend acreditados |
| Declaración de efectivo y RELEASE bloqueado | Fixture de navegador; validación HTTP real PENDIENTE |
| Cierre técnico, PENDING_OR_UNKNOWN, partición por actor/entorno, fallo almacenamiento | Unitarias; cierre vs POST tardío real PENDIENTE |
| Catálogo/feed paginado y revisiones | Unitarias con dobles; HTTP snapshot/cursor real PENDIENTE |
| Registro/onboarding PENDING, términos, licencia y revisión | Suite documental existente reejecutada; alta completa HTTP PENDIENTE |
| Aprobaciones concurrentes/dos sesiones/reauth | Guards y relectura implementados; carrera real PENDIENTE |
| Socket perdido/reconexión | HTTP poll/foco/reconexión implementados; no cliente socket Web nuevo, prueba multiinstancia PENDIENTE |
| Incidencia/custodia, asistencia, movementContext e historial anteriores | Regresiones locales; HTTP histórico no reejecutado |

No se declara aceptación Android, FCM, producción o integración conjunta. Comandos/resultados finales y fallos intermedios se registran en verification.json; la suite global no se sustituye por focales.

## Incidencias de desarrollo

Primer navegador sandbox no encontró Chromium; se usó instalación existente con permiso local, sin descargar dependencias. Primer harness navegó antes de terminar el reconocimiento IndexedDB y encontró dos intentos; se espera su desaparición. Segunda ejecución intentó abrir login con sesión existente: se aisló la sesión sintética antes del rol SUPER_ADMIN. No son fallos de negocio ni éxitos HTTP reales.

Primera global:1583PASS/50FAIL/0omitidas.45 fallos se debían a usar mockResolvedValue sobre un método real executionApi.detail en setup; se corrigió mediante spyOn. Los restantes eran expectativas de navegación anterior. No se omiten tests ni se amplían tiempos. Corrida focal de correcciones189PASS/3FAIL antes de normalizar expectativas CRLF; conservar informes test-results. Los resultados nuevos finales no se suman a estas corridas.

## Handoff para aceptación HTTP

Responsable backend debe entregar URL loopback dedicada autorizada, SHA/snapshot servido (1.13.4 solo no basta), migraciones aplicadas y capacidades públicas verificables. Recepción independiente y ejecución detallada disponibles; flotilla/salida/asistencia fuera de esta operación, FCM apagado. No cambiar flags de la instancia compartida durante servicios.

Proveer identidades sintéticas separadas DRIVER/SUPER_ADMIN, cuenta NONE sin perfil, independientes PENDING/APPROVED/SUSPENDED, vehículos propios activos/inactivos, expediente/términos/licencia, créditos provisionados legítimamente, zonas propias y políticas. Preparar dos sesiones para revocación/concurrencia. FLEET/REVIEW_REQUIRED sólo fixtures entregados por backend; no SQL dual.

Un nuevo pedido de integración debe originarlo su cliente titular y entregar la referencia autorizada; no reutilizar Coita/MDR reservado ni cuentas reales. No se envían mensajes automáticamente. Con ese entorno: verificar alta→revisión→zona/turno→oferta sin candidatos→TAKE→hitos/cobro→completion; en otro servicio RELEASE permitido, timeout/recibo y denegación tras custodia/cobro. Registrar rutas, timestamps reales y recibos saneados; cerrar exclusivamente recursos propios según acuerdo.

Hasta disponer de esa instancia, la aceptación HTTP sigue bloqueada; este informe no solicita ni ejecuta un arranque/resembrado compartido.

## Resultado final de verificación Web

Global completa `node node_modules/vitest/vitest.mjs run --reporter=default --reporter=json --outputFile=test-results/independents-global-final-complete.json`:1633/1633 PASS,81 archivos,0 omitidas, salida0,154.53s. TEMP/TMP=test-results/category-temp. Corrida anterior1632/1633 falló sólo por texto retirado de consulta DRIVER; corregida expectativa. Otra corrida posterior salió1 con1615 aprobadas y18 sin resultado pese a success:true en JSON: NO es PASS, no se atribuye una causa no acreditada; corrida completa con log capturado posterior aprobada, sin cambiar tiempos, concurrencia o aislamiento.

Tipos: tsc -b y tsc --project tsconfig.test.json. Lint: eslint . --ignore-pattern test-results/** --ignore-pattern .tmp/** (sólo snapshots generados excluidos; incluye src/test y scripts). Build programático Vite configFile:false/envDir:false, React, API explícita127.0.0.1:4270, salida test-results/independents-build-final;2425 módulos, advertencia chunk>500kB conservada. Sin dependencias/.env/configuración cambiadas. Navegador final8 escenarios PASS, cero errores de página, siete capturas. Inspección visual de06/07: hitos, custodia, cobro declarado y ausencia de RELEASE; no indicación de cobro verificado ni pago bancario. Logs/resumen/huellas saneados en verification.json.

## Actualización posterior: backend encendido

La aceptación HTTP/UI del mismo día ya avanzó contra backend1.13.5. El bloqueo offline anterior es histórico; persisten almacenamiento documental y recorridos conjuntos pendientes. Véase [evidencia real y continuidad](INDEPENDENTS-LIVE-WEB-20261028.md). No sustituir esta aceptación parcial por las cifras simuladas anteriores.

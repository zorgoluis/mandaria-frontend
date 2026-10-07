## F-01 cerrado — 2026-10-03 (seguimiento)

**F-01 corregido y verificado con frontend + backend + PostgreSQL reales aislados.** El dictamen y la reproducción anteriores se conservan abajo como historial, no como bloqueo vigente. Sin modificaciones backend; sin cambios a .env, activación de producción, Docker, commit, push o despliegue.

### Cambio

- src/dispatch/types.ts declara DispatchAssignmentSummary con los campos reales de providerDispatchView; no hereda status ni simula DeliveryAssignment completo.
- src/dispatch/pages.tsx obtiene la entidad completa del historial existente y exige ID = execution.activeAssignmentId = resumen.id, status ACTIVE real, dispatchId y providerId correctos. No inventa estado ni fuerza tipos; Badge permanece intacto.
- GET /provider/dispatches/:id/assignments devuelve un **arreglo completo sin paginación**, confirmado en historyForProvider (findMany sin take/skip). No se omiten páginas ni se inventan parámetros. use-assignments separa la lectura por revisión detallada y la refresca periódicamente; carga, error, ausencia o divergencia bloquean operación y ofrecen actualizar ambas vistas.
- ExecutionPanel recibe la asignación confirmada para no habilitar avance/incidencia si su lectura independiente ya muestra otra asignación. AssignmentPanel explica la falta de confirmación; no presenta una divergencia como autorización para asignar.
- Legacy mantiene la búsqueda de ACTIVE en historial; autorización por providerId y transferencia siguen siendo del servidor. Los controles frontend no sustituyen expectedRevision/locks backend ni aseguran que el servidor no cambie después de una lectura.

### Casos nuevos ejecutados

| Caso | Resultado actual |
| --- | --- |
| Resumen real sin status y render PROVIDER_ADMIN | PASS, HTTP real 200, sin fallo Badge ni errores de página |
| Cinco hitos desde botones de la UI, luego DELIVERED | PASS: TO_PICKUP → AT_PICKUP → PICKED_UP → TO_DROPOFF → AT_DROPOFF → entrega; un outbox y cero asignaciones ACTIVE |
| Transferencia FLEET A→B en base aislada | PASS: proveedor anterior sin Registrar/entregar; receptor B con resumen real y claimedByMe histórico distinto continúa dos hitos y entrega desde UI; un SERVICE_AWARD y un outbox |
| Carga e historial ausente/erróneo/incompatible | PASS con fixtures frontend; no habilita acciones |
| Cambio concurrente a TRANSFERRED en historial | PASS con fixture frontend; se retiran las acciones anteriores |
| Legacy y ejecución existente | PASS suites pertinentes; no repetida la suite completa de reconciliación real ya aprobada |

Las operaciones HTTP del navegador fueron reales. Sólo la preparación de rutas usa local_fake incorporado; no hubo mocks de ejecución/asignaciones. Datos sintéticos y atestaciones de laboratorio, sin movimientos físicos, llamadas externas ni webhooks enviados. Se reutilizó exclusivamente el clúster aislado anterior; backend 004b750 con sus cambios locales, frontend 65c4d77 con cambios preexistentes más esta corrección. No se modificó la implementación del backend.

### Comandos y evidencia

- npm run typecheck:test: exit 0.
- npm run lint: exit 0.
- npm run build: exit 0 (tsc -b + Vite); advertencia existente Root ~579 kB.
- npx vitest run src/test/dispatch.test.tsx src/test/delivery-assignments.test.tsx src/test/delivery-completion.test.tsx src/test/execution.test.tsx: **125/125**, cuatro archivos, exit 0. Corrida anterior 124/124 antes de añadir concurrencia; no se suman.
- node test-results/integration-real/f01-provider.cjs: PASS real navegador/HTTP/SQL.
- node test-results/integration-real/f01-transfer.cjs: dos casos PASS real navegador/HTTP/SQL.
- Evidencia sanitizada y huellas: [f01-closure.json](checks/f01-closure.json). Capturas locales ignoradas: f01-delivered-desktop.png, f01-delivered-mobile.png, f01-receiver.png en test-results/integration-real.
- Primer chequeo detectó un error JSX durante edición y fixtures antiguas que confundían entidad/resumen; corregidos antes de las corridas aprobadas, sin silencios de tipos. No abortos Vitest.

No queda bloqueo F-01. La publicación/activación y otras verificaciones operativas continúan fuera del alcance. Servicios temporales detenidos al terminar; contraseña sintética temporal eliminada. Historial de pruebas anteriores preservado a continuación.

---

# Integración real de ejecución y reconciliación — 2026-10-03

## Dictamen

**Backend real aprobado en los casos ejecutados; integración frontend parcial por un defecto reproducible de la vista del proveedor.** No se corrigió frontend ni se modificó código backend: no se demostró defecto backend. No constituye autorización para producción.

## Versiones y aislamiento

- Frontend `main`, base `65c4d772198c8211600cd4c91e0ba6364ba9e385`, paquete 1.10.0, **más cambios locales preexistentes de reconciliación**, conservados.
- Backend `QA`, base `004b750d5af2be006761e11116bf397aac474830`, paquete 1.12.0, **más cambios locales de recibos/cierre y migración**. No se atribuye el resultado al commit limpio.
- Huellas SHA-256 y resultados sanitizados: [execution-real-integration.json](checks/execution-real-integration.json).
- Node 24.15.0, PostgreSQL 18.6 local. Clúster NUEVO en `test-results/integration-real/pg`, loopback `127.0.0.1:55439`, base `mandaria_frontend_execution_test`. 32 migraciones desde vacío; sin reset de otra base ni Docker.
- Backend `127.0.0.1:3307`, control de fixtures `127.0.0.1:3308`, Vite `127.0.0.1:5176`. Variables sólo de proceso, sin editar .env. DETAILED_EXECUTION_ENABLED=true exclusivamente en ese proceso aislado; false temporalmente para crear legacy. Worker B2B deshabilitado con B2B_WEBHOOK_POLL_SECONDS=0; cero endpoints configurados y cero intentos de envío comprobados en SQL.
- Autenticación humana real, Nest/Prisma/PostgreSQL reales; no mocks de ejecución/reconciliación. Preparación usa routing `local_fake` incorporado (la suite E2E sustituye sólo cálculo externo de rutas por distancias de fixture). **No verifica Google/rutas externas**, que no forman parte de esta prueba. Sin Coita, producción, movimientos físicos, pagos o llamadas externas. Los registros de confirmación física son atestaciones sintéticas de laboratorio.

## Matriz

| Caso | Backend real HTTP + PostgreSQL | Frontend actual en Chromium |
| --- | --- | --- |
| Cinco hitos consecutivos y DELIVERED | PASS; rechaza salto, duplicado seguro, un outbox | **Bloqueado para proveedor vigente** por F-01. Receptor independiente completó los dos hitos restantes y entrega desde UI |
| Incidencia y retorno RETURNED | PASS, recursos liberados, sin outbox de entrega/refund | PASS desde página de incidencia SUPER_ADMIN |
| Transferencia | PASS FLEET→INDEPENDENT e inversa, único custodio, fase/cargo conservados | PASS transferencia a candidato real independiente; SQL confirma uno ACTIVE, misma fase, mismo número de SERVICE_AWARD, cero refunds |
| Respuesta perdida, APPLIED | PASS recibo durable y reinicio de proceso en suite | PASS POST llegó al servidor y respondió 200; Playwright descartó respuesta, recarga, consulta real y retirada del marcador |
| PENDING_OR_UNKNOWN | PASS no inferir fracaso | PASS abortar antes de enviar, recarga, GET real conserva bloqueo |
| Cierre CLOSED_NO_EFFECTS | PASS clave durable y original tardío 409 | PASS confirmación explícita; después el body/key original llegó realmente y recibió EXECUTION_ATTEMPT_CLOSED. Asignación seguía ACTIVE |
| Cuenta/permisos/concurrencia | PASS roles, cuentas distintas, resolve/close concurrentes y custodia única | PASS logout/login otro SUPER_ADMIN, bloqueo y marcador tras reload, sin consulta/cierre ajeno; retorno a iniciador permite cierre explícito |
| Legacy / delivery.completed | PASS legacy sin ejecución/hitos; un evento de entrega, sin repetición | PASS pantalla legacy entregada. Outbox comprobado, **no envío ni recepción de webhook** |
| Acceso tras transferencia | PASS antiguo ejecutor no puede entregar | PASS proveedor anterior sin Registrar/entregar; receptor real ve progreso y registra continuación |

La prueba de red descarta respuestas mediante Playwright; no simula caída física del enlace ni reinicio del sistema operativo. Las carreras de la suite son ejecuciones reales concurrentes, no prueba de carga. No se acredita matriz exhaustiva móvil/roles multi-membership ni todos los campos de payload por estas pruebas focalizadas.

## Hallazgo frontend F-01 (no corregido)

**Bloquea la operación de PROVIDER_ADMIN sobre una asignación detallada activa.**

1. Crear servicio sintético, claim de proveedor A y asignar driver/vehículo con ejecución detallada admitida.
2. Login real del administrador de A. Abrir `/services/:dispatchId?providerId=:providerA`.
3. GET `/api/v1/provider/dispatches/:id?providerId=...` devuelve 200, status CLAIMED, execution activo y assignment resumida con claves `id, mode, assignedAt, assignedByUserId, driver, vehicle`; **no incluye status** (contrato actual de `providerDispatchView`).
4. `src/dispatch/pages.tsx` elige `dispatch.assignment` cuando coincide con execution.activeAssignmentId y lo pasa como DeliveryAssignment completo.
5. `src/delivery-assignments/panel.tsx` → ActiveAssignment → AssignmentBadge recibe assignment.status undefined. `src/components/ui.tsx` → Badge ejecuta value.toLowerCase y falla.
6. Resultado visible: «No fue posible mostrar esta página». No se pueden registrar hitos desde esa pantalla.

Responsable FRONTEND: contrastar el tipo resumido de `src/dispatch/types.ts` y resolver la entidad vigente con la fuente completa existente (historial, filtrado por activeAssignmentId), o presentar correctamente el resumen sin inventar campos. No ampliar backend sólo para enmascarar un tipo frontend incorrecto. Captura ignorada `test-results/integration-real/provider-detail.png`. Pendiente corrección y repetición del flujo completo de proveedor desde UI.

## Comandos/resultados ejecutados

- `initdb`, `pg_ctl start`, `createdb`: cluster nuevo local, exit 0.
- Backend, DATABASE_URL sólo de proceso hacia la base nueva: `npx prisma migrate deploy`: 32/32; `npm run build`: exit 0.
- `npx vitest run --config vitest.config.e2e.ts test/delivery-execution.e2e-spec.ts --pool=forks --maxWorkers=1 --reporter=json --outputFile=.../backend-e2e.json`: **16/16**, exit 0, archivo completo. Tests de retorno concurrente, transferencias, rollback, permisos, claves, late original, reinicio y legacy incluidos.
- Arnés de laboratorio basado en setup del test existente, sin override de ejecución. Sirve AppModule compilado y fixtures. `node --import ./node_modules/tsx/dist/loader.mjs .../harness.mts` y Vite actual con VITE_API_URL del proceso.
- Playwright/Node: `browser-real.cjs` (4 casos finales PASS), `transfer-user.cjs` (2 PASS), `driver-deliver.cjs` (1 PASS), `legacy.cjs` (2 PASS). Artefactos ignorados bajo test-results/integration-real; informes sanitizados consolidados en docs/checks.
- SQL confirma cero endpoints de webhooks y cero intentos de envío. Outbox DELIVERY_COMPLETED persistido, sin despacharlo.
- No se repitieron suites mock, lint o build frontend: no se cambió su implementación; se sirvió código actual mediante Vite. No se presenta un resultado histórico como ejecutado aquí.

### Incidencias del arnés, no defectos de producto

Imports Windows necesitaron file URLs; auditoría de ledger usa referenceId (no dispatchId); selección de incidencia usa proyección real del listado. Login 429 se respetó esperando ventana; no se relajó throttling. Fecha datetime-local se introdujo con precisión de minutos y se esperó una fecha no anterior al último hito. La espera de marcador se ajustó para esperar también la respuesta real del servidor antes de recargar; el marcador se persiste ANTES del transporte. Ejecuciones parciales/interrumpidas no cuentan como PASS. Un primer intento eligió cuenta de independiente diferente del candidato realmente seleccionado; se verificó luego con la cuenta sintética del receptor efectivo. No se cambió la custodia por SQL.

## Evidencia y pendientes

Capturas locales ignoradas: provider-detail.png, closed-real.png, transfer-real.png, driver-real.png, driver-delivered-real.png, legacy-real.png. Sólo datos sintéticos. El archivo temporal accounts.local.json con la contraseña sintética fue eliminado al cerrar. No publicar ficheros del clúster.

Pendiente F-01 y repetición UI proveedor de cinco hitos; distribución real de webhooks y producción excluidas por alcance. No activación de producción, commit, push o despliegue. Servicios temporales detenidos al cerrar esta tarea; fixtures y evidencias permanecen locales.

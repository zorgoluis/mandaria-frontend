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

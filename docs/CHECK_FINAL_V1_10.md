# CHECK FINAL MANDARIA V1.10 — Credits & Monetization

Fecha: 2026-09-23. Validación conjunta de V1.10-A … V1.10-F sobre el estado commiteado de los dos repositorios, con backend real, base de datos real, navegador real y pruebas adversariales directas contra PostgreSQL. No se implementó funcionalidad, no se cambiaron reglas de negocio, no se crearon endpoints y no se modificaron migraciones.

## Veredicto

**Mandaria V1.10 Credits & Monetization — COMPLETADA Y VALIDADA END-TO-END.** Sin defectos económicos y con todas las barreras del §70 en verde. El detalle está abajo; el cierre, al final.

## Environment

| Elemento                      | Valor                                                                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node                          | v24.15.0                                                                                                                                                    |
| PostgreSQL                    | 18.6 (x86_64-windows)                                                                                                                                       |
| Prisma                        | 6.19.3 (cliente y CLI)                                                                                                                                      |
| NestJS                        | 11.2.4                                                                                                                                                      |
| Base de escenarios            | `mandaria_db` (base local de desarrollo, con la historia real V1.0→V1.10)                                                                                   |
| Base de regresión E2E backend | `mandaria_test`, aislada y protegida por `scripts/test-database-url.ts` (rechaza cualquier URL que no termine en `_test` o que coincida con `DATABASE_URL`) |
| Routing                       | `ROUTING_PROVIDER=local_fake` inyectado **sólo al proceso** del CHECK; `.env` intacto                                                                       |
| Correo                        | `MAIL_PROVIDER=local_outbox` al proceso; ningún correo real                                                                                                 |

Se usó la base de desarrollo para los escenarios económicos, y no una base nueva, porque el CHECK debe validar la frontera histórica real (`LEGACY`, `PRE_ENFORCEMENT_AWARD`) y el mundo V1.4–V1.9 (proveedores, coberturas, repartidores, independientes, credenciales B2B) que sólo existe ahí. No se destruyó ninguna base y todos los saldos tocados quedaron compensados.

## Git State

| Repositorio       | Rama                        | HEAD      | Estado                                                                         |
| ----------------- | --------------------------- | --------- | ------------------------------------------------------------------------------ |
| mandaria-backend  | `v1.10-credit-monetization` | `143ffde` | ` M .env` — **cambio previo del usuario** (SMTP, TTLs), no tocado por el CHECK |
| mandaria-frontend | `v1.10-credit-monetization` | `ba35331` | limpio al iniciar                                                              |

Cambios generados por el CHECK: únicamente los dos documentos de esta verificación (`docs/CHECK_FINAL_V1_10.md`, `docs/checks/v1.10-final-evidence.json`) en el frontend. El árbol del backend quedó exactamente como estaba. Sin commit y sin push.

## V1.10-A Credit Accounts & Immutable Ledger

| Escenario                                                                                                                                                                     | Resultado |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Cuenta de proveedor e independiente, separadas y con `ownerType` correcto                                                                                                     | PASS      |
| Recarga atómica (0 → 100) con `Idempotency-Key`, repetición idempotente (200 + `Idempotent-Replayed: true`, mismo `entry.id`) y `CREDIT_IDEMPOTENCY_CONFLICT` con otro cuerpo | PASS      |
| Ajuste positivo (20 → 30) y negativo (30 → 25) con motivo obligatorio                                                                                                         | PASS      |
| Sobregiro por ajuste rechazado con `INSUFFICIENT_CREDITS`, saldo intacto                                                                                                      | PASS      |
| 8 recargas concurrentes: saldo final exactamente `8 × 5 = 40`, sin lost update                                                                                                | PASS      |
| 8 ajustes concurrentes: saldo final exactamente `40 − 8 × 3 = 16`, nunca negativo                                                                                             | PASS      |
| Ledger sin ruta de escritura: `PATCH`/`DELETE` de ledger y de una entrada → 404                                                                                               | PASS      |

## V1.10-B Credit Policy Engine

| Escenario                                                                            | Resultado |
| ------------------------------------------------------------------------------------ | --------- |
| Política resuelta por `ServiceType` y `ActorType` (PROVIDER 7, INDEPENDENT_DRIVER 5) | PASS      |
| Cálculo determinista y ligado a la versión ACTIVE                                    | PASS      |
| Distancia canónica: decimal, negativa y texto → 400                                  | PASS      |
| Nueva versión sólo afecta cálculos futuros                                           | PASS      |
| Inmutabilidad: `PATCH`/`DELETE` de política → 404                                    | PASS      |

## V1.10-C Dispatch Credit Snapshot

| Escenario                                                                                      | Resultado |
| ---------------------------------------------------------------------------------------------- | --------- |
| Al abrir el Dispatch se congela un snapshot por actor (7 y 5) con su política y versión        | PASS      |
| Cada actor ve sólo su propio costo (`creditCost` 7 para el proveedor, 5 para el independiente) | PASS      |
| Cambio de política a 12 después de abrir: el Dispatch existente sigue en 7 y el nuevo cobra 12 | PASS      |

## V1.10-D Atomic CLAIM / TAKE

| Escenario                                                                                                                                                             | Resultado                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| CLAIM debita exactamente el costo congelado, una sola vez (50 → 43, 1 `SERVICE_AWARD` de −7)                                                                          | PASS                                           |
| Costo mostrado = costo cobrado (`creditCost` 7 = \|award\| 7)                                                                                                         | PASS                                           |
| Saldo exacto: 7 → 0, nunca negativo                                                                                                                                   | PASS                                           |
| Saldo insuficiente: 409 `INSUFFICIENT_CREDITS`, 0 awards, saldo intacto, Dispatch sigue OPEN, ledger sin filas nuevas                                                 | PASS                                           |
| 10 CLAIM concurrentes: 1 adjudicación, 1 award, 1 débito                                                                                                              | PASS                                           |
| Re-CLAIM del mismo dueño: 200 idempotente (`ALREADY_OWNER`) **sin segundo cargo**                                                                                     | PASS                                           |
| Saldo limitado (50) con 20 intentos sobre 10 Dispatches: 7 adjudicados (`floor(50/7)`), 7 awards, saldo 50 → 1, nunca negativo                                        | PASS                                           |
| TAKE independiente: 1 award de −5 en **su** cuenta (40 → 35)                                                                                                          | PASS                                           |
| TAKE con saldo exacto (5 → 0) y con saldo insuficiente (409, rollback íntegro)                                                                                        | PASS                                           |
| 6 TAKE concurrentes: 1 adjudicación, 1 award                                                                                                                          | PASS                                           |
| `ENFORCED` verificado contra el ledger, no asumido                                                                                                                    | PASS                                           |
| Legacy (`creditMode = LEGACY`): 0 snapshots, 0 awards, sin cobro retroactivo                                                                                          | PASS                                           |
| `PRE_ENFORCEMENT_AWARD`                                                                                                                                               | NOT APPLICABLE — no existen filas en esta base |
| Cobro sin routing ni consulta de política: `chargeDispatchAward` sólo lee `DispatchCreditSnapshot`; 0 imports de routing o del motor de políticas en la ruta de cobro | PASS                                           |

## V1.10-E Refunds & Reversals

| Escenario                                                                                        | Resultado |
| ------------------------------------------------------------------------------------------------ | --------- |
| Release del proveedor: award −7 + refund +7, saldo restaurado                                    | PASS      |
| Release del independiente: refund +5, saldo restaurado                                           | PASS      |
| Cancelación de la solicitud sobre un servicio adjudicado: exactamente 1 refund, saldo restaurado | PASS      |
| Repetición del release: 409 `DISPATCH_NOT_CLAIMED_BY_PROVIDER`, sigue habiendo 1 refund          | PASS      |
| 2 releases concurrentes: 1 gana, 1 refund                                                        | PASS      |
| `SERVICE_REFUND.amount = abs(SERVICE_AWARD.amount)` y `reversesEntryId` apunta al award          | PASS      |
| El ledger conserva recarga, cargo y devolución como filas independientes                         | PASS      |
| Política cambiada después del cargo: award y refund siguen en 7, nunca 12                        | PASS      |

## V1.10-F Web

10/10 fases contra navegador real y backend real (`scripts/verify-credits.mjs`):

| Fase                                                                                            | Resultado |
| ----------------------------------------------------------------------------------------------- | --------- |
| Cuentas de proveedor e independiente separadas                                                  | PASS      |
| Recarga y ajuste atómicos e idempotentes (incluye conflicto con otro cuerpo)                    | PASS      |
| Ledger sin rutas de escritura                                                                   | PASS      |
| Políticas versionadas e inmutables + cálculo del backend                                        | PASS      |
| Aislamiento por rol en la API real                                                              | PASS      |
| SUPER_ADMIN administra créditos dentro de la ficha del proveedor (recarga y ajuste desde la UI) | PASS      |
| SUPER_ADMIN lee créditos del independiente y las políticas                                      | PASS      |
| PROVIDER_ADMIN lee su saldo y nada más (0 peticiones `/admin/`)                                 | PASS      |
| DRIVER lee sus créditos en el portal                                                            | PASS      |
| Responsive 1440/820/390 y auditoría de secretos en storage y URL                                | PASS      |

Además, a nivel de código: **0** usos del formateador de dinero y **0** literales `MXN` dentro de `src/credits/` y `src/credit-policies/`; la única aparición de `checkout` en todo el frontend está en la prueba de contrato que **prohíbe** esa ruta.

## Concurrency

| Carrera                                   | Esperado                          | Observado                 |
| ----------------------------------------- | --------------------------------- | ------------------------- |
| 10 CLAIM sobre un Dispatch                | 1 adjudicación, 1 award, 1 débito | exactamente eso           |
| 20 CLAIM sobre 10 Dispatches con saldo 50 | ≤ 7 adjudicaciones, saldo ≥ 0     | 7 adjudicaciones, saldo 1 |
| 6 TAKE sobre un Dispatch                  | 1 adjudicación, 1 award           | exactamente eso           |
| 2 releases sobre el mismo servicio        | ≤ 1 refund                        | 1 refund                  |
| 8 recargas + 8 ajustes concurrentes       | suma exacta                       | suma exacta               |

En ningún escenario apareció un saldo negativo, un segundo award ni un segundo refund.

## SQL Adversarial Validation

16 intentos directos contra PostgreSQL, cada uno dentro de una transacción revertida. **Todos rechazados por la base**, no por la aplicación:

| Intento                                                | Resultado                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| `UPDATE` del importe de una entrada del ledger         | rechazado                                                  |
| `UPDATE` del `balanceAfter` de una entrada             | rechazado                                                  |
| `DELETE` de una entrada del ledger                     | rechazado                                                  |
| `TRUNCATE` del ledger                                  | rechazado                                                  |
| `UPDATE` directo del saldo de una cuenta               | rechazado                                                  |
| Saldo negativo escrito a mano                          | rechazado                                                  |
| `SERVICE_AWARD` insertado sin contexto de cobro válido | rechazado                                                  |
| Segundo `SERVICE_AWARD` para el mismo Dispatch y actor | rechazado (`CreditLedgerEntry_award_check` / índice único) |
| Degradar un Dispatch monetizado a `LEGACY`             | rechazado                                                  |
| `SERVICE_REFUND` sin award                             | rechazado                                                  |
| Segundo `SERVICE_REFUND` para el mismo award           | rechazado                                                  |
| Refund mayor que su award                              | rechazado                                                  |
| Re-tarificar un snapshot                               | rechazado                                                  |
| Borrar un snapshot                                     | rechazado                                                  |
| Snapshot duplicado para el mismo Dispatch y actor      | rechazado                                                  |
| `TRUNCATE` de los snapshots                            | rechazado                                                  |

Guardas responsables (migraciones V1.10-A/C/D/E): `CreditLedgerEntry_guard`, `CreditLedgerEntry_apply`, `CreditLedgerEntry_no_truncate`, `CreditAccount_guard`, `CreditAccount_balance_check`, `CreditLedgerEntry_service_award_guard` + `CreditLedgerEntry_service_award_key`, `CreditLedgerEntry_service_refund_guard` + `CreditLedgerEntry_refund_award_key`, `DispatchCreditSnapshot_guard` + `DispatchCreditSnapshot_no_truncate` + índice único por Dispatch/actor, `Dispatch_credit_mode_guard`, `pre_enforcement_award_guard` y `dispatch_award_integrity`.

## Database Scan

19 consultas de integridad sobre el esquema real, **todas en 0**: saldos negativos, aritmética del ledger rota, importes en cero, saldo distinto del último `balanceAfter`, cuentas con dos dueños, awards duplicados, refunds duplicados, refunds sin award, refund con importe distinto del award, signos incorrectos por tipo, awards sin titular **ni** devolución, awards sobre cuenta de otro proveedor, Dispatch monetizado adjudicado sin award, monetizado sin snapshots, legacy con award, snapshots con créditos ≤ 0 y combinaciones con más de una política ACTIVE.

Totales del ledger al cierre: `RECHARGE` 57 filas, `SERVICE_AWARD` 55, `SERVICE_REFUND` 14, `ADMIN_ADJUSTMENT` 63.

## Role Isolation

| Actor                               | Rutas administrativas de créditos                                                       | Resultado                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| PROVIDER_ADMIN                      | cuenta, recarga, políticas, alta de política                                            | 403 en las cuatro                                |
| DRIVER                              | cuenta de proveedor, recarga de independiente, políticas, `/provider/credits`           | 403 en las cuatro                                |
| IntegrationClient (B2B)             | cuenta, políticas, `/provider/credits`, `/driver/credits`                               | 401 en las cuatro                                |
| PROVIDER_ADMIN sobre otro proveedor | claim con `providerId` ajeno, cuenta ajena, inyección de `creditAccountId` en el cuerpo | 403, 403 y 400; saldo del otro proveedor intacto |

Ningún intento movió un solo crédito. En la web, las rutas prohibidas se bloquean antes de pedir nada: 0 peticiones `/admin/` desde las sesiones de PROVIDER_ADMIN y DRIVER.

## Migrations

`prisma validate` → esquema válido. `prisma migrate status` → 17 migraciones, base al día, sin drift. `db:test:deploy` sobre `mandaria_test` → sin migraciones pendientes. Ruta histórica V1.0 → V1.9 → V1.10 preservada; no se ejecutó ningún reset.

## Logs

Auditoría sobre los registros del servidor y de los scripts del CHECK: **0** archivos con alguna de las contraseñas reales del entorno, **0** cadenas con forma de JWT (`eyJ…`) y **0** respuestas 5xx del backend durante todo el CHECK. El archivo de evidencia no contiene credenciales.

## Cleanup

- Credencial B2B temporal revocada.
- Saldos compensados: cada movimiento del CHECK se revirtió; las cuentas operativas quedaron con saldo de trabajo (proveedor A 500, independiente 200) para que las suites de regresión posteriores puedan adjudicar servicios.
- Asignación de entrega que una corrida previa había dejado activa: liberada por la ruta real antes de los escenarios.
- Servidores del CHECK detenidos y navegadores cerrados al terminar.
- Bases temporales: ninguna creada.

Permanecen en la base local, por diseño del dominio (son inmutables o no tienen endpoint de borrado): las versiones de política creadas por el CHECK, los Dispatches y solicitudes `CHK110-*`, el vehículo independiente `CHK110-*` y la habilitación independiente usada como fixture.

## Backend Regression

| Suite                                                                                                               | Resultado                                            |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Unitarias (`npm test`)                                                                                              | **188/188** en 20 archivos, 0 fallos                 |
| E2E del repositorio (`vitest --config vitest.config.e2e.ts test/`)                                                  | **288/288** en **19/19 archivos**, 0 fallos, 101.9 s |
| E2E de créditos (`credits`, `credit-policies`, `credit-consumption`, `credit-refunds`, `dispatch-credit-snapshots`) | **PASS**, incluidos en esos 19 archivos              |

### Por qué la regresión oficial excluye `.tmp/`

`vitest.config.e2e.ts` declara `include: ['**/*.e2e-spec.ts']` y sólo excluye `node_modules` y `.claude`. En esta máquina existe `.tmp/`, ignorada por Git, con specs que dejaron CHECKs anteriores (`check-v110d`, `check-v110e`, `fix-v110d`). El patrón los arrastra, y uno de ellos espera «one debit and **no refund**» al liberar un servicio: una expectativa de la época V1.10-D que **V1.10-E cambió a propósito**, porque liberar ahora devuelve los créditos completos. Otro ejecuta migraciones dentro de la misma base de pruebas. No son código del producto, no existen en un clon limpio ni en CI, y por eso la regresión oficial se acotó a `test/`. Los artefactos quedaron intactos: no se borraron.

### Incidente resuelto: estado acumulado en la base de pruebas

Antes del reinicio, `test/independent-drivers.e2e-spec.ts` fallaba 17 de 23. Diagnóstico ejecutado: el listado `/driver/dispatches/available` devuelve la primera página (20 elementos, `expiresAt` ascendente) y la base desechable arrastraba **78 Dispatches OPEN todavía vigentes** de corridas anteriores —incluidas una caída nativa de worker y los specs residuales de `.tmp/`—, así que el Dispatch nuevo del spec quedaba fuera de esa página y lo demás era cascada. Se reproducía con el archivo aislado, lo que descartó interferencia entre archivos.

Con autorización explícita del propietario se reinició **únicamente** `mandaria_test` (`npm run db:test:reset`), tras confirmar el destino: `localhost:5432/mandaria_test`, distinto de `mandaria_db`, con la guarda de `scripts/test-database-url.ts` que rechaza cualquier nombre que no termine en `_test`. Después del reinicio:

| Comprobación                                   | Antes                                       | Después            |
| ---------------------------------------------- | ------------------------------------------- | ------------------ |
| Dispatches OPEN vigentes en `mandaria_test`    | 78                                          | **0**              |
| `test/independent-drivers.e2e-spec.ts` aislado | 17 fallos de 23                             | **23/23 PASS**     |
| Suite E2E del repositorio                      | 3 archivos en rojo (2 de ellos de `.tmp/`)  | **19/19 PASS**     |
| `mandaria_db` (desarrollo)                     | 131 dispatches, 13 cuentas, 193 movimientos | intacta, sin tocar |

No era un defecto de producto: ninguna de las 17 caídas involucraba saldo, cargo, devolución ni snapshot.

## Frontend Regression

| Suite                                                             | Resultado                                          |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| Unitarias + contrato (`npx vitest run`)                           | **460/460** en 22 archivos, 0 fallos               |
| `test:e2e:credits` (navegador real, re-ejecutada para este CHECK) | **10/10 fases**                                    |
| `test:e2e:provider-admin`                                         | **10/10 fases** (mismo HEAD `ba35331`, 2026-09-23) |
| `test:e2e:logistics`                                              | **9/9 fases** (mismo HEAD, 2026-09-23)             |

Las dos últimas no se repitieron: su evidencia es del mismo commit y del mismo día, y ninguna toca la superficie de créditos.

## Quality

| Comprobación | Backend                                                                                                                                                                                                               | Frontend                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Build        | `nest build` PASS                                                                                                                                                                                                     | `vite build` PASS                |
| Lint         | `oxlint` PASS                                                                                                                                                                                                         | `eslint` PASS                    |
| Typecheck    | `nest build` PASS; `tsc --noEmit` sobre todo el proyecto reporta 4 errores **preexistentes** en `test/migrations/award-boundary.check.ts` (helper de V1.10-D, excluido por `tsconfig.build.json` y sin script propio) | `tsc -b` y `typecheck:test` PASS |
| Formato      | —                                                                                                                                                                                                                     | `prettier --check` PASS          |
| Docs         | `docs:check` PASS (OpenAPI al día)                                                                                                                                                                                    | —                                |

## Bugs Found

Ningún defecto económico. Los hallazgos son de higiene de pruebas y de contrato documental, y ninguno altera un saldo, un cargo o una devolución:

1. **La suite E2E del backend arrastra archivos no versionados de `.tmp/`.** Sugerencia, no aplicada porque no corrige producto: añadir `.tmp/**` a `exclude` en `vitest.config.e2e.ts`, o acotar el `include` a `test/**`.
2. **La base de pruebas compartida acumulaba estado** hasta hacer fallar un spec que depende de la primera página de un listado. Resuelto en esta corrida con el reinicio autorizado; conviene reiniciarla antes de cada regresión, o que el spec consulte por id en vez de por la primera página.
3. **4 errores de tipos preexistentes** en `test/migrations/award-boundary.check.ts`, fuera del build publicado.
4. **Contrato del ledger:** `reversesEntryId` y `refundReason` se persisten (V1.10-E) pero **no se exponen** en `CreditLedgerEntryResponse` ni en OpenAPI 1.10.0. Documentado en `docs/API-CONTRACT.md`; la web no inventa el vínculo y usa el `referenceId` compartido.

## Remaining Risks

- Mientras `vitest.config.e2e.ts` no excluya `.tmp/`, cualquier CHECK futuro en esta máquina volverá a ejecutar artefactos obsoletos y a reportar fallos ajenos al producto.
- Sin `reversesEntryId` en la API, una auditoría externa sólo puede enlazar cargo y devolución por el Dispatch que comparten.
- Las suites E2E del frontend anteriores a V1.10 asumen que el proveedor puede reclamar servicios; desde V1.10-D eso exige saldo. Este CHECK dejó las cuentas operativas financiadas (proveedor A 500, independiente 200) para que sigan siendo ejecutables.
- `PRE_ENFORCEMENT_AWARD` quedó como **NOT APPLICABLE** en los escenarios de este CHECK porque la base de desarrollo no tiene ninguna fila de esa frontera. El comportamiento sí está cubierto por las unitarias del backend (`test/credit-refunds.spec.ts` y `test/dispatch.spec.ts`, dentro de las 188/188) y por las guardas `pre_enforcement_award_guard` y `DispatchPreEnforcementAward_identity_key`, ejercidas indirectamente al rechazar la degradación de un Dispatch monetizado a `LEGACY`.
- Los conteos absolutos del ledger en `mandaria_db` (57 recargas, 55 cargos, 14 devoluciones, 63 ajustes) incluyen historia de versiones anteriores, no sólo lo creado hoy.

## Cleanup

- Credencial B2B temporal revocada.
- Saldos compensados: cada movimiento del CHECK se revirtió; las cuentas operativas quedaron con saldo de trabajo (proveedor A 500, independiente 200).
- Asignación de entrega que una corrida previa había dejado activa: liberada por la ruta real antes de los escenarios.
- Servidores del CHECK detenidos, puertos 3000 y 5173 libres, navegadores de Playwright cerrados por los propios scripts.
- Bases temporales creadas: ninguna. La única base reiniciada fue `mandaria_test`, con autorización explícita y verificando antes su destino; `mandaria_db` quedó intacta.
- Artefactos de CHECKs anteriores en `.tmp/`: conservados.

## Veredicto final

Barreras del §70:

```text
Credit Accounts · Immutable Ledger · Recharge · Adjustment          PASS
Policy Engine · Policy Versioning · Canonical Calculation           PASS
Dispatch Credit Snapshot · Snapshot Immutability                    PASS
Provider CLAIM Debit · Independent TAKE Debit                       PASS
Exact Balance · Insufficient Balance · No Negative Balance          PASS
CLAIM Concurrency · TAKE Concurrency · Balance Concurrency          PASS
SERVICE_AWARD                                                       PASS
Release Refund · Cancellation Refund · Refund Idempotency           PASS
Refund Concurrency · No Double Refund                               PASS
Legacy · ENFORCED                                                   PASS
PRE_ENFORCEMENT_AWARD            NOT APPLICABLE (sin filas en esta base; cubierto por unitarias y guardas SQL)
Provider Isolation · Independent Isolation                          PASS
Role Isolation API · Role Isolation Web                             PASS
Provider Web Credits · Independent Admin Credits                    PASS
Provider Portal Credits · Driver Portal Credits                     PASS
Web Award + Refund · Credits != Money · null creditCost != 0        PASS
SQL Economic Guards · Database Integrity Scan                       PASS
Migration Safety · Backend Regression · Frontend Regression         PASS
Quality · Cleanup                                                   PASS
```

No apareció ningún saldo negativo, cargo doble, devolución doble, devolución mayor que su cargo, cobro retroactivo, snapshot mutable, ledger mutable, bypass SQL ni cuenta cobrada por un actor ajeno. El cobro sale siempre del snapshot congelado: `chargeDispatchAward` sólo lee `DispatchCreditSnapshot`, sin routing ni motor de políticas.

**Mandaria V1.10 Credits & Monetization — COMPLETADA Y VALIDADA END-TO-END.**

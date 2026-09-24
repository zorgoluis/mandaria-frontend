# CHECK FINAL MANDARIA V1.11 — MVP Delivery Completion

Fecha: 2026-09-23. Validación conjunta de V1.11-A (backend) y V1.11-B (web) sobre el estado actual de los dos repositorios, con backend real, base de datos real, navegador real y pruebas adversariales directas contra PostgreSQL. No se modificó código de producto en ningún repositorio: los únicos archivos creados son los de esta verificación.

## Verdict

**Mandaria V1.11 MVP Delivery Completion — COMPLETADA Y VALIDADA END-TO-END.** Sin defectos de producto; el detalle y las barreras están abajo.

## Environment

| Elemento              | Valor                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| Node                  | v24.15.0                                                              |
| PostgreSQL            | 18.6                                                                  |
| Prisma                | 6.19.3                                                                |
| NestJS                | 11.2.4                                                                |
| Backend               | `mandaria-backend` 1.11.0, rama `v1.11-mvp-delivery-completion`       |
| Frontend              | `mandaria-frontend`, rama `v1.11-mvp_delivery_completion`             |
| Base de escenarios    | `mandaria_db` (historia real V1.0 → V1.11)                            |
| Base de regresión E2E | `mandaria_test`, aislada por `scripts/test-database-url.ts`           |
| Routing               | `ROUTING_PROVIDER=local_fake` inyectado **sólo al proceso** del CHECK |
| Correo                | `MAIL_PROVIDER=local_outbox` al proceso                               |

El usuario ya tenía un backend propio escuchando en el puerto 3000 con su `.env` (`ROUTING_PROVIDER=google`, que implicaría llamadas pagadas). **No se tocó**: el CHECK levantó su propia instancia en el puerto 3011 con `local_fake` y apuntó Mandaria Web a ella (`VITE_API_URL=http://localhost:3011`). El `.env` no se modificó en ningún momento.

## Git State

| Repositorio       | Rama                            | HEAD al iniciar | Estado al iniciar                                                                                                         |
| ----------------- | ------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| mandaria-backend  | `v1.11-mvp-delivery-completion` | `fa68b3b`       | ` M .env` (cambio previo del usuario), ` M docs/API_ACCESS.md`, ` M docs/openapi.json` (generados de V1.11-A, sin commit) |
| mandaria-frontend | `v1.11-mvp_delivery_completion` | `e530165`       | limpio                                                                                                                    |

Cambios generados por el CHECK: sólo `docs/CHECK_FINAL_V1_11.md` y `docs/checks/v1.11-final-evidence.json` en el frontend. El árbol del backend quedó exactamente como estaba.

## Precheck

Las once capacidades exigidas quedaron demostradas antes de cualquier prueba: lectura y ejecución de comandos en ambos repositorios, Mandaria Web levantada, Backend V1.11 levantado, conexión a PostgreSQL (con `DELIVERED` presente en el enum), suites de pruebas de ambos lados, llamadas HTTP y navegador real (Edge vía Playwright). Ambas rutas de V1.11 responden 401 tras el guard y una ruta inexistente responde 404, lo que confirma que la instancia bajo prueba es V1.11 y no una anterior.

## Baseline y prerrequisitos

Proveedor A `LOCAL_RAPIDOS_COITA` con cobertura ACTIVE en `LOCAL_OCOZOCOAUTLA`, proveedor B `LOCAL_MANDADOS_CENTRO`, repartidor independiente aprobado (Luis) con vehículo ACTIVE, y flota de A con repartidores y vehículos asignables. Políticas de créditos vigentes: `PROVIDER` v10 (7 créditos) e `INDEPENDENT_DRIVER` v2 (5 créditos). Saldos preparados con las APIs administrativas normales (proveedor A → 400, independiente → 200); esa recarga es preparación del CHECK, no resultado de la entrega. Todos los fixtures llevan el prefijo `CHECK-V111`.

## Provider flow

| Escenario                                                                    | Resultado                                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §14–16 Solicitud real → Quote → Accept → OPEN → CLAIM → ASSIGN               | PASS — 1 `SERVICE_AWARD`, snapshot `PROVIDER:7 / INDEPENDENT_DRIVER:5`, 1 asignación ACTIVE                                                                                               |
| §17 La web muestra origen, destino, repartidor, vehículo, estado y la acción | PASS — driver y vehículo visibles junto al botón `MARCAR COMO ENTREGADO`                                                                                                                  |
| §18 Cancelar el modal                                                        | PASS — **0 peticiones `/deliver`**, Dispatch sigue CLAIMED, asignación ACTIVE, ledger intacto                                                                                             |
| §19–20 Confirmar desde el navegador real                                     | PASS — 1 `POST /deliver` · `DELIVERED` con `deliveredAt` y `deliveredByUserId` = el PROVIDER_ADMIN autenticado · asignación `COMPLETED` con `endedAt`, `endedByUserId` y `endReason` nulo |
| §21 La web después del refetch                                               | PASS — muestra «Entregado»; 0 botones de completar, liberar o reasignar                                                                                                                   |
| §22 Liberación de recursos                                                   | PASS — 0 asignaciones ACTIVE en el servicio entregado; el mismo repartidor y el mismo vehículo se asignan de nuevo a otro servicio real                                                   |
| §23 Historial                                                                | PASS — la fila COMPLETED se conserva con repartidor, vehículo, `assignedAt`, `endedAt` y `endedByUserId`                                                                                  |
| §24 Preservación económica                                                   | PASS — `MDR-000268`: awards 1→1, refunds 0, snapshot idéntico, ledger sin filas nuevas                                                                                                    |
| §25 Idempotencia                                                             | PASS — repetir devuelve 200 sin cambiar `deliveredAt`, `deliveredBy`, ledger ni historial                                                                                                 |
| §26 Otro proveedor                                                           | PASS — 409 `DISPATCH_NOT_CLAIMED_BY_PROVIDER` con su propio scope y 403 usando el `providerId` ajeno; sin mutación de estado ni económica                                                 |
| §27 Claim sin asignación                                                     | PASS — 409 `NO_ACTIVE_ASSIGNMENT`, Dispatch sigue CLAIMED, 0 movimientos                                                                                                                  |

## Independent flow

| Escenario                        | Resultado                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| §28–29 Servicio real y TAKE      | PASS — 1 `SERVICE_AWARD` en **su** cuenta, asignación ACTIVE con su vehículo                           |
| §30 El portal muestra la acción  | PASS — `MARCAR COMO ENTREGADO` en «Mi servicio»                                                        |
| §31 Cancelar el modal            | PASS — 0 peticiones `/deliver`, 0 cambios de estado, 0 cambios económicos                              |
| §32 Confirmar desde el navegador | PASS — `DELIVERED` con `deliveredByUserId` = el repartidor autenticado, asignación COMPLETED, 0 ACTIVE |
| §33 El portal después            | PASS — ya no queda servicio activo y el repartidor vuelve a «Servicios disponibles»                    |
| §34 Reutilización                | PASS — el mismo repartidor y vehículo toman otro servicio real inmediatamente                          |
| §35 Preservación económica       | PASS — `MDR-000278`: awards 1→1, refunds 0, snapshot idéntico                                          |
| §36 Otro repartidor              | NOT APPLICABLE — sólo existe un repartidor independiente APPROVED en esta base                         |

## Aislamiento y autoridad

| Escenario                         | Resultado                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| §37 SUPER_ADMIN en ambas rutas    | PASS — 403 en las dos; la web administrativa no ofrece ninguna acción alternativa de cierre                 |
| §38 IntegrationClient (B2B)       | PASS — 401 en las dos                                                                                       |
| §52 Autoridad de auditoría        | PASS — un cuerpo con `deliveredAt`/`deliveredByUserId` se rechaza con 400; el servidor decide ambos valores |
| DRIVER sobre la ruta de proveedor | PASS — 403                                                                                                  |

## Terminalidad

| Intento sobre un Dispatch DELIVERED | Resultado                                                                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §39 Release                         | 409 `DISPATCH_NOT_CLAIMED_BY_PROVIDER`, sin `SERVICE_REFUND`, saldo intacto                                                                                    |
| §40 Cancelar la DeliveryRequest     | La cancelación administrativa responde 200 —está permitida por contrato— pero **no toca el servicio**: sigue `DELIVERED`, con 0 refunds y el historial intacto |
| §41 Nueva asignación                | 409                                                                                                                                                            |
| §42 Reasignación                    | 409, historial COMPLETED sin cambios                                                                                                                           |
| §43 CLAIM de otro proveedor         | 409 `DISPATCH_DELIVERED`                                                                                                                                       |
| §44 TAKE de un independiente        | 409 `DISPATCH_DELIVERED`                                                                                                                                       |

Ninguna respuesta fue 500.

## Concurrencia y carreras

| Carrera                                          | Resultado                                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| §45 10 confirmaciones simultáneas (proveedor)    | PASS — 1 `deliveredAt`, 1 asignación COMPLETED, 0 filas económicas nuevas; las repeticiones responden idempotentemente |
| §46 8 confirmaciones simultáneas (independiente) | PASS — 1 COMPLETED, ledger sin cambios                                                                                 |
| §47 DELIVER vs RELEASE                           | PASS — ganó DELIVER: `DELIVERED`, refund 0, release 409. Nunca «DELIVERED + refund»                                    |
| §48 DELIVER vs CANCEL                            | PASS — una sola transición coherente: `DELIVERED` con 0 refunds                                                        |
| §49 DELIVER vs REASSIGN                          | PASS — se serializan: `DELIVERED`, reassign 409, 0 asignaciones ACTIVE, 1 COMPLETED                                    |

El endpoint está limitado a 20 peticiones por minuto por IP (documentado en el contrato); el CHECK paceó sus confirmaciones para que ese límite nunca enmascarara la respuesta del dominio.

## Sin recálculo

| Comprobación            | Resultado                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| §50 Routing             | PASS — `chargeDispatchAward`/`completeDelivery` no importan ni llaman al servicio de rutas, y ninguna cotización de un servicio entregado tiene `routeCalculatedAt` posterior a la entrega |
| §51 Política y snapshot | PASS — el snapshot del servicio entregado y las políticas ACTIVE quedaron idénticos                                                                                                        |

## SQL adversarial

Diez intentos directos contra PostgreSQL, cada uno en una transacción revertida. **Todos rechazados por la base**:

| Intento                                         | Guarda que lo rechaza            |
| ----------------------------------------------- | -------------------------------- |
| DELIVERED → CLAIMED                             | `DISPATCH_IMMUTABLE`             |
| DELIVERED → OPEN                                | `DISPATCH_IMMUTABLE`             |
| DELIVERED → CANCELLED                           | `DISPATCH_IMMUTABLE`             |
| Reabrir como ACTIVE una asignación COMPLETED    | `ASSIGNMENT_IMMUTABLE`           |
| Marcar DELIVERED con una asignación ACTIVE viva | `DISPATCH_HAS_ACTIVE_ASSIGNMENT` |
| Marcar DELIVERED sin asignación que cerrar      | `DISPATCH_INVALID`               |
| Reescribir `deliveredAt`                        | `DISPATCH_IMMUTABLE`             |
| Cambiar `deliveredByUserId`                     | `DISPATCH_IMMUTABLE`             |
| Borrar el registro de entrega                   | `DISPATCH_IMMUTABLE`             |
| Insertar un Dispatch ya entregado               | `DISPATCH_INVALID`               |

La protección es de base de datos (`dispatch_guard`, `Dispatch_values_check`, `DeliveryAssignment_values_check`), no sólo de servicio.

## Database scan

16 consultas de integridad sobre el esquema real, **todas en 0**: DELIVERED con asignación ACTIVE, DELIVERED sin `deliveredAt`, DELIVERED sin actor, DELIVERED sin asignación COMPLETED, COMPLETED con motivo de fin, COMPLETED sin auditoría, asignaciones ACTIVE duplicadas por despacho, por repartidor y por vehículo, `SERVICE_REFUND` sobre un servicio entregado, award duplicado en un servicio entregado, saldos negativos, aritmética del ledger, saldo distinto del último `balanceAfter`, DELIVERED con dos dueños y DELIVERED sin dueño.

## B2B — preparación para Coita Eats

**Can B2B observe DELIVERED today? NO.**

Con una credencial temporal de alcance `deliveries:read` (creada y revocada dentro del CHECK), el cliente lee su propia solicitud con 200, pero la respuesta no contiene la entrega: `status` sigue en `CREATED` y los campos son `publicId, externalReference, serviceType, status, requestedAt, cancelledAt, createdAt, updatedAt, cancellationReason, stops, packages, financialContext` — sin `deliveredAt` ni un estado derivado del Dispatch. No existe lectura B2B del Dispatch.

Queda como **requisito de V1.12**: para que Coita Eats sepa que su pedido se entregó hace falta exponer ese estado (o un webhook). No se creó endpoint, DTO ni webhook: este punto era investigación de sólo lectura y no es barrera de V1.11.

§56 Aislamiento de lectura: **ENFORCED**. Otro IntegrationClient ACTIVE, con credencial temporal propia, recibe **404** al pedir la solicitud de otro cliente.

## Responsive

Provider a 375 px y a 1440 px, y portal del repartidor a 390 px: sin desbordamiento horizontal y con la acción de cierre utilizable. Capturas en `test-results` del scratchpad del CHECK.

## Regresión

| Suite                                                      | Resultado                         |
| ---------------------------------------------------------- | --------------------------------- |
| Backend unitarias (`npm test`)                             | **210/210** en 21 archivos        |
| Backend E2E (`vitest --config vitest.config.e2e.ts test/`) | **317/317** en **20/20 archivos** |
| Frontend unitarias y de contrato (`npx vitest run`)        | **484/484** en 23 archivos        |

La regresión E2E del backend se acotó a `test/`: el patrón `include: ['**/*.e2e-spec.ts']` del config no excluye `.tmp/`, donde esta máquina conserva artefactos de CHECKs anteriores con expectativas previas a V1.10-E. No se ejecutaron ni se borraron.

Dos incidentes durante la regresión, ambos de entorno y ambos documentados:

1. La primera ejecución falló 144 pruebas porque `mandaria_test` estaba **dos migraciones por detrás** (sin `DELIVERED` en el enum). Se aplicó `npm run db:test:deploy`, que es no destructivo, y la suite pasó a verde.
2. Una ejecución posterior perdió 2 workers por la caída nativa ya conocida (`Worker exited unexpectedly`), sin ninguna aserción fallida. La ejecución limpia con reporter detallado devolvió 20/20 archivos y 317/317 pruebas.

## Quality

| Comprobación | Backend                            | Frontend                         |
| ------------ | ---------------------------------- | -------------------------------- |
| Build        | `nest build` PASS                  | `vite build` PASS                |
| Lint         | `oxlint` PASS                      | `eslint` PASS                    |
| Typecheck    | incluido en `nest build`           | `tsc -b` y `typecheck:test` PASS |
| Formato      | —                                  | `prettier --check` PASS          |
| Docs         | `docs:check` PASS (OpenAPI al día) | —                                |

## Bugs Found

Ningún defecto de producto. Incidencias registradas, todas del entorno o del propio instrumental del CHECK:

1. `mandaria_test` estaba desactualizada respecto a las migraciones de V1.11 (resuelto con `migrate deploy`).
2. La suite E2E del backend sigue arrastrando `.tmp/` si esos artefactos existen en la máquina; se excluyeron explícitamente.
3. Caída nativa de worker de Vitest, ya conocida; sin aserciones fallidas y no reproducible en la corrida limpia.
4. Dos fallos iniciales fueron de mi instrumentación, no del producto: un filtro de peticiones que contaba cualquier URL con «deliver» (incluida `/delivery-requests`) y una lectura de la página inmediatamente después de `reload()` sin esperar el refetch. Ambos se corrigieron en el script del CHECK y las verificaciones se repitieron.

## Remaining Risks

- B2B no puede observar la entrega: hoy Coita Eats no tiene forma de enterarse por API. Es el requisito central de V1.12.
- `PRE_ENFORCEMENT_AWARD` y otros escenarios históricos dependen de datos que esta base concreta puede o no tener; aquí sólo existe un repartidor independiente aprobado, lo que dejó §36 como NOT APPLICABLE.
- Mientras `vitest.config.e2e.ts` no excluya `.tmp/`, cualquier CHECK futuro en esta máquina volverá a recoger artefactos obsoletos.
- El límite de 20 confirmaciones por minuto por IP es correcto en producción, pero obliga a pacear cualquier prueba de concurrencia.

## Cleanup

- Credenciales B2B temporales creadas por el CHECK: revocadas.
- Backend del CHECK (puerto 3011) y Mandaria Web (puerto 5173): detenidos al terminar. El backend del usuario en el puerto 3000 nunca se tocó.
- Bases temporales: ninguna. `mandaria_test` sólo recibió `migrate deploy`; `mandaria_db` conserva los fixtures `CHECK-V111` y los servicios entregados, que el dominio no permite borrar.
- Navegadores de Playwright cerrados por los propios scripts.

## Veredicto final

```text
Precheck                                              PASS
Provider CLAIM → ASSIGN → DELIVERED (navegador real)  PASS
Independent TAKE → DELIVERED (navegador real)         PASS
Cancelar el modal sin efecto (ambos flujos)           PASS
deliveredAt / deliveredByUserId decididos por backend PASS
Assignment COMPLETED, recursos liberados, historial   PASS
Preservación económica (0 award, 0 refund nuevos)     PASS
Idempotencia                                          PASS
Wrong owner · wrong driver · SUPER_ADMIN · B2B        PASS (wrong driver NOT APPLICABLE)
Terminalidad (release, cancel, assign, reassign,
claim, take), nunca 500                               PASS
Concurrencia deliver × deliver (ambos modelos)        PASS
Carreras deliver × release / cancel / reassign        PASS
Sin routing y sin recálculo de política               PASS
SQL adversarial (10 intentos)                         PASS
Database integrity scan (16 consultas)                PASS
Responsive 375 / 390 / desktop                        PASS
Regresión backend (unit y E2E) y frontend             PASS
Quality en ambos repositorios                         PASS
B2B observabilidad de DELIVERED                       NO (requisito de V1.12, no es barrera)
B2B aislamiento de lectura                            PASS
Cleanup                                               PASS
```

No apareció ninguna entrega sin actor, entrega sin asignación cerrada, asignación ACTIVE sobreviviente, cargo o devolución provocados por la entrega, recurso bloqueado después de entregar, transición reversible ni respuesta 500.

**Mandaria V1.11 MVP Delivery Completion — COMPLETADA Y VALIDADA END-TO-END.**

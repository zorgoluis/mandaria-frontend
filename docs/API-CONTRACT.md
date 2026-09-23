# Contrato Mandaria V1.3

Fuente: `C:/Users/zorgl/Documents/mandaria-backend/docs/openapi.json`, OpenAPI 3.0, backend V1.2.0. Inspección adicional de DTOs, controllers y servicios de auth, integraciones, providers, memberships y usuarios el 2026-09-15. No se modificó código ni esquema del backend.

Todos los endpoints consumidos usan el prefijo `/api/v1`. El frontend sólo se comunica por HTTP con Mandaria Backend.

| Método y ruta                                                 | Uso / contrato                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| POST /auth/login                                              | `{email,password}` → `{accessToken,refreshToken,tokenType,expiresIn}`                        |
| POST /auth/refresh                                            | `{refreshToken}` → nuevo par; revoca el refresh anterior                                     |
| POST /auth/logout                                             | `{refreshToken}` → 204                                                                       |
| GET /auth/me                                                  | Usuario público, rol y estado actual; sin hashes                                             |
| GET /users                                                    | SUPER_ADMIN; últimos 100 usuarios, arreglo sin paginación                                    |
| GET /admin/integrations                                       | Hasta 100 clientes, incluye hasta 100 credenciales metadata por cliente                      |
| POST /admin/integrations                                      | Sólo `{name,code}`; estado inicial ACTIVE                                                    |
| GET /admin/integrations/:id                                   | Información de cliente, sin credenciales                                                     |
| PATCH /admin/integrations/:id                                 | Sólo `{status}`; 204. ACTIVE/SUSPENDED reversibles; REVOKED terminal                         |
| GET /admin/integrations/:id/credentials                       | Metadata sin secretos; hasta 100                                                             |
| POST /admin/integrations/:id/credentials                      | `{scopes?,expiresAt?}` → `{clientId,integrationId,clientSecret}`                             |
| POST /admin/integrations/:id/credentials/:credentialId/rotate | Sin body; crea sustituta con mismos scopes/expiración; anterior sigue activa                 |
| POST /admin/integrations/:id/credentials/:credentialId/revoke | Sin body; 204; revoca la credencial exacta                                                   |
| GET /admin/providers                                          | `page,pageSize,type?,status?,search?`; respuesta `{items,total,totalPages,page,pageSize}`    |
| POST /admin/providers                                         | `{name,code,type,maxDrivers?,maxVehicles?}`; estado PENDING, defaults de límites del backend |
| GET /admin/providers/:id                                      | Proveedor con tipo, estado, límites y fechas                                                 |
| PATCH /admin/providers/:id                                    | `{name?,code?,maxDrivers?,maxVehicles?}`; no cambia tipo ni estado                           |
| POST /admin/providers/:id/activate                            | `{}`; PENDING/SUSPENDED → ACTIVE                                                             |
| POST /admin/providers/:id/suspend                             | `{}`; ACTIVE → SUSPENDED; PENDING no puede suspenderse                                       |
| GET /admin/providers/:providerId/members                      | Paginación; incluye usuario público y rol local                                              |
| POST /admin/providers/:providerId/members                     | `{userId,role}`; User activo PROVIDER_ADMIN; OWNER o ADMIN local                             |
| DELETE /admin/providers/:providerId/members/:membershipId     | 204; retira asociación, conserva User y Provider                                             |
| GET /provider/profiles                                        | PROVIDER_ADMIN; asociaciones propias paginadas                                               |
| GET /provider/profile?providerId=:id                          | Perfil y `limits:{maxDrivers,maxVehicles}`, `membershipRole`; 403 sin asociación             |

## Reglas verificadas

- Nombre: 1–100 caracteres. Código: `[A-Z][A-Z0-9_]{1,49}`; provider normaliza mayúsculas, integración exige mayúsculas.
- Límites: enteros 1–10000. Se omiten al crear si el usuario deja campos vacíos. No se replica ningún default de negocio.
- Paginación providers/members/perfiles: página desde 1 hasta 100000; tamaño 1–100, frontend 20. Búsqueda servidor por nombre/código; máximo 100 caracteres.
- Scopes pertenecen a credenciales: `quotes:create`, `deliveries:create`, `deliveries:read`, `deliveries:cancel`. Son permisos B2B existentes; no implementan entregas ni cotizaciones en esta web.
- Metadata `credential.id` es el clientId para intercambio B2B; `credential.clientId` es la relación con IntegrationClient. La UI muestra `id` como identificador público de autenticación.
- Error real: `{statusCode,code,message,errors,timestamp,path}`. Se traducen mensajes conocidos mediante lista permitida; errores de validación y errores internos tienen explicación genérica segura, nunca se refleja texto arbitrario.
- El backend tiene rate limiting y no soporta idempotency keys para crear/rotar. Las mutaciones no se reintentan automáticamente. Ante pérdida de conexión después de crear un secreto, comprobar metadata y revocar/regenerar si no se recibió la respuesta.

## Capacidades faltantes / limitaciones

1. No hay edición de nombre/código ni scopes a nivel de integración. Sólo estado; scopes en credenciales.
2. ~~No existe provisioning de usuarios.~~ Resuelto en backend V1.6.1: las cuentas PROVIDER_ADMIN y DRIVER se aprovisionan por invitación y activación (ver «Extensión V1.6.1»). Siguen sin existir edición, cambio de rol, desactivación ni recuperación de contraseña de User, y no existe alta con contraseña definida por un administrador.
3. No hay paginación/búsqueda servidor en integraciones/usuarios ni paginación de credenciales. Se indica el límite de 100, sin presentar los resultados como total global.
4. No hay agregados dashboard. Tres consultas con pageSize 5/1/1 recuperan sólo totales y cinco proveedores recientes; no se escanea todo el catálogo.
5. No hay auditoría completa; se muestran createdAt/updatedAt y lastUsedAt/expiración de credenciales.
6. Auth no tiene cookies HttpOnly; devuelve refresh en JSON. CORS `credentials:false`. Para migrar a cookies seguras/BFF se necesita un cambio explícito de arquitectura/backend.
7. No hay eliminación de integración/proveedor. Los registros de validación permanecen identificados por prefijo `WEB_`; sus credenciales de prueba deben quedar revocadas.
8. No se usa `/integrations/token` ni ningún endpoint de autenticación B2B desde Mandaria Web.

Los schemas OpenAPI de Auth/Users no detallan completamente las respuestas; se corroboraron en `AuthService` y `publicUserSelect`. Los formatos de fecha nullable de credenciales figuran como object en OpenAPI; el servicio devuelve strings ISO o null.

# Extensión V1.4

El contrato logístico actual (repartidores, vehículos, asignaciones y capacidad) se documenta en [V1.4-B.md](V1.4-B.md), contrastado con OpenAPI 1.4.0 y controllers reales. El contenido siguiente conserva la inspección base V1.3; sus limitaciones históricas de conteos no sustituyen las nuevas capacidades documentadas.

# Extensión V1.6.1 (backend) — User provisioning por invitación

Fuente: backend `mandaria-backend` V1.6.1-A (OpenAPI 1.6.1, controllers `src/invitations/`). Cambio sólo de contrato: esta web aún no implementa las pantallas.

Flujo oficial: SUPER_ADMIN invita PROVIDER_ADMIN (o DRIVER) a un proveedor → PROVIDER_ADMIN invita DRIVER sólo en sus proveedores → la persona abre `{MANDARIA_WEB_URL}/activate-account?token=…` → define su contraseña → `POST /auth/login` normal. Nadie define contraseñas ajenas; el bootstrap SUPER_ADMIN no cambia y los seeds locales no son aprovisionamiento de producción.

| Método y ruta                                                                     | Uso / contrato                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST /admin/providers/:providerId/invitations                                     | SUPER_ADMIN. `{email, role: PROVIDER_ADMIN\|DRIVER, membershipRole? (OWNER\|ADMIN, obligatorio con PROVIDER_ADMIN), driverName? (1–100, obligatorio con DRIVER)}` → 201 invitación + `emailDelivery: SENT\|FAILED` |
| GET /admin/user-invitations                                                       | SUPER_ADMIN. `page,pageSize,status?,role?,providerId?,search?` → `{items,total,totalPages,page,pageSize}`                                                                                                          |
| GET /admin/user-invitations/:invitationId                                         | SUPER_ADMIN. Detalle                                                                                                                                                                                               |
| POST /admin/user-invitations/:invitationId/resend                                 | SUPER_ADMIN. Sin body; rota token, reinicia vigencia, envía correo; 429 `INVITATION_RESEND_COOLDOWN`                                                                                                               |
| POST /admin/user-invitations/:invitationId/revoke                                 | SUPER_ADMIN. Sin body; PENDING → REVOKED (idempotente)                                                                                                                                                             |
| POST /provider/driver-invitations?providerId=                                     | PROVIDER_ADMIN + membership. `{email, driverName}`; no acepta `role` ni `providerId` en body                                                                                                                       |
| GET /provider/driver-invitations?providerId=                                      | Sólo invitaciones DRIVER del proveedor propio; `status?,search?` y paginación                                                                                                                                      |
| GET/POST /provider/driver-invitations/:invitationId[/resend\|/revoke]?providerId= | Igual que admin; 404 fuera del proveedor                                                                                                                                                                           |
| POST /auth/activate-account                                                       | Pública. `{token, password (16–128)}` → 200 `{status:"ACTIVE", email, role}`; no devuelve sesión                                                                                                                   |
| GET /users?status=                                                                | SUPER_ADMIN; cada usuario incluye `status: INVITED\|ACTIVE\|DISABLED`                                                                                                                                              |

Invitación: `{id,userId,email,role,providerId,provider:{id,name,code},membershipRole,driverName,status,expiresAt,tokenIssuedAt,resendCount,acceptedAt,revokedAt,revokedByUserId,createdByUserId,createdAt,updatedAt}`. `status` es efectivo: `PENDING`, `EXPIRED` (derivado, no persistido), `ACCEPTED`, `REVOKED`. Nunca incluye token ni hash.

Errores `code` para mensajes permitidos: `USER_ALREADY_ACTIVE`, `USER_INVITATION_PENDING`, `USER_DISABLED`, `PROVIDER_DRIVER_LIMIT_REACHED` (409); `INVITATION_NOT_PENDING` (409); `INVITATION_RESEND_COOLDOWN` (429); `INVITATION_TOKEN_INVALID` (400); `INVITATION_EXPIRED`, `INVITATION_REVOKED` (410); `INVITATION_ALREADY_ACCEPTED`, `ACCOUNT_NOT_ACTIVATABLE` (409); `MAIL_NOT_CONFIGURED` (503).

Notas para la web: la membership o el Driver se crean al activar (no antes), así que un invitado no aparece en memberships ni en `/provider/drivers` hasta aceptar; una invitación DRIVER pendiente reserva un lugar de `maxDrivers`. En `/activate-account`, leer `token`, retirarlo del historial (`history.replaceState`) y no enviarlo a terceros (`Referrer-Policy: no-referrer`). Límites: activación 10/min, creación 20/min y reenvío 10/min por IP.

# Extensión V1.7 (backend) — Dispatch Engine & Provider Claiming

Fuente: backend `mandaria-backend` V1.7-A (OpenAPI 1.7.0, `src/dispatch/`). Cambio sólo de contrato: esta web aún no implementa las pantallas.

Flujo oficial: `POST /delivery-quotes/:publicId/accept` (IntegrationClient) → en la misma transacción **Quote ACCEPTED → Dispatch OPEN** con snapshot de proveedores candidatos (ACTIVE + cobertura ACTIVE de la ServiceZone y ServiceType de la Quote) → **Provider claims**: un PROVIDER_ADMIN candidato reclama y exactamente uno gana → Dispatch CLAIMED. No hay endpoint de creación de Dispatch; la respuesta de aceptación no cambia. No se asigna Driver ni Vehicle.

| Método y ruta                                                      | Uso / contrato                                                                                                                                                                                                              |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET /provider/dispatches?providerId=&view=&status=&page=&pageSize= | PROVIDER_ADMIN + membership. `view`: `AVAILABLE` (reclamables: OPEN, vigentes, candidatura OFFERED; por expiresAt), `CLAIMED` (tomados por mi proveedor), `ALL` (default). Sólo Dispatches donde mi proveedor fue candidato |
| GET /provider/dispatches/:dispatchId?providerId=                   | Detalle aislado; ajeno → 404                                                                                                                                                                                                |
| POST /provider/dispatches/:dispatchId/claim?providerId=            | Sin body (cualquier campo → 400). 200 con el Dispatch en `access: OWNER`; repetir por el ganador → 200                                                                                                                      |
| POST /provider/dispatches/:dispatchId/release?providerId=          | `{reason}` 3–500. Sólo el dueño; vuelve a OPEN (o EXPIRED tras la ventana); mi proveedor no puede reclamarlo de nuevo                                                                                                       |
| GET /provider/service-coverages?providerId=                        | Coberturas propias (lectura)                                                                                                                                                                                                |
| GET /admin/dispatches?status=&providerId=&deliveryRequestPublicId= | SUPER_ADMIN; incluye candidatos y `noProviderAvailable`                                                                                                                                                                     |
| GET /admin/dispatches/:dispatchId                                  | SUPER_ADMIN                                                                                                                                                                                                                 |
| POST /admin/providers/:providerId/service-coverages                | SUPER_ADMIN `{serviceZoneId, serviceType}`                                                                                                                                                                                  |
| GET /admin/providers/:providerId/service-coverages                 | SUPER_ADMIN                                                                                                                                                                                                                 |
| PATCH /admin/providers/:providerId/service-coverages/:coverageId   | SUPER_ADMIN `{status: ACTIVE\|INACTIVE}`                                                                                                                                                                                    |

Dispatch para proveedor: `{id, status, access, serviceType, serviceZone:{code,name}, openedAt, expiresAt, claimedByMe, claimedAt, cancelledAt, myCandidate:{status,offeredAt,claimedAt,releasedAt,releaseReason}|null, service|null}`. `status` efectivo: `OPEN`, `CLAIMED`, `EXPIRED` (incluye OPEN vencido), `CANCELLED`. `access`: `OFFER` (tarifa `deliveryFee`, ruta, direcciones y coordenadas, paquetes sin texto libre, `goods` con `driverAdvancesGoods`), `OWNER` (además contactos, instrucciones, descripción de paquetes, `deliveryRequestPublicId`, `externalReference`), `SUMMARY` (`service: null`). Nunca incluye IntegrationClient ni otros candidatos.

Errores `code`: `DISPATCH_ALREADY_CLAIMED`, `DISPATCH_EXPIRED`, `DISPATCH_CANCELLED`, `DISPATCH_RECLAIM_NOT_ALLOWED`, `DISPATCH_NOT_CLAIMED_BY_PROVIDER`, `PROVIDER_NOT_ELIGIBLE`, `SERVICE_COVERAGE_EXISTS` (todos 409). SUPER_ADMIN y DRIVER reciben 403 en rutas de proveedor; IntegrationClient 401. Con varias memberships, `providerId` es obligatorio (409 sin él).

Notas para la web V1.7: sin notificaciones (consultar `view=AVAILABLE`; sockets en V1.8); ventana `DISPATCH_TTL_MINUTES` (10 por defecto) independiente de la vigencia de la Quote; al cancelar la DeliveryRequest el Dispatch pasa a CANCELLED y conserva quién lo había reclamado. Límites: claim 60/min y liberación 20/min por IP.

# Extensión V1.8

La asignación de repartidor y vehículo se documenta en [V1.8-B.md](V1.8-B.md), contrastada con OpenAPI 1.8.0 y con el código real de `delivery-assignments` y `dispatch.select.ts` de la rama `v1.8-provider_driver_vehicle_assignment`.

Rutas: `POST /provider/dispatches/:id/assignment`, `.../assignment/reassign`, `.../assignment/cancel`, `GET .../assignments` (arreglo), `GET .../available-drivers`, `GET .../available-vehicles` y `GET /admin/dispatches/:id/assignments` (SUPER_ADMIN, sólo lectura). `providerId` viaja en query y nunca en el body: el backend deriva el proveedor del membership y del Dispatch.

`DeliveryAssignment`: `{id, dispatchId, providerId, status: ACTIVE|REASSIGNED|CANCELLED, driver:{id,name}, vehicle:{id,identifier,type}, assignedAt, assignedByUserId, endedAt|null, endedByUserId|null, endReason|null, endReasonDetail|null}`. Las mutaciones añaden `paymentContext`.

Errores `code` (todos 409): `DRIVER_BUSY`, `VEHICLE_BUSY`, `DRIVER_VEHICLE_MISMATCH`, `DRIVER_NOT_ELIGIBLE`, `VEHICLE_NOT_ELIGIBLE`, `DISPATCH_ALREADY_ASSIGNED`, `DISPATCH_HAS_ACTIVE_ASSIGNMENT`, `NO_ACTIVE_ASSIGNMENT`, `ASSIGNMENT_UNCHANGED`, `ASSIGNMENT_CONFLICT`, `PROVIDER_NOT_ACTIVE`, `DISPATCH_NOT_CLAIMED_BY_PROVIDER`.

Dos advertencias de contrato verificadas contra el código real: `assignmentDeadline`, `assignmentOverdue` y `assignment` los devuelve `providerDispatchView` aunque **no** figuren en el `openapi.json` de esa rama; y conviven dos formas monetarias, `{amount,currency}` en `paymentContext` y decimal string con `currency` hermano en `service.goods`.

Regla de concurrencia: un `200` de `reassign` no significa que la asignación enviada siga siendo la ACTIVE. Siempre refrescar el Dispatch y el historial antes de representar el estado.

# Extensión V1.9

Los repartidores independientes y el portal temporal se documentan en [V1.9-B.md](V1.9-B.md), contrastados con OpenAPI 1.9.0, el código de `src/independent-drivers/` y el backend en ejecución (CHECK FINAL del 2026-09-21).

Rutas SUPER_ADMIN: `GET /admin/independent-drivers`, `GET|POST /admin/drivers/:driverId/independent` (el alta crea el perfil directamente en `APPROVED`; idempotente), `POST .../independent/suspend|reject` (`{reason}` 3–500), `GET|POST .../independent/vehicles`, `PATCH .../independent/vehicles/:vehicleId`. Rutas DRIVER (derivadas del token, nunca de ids en el payload): `GET /driver/me`, `GET /driver/vehicles`, `GET /driver/dispatches/available`, `GET /driver/dispatches/:id`, `POST /driver/dispatches/:id/take` (`{vehicleId}`, atómico: claim + asignación en una transacción) y `POST /driver/dispatches/:id/release` (`{reason: VEHICLE_ISSUE|PERSONAL_EMERGENCY|CANNOT_COMPLETE|OPERATIONAL_ISSUE|OTHER, reasonDetail?}`).

`/driver/me`: `independent` es `null` sin habilitación y lleva `canTakeServices` **dentro** (no en la raíz); `activeDeliveryAssignment` es `{id, mode: FLEET|INDEPENDENT, dispatchId}` o `null`, sin `assignedAt` (OpenAPI declarado con esa forma desde el CHECK FINAL). La vista admin del perfil no expone `canTakeServices`: es un derivado del repartidor.

Detalle `GET /driver/dispatches/:id`: `access: OFFER` (ruta, `pickup`/`dropoff` sin contactos, paquetes, `paymentContext`) u `OWNER` (además contactos e instrucciones). Un Dispatch que el repartidor ni puede tomar ni tiene tomado responde **404**, igual que un id inexistente: la web lo presenta como «Este servicio ya no está disponible». Quien libera un servicio no puede retomarlo (`DISPATCH_RETAKE_NOT_ALLOWED`) y deja de ofrecérsele; vuelve a estar disponible para otros ejecutores.

Errores `code` (409): `INDEPENDENT_PROFILE_EXISTS`, `INDEPENDENT_NOT_APPROVED`, `INDEPENDENT_DRIVER_HAS_ACTIVE_ASSIGNMENT`, `DISPATCH_NOT_OPEN_TO_INDEPENDENT`, `DISPATCH_RETAKE_NOT_ALLOWED`, `DISPATCH_NOT_CLAIMED_BY_DRIVER`, `DISPATCH_ALREADY_CLAIMED`, `DISPATCH_EXPIRED`, `DISPATCH_CANCELLED`, `DRIVER_NOT_ELIGIBLE`, `DRIVER_BUSY`, `VEHICLE_BUSY`, `VEHICLE_NOT_ELIGIBLE`, `VEHICLE_HAS_ACTIVE_ASSIGNMENT`, `VEHICLE_LIMIT_REACHED` (máximo configurable `INDEPENDENT_DRIVER_MAX_VEHICLES`, cuenta también los inactivos) y `TAKE_CONFLICT` (carrera perdida detectada por la base). El identificador de vehículo repetido llega sin `code`, con el mensaje `Vehicle identifier already exists for this independent driver`.

Cobertura: `ProviderServiceCoverage` sólo decide los candidatos Provider (congelados al abrir). Sin cobertura el Dispatch **sí se abre**, sigue `OPEN` con `candidates: []` y `noProviderAvailable: true` (derivado), y el repartidor independiente lo ve si el `ServiceType` admite independientes.

# Extensión V1.9-C

La administración de cobertura se documenta en [V1.9-C.md](V1.9-C.md). Consume sin cambios las rutas V1.7 de cobertura: `GET|POST /admin/providers/:providerId/service-coverages`, `PATCH .../service-coverages/:coverageId` (SUPER_ADMIN) y `GET /provider/service-coverages?providerId=` (PROVIDER_ADMIN, sólo lectura, con guarda de membership). No existe DELETE.

Contrato asimétrico: el POST recibe `{serviceZoneId, serviceType}` plano, pero toda respuesta trae la zona anidada en `serviceZone: {id, code, name, status}` y **no** incluye `serviceZoneId`. El PATCH recibe `{status: ACTIVE|INACTIVE}` y es idempotente.

Errores: `SERVICE_COVERAGE_EXISTS` (409, sin el id de la fila existente: la web la busca en la lista y ofrece reactivarla con PATCH), `Coverage not found` y `Service zone not found` (404 sin `code`). Desactivar una cobertura hace que los claims pendientes del proveedor fallen con `PROVIDER_NOT_ELIGIBLE`.

Semántica: la cobertura afecta a los **nuevos** Dispatches; los candidatos de los Dispatches existentes no se recalculan.

# Extensión V1.10-B (backend) — Credit Policy Engine

Fuente: backend `mandaria-backend` V1.10-B (`src/credit-policies/`, OpenAPI regenerado). Cambio sólo de contrato: la web aún no implementa estas pantallas. **V1.10-B sólo calcula: CLAIM y TAKE todavía no consumen créditos** y ningún saldo cambia.

Todas las rutas son **sólo SUPER_ADMIN** (PROVIDER_ADMIN y DRIVER 403, B2B 401): el panel de proveedor y el portal del repartidor no leen las reglas; en versiones posteriores recibirán sólo el `creditCost` de cada servicio.

| Método y ruta                                                                  | Uso                                                                                                                                                                              |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET /admin/credit-policies?serviceType=&actorType=&status=&page=&pageSize=     | Historial (ACTIVE e INACTIVE), ordenado por serviceType, actorType y versión descendente                                                                                         |
| GET /admin/credit-policies/:id                                                 | Una versión completa con `ranges`                                                                                                                                                |
| POST /admin/credit-policies                                                    | Versión 1 de una combinación sin políticas: `{serviceType, actorType, calculationType, ...campos del tipo, reason?}` → 201. Ya existe → 409 `CREDIT_POLICY_EXISTS`               |
| POST /admin/credit-policies/:id/versions                                       | Nueva versión desde la ACTIVE `:id`: `{calculationType, ...campos del tipo, reason?}` → 201. `:id` ya reemplazada → 409 `CREDIT_POLICY_VERSION_CONFLICT` (recargar y reintentar) |
| GET /admin/credit-policies/calculation?serviceType=&actorType=&distanceMeters= | Costo con la ACTIVE; sólo lectura                                                                                                                                                |

`actorType`: `PROVIDER` (paga el proveedor, también por sus Drivers de flotilla) o `INDEPENDENT_DRIVER`; nunca `DRIVER`. `calculationType` y sus únicos campos permitidos (cualquier otro → 400 `VALIDATION_ERROR`): `PER_KM` → `creditsPerKm` (1–1 000 000) y `minimumCredits` (0–1 000 000); `FLAT` → `flatCredits` (1–1 000 000); `DISTANCE_RANGE` → `ranges: [{minDistanceMeters, maxDistanceMeters|null, credits}]` (1–50, `[min, max)`, el primero desde 0, contiguos, **sólo el último** con `maxDistanceMeters: null`). El formulario debe enviar `maxDistanceMeters: null` explícito en el último rango. `version`, `status`, `effectiveFrom`, `effectiveUntil` y `createdByUserId` los decide el servidor: enviarlos → 400.

Política: `{id, serviceType, actorType, version, status: ACTIVE|INACTIVE, calculationType, creditsPerKm|null, minimumCredits|null, flatCredits|null, ranges:[{id, position, minDistanceMeters, maxDistanceMeters|null, credits}], effectiveFrom, effectiveUntil|null, reason|null, createdByUserId, createdAt}`. Máximo una ACTIVE por combinación; una versión nunca se edita (no hay PATCH ni DELETE) y una INACTIVE no se reactiva. Para «volver» a condiciones anteriores se crea otra versión.

Cálculo: `{policyId, policyVersion, serviceType, actorType, calculationType, distanceMeters, distanceKm: "6.240" (texto informativo), billableKm|null, calculatedCredits|null, minimumCredits|null, minimumApplied, rangePosition|null, credits}`. Créditos enteros, **sin moneda** (no son pesos: no mezclar con `deliveryFee`). Errores: 409 `CREDIT_POLICY_UNAVAILABLE` (sin ACTIVE: la web nunca debe mostrar 0), 422 `CREDIT_COST_OUT_OF_RANGE` (> 1 000 000), 400 para distancias no enteras, negativas, vacías o repetidas.

Notas para la web: tras crear una versión, recargar la lista (la anterior pasa a INACTIVE con `effectiveUntil` = `effectiveFrom` de la nueva). Ante 409 de versión, mostrar que otro administrador acaba de cambiar la política y ofrecer recargar; no reintentar a ciegas.

# Extensión V1.10-C (backend) — Dispatch Credit Snapshot

Fuente: backend `mandaria-backend` V1.10-C (`src/credit-policies/dispatch-credit-snapshots.ts`, OpenAPI regenerado). Cambio sólo de contrato: la web aún no lo muestra. **V1.10-C no cobra: CLAIM y TAKE siguen sin consumir créditos** y ningún saldo cambia.

Al abrirse un Dispatch (aceptación de la cotización) el backend congela, por actor, el costo en créditos calculado con la política ACTIVE de ese momento y la distancia de la cotización. Cambiar la política después **no cambia** el costo de Dispatches ya abiertos.

| Vista                                                                                                               | Campo nuevo                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Proveedor: `GET /provider/dispatches`, `GET /provider/dispatches/:dispatchId` (y respuestas de claim/release)       | `creditCost: integer \| null` — costo para el proveedor                                                                                                                                                                                                                                                                                                                                                                         |
| Repartidor independiente: `GET /driver/dispatches/available`, `GET /driver/dispatches/:dispatchId` (y take/release) | `creditCost: integer \| null` — costo para el repartidor                                                                                                                                                                                                                                                                                                                                                                        |
| SUPER_ADMIN: `GET /admin/dispatches`, `GET /admin/dispatches/:dispatchId`                                           | `creditSnapshots: [{id, dispatchId, actorType, serviceType, creditPolicyId, policyVersion, calculationType, distanceMeters, billableKm\|null, creditsPerKm\|null, minimumCredits\|null, calculatedCredits\|null, flatCredits\|null, appliedRangeId\|null, appliedRangePosition\|null, appliedRangeMinDistanceMeters\|null, appliedRangeMaxDistanceMeters\|null, credits, createdAt}]` y `legacyWithoutCreditSnapshots: boolean` |

Notas para la web:

- `creditCost` son **créditos enteros, sin moneda**: no mezclar con `deliveryFee` ni formatear como pesos. Cada actor ve sólo su propio costo; nunca la política ni el costo del otro actor.
- `creditCost: null` significa Dispatch **anterior a V1.10-C** (sin snapshot): mostrar «sin costo registrado», **nunca 0**. En admin esos Dispatches traen `creditSnapshots: []` y `legacyWithoutCreditSnapshots: true`.
- Hoy mostrar el costo es informativo: tener saldo 0 no impide reclamar ni tomar (el cobro llega en V1.10-D).
- La API B2B no expone créditos. La aceptación de una cotización puede responder **409 `CREDIT_POLICY_UNAVAILABLE`** si falta la política de algún actor (la cotización sigue OFFERED y puede reintentarse), o 422 `CREDIT_COST_OUT_OF_RANGE` si la política calcula 0 o más de 1 000 000 créditos.

# Extensión V1.10-D (backend) — Atomic CLAIM / TAKE Credit Consumption

Fuente: backend `mandaria-backend` V1.10-D (`src/credits/service-award.ts`, OpenAPI regenerado). **Cambio de comportamiento, no sólo de contrato:** desde V1.10-D, reclamar (proveedor) o tomar (repartidor independiente) un servicio monetizado **cobra créditos**. La adjudicación y el cobro son una sola operación: o se adjudica y se cobra, o no pasa nada.

Cuánto se cobra: exactamente el `creditCost` que ya se muestra desde V1.10-C, congelado al abrirse el Dispatch. Nunca se recalcula con la política vigente, así que **lo que la web muestra es lo que se cobra**.

Quién paga: el proveedor paga por los servicios de su flotilla (aunque luego asigne o reasigne Drivers) y el repartidor independiente paga los suyos. Un Driver de flotilla nunca paga.

| Endpoint                                                   | Novedad                                                                                                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST /provider/dispatches/:dispatchId/claim                | Cobra `creditCost` a la cuenta del proveedor. Nuevos 409: `INSUFFICIENT_CREDITS`, `CREDIT_ACCOUNT_UNAVAILABLE`, `CREDIT_SNAPSHOT_UNAVAILABLE`, `CREDIT_MOVEMENT_CONFLICT` |
| POST /driver/dispatches/:dispatchId/take                   | Cobra `creditCost` a la cuenta del repartidor, junto con el claim y la asignación. Mismos códigos nuevos                                                                  |
| GET /provider/credits, GET /driver/credits (y sus /ledger) | Aparecen movimientos `SERVICE_AWARD` con `amount` negativo y `referenceType: "DISPATCH"` + `referenceId` (el Dispatch pagado)                                             |

Notas para la web:

- Antes de ofrecer el botón de reclamar/tomar, comparar el saldo con `creditCost` y avisar si no alcanza; de todos modos hay que manejar el **409 `INSUFFICIENT_CREDITS`**, porque el saldo puede cambiar entre la lectura y el clic. El mensaje debe llevar a recargar créditos, no a reintentar sin más.
- **Nada se adjudica a medias:** ante un 409 el Dispatch sigue OPEN, no hay asignación y el saldo no cambió. Basta con recargar la lista.
- **Reintentos seguros:** repetir el mismo claim del dueño responde 200 y **no** cobra dos veces (un `SERVICE_AWARD` por servicio y cuenta).
- **Reasignar o cancelar la asignación interna no vuelve a cobrar.** Liberar un servicio ya pagado **no devuelve créditos** todavía (las devoluciones llegan en V1.10-E): conviene advertirlo en la interfaz antes de liberar.
- `creditCost: null` (Dispatch anterior a V1.10-C) significa **sin cobro**: mostrar «sin costo registrado», nunca 0.
- `CREDIT_SNAPSHOT_UNAVAILABLE` y `CREDIT_ACCOUNT_UNAVAILABLE` son problemas de configuración o de datos: mostrar que el servicio no puede adjudicarse y que contacten a Mandaria; no son errores del usuario ni se resuelven reintentando.
- Los créditos siguen siendo enteros sin moneda: no mezclarlos ni sumarlos con `deliveryFee`, `goodsValue` ni `driverAdvanceAmount` (todos en MXN).

# Extensión V1.10-E (backend) — Refunds & Reversals

Fuente: backend `mandaria-backend` V1.10-E (`src/credits/service-refund.ts`, OpenAPI regenerado). **Cambio de comportamiento:** desde V1.10-E, deshacer una adjudicación que ya se cobró **devuelve los créditos completos**. No hay endpoints nuevos: las devoluciones ocurren como consecuencia de operaciones que la web ya hace.

| Operación existente                                                               | Consecuencia económica                                           |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| POST /provider/dispatches/:dispatchId/release                                     | Devuelve al proveedor el `creditCost` que se le cobró            |
| POST /driver/dispatches/:dispatchId/release                                       | Devuelve al repartidor independiente lo que se le cobró          |
| POST /delivery-requests/:publicId/cancel (y la cancelación de SUPER_ADMIN)        | Devuelve a quien tuviera el servicio adjudicado                  |
| POST /provider/dispatches/:dispatchId/assignment/reassign y .../assignment/cancel | **No devuelven nada**: el servicio sigue adjudicado al proveedor |

En el ledger (`GET /provider/credits/ledger`, `GET /driver/credits/ledger`, y las vistas de SUPER_ADMIN) aparece un movimiento nuevo:

```text
type: "SERVICE_REFUND"
amount: +7                     // siempre el opuesto exacto del SERVICE_AWARD
referenceType: "DISPATCH"
referenceId: "<dispatchId>"
reversesEntryId: "<id del SERVICE_AWARD>"
refundReason: "PROVIDER_RELEASE" | "INDEPENDENT_RELEASE" | "DELIVERY_CANCELLED"
```

Notas para la web:

- **El cargo original no cambia nunca.** El historial muestra las dos líneas (−7 y +7); el impacto neto es 0. No interpretar la devolución como una corrección del cargo ni ocultar el cargo.
- **Sólo devoluciones completas.** No hay parciales, porcentajes ni penalizaciones en esta versión.
- **Una devolución por cargo.** Repetir un release responde 409 (`DISPATCH_NOT_CLAIMED_BY_PROVIDER`) y repetir una cancelación responde 200 sin mover nada: en ningún caso se devuelve dos veces.
- **Avisar antes de liberar:** conviene decir que el servicio se pierde, ya no que se pierden los créditos — ahora vuelven completos.
- Un servicio que nunca se cobró (Dispatch anterior a V1.10-C, o adjudicado antes de que el cobro existiera) no devuelve nada: eso es correcto, no un error.
- Nuevo 409 `CREDIT_REFUND_INTEGRITY_ERROR`: la reversión debía devolver créditos y el cargo no aparece. No es un error del usuario ni se resuelve reintentando; mostrar que el servicio no puede liberarse y que contacten a Mandaria.
- Los créditos siguen siendo enteros sin moneda: devolverlos no cambia `deliveryFee`, `goodsValue` ni `driverAdvanceAmount`.

# Extensión V1.10-A/F (backend) — Credit Accounts, Ledger y administración

Fuente: backend `mandaria-backend` V1.10 (`src/credits/`: `admin-credits.controller.ts`, `owner-credits.controller.ts`, `credits.dto.ts`, `credits.responses.ts`, `credits.select.ts`, `credit-policy.ts`; OpenAPI 1.10.0), inspeccionado el 2026-09-22. La web V1.10-F consume estas rutas.

Cada proveedor tiene **una** cuenta de créditos, que comparten todos sus Drivers de flotilla; un repartidor independiente tiene la suya, creada al aprobarse su habilitación. Son cuentas distintas aunque se trate de la misma persona.

| Método y ruta                                                                          | Uso                                                          |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| GET /admin/providers/:providerId/credits                                               | SUPER_ADMIN: cuenta del proveedor                            |
| GET /admin/providers/:providerId/credits/ledger?page=&pageSize=                        | Historial (más reciente primero) con actor e Idempotency-Key |
| POST /admin/providers/:providerId/credits/recharge                                     | `{credits, method, externalReference?, reason?}`             |
| POST /admin/providers/:providerId/credits/adjustment                                   | `{amount, reason}`                                           |
| GET/POST /admin/drivers/:driverId/independent/credits(/ledger, /recharge, /adjustment) | Lo mismo para el repartidor independiente                    |
| GET /provider/credits?providerId= y /provider/credits/ledger                           | PROVIDER_ADMIN, sólo lectura                                 |
| GET /driver/credits y /driver/credits/ledger                                           | DRIVER, sólo lectura; la cuenta sale del JWT                 |

Cuenta: `{id, ownerType: PROVIDER|INDEPENDENT_DRIVER, providerId|null, independentDriverProfileId|null, balance, createdAt, updatedAt}`. `balance` son **créditos enteros sin moneda** y nunca es negativo.

Movimiento: `{id, sequence, type, amount, balanceBefore, balanceAfter, rechargeMethod|null, externalReference|null, reason|null, referenceType|null, referenceId|null, createdAt}`; la vista de SUPER_ADMIN añade `creditAccountId`, `createdByUserId` e `idempotencyKey`. `type`: `RECHARGE` y `SERVICE_REFUND` suman, `SERVICE_AWARD` resta, `ADMIN_ADJUSTMENT` puede hacer ambas cosas; nunca 0. `method`: `TRANSFER`, `CASH`, `OTHER` (con `reason` obligatorio). Límites: 1–1 000 000 créditos por movimiento, saldo máximo 1 000 000 000, `reason` de 3–500 caracteres, `externalReference` hasta 100.

**Idempotency-Key obligatoria** en recarga y ajuste (8–255 ASCII visibles, única por cuenta): misma key y mismo cuerpo → 200 con el movimiento original y `Idempotent-Replayed: true`; misma key y cuerpo distinto → 409 `CREDIT_IDEMPOTENCY_CONFLICT`. Otros conflictos: `INSUFFICIENT_CREDITS` (el saldo quedaría negativo), `CREDIT_BALANCE_LIMIT`, `CREDIT_MOVEMENT_CONFLICT`. Sin cuenta: 404 `CREDIT_ACCOUNT_NOT_FOUND` (un Driver de flotilla o un independiente nunca aprobado) — **no es saldo cero**.

Notas para la web: no existe pasarela de pago ni endpoint de devolución manual; la recarga sólo registra un pago confirmado fuera de Mandaria. El ledger es inmutable: no hay PATCH ni DELETE. Los `SERVICE_AWARD`/`SERVICE_REFUND` los escribe el backend al adjudicar y al deshacer un servicio (V1.10-D/E).

**Discrepancia verificada (2026-09-22).** Las notas de V1.10-E describen `reversesEntryId` y `refundReason` en el ledger. El backend los **persiste** (`src/credits/service-refund.ts`) pero **no los expone**: ni `ownerEntryView`/`adminEntryView` (`credits.select.ts`) ni `CreditLedgerEntryResponse` los incluyen, y OpenAPI 1.10.0 tampoco. La web no inventa la relación: enlaza el cargo y su devolución sólo por el `referenceId` (el Dispatch) que ambos comparten, y muestra las dos líneas. Si el backend publica esos campos, la auditoría podrá mostrar el vínculo exacto.

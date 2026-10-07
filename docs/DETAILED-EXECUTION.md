# Estados detallados de ejecución — Mandaria Web

## 2026-10-04 — Cierre contractual: trackingMode y recibos históricos

Esta entrada sustituye las limitaciones de discriminante y recuperación PROVIDER_ADMIN de la actualización anterior, que se conserva como historial.

### Clasificación y permisos

Se consume trackingMode superior en las proyecciones de proveedor/Driver y activeDeliveryAssignment: LEGACY permite únicamente el cierre anterior según propietario, estado CLAIMED y asignación activa; DETAILED mantiene avance/entrega de sólo lectura en web; null indica que nunca hubo asignación y no permite entregar. Campo ausente/desconocido, carga, errores y proyección incompleta no autorizan cierre. La ausencia de execution ya no clasifica como legacy. No se inventan hitos ni se busca otra ruta ante 403.

### Recuperación histórica propia del proveedor

- GET /api/v1/provider/dispatches/:dispatchId/execution-attempt y POST a la misma ruta con /close. Se conserva providerId original en query (si existía; backend lo requiere con varias memberships) e Idempotency-Key UUID original en cabecera. Sin body ni replay histórico. Bearer humano mediante el cliente centralizado; sin retry automático.
- DTO: state, appliedRevision, canStartNewAttempt=false. APPLIED exige appliedRevision entero positivo; acredita el hito histórico, refresca vistas autorizadas y retira marcador. CLOSED_NO_EFFECTS exige appliedRevision=null y retira únicamente el bloqueo técnico. Ninguno habilita avances del proveedor. PENDING_OR_UNKNOWN, DTO incoherente, error, timeout o cambio de identidad conservan marcador.
- Cierre con modal y confirmación explícita, exclusión de doble envío y aviso de que no cancela/revierte movimientos físicos. Respuesta perdida: conservar marcador y consultar el mismo intento. No asumir CLOSED_NO_EFFECTS. No enviar otra intención.
- Se exige la misma cuenta PROVIDER_ADMIN; otro usuario/rol no consulta ni cierra. Respuestas tardías tras desmontar/cambiar identidad no retiran el marcador. Backend sigue validando cuenta activa, membership y asignación histórica; un 403/404 conserva el pendiente para revisión de acceso, sin suplantación.
- Nuevo almacén mínimo separado por origen API: mandaria.provider-advance-pending.v1:<origen>. Contiene sólo actor, dispatchId, providerId opcional y key; nunca body, contactos, tokens o secretos. Se migra la clave exacta de intentos históricos aún presentes en memoria. Sobrevive a recarga/logout/cambio de cuenta; un marcador de ese despacho conserva bloqueo operativo del proveedor. Si el almacenamiento falla/corrompe, no se borra. No se recrean claves perdidas en pestañas antiguas ya cerradas.
- Recuperación DRIVER por recibo propio y resoluciones SUPER_ADMIN/marcadores previos conservadas. No se implementó un nuevo cliente operativo de repartidor.

### Archivos y validación

Tipos/servicios y recuperación en src/execution/{types,service,commands,components}. Nuevos historical-store.ts y historical-recovery.tsx. Discriminante en src/dispatch/{types,rules,pages}, src/driver-portal/pages.tsx y src/delivery-assignments/panel.tsx. Pruebas en provider-historical-attempt.test.tsx, execution-attempt-service.test.ts, execution.test.tsx, delivery-completion.test.tsx y fixtures relacionados. Revisión visual reproducible: scripts/verify-driver-authority.mjs.

Resultados finales y comandos en VERIFICATION.md. Fixtures frontend: no acreditan locks/permisos del backend real. Sin Docker ni operación real. Contrato público B2B comprobado por el mecanismo existente; no contiene rutas humanas.

### Pendientes reales

Integración real con las migraciones/backend nuevo y APP REPARTIDOR, sólo en entorno autorizado. Cuenta iniciadora sin acceso requiere resolver su cuenta/membership con soporte; otro administrador no puede reconciliarla. Claves perdidas antes de disponer de persistencia no son recuperables desde frontend. Se mantienen las condiciones de despliegue coordinado del handoff, sin ejecutarlo aquí.


## 2026-10-04 — Autoridad de ejecución en APP REPARTIDOR

Contrato leído: backend docs/DRIVER-APP-EXECUTION.md, execution.persistence.ts y execution.service.ts; backend sólo como referencia. Rama QA, base 1b8f426, inicialmente sin cambios pendientes.

- Proveedor: sin formulario de avances ni entrega detallada, aun con permisos antiguos en allowedActions. Conserva lectura, historial, asignaciones e incidencias conforme a permisos/asignación vigente.
- DRIVER web: progreso detallado de consulta y mensaje de operación desde la app; no envía avances, incidencias DRIVER nuevas ni entregas detalladas. Conserva portal independiente y cierre legacy autorizado. No implementa los nuevos comandos APP.
- SUPER_ADMIN: incidencias, devolución, transferencia y reconciliación durable permanecen. PHONE_REPORT sigue rotulando historia antigua e incidencias administrativas; no se reescribe.
- Legacy: backend omite execution en su proyección OWNER. El cierre exige proyección recibida satisfactoriamente, CLAIMED, service presente, assignment definido, deliveredAt null y ausencia de execution y permisos económicos detallados. Proveedor exige historial ACTIVE cargado sin error; independiente exige identidad de asignación entre driver/me y detalle. Carga, refetch, error, null/objeto execution, proyección incompleta o cambio de asignación no habilitan entrega. Un 404 de timeline no prueba legacy.
- Limitación contractual: no existe discriminante explícito LEGACY en esas proyecciones. El backend también puede omitir execution si detecta cambio de asignación durante su lectura; las identidades/refetch reducen esa ventana, pero sólo backend revalida la escritura (403 proveedor / 409 EXECUTION_COMMAND_REQUIRED independiente). No se busca otra ruta ni se reconstruyen hitos. Un dato omitido de manera indistinguible por el servidor no puede validarse íntegramente en frontend.

### Recuperación anterior

Las resoluciones SUPER_ADMIN mantienen sin cambios su marcador mínimo persistido, consulta/cierre técnico y verificación de resultado. No se borran al salir o cambiar de usuario.

Para intentos DRIVER antiguos que todavía viven en la memoria de la pestaña, Consultar estado usa GET /driver/dispatches/:dispatchId/assignments/:assignmentId/attempt?operation=ADVANCE|REPORT|DELIVER, con la clave original en Idempotency-Key y la misma identidad. Nunca hace replay en la ruta vieja ni POST al contrato APP. APPLIED/ CLOSED_NO_EFFECTS con assignmentId y operación coincidentes retiran el intento después de refrescar consultas; el recibo propio APPLIED es válido aunque una transferencia posterior retire acceso al detalle. PENDING_OR_UNKNOWN, error o identidad diferente conservan bloqueo. Ningún nuevo comando se genera automáticamente.

Un antiguo avance PROVIDER_ADMIN no tiene endpoint de recibo accesible para ese rol en este contrato. Se conserva pendiente y se indica soporte; no se suplantará al Driver. Backend debe definir recuperación para ese actor si existen tales intentos durante la transición. Los intentos operativos antiguos sólo estaban en memoria: si esa pestaña ya se perdió, no es posible reconstruir su clave/cuerpo. Inventariar y reconciliar antes de actualizar clientes; no borrar marcadores ni interpretar 403 como fracaso de una operación previa. La nueva app debe implementar sus marcadores durables y cierre explícito propio.

### Artefactos y pruebas

Sincronización con scripts/sync-public-b2b.mjs y --check: coincide con backend, sin diferencias de contenido generadas. Continúan sólo las 15 operaciones públicas B2B; ninguna ruta DRIVER se publica. No se copia el OpenAPI general.

Pruebas frontend nuevas y adaptadas: autoridad en todas las fases, permisos antiguos, historial telefónico, legacy/incompletos/carga/error, asignación cambiada, incidencias/resoluciones y recuperación. Las verificaciones de esta entrada usan mocks/fixtures, no prueban permisos ni transacciones del backend real. Los recorridos manuales anteriores pertenecen al contrato anterior y no validan esta distribución de autoridad.

Pendiente APP REPARTIDOR: construir y acreditar sus tres comandos, autenticación/recibos por actor, marcadores mínimos antes del envío, recuperación y cierre técnico; probar integración real y ventana coordinada de migración. No habilitar admisión detallada sin un cliente Driver compatible para concluir servicios existentes.

Docker Desktop permaneció apagado. Sin cambios backend, .env, nginx, versión, producción, activación, commit, push o despliegue.

---

Historial anterior (las reglas de autoridad quedan sustituidas por la actualización superior):


**Actualización 2026-10-03:** transferencias/devoluciones ahora conservan un marcador mínimo durable y reconciliación por lectura tras recarga/cierre. Procedimiento, límites y bloqueo requerido a Backend: [EXECUTION-RECONCILIATION.md](EXECUTION-RECONCILIATION.md). Sustituye el límite de memoria indicado abajo para estas resoluciones; el cuerpo sigue sin persistirse. El texto del 2026-10-02 se conserva como historial.

2026-10-02. Implementado sobre `main` del frontend, inicialmente sin cambios pendientes. Backend consultado exclusivamente como referencia: `docs/DETAILED-EXECUTION-HANDOFF.md`, `docs/DETAILED-EXECUTION-VERIFICATION.md`, controladores, DTOs, responses y selectores reales. No se activa `DETAILED_EXECUTION_ENABLED` ni se modifica backend, nginx, .env o versión. Sin commit, push ni despliegue.

## Superficies

- `/services/:id?providerId=…`: proveedor vigente, progreso e historial paginado, siguiente avance permitido e incidencia. El selector existente conserva la selección entre memberships. `access=OWNER` y `execution.activeAssignmentId` sustituyen al claim histórico para decidir quién opera.
- `/driver/my-service` y `/driver/services/:id`: independiente vigente, avances propios. La consulta de un custodio independiente detallado no se bloquea por suspensión comercial posterior. Esto no lo habilita a tomar otros servicios.
- Repartidor de flotilla: progreso en la superficie existente de servicio, a partir de `/driver/me.activeDeliveryAssignment`. Sólo consulta; reporta por teléfono. El contrato no ofrece un timeline paginado para este actor: no se llama al endpoint reservado al independiente.
- `/dispatches/:id`: SUPER_ADMIN consulta progreso e historial; puede reportar incidencia. No avanza ni entrega por el ejecutor. Claim y proveedor de la asignación más reciente se rotulan como históricos.
- `/custody-incidents`: nueva cola SUPER_ADMIN, abiertas/resueltas, paginada.
- `/custody-incidents/:dispatchId/:incidentId`: detalle y resolución administrativa. Se comprueba la correspondencia del servicio y de la incidencia antes de mostrar resolución.
- `/developers/execution`: lectura anónima de la sección revisada del backend. `executionProgress` y `executionOutcome`, sin contratos administrativos. Continúa `delivery.completed`; no se anuncia un webhook nuevo.

## Componentes y archivos

- `src/execution/types.ts`, `service.ts`, `format.ts`: contrato y etiquetas, transporte centralizado.
- `src/execution/components.tsx`: progreso, historial, formularios de avance/incidencia y recuperación global.
- `src/execution/incidents.tsx`: cola, detalle, retorno, transferencia, candidatos y memberships reales paginados.
- `src/execution/commands.ts`: intención inmutable, UUID, exclusión de doble envío, recuperación exacta, invalidación de caché.
- `src/execution/payment.tsx`: condiciones de referencia y permisos económicos del servidor, retirados durante refetch.
- Integraciones en `src/dispatch/`, `src/driver-portal/`, `src/delivery-assignments/`, `src/collection-instructions/`, `src/app/App.tsx`, `src/layouts/AdminLayout.tsx`, `src/services/api.ts`, `src/services/errors.ts`, `src/index.css`.
- Portal en `src/developers/pages.tsx` y artefactos generados `public/developers/assets/`; tipos/pruebas en `src/test/execution-fixture.ts`, `execution.test.tsx`, `api.test.ts`, `dispatch.test.tsx`, `driver-portal.test.tsx`, `developers.test.tsx`.

No se agregaron dependencias. Se reutilizan React Query, formularios, modal, tablas, paginación, permisos y sesión existentes.

## Endpoints consumidos

Todos llevan el prefijo central `/api/v1`; no se añade otro origen ni se usa B2B para operar.

| Método/ruta | Uso |
| --- | --- |
| GET `/{provider,driver,admin}/dispatches/:id/execution?page&pageSize` | Estado e historial; provider incluye `providerId` |
| POST `/{provider,driver}/dispatches/:id/execution-events` | Siguiente fase |
| POST `/{provider,driver,admin}/dispatches/:id/custody-incidents` | Aviso de incidencia |
| GET `/admin/custody-incidents?status&page&pageSize` | Cola administrativa |
| GET `/admin/dispatches/:id/custody-incidents/:incidentId` | Incidencia y resolución |
| GET `/admin/dispatches/:id/custody-transfer-candidates?mode&page&pageSize` | Pares candidatos, sin reservar |
| GET `/admin/providers/:id/members?page&pageSize` | Selector de administrador receptor; sólo usuarios activos PROVIDER_ADMIN |
| POST `/admin/dispatches/:id/custody-incidents/:incidentId/resolve` | RETURN_TO_ORIGIN o TRANSFER |

La entrega conserva los endpoints proveedor/independiente existentes y cuerpo vacío. El timeline usa actorUserId/actorRole, source y recordedAt reales: el backend no ofrece nombres de actor y no se inventan. No se implementan endpoints nuevos ni se publica esta tabla en `/developers`.

## Reglas y concurrencia

- Las cinco fases sólo se ofrecen consecutivamente, según `allowedActions`; el cierre sólo se habilita con DELIVER y la asignación vigente. No se marcan hitos anteriores como hechos por inferencia. Legacy mantiene el flujo previo.
- Incidencia abierta mantiene recursos/custodia y bloquea avances/entrega. No promete correos.
- Retorno exige motivo, fecha física, etiqueta/rol de receptor y dos confirmaciones inicialmente vacías. Resultado RETURNED, nunca DELIVERED. El servidor valida el límite temporal contra el último hito de custodia.
- Transferencia selecciona un par real FLEET/INDEPENDENT. FLEET exige administrador receptor con membership; independientes omiten esos campos. Confirmaciones desmarcadas, también se reinician al cambiar el par. Los candidatos no son reservas. Se conserva la fase y no se anuncian recogida adicional, débito ni refund.
- Cada POST nuevo usa `apiOnce`, una clave UUID y una copia exacta de cuerpo con assignmentId/expectedRevision. Exclusión síncrona por actor/servicio. No hay reintento automático, incluido 401.
- Red/timeout/5xx u otra respuesta incierta: se retienen cuerpo, ruta (incluido providerId) y clave en memoria. El aviso global permite consultar y recuperar **la misma** operación, incluso después de navegar o transferir; sólo aparece a la misma identidad. Una respuesta definitiva elimina la intención. 409 refresca y explica que hay que revisar el estado antes de preparar otra operación.
- **Límite de recuperación:** memoria de la pestaña, no persistencia durable. Sobrevive a navegación interna, no a recarga/cierre/crash. Se advierte y se instala beforeunload mientras hay intención pendiente. Si se pierde la pestaña, no repetir a ciegas: consultar el estado y reconciliar con SUPER_ADMIN. No se guardan motivos/contactos en almacenamiento persistente. El navegador puede omitir la advertencia en ciertos cierres.
- Tras mutaciones se invalidan ejecución, despachos, asignaciones, driver/me, recursos y cola. Las superficies activas consultan cada 15 segundos y al recuperar foco; no hay sockets. El executor anterior pierde botones/datos cuando el refetch devuelve SUMMARY o 403/404. Backend sigue siendo autoridad ante la ventana entre lecturas.
- Formularios en edición no se desmontan por un refetch con igual revisión; se deshabilitan durante lectura. Una revisión distinta obliga a revisar una nueva confirmación. No hay éxito optimista.

## Dinero

Las vistas detalladas usan `collectionActionAllowed` y `advanceToOriginAllowed`. Sin true explícito no se ordena cobrar ni adelantar. Las condiciones CURRENT todavía no autorizadas se muestran como referencia, no como historia ni instrucción vigente. Los importes y moneda proceden del backend. Las condiciones detalladas del independiente proceden del detalle vigente, sin preferir instrucciones de otra asignación almacenadas en driver/me. Durante refetch se retiran las instrucciones económicas. Legacy CASH/COURIER_ADVANCE no cambia. Entrega, retorno y transferencia no son pruebas de pago ni devolución automática de créditos.

## Sincronización pública

```sh
node scripts/sync-public-b2b.mjs
node scripts/sync-public-b2b.mjs --check
```

Se ejecutó el mecanismo existente contra el backend local, sin editar copias generadas. La comprobación compara artefactos/hashes. El contrato conserva 15 operaciones B2B; las pruebas rechazan rutas administrativas y esquemas internos de custodia. La descarga local se abrió como JSON y su SHA256 coincide con el artefacto público. Hosting/producción no se verificaron ni se modificaron.

## Verificación y pendientes

Resultados, comandos y evidencia visual en la entrada 2026-10-02 de `../VERIFICATION.md`. Las pruebas frontend y la revisión visual usan fixtures sintéticos. No acreditan locks/transacciones, autorización real o integración operativa del backend. Esos controles están reportados por Backend en su propio documento, no ejecutados de nuevo aquí.

Pendiente: recorrido integrado autorizado en entorno aislado con ejecuciones detalladas, rol/custodia reales y pruebas multiusuario de transferencia. No se activa el flag como parte de esta entrega. No se encontró un endpoint faltante que impida estas interfaces. Limitaciones reales: recuperación no durable al perder la pestaña; historia de flotilla limitada a driver/me; nombres de actores no expuestos por el contrato; advertencia de build por chunk mayor a 500 kB.

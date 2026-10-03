# Estados detallados de ejecución — Mandaria Web

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

> Integración real posterior (2026-10-03): APPLIED, PENDING_OR_UNKNOWN, cierre, recarga y cambio de usuario comprobados contra backend/PostgreSQL aislados. El bloqueo frontend F-01 del proveedor fue corregido y cerrado en el seguimiento con cinco hitos y entrega desde UI real. Ver [matriz y reproducción](EXECUTION-REAL-INTEGRATION.md). No se autoriza producción.

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


## 2026-10-04 — Cambio de autoridad

Resoluciones SUPER_ADMIN: se conservan marcadores durables, consulta/cierre y comprobación de resultado descritos abajo. No se borran al cambiar de usuario.

Los nuevos avances y entregas detalladas corresponden a la app Driver. La web sólo permite consultar el recibo de intentos DRIVER anteriores todavía disponibles en memoria, con assignmentId, operación e Idempotency-Key originales; no los reenvía. APPLIED o CLOSED_NO_EFFECTS coherentes refrescan consultas y retiran el pendiente; PENDING_OR_UNKNOWN/error conserva bloqueo. El recibo sólo puede consultarlo su actor.

Un avance anterior de PROVIDER_ADMIN no tiene recibo consultable para ese rol en el contrato nuevo: conservar pendiente, consultar soporte y no suplantar ni reintentar. Si la pestaña antigua ya se perdió, sus claves operativas no eran durables y no pueden reconstruirse. Esto no afecta a los marcadores persistidos de resoluciones SUPER_ADMIN.

Procedimiento de transición, límites de legacy y pendientes APP: [DETAILED-EXECUTION.md](DETAILED-EXECUTION.md), actualización 2026-10-04. Las secciones antiguas se conservan como historial.

---

Historial anterior (las reglas de autoridad quedan sustituidas por la actualización superior):


# Actualización — contrato durable de intentos, 2026-10-03

Esta sección sustituye el bloqueo de backend descrito en el historial inferior. Referencia de sólo lectura: mandaria-backend/docs/EXECUTION-ATTEMPT-RECONCILIATION.md. No se modificó ni activó backend.

## Procedimiento vigente

1. Conservar el marcador mínimo por origen API y volver con la cuenta SUPER_ADMIN iniciadora. Otra cuenta no puede consultar/cerrar esa clave ni elimina el bloqueo local de la incidencia.
2. «Reconciliar por lectura» envía GET /admin/dispatches/:dispatchId/custody-incidents/:incidentId/resolution-attempt con Idempotency-Key original en cabecera. Sin body, clave en URL ni caché de consultas.
3. APPLIED: verificar resolutionId y actor del recibo contra incidencia/resolución, asignaciones e historial paginado; releer estabilidad. Sólo retirar marcador tras evidencia coherente y refresco. Una transferencia histórica puede haber avanzado posteriormente.
4. PENDING_OR_UNKNOWN: mantener bloqueo; consultar otra vez o abrir «Cerrar intento pendiente». No equivale a fracaso ni expira por tiempo.
5. Confirmar explícitamente cierre técnico ejecuta POST a la misma ruta con /close, sin body y con la misma clave. No cancela servicio ni revierte entrega, devolución o transferencia física. Si responde APPLIED, seguir paso 3.
6. CLOSED_NO_EFFECTS: con canStartNewAttempt=true, releer incidencia y ejecución abierta, refrescar vistas y retirar marcador para preparar un formulario nuevo con revisión actual y confirmaciones vacías. Nunca se envía automáticamente ni se reconstruye cuerpo privado. Verificar situación física antes de confirmar; no repetir movimientos. Si false, auditar resolución de otro administrador: sólo retirar marcador con evidencia coherente; de lo contrario conservar bloqueo.
7. Timeout/401/403/red durante cierre: conservar marcador y consultar; no inferir cierre. 409 EXECUTION_ATTEMPT_CLOSED del original tardío retira replay volátil, conserva marcador y requiere consulta explícita.

El backend mantiene la autoridad de concurrencia y elegibilidad. No hay toma de control del intento ajeno. Coordinar con el iniciador si se necesita cerrar su clave. Marcador local no sustituye un bloqueo distribuido: borrado de datos, otro perfil/dispositivo no quedan cubiertos. No persiste cuerpo, contactos, motivos, tokens ni secretos. Las claves cerradas las garantiza backend, no el navegador.

## Validación

Cierre actual: 79/79 en cuatro archivos completos y revisión visual nueva de escritorio/móvil. Abrir confirmación no envía la escritura; timeout conserva marcador, consultar no reenvía resolución. APPLIED con recibo y evidencia coherentes sí correlaciona esta clave; el cierre por otra resolución auditada no la atribuye. Evidencia y límites en la entrada más reciente de VERIFICATION.

Tests frontend simulan ambos ganadores resolve/close, pérdida de respuesta, estados, permisos, recarga de módulos conservando almacenamiento, doble envío, identidad cambiante y coincidencia exacta de resolución. No acreditan locks ni migración desplegada del backend. Chromium con fixture local verificó escritorio, móvil, teclado, recarga y bloqueo; cero operaciones reales. Comandos/resultados en VERIFICATION.md.

---

## Historial previo (conservado)

# Reconciliación de transferencias y devoluciones

2026-10-03. Complementa y sustituye el límite de recuperación exclusivamente en memoria documentado el 2026-10-02. **No habilita ejecución detallada.** Backend sólo consultado; no se cambian endpoints.

## Decisión y alcance

Antes de enviar una resolución se guarda un marcador en localStorage, bajo `mandaria.resolution-pending.v1:<origen API>`. Sobrevive a recarga, cierre y reapertura de pestaña en el mismo navegador/perfil/origen, mientras se conserve el almacenamiento.

Sólo contiene: actor (ID), dispatchId, incidentId, assignmentId, expectedRevision, tipo TRANSFER/RETURN_TO_ORIGIN e Idempotency-Key. Son identificadores operativos mínimos. No contiene tokens, secretos, motivo, fecha física, contactos, nombre/email, receptor ni confirmaciones. No se persiste el cuerpo ni se reconstruye a partir del marcador. No se envía a logs/URLs/analytics. Las lecturas de auditoría permanecen en el manejo normal de sesión y caché, no se copian al marcador.

Si no se puede guardar/verificar el marcador, **no se envía el POST**. Un registro ilegible bloquea nuevas resoluciones. Cambiar de usuario no libera la incidencia: el aviso detallado y la reconciliación quedan reservados a la cuenta iniciadora SUPER_ADMIN; otro usuario sólo ve un bloqueo genérico si llega a esa incidencia. No hay lecturas ni replay automáticos al iniciar sesión. Un cambio de usuario durante la lectura interrumpe su secuencia y conserva el marcador.

La intención completa conserva replay exacto sólo mientras existe en memoria. Tras recarga, el único mecanismo disponible es **Reconciliar por lectura**: ningún POST, ninguna clave nueva, ningún formulario reconstruido ni confirmación implícita.

## Contrato real revisado

Referencias backend: `docs/DETAILED-EXECUTION-HANDOFF.md`, `src/delivery-execution/execution.service.ts` (`command`, `incidentDetail`, `detail`, `resolve`), `execution.persistence.ts` y API de historial de asignaciones existente.

Con prefijo `/api/v1`:

1. GET `/admin/dispatches/:id/execution?page=1&pageSize=20`: cabeza vigente e historial.
2. GET `/admin/dispatches/:id/custody-incidents/:incidentId`: incidencia y resolución nullable, incluyendo fromAssignmentId/toAssignmentId, actor y confirmaciones registradas.
3. GET `/admin/dispatches/:id/assignments`: historial de asignaciones de ese servicio, con estados.
4. Páginas adicionales de execution para encontrar el evento de resolución.
5. Relectura de cabeza y de incidencia para detectar cambios durante el procedimiento.

La escritura backend bloquea el dispatch y registra un recibo exitoso en `DeliveryExecutionCommand`, identificado por actor + operación `RESOLVE:<incidentId>` + despacho + clave, con huella del cuerpo y respuesta. Un replay necesita **el cuerpo original idéntico**. El frontend no tiene un GET de ese recibo; la lectura de la incidencia no identifica qué clave produjo el resultado.

## Procedimiento operativo verificable

1. Tras respuesta incierta, **no repetir la devolución/transferencia física**, ni preparar otro formulario o borrar datos del navegador. Timeout no significa fracaso.
2. Reabrir el mismo Mandaria Web con el mismo perfil/origen e iniciar sesión con la cuenta SUPER_ADMIN iniciadora. El marcador aparece incluso si el formulario original se perdió.
3. Abrir **Consultar incidencia** para contexto; pulsar **Reconciliar por lectura**. Esto sólo ejecuta los GET anteriores.
4. Para acreditar una incidencia resuelta se exige:
   - Incidencia, servicio y asignación original coincidentes; resolvedAt y resolución presentes.
   - fromAssignmentId igual al original. TRANSFER: original TRANSFERRED y destino existente en el historial. RETURN_TO_ORIGIN: original RETURNED, destino null, sin asignaciones ACTIVE y custodia RETURNED.
   - La lista ACTIVE coincide exactamente con activeAssignmentId. Si no existe asignación vigente, se exige un cierre terminal reconocido. El destinatario de una transferencia histórica puede haber avanzado o transferido después: no se lo inventa como ejecutor actual.
   - Evento TRANSFER/RETURN con revisión `confirmations.expectedRevision + 1`, asignación y actor de resolución coincidentes, source ADMIN_RESOLUTION; revisión posterior al intento inicial y no superior a la cabeza.
   - Cabeza estable entre lecturas y misma resolución al releer. Se consultan como máximo 50 páginas: si la evidencia no se encuentra dentro de ese límite, no se infiere éxito.
5. Si todo coincide, mostrar **Incidencia resuelta verificada**, con el tipo efectivamente registrado. Refrescar las vistas y retirar el marcador. Esto acredita el cierre registrado de la incidencia, **no atribuye el resultado a la clave local** ni acredita cobro. Puede tratarse de una resolución realizada por otro intento autorizado.
6. Si está abierta, falta evidencia, cambió la revisión, se perdió permiso o falló la red: mostrar **Pendiente de reconciliación** y mantener el bloqueo. Consultar de nuevo es seguro porque es lectura. No se ofrece eliminar el marcador ni forzar un POST.
7. Si permanece abierta: escalar a BACKEND/operación usando los identificadores del caso por los canales autorizados. No borrar el marcador, no reconstruir datos personales ni emitir otra clave para forzar el formulario.

No existe expiración automática del marcador incierto: el tiempo transcurrido no demuestra fracaso. Se elimina al recibir éxito directo, un rechazo definitivo sin incertidumbre anterior o un cierre coherente por lectura. Si borrar el marcador falla, se conserva el bloqueo.

## Bloqueo exacto para BACKEND

**Caso: resolución sin aplicar y cuerpo perdido.** Una incidencia abierta con resolution=null y revisión sin cambios es indistinguible de un POST todavía en vuelo/esperando locks. Incluso que el recibo no exista ahora no garantiza que el POST no vaya a confirmar después. Por eso las pruebas del escenario «no aplicada» esperan bloqueo, no habilitación de otra resolución.

Se requiere un contrato autorizado de recuperación del comando que permita consultar su resultado por identidad/operación/clave y diferenciar de forma concluyente aplicado, todavía incierto y terminal sin efectos. La conclusión «sin efectos» debe estar serializada y garantizar que el intento original no pueda confirmar posteriormente (por ejemplo, mediante un registro terminal del intento validado en la misma disciplina de locks). Un simple «no encontrado» no basta. Alternativamente, Backend puede ofrecer reanudación de una intención previamente registrada, sin obligar al navegador a persistir el formulario privado. **No se propone ni implementa una ruta ficticia.** Backend debe definir contrato, permisos, retención y garantías antes de habilitar esta recuperación.

Tampoco existe señal de intento en vuelo compartida por todos los dispositivos. El marcador protege este navegador; borrarlo, usar otro perfil/dispositivo, cambiar de origen web o perder almacenamiento elimina esa evidencia local. La unicidad de resolución y expectedRevision backend siguen siendo la autoridad transaccional, pero no se presentan como prueba de ausencia de un intento pendiente. Un bloqueo universal requiere esa capacidad backend.

## Archivos y validación

- Nuevos `src/execution/reconciliation-store.ts`, `reconcile.ts` y `src/test/execution-reconciliation.test.ts`.
- Cambios en `commands.ts`, `components.tsx`, `incidents.tsx` y `src/test/execution.test.tsx`.
- README, documentación de ejecución y VERIFICATION actualizados conservando el historial.

Las pruebas reinician módulos JavaScript conservando localStorage: simulan la pérdida completa del estado volátil al recargar/reabrir. Casos aplicados TRANSFER/RETURN, no aplicado, fallo de red, evidencia contradictoria/ausente, revisión cambiante, cambio de usuario antes/durante lectura, historial paginado, almacenamiento corrupto/no disponible y ausencia de datos privados. Las pruebas de interfaz verifican el bloqueo y la ausencia del botón de replay tras perder memoria. Son fixtures/mocks frontend; no acreditan escrituras ni permisos backend reales. Resultados ejecutados en VERIFICATION.

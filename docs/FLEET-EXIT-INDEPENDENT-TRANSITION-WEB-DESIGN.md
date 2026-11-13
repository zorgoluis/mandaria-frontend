> Actualización 2026-10-24: este documento conserva el diseño previo. La autorización posterior y el backend implementado permiten la integración local descrita en [Web implementada](FLEET-EXIT-INDEPENDENT-TRANSITION-WEB.md); las afirmaciones de indisponibilidad que siguen son históricas.

# Diseño Web — desvinculación y transición independiente 1.0.0

2026-10-24. **Diseño documental; API nueva no implementada ni probada.** Web en `C:/Users/zorgl/Documents/mandaria-frontend`, QA, base `829d012ba440c5436bcbbd0146d877517f4c6b4a`, checkout inicialmente limpio. No se añaden código, botones, rutas ejecutables, mocks, dependencias, configuración ni flags. No hay commit, push ni despliegue de esta entrega. Las integraciones previas de asistencia/movementContext, FLEET 1.0.0 e independiente 1.1.0 permanecen intactas.

## 1. Fuentes y alcance comprobado

Se leyeron README, BITACORA y VERIFICATION; no se encontró AGENTS.md en el repositorio ni en sus directorios ascendentes comprobados. Fuentes backend consultadas en sólo lectura, relativas a `C:/Users/zorgl/Documents/mandaria-backend/docs/`:

- `FLEET-EXIT-INDEPENDENT-TRANSITION-CONTRACT.md`: S1–S10, sin veto, identidad conservada, economía separada.
- `FLEET-EXIT-INDEPENDENT-TRANSITION-TECHNICAL-SPEC.md`: §§2–7 estados, permisos, contratos; §§8–11 barreras, historia y activación; §13 precisiones posteriores sobre cuenta, scope, replay y guards.
- `FLEET-EXIT-INDEPENDENT-TRANSITION-TEST-MATRIX.md`: X01–X30 y E1–E6, ejemplos documentales, no respuestas reales.
- `FLEET-EXIT-INDEPENDENT-TRANSITION-HANDOFF.md`: sus adendas técnicas sustituyen el párrafo histórico que aún dice que falta definir rutas/estados. No sustituyen la prohibición de implementar.

También se inspeccionaron componentes y servicios Web citados abajo y, para verificar las facultades existentes de zonas, `src/independent-offers/offers.controller.ts`, `offers.dto.ts` y `offers.responses.ts` del backend. OpenAPI actual no acredita la API de salida. No se hicieron llamadas HTTP ni se ejecutaron pruebas funcionales de esta ampliación.

## 2. Navegación y archivos que se modificarían

Los nombres de módulos nuevos de esta tabla son organización propuesta del cliente, no endpoints publicados. No se fija ni se registra ahora una URL nueva del router Web.

| Archivo/componente existente o futuro | Uso previsto y límite |
| --- | --- |
| `src/app/App.tsx`, `src/layouts/AdminLayout.tsx` | Dos entradas futuras «Salidas de flotilla»: proveedor y administración, con guards de rol y enlaces profundos protegidos. La bandeja histórica debe ser accesible sin localizar al exconductor en recursos actuales. |
| `src/drivers/pages.tsx` — DriversPage, DriverDetail/DriverContent | Entrada contextual desde `/drivers/:id?providerId=…`, mientras exista acceso actual, y panel de afiliación separado de Driver.status y disponibilidad. «Suspender repartidor» no representa salida ni se invoca como paso de START. |
| `src/logistics/components.tsx` — ProviderScope; `src/logistics/navigation.ts` | Selector existente de proveedor autorizado, paginado y ligado a cuenta. Reutilizar selección, no autoridad inferida de query. No usar `FleetResourceScope` como guard global de la bandeja histórica: su gate de gestión de recursos actuales puede ocultar lecturas/recuperación permitidas. |
| Futuro `src/fleet-exit/{types,contract,service,queries}.ts` | Adaptadores por rol, validación de proyecciones, allowlist de filtros, revisión decimal, cursores y transporte del contrato futuro. Separado del cliente assistance y sus DTO. |
| Futuro `src/fleet-exit/{pages,context,commands,recovery,notices}.tsx` | Contexto, lista/detalle, confirmaciones START/RECHECK, recuperación propia y bandeja HTTP. No formulario de fuerza, aprobación del dueño ni edición de providerId. |
| Futuro `src/fleet-exit/attempts.ts`; patrón de `src/assistance/attempts.ts` | Almacenamiento cifrado independiente con recurso AFFILIATION/EXIT. No reutilizar caseId, la base IndexedDB ni los enums de asistencia como si fueran equivalentes. |
| `src/components/ui.tsx` | Confirm, Field, InfoGrid, Table, Loading y ErrorState. Etiquetas específicas para afiliación/salida; evitar Badge genérico ACTIVE que sugiera cuenta activa. No usar Pagination basada en totalPages para listas de cursor. |
| `src/services/api.ts`, `src/services/query.ts`, `src/auth/AuthProvider.tsx` | Reutilizar `api` con AbortSignal/no-store, `apiOnce` para envío explícito sin reintento 401, QueryClient e invalidación por cambio de identidad. Evaluar extensión estrecha de recuperación bajo cuenta restringida sólo cuando exista el allowlist backend; no modificar ahora sus gates. |
| `src/fleet/pages.tsx`, `service.ts`, `spending.tsx`; `src/assignments/components.tsx`, `src/logistics/queries.ts` | Releer servicios/participaciones, gasto, recursos y pareja tras cambios confirmados. No encadenar unpair + gasto OFF + PATCH Driver + cambio de modo para simular la transacción. Backend será autoridad de barreras y cierre. |
| `src/assistance/pages.tsx`, `workbench.tsx`, `movements.tsx`; `src/execution/incidents.tsx` | Reutilizar `/fleet-assistance`, `/admin/fleet-assistance`, `/custody-incidents` y detalles autorizados. Sin cambios de reglas de evidencia, doble revisión ni permisos. No fabricar un caso/resolución al pulsar RECHECK. |
| `src/independent-drivers/{pages,service,queries,types}.ts[x]` | SUPER_ADMIN conserva habilitación/suspensión/rechazo y vehículo propio. Añadir en una implementación autorizada la gestión de zonas propias, hoy ausente en este cliente, utilizando la API existente. Mantener driverId y profileId distintos. |
| Futuros `src/test/fleet-exit-*.test.ts[x]` y harness HTTP aislado | Pruebas previstas en §9; no se crean fixtures ejecutables ni controles simulados ahora. |

## 3. Tres dimensiones de estado

| Dimensión | Estados/documentación | Presentación y consecuencias |
| --- | --- | --- |
| Afiliación | ACTIVE → EXIT_PENDING → ENDED | «Vinculado», «Salida solicitada», «Afiliación terminada». ACTIVE no es Driver.status ni DeliveryAssignment.ACTIVE. Sin bloqueos puede transitar y terminar dentro de START. No cancelación/reactivación unilateral en 1.0.0. |
| Petición | PENDING → COMPLETED | «Salida pendiente» y «Desvinculación completada» sólo con hecho confirmado. `completedAt` null mientras pendiente; fecha efectiva cuando completada. No añadir READY, APPROVED o CLOSED. |
| Elegibilidad independiente | profileState NONE/PENDING/APPROVED/SUSPENDED/REJECTED, canOperate y reasons | Sólo SUPER_ADMIN y DRIVER propio. APPROVED no equivale a recepción iniciada ni a permiso efectivo de TAKE. El proveedor no recibe ni representa esta dimensión. |

`startedAt:null` significa fecha de ingreso no acreditada; `observedAt` no la sustituye. El contexto no expone `origin` ni `endedAt` de la tabla: no agregarlos a su DTO; el detalle de salida aporta completedAt. Ante contexto ausente o esquema incompatible, mostrar lectura no disponible y no conceder acciones por defecto.

Los bloqueos `ACTIVE_ASSIGNMENT`, `CUSTODY_UNRESOLVED`, `OPERATION_ATTEMPT_UNRESOLVED` y `OPERATIONAL_STATE_INCONSISTENT` impiden **completar**, no registrar START. La Web no calcula elegibilidad desde saldo, ausencia de casos OPEN o timeout. `hasPendingEconomics` se presenta aparte: «Hay asuntos económicos pendientes que pueden continuar después de la salida». Disputa, obligación UNKNOWN o CASH_PENDING por sí solos no son veto; responsabilidades y restricciones personales pueden sobrevivir.

## 4. Experiencias y confirmaciones humanas

### PROVIDER_ADMIN

1. Seleccionar proveedor y conductor por recursos autorizados; consultar su contexto futuro. Membership OWNER **o ADMIN** vigente permite START según capacidad actual. No inferir autoridad de ser creador, del nombre «dueño», de un driverId conocido ni del modo FLEET actual.
2. Mostrar afiliación, petición si existe y capacidad/motivo. Cuando `canRequestExit=true`, ofrecer futura acción «Solicitar retiro de la flotilla». Si ya existe salida, conducir a su detalle; no ofrecer aprobación, veto o cancelación. Una solicitud DRIVER_REQUEST es válida sin aceptación del dueño. Ambos iniciadores pueden figurar; no publicar identidad privada de quien inició.
3. Confirmación: «Registrarás el retiro de este conductor de esta flotilla. Se bloquearán nuevas asignaciones y tomas del conductor durante la salida. Si existe servicio, custodia o efecto operativo incierto, la salida quedará pendiente y deberá resolverse. No se desactiva su cuenta, no se cancelan servicios ni se liquidan deudas. No se habilita operación independiente ni se transfieren vehículo, saldo, documentación de titularidad o zonas». Congelar sujeto, affiliationId, revisión y cuerpo al confirmar; no solicitar aprobación del conductor para este retiro.
4. Respuesta `APPLIED/exitStatus:PENDING`: «Solicitud registrada. La desvinculación sigue pendiente». Mostrar fecha de evaluación y bloqueos públicos. Nunca «desvinculado». Mantener ejecución autorizada y recuperación; no permitir que la UI restaure asignación/gasto/recepción contra la barrera.
5. RECHECK sólo según `canRecheck`: «Solicitarás una nueva evaluación. Esto no fuerza la salida ni resuelve custodia, servicios o efectivo». Puede volver APPLIED con mismo estado/revisión. Un GET/avisos no envía RECHECK automáticamente.
6. COMPLETED: «Desvinculación completada el … La cuenta y sus responsabilidades se conservan». Abrir detalle histórico por exitId; no volver a consultar contexto actual del exconductor como fallback. Historial de salida COMPLETED disponible 12 meses desde completedAt con membership vigente; PENDING mientras pendiente. Esta ventana no fija retención ni amplía las ventanas propias de asistencia/FleetParticipation.
7. Mantener acceso exclusivamente a participaciones históricas autorizadas; jamás consultar saldo, perfil, vehículo, documentos, zonas o actividad independiente futura. Para ACTIVE independiente, mostrar sólo espera genérica, sin ID ni fase del servicio. Si faltan referencias autorizadas, no enlazar ni reconstruirlas por búsquedas cruzadas.

### SUPER_ADMIN

1. Bandeja administrativa con filtros propuestos; detalle y contexto por driverId desde datos autorizados. Puede consultar y RECHECK, **no START** en nombre de conductor/proveedor, incluso si una capacidad incoherente apareciese true. No hay ruta admin START ni botón force.
2. Para incidencias, abrir asistencia/custodia existentes. Usar assistanceCaseId sólo si viene autorizado. `PublicBlocker.assignmentId` no aporta dispatchId/incidentId para construir `/custody-incidents/:dispatchId/:incidentId`: usar la bandeja existente y selección autorizada, no inventar parámetros. Resolver con evidencia y doble revisión cuando corresponda; después volver a consultar salida y ofrecer RECHECK explícito.
3. Mostrar elegibilidad independiente en panel separado desde contexto administrativo. Salida completa no aprueba perfil. Reutilizar gestión `/independent-drivers/:driverId`, sobre el mismo Driver; no crear usuario/proveedor ficticio, reaprobar automáticamente suspendidos/rechazados ni copiar documentos FLEET.
4. Facultades existentes: `POST /api/v1/admin/drivers/:driverId/independent` para habilitar, body actual opcional `{reason}`; GET del mismo recurso para perfil. Zonas: `GET/PUT /api/v1/admin/independent-drivers/:profileId/offer-zones`, PUT existente `{requestId,expectedRevision,zoneIds,reason}` (UUID, revisión string, hasta 100 UUID únicos, reason 3–500); respuesta `{revision,zoneIds}`. **Este protocolo usa requestId en body y no se mezcla con START/RECHECK.** La Web actual no implementa este selector de zonas: futura tarea concreta, no capacidad supuestamente disponible en pantalla.
5. Habilitar zonas requiere selección y confirmación propias. La zona geográfica puede coincidir con la de flotilla, pero no hereda permiso. Mantener habilitaciones independientes previas válidas; selección e inicio de recepción corresponden al conductor y deben ser explícitos. Ninguna acción administrativa de salida inicia su turno ni cambia pagador.

Mensajes de capacidad: FEATURE_DISABLED → «No se admiten nuevas solicitudes»; NOT_AFFILIATED → «Sin afiliación actual»; EXIT_ALREADY_REQUESTED → «Consulta la salida registrada»; EXIT_COMPLETED → «Salida completada»; ACCOUNT_RESTRICTED → motivo seguro sin inferir que una restricción TAKE impide salir. Motivo desconocido → acción deshabilitada con lectura/recuperación cuando estén autorizadas. No confundir feature OFF con falta de permiso.

## 5. Cliente tipado futuro: rutas y DTO exactos

Todas las rutas siguientes son **propuestas backend no disponibles**, con prefijo `/api/v1`. El transporte Web existente ya añade ese prefijo; no duplicarlo. JWT humano, Cache-Control:no-store, IDs UUID y cuerpos estrictos. No agregar requestId al body de salida.

| Método/ruta | Método conceptual del cliente; autoridad y body |
| --- | --- |
| GET `/provider/drivers/:driverId/fleet-affiliation-context?providerId=UUID` | contextProvider; proveedor actual autorizado, sin independent. |
| GET `/admin/drivers/:driverId/fleet-affiliation-context` | contextAdmin; contexto administrativo. |
| POST `/provider/fleet-affiliations/:affiliationId/exit-requests?providerId=UUID` | startProvider; `{expectedAffiliationRevision:string,reasonCode:"PROVIDER_REMOVAL"}`; Idempotency-Key UUID. |
| GET `/provider/fleet-exit-requests?providerId=UUID` | listProvider; status, limit, pageToken y driverId dentro del alcance. |
| GET `/admin/fleet-exit-requests` | listAdmin; status, limit, pageToken, driverId/providerId. |
| GET `/provider/fleet-exit-requests/:exitId` | detailProvider; proveedor histórico y membership actual; no depender de contexto actual. |
| GET `/admin/fleet-exit-requests/:exitId` | detailAdmin; lectura auditada. |
| POST `/provider/fleet-exit-requests/:exitId/recheck` | recheckProvider; `{expectedExitRevision:string}`; Idempotency-Key UUID. |
| POST `/admin/fleet-exit-requests/:exitId/recheck` | recheckAdmin; mismo body/header, sin force. |
| GET `/provider/fleet-exit-notices` | noticesProvider; avisos de alcance autorizado. Véase precisión pendiente de filtros/scope en §10. |
| GET `/admin/fleet-exit-notices` | noticesAdmin; aviso autorizado con auditoría, no acceso a intentos ajenos. |
| GET `/fleet-exit-attempts/:key?operation=START&resourceType=AFFILIATION&resourceId=:affiliationId` | lookupStart; sólo actor original, aun sin exitId. |
| GET `/fleet-exit-attempts/:key?operation=RECHECK&resourceType=EXIT&resourceId=:exitId` | lookupRecheck; sólo actor original. |
| POST `/fleet-exit-attempts/:key/close` | close; body `{operation,resourceType,resourceId}` original, **sin nueva Idempotency-Key**. |

Referencia de compatibilidad DRIVER, no llamadas desde estos dos roles: GET `/driver/fleet-affiliation-context`; POST `/driver/fleet-affiliations/:affiliationId/exit-requests` con `{expectedAffiliationRevision,reasonCode:"VOLUNTARY_EXIT"}`; GET `/driver/fleet-exit-requests`, GET `/driver/fleet-exit-requests/:exitId`, POST `/driver/fleet-exit-requests/:exitId/recheck`, GET `/driver/fleet-exit-notices`. DRIVER tiene salida propia sin veto; no se implementa aquí su experiencia.

Tipos de contrato que se definirían sin añadir campos wire:

| Tipo | Forma exacta prevista |
| --- | --- |
| AffiliationContext | `{schemaVersion:1,serverTime,affiliation:null\|{id,driverId,providerId,state,revision,startedAt:null\|ISO,observedAt},exit:null\|ExitSummary,capabilities:{canRequestExit,requestExitReason:null\|string},independent?:IndependentReadiness}`. Variante provider omite independent por completo. |
| ExitSummary | `{id,affiliationId,driverId,providerId,status,revision,requestedAt,completedAt:null\|ISO,initiatedByKinds:(DRIVER_REQUEST\|PROVIDER_REMOVAL)[],blockers:PublicBlocker[],hasPendingEconomics,capabilities:{canRecheck,recheckReason:null\|string}}`. |
| ExitDetail | ExitSummary más `{lastEvaluatedAt,notices:ExitNotice[]}`; no schemaVersion adicional inventado ni colecciones privadas de asistencia. |
| PublicBlocker | `{code,assignmentId?:UUID,assistanceCaseId?:UUID}`; cuatro códigos operativos de §3, referencias sólo autorizadas. Texto UI derivado del código; no campo message inventado. |
| IndependentReadiness | `{profileState,canOperate,reasons:string[],allowedZoneIds:UUID[],selectedZoneId:UUID\|null,requiresExplicitReceptionStart}`; sin saldo o documentos. |
| ExitNotice | `{id,exitId,type:REQUESTED\|COMPLETED,createdAt}`; sin actorUserId, texto privado, readAt o ACK. Detail.notices máximo 25 recientes propios, sólo dos eventos por salida en 1.0.0. |
| CursorPage<T> | `{items:T[],nextPageToken,asOf}`; no totalPages. |
| AppliedReceipt | `{schemaVersion:1,receiptId,key,operation:START\|RECHECK,status:"APPLIED",resourceType:AFFILIATION\|EXIT,resourceId,exitId,exitRevision,exitStatus:PENDING\|COMPLETED,appliedAt}`; HTTP 200. Discriminar START/AFFILIATION y RECHECK/EXIT. |
| Attempt | `{schemaVersion:1,key,operation,resourceType,resourceId,status:APPLIED\|REJECTED\|PENDING\|UNKNOWN\|CLOSED_NO_EFFECTS,receipt:objeto\|null,redacted:boolean}`. Receipt REJECTED incluye code/httpStatus y operación/recurso/fecha; el schema completo aún debe publicarse, no inventarlo. |

Revisiones: strings canónicas con regex `^(0|[1-9][0-9]{0,18})$` **y** rango 0…9223372036854775807. Comparación BigInt o decimal exacta, nunca Number; no confundir revisión de afiliación, salida, modo, gasto o zonas. Fechas ISO UTC. El cliente valida estructura antes de habilitar comandos; enums/capacidades desconocidos no conceden autoridad. No construye materialHash ni deriva bloqueos localmente.

## 6. Intención, reintentos y recuperación

Diseñar un store cifrado propio por entorno/cuenta, con scope de rol/proveedor y validación de ruta/recurso. Guardar atómicamente **antes de HTTP**: versión local, actor, entorno, proveedor cuando corresponda, operación, resourceType/resourceId, ruta/query exacta, key UUID, body exacto y revisión congelada. affiliationId de START es obligatorio; exitId es un resultado posterior opcional local, no requisito ni campo añadido al DTO. Timestamp local sólo para UX, no fecha efectiva. Cuerpo reconstruido desde la copia confirmada, nunca desde contexto recién leído.

Reutilizar patrón AES-GCM/clave WebCrypto no exportable en IndexedDB, sin compartir el namespace de assistance. No tokens, contactos, saldos o documentos en store/logs/URL. Protección del origen sigue siendo necesaria: XSS del mismo origen puede usar la clave; borrar datos del navegador elimina el vínculo local con la clave original. Si falla persistencia, no enviar. Logout limpia memoria y consultas, no transforma un intento incierto en resuelto ni lo entrega al siguiente usuario. Reautenticación debe ser de la misma cuenta; otro OWNER/ADMIN puede leer la salida, nunca recuperar el intento privado del anterior. SUPER_ADMIN tampoco puede apropiárselo.

| Situación | Conducta prevista |
| --- | --- |
| Doble clic/dos pestañas | Bloqueo inmediato en memoria y compare-and-set durable por intención/recurso. Una sola key/copia confirmada; no generar claves al montar, reconectar o cambiar filtro. Distintos actores concurrentes pueden obtener el mismo exitId canónico: no deduplicar solicitudes sólo por driverId. |
| Timeout/respuesta perdida/reinicio | Conservar la intención; consultar START con AFFILIATION/affiliationId original. No exigir exitId ni sustituir el recurso por driverId. No reenviar automáticamente. |
| APPLIED | Guardar recibo; releer detalle actual por exitId si autorizado. El recibo es inmutable y puede seguir diciendo PENDING aunque el GET actual ya sea COMPLETED. Mostrar por separado resultado del intento y estado actual; no degradar un estado actual por un recibo antiguo. |
| REJECTED | Mostrar código seguro; conservar resultado. Nueva intención únicamente tras reconocimiento y confirmación explícitos; no reintento ciego. |
| PENDING del intento | «Intento en curso; resultado aún no confirmado», respetar Retry-After y consulta acotada, sin espera infinita. Es distinto de salida PENDING. Cierre puede devolver PENDING. |
| UNKNOWN | «No hay resultado durable confirmado; puede llegar una solicitud tardía». Consulta/reenvío explícito de la misma intención o cierre técnico autorizado. No significa ausencia de efectos. |
| CLOSED_NO_EFFECTS | «Esta intención quedó cerrada sin efectos». No equivale a salida cancelada, afiliación reactivada, deuda liquidada ni ausencia de otra solicitud de las partes. Releer cuando exista permiso. |
| Cierre técnico | Confirmar que bloquea únicamente la clave original. En terminal retorna el resultado existente; no fuerza CLOSED_NO_EFFECTS. Con PENDING ocupado seguir recuperación. Tombstone debe rechazar el envío tardío de esa clave. |
| Revisión conflictiva | AFFILIATION_REVISION_CONFLICT/EXIT_REVISION_CONFLICT: recuperar primero, releer, descartar borrador y confirmar nueva intención sólo cuando corresponda. No cambiar revisión bajo la misma key. Adhesión concurrente con revisión original es decisión backend, no excepción fabricada por UI. |
| Respuesta tardía tras cambio de cuenta/proveedor/recurso | AbortSignal más generación/identidad al resolver; no renderizar, navegar o limpiar el intento de la nueva cuenta. Mantener original cifrado para recuperación propia. Dos respuestas distintas no autorizan retroceder estado; releer proyección actual. |
| Permiso perdido | 401 reautenticar misma cuenta; 403/404 retirar datos privados. Intento propio puede devolver `redacted:true,receipt:null`; no recuperar cuerpo privado desde otro rol. Cerrar clave desconocida requiere autoridad actual. |

Errores por código: 400 VALIDATION_ERROR/PROVIDER_SCOPE_REQUIRED corrigen entrada/selección; INVALID_CURSOR reinicia páginas. 409 FLEET_EXIT_DISABLED impide START nuevo, no lecturas ni replay aceptado; FLEET_EXIT_PENDING/AFFILIATION_ENDED invalidan acciones incompatibles; IDEMPOTENCY_KEY_REUSED/ATTEMPT_CLOSED no se evaden con otra key. 503 RETRY_SAME_ATTEMPT conserva cuerpo/clave con recuperación y espera acotada. Código desconocido: resultado no confirmado o rechazo según recibo/HTTP, nunca éxito supuesto. No comparar mensajes ni convertir todos los errores en reintento.

## 7. Cachés, historia y avisos

Claves futuras incluyen cuenta, rol, proveedor seleccionado, colección, recurso, filtros y generación de navegación. Consultas privadas sin persistencia ni service worker; no-store, retry false, gcTime 0 y sin mantener datos de scope anterior en transiciones. Cambiar cuenta/proveedor, perder permisos o cerrar sesión cancela y retira páginas, detalles, borradores y avisos de memoria. No basta ocultar botones. Las claves no hacen autoridad: cada GET/comando debe revalidar en backend.

Listas de salidas: status PENDING/COMPLETED, limit 1…100 (25 predeterminado), pageToken opaco; filtros por rol de §5. Cursor firmado de cinco minutos ligado a actor/rol/permisos/colección/filtros; mantener filtros en continuación, reiniciar al cambiarlos. Orden requestedAt DESC/id DESC. asOf limita inserciones, **no congela estados ni permisos**: actualizar filas por id, no mezclar filtros ni duplicarlas cuando cambian a COMPLETED. INVALID_CURSOR → retirar páginas antiguas y reiniciar primera página. Mutación confirmada → primera página y contexto/detalle actual; no optimismo que quite providerId, pareja o habilite independiente.

Al completar, invalidar queries relevantes de recursos/asignaciones/gasto/FLEET/asistencia y, sólo en admin, perfil/zonas independientes. No invalidar mediante peticiones provider a APIs admin. Una alerta vieja abre lectura autorizada actual, no un formulario preconfirmado. No recuperar el contexto actual de un exconductor desde su historial. La expiración de la ventana de detalle no borra tombstones ni autoriza replay.

Avisos HTTP durables REQUESTED/COMPLETED: refrescar al abrir/refocar y después de mutaciones, además de botón de actualización. Lista por createdAt DESC/id DESC, deduplicar por id; puede llegar retrasada o en orden no causal. No inferir PENDING desde un REQUESTED antiguo: consultar el detalle. El eventRevision de outbox es interno y no se añade a ExitNotice. Sin ACK, endpoint de marcar leído, nuevos sockets, emails o push supuestos. La ausencia de lectura/aviso/cliente conectado nunca veta la salida; worker y outbox son responsabilidades backend. No cerrar intenciones humanas por silencio.

Flag futuro `FLEET_EXIT_REQUESTS_ENABLED=false`: bloquear START nuevo únicamente; conservar lecturas, recuperación, replay aceptado, RECHECK y finalización segura de pendientes. No reutilizar ASSISTANCE_COMMANDS_ENABLED como flag de salida ni alterar predeterminados actuales. Un estado pendiente no admite nuevas tomas de ninguno de los dos modos; no bloquear toda la flotilla ni impedir ejecución autorizada de ACTIVE.

## 8. Garantías que Web no puede simular

El backend debe acreditar atomicidad de ENDED/COMPLETED, providerId null, cierre de pareja histórica, revocación de gasto, modo NONE, OFFLINE, recepción detenida y selecciones limpiadas sin borrar zonas independientes autorizadas. No transferir vehículo, créditos, documentos o cobertura; no borrar cuenta, Driver, historial ni obligaciones. El frontend no orquesta estos efectos con endpoints actuales.

Migración posterior a 64, FK histórica, excepción no_provider respaldada, guards inmediatos/diferidos, lockDeletion y orden de locks, fences frente a TAKE antiguo, worker/leases y restore son dependencias backend, no tareas Web de esta entrega. Un resultado HTTP exitoso o una prueba de componente no demuestra estas garantías.

## 9. Matriz prevista, no ejecutada

U = pruebas unitarias/componentes/cliente futuras; H = navegador + API/PostgreSQL real futura; B = evidencia backend necesaria. Fixtures futuras sintéticas por rol, OWNER/ADMIN A, proveedor B, conductor A/B y SUPER_ADMIN, sesiones distintas. No se crean ahora mocks que aparenten disponibilidad.

| Casos backend | Prueba Web prevista y evidencia requerida |
| --- | --- |
| X01–X02 | H: DRIVER solicita sin respuesta del dueño; bandeja proveedor recibe salida sin voto. OWNER y ADMIN inician retiro; reasonCode correcto, misma identidad/cuenta, START no disponible para SUPER_ADMIN. |
| X03–X04 | U/H: enlaces profundos, query manipulada, otra flotilla, membership revocada; 401/403/404, datos retirados, recibo mínimo redactado sólo del actor, worker continúa (B). |
| X05–X06 | U/H: START APPLIED/PENDING con ACTIVE FLEET o independiente/custodia; no éxito de desvinculación, no cancelar ejecución, referencia independiente omitida al proveedor, RECHECK no force. |
| X07 | U/H/B: COMPLETED con economía pendiente/UNKNOWN; responsabilidades y ledger intactos, sin falsa liquidación ni veto. |
| X08–X09 | U/H/B: perfil NONE/PENDING/SUSPENDED/REJECTED no autoaprobado ni ficticio; cuenta conservada. |
| X10–X11 | U/H: perfil aprobado y zonas previas conservados, selección/turno no restaurados; no copiar zona FLEET aunque coincida geográficamente. |
| X12 | H/B: vehículo, saldo, documentación de titularidad y pareja histórica no transferidos/eliminados. |
| X13 | U/H/B: START simultáneo conductor/proveedor converge al mismo exitId; iniciadores tipados, sin doble efecto/aviso, no exigir ACK. |
| X14–X15 | H/B: carreras TAKE ambos modos/asignación/emparejamiento/gasto/modalidad; primer commit define resultado, cliente antiguo incluido; Web sólo relee y respeta rechazo. |
| X16 | U/H/B: incertidumbre operativa acepta petición pero bloquea completar; resultado terminal no leído no bloquea perpetuamente; ningún worker recupera en nombre del actor. |
| X17 | U/H: doble clic, dos pestañas, timeout antes/después de commit, recarga/reinicio; store cifrado, mismo body/key/revisión; recuperar START por affiliationId sin exitId. |
| X18 | U/H/B: clave con body/recurso distinto, cierre concurrente y envío tardío; CLOSED_NO_EFFECTS no cancela petición existente, PENDING respeta Retry-After. |
| X19 | U/H: revisión obsoleta, >int64, ceros no canónicos y afiliación de otra época; no Number ni renovación silenciosa del body. Adhesión sólo según backend. |
| X20–X21 | H/B: fallo intermedio, dos workers/RECHECK, crash/lease vencido; UI no muestra completion ni aviso ficticios; rollback/atomicidad demostrados por backend real. |
| X22 | U/H: flags OFF antes/después de aceptar; START nuevo bloqueado, recibo/replay/lectura/RECHECK siguen; no borrar intentos pendientes. |
| X23 | U/H: dos dispositivos, confirmación antigua, cambio de cuenta/proveedor/logout y respuestas tardías; sin recuperación cruzada ni autoridad conservada por cursor. |
| X24 | U/H: detalle histórico 12 meses y membership actual, PENDING visible; no lectura de contexto actual ni datos independientes futuros del exconductor. Probar frontera de ventana y recibo redactado. |
| X25 | U/H: páginas vacías, duplicados, status cambiante, cursor de otra colección/actor, vencido y filtros constantes; asOf no congela permisos. |
| X26 | U/H/B: aviso duplicado/tardío/no leído/indisponible, REQUESTED tras COMPLETED; no regresión de estado, sin ACK necesario; outbox durable verificado por backend. |
| X27–X28 | B, más H posterior: upgrade desde 64, historia inalterada, SQL/restore/cuarentena/fences; no atribuirlos a pruebas Web. |
| X29 | U/H/B: account closing/reauth y allowlist estrecho, sin START permitido por recuperación; restricciones de asistencia intactas, excepción NONE sólo transacción respaldada. |
| X30 | U/H/B: FLEET 1.0.0, independiente 1.1.0, asistencia/movementContext y usuarios duales sin salida conservan contratos; sin nuevos eventos socket ni filtro general de zona TAKE. |

Además: U de schemas opcionales/null/arrays vacíos, omisión completa de independent para provider, códigos desconocidos, body estricto sin force/providerId/requestId extra, almacenamiento fallido antes de envío, persistencia sin credenciales, accesibilidad de confirmaciones y revisión visual 320/1280. H futuro en Node/PostgreSQL local aislado (WSL), auth/guards reales y datos sintéticos, fuentes actualizadas verificadas; sin Docker, .env compartidos o servicios operativos. Typecheck/lint/build serán validaciones de implementación futura, no evidencia de una API disponible hoy.

## 10. Bloqueos concretos y puntos de precisión

| Hallazgo | Ruta/campo/regla y consecuencia | Tratamiento de diseño |
| --- | --- | --- |
| API nueva inexistente | Todas las rutas de §5, schemas runtime, migración/guards y pruebas reales faltan por alcance autorizado. | No botones funcionales ni HTTP de prueba; implementar sólo con autorización posterior y contrato runtime publicado. Las decisiones S1–S10 no se reabren. |
| Scope en rutas provider abreviadas | Spec §4 exige selección si hay varias memberships; §5 explicita providerId en contexto/START/lista, pero no en detalle/RECHECK/avisos; E3/E4 omiten query. | Conservar scope local. Para detalle/RECHECK seguir ruta publicada por exitId y autorización histórica; no añadir providerId al body. Antes de codificar confirmar si esas rutas deducen scope del exitId y si la bandeja de avisos admite/requiere providerId. No inventar parámetro ni cambiar errores globales actuales. |
| Filtros de avisos no cerrados en schema | §5 dice «mismas reglas» para avisos, pero status de salida no pertenece a ExitNotice; no hay DTO específico publicado. | Diseñar limit/pageToken y scope autorizado, sin inventar status/type/driverId como filtros de avisos. Confirmar allowlist con schema futuro; no reutilizar automáticamente filtros de salidas. |
| Recibo REJECTED incompletamente enumerado | §7 especifica code/httpStatus, operación/recurso/fecha, sin forma completa ni nombre de fecha. | Usar sólo campos garantizados en diseño; schema discriminado completo requerido antes del cliente runtime. No mapear a receipt de asistencia. |
| Recuperación bajo baja de cuenta | Spec §13.5 requiere allowlist aún por especificar/probar; AuthProvider actual convierte DELETION_RESTRICTED en sesión restringida, no User estándar. | No prometer recuperación universal con JWT ni abrir rutas generales. Nueva recuperación sólo de hechos propios aceptados con credencial válida y excepción estrecha acreditada. |
| Enlace directo a custodia insuficiente | PublicBlocker no contiene dispatchId/incidentId; detalle existente los requiere. | Enlazar a bandeja administrativa existente; no derivarlos de assignmentId ni inventar una nueva ruta. |
| Gestión de zonas no presente en Web | Backend OfferAdminController existe; cliente independentDrivers no ofrece offer-zones. `/service-zones` administra catálogo geográfico, no autorización independiente. | Incluir futuro selector sobre API existente con profileId y su propio DTO; no declarar reutilización de una pantalla inexistente ni convertir cobertura FLEET en permisos. |
| No reutilizar autorización de recursos como permiso histórico | DriverDetail depende de drivers.get y FleetResourceScope; contexto provider actual del exconductor no debe ser accesible (§13.4). | Bandeja/detalle independiente por exitId, membership vigente y ventana; no dependencia de Driver.providerId actual para historia. |

No se encontró contradicción que obligue a cambiar S1–S10. Los puntos anteriores son dependencias de implementación o precisiones del contrato wire; no se resolvieron editando backend. Handoff/contrato contienen párrafos históricos superados por sus adendas, por lo que se priorizan spec §§5–7 y §13 actuales.

Activación remota/producción es un pendiente separado: implementación backend, migración y guards verificados, aceptación de clientes, responsables de incidencias, política de conservación y recuperación/restore aprobados. No se activa ni se añade FLEET_EXIT_REQUESTS_ENABLED ahora. Las pruebas previas de assistance/movementContext no acreditan esta API.

## 11. Comprobaciones de esta entrega

Únicamente lectura documental y revisión estática de componentes/rutas/servicios. Se contrastaron roles, estados, proyecciones, nombres de rutas y cuerpos con los cuatro documentos; se identificó la falta del selector Web de zonas y los límites de recuperación/custodia. No se ejecutaron typecheck, lint, build, pruebas unitarias, navegador ni integración HTTP: no cambió código y no existe la nueva API. Matriz §9 completa como plan, no resultados PASS. Continuidad añadida a README, BITACORA y VERIFICATION conservando entradas previas; cambios de esta entrega limitados a esos tres archivos y este documento.

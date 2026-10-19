# Baja documental: contrato Web y límites

Actualización de presentación posterior: [mensajes de revisión y etiqueta Conductor](RESTRICTION-REVIEW-WEB.md) corrige los hallazgos Web citados en el historial siguiente, sin cambios de permisos, mutaciones o recuperación. Validación nueva con fixtures, sin integración real adicional.

Actualización posterior 2026-10-18: [decisiones CANCELLED recuperables](CANCELLED-COMMAND-RECEIPT-WEB.md). Cuatro decisiones Web verificadas con Nest/PostgreSQL aislados y pérdida de respuesta después del commit; GET original sin nuevo POST. Supera el bloqueo de recuperación de la adaptación V2 inicial. Defecto pendiente: mensaje de revisión completada tras bloqueo global pese a restricciones activas. Constancias parciales y límites productivos permanecen.

Historial de la adaptación inicial:

Actualización 2026-10-18: [adaptación operativa V2](DOCUMENT-DELETION-V2-WEB.md),
con matriz previa, revisiones, H histórico/incidencia actual, constancias y
restricciones individuales. Validación Web sintética; no integración V2 real.
La recuperación de decisiones sobre CANCELLED sigue bloqueada por el contrato
backend. Las entradas siguientes conservan sus fechas e historia.

Actualización 2026-10-17: los bloqueos históricos 1 (identidad restringida) y 4
(recibo administrativo tras recarga, salvo cancelación) tienen contrato y adaptación
nuevos. Véase [compatibilidad Web](DOCUMENT-DELETION-COMPATIBILITY-WEB.md), con
recorridos A/B reales aprobados. El texto fechado 2026-10-16 se conserva como historial.

## Preparación y fuente

2026-10-16. Web: `C:/Users/zorgl/Documents/mandaria-frontend`, rama
`feature/driver-verification`, base/HEAD `56c7bad0524cbbf05b45fa687a8ec625694a6ca0`.
Árbol limpio al comenzar. Este commit contiene verificación y W-01. No se cambió
de rama ni se importó QA. AGENTS.md no existe en este checkout; las instrucciones
anteriores fueron revocadas por el usuario. README, BITACORA y VERIFICATION leídos.

Backend consultado sólo en lectura: checkout principal, misma rama, HEAD
`b300c250df9fcc4aea8bcd76a1d6ed7c93e04e9a` más cambios locales. Huellas en
[deletion-backend-contract.json](deletion-backend-contract.json). Mandan controller,
DTO, `DocumentDeletionService` y guards, contrastados con OpenAPI y pruebas; las
propuestas históricas no añaden endpoints. Documentos de diseño §§16–17,
implementación, runbook de recuperación y plan de drenaje consultados.

## Matriz previa a implementación

Prefijo `/api/v1`. Todo el workflow está limitado por backend a test local
autorizado; 503 `PRIVACY_WORKFLOW_UNAVAILABLE` no demuestra aceptación.

| Pantalla / acción | Endpoint y método | DTO | Permiso y estado | Errores / límites |
|---|---|---|---|---|
| Nueva baja propia | POST `/privacy/deletion-requests` | scope, resourceId opcional, password, acknowledgment=true; Idempotency-Key UUID | Usuario activo, correo verificado y contraseña; pertenencia comprobada por servidor | 401 REAUTH_REQUIRED; 400 INVALID_SCOPE; 409 ACTIVE_REQUEST_EXISTS/IDEMPOTENCY_KEY_REUSED |
| Solicitud asistida | mismo POST | subjectUserId adicional, sin contraseña ajena | SUPER_ADMIN; tercero queda IDENTITY_REQUIRED, sin atribuir facultades | Identidad/facultades se resuelven separadamente |
| Seguimiento propio | GET `/privacy/deletion-requests/:id` | UUID | Actor o titular activo; incluye pendingActions | 404 indistinguible de ajeno; 401/403 no significan eliminación |
| Recuperar alta perdida | GET `/privacy/deletion-requests/by-key/:key` | UUID original | Sólo actor original | 404 no prueba que nunca llegue el alta; no generar otra clave |
| Constancia | GET `/privacy/deletion-requests/:id/receipt` | UUID | Actor/titular; closedAt o completedDocumentaryScopes>0 | 409 RECEIPT_NOT_READY; no PDF, firma o descarga oficial |
| Cancelación | POST `/:id/cancel` bajo privacy/deletion-requests | expectedRevision + clave UUID | Actor/titular; sin irreversibleStarted ni closedAt | 409 SCOPE_VERSION_CONFLICT/IRREVERSIBLE_ACTION_STARTED; no deshace archivos |
| Bandeja administrativa | GET `/admin/privacy/deletion-requests` | ninguno | SUPER_ADMIN; máximo 100, sin paginación | No inventar totales ni exhaustividad |
| Pendientes administrativos | GET `/admin/privacy/deletion-requests/:id/{tasks,work-items,replacements}` | UUID | SUPER_ADMIN comprobado en controller y servicio | Presentar campos permitidos, no serializar objetos crudos |
| Resolución administrativa | POST `/admin/privacy/deletion-requests/:id/resolve` | expectedRevision, action, evidenceRef UUID y campos de acción | SUPER_ADMIN; precondiciones por acción | Sin bypass de drenaje ni reinicio de intentos; replay exige cuerpo original |
| Excepción concreta | POST `/:id/retention-decisions` administrativo | revisión, categoría, purpose/basis, ownerId, reviewAt, expiresAt opcional, objectId opcional | SUPER_ADMIN, evidencia concreta | No listar/revisar excepciones por IDs inventados |
| Política restore | POST `/:id/restore-policy` administrativo | ownerId/deputyId distintos, reviewAt, horizonEndsAt opcional, evidenceRef | SUPER_ADMIN | No abre restore ni acredita scripts externos |
| Canal asistido | POST `/:id/assisted-access` administrativo | verifiedEmail, evidenceRef | SUPER_ADMIN; confirmedAt y no PURGED | 202 sólo envío aceptado; token por correo, no respuesta; no exactamente-una-vez |
| Seguimiento sin sesión | POST `/privacy/deletion-access/status` | token privado en cuerpo | Capacidad real expedida por backend, 15 minutos | 401 AUTH_REQUIRED; token sólo memoria, nunca URL/log/cache persistente |

## Alcances

- ACCOUNT: cierre personal, no borrado de historia logística ni créditos. Para
  conductor de flotilla no equivale a cerrar la flotilla.
- PERSONAL_DOCUMENTS: documentación personal; no cierre de cuenta.
- INDEPENDENT_SCOPE: sólo con perfil independiente confirmado; no baja de la
  relación con flotilla.
- FLEET_LINK: proveedor del conductor confirmado; desvinculación sin cerrar cuenta.
- REPRESENTATIVE: pertenencia del titular al proveedor comprobada por servidor;
  retiro irreversible de membership, no cierre de organización.
- VEHICLE y ORGANIZATION: solicitud con comprobación manual de facultades,
  nunca autorizadas sólo por un checkbox. Organización requiere pertenencia del
  sujeto; vehículo requiere existencia y decisión administrativa.

No hay endpoint de preview ni catálogo de capacidades. Se muestran consecuencias
generales y recursos obtenidos de APIs autorizadas; el servidor determina el
inventario, vínculos compartidos y facultades. Sin evidencia suficiente no se
ofrecen alcances por deducción del nombre del rol.

## Bloqueos contractuales identificados

1. Tras gate USER, guard deniega `/auth/me`, incluso con token reciente. Login y
   restore Web dependen de esa lectura; no se inventa identidad/token ni se mantiene
   sesión artificial. Canal privado sin sesión disponible con token real asistido.
   El backend debe exponer una identidad mínima compatible o un contrato de acceso
   limitado para que Web recupere las acciones del servicio activo tras reautenticar.
2. No listado propio. Consulta por folio o recuperación por clave; un navegador
   distinto requiere el folio o canal asistido. No se inventa búsqueda por correo.
3. SUPER_ADMIN puede listar y resolver ajenas, pero `get`/`receipt` usan record sin
   override admin: sólo actor/titular. Detalle admin usa la fotografía de list;
   constancia ajena no se habilita por el rol.
4. No recuperación por clave ni cierre técnico para mutaciones administrativas o
   cancelación. Sólo replay con mismo cuerpo en memoria; tras recarga se conserva
   marcador mínimo y bloqueo, nunca cuerpo privado. Leer estado no acredita el
   recibo de ese comando. No se reutiliza recuperación logística/documental anterior.
5. No catálogo de permisos de escritura ni detalle de excepciones. No ofrecer
   RECONCILE_WRITER con IDs inventados; tampoco REVIEW/END_RETENTION sin catálogo.
6. Vista pública/privada no expone política, fecha individual de subhitos, recursos
   afectados, clasificación ni detalle de excepciones; no se fabrican esos campos.
7. Spaces no acredita drenaje real. TTL, tiempo, archivo invisible o HEAD no
   certifican eliminación. H operativo y backups NOT_ATTESTED siguen separados.

## Validación y entrega

Implementación local terminada con fixtures; integración real pendiente. Sin
backend, base, QA, commit, push ni despliegue. No se acredita producción ni borrado
real de Spaces. Las 12 huellas backend se volvieron a comprobar al cierre: cero
cambios respecto a las fuentes consultadas.

### Rutas y archivos

| Ruta | Función |
|---|---|
| `/privacy/deletion` | Referencias históricas de este navegador, recuperación por clave y consulta por folio |
| `/privacy/deletion/new` | Alcance elegible, recurso autorizado, consecuencias y confirmación explícita |
| `/privacy/deletion/:id` | Estado vigente, cancelación antes de irreversibilidad y constancia separada |
| `/privacy/deletion-access` | Consulta pública con capacidad privada real en cuerpo POST, sólo memoria |
| `/admin/privacy/deletion` | Bandeja SUPER_ADMIN, máximo 100 según backend |
| `/admin/privacy/deletion/:id` | Revisión, tareas, objetos y decisiones implementadas |

Módulo nuevo `src/deletion/{contract,service,pending,hooks,pages,review}` y CSS
aislado. Enlaces en App, Login, AdminLayout y aviso de verificación. `publicApi`
admite AbortSignal; no se alteraron login, refresh, reglas logísticas ni W-01.
Pruebas nuevas: `src/test/deletion-{fixtures,service.test,pages.test}`. Script
reproducible: `scripts/verify-deletion-web.mjs`. README, BITACORA, VERIFICATION y
docs/DRIVER-VERIFICATION-WEB se amplían sin sustituir su historia.

### Decisiones y límites de implementación

- UI administrativa: comprobación/solicitud/recepción de identidad, clasificación,
  apertura y acreditación de sustituto, sustitución de representante, asignación
  de tarea, reanudación con menos de ocho intentos, excepción concreta, política
  restore y entrega de acceso asistido. Cada decisión tiene revisión de campos y
  confirmación; los UUID de responsables/evidencia requieren verificación real
  fuera de esta pantalla. El servidor sigue validando pertenencia y facultades.
- EARLY_MINIMIZE no se ofrece: elimina contactos, eventos y recibos de comandos;
  no hay catálogo de retenciones/contacto/auditoría para revisar sus consecuencias.
  RECONCILE_WRITER y REVIEW/END_RETENTION tampoco se ofrecen por los límites arriba.
  Ninguna de estas omisiones se representa como una transición cumplida.
- Abrir sustitución sólo usa resolve OPEN_REPLACEMENT. No se añade carga en el
  expediente bloqueado ni una vía alternativa para el presentador; la aportación
  queda en los expedientes autorizados del flujo de verificación existente.
- No existe flag de sesión restringida en identidad. Web no inventa uno a partir
  de un rol o de una solicitud histórica. El guard backend conserva autoridad;
  401/403 explican falta de acceso y ofrecen el canal privado. La continuidad
  después de reautenticar un USER gate sigue bloqueada por `/auth/me`.
- Snapshot desconocido se conserva en memoria, con explicación neutra y acciones
  deshabilitadas. Sólo se traducen motivos conocidos. Tareas y sustituciones se
  proyectan antes de entrar en caché, eliminando campos internos y presentador.
- Consultas manuales sin polling/retry/refetch de foco; AbortSignal al desmontar,
  gcTime=0, clave por API/actor/recurso. Respuesta de menor revisión no reemplaza
  estado mayor. Constancia y estado usan claves distintas. Mutación confirmada
  cancela lecturas, retira caché operativa e invalida consultas de baja del actor.
- Marcadores locales guardan sólo actor, operación, UUID, folio si se conoce y
  aceptación histórica; se separan por entorno. No guardan contraseña, token,
  cuerpo, finalidad ni documentos. Sin localStorage válido se bloquea envío.
  Logout no elimina referencias inciertas. No se transfiere recuperación a otra
  cuenta. La protección de doble clic es local a la pantalla; pestañas simultáneas
  dependen además de la exclusión/idempotencia del servidor.
- Rechazo inicial confirmado permite preparar otra operación. Timeout, 401,
  conflicto de clave o respuesta inválida preservan incertidumbre. En replay,
  incluso un 403 conserva el marcador previo: no prueba que el primer envío no
  haya surtido efectos. Un 404 de by-key nunca borra el intento. No hay cierre
  técnico artificial ni reconstrucción del cuerpo después de recargar.
- Fechas se presentan desde ISO del servidor, localizadas por el navegador;
  ningún calendario, plazo, sello ni finalización se calcula en cliente.

### Textos representativos

> La eliminación sigue pendiente porque aún no se ha podido confirmar que todas
> las cargas anteriores terminaron.

> Esta constancia sólo acredita los subámbitos documentales comprobados. El resto
> sigue pendiente.

> Los respaldos del proveedor no están acreditados como eliminados. No se
> certifica eliminación total.

Resultados exactos y evidencia: [VERIFICATION](../VERIFICATION.md), sección
«2026-10-16 — Baja documental Web». El primer fallo de caché temporal del runner
no se acredita como prueba pasada; el único diagnóstico adicional sí completó.

### Procedimiento de futura integración aislada (no ejecutado)

1. El responsable backend debe confirmar que el clúster es el del runbook:
   PostgreSQL 18, listener `127.0.0.1:55441`, `data_directory` resuelto a
   `.tmp/deletion/pgdata`. Leer identidad del servidor/base/usuario antes de
   migrar. Si no coincide, detenerse; no arrancar ni reutilizar una base desconocida.
2. Crear una base nueva con nombre único terminado en `_test`, sin datos reales;
   `DATABASE_URL`/`TEST_DATABASE_URL` explícitas a ese clúster, sin cargar `.env`.
   Aplicar el procedimiento exacto del runbook backend y sus migraciones mediante
   `.tmp/deletion/prisma.config.ts`. No reutilizar bases de negocio ni destinos de
   restauración existentes. El backend registra y conserva los resultados.
3. El responsable debe habilitar únicamente el entorno test local, con el doble
   de almacenamiento de las pruebas backend, correo capturado localmente y sin
   credenciales/rutas de Spaces. La configuración DISABLED no se convierte en
   evidencia de borrado. El doble puede acreditar únicamente su universo sintético;
   nunca se exporta un sello para usarlo en Spaces.
4. Conectar Web a ese puerto loopback explícito y crear actores, membership,
   conductor independiente/flotilla, unidad, documento mixto y servicio activo
   sintéticos. Repetir por alcance los permisos de la matriz, incluyendo consultas
   ajenas denegadas y cuentas sin relación. Verificar el guard en HTTP real.
5. Retener/perder una respuesta POST después de commit servidor; recuperar por
   clave original, comprobar una sola solicitud y plazos intactos. Para decisiones,
   repetir exactamente cuerpo/clave en memoria; tras recarga comprobar bloqueo
   documentado. No borrar marcadores para continuar una prueba incierta.
6. Probar drenaje no acreditado, ocho intentos, vencimiento, sustituto autorizado,
   servicio activo, H y constancia parcial con backups NOT_ATTESTED. Comparar los
   campos con BD/HTTP del doble; ninguna captura por sí sola demuestra eliminación.
7. Verificar cierre/restricción de sesión y reproducción del bloqueo `/auth/me`;
   emitir capacidad asistida por correo capturado y consultar sin sesión. Probar
   caducidad, revocación, cambio de actor y abortar respuestas atrasadas.
8. Conservar reporte redacted, SHA/huellas, nombres de bases sintéticas y capturas;
   apagar sólo procesos creados para esa prueba. Restauración/cuarentena se valida
   por el runbook del backend, nunca con endpoints o botones inventados en Web.

## Revisión para publicación — 2026-10-17

El estado vigente de sesión restringida, entrega LEGACY y recibo realmente depurado está acreditado en [compatibilidad](DOCUMENT-DELETION-COMPATIBILITY-WEB.md) y sus evidencias. Los bloqueos y procedimientos fechados de este documento se conservan como historia, no sustituyen al contrato actual. Constancias parciales, drenaje real de Spaces pendiente; sin garantía de eliminación total ni aptitud productiva.

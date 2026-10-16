# Validación documental de repartidores — compatibilidad Web con main

## Estado y referencias — 2026-10-13

**Sólo análisis y documentación. No hay onboarding documental implementado ni compatibilidad integral acreditada.** Se recomienda una futura rama Web desde main `06d9766`, con adaptación acotada de capacidades; no se creó rama ni se integró QA. Backend main ya incluye operación independiente sobre Driver existente, créditos, Resend y búsqueda de cinco intentos. Registro independiente sin proveedor y revisión documental son contratos nuevos.

| Referencia inspeccionada | Resultado local |
| --- | --- |
| Web utilizado | `C:/Users/zorgl/Documents/mandaria-frontend`; no f1fe |
| Web HEAD / QA / origin/QA | `e3037397ecb6c6b086fd70c4d78f69f9a9a13cfe`; limpio al iniciar |
| Web main / origin/main / patches | `06d976619322d9811b5325fc73cd16d15e00d829`; main es ancestro de QA, confirmado con merge-base |
| Backend consultado | `C:/Users/zorgl/.codex/worktrees/driver-verification/mandaria-backend` |
| Backend HEAD / feature/driver-verification / main / origin/main | `1fa2cb1e36887181dc6a55a8c0938bdd8172c772`; 32 migration.sql |
| Backend QA / origin/QA | `9ad39b9a2bf1c87d40905dcd404f6c39b824d4cb`; 46 migration.sql |
| Cambios backend conservados | BITACORA/README/VERIFICATION y cuatro documentos nuevos: DEPENDENCIES, PROPOSAL y prompts WEB/APP. Diff de src/prisma contra main vacío |

Referencias disponibles localmente; **sin fetch, no se acredita actualidad remota**. La base proporcionada coincide. Web no tiene AGENTS.md en el árbol inspeccionado; se leyeron BITACORA, README, VERIFICATION y AGENTS del backend como referencia. Leídos DEPENDENCIES-DRIVER-VERIFICATION, INDEPENDENT-ONBOARDING-PROMPT-WEB y propuesta, especialmente §10/§11. Sus menciones históricas a QA no implican capacidades main; las precisiones de flotilla y retención prevalecen.

### Cambio concurrente comprobado al cierre

Durante esta tarea otro trabajo actualizó las referencias backend: feature/driver-verification HEAD ahora es `90b72433f8a5476ece5fda4437dc15a0a6a314f2` (commit documental, worktree limpio); main/origin/main siguen en `1fa2cb1`. QA/origin/QA avanzaron a `674e17229aa7326d3419c98bfeb94567be8abbcc`. No se realizaron estos commits desde esta tarea.

`git diff 1fa2cb1 90b7243 -- src prisma` está vacío; siete archivos documentales cambiaron. `git diff 9ad39b9 674e172 -- src prisma docs/openapi.json` está vacío; seis archivos de continuidad/evidencia comercial cambiaron. Por tanto, los contratos analizados y los conteos 32/46 permanecen aplicables. La tabla anterior registra la fotografía inicial, no el HEAD final. Ya no es correcto afirmar al cierre que la propuesta backend siga pendiente de commit; sí sigue siendo sólo documentación. Sin fetch ni integración de ramas.

## 1. Inventario por archivo Web

| Archivos | Uso y dependencia |
| --- | --- |
| `src/services/api.ts`, `src/config/env.ts`, `src/auth/{AuthProvider,Login,ActivateAccount}.tsx` | HTTP añade /api/v1; auth y activación. Access token en memoria, refresh en sessionStorage; no usar ese almacenamiento para documentos. AuthProvider limpia QueryClient al cambiar sesión |
| `src/app/{App,Root}.tsx`, `src/layouts/AdminLayout.tsx` | Protected valida sesión/rol, no aprobación documental. Main aún ofrece incidencias DETAILED; QA añade customer/business/track |
| `src/invitations/{service,types}.ts`, `components.tsx`, `pages.tsx` | Invitación por proveedor y activación; no registro autónomo ni revisión de identidad |
| `src/providers/service.ts`, `src/logistics/{components.tsx,service.ts,types.ts,queries.ts}` | ProviderScope y selección por membership. Autoelige sólo cuando existe uno; providerId query no concede acceso. No reutilizar Scope obligatorio para independiente null |
| `src/drivers/{service.ts,pages.tsx}` | Alta userId/name de User DRIVER existente; edición nombre/estado y disponibilidad informativa. Formulario actual pide UUID, no realiza alta documental |
| `src/vehicles/{service.ts,pages.tsx}`, `src/assignments/service.ts` | Unidad operativa y emparejamiento Driver↔Vehicle; no rostro/INE/tarjeta/propiedad ni snapshot |
| `src/independent-drivers/{service.ts,types.ts,pages.tsx}` | SUPER_ADMIN habilita capacidad y unidades sobre Driver existente; selección parte de proveedor, IndependentDriverRef.providerId string. APPROVED no acredita documentos |
| `src/driver-portal/{service.ts,types.ts,format.ts,pages.tsx,queries.ts}` | Perfil, ofertas, tomar/liberar/entregar y unidades propias. DriverSelf.provider obligatorio. portalBlock distingue perfil null/PENDING/SUSPENDED/REJECTED. No se encontró llamada Web a PATCH /driver/availability |
| `src/dispatch/{service.ts,types.ts,rules.ts,pages.tsx,admin.tsx,search.ts,SearchStatus.tsx}` | OWNER/OFFER, claim, liberación, entrega legacy; trackingMode y search vienen del servidor |
| `src/delivery-assignments/{service.ts,types.ts,components.tsx,queries.ts}` | Candidatos, asignar/reasignar/cancelar e historial. Asignación de servicio distinta del emparejamiento de unidad |
| `src/credits/{service.ts,pages.tsx}`, `src/collection-instructions/` | Saldo/costo y condiciones económicas existentes; conservar |
| `src/execution/{service.ts,components.tsx,commands.ts,reconciliation-store.ts,incidents.tsx}` | DETAILED/incidencias/recuperación existen en Web main y QA; backend main no las proporciona |
| `src/customer/{service.ts,pending.ts,reconciliation.ts}`, `src/customer-business/`, `src/shipping/`, `src/location/` | Sólo QA respecto de Web main: demanda directa, Negocio, pagador y GPS/enlaces. No prerrequisito documental |
| `src/partner-applications/` | Solicitud comercial SOC; APPROVED comercial no equivale a revisión Driver/Vehicle |

DriverKeys no incluye actor y depende de limpieza de sesión. El módulo documental futuro debe aislar claves por actor/ámbito/recurso/versión, cancelar lecturas al salir y nunca incorporar documentos/URLs privadas a caché operativa.

## 2. Matriz de endpoints/campos

Prefijo **/api/v1 una vez**, añadido por cliente. P=providerId autorizado, D=dispatchId, R=driverId, V=vehicleId. «Main sí» = presencia/contraste estático, **no HTTP probado**. «Sólo QA» compara backend. Ninguna API documental nueva existe aún.

| Endpoint/campo | Consumidor | Main | Sólo QA | Nuevo contrato / ausencia / ajuste mínimo |
| --- | --- | --- | --- | --- |
| POST /auth/login, /refresh, /logout; GET /auth/me | services/api, AuthProvider | Sí | No | LoginDto email/password, RefreshDto refreshToken, me actor JWT. Reutilizar sesión sin convertir rol en aprobación |
| POST /auth/activate-account | invitations/service, ActivateAccount | Sí | No | token/password de invitación; no alta independiente ni aprobación documental |
| GET /users; POST /admin/providers/P/invitations; GET /admin/user-invitations y /:id; POST /:id/resend, /:id/revoke | invitations/service | Sí | No | email/role/driverName o membershipRole. Separar invitación y expediente |
| POST/GET /provider/driver-invitations; GET /:id; POST /:id/resend, /:id/revoke | invitations/service | Sí | No | email/driverName, P query. PROVIDER_ADMIN no envía role ni decide revisión |
| GET /provider/profiles, /profile?providerId=P, /capacity; GET /admin/providers, /:id, /:id/capacity | providers/service, ProviderScope | Sí | No | count/max y selección reales. Sin membership vacío seguro; no proveedor ficticio |
| POST/GET /provider/drivers; GET/PATCH /provider/drivers/R; equivalentes /admin/providers/P/drivers[/R] | drivers/service, pages | Sí | No | CreateDriverDto userId UUID/name; UpdateDriverDto name/status, backend displayName opcional. Nuevo expediente no cabe en DTO actual |
| GET /driver/me: provider, independent, currentAssignment, activeDeliveryAssignment | driver-portal | Sí | No | provider obligatorio. independent null=no habilitación; currentAssignment=pareja flota; activeDeliveryAssignment=servicio vigente. Nuevo contrato nullable/revisión requerido; no inferir permiso por null |
| PATCH /driver/availability | Sin llamada Web; muestra/filtra disponibilidad | Sí | No | Sólo availability; AVAILABLE/BUSY exigen Driver ACTIVE y Provider ACTIVE. Backend debe adaptar locks/guard a independiente sin proveedor |
| POST/GET /provider/vehicles; GET/PATCH /:V; equivalentes /admin/providers/P/vehicles[/V] | vehicles/service | Sí | No | identifier/type, descriptivos, plate opcional/status operativo. Falta revisión separada y control de edición material; no imponer documentación vía DTO ficticio |
| POST/DELETE /provider/drivers/R/vehicle; GET /provider/{drivers/R,vehicles/V}/assignments; equivalentes admin con P | assignments/service | Sí | No | vehicleId, misma flota, ACTIVE/libre; historial paginado. No equivale a aprobación documental |
| GET /admin/independent-drivers; GET/POST /admin/drivers/R/independent; POST /suspend, /reject | independent-drivers/service | Sí | No | reason opcional al habilitar, obligatorio al cerrar. Habilita Driver existente; no User nuevo ni expediente revisado |
| GET/POST /admin/drivers/R/independent/vehicles; PATCH /:V; GET /driver/vehicles | independent-drivers, driver-portal | Sí | No | Unidad propia, propiedad XOR proveedor/perfil independiente. Alta/edición sólo admin hoy; falta vínculo a unidad revisada |
| GET /provider/dispatches[/D]; POST /D/claim, /D/release, /D/deliver | dispatch/service, rules | Sí | No | P query; claim/deliver sin body; release reason. Preservar OWNER/OFFER, asignación, 409 y search |
| GET /admin/dispatches[/D], /admin/dispatches/D/assignments | dispatch/admin, adminAssignments | Sí | No | Consulta administrativa; no claim/entrega como SUPER_ADMIN |
| POST /provider/dispatches/D/assignment, /assignment/reassign, /assignment/cancel; GET /assignments, /available-drivers, /available-vehicles | delivery-assignments/service | Sí | No | Alta driverId/vehicleId, cambio/cancelación reason/detail. Historial de servicio array; candidatos paginados. Validar futura revisión en servidor; candidatos no reservan |
| GET /driver/dispatches/available, /driver/dispatches/D; POST /D/take, /D/release, /D/deliver | driver-portal/service | Sí | No | JWT actor; take vehicleId; release reason/detail; deliver sin body. Toma+asignación atómica; no segunda llamada claim |
| trackingMode dispatch y activeDeliveryAssignment; search | dispatch/rules/search, driver-portal | Sí: null/LEGACY | DETAILED sí | Main cuenta historial: null si nunca asignado, LEGACY incluso finalizado; me activo LEGACY explícito. Ausente sigue bloqueando. Cinco intentos ya existen main |
| GET /driver/credits[/ledger], /provider/credits[/ledger] y administración | credits/service | Sí | No | Preservar saldo/costo e idempotencia específica; aprobación no regala crédito |
| GET /{provider,driver,admin}/dispatches/D/execution; incidencias/candidatos/resolve | execution/service, panels/incidents | No | Sí | 404 en bandeja main; detalles consultan ejecución sólo DETAILED. Limitar superficie futura explícitamente, no fabricar proyección ni añadir DETAILED backend |
| GET/POST cierre /provider/dispatches/D/execution-attempt[/close]; GET /driver/dispatches/D/assignments/:assignmentId/attempt; resolución /admin/dispatches/D/custody-incidents/:id/resolution-attempt[/close] | execution/service, recovery | No | Sí | Main no resuelve marcadores QA. Conservar bloqueo y orientar al entorno de origen; 404 no significa CLOSED_NO_EFFECTS |
| GET /driver/dispatches/D/independent-attempt; POST /close | No en driver-portal/service actual | No | Sí | API QA existente no implica consumo Web ni recuperación disponible para onboarding main |
| POST /customer-registration[/resend,/confirm], recuperación password; /customer/profile, capacidades/demanda | customer/service QA Web | No | Sí | 404 en main; no reutilizar registro CUSTOMER para crear DRIVER |
| GET /customer/command-attempt, POST /close; intentos shipping-policy admin | customer/reconciliation QA | No | Sí | HumanAttemptResult comercial no existe main; dominio documental necesita contrato propio |
| business-applications/access/attempts customer/admin | customer-business QA | No | Sí | No importar aprobación Negocio/tablas como dependencia documental |
| location/tracking-link/attempt en /customer/delivery-requests/:publicId; GET /shared/delivery-tracking | location/service QA, /track | No | Sí | No GPS/enlaces main; mapa no autoriza coordenadas |
| Borrador/adjuntos/envío/revisión/decisión/notificación/purga documental | Ninguno | No | No | Nuevo contrato bloqueante, no endpoints consumibles |

### Evidencia backend

- `src/auth/auth.controller.ts`, `auth.dto.ts`: rutas y tokens humanos.
- `src/invitations/{account-activation,admin-invitations,provider-invitations}.controller.ts`, `invitations.dto.ts`: roles y campos; invitación no revisión.
- `src/providers/{provider,admin-providers}.controller.ts`, `provider-membership.guard.ts`: ámbito autorizado.
- `src/drivers/{driver-self,admin-drivers,provider-drivers}.controller.ts`, `drivers.dto.ts`, `logistics.responses.ts`, `drivers.service.ts`: self por userId, 404 sin perfil, proveedor obligatorio; disponibilidad valida Provider. `prisma/schema.prisma`: Driver.providerId String no nullable.
- `src/vehicles/vehicles.dto.ts`, controladores admin/provider; `src/drivers/drivers.dto.ts` AssignVehicleDto; `src/delivery-assignments/{provider-assignments,admin-assignments}.controller.ts` y DTO: pairing distinto de servicio.
- `src/independent-drivers/{driver-dispatches,admin-independent-drivers}.controller.ts`, DTO, service y policy: habilita Driver existente; suspensión/rechazo 409 con servicio activo; códigos INDEPENDENT_NOT_APPROVED, DRIVER_BUSY, VEHICLE_NOT_ELIGIBLE, TAKE_CONFLICT y DISPATCH_RETRY_PENDING.
- `src/dispatch/operational-tracking.ts` y self/logistics.responses: null/LEGACY real; no fallback Web.
- `src/mail/mail.types.ts`, `resend-mail.provider.ts`: sólo sendUserInvitation/sendPartnerApplicationNotice. Falta notificación documental durable; Resend disponible no la acredita.
- `src/idempotency/idempotency.service.ts`: scope integrationClientId B2B, no recuperación humana documental.
- Controladores QA leídos con git show: `delivery-execution/execution.controller.ts`, `customers/{customers,command-attempts}.controller.ts`, `business-approval/business.controller.ts`, `location/location.controller.ts`; cotejados con paths de OpenAPI de ambas refs. No se publica contrato humano en /developers.

## 3. Base Web y separación de dependencias

Recomendar futura rama desde Web main `06d9766`, no QA e303739: conserva flota/independientes/créditos/collectionInstructions/search, evita sumar clientes directos/Negocio/GPS. **Main tampoco es globalmente compatible sin ajustes**:

1. App.tsx registra /custody-incidents y su detalle; AdminLayout ofrece enlace. IncidentsPage llama /admin/custody-incidents, ausente main. Propuesta mínima: capacidad explícita soportada controla ruta, menú y consulta; mensaje de no disponibilidad, no lista vacía ficticia ante 404.
2. AdminLayout monta ExecutionRecovery: marcadores heredados DETAILED no pueden reconciliarse main. Definir aislamiento por entorno API y procedimiento de origen antes de publicar sobre mismo navegador/origen; nunca borrar marcadores ni concluir no aplicación por endpoint ausente.
3. DriverSelf.provider y IndependentDriverRef.providerId, así como selección de Driver, asumen proveedor. Nuevo contrato nullable requiere adaptación localizada; no volver nullable toda flota ni mandar cadena vacía como P.
4. DriverPortal bloquea pendientes sin expediente. Añadir onboarding fuera del guard operativo, no relajar ofertas. Probar continuidad de servicios legacy comprometidos si futura política permite cambios de estado con servicio activo: el portal no debe ocultar operación que backend aún autoriza.

Correcciones posteriores QA, como resaltado terminal e303739, pueden evaluarse individualmente en una revisión futura; no merge/cherry-pick en esta tarea. Preservar checkout QA actual.

- **Necesario:** identidad DRIVER pendiente, null explícito, expediente privado, revisión por recurso, recuperación propia y elegibilidad de nuevas asignaciones.
- **Ajeno:** demanda directa, pagador, Negocio, GPS/enlaces, custodia DETAILED y su reconciliación; no añadir a backend para satisfacer pantallas.
- **Decisión aparte:** existentes, documentos/propiedad por tipo, cambios materiales, renovación, purga flota/backups, acceso de conductor a expediente de empresa y claim proveedor sin pareja aprobada.

## 4. Pantallas, rutas candidatas y permisos

**Rutas nuevas propuestas, no APIs ni enlaces publicados.** Inspección de App/Root main y QA: no existen /driver/register, /driver/onboarding ni /admin/driver-verifications. /driver redirige a servicios; /driver/services, /driver/my-service, /driver/vehicles y /driver/credits son rutas existentes. No se detectaron colisiones. /drivers/:id y /vehicles/:id son recursos operativos protegidos y distintos del singular /driver.

| Pantalla/ruta candidata | Acceso y comportamiento |
| --- | --- |
| /driver/register y /driver/verify | Alta autónoma pública y confirmación conforme al contrato futuro. Correo existente dirige a login/soporte, sin cambio automático de rol ni duplicado. Verificar correo no aprueba; no filtrar token a analítica |
| /driver/onboarding | DRIVER propio incluso pendiente, sin Provider/Driver operativo aún. Consulta específica de onboarding, no interpretar 404 driver/me como autorización de crear. Fuera de DriverPortal aprobado |
| /driver/onboarding/identity y /driver/onboarding/vehicles/:id | Borradores separados: datos personales/rostro/INE; unidad/circulación/propiedad. Resumen, cargas completas y términos/aviso versionados antes de envío explícito |
| /driver/onboarding/history | Estado/recibos por recurso/versión, rechazo y corrección en nuevo borrador; historial no sustituye estado vigente |
| /drivers/:id/verification?providerId=P y /vehicles/:id/verification?providerId=P | PROVIDER_ADMIN con membership captura/corrige/envía en P; integrar desde altas/detalles existentes. No aprueba ni obtiene expediente independiente personal por compartir Driver |
| /admin/driver-verifications y /admin/vehicle-verifications, detalle /:id | SUPER_ADMIN; bandeja paginada por recurso/estado/proveedor, snapshot/checklist y decisión por versión. Aprobar conductor no aprueba vehículo ni proveedor |
| Baja/purga dentro del perfil de onboarding | Solicitud autenticada y estado persistido. Ubicación final sujeta al contrato; no prometer eliminación concluida antes de confirmación |

Android: candidatos exactos /driver/register y /driver/onboarding con base Web por entorno a coordinar; sin JWT en URL. Primera vuelta manual a app/login es propuesta, no función implementada. Registro Web primero sigue siendo recomendación. No se modifica Android.

**Actor/estado:** visitante sólo registro; DRIVER pendiente consulta/envía lo propio, sin TAKE; aprobado exige también elegibilidad vigente, saldo/unidad y disponibilidad. Perfil dual conserva afiliación y contextos. PROVIDER_ADMIN sólo su ámbito; SUPER_ADMIN revisa, no suplanta conductor ni entrega. Estado desconocido/error no concede permisos. 401 restaura sesión; 403 sin datos; 404 no inventa expediente; 409 refresca sin reenvío ciego; 429 respeta espera; 5xx/red conserva incertidumbre.

provider:null será legítimo sólo con contrato explícito y respuesta completa. Campo ausente/undefined, DTO malformado o error no significan independiente. independent:null actual tampoco significa aprobado. No usar ProviderScope para wizard autónomo. Separar estado documental de identidad/unidad, perfil independiente y estado operativo; registrar/invitar/verificar/crear nunca aprueba revisión.

Wizard responsive/teclado: etiquetas y requisitos según catálogo, errores por campo/resumen con foco, progreso accesible, alternativa a arrastre/cámara, borrador servidor para reanudar. Carga incompleta/cuarentena bloquea envío. No inventar autenticación oficial de INE, reconocimiento facial, liveness ni biometría.

## 5. Seguridad documental y retención

- Autorizar cada carga/lectura/decisión por propietario, membership del ámbito o SUPER_ADMIN. URL/query no autorizan. Separar titular y capturista; acceso del conductor a documentos empresariales y reutilización entre ámbitos requieren política explícita. Sin copia automática de expedientes personales a empresa.
- Objetos privados fuera de DTO operativo, tracking/B2B y caché GPS. No documentos/contactos/rostro/INE en localStorage, sessionStorage, IndexedDB, marcadores, logs, analytics, correos ni URLs de navegación. Sin caché offline documental.
- Cargas con categorías, cuotas/formatos/hash y validación real en backend; extensión/MIME cliente no aprueban. Inicio/finalización vinculan objeto al borrador autorizado; cuarentena antes de previsualización/envío. Interrupción conserva incompleto; reintentar upload conforme a contrato, sin duplicar revisión.
- Preview mediante blob temporal o URL corta autorizada sin persistencia. URL caducada retira vista y solicita otra sólo tras autorización. Revocar object URLs/cancelar lecturas al salir, cambiar sesión o perder membership; no restaurar preview por respuesta tardía. No renderizar contenido activo no confiable.
- Snapshot enviado inmutable con campos/adjuntos/versiones; decisión se refiere exactamente a versión vista. Sustitución exige nuevo borrador. Cambio material de nombre/INE/placa/serie/titular requiere nueva revisión; campos no materiales deben clasificarse antes de implementar. No conservar aprobación sobre datos distintos mediante PATCH operativo.
- Independiente: conservar mientras exista cuenta; baja retira acceso y dispara purga durable de originales/versiones/derivados/temporales. Rechazo/suspensión no son baja. Plazo técnico backups y prevención de reaparición tras restauración pendientes; mostrar pendiente/fallida/completada según comprobación backend.
- Flota: baja de administrador revoca su acceso, no equivale a borrar expedientes de empresa. Disparadores por conductor/unidad/proveedor y recursos compartidos pendientes; no dar recomendaciones por aprobadas. Sin cascada sobre servicios, custodia o créditos.
- Decisión/notificación durables: resultado en portal aunque falle email. Correo sin adjuntos/motivo sensible y enlace autenticado. «Aceptado por proveedor de correo» no prueba entrega. Faltan plantillas, worker, deduplicación/reintentos/destinatarios; Resend existente no basta. Notificar al administrador solicitante; estado al conductor propuesto, alcance por cerrar.

## 6. Contratos bloqueantes y recuperación

**Operaciones candidatas, sin inventar paths disponibles.** Publicar DTO/errores/OpenAPI antes de escribir consumidores.

| Contrato faltante | Datos y garantías por cerrar |
| --- | --- |
| Registro/verificación DRIVER | Identidad única, correo/rate limit, User pendiente y Driver sin proveedor; existentes sin autoascenso |
| Lectura onboarding | Estados por recurso, provider nullable explícito, acciones permitidas/ámbito; bloquear nuevas operaciones sin quitar servicio comprometido |
| Borrador/versiones | Crear/consultar/guardar/reanudar identidad/unidad; expectedVersion; titular/capturista; una solicitud abierta conforme a política |
| Adjuntos | Iniciar/completar/cancelar/quitar en borrador, categorías/límites, análisis, lectura temporal autorizada y purga de huérfanos |
| Envío/retiro/corrección | Snapshot sellado, vinculación de archivos, términos versionados y recibo sin binarios; nueva versión tras rechazo |
| Bandeja/revisión/decisión | Filtros/paginación, checklist, resultado de cada recurso, conflicto concurrente y auditoría mínima |
| Intentos: consulta/cierre | Actor/ámbito/operación/recurso/clave original; recibo separado del estado actual; garantía transaccional frente al POST tardío, duración de retención y permisos |
| Notificación | Resultado persistido, canal/destinatario, estado/reintento deduplicado y lectura redactada |
| Baja/purga | Autenticación, alcance por titular/recurso, obligaciones activas sin cascada, trabajo durable y backups acotados |

Recuperación propuesta, pendiente de contrato: prevenir doble clic; clave UUID por intención y cuerpo congelado sólo en memoria. Replay sólo con clave/cuerpo idénticos y garantía backend. Timeout no demuestra fracaso: marcador mínimo actor/operación/clave/referencia y ámbito necesario, sin PII/cuerpo/archivos/consentimientos completos. Tras recarga sin cuerpo, consultar intento y estado actual. Aplicado: validar recibo, refrescar recurso/versiones antes de habilitar acciones; no reemplazar una decisión vigente con recibo histórico. Incierto: bloqueo y consulta, sin regenerar clave. Cierre sólo si backend lo ofrece con garantías, confirmación explícita y consulta tras timeout. Nueva intención requiere autorización contractual y decisión del usuario, nunca envío automático.

No copiar APPLIED/CLOSED_NO_EFFECTS o HumanAttemptResult comercial de QA como contrato documental acordado. Main sólo tiene idempotencia base B2B; sin consulta durable propia la recuperación de respuesta perdida es **bloqueo exacto**, no un botón de reenvío.

Cambio de usuario no concede acceso a intentos ajenos; retirar previews, aislar estado, conservar marcador mínimo sin exponer detalles de otro actor. Otro administrador no hereda la clave del iniciador. Backend debe impedir duplicados aun con storage borrado/otro dispositivo; no confiar sólo en marcador navegador. 404 por API inexistente o permiso insuficiente no prueba no-aplicación.

## 7. Operación que se preserva

Sin cambio a claim/take, cinco ventanas/search, TTL, precios, créditos, consentimiento y entrega existente. No añadir GPS/DETAILED para satisfacer pantalla. Revisión pendiente bloquea NUEVAS tomas/asignaciones según contrato; no cancela, desasigna ni cambia autoridad de servicios comprometidos. Main excluye ocupados y rechaza suspender/rechazar independiente con servicio activo; no sustituir esa regla por una de QA.

Resolver explícitamente qué sucede si proveedor reclama sin pareja aprobada, sin alterar búsqueda por inferencia. Servidor valida vías de creación/edición/activación/pairing/asignación y concurrencia. Existentes requieren decisión: ni aprobación retroactiva ni suspensión masiva. No saldo de regalo por aprobación.

## 8. Plan futuro y matriz de aceptación

1. Cerrar documentos admitidos/titularidad, existentes, nulabilidad/elegibilidad, purga y notificaciones; publicar contrato backend main ampliado.
2. Autorizar futura rama Web desde main fijado; adaptar capacidades/rutas y procedimiento de marcadores heredados sin integrar QA entero.
3. Backend implementa dominio privado, revisiones independientes y recuperación segura con pruebas aisladas. Fuera de esta tarea.
4. Web añade módulo de tipos/servicios/hooks, wizard propio/flota y bandejas SUPER_ADMIN reutilizando infraestructura; no aprobación ficticia.
5. Pruebas focalizadas, tipos/lint/build, visual sintético; después navegador → backend main ampliado → PostgreSQL exclusivo y correo controlado. Mocks no acreditan transacciones.
6. Coordinar Android y despliegue sólo con autorización, transición/privacidad/retención acordadas. No alta habilitada ahora.

### Pruebas necesarias, no ejecutadas

| Caso | Criterio de aceptación |
| --- | --- |
| Independiente null | Registro/correo dejan pendiente; null explícito válido, campo ausente bloquea; sin ofertas/TAKE hasta aprobación y requisitos operativos; HTTP/DB real |
| Flota/perfil dual | Membership y unidades propias/flota separados; no copia ni acceso al expediente personal independiente |
| Identidad/unidad pendientes/rechazadas | Aprobar una no aprueba otra; servidor bloquea nueva toma/asignación; corrección en versión nueva |
| Acceso A/B | Proveedor A no lee/carga/decide B; DRIVER sólo propio; SUPER_ADMIN único revisor; probar IDs y URLs privadas alterados |
| Existentes/servicio comprometido | Sólo transición aprobada; preservar operación autorizada, sin desasignación/cargos/rondas extra |
| Edición material | Cambio posterior no hereda decisión; probar carreras edición/decisión/asignación en DB |
| Respuesta perdida/recarga | Una decisión, sin cuerpo persistido; recibo original separado de estado actual; incierto bloquea; petición tardía no supera cierre confirmado |
| Cuenta/revisor concurrente | Doble clic/dos revisores producen un resultado válido; otro actor no consulta intento; limpieza de previews/cache y bloqueo server en otro dispositivo |
| Main sin APIs QA | Navegación acordada no llama customer/business/location/execution; rutas directas no fabrican datos; marcador QA nunca se cierra por 404 |
| Archivos privados | Cuarentena/incompleto/inválido/cuota/objeto ajeno/URL caducada/cambio sesión/sustitución postenvío; sin fuga tracking/storage/logs |
| Notificación fallida | Decisión persiste, portal muestra resultado; email reintento no repite aprobación; sin documentos o motivo privado |
| Retención/purga | Independiente y titulares flota; pendiente/fallo/completado reales; sin cascada operativa; backups/restauración según política |
| Accesibilidad/errores | Móvil/teclado/foco y 401/403/404/409/429/red; sin éxito optimista o preview tras perder permiso |
| Regresión main | Invitación/activación/disponibilidad, claim/take/pairing/asignación/entrega legacy, créditos y cinco intentos; datos sintéticos |

## 9. Evidencia y límites de esta tarea

Ejecutado: git branch/rev-parse/status/branch -av, merge-base main QA, diff main QA -- src, show por ref, ls-tree y conteo migration.sql 32/46; lectura/búsqueda de continuidad, controladores, DTO, proyecciones y consumidores; parseo de OpenAPI main/QA para contrastar rutas; revisión de diff documental. Referencias locales sin checkout/fetch/merge/cherry-pick.

No ejecutado: suites, tipos/lint/build de producto, navegador, HTTP, correo, DB, migraciones, Docker, servicios, VM o producción. Sin documentos ni servicios reales, cambios backend/app/configuración, instalaciones, mensajes a otros agentes, commit/push/despliegue. Pruebas anteriores en VERIFICATION son históricas, no evidencia de esta iniciativa. La matriz futura y las propuestas no son funcionalidades entregadas.

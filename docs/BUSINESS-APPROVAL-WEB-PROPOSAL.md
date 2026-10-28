# Cuenta Negocio — implementación y propuesta histórica

## 2026-10-12 — Implementación Web sobre contrato publicado QA 9ad39b9

Esta sección sustituye las rutas candidatas y el estado «no implementado» de la propuesta histórica conservada abajo. Autorización: implementar y validar únicamente Mandaria Web.

### Base y alcance

- Checkout: `C:/Users/zorgl/Documents/mandaria-frontend`; rama **QA**, HEAD base `a5fe19a6c0375207e552f1b04580ba7bbe04b3e7`. No se utilizó f1fe ni se cambiaron/integraron ramas. Índice vacío.
- Se conservaron los cambios documentales previos y el reemplazo del logo del registro por `/mandaria.svg`.
- Backend de referencia sólo lectura: `9ad39b9a2bf1c87d40905dcd404f6c39b824d4cb`. Código/OpenAPI contrastados con ese commit; el diff local backend sólo mostraba BITACORA (+24 líneas) y `nul` sin seguimiento, ajenos a esta tarea. Migración comercial publicada: **46**, no la 45 de la propuesta previa. No se consultó ni migró una base.
- Leídos README/VERIFICATION/propuesta y fuentes backend solicitadas (OpenAPI, API_ACCESS, IMPLEMENTATION, ejemplos, controladores, DTO, servicio comercial y consumidores customers). AGENTS.md y BITACORA.md no existían en raíz frontend; se creó BITACORA para esta continuidad.
- Implementado sin cambios en logística, GPS, cobro, precios, consentimiento, TTL, B2B ni búsqueda automática. Sin dependencias nuevas, cambios de configuración o versión.

### Pantallas y ruta estable para Landing

| Ruta | Comportamiento |
|---|---|
| `/customer/business` | CTA **Solicitar cuenta Negocio**. Visitante: `/login?next=business`, destino permitido fijo; después de login vuelve a esta pantalla. No se acepta un redirect arbitrario. |
| `/customer/business` sin perfil disponible | Mantiene el 403 real y enlaza a verificar correo/anexar perfil Personal; no inventa un perfil null autorizado. |
| `/customer/business` Personal | Acceso actual, formulario si `canApply`, correo de sesión verificado reutilizado, historial paginado. Registro/reenvío/anexión siempre Personal. |
| `/customer/business` con PENDING | Estado y enlace al detalle; sin segunda solicitud cuando el servidor no la permite. Personal conserva capacidades propias. |
| `/customer/business` restringida/revisión | Aviso de revisión obligatoria o restricción. Bloqueo de readmisión visible incluso en Personal. Descenso sólo según `canDowngrade`, con revisión, confirmación y recibo. |
| `/customer/business/:id` | Detalle propio, snapshot y motivo público; retiro PENDING con confirmación; REJECTED/WITHDRAWN remiten a preparar una solicitud nueva, no editar el registro terminal. |
| `/admin/customer-business-applications` | Sólo SUPER_ADMIN; bandeja, estado, filtro customerAccountId, paginación de 20. |
| `/admin/customer-business-applications/:id` | Solicitud, cuenta vigente, abiertas, decisión con revisiones, nota interna exclusivamente administrativa. |
| `/admin/customer-business-access/:accountId` | Grant activo, última revocación, revocar/habilitar nueva solicitud según flags; IDs de grants obtenidos de la API. Habilitar no activa Negocio. |

La ruta relativa para Landing es **`/customer/business`**. Está implementada localmente, no se afirma despliegue ni se modificó Landing. Los usuarios operativos pueden tener perfil cliente; la solicitud propia no les concede otro rol. PROVIDER_ADMIN no accede a decisión, revocación o readmisión administrativas.

### Contrato y consumidores

- Módulo nuevo `src/customer-business/{contract.ts,service.ts,pending.ts,pages.tsx,business.css}`. Tipos humanos internos derivados del OpenAPI publicado; nada se incorpora al portal público.
- Consumidos todos los endpoints cliente/admin enumerados en el prompt, sin duplicar `/api/v1`. `profile/type` devuelve Receipt y exige clave: eliminado su consumidor antiguo que esperaba Profile y permitía BUSINESS.
- `SUBMIT` sin target; `WITHDRAW`/`DECIDE` target applicationId; `DOWNGRADE`/`REVOKE`/`ALLOW_REAPPLICATION` target customerAccountId. Admin recovery incluye customerAccountId. GET usa query; close usa JSON y clave en ruta.
- Submit trims/valida cinco campos, note vacía omitida. Decision, Revoke y Allow usan las revisiones y grant IDs leídos. Motivo público obligatorio para rechazo/revocación/readmisión; nota interna opcional. No hay documentos fiscales ni contactos nuevos.
- Página de registro y helper identity sin selector de autoascenso. Token REGISTER histórico BUSINESS: interpreta PERSONAL/businessApplicationRequired y orienta a aprobación. RESET/VERIFY conservados.
- `customer/pages.tsx`/`MyShipments.tsx`: proyección ausente/incompatible bloquea nueva demanda, no oculta MDR ni impide recuperación. `allowedShippingPayers=[]` no usa REQUESTER por defecto; ilimitado no concede permiso. MPQ convertida y consent-context mantienen autoridad sobre continuidad comprometida.
- Rutas, login y sidebar actualizados; cuenta comercial separada de partner-applications y proveedores. Perfil conserva edición independiente de contactos y enlace al módulo.
- `services/errors.ts`: traducciones de códigos comerciales sin reflejar mensajes técnicos arbitrarios. No se guarda el cuerpo del error/nota: ante 409 se consulta el recibo mediante GET scoped.

### Procedimiento de recuperación comercial

1. Confirmar una intención crea UUID antes del POST; `localStorage[mandaria.business.pending.v1]` conserva únicamente actor, account, operation, key y target si corresponde. Se exige almacenamiento disponible y Web Locks para excluir doble envío entre pestañas. Cuerpos JSON originales y notas sólo en memoria.
2. Ante error no se crea otra clave. Cuando es posible se consulta el intento original. 429 conserva bloqueo; Retry-After recibido limita replay, sin espera inventada ni reenvío automático.
3. **NOT_OBSERVED no significa fracaso**. Permanece el marcador. Consulta explícita siempre disponible para el iniciador; replay explícito sólo si sigue el cuerpo original exacto en memoria. Tras recarga no se reconstruye desde perfil ni formulario.
4. Cierre requiere confirmación. Usa POST close con operation/target/account según contrato; no cancela servicios ni revierte lo aplicado. Timeout de cierre conserva marcador; consultar GET, nunca asumir CLOSED.
5. APPLIED, REJECTED o CLOSED requieren recibo coherente con clave, operación y referencia, más lecturas actuales de perfil/capacidades o acceso administrativo y detalle de aplicación cuando existe resourceId. Revisiones actuales pueden ser mayores que las del recibo; nunca se restaura el estado histórico. Invalidación de queries `customer/actor` y `business/actor`, sin meter Receipt en cache de Profile/Application.
6. Sólo después de lecturas compatibles se retira marcador. El resultado original se presenta separado del estado vigente. APPLIED + applicationStatus REJECTED es rechazo administrativo aplicado; outcome REJECTED es comando rechazado. Otra intención se prepara explícitamente y usa nueva clave/revisión; no se envía sola.
7. Logout, login y expiración limpian cuerpos y cambian generación: una respuesta tardía no borra marcador ni publica datos en la nueva sesión. Otra identidad/administrador no consulta ni cierra el intento ajeno y no puede preparar otro sobre esa cuenta desde este navegador. No borrar storage para eludir incertidumbre.

El marcador es protección local por origen/navegador, no un registro global entre dispositivos ni reemplazo de la autorización transaccional backend. Si almacenamiento está corrupto, perfil inaccesible o lecturas no compatibles, conserva bloqueo y muestra soporte/consulta; no presume resolución.

### Validación y límites

Ver comandos y resultados completos en `../VERIFICATION.md`. **155 casos distintos** de frontend en 11 archivos focalizados; build, TypeScript de producto/pruebas y ESLint de archivos afectados aprobados. Chromium con fixtures: escritorio/móvil, teclado, CTA anónimo/login, roles, formulario y refetch, marcador tras recarga, perfil y registro Personal.

No hubo llamadas de esta validación a backend real ni PostgreSQL. Los 69/69 E2E backend previamente publicados son evidencia histórica independiente; no acreditan Web ni VM. No se verificó despliegue del backend o atomicidad en esta tarea. No hay incompatibilidad bloqueante identificada mediante lectura; el entorno que reciba esta Web necesita el contrato 9ad39b9 y su migración46 ya aplicada por responsables backend. Si falta, la UI falla cerrada para nuevas acciones comerciales.

Se corrigieron durante validación: codificación de textos/aserciones introducida por edición, expectativa antigua de reenvío BUSINESS, espera infinita de detalle administrativo con 404 y navegación lateral con doble activo. El harness visual se corrigió por sintaxis JSX y por recargar una sesión anónima simulada; no son pruebas backend. Sin abortos EPERM del runner.

Limitaciones: aviso de chunk Root superior a 500 kB; no cambiado el empaquetado. No se añadieron correos de decisión, cobros comerciales, documentos ni promesas de precios. Sin commit, push, despliegue, Docker, flags, cambios backend/configuración o servicios externos.

---

## Propuesta histórica (no describe el producto actual)

# Aprobación manual de cuenta Negocio — propuesta Web

Fecha: 2026-10-12. **Sólo análisis y documentación; NO implementado.** Rutas, DTO y nuevos archivos son candidatos. Se requiere autorización nueva y contrato backend real antes de implementar.

## 1. Base y evidencia

- Checkout principal `C:/Users/zorgl/Documents/mandaria-frontend`, QA, HEAD `a5fe19a6c0375207e552f1b04580ba7bbe04b3e7`; árbol limpio al inicio. No se usó f1fe ni se integraron/cambiaron ramas.
- Leídos README.md, VERIFICATION.md y continuidad V1.17. AGENTS.md y BITACORA.md no existen en la raíz frontend inspeccionada. Se preserva el historial.
- Backend sólo lectura: QA `ce45dff84b3f3e4c388b5d90cf5b8a095bc36210`, **45 migraciones** (directorios), coincide con la referencia. Su status muestra documentos modificados/nuevos y `nul`; no se tocaron. No se consultó DB.
- Referencias canónicas backend: `docs/BUSINESS-APPROVAL-PROPOSAL.md` y `docs/BUSINESS-APPROVAL-BACKEND-DESIGN.md`; diseño §3–6 y §11 prevalece sobre ejemplos preliminares.
- Búsqueda estática de BUSINESS_APPROVAL/businessAccess/business-applications/BusinessApplication en src backend, docs/openapi.json y src frontend: sin contrato comercial implementado encontrado. No se probaron endpoints por HTTP.
- Esta etapa acredita lectura, Git, recuento de migraciones y revisión del diff documental. Las pruebas históricas en VERIFICATION acreditan funciones anteriores, **no esta propuesta**. No se ejecutaron suites, tipos, build, navegador ni otra etapa CHECK.

## 2. Inventario de consumidores reales

| Archivo / símbolo | Hallazgo actual | Impacto futuro |
|---|---|---|
| `src/customer/identity.tsx`: CustomerRegistration/CustomerAccess | Delega registro; confirm ignora respuesta y muestra confirmación/login. RESET cierra sesión; VERIFY conserva identidad | Tipar REGISTER y consumir profileType/businessApplicationRequired; no alterar tipo con RESET/VERIFY |
| `src/customer/RegistrationPage.tsx` | PERSONAL/BUSINESS; negocio obligatorio en UI BUSINESS; alta y reenvío con perfil completo | Sólo Personal. CTA posterior autenticado; nunca transformar automáticamente un BUSINESS rechazado en otro POST Personal |
| `src/customer/identity.tsx`: ProfileFields | Helper exportado con selector BUSINESS; búsqueda sólo encuentra definición tras extraer registro | Retirar/actualizar para no mantener una vía reutilizable de autoascenso |
| `src/customer/ProfilePage.tsx` | Anexión admite BUSINESS; cambio directo customer.type con expectedRevision. canType exige capacidad conocida y activeCount=0; uncertain es memoria local | Anexión Personal, CTA de solicitud y descenso controlado. Recibo/key y recuperación durable de descenso; el booleano actual no basta tras recarga |
| `src/customer/service.ts`, `contract.ts` | profile sin accountId ni campos comerciales; type devuelve ProfileView y no usa key | Nuevos DTO internos reales y Receipt; actualizar todos los consumidores, no sólo el formulario |
| `src/customer/pages.tsx`: CustomerHome/NewRequest/Conversion | Queries por actor; gates canPrequote/canCreateRequest; recuperación se evalúa antes; MPQ convertida puede continuar a MDR | Motivos comerciales e incompatibilidad explícitos. No presentar todo como «Cupo no disponible». Conservar lectura/recuperación de MPQ y MDR existentes |
| `src/customer/QuoteForm.tsx` | Prefiere defaultShippingPayer, pero exige pertenencia a allowedShippingPayers y ready exige payer | Conservar bloqueo con lista vacía; default REQUESTER no es permiso |
| `src/customer/MyShipments.tsx` | canQuote usa capacidades; texto de límite usa maxActiveRequests; lista y servicio activo separados | null no concede autorización ilimitada; aviso comercial sin ocultar envíos |
| `pages.tsx`: CustomerRequest, `RequestActions.tsx`, `consent.ts`, `reconciliation-contract.ts` | Aceptación usa consent-context propio, canPrepareConsent, MDR/MQ, estado/TTL, términos y checkbox; no capacidades globales | Preservar decisión por recurso: compromiso acreditado por backend, nunca fecha de corte inferida por reloj cliente |
| `src/customer/pending.ts`, `AttemptRecovery.tsx`, `reconciliation.ts` | Marcador actor/key/kind/ref/related, cuerpos en memoria, Web Locks y estados HumanAttemptResult | Protocolo comercial independiente; no reutilizar enum, storage o reglas de limpieza de errores logísticos |
| `src/customer/service.ts`: rememberConversion/conversionReference | Referencias MPQ/MDR locales sin cuerpo | No fuente de autorización comercial ni evidencia de compromiso |
| `src/auth/AuthProvider.tsx` | Logout/expiración borran cuerpos y cache; login limpia cache pero no llama forgetBodies | Nuevo contexto comercial se limpia también al sustituir identidad: cuerpo/notas/borrador fuera; marcador mínimo irresuelto permanece aislado |
| `src/app/App.tsx`, `src/layouts/AdminLayout.tsx` | Rutas públicas registro/access; Protected/roles; CustomerArea sólo contenedor; App espera auth.loading | No convertir CustomerArea en gate comercial global. Rutas cliente propias y admin SUPER_ADMIN, sin cambios de rol |
| `src/partner-applications/service.ts`, `pages.tsx`, `types.ts` | Solicitudes de socios en /admin/partner-applications, estados/links propios | Módulo y caché separados; no reutilizar decisiones de socio transportista |
| `src/services/{api,errors,query}.ts`, `src/config/env.ts` | api añade /api/v1 al origen; apiOnce y normalización centralizados | Paths sin prefijo duplicado; códigos comerciales traducidos; recibos sin detalles internos |
| `src/location/*`, `execution/*`, `dispatch/*`, `shipping/*` | GPS/enlaces, autoridad logística, recuperación y pagos separados | No gates comerciales de ejecución ni cambios de shippingPayment, precios, cinco intentos B2B o refunds |

Consumidores de customer.type: ProfilePage y `src/test/customer-service.test.ts`; attach: ProfilePage; confirm: CustomerAccess y tests. Fixtures también en customer.test, profile/quote/shipments-design tests. El encabezado observa cache de perfil. Revisar todo este inventario durante implementación.

## 3. Pantallas y navegación propuestas — NO disponibles

### Alta y acceso

- `/customer/register` y resend existentes sólo Personal. Copy: «Crea tu perfil Personal. Para usar una cuenta Negocio, inicia sesión y solicita su revisión». No grant ni aplicación automática.
- Anexión en `/customer/profile`: Personal, activo/verificado según API; conserva User, rol y sesiones operativas. CustomerAccount no exige exclusivamente rol CUSTOMER.
- REGISTER antiguo BUSINESS: candidato 201 `status=CONFIRMED, profileType=PERSONAL, businessApplicationRequired=true`. Copy: «Tu perfil Personal fue creado. La cuenta Negocio requiere una solicitud y aprobación». businessName sólo texto. No extender TTL ni reutilizar token consumido. Respuesta perdida: login/perfil o recuperar contraseña.
- REGISTER Personal: businessApplicationRequired=false. RESET/VERIFY no alteran tipo/grant. Datos nuevos ausentes/desconocidos: «No se pudo confirmar el tipo de perfil con esta versión del servicio. Inicia sesión y consulta tu perfil». Nunca restaurar ascenso directo como fallback.

### Cliente autenticado

Rutas Web **propuestas**: `/customer/business` estado/historial, `/customer/business/new` formulario, `/customer/business/:id` detalle. Acceso «Cuenta Negocio» desde perfil/Mis envíos; sin alterar menú operativo. CTA Landing **propuesto, no disponible**: «Solicitar cuenta Negocio» → `/customer/business`, con login/perfil verificado y retorno interno permitido. Registro anónimo sigue en /customer/register. No modificar Landing ni confundir con integración B2B.

Formulario aprobado: nombre comercial, giro, ciudad/zona, volumen estimado (cantidad y periodo en texto), nota opcional. Reutilizar correo verificado, sin contacto/teléfono extra, RFC/documentos/pago. Trim/máximos finales, asteriscos, labels, aria-describedby/aria-live, foco en errores, submit ocupado y guard de doble envío. Volumen no crea cuota/precio/cobertura. Revisión técnica desde servidor, nunca input manual. Leer canApply/revisión antes de nueva intención; si cambian mientras se edita, conservar borrador en memoria y pedir revisión, no enviar automáticamente.

Submit exitoso muestra PENDING, no «Negocio activado». Snapshot/estado/razón pública e historial paginado (lista de aplicaciones previas; el diseño no publica un endpoint de eventos, por lo que no se inventa una cronología de auditoría); terminales sólo lectura. Retirar requiere confirmación: «Retirar esta solicitud no cancela tus envíos ni cambia por sí solo el acceso comercial». Para corregir terminal: botón «Preparar nueva solicitud», snapshot público como borrador opcional en memoria, nuevo ID/key y revisión vigente, decisión explícita. Rechazo/retiro permiten inmediatamente otra intención si canApply y resultado previo confirmado, con una PENDING y rate limit real; no modificar historial. REVOKED no hereda esa política.

### SUPER_ADMIN

Rutas Web propuestas `/admin/customer-business-applications` y `/:id`; bandeja «Cuentas Negocio» separada de «Solicitudes de socio». Filtros reales, paginación, snapshot, perfil/acceso/revisiones actuales, activeRequestCount y decisión. PublicReason visible al cliente; internalNote rotulada «Sólo administración», nunca DTO/cache pública.

APPROVE confirma: «Aprobar y activar cuenta Negocio. El servidor comprobará que no tenga solicitudes abiertas». Count=0 no reserva ni garantiza; se revalida. Con abiertas: conflicto, sin aprobación parcial ni programación automática al cerrar. REJECT exige razón pública. Ninguna decisión/confirmación premarcada.

Revocar sólo con grant/cuenta vigente desde datos autorizados: razón pública, nota interna opcional y confirmación. Con abiertas deja BUSINESS/RESTRICTED; sin abiertas pasa PERSONAL/NONE atómicamente. No cancela servicios ni devuelve dinero. Descenso titular por /profile/type sólo PERSONAL, canDowngrade/cero abiertas/key; rechazo no degrada. Otro admin puede consultar recurso/decisión pero no recuperar/cerrar/repetir la key del iniciador.

## 4. Matriz estados/capacidades/acciones

| Tipo/acceso | Aplicación/grant | Nuevas MPQ/conversiones | MDR comprometidas | Solicitud/descenso |
|---|---|---|---|---|
| PERSONAL/NONE | null, REJECTED o WITHDRAWN; sin grant ACTIVE | Reglas Personal y capacidades: REQUESTER, una abierta | Contexto/TTL propio, lectura, cancelación legal, recuperación | Nueva intención explícita con canApply; sin espera comercial después de rechazo/retiro |
| PERSONAL/NONE | PENDING | Sigue Personal sin ventajas | Sin gate comercial nuevo | Leer/retirar, no segundo submit |
| BUSINESS/ACTIVE | APPROVED, grant ACTIVE MANUAL_ADMIN | Sólo capacidades actuales | Términos y TTL originales | No nueva solicitud; descenso si canDowngrade |
| BUSINESS/REVIEW_REQUIRED | null, PENDING/WITHDRAWN heredada | Bloqueadas | Evidencia servidor, aceptación dentro TTL y resto de flujo | canApply; retirar no habilita; descenso explícito cero abiertas |
| BUSINESS/RESTRICTED por REJECTED | REJECTED/retirada/nueva PENDING | Bloqueadas | Igual protección | Nueva solicitud corregible si canApply, o descenso autorizado |
| BUSINESS/RESTRICTED por REVOKED | Historia APPROVED, grant REVOKED | Bloqueadas | Igual protección | Readmisión pendiente; no deducir canApply; descenso según contrato |
| PERSONAL/NONE después de revocar sin abiertas | Historia/grant REVOKED | Reglas Personal válidas | Históricos consultables | canApply debe considerar revocación previa; NONE no borra antecedente |
| Campos requeridos faltantes/desconocidos/incoherentes | Cualquier tipo | Estado de incompatibilidad, sin permiso por defecto | No ocultar lectura, recuperación, tracking o consentimiento válido por recurso | No nuevas mutaciones comerciales ni autoascenso; consulta/soporte |

Aplicación PENDING/APPROVED/REJECTED/WITHDRAWN, acceso NONE/REVIEW_REQUIRED/ACTIVE/RESTRICTED y grant ACTIVE/REVOKED son estados distintos. APPLIED es outcome de comando, no estado de cuenta ni pago. No PAID, cobro, periodicidad o gratuidad perpetua.

allowedShippingPayers=[] no autoriza REQUESTER aunque sea default. maxActiveRequests=null no concede acceso. Carga/error/cache antigua no habilitan mutaciones. Backend sigue siendo autoridad ante carreras; no inferir compromiso por createdAt/reloj local.

## 5. Contrato candidato requerido

**No API disponible.** Base /api/v1 una vez; service usa paths sin prefijo. No regenerar/copiar OpenAPI ahora.

| Método/path relativo | Scope/DTO candidato | Resultado |
|---|---|---|
| POST /customer/business-applications | Titular activo/verificado; SubmitDto, key | 201 Receipt |
| GET /customer/business-applications | Propias; page>=1, pageSize 1..100 default20, status opcional | Página |
| GET /customer/business-applications/:id | Propia; UUID | ApplicationView; ajena/inexistente404 |
| POST /customer/business-applications/:id/withdraw | expectedApplicationRevision, key | 200 Receipt |
| GET /customer/business-application-attempts/:key | Titular, operation/target | 200 AttemptView |
| POST /customer/business-application-attempts/:key/close | operation/target sin formulario; key en ruta | 200 AttemptView |
| GET /admin/customer-business-applications | SUPER_ADMIN; paginación anterior y customerAccountId opcional | Página admin |
| GET /admin/customer-business-applications/:id | SUPER_ADMIN | AdminApplicationView |
| POST /admin/customer-business-applications/:id/decision | DecisionDto, key | 200 Receipt |
| POST /admin/customer-business-access/:customerAccountId/revoke | RevokeDto, key | 200 Receipt |
| GET /admin/customer-business-application-attempts/:key | SUPER_ADMIN iniciador; operation/customerAccountId/target | 200 AttemptView |
| POST /admin/customer-business-application-attempts/:key/close | Mismo actor; body operation/customerAccountId/target | 200 AttemptView |
| POST /customer/profile/type | Sólo type PERSONAL + expectedRevision + key | 200 Receipt, **ya no ProfileView** |
| GET /customer/profile y /customer/capabilities | businessAccess/businessApplication añadidos | Vistas vigentes |

- SubmitDto: expectedAccountRevision entero>=1; businessName 1..160, activity 1..500, city 1..100, estimatedDeliveryVolume 1..100, note opcional 1..1000.
- WithdrawDto: expectedApplicationRevision, sin motivo obligatorio ni cambio de acceso por sí solo.
- DecisionDto: APPROVE/REJECT, expectedApplicationRevision, expectedAccountRevision; publicReason 1..500 requerido REJECT/opcional APPROVE; internalNote opcional 1..2000.
- RevokeDto: grantId, expectedAccountRevision, publicReason 1..500, internalNote opcional (precisar máximo final).
- DOWNGRADE: DTO existente sólo PERSONAL; descenso de BUSINESS puede retirar PENDING en mismo recibo; Personal/NONE es no-op idempotente y retirar su aplicación requiere withdraw.

Null no equivale a omisión. Strings trim, sin propiedades desconocidas; IDs UUID v4. Generar key UUID v4 en Web; candidato backend admite 8–255 ASCII visibles, no afirmar validador UUID obligatorio. Idempotency-Key en mutaciones salvo close, que lleva key en ruta. Operation SUBMIT/WITHDRAW/DECIDE/REVOKE/DOWNGRADE. Target vacío SUBMIT, applicationId WITHDRAW/DECIDE, cuenta REVOKE/DOWNGRADE. Confirmar serialización wire final.

ApplicationView: id/status/revision/submittedAt/resolvedAt nullable/snapshot/publicReason nullable. AdminApplicationView añade cuenta, tipo/acceso/revisión actuales, activeRequestCount, correo verificado y decisionActorId/internalNote. No publicar vistas admin a cliente/Driver/B2B/tracking. Snapshot inmutable; editar perfil no lo actualiza.

businessAccess={state,source,restrictionReason,canApply,canDowngrade}; source MANUAL_ADMIN/LEGACY_REVIEW/null, RESTRICTED conserva fuente/razón histórica REVOKED/REJECTED. businessApplication nullable={id,status,revision}; no usar state como estado de solicitud. Página candidata `{items,total,page,pageSize}`, orden submitted/created DESC,id DESC estable. Page<T> actual exige totalPages: adaptar paginación desde total/pageSize o esperar contrato final, no forzar cast.

Receipt={key,operation,outcome,code,resourceId,committedAt,result}; outcome APPLIED/REJECTED/CLOSED. Result mínimo applicationStatus/applicationRevision/accountRevision/accessState/accountType/grantId, nullable según operación; sin formulario/notas. Replay conserva HTTP/resultado original y header Idempotent-Replayed:true. AttemptView={state,receipt}; state NOT_OBSERVED/APPLIED/REJECTED/CLOSED.

## 6. Caché y recuperación comercial propuestas

Módulo futuro independiente `src/customer-business/`: contract/service/queries/pending/recovery/páginas cliente-admin (nombres propuestos). Reutilizar apiOnce, React Query, Field, Confirm, feedback y guards; no sustituir recuperación logística ni añadir kinds comerciales al protocolo de pedidos por conveniencia.

Marcador nuevo versionado: actor, cuenta, operación, objetivo y key. Guardar antes del POST. Sólo metadatos mínimos en persistencia; body original inmutable en memoria ligado a actor. Sin formulario, contactos, tokens, notas internas o consentimientos en storage/logs/URLs. No exponer referencias ajenas a otro usuario. Coordinar pestañas por cuenta/intención; sin almacenamiento/lock fiable no enviar. AbortSignal/generación de sesión descarta respuestas tardías de otro actor.

Procedimiento futuro verificable:

1. Leer revisión/capacidades actuales, decisión explícita, guardar marcador/key y cuerpo; doble clic bloqueado; sin retry automático del POST.
2. Timeout/5xx/respuesta inválida: «Pendiente de reconciliación. La operación puede haberse aplicado». Conservar marcador; no nueva clave ni resultado optimista.
3. GET intento valida actor/cuenta/operación/objetivo/recibo. APPLIED identifica resultado histórico; después GET perfil/capabilities/aplicación/historial vigentes. Si fallan o no son coherentes, mantener bloqueo. APPLIED + applicationStatus=REJECTED significa rechazo administrativo registrado, no fallo de comando ni aprobación.
4. REJECTED significa precondición fallida. Traducir code y releer estado actual; no llamar «rechazada» a la aplicación salvo estado real. Nueva intención sólo explícita tras resolver recibo, revisión/key nuevas.
5. NOT_OBSERVED no prueba fracaso: puede existir transacción/POST tardío. Si cuerpo exacto sigue en memoria, replay explícito con misma key/cuerpo; no editarlo. Tras recarga/cambio de sesión, GET o close, nunca reconstruir desde perfil actual.
6. Close confirmado escribe fence o devuelve ganador. Copy: «Cerrar este intento técnico impide que se aplique tardíamente si aún no se aplicó. No cancela ni revierte entregas». Timeout conserva marcador y consulta GET. Si ganó resolución, tratar recibo; si ganó cierre, POST tardío recibe BUSINESS_ATTEMPT_CLOSED sin efectos. No asumir CLOSED por timeout.
7. CLOSED confirmado + estado vigente coherente permite preparar nueva intención, nunca enviarla automáticamente. Solicitud corregida después de REJECTED/WITHDRAWN usa ID/key nuevos sólo al confirmar terminal y resolver incertidumbre anterior.
8. Logout/expiración/sustitución de actor limpian cuerpos, borradores, notas y caché admin; cancelan lecturas. Marcador irresuelto mínimo permanece aislado; cambiar usuario/recargar no borra bloqueo en la misma cuenta. Otro admin puede leer estado por rutas normales pero nunca consultar/cerrar key ajena. Backend resuelve carreras entre administradores con intenciones independientes.

Queries por actor y cuenta; filtros/página en listas y scope admin separado. Tras submit/withdraw/decision/revoke/downgrade confirmado: invalidar y esperar relectura de perfil/capabilities/lista/detalle/historial afectados. Actualizar header mediante caché existente. Revisar MPQ visible por revisión de política, sin recrear cotización ni condiciones. Recibo antiguo nunca reemplaza perfil vigente con setQueryData. Otras sesiones requieren refetch/foco autorizado; no prometer nuevo socket.

Mantener independientes HumanAttemptResult logístico APPLIED/PENDING_OR_UNKNOWN/CLOSED_NO_EFFECTS, COMMAND_ATTEMPT_CLOSED, recuperación execution y tracking-link. Sus tablas de errores/borrado de marcador no sirven automáticamente para negocio. Recuperar un recibo logístico aplicado debe seguir permitido bajo restricción comercial y no conceder nuevas operaciones.

## 7. Errores y copy propuestos

| Respuesta candidata | Comportamiento |
|---|---|
| 409 BUSINESS_APPROVAL_REQUIRED | «Para usar Negocio necesitas solicitar aprobación». CTA, no reenvío ni alta Personal silenciosa |
| 409 PROFILE_REVISION_CONFLICT / BUSINESS_APPLICATION_REVISION_CONFLICT | «Los datos cambiaron. Consulta la versión actual antes de decidir». No reenviar sobre nueva revisión automáticamente |
| 409 BUSINESS_APPLICATION_PENDING | Releer solicitud existente; una PENDING; no clave nueva para evadir |
| 409 BUSINESS_APPLICATION_NOT_PENDING / BUSINESS_ACCESS_ALREADY_ACTIVE / BUSINESS_GRANT_NOT_ACTIVE | Consultar recurso/recibo/grant y estado actual; no éxito parcial |
| 409 CUSTOMER_ACTIVE_REQUESTS | «Hay solicitudes abiertas, incluso pendientes de aceptación. La cuenta no fue activada». Resolver intento y otra decisión manual cuando corresponda |
| 409 BUSINESS_REVIEW_REQUIRED / BUSINESS_ACCESS_RESTRICTED | Bloquear sólo nuevas MPQ/conversiones; conservar MDR comprometidas y CTA comercial |
| 409 IDEMPOTENCY_KEY_REUSED / BUSINESS_ATTEMPT_CLOSED | No cambiar key/cuerpo ni repetir; reconciliar y preparar nueva intención sólo cuando proceda |
| 409 SHIPPING_POLICY_CHANGED | MPQ anterior no permite nueva conversión; nueva cotización explícita si capacidad permite, sin modificar TTL/hash |
| 400 VALIDATION_ERROR / IDEMPOTENCY_KEY_INVALID | Mensajes por campo, sin detalles internos. No limpiar marcador sin resolver si existe recibo |
| 401/403/404 | Auth/403/ownership existentes; no exponer cuenta ajena ni interpretar como rechazo comercial; conservar marcador sin permiso ajeno |
| 429 | Retry-After real si existe; sin espera comercial inventada ni retry POST. Cinco submit/withdraw por minuto es propuesta técnica backend, no cuota publicada |
| 503 BUSINESS_COMMAND_UNAVAILABLE / red / timeout | Incertidumbre y consulta del intento, no asumir fracaso ni crear otra key |

## 8. Compatibilidad y transición

- Backend/OpenAPI humano real antes de consumo. No exportar comercial al portal B2B ni regenerar tipos contra un borrador.
- Web nueva/backend viejo: campos ausentes => incompatibilidad explícita, sin selector antiguo ni permiso por tipo. Backend nuevo/Web vieja: backend bloquea ascenso, UI no plenamente compatible. profile/type cambia respuesta/key y confirm cambia campos; despliegue coordinado necesario.
- Corte backend atómico con escritores antiguos detenidos, inventario autorizado/ventana/comunicación. No prometer despliegue mixto, cero interrupción o rollback al binario de autoascenso.
- REVIEW_REQUIRED/RESTRICTED sólo bloquea nuevas MPQ/conversiones. No ocultar MDR/MPQ/recibos ni bloquear ejecución, GPS, aceptación de compromiso anterior dentro TTL, cancelación legal o recuperación por el solo estado comercial. canPrepareConsent debe reflejar decisión backend por MDR. No inferir evidencia por fechas cliente ni exigir publicar detalles internos del corte.
- No gate comercial global en CustomerArea, Auth/User.active/account.active ni uso de CUSTOMER_ADMISSION_ENABLED como sustituto (también afecta aceptar). Servicios vencidos no se reabren; cierre de última MDR no activa Negocio automáticamente.
- Conservar términos, consentimiento, shippingPayment congelado, precios, créditos, custodia, cobros y refunds. Sin nueva tarifa/cuota, pasarela, periodicidad o promesa de gratuidad perpetua. B2B cinco intentos no se extiende a clientes directos.
- Rollback futuro mantiene versión compatible para comprometidas/históricos; no borrar grants/decisiones/fences ni revertir al autoascenso.

### Dependencias y precisiones exactas

1. **REVOKED:** §11 no autoriza readmisión ni veto permanente, incluso después de descenso a PERSONAL/NONE. canApply necesita considerar antecedentes. Flecha general RESTRICTED→ACTIVE no autoriza por sí sola esta transición.
2. ProfileView actual no expone customerAccountId. El diseño necesita cuenta/objetivo para recovery y menciona cuenta admin sin definir su estructura. Entregar identificador canónico propio disponible sin exponer ajenos.
3. GET intento enumera operation/target y admin customerAccountId; confirmar query/serialización de target vacío. Close admin fija body; close cliente dice operation/target sin formulario, sin resolver inequívocamente query/body. OpenAPI debe precisar ambos, nulabilidad y formato de Receipt en HTTP409.
4. ApplicationView dice «snapshot de seis campos»; formulario aprobado tiene cinco comerciales (businessName/activity/city/estimatedDeliveryVolume/note) y expectedAccountRevision es técnico. Precisar snapshot sin inventar sexto contacto/campo.
5. Precisar paginación sin totalPages, estructura AdminApplicationView, fuente autorizada de grantId para revocar y máximo internalNote Revoke (Decision fija2000, Revoke no lo explicita). No pedir UUIDs manuales si el recurso debe proporcionarlos.
6. Borrador preliminar muestra businessApplication.state y correo de decisión opcional; diseño §4–5 usa **status** y §1 excluye correo automático en etapa1. Seguir diseño actualizado. No prometer emails. La política de revocación pendiente limita el diagrama general (§11).
7. Backend debe acreditar activación con cero DirectRequestLifecycle.closedAt IS NULL, incluidas MDR convertidas sin aceptar; admisión por MDR, cierre frente a POST tardío y redacción/ownership. Mocks Web no prueban transacciones.

## 9. Plan de pruebas futuras — NO ejecutadas en esta etapa

Ejecutar archivos completos directamente afectados, no filtros que oculten regresiones ni suite completa indiscriminada. Los archivos comerciales nuevos son propuestas, aún no existen.

| Archivos completos | Casos requeridos |
|---|---|
| `src/test/customer-registration-design.test.tsx`, `src/test/customer.test.tsx`, `src/test/customer-service.test.ts` | Alta/resend/attach sólo Personal, BUSINESS_APPROVAL_REQUIRED; REGISTER antiguo BUSINESS→Personal/CTA, ausentes no elevan, RESET/VERIFY sin cambiar tipo |
| `src/test/customer-profile-design.test.tsx` | CTA, nombres sin privilegio, descenso PERSONAL con key/revisión/Receipt, incertidumbre tras recarga; conservar ediciones |
| Propuestos `src/test/customer-business.test.tsx`, `src/test/customer-business-api.test.ts` | Formulario aprobado, límites, correo verificado, una PENDING, retiro, nueva solicitud corregible inmediata tras rechazo/retiro, snapshot/terminal inmutables; heredado no se activa por submit |
| Propuesto `src/test/customer-business-recovery.test.tsx` | NOT_OBSERVED/APPLIED/REJECTED/CLOSED, resultado histórico distinto del actual, timeout/cuerpo perdido/recarga/cambio actor; replay exacto, cierre versus respuesta tardía, sin key nueva automática; storage mínimo |
| Propuesto `src/test/admin-customer-business.test.tsx` y existente `src/test/flows.test.tsx` | SUPER_ADMIN vs PROVIDER_ADMIN/DRIVER/CUSTOMER/URL directa; razón pública, redacción de nota interna; dos decisiones concurrentes, abiertas y revisiones frescas; admin ajeno no recupera key |
| `src/test/customer-quote-design.test.tsx`, `src/test/customer-conversion-design.test.tsx`, `src/test/customer-shipments-design.test.tsx` | Personal pendiente/rechazado sigue operando; heredado bloquea sólo nueva demanda; [] no concede REQUESTER, null no permiso; banner/envíos visibles; incompatibilidad contractual |
| `src/test/customer-request-design.test.tsx`, `src/test/customer-reconciliation.test.tsx`, `src/test/customer-tracking.test.ts` | MDR previa conserva consentimiento/TTL/hash/precio/cancelación/consulta/replay sin grant vigente; vencimiento no renueva; recuperación logística independiente |
| `src/test/location.test.tsx`, `src/test/public-tracking-design.test.tsx` | Tracking/GPS/retirada sin gate comercial; no repetir Google real ni operaciones físicas |
| `src/test/partner-applications.test.tsx`, `src/test/dispatch-search.test.tsx` si se tocan guards/navegación compartidos | Socios separados de negocio; conservar cinco rondas y no ampliar clientes directos |

Comandos futuros por grupos afectados: `npx vitest run <archivos completos de la tabla> --pool=threads --maxWorkers=1`; después `npm run typecheck:test`, `npm run lint`, `npm run build`. Revisión visual escritorio/móvil/teclado con fixtures identificadas, sin cuentas/correos reales. Son **propuestos, no ejecutados**.

Integración real futura exige autorización, backend y PostgreSQL aislado identificados con migración comercial real: corte/revisión existentes, MDR convertida pendiente de aceptación, aprobaciones con cero abiertas, rechazo/retiro/readmisión autorizada, dos administradores, respuesta perdida y cierre que impide petición tardía. Evidencia separada de mocks. Sin entorno, documentar bloqueo en lugar de declarar aprobación.

## 10. Orden recomendado y cierre

1. Resolver precisiones contractuales/política REVOKED; backend implementado con handoff/OpenAPI humano y pruebas transaccionales.
2. Nueva autorización Web: retirar todas las vías de autoascenso y tipar confirm/profile/capabilities, con incompatibilidad explícita.
3. Protocolo comercial durable antes de habilitar submit/withdraw/downgrade/decision/revoke; aislamiento de identidad/caché.
4. Formulario, estado/historial y bandeja SUPER_ADMIN separados de socios; accesibilidad y textos sin pago/notificación ficticios.
5. Gates exclusivos de demanda nueva y regresión de MDR comprometidas; pruebas focalizadas y visual, integración real por separado.
6. Acordar CTA Landing sólo cuando exista destino, responsables/canal de revisión/soporte, comunicación/ventana/inventario y autorización de despliegue.

Resultado: análisis verificable, no funcionalidad implementada ni versión activada. Dependencias: contrato real, política REVOKED, autorización de implementación y coordinación operativa. No mensajes a otros chats ni cambios backend/otros repositorios, DB, Docker, Coita, configuración, commit, push o despliegue.

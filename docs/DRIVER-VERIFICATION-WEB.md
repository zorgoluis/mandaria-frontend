# Verificación documental Web — implementación local

## Estado — 2026-10-13

Implementación de prueba en `feature/driver-verification`, worktree `C:/Users/zorgl/.codex/worktrees/driver-verification-web/mandaria-frontend`, base y HEAD `06d976619322d9811b5325fc73cd16d15e00d829` (main local). No se integró QA. No apta para producción, sin activación de controles backend.

El checkout principal `C:/Users/zorgl/Documents/mandaria-frontend` permanece en QA `e3037397ecb6c6b086fd70c4d78f69f9a9a13cfe`, con cambios previos de BITACORA, README, VERIFICATION y el análisis de compatibilidad sin tocar. El worktree f1fe tampoco se usó para esta implementación. No había AGENTS.md ni BITACORA.md en el main seleccionado; se leyeron README/VERIFICATION y la continuidad/análisis previo de referencia. BITACORA se crea en esta rama, sin copiar código QA.

Backend de sólo lectura: `C:/Users/zorgl/.codex/worktrees/driver-verification/mandaria-backend`, rama feature/driver-verification, HEAD `90b72433f8a5476ece5fda4437dc15a0a6a314f2`, base main `1fa2cb1e36887181dc6a55a8c0938bdd8172c772`. El HEAD contiene antecedentes documentales: el **working tree implementado** incluye verificación, migración `20261013000100_driver_verification`, OpenAPI, servicios y pruebas sin commit. El SHA de HEAD solo no reproduce ese contrato. No se hizo fetch ni se acredita el remoto. Se consultaron IMPLEMENTATION, BACKEND-DESIGN, DEPENDENCIES, ambos TERMS-DRAFT, TERMS-REVIEW, DTOs/controllers/responses/service/policy, migración y OpenAPI; prevalece código implementado.

## Pantallas, roles y contrato

Todas las rutas API de la tabla llevan `/api/v1` una sola vez, por el cliente existente. Autenticación humana; nunca client credentials. Tipos manuales acotados en `src/verification/types.ts` derivados del contrato humano, sin publicar OpenAPI interno en `/developers`.

| Ruta Web / rol | API consumida y comportamiento |
| --- | --- |
| `/driver/register`, pública | POST `/independent-driver-registrations` y `/resend`, sólo email, CHECK_EMAIL genérico. No acredita entrega de correo, sesión o aprobación. |
| `/driver/verify`, pública | POST `/independent-driver-registrations/confirm`, token en body, name y password16–128. CONFIRMED_LOGIN_REQUIRED → `/login?next=onboarding`. Código manual del correo, sin token en URL/storage. Un código consumido no cambia contraseña. |
| `/verification-entry`, autenticada | Destino de retorno cerrado por rol: DRIVER onboarding; PROVIDER_ADMIN flotilla; SUPER_ADMIN bandeja. `next` no acepta URLs externas. |
| `/driver/onboarding`, DRIVER | GET `/driver/onboarding`, provider nullable, estado de perfil, términos y unidades propias. POST `/driver/onboarding/vehicles`: identifier/type y descriptivos admitidos, no status impuesto; backend crea INACTIVE. No crea proveedor ficticio. |
| Confirmación de correo dentro del onboarding/flotilla | POST `/verification-email/request` y `/confirm` del usuario actual. Refresca sesión y consultas documentales tras EMAIL_VERIFIED. Campos de contraseña/código/archivo se vacían tras éxito. |
| Términos personales / representante | GET `/verification-terms?scope=DRIVER` o `scope=FLEET&providerId=P`; texto completo/version/hash LOCAL_TEST. POST `/verification-terms/accept`: versión/hash, accepted:true, method WEB_CHECKBOX_BUTTON. Checkbox desmarcado y acción explícita; cambio de versión/hash remonta el formulario. Representante nunca acepta por conductor. |
| `/verification/acceptances/:id` | GET `/verification-terms/acceptances/:id`; consulta sólo firmante autorizado, texto histórico `terms.text`, sin sustituir la versión vigente. |
| `/provider/verification`, PROVIDER_ADMIN | ProviderScope existente consulta `/provider/profiles`, `/provider/profile?providerId=P`. Reutiliza drivers/vehicles list paginados del ámbito real. Términos FLEET separados; POST/GET `/provider/verification-cases` con providerId requerido en listado; altas operativas enlazadas a formularios existentes. |
| `/admin/verification-cases`, SUPER_ADMIN | GET `/admin/verification-cases`, filtros status/providerId y paginación20; selector de proveedor existente. Sin activación de política. |
| `/verification/cases/:id`, roles humanos permitidos | GET `/verification-cases/:id` y `/verification-requirements`. Backend decide ownership/membership; SUPER_ADMIN revisa, DRIVER de flotilla consulta sin presentar, independiente propietario y PROVIDER_ADMIN presentan. No se deriva autorización de un UUID escrito. |
| Borrador y corrección | POST `/driver/verification-cases` o `/provider/verification-cases` con subjectType/subjectId del recurso. PATCH `/verification-cases/:id` con expectedVersion/data. Identidad: fullName/contactPhone/operatingCity/INE y license issuer/category/expiresAt/vehicleTypes motorizados exactos. Unidad: declaredOwnerName/serialNumber/ownershipEvidenceType y authorizationExpiresAt opcional. |
| Presentar / retirar | POST `/:id/submit`, `/:id/withdraw` con expectedVersion y confirmación. DRAFT editable; SUBMITTED congelado y retirable. REJECTED/WITHDRAWN ofrecen crear nuevo expediente del resourceId original. No se reescriben aprobaciones; renovación puede iniciarse desde el recurso. No hay aclaración ni purga inventada. |
| Revisión manual | POST `/admin/verification-cases/:id/decision`: expectedVersion, decision APPROVE/REJECT, checklistVersion, passedChecks; publicReason obligatorio al rechazar e internalNote opcional. Checklist inicialmente desmarcado, se valida cada revisión; conflicto refresca y anuncia cambio sin reenviar. |
| Evidencias | POST `/:id/uploads` con expectedVersion/category, PUT octet-stream a uploadUrl recibida, POST `/:id/uploads/:uploadId/complete` con nueva revisión consultada. POST `/:id/attachments/:attachmentId/access` devuelve **PNG binario autenticado**. DELETE `/:id/attachments/:attachmentId` sólo retira referencia de DRAFT, no afirma purga. Metadata proviene del detalle. |
| Avisos de decisiones | GET `/driver/verification-notifications` o `/provider/verification-notifications`, últimos100 autorizados; muestran decisión persistida separada del estado de envío. API provider devuelve avisos de membresías autorizadas, no admite filtro providerId en este endpoint. |
| Recuperación | GET `/verification-command-attempts/:key?operation=O&target=T`; POST `/verification-command-attempts/:key/close` body `{operation,target}`. No reutiliza contratos de intentos de ejecución/QA. |

Las evidencias requeridas proceden de requirements: rostro, INE frente/reverso, licencia declarada; unidad con circulación más propiedad/arrendamiento/autorización del titular según OWNED/RENTED/BORROWED. Máximo10 intentos de archivo incluyendo retirados, 10MiB/20MP, JPEG/PNG. El navegador comprueba tipo/tamaño; backend decodifica y comprueba píxeles. No PDF ni antimalware. Circulación también para BICYCLE es requisito del prototipo, no afirmación de obligación legal. OTHER necesita clasificación backend; la UI no inventa categoría de licencia.

## Incertidumbre y procedimiento operativo

1. Antes del comando se persiste sólo `{actor,key,operation,target}` en `mandaria.verification.pending:<origen API>`. UUID nuevo únicamente al iniciar una intención explícita, no por timeout. No se persiste body, consentimiento, PII, imagen, URL firmada o tokens. Una sola intención pendiente bloquea comandos documentales en ese navegador/origen, incluso tras cambiar de cuenta. El guard local no sustituye locks/versiones del backend ni ofrece bloqueo entre dispositivos.
2. Respuesta no confirmada, 5xx, clave cerrada/reutilizada o fallo al refrescar: conservar marcador. Volver a la cuenta iniciadora y pulsar Consultar. No reconstruir cuerpo ni borrar almacenamiento para eludir incertidumbre. No hay replay automático (ni recuperación de URL de carga).
3. **ABSENT** no prueba que una petición tardía no se vaya a aplicar. Mantener bloqueo; consultar o cerrar explícitamente. El cierre requiere confirmación y no retira el expediente ni borra archivos.
4. **APPLIED**: comprobar recibo y recurso. CREATE_CASE contrasta resourceId; términos contrastan id/actor/ámbito; unidad contrasta onboarding; adjuntos contrastan metadata. Consultar estado vigente e invalidar/refrescar consultas activas antes de quitar marcador. Un recibo de SUBMIT puede coexistir con caso actualmente APPROVED. Nunca escribir el recibo histórico como estado actual.
5. **CLOSED_NO_EFFECTS**: refrescar; retirar marcador y permitir otra intención **sólo por decisión del usuario**. Si cierre pierde respuesta, conservar bloqueo y consultar por GET; no asumir cierre aplicado.
6. Rechazo de negocio confirmado 4xx (excepto timeout408) refresca sin reenviar; `VERIFICATION_ATTEMPT_CLOSED` e `IDEMPOTENCY_KEY_REUSED` mantienen consulta pendiente. Si identidad o acceso dejó de ser válido, no consultar con otra cuenta: soporte debe restablecer acceso autorizado o aclarar contrato, sin eliminar marcador.
7. URL de carga perdida/caducada: no se recupera del recibo persistido. Consultar el adjunto CREATED y completar explícitamente si se llegaron a transferir bytes, o retirar su referencia del borrador y preparar otra carga. El límite10 incluye retirados. Cancelar transferencia no borra objetos. Error STORAGE_UNAVAILABLE puede ocurrir **después** de crear el adjunto: reconciliar primero.

Memoria de consultas segmentada por actor/organización/recurso, gcTime0 para documentación; AuthProvider existente limpia QueryClient al cerrar/cambiar sesión. Route/actor/provider remonta formularios, aborta lecturas/cargas y revoca object URLs; respuesta tardía de evidencia no abre vista ni completa carga tras salir. Imágenes se conservan sólo en estado local/blob, nunca en QueryClient. PUT usa credentials omit, sin Authorization Mandaria y referrerPolicy no-referrer; no se agregan workers, analytics ni almacenamiento de documentos. Los marcadores mínimos no se borran en logout.

## Habilitación y compatibilidad main

Onboarding usa APIs humanas implementadas, separado del guard operativo. `driver/me.provider` y `IndependentDriverProfile.providerId` admiten null. Se muestra `verification.canAdmitIdentity` cuando backend lo proporciona; no se calcula elegibilidad de licencia/unidad/crédito en cliente. Las traducciones centrales explican revisión, renovación, vencimiento, términos, clasificación y licencia al rechazar una nueva asignación. No se transforma ese rechazo en prohibición de claim del proveedor.

Un independiente pendiente accede a onboarding; uno con servicio INDEPENDENT comprometido conserva acceso al servicio aunque su perfil/revisión ya no admita otro, incluso en LEGACY. No se modificó el cierre, sus permisos, créditos o los cinco intentos. La Web main histórica indica que el cierre legacy del independiente se realiza en App; no se creó un botón nuevo de entrega documental ni se acreditó compatibilidad Android.

Main Web ya incluía módulos DETAILED que backend main no ofrece: se retira su consulta global de recuperación y el acceso a la cola de incidencias; sus URLs explican indisponibilidad. Los marcadores operativos previos quedan intactos y un aviso remite al entorno de origen. **No se convirtió DETAILED en LEGACY ni se eliminó código o marcadores históricos.** Los componentes operativos que dependen realmente de ejecución detallada siguen siendo una limitación de compatibilidad fuera del onboarding, no una capacidad nueva de este backend.

## Discrepancias y límites del contrato

- El análisis anterior decía que no había API documental: era correcto en su fotografía inicial; el working tree backend ahora la implementa sin commit. El informe de implementación actualizado es la fuente prioritaria.
- OpenAPI documenta endpoints y DTOs, pero GET acceptance y POST attachment access tienen 200 sin schema/contenido detallado. El servicio/controller aclara acceptance con `terms` anidado y acceso binario PNG (no URL). Recomendación backend: completar esos esquemas; no se modificaron aquí.
- `subjectId` del detalle es la entidad documental; el input CREATE_CASE usa UUID del Driver/Vehicle. Las correcciones usan `resourceId`, no subjectId del response.
- Códigos exactos de concurrencia: `VERIFICATION_VERSION_CONFLICT` y `TERMS_VERSION_CONFLICT`. Intentos: ABSENT/APPLIED/CLOSED_NO_EFFECTS, no estados DRIVER/command de QA.
- No hay lectura per-vehicle de elegibilidad ni estado de aceptación personal del conductor por representante. La UI explica la dependencia y muestra rechazo TERMS_ACCEPTANCE_REQUIRED; no inventa un semáforo ni permite aceptar por tercero.
- Recepción genérica de correo no confirma entrega. Fallo de aviso no revierte la revisión. No hay baja/purga o retirada de archivos congelados por UI.

## Integración real pendiente / handoff backend

No se identificó un entorno activo seguro para esta prueba. El informe backend indica PostgreSQL18 temporal loopback55439 **detenido**; no se levantó Docker, cluster, backend, correo, Spaces ni se reutilizó una base desconocida. No se leyeron credenciales .env. La evidencia backend anterior de 33 migraciones/unitarias/E2E pertenece a backend, no acredita este recorrido Web.

Para completar navegador→backend→PostgreSQL: entregar origen local y proceso identificado con ese working tree y la migración nueva (32 históricas+1); DB exclusiva identificable, cuentas sintéticas DRIVER sin proveedor, conductor de flotilla, representantes A/B y SUPER_ADMIN, correo capturado localmente y adaptador/almacenamiento de pruebas privado identificado. Confirmar CORS del PUT y origen, expiración y límites sin producción. Activación local/política corresponde al entorno coordinado de backend; esta tarea no la realizó. Repetir recuperación/close bajo concurrencia HTTP real, aislamiento, aceptación separada, JPEG/PNG, decisiones y avisos fallidos; no sustituir transacciones reales por mocks.

Antes de producción faltan términos/privacidad definitivos, evidencia de representación, política y procedimiento verificable de baja/purga/backups, almacenamiento real privado y su ciclo de limpieza, análisis antimalware si se adopta, pruebas integradas y compatibilidad App. Ningún texto LOCAL_TEST ni recibo con contractuallyEffective:false habilita producción.

## Handoff Landing y App (rutas locales implementadas, no publicadas)

- Landing: enlazar `/driver/register` y `/login?next=onboarding` del **origen Web que se acuerde por entorno**, no inventar dominio ni anunciar aprobación inmediata. `/driver/verify` recibe código por formulario; no poner tokens, contraseñas o documentos en query/fragment/storage. No se modificó Landing ni se verificó correo real.
- Conductor de flotilla: su invitación/activación existente y login, después `/driver/onboarding` para correo/términos personales. Representante usa `/provider/verification` y proveedor autorizado. Landing no sustituye su aceptación ni representa a la flotilla automáticamente.
- App: abrir `/login?next=onboarding` en contexto Web sin JWT en URL; autenticación Web propia. Al regresar, consultar estado autenticado del backend, no inferir aprobación por cerrar navegador. No cachear documentos con GPS/operación. Las incompatibilidades Android/main siguen abiertas; no se cambió App ni su cierre operativo.

## Código y verificaciones

Producto: `src/verification/{types,service,pending,hooks,format,common,identity,forms,evidence,pages,legacy,verification.css}`, `src/app/App.tsx`, `src/auth/Login.tsx`, `src/layouts/AdminLayout.tsx`, `src/services/{api,errors}.ts`, `src/driver-portal/{types,pages}`, `src/independent-drivers/types.ts`. Pruebas: tres archivos verification-*.test, fixtures, ajustes focalizados driver-portal.test y flows.test. Revisor visual reproducible: `node scripts/verify-documentary-web.mjs`; no lee .env, crea Vite temporal loopback4198, bloquea red externa, usa fixtures HTTP e imagen PNG sintética, cierra navegador/servidor propios. Salida ignorada `test-results/documentary-web/`.

Resultados y comandos completos: [VERIFICATION](../VERIFICATION.md). Historial: [BITACORA](../BITACORA.md). No se cambió versión, configuración operativa, nginx, .env, backend, App, Landing, QA, ni se hizo commit/push/despliegue.

## Huellas SHA-256 del working tree backend leído

- `docs/openapi.json`: `0ec2eae0fa7413d2098ce14ad5408b824e16e3aef3ec36a7910988c563536e52`.
- `src/verification/verification.service.ts`: `70858d94a2e389a2d8b5ad26f7e4fa730586973add98f7e728f62faf4bed4037`.
- `src/verification/verification.dto.ts`: `105ee522fe5eca993c25cd0540b7c7a9ca824c061fb77df83513291404ccc1eb`.
- `src/verification/verification.responses.ts`: `683622b6bc4a32a910fde5aedad2e66bbacfe1d167c72b36a37bf6ef4ce92f7f`.
- `prisma/migrations/20261013000100_driver_verification/migration.sql`: `4f55ca24d4076982a020f285c9c35834104882dc93ec181957e27e75a9f47b80`.


## 2026-10-13 — Actualización W-01 (posterior al informe inicial)

Corregida la selección de B mientras A está cargándose: limpieza sólo de la generación enviada, mensajes asociados a A, B pendiente sin autoenvío y estado local ligado a actor/expediente. A/B con metadata idéntica quedan diferenciados por evento de selección, no por nombre. No se deshabilitó el selector. Cancelación no comunica éxito; archivos/preview siguen sólo en memoria. Reglas, API y reconciliación sin cambios.

Prueba previa falló reproduciendo W-01; resultado nuevo35/35 tests, tipos/lint/build y cinco verificaciones sintéticas de navegador. [Evidencia y handoff de repetición integrada](../VERIFICATION.md#2026-10-13--w-01-selección-posterior-durante-carga-documental). Este cierre Web no acredita una repetición contra backend real ni altera el informe backend/historial anterior.

## 2026-10-16 — Baja documental y constancias parciales

La afirmación histórica de ausencia de baja se sustituye, para este checkout, por
el módulo documentado en [DOCUMENT-DELETION-WEB](DOCUMENT-DELETION-WEB.md). No cambia
W-01 ni sus contratos de carga: las sustituciones no reabren expedientes bloqueados.
El nuevo módulo usa exclusivamente el contrato de eliminación implementado y
separa acuse, restricciones, constancia parcial y cierre operativo H.

Base Web 56c7bad, backend leído b300c250 más cambios locales, huellas nuevas
separadas en deletion-backend-contract.json; no se reinterpretan las huellas ni
pruebas históricas de este informe. [Validación actual](../VERIFICATION.md) con
fixtures y Chromium; integración real, acceso mínimo tras `/auth/me` restringido
y drenaje real de Spaces siguen sujetos a los límites explícitos del informe.

## 2026-10-17 — Correcciones de compatibilidad de baja

La proyección mínima de sesión ya permite conservar identidad restringida; el GET
administrativo de recibos permite recuperación después de recargar sin repetir
comandos. Las afirmaciones anteriores de ausencia de esos contratos son históricas.
No se amplían roles, autorización documental ni asignaciones. Cancelación y
assisted-access permanecen fuera del nuevo GET. W-01 y carga de evidencias no se
modifican en esta adaptación.

[Informe actual](DOCUMENT-DELETION-COMPATIBILITY-WEB.md): dos recorridos Web con
backend real aislado aprobados, fuentes/artefactos identificados por hash, datos
sintéticos conservados y servicios temporales detenidos. No acredita entrega real
de un servicio comprometido, eliminación remota de Spaces ni producción.

## Revisión para publicación — 2026-10-17

El estado vigente de sesión restringida, entrega LEGACY y recibo realmente depurado está acreditado en [compatibilidad](DOCUMENT-DELETION-COMPATIBILITY-WEB.md) y sus evidencias. Los bloqueos y procedimientos fechados de este documento se conservan como historia, no sustituyen al contrato actual. Constancias parciales, drenaje real de Spaces pendiente; sin garantía de eliminación total ni aptitud productiva.

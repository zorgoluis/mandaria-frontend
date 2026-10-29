> Actualización posterior del 2026-10-28: el contrato backend ya existe y se integró el alcance disponible. Ver [implementación y límites](DRIVER-CATEGORY-EXCLUSIVITY-WEB.md). El análisis inferior se conserva como historia, no describe el estado actual.

# Categorías excluyentes de conductor: impacto Web y bloqueo contractual

Fecha: 2026-10-28, America/Mexico_City. Estado: análisis documental completado; implementación e integración HTTP bloqueadas por falta de contrato backend revisado. Este documento no define DTO, estados técnicos, errores ni endpoints nuevos.

## Alcance y evidencia de revisión

Se aplicó el Prompt 2 del adjunto «Repartidor de flotilla o independiente: categorías excluyentes». Backend/Android sólo lectura, sin mensajes a otros agentes. Web encontrada en main, HEAD ffb07b1 (árbol inicialmente limpio), no en la QA histórica de la conversación. No se cambió rama ni versión.

Leídos README, BITACORA y VERIFICATION Web; no AGENTS.md local encontrado. Consultados continuidad backend, AGENTS.md, docs/openapi.json, contratos FLEET/salida, fuentes de aprobación y superficies Web indicadas. OpenAPI consultado declara info.version=1.13.3; esa versión no acredita disponibilidad de la ampliación. La búsqueda en docs/src/prisma backend de categorías excluyentes y conflictos de categoría no localizó el contrato revisado. No se inspeccionó .env ni se consultaron datos operativos. Git backend negó lectura dentro del sandbox; no se obtuvo ni se afirma su HEAD. Las conclusiones se apoyan en archivos legibles, no en una rama backend inferida.

Hallazgos concretos que impiden consumir el contrato solicitado:

| Fuente actual | Regla/campo observado | Consecuencia |
| --- | --- | --- |
| Backend docs/FLEET-DIRECT-TAKE-CONTRACT.md, F4 y PUT /driver/offer-mode | receptionMode NONE/FLEET/INDEPENDENT es preferencia global; usuarios no inscritos conservan comportamiento histórico | No representa exclusión de pertenencia; no reutilizarlo como categoría |
| Backend src/independent-drivers/independent-drivers.service.ts, approve/eligibleDriver | Aprobación crea/reactiva APPROVED; eligibleDriver valida cuenta/rol/estado, sin consultar afiliación en esa función | El flujo actual no acredita bloqueo contractual de ACTIVE/EXIT_PENDING; if Web no garantiza integridad ni carreras |
| Backend docs/FLEET-EXIT-INDEPENDENT-TRANSITION-HANDOFF.md | independent.profileState/canOperate/reasons son elegibilidad; affiliation y exit son dimensiones separadas | No identifica por sí solo pertenencia independiente vigente frente a perfil histórico |
| Web src/independent-drivers/pages.tsx, formulario de habilitación | Selecciona proveedor y luego conductor, permite enable; detalle ofrece reaprobar según status | Flujo a sustituir cuando exista lectura canónica; hoy induce capacidad adicional sobre conductor de proveedor |
| Web src/independent-drivers/types.ts | Perfil con status y driver.providerId, descrito como capacidad adicional | APPROVED/SUSPENDED/REJECTED no pueden convertirse en categoría por deducción |
| Web src/driver-portal/format.ts, portalBlock y types.ts | Presentación basada en perfil/status; canTakeServices para toma | No acredita categoría vigente y puede confundir historial con habilitación |

El parámetro category encontrado en respuestas existentes de paquetes no es categoría operativa del conductor. No se reutiliza. No se encontró cliente Web de PUT /driver/offer-mode en src; no hay selector Web de modalidad que retirar en esta revisión. La política del proveedor sí existe y se conserva.

## Regla objetivo aceptada, sin implementación simulada

Una afiliación ACTIVE o EXIT_PENDING conserva pertenencia a una única flotilla e impide pertenencia independiente vigente. Independiente vigente impide incorporarse a flotilla, aun suspendido. La salida COMPLETED/afiliación ENDED permite evaluar una habilitación posterior, nunca la concede. Sin vinculación es posible, no sinónimo de independiente. Perfil histórico, aprobación, restricciones, disponibilidad, zonas y recepción deben mostrarse separados de categoría.

Sin contrato de baja independiente no habrá botón de conversión ni secuencia suspend→incorporar. Tampoco borrar perfiles, aprobar automáticamente, elegir categoría por prioridad FLEET, inferirla por providerId=null ni resolver usuarios duales automáticamente. El responsable backend debe definir actor y resolución auditable de ambigüedad; Web sólo podrá consumir facultades explícitas.

## Archivos y recorridos a adaptar tras el handoff

| Superficie existente | Archivos | Adaptación prevista |
| --- | --- | --- |
| Alta/detalle conductor e invitaciones | src/drivers/pages.tsx, service.ts; src/invitations/components.tsx, service.ts; src/logistics/types.ts | Categoría canónica y bloqueo de incorporación incompatible, incluidas invitaciones; revalidación al confirmar, errores públicos contratados |
| Perfil independiente | src/independent-drivers/pages.tsx, types.ts, service.ts, queries.ts, format.ts | Separar histórico de pertenencia; sustituir selector dependiente de proveedor; impedir habilitación con afiliación vigente, sin inferir baja por suspensión |
| Política/proveedor y despacho | src/fleet/gate.tsx, permissions.ts, resources.tsx, pages.tsx; src/dispatch/pages.tsx; src/delivery-assignments/queries.ts | Mantener ADMIN_DISPATCH/DRIVER_TAKE/PAUSED/DRAINING, capacidades y pagador; refrescar elegibilidad de recursos, sin reclasificar una asignación existente |
| Salida | src/fleet-exit/pages.tsx, types.ts, schemas.json, service.ts, commands.tsx, attempts.ts | Mantener START/RECHECK/recuperación y PENDING distinto de COMPLETED; mostrar paso posterior de categoría sólo según contrato; no exigir veto del dueño |
| Zonas | src/independent-zones/panel.tsx, service.ts, intent.ts | SUPER_ADMIN, profileId real, diferenciar autorizaciones históricas y vigentes; no conferir categoría ni recepción mediante PUT |
| Portal DRIVER | src/driver-portal/pages.tsx, types.ts, format.ts, service.ts, queries.ts | Categoría informativa, requisitos/recepción separados; nuevas tomas denegadas según servidor sin bloquear ejecución, RELEASE ni historial autorizados |
| Errores/pruebas | src/services/errors.ts; src/test/independent-drivers-api.test.ts, independent-zones*.test.*, fleet*.test.*, driver-portal.test.tsx, invitations*.test.* | Traducir sólo códigos publicados; casos con contrato nuevo y pruebas de respuestas tardías/aislamiento |

## Rutas actuales que deben conservarse y contrastarse

Todas las siguientes son rutas actuales con prefijo /api/v1; no se proponen rutas nuevas:

- GET/POST /admin/providers/:providerId/drivers y /provider/drivers (scope proveedor por query); PATCH del conductor sólo actualiza campos ya soportados. No inventar PATCH providerId ni usar creación para duplicar una identidad.
- GET/POST /admin/drivers/:driverId/independent; POST .../independent/suspend y .../independent/reject. El contrato nuevo deberá precisar categorías admitidas y conflictos antes de adaptar estas operaciones.
- GET/PUT /admin/independent-drivers/:profileId/offer-zones: revision string, zoneIds; PUT requestId/expectedRevision/zoneIds/reason en body. Mantener intención durable por actor/entorno/perfil y replay idéntico. No usar recuperación de salida para zonas.
- GET /admin/drivers/:driverId/fleet-affiliation-context y /provider/drivers/:driverId/fleet-affiliation-context: proveedor no recibe independent. Mantener privacidad histórica tras ENDED.
- GET /driver/me y /driver/dispatches/:dispatchId; POST .../take, .../release y .../deliver según facultades actuales. Una categoría bloqueada no debe ocultar por sí sola la ejecución autorizada de ACTIVE.

No hay correspondencia nueva de DTO por cerrar en Web: faltan nombres, enums, revisiones, capacidades por rol y códigos públicos. No introducir campos candidatos como si estuvieran soportados. El contrato debe especificar qué lectura sirve al SUPER_ADMIN al buscar conductores sin flotilla; el catálogo actual filtrado por proveedor no basta.

## Concurrencia, caché y recuperación previstas

La garantía bidireccional debe ser transaccional y persistida en backend. Una lectura Web previa puede orientar, pero nunca asegura que una afiliación o aprobación concurrente no cambie. Al confirmar, usar revisión/capacidad del nuevo protocolo exacto, procesar conflicto y exigir revisión humana; no reintentar con identidad nueva ni sobrescribir a otro administrador.

Invalidar proyecciones de conductor, perfil, afiliación, zonas y ofertas después de cambios; descartar respuesta de cuenta/entorno/generación antigua. Revisiones deben mantener representación exacta, no Number. Refrescar foreground/reconexión y permisos antes de acciones. No conceder autoridad desde caché ni reaparecer ofertas por respuesta tardía. Mantener paginación y limpiar cursores incompatibles según contrato, sin inventar eventos socket; HTTP conserva recuperación aun sin socket.

Preservar intenciones de salida y zonas, body/clave/revisión, recibos, aislamiento, reauth y respuestas perdidas. El backend debe cerrar compatibilidad de intentos antiguos offer-mode (replay histórico, consulta/cierre, error de nuevas elecciones); Web no sustituye esos comandos ni borra incertidumbre. No cancelar servicios ni transferir vehículo, saldo, documentación, zonas, turnos o pagador para cambiar categoría. Asistencia, movementContext, declaraciones/disputas y GPS autorizado siguen ligados al servicio y permisos existentes.

## Matriz de aceptación pendiente

| Caso | Resultado exigido | Evidencia pendiente |
| --- | --- | --- |
| FLEET ACTIVE → habilitar independiente | Rechazo, ninguna doble pertenencia | UI + HTTP sintético |
| EXIT_PENDING → habilitar | Sigue FLEET; registro de salida no habilita | UI + HTTP |
| Salida COMPLETED/ENDED | Sin vinculación hasta habilitación expresa; recepción parada | UI + HTTP |
| Independiente aprobado/suspendido → flotilla | Ambos rechazan mientras conserve categoría | API alta/invitación + UI |
| Perfil ausente/rechazado/histórico | Actuar por categoría canónica, no por status aislado | Matriz DTO + HTTP |
| Dual preexistente ambiguo | Bloqueo nuevas operaciones incompatibles, recuperación conservada | Fixture legítimo backend y UI |
| Alta independiente y afiliación concurrentes | A lo sumo una pertenencia vigente | Dos identidades/sesiones HTTP, integridad backend |
| Cambio desde otro dispositivo / TAKE tardío | Rechazo coherente, no restaurar autoridad ni oferta vieja | HTTP + UI |
| Respuesta perdida / replay de modo anterior | Mismo body/clave, recibo sin reaplicar conversión | Contrato compatibilidad + HTTP |
| SUPER_ADMIN / OWNER / ADMIN / DRIVER | Aprobación/zonas sólo SUPER_ADMIN; salida voluntaria sin veto | HTTP 401/403 y privacidad |
| Categoría bloqueada con ACTIVE | Ejecución/RELEASE/asistencia/historial autorizados disponibles | Regresión HTTP y UI |
| Zonas/recursos/recepción | Sin herencia, autoaprobación ni inicio de turno | UI + HTTP |
| Logout/reauth/errores/flag OFF | No mostrar caché como autorización, preservar intención propia | Unitarias y HTTP separados |

## Handoff preparado para Driver y desbloqueo

Documento para lectura del responsable Driver, sin mensajes enviados. Compartir futuro identificador de versión/esquema y lectura canónica con Web; no deducir categoría desde providerId ni desde APPROVED. Conservar intentos antiguos y retirar nuevas elecciones sólo conforme a la compatibilidad publicada. No hay correlaciones sintéticas nuevas porque no se creó ningún usuario/servicio para este encargo; MDR-000001 y sus muestras pertenecen a evidencia histórica, no a la matriz de exclusión.

Requisitos pendientes concretos: (1) contrato/handoff revisado que sustituya F4; (2) exclusión bidireccional y garantía de carrera implementadas en backend; (3) lectura canónica y catálogo de sujetos sin flotilla; (4) baja independiente o rechazo explícito mientras no exista; (5) protocolo para registros duales; (6) errores/revisiones/invalidación y recuperación de modo antiguo; (7) entorno HTTP local sintético compatible. El cierre de esos requisitos permitirá implementar y ejecutar la matriz sin inventar soluciones.

## Validación de esta entrega

Sólo inspección de fuentes/contratos, revisión documental y git diff --check. No pruebas funcionales, mocks nuevos, HTTP, build, tipos o lint ejecutados: no hubo cambio de código y aún no existe el contrato de la ampliación. Resultados anteriores en continuidad son históricos. Ningún backend/Android, configuración, dependencia, versión, cuenta/dato real, Docker, FCM, commit/push o despliegue modificado. No se declara aceptación conjunta ni implementación de exclusión Web.

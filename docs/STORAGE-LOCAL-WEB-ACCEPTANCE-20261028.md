# Alta documental original por Web — LOCAL_TEST

## Actualización: correctivo autorizado y aprobado — 28oct22:23 México

**PASS del alcance local de aprobación correctiva y conservación.** El usuario autorizó expresamente retirar el expediente desactualizado y crear otro para la misma motocicleta, ampliando la restricción anterior. El resultado parcial y los bloqueos de las secciones inferiores quedan como historia, sin borrar sus evidencias.

- Anterior: **59d9cf1d-bad3-4377-962c-e9e4937fb76a**, SUBMITTED/revisión7 → **WITHDRAWN/revisión8**, conserva sus dos adjuntos VALIDATED e historial consultable.
- Correctivo real: **9864ae95-25d7-49d9-84b7-5a6a573b5ea7**, creado por el botón Preparar nueva corrección para el mismo resourceId; DRAFT/revisión1 → datos/revisión2 → dos cargas nuevas validadas/revisión6 → SUBMITTED/revisión7 → **APPROVED/revisión8**. Aprobación alrededor de2026-10-29T04:21:40Z (28oct22:21 México).
- Misma motocicleta **6a072e1f-c9ae-446a-b31b-c592427aa721**, MOTORCYCLE, WEB-SYNTH-9003210835, placa **SYN-WEB-01**, ahora **ACTIVE** como efecto de la decisión documental. No se envió PATCH de activación ni se volvió a editar la unidad.
- Mismos Driver6d5019e0-4f3e-48af-9801-33107ae08daf y perfil02b893dd-c45c-4c1f-ba25-aa883e75ba94. Identidad/licencia **e8a1cae1-5966-40ea-b79e-2e855249c68c APPROVED/revisión14** intacta. Categoría INDEPENDENT, provider:null, membership CURRENT, perfil APPROVED.
- Disponibilidad **OFFLINE**, créditos **0**, allowedZones:[], selectedZoneId:null, shift:null. Recepción **OFF / RECEPTION_DISABLED**, canAttemptTake:false, revisión2. El cambio de proyección desde DOCUMENTARY_REQUIREMENTS no es activación de recepción ni READY.

Recorrido principal por UI/HTTP real: relectura de pertenencia y placa; retirada confirmada del expediente anterior con revisión/clave; creación del correctivo y registro inmediato de su ID auténtico; datos de titular/serie sintéticos; nuevas cargas de tarjeta de circulación y propiedad (POST→PUT octet-stream a URL devuelta→complete→GET VALIDATED); comprobación de placa antes de presentar; presentación DRIVER; sesión separada SUPER_ADMIN, visualización autenticada de ambas imágenes/checklist y decisión explícita LOCAL_TEST. Nuevos IDs de adjuntos distintos de los anteriores, sin traslado inventado. No se editó snapshot ni se recreó conductor/vehículo. Relación anterior/correctivo documentada aquí, no enviada como un campo API inexistente.

Prueba negativa directa del harness, separada de UI: DRIVER intentó la decisión administrativa del correctivo →403, sin efecto. Las proyecciones finales de cuenta/créditos/recepción también se contrastaron por llamadas GET autenticadas directas desde el cliente y pantallas posteriores; no se presentan esas llamadas como taps. Documentos son marcadores sintéticos sin validez, no evidencia de identidad/titularidad reales.

Comandos nuevos: node scripts/verify-storage-web.mjs corrective (mutaciones UI aplicadas, luego exit1 por espera de lectura), corrective-final (pasada final exit0); node --check scripts/verify-storage-web.mjs y git diff --check exit0. Aserciones independientes sobre respuestas completas: PASS de estados, revisiones, recursos/placa, adjuntos nuevos/histórico, cuenta, zonas y turno. Sin cambios nuevos de producto: se amplió sólo el harness/evidencia/continuidad;15 pruebas focalizadas/tipos/lint/build del turno anterior son históricos, no reejecutados ni PASS global nuevo.

Fallos del harness conservados: filtro inicial confundió HTML de Vite con API (falló antes de mutar; se restringió al origen/ruta exactos); tras aprobación, espera de GET del vehículo atendido por caché terminó en timeout (se corrigió forzando relectura); siguiente sesión recibió429 auth/refresh por recargas acumuladas, se respetó la ventana contractual20/minuto y se completaron sólo lecturas. Ninguna retirada/creación/aprobación se repitió. El correctivo guardado bloquea repetir la etapa mutadora.

Evidencia nueva en [directorio](evidence/storage-web-20261028/): corrective.json conserva la ejecución y el fallo posterior; corrective-harness-origin-failure.json y corrective-final-rate-limit.json conservan fallos; [corrective-final.json](evidence/storage-web-20261028/corrective-final.json), [corrective-checks.json](evidence/storage-web-20261028/corrective-checks.json) y corrective-projections.json acreditan cierre. Capturas corrective-old-withdrawn, corrective-created, corrective-validated, corrective-submitted, corrective-review-0/1, corrective-approved-admin/driver, corrective-final-history/approved/credits/reception. Revisada visualmente la captura final aprobada. Badge visual V1.10 del devserver no sustituye versión package1.11.0, sin modificación.

Backend compartido intacto; sólo status/lecturas y APIs autorizadas. Navegadores/Vite propios cerrados; cero comandos sobre MDR-000001/2/3, Carlos o Coita; sin recepción/FCM/GPS, Docker, versión, commit/push/deploy. Concluye este correctivo LOCAL_TEST; no acredita Spaces productivo ni recepción operativa.


Resultado parcial: identidad/licencia aprobadas; motocicleta original con documentos validados y presentada, pero aprobación bloqueada por `VERIFICATION_MATERIAL_CHANGED`. No PASS global. Almacenamiento privado local funciona por UI/HTTP real. No prueba Spaces, documentos reales, antimalware ni producción.

## Entorno y conservación

Backend1.13.5/b799308, API37795, almacenamiento45431, Web4270. Antes de cada etapa: supervisor sólo status, comparación del manifiesto y comprobación HTTP anónimo401/API y405/almacenamiento. Sin restart, verify, offer, flags, SQL, Docker o cambios de backend/móvil. Chromium y Vite propios cerrados al terminar cada etapa. Servicios MDR-000001/2/3, Carlos, Coita y recepción no modificados. Web1.11.0 y cambios previos conservados.

Solicitante original `web.acceptance.1793233930835@example.test`; credenciales recuperadas en memoria mediante el mismo procedimiento privado anterior, sin reset. Driver `6d5019e0-4f3e-48af-9801-33107ae08daf`, perfil `02b893dd-c45c-4c1f-ba25-aa883e75ba94`. Motocicleta original `6a072e1f-c9ae-446a-b31b-c592427aa721`, identificador `WEB-SYNTH-9003210835`. Nunca se sustituyó por bicicleta ni se creó otro vehículo/expediente.

## Recuperación y cargas

Inicial: identidad `e8a1cae1-5966-40ea-b79e-2e855249c68c` DRAFT/revisión3, FACE_PHOTO `8ab909fd-c1c9-4bb2-a03b-f4f66610a294` CREATED; vehículo `59d9cf1d-bad3-4377-962c-e9e4937fb76a` DRAFT/revisión2. Lecturas desde la cuenta original, ámbito independiente/providerId:null.

El navegador efímero del harness anterior no había conservado el marcador. Se informó esa limitación; el usuario aportó la clave original `984f090c-7dbe-4fff-a86c-05f72c02b7ca`. Se restauró sólo el marcador técnico con actor autenticado, operación CREATE_UPLOAD y expediente; no se reconstruyó/reenvió el cuerpo ni la URL vencida. Botón **Consultar intento** → GET verification-command-attempts de la clave → comprobante APPLIED, contrastado con expediente. Botón **Retirar referencia del borrador** → DELETE autorizado con revisión actual/clave propia → REMOVED. El adjunto histórico sigue visible, no fue borrado ni marcado VALIDATED.

Seis imágenes nuevas claramente rotuladas PRUEBA SINTÉTICA / SIN VALIDEZ OFICIAL: FACE_PHOTO, INE_FRONT, INE_BACK, LICENSE y las dos categorías requeridas de motocicleta (tarjeta de circulación y propiedad). Todas atravesaron creación → PUT real a URL devuelta, octet-stream → complete → GET VALIDATED. Las imágenes son marcadores de prueba, no reproducciones de documentos oficiales ni prueba de titularidad real. DRIVER y SUPER_ADMIN visualizaron cada imagen normalizada por POST de acceso autenticado; las capturas muestran el contexto LOCAL_TEST.

## Presentación, permisos y decisiones

DRIVER presentó los mismos expedientes: identidad SUBMITTED/revisión13 y motocicleta SUBMITTED/revisión7. UI oculta edición y decisión administrativa al solicitante. Pruebas negativas **directas del harness, no pasos UI**: POST decisión como DRIVER403; PATCH expediente presentado409 VERIFICATION_CASE_NOT_DRAFT, revisión sin cambios; POST acceso a imagen sin autenticación401. Separadas de los flujos de pantalla.

SUPER_ADMIN abrió los mismos expedientes, visualizó evidencias/checklist LOCAL-TEST-1 y registró decisión explícita con motivo de ensayo sintético. Identidad APPROVED/revisión14 a `2026-10-29T04:04:32.169Z` (28oct22:04 México). Licencia declarada: emisor sintético, categoría PRUEBA, tipo MOTORCYCLE, `licenseValidUntil:2027-10-28T18:00:00.000Z`. Comprobaciones del checklist se ejercieron como simulación autorizada LOCAL_TEST; no acreditan concordancia de una identidad real.

### Bloqueo de la motocicleta

1. POST `/api/v1/admin/verification-cases/59d9cf1d-bad3-4377-962c-e9e4937fb76a/decision` a04:04:34.261Z →409 `VERIFICATION_PLATE_REQUIRED`. La motocicleta original tenía plate:null; el alta permitía omitirla, pero la aprobación motorizada la exige.
2. Se añadió **Editar placa** en los vehículos propios SUPER_ADMIN. UI real PATCH `/api/v1/admin/drivers/6d5019e0-4f3e-48af-9801-33107ae08daf/independent/vehicles/6a072e1f-c9ae-446a-b31b-c592427aa721` con sólo `{plate:"SYN-WEB-01"}` →200 a04:06:14.070Z. No cambió identidad, tipo, pertenencia ni estado.
3. Relectura/revisión y nueva decisión explícita →409 **VERIFICATION_MATERIAL_CHANGED** a04:06:33.874Z. Expediente aún SUBMITTED/revisión7, vehículo INACTIVE. No se repitió una mutación incierta: ambos rechazos409 fueron respuestas completas.

Fuentes backend leídas, sin modificación: verification.service.ts compara materialSnapshot con material actual antes de decidir (aprox.1877), y exige placa motorizada (aprox.1908). El snapshot se fija al presentar (aprox.1790). Actualizar la placa después de presentar explica el nuevo conflicto. No existe en los contratos revisados una edición del snapshot ni reapertura del mismo expediente SUBMITTED. Retirarlo y crear una corrección cambiaría el expediente, expresamente fuera del alcance solicitado. No se retiró ni rechazó el expediente pendiente, ni se revirtió placa para eludir controles. Se entrega este bloqueo al usuario para resolución contractual/autorización posterior; no se enviaron mensajes automáticos.

## Estado operativo final — 22:08 México

- Driver ACTIVE, categoría INDEPENDENT/revisión2, membership CURRENT, perfil APPROVED; identidad APPROVED sin bloqueos propios.
- Motocicleta MOTORCYCLE/INACTIVE, placa SYN-WEB-01; expediente SUBMITTED/revisión7, estado documental UNDER_REVIEW.
- Cuenta de créditos creada por la aprobación: saldo0. Disponibilidad OFFLINE, sin asignación activa.
- Recepción PAUSED, reason DOCUMENTARY_REQUIREMENTS, canAttemptTake:false, allowedZones:[], selectedZoneId:null, shift:null. El canTakeServices:true genérico del perfil no acredita recepción elegible.

## Archivos y verificación nueva

- `src/independent-drivers/pages.tsx`: edición limitada de placa, normalización/patrón idéntico al DTO, PATCH sólo plate, refresco posterior, aviso sobre expedientes presentados. Acceso bajo la ruta SUPER_ADMIN existente; no cambia permisos ni aprobación/activación.
- `src/test/independent-vehicle-plate.test.tsx`: conserva IDs/cuerpo limitado, refresco sin activar y error sin falso éxito.
- `scripts/verify-storage-web.mjs`: etapas UI reales, credenciales sólo en memoria, marcador técnico conservado en test-results, logs sin JWT/URLs firmadas, relecturas y comprobaciones negativas explícitas.
- Evidencia: [directorio](evidence/storage-web-20261028/). Capturas iniciales, recuperación, retirada, documentos validados, previews DRIVER/SA, SUBMITTED, identidad aprobada, placa y proyecciones finales. JSON por etapa incluye timestamps/rutas/status/revisiones.

Comandos `node scripts/verify-storage-web.mjs <etapa>`: inspect, vehicle-upload, recover-identity, identity-upload, submit, review, negative, plate, final →exit0. approve →identidad aplicada, vehículo409 PLATE_REQUIRED; approve-vehicle →409 MATERIAL_CHANGED, ambos exit1 conservados. No volver a ejecutar etapas mutadoras sin revisar el estado vivo.

Fallos del harness conservados: presentación prematura antes de finalizar cargas; espera de CREATE_UPLOAD sin resolver con marcador de retirada pendiente (se consultó por GET original, sin repetir DELETE); primer chequeo anónimo usó GET incorrecto404, corregido al POST contractual401. El cierre abrupto de esa primera espera no produjo un informe identity-upload; la corrida posterior y reconciliación están registradas. No se cuentan fallos como PASS.

Pruebas focalizadas `npx vitest run src/test/independent-vehicle-plate.test.tsx src/test/independent-drivers-api.test.ts`:15/15,2 archivos,0 omitidas. Primer intento sandbox ENOENT temporal; segundo falló una expectativa del mensaje de error (ActionForm muestra mensaje seguro genérico); corregida y pasada final conservada. `npm run build` exit0 (incluye tipos producto; aviso chunk>500kB), `npm run typecheck:test` exit0, sintaxis harness exit0. `npm run lint` sin exclusiones: exit1,824 errores en copias backend históricas bajo test-results (lint.txt); la primera ejecución sandbox se interrumpió sin resultado. `npm run lint -- --ignore-pattern 'test-results/**'`: exit0 (lint-web.txt), abarca producto y tests Web sin modificar reglas ni copias ajenas. `git diff --check`: exit0. No nueva suite global:1633/8 simuladas siguen históricas. Sin versión/commit/push/publicación/despliegue.

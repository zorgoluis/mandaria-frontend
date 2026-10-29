# Aceptación Web contra backend compartido — 2026-10-28

## Actualización final del recorrido conjunto — 19:29 México

Observación nueva mediante Chromium/Web real como SUPER_ADMIN, comando `node scripts/verify-independent-live.mjs joint-final` exit0. Status y manifiesto comprobados; sólo lecturas administrativas además de login/refresh. No comandos por Carlos. Consultas HTTP200 a2026-10-29T01:29:05–07Z (28oct19:29 México):

- MDR-000001 / MQ-000001, dispatch `4daacb2e-8904-4113-8cc2-88f247d1863e`: **DELIVERED**, claimMode INDEPENDENT, Carlos, activeAssignment:null. deliveredAt `2026-10-29T01:23:13.111Z` (19:23:13 México).
- Asignación `abdbca5b-7c75-4a42-9182-5acbbc9f0225`: **COMPLETED**, endedAt igual a deliveredAt. Historial completo: una asignación. Ejecución revisión7, custodia DELIVERED, sin incidente abierto ni acciones permitidas; siete eventos (asignación, cinco avances, entrega) atribuidos a DRIVER/SELF_REPORT. Es observación posterior del historial, no captura en vivo de cada tap Android.
- Cuenta de créditos de Carlos: **95**. Libro completo `total:2,totalPages:1,page:1` con recarga sintética inicial100 y **un único SERVICE_AWARD de -5**, referencia DISPATCH al UUID anterior. Movimiento `e878e804-7232-449e-9c9b-9ab8b596a271`, creado `2026-10-29T01:01:45.073Z`, saldo100→95. **Cero SERVICE_REFUND** en todo el libro consultado. La ausencia de reembolso se acredita al instante de consulta; no se deduce sólo del saldo ni de la política congelada.

Evidencia: [comprobaciones](evidence/independents-live-20261028/joint-final-checks.json), [traza HTTP](evidence/independents-live-20261028/joint-final.json), proyecciones sanitizadas `joint-final-projections-*.json`, capturas/textos `joint-final-service-*` y `joint-final-credits-*` en el mismo directorio. Las comprobaciones locales sobre estas respuestas validaron estado, asignación, totalidad de paginación, único cargo, importes, ausencia de reembolso y ejecución (exit0); sintaxis del harness exit0.

Queda acreditada la observación Web solicitada de servicio/asignación finales y cargo único sin reembolso. No prueba por sí sola cobro físico de60MXN, UI Android ni aceptación completa de onboarding: el bloqueo STORAGE_UNAVAILABLE y el recorrido separado de Pedro permanecen pendientes. El status CREATED anidado en deliveryRequest no se interpreta como estado logístico: el despacho es DELIVERED. Texto administrativo legacy aún menciona proveedor en algunas etiquetas, aunque la asignación muestra Independiente/Carlos. Sin cambio de producto, versión, backend/móvil, commit/push ni despliegue.

Estado: **aceptación parcial; Web preparado para observar el despacho conjunto**. Registro documental bloqueado por almacenamiento del servidor. Sin referencias de despacho conjunto recibidas; no se creó ni tomó ningún servicio. Web1.11.0/main conservados, sin commit, push o despliegue. Las1633 unitarias/8 escenarios simulados anteriores son históricos y no sustituyen esta ejecución.

## Entorno y método

Antes de cada etapa se ejecutó sólo `independent-interactive.mjs status` en WSL Mandaria-Postgres y se comparó el manifiesto vivo con la evidencia publicada. Ready true, backend1.13.5, fuentes b799308315f87cd94ef2051de5eea18e28b3bcd0, build SHA256 5fa6715996fc858ea42e5f868d16ed0f3a4a0e3ab5efb148d2ba731836c11bc7,66 migraciones; FCM/flotilla apagados. API http://127.0.0.1:37795/api/v1; GET driver/me anónimo401. PostgreSQL sintético compartido, sin reinicio/resembrado/verify/offer.

`scripts/verify-independent-live.mjs` inicia Vite4270 con envDir:false/configFile:false y VITE_API_URL explícito al origen37795 (el cliente añade /api/v1). Chromium usa UI y HTTP reales, sin page.route ni respuestas sustituidas. Cada etapa cierra sólo su Chromium/Vite. No queda un navegador de observación permanente abierto. Los comandos mutadores ya ejecutados tienen guarda contra repetición; no borrar su evidencia para volver a ejecutarlos.

Credenciales sa/Pedro filtradas privadamente desde WSL a memoria; confirmación por outbox local. Contraseña de la identidad nueva derivada en memoria, nunca escrita. Logs guardan hora UTC/método/ruta/status/código, sin headers, cuerpos de autenticación ni tokens. `test-results/independent-live-registration.json` conserva sólo correlaciones sintéticas de continuidad. Las fechas UTC del29 corresponden a la tarde del28 en México.

## Ejecuciones nuevas

Evidencia y capturas: [directorio](evidence/independents-live-20261028/).

| Comando | Resultado real |
| --- | --- |
| node scripts/verify-independent-live.mjs roles | Exit0; login sa/Pedro, NONE canónico y perfil404 sin crear perfil; lecturas PENDING/suspendido sembrados; vehículo/créditos/zonas propios; DRIVER bloqueado en ruta administrativa. Pedro seleccionó zona, AVAILABLE y START por UI, READY; feed vacío actualizado por poll15s. SUPER_ADMIN abrió despachos vacíos. |
| node scripts/verify-independent-live.mjs register | Exit0; solicitud pública nueva, CHECK_EMAIL, outbox local. |
| node scripts/verify-independent-live.mjs inspect-registration | Exit0; localización del correo sin imprimir token. |
| node scripts/verify-independent-live.mjs confirm | Exit0; confirmación UI, login de identidad nueva, aceptación explícita de términos locales HTTP200. |
| node scripts/verify-independent-live.mjs identity | Exit0; expediente nuevo y datos de identidad/licencia sintéticos guardados por UI. |
| node scripts/verify-independent-live.mjs upload-identity | Exit1; creación de carga503 STORAGE_UNAVAILABLE; el harness esperó complete y agotó30s. No fue timeout de TAKE ni evidencia de recuperación operativa. |
| node scripts/verify-independent-live.mjs vehicle | Exit0; relectura del borrador, motocicleta propia nueva HTTP201, expediente y datos de titularidad sintéticos; SUPER_ADMIN inspeccionó identidad DRAFT por UI. Sin aprobar. |

`node --check scripts/verify-independent-live.mjs` y `git diff --check`: exit0; avisos LF/CRLF. No cambios de producto nuevos en esta aceptación, ni nueva corrida global/tipos/lint/build. Se preservan cambios anteriores de producto y documentación.

## Bloqueo reproducido y correlaciones

Identidad pública nueva: web.acceptance.1793233930835@example.test, solicitada2026-10-29T00:32:10.835Z; confirmada00:35:47.492Z. Expediente identidad **e8a1cae1-5966-40ea-b79e-2e855249c68c**. Expediente vehículo **59d9cf1d-bad3-4377-962c-e9e4937fb76a**; vehículo creado00:38:09.518Z.

Repro: login de la identidad nueva → expediente identidad → categoría fotografía de rostro → imagen PNG marcada PRUEBA SINTÉTICA/SIN VALIDEZ → Cargar imagen sintética. A00:37:04.884Z, POST `/api/v1/verification-cases/e8a1cae1-5966-40ea-b79e-2e855249c68c/uploads` → **503 STORAGE_UNAVAILABLE**. No PUT del archivo ni complete. Relectura muestra revisión3 y fotografía con **Carga incompleta**: el503 no prueba ausencia de efectos. No se repitió la intención, retiró adjunto ni aprobó por SQL. Capturas12 y15 conservan el estado posterior; upload-identity.json conserva el error HTTP y el fallo del harness.

Lectura de fuentes backend: verification.service.ts crea el adjunto/permiso antes de solicitar storage.uploadUrl y convierte el fallo de firmado en503 (líneas1490–1529). Esto es compatible con la carga incompleta observada; no acredita la causa interna exacta. El responsable backend debe revisar el adaptador local de almacenamiento y la emisión de URL de carga. No se modificó backend. Una corrección requiere reconciliar la referencia existente antes de intentar otra carga. No completar ni decidir un expediente sin evidencias válidas.

## Preparación versus aceptación pendiente

- Pedro y Carlos, créditos, vehículos aprobados, zona y perfiles PENDING/suspendido/NONE eran fixtures backend. Sólo su lectura se acredita aquí; no son onboarding por UI. Pedro realizó SELECT_ZONE/AVAILABLE/START explícitos; no se actuó por Carlos. READY es la observación de esa hora y debe refrescarse ante expiración del turno.
- El alta nueva sí atravesó registro/correo/login/términos/identidad/licencia/vehículo por UI; imágenes, presentación y decisión administrativa siguen bloqueadas. La lectura SUPER_ADMIN de DRAFT no equivale a revisión aprobatoria.
- Feed vacío y poll HTTP comprobados. Segunda página real, recuperación por foco, error de feed y posterior recuperación siguen sin acreditarse; no se fabricó una colección ni se interceptó red para afirmarlo.
- Esperar referencias auténticas dispatchId/MDR/MQ del cliente sintético responsable. Abrir `/dispatches` y detalle autorizado como sa para observar Carlos, sin TAKE/hitos/cobro/completion en su nombre. No hay MDR/MQ que citar todavía. No tocar Coita.
- Después del recorrido conjunto, esperar otro servicio expresamente autorizado para Pedro y probar TAKE/RELEASE/timeout/recibo/cierre mediante UI, conservando identidad de intención. Nada de esto se ejecutó en esta aceptación.
- No Android/FCM/GPS, producción ni aceptación conjunta completa acreditados. No se enviaron mensajes automáticos; las referencias y el bloqueo se entregan al usuario.

## Despacho conjunto confirmado por Web — 2026-10-28 18:53 México

Referencias entregadas por el usuario y contrastadas en UI/HTTP SUPER_ADMIN: dispatchId `4daacb2e-8904-4113-8cc2-88f247d1863e`, **MDR-000001 / MQ-000001**. GET detalle y asignaciones HTTP200 a2026-10-29T00:53:06Z. UI Disponible, sin asignaciones; abrió18:50 y vence19:50 México. Envío60 MXN, mercancía800 MXN prepagada, costo independiente5 créditos mostrado como política, no cargo ejecutado.

GET ejecución detallada devuelve404 HTTP_404: no se acredita ejecución ni finalización. Web muestra ese error y conserva el despacho visible; texto legacy de asignaciones todavía menciona proveedor. Carlos READY/socket recuperado es información comunicada por el usuario, no prueba Android ejecutada por Web. Web no tomó/asignó ni emitió comandos operativos; sólo login/refresh y lecturas. Se cerró únicamente el navegador/Vite propios de la captura.

Comando `node scripts/verify-independent-live.mjs observe-joint` exit0, evidencia `docs/evidence/independents-live-20261028/observe-joint.json` y capturas/texto `joint-2026-10-29T00-53-*.{png,txt}`. Esta observación sustituye el pendiente de recibir referencias, no los pendientes de hitos/cobro/completion ni almacenamiento documental. Referencias listas para que el usuario las comparta con Driver; ningún mensaje automático enviado.

## Continuación documental del28 de octubre

Almacenamiento local probado por UI en los expedientes originales: identidad/licencia aprobadas; motocicleta bloqueada por VERIFICATION_MATERIAL_CHANGED después de completar placa faltante. [Detalle, pruebas nuevas y bloqueo](STORAGE-LOCAL-WEB-ACCEPTANCE-20261028.md). Esta entrada actualiza el bloqueo STORAGE_UNAVAILABLE histórico sin declarar aceptación completa.

## Correctivo documental aprobado

Autorización posterior permitió retirar el expediente desactualizado y aprobar el correctivo9864ae95-25d7-49d9-84b7-5a6a573b5ea7 de la misma motocicleta. Identidad conservada, unidad ACTIVE, recepción OFF. [Resultado nuevo y evidencia](STORAGE-LOCAL-WEB-ACCEPTANCE-20261028.md).

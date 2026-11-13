> Revisión posterior autorizada: versión Web1.11.0, contrato1.0.0; commit local en QA con evidencia HTTP conservada y build1.11.0 PASS. Las restricciones de no incrementar versión/no commit del registro original que sigue describen la entrega anterior. No hay push ni despliegue.

# Web — desvinculación de flotilla y transición independiente 1.0.0

Implementación local autorizada el 2026-10-24. Repositorio `C:/Users/zorgl/Documents/mandaria-frontend`, rama QA, base `829d012`. Sustituye el alcance exclusivamente documental del [diseño conservado](FLEET-EXIT-INDEPENDENT-TRANSITION-WEB-DESIGN.md). No acredita disponibilidad remota. START continúa apagado por defecto; sólo se habilitó en el proceso sintético local de prueba.

## Experiencias y archivos

- `src/fleet-exit/types.ts`, `schemas.json`, `validation.ts`, `service.ts`: cliente tipado, esquemas de respuestas derivados de OpenAPI local, validación estricta y revisiones decimales canónicas hasta 9223372036854775807 sin conversión a Number. Reutiliza el cliente JWT/no-store; POST sin reintento automático.
- `attempts.ts`, `commands.tsx`, `command-context.ts`: intención cifrada AES-GCM en IndexedDB, CryptoKey no exportable, exclusión de intención por cuenta/entorno/superficie/proveedor, inserción atómica, Web Locks, aviso entre pestañas y comprobación de correlación de respuesta.
- `pages.tsx`, `messages.ts`: afiliación, listado paginado, detalle histórico, avisos HTTP, confirmaciones y recuperación. Query keys incluyen identidad y scope; abort signal, desmontaje por scope, gcTime 0, sin datos anteriores tras error de autorización.
- `src/app/App.tsx`, `src/layouts/AdminLayout.tsx`: navegación separada `/fleet-exits[/:id]` y `/admin/fleet-exits[/:id]`. SUPER_ADMIN no tiene START, tampoco en el servicio tipado.
- `src/drivers/pages.tsx`: acceso desde la ficha del conductor con driverId/providerId autorizados. No cambia la baja del conductor existente.
- `src/deletion/pages.tsx`: acceso a `/privacy/fleet-exit-recovery`. La allowlist restringida sólo añade recuperación propia; no habilita la consola operativa.
- Pruebas `src/test/fleet-exit*`, expectativas de navegación en `flows.test.tsx`; harnesses nuevos `scripts/verify-fleet-exit-http.mjs` y `scripts/fleet-exit-http-wsl.mjs`. Los harnesses anteriores de asistencia se conservan.

PROVIDER_ADMIN selecciona proveedor explícitamente cuando tiene varias memberships. Lee contexto y confirma START sólo con capabilities vigentes; OWNER y ADMIN se validan en servidor. Una petición iniciada por DRIVER se informa sin aprobación ni veto. El detalle permite RECHECK autorizado; ningún botón force, cancelación ni revinculación. SUPER_ADMIN consulta contexto, salidas, avisos y RECHECK; enlaza asistencia/custodia sólo con referencia disponible y habilitación independiente por su recorrido existente.

## Estados y contrato aplicado

Afiliación ACTIVE/EXIT_PENDING; ENDED pertenece al historial, no se exige en el contexto actual. `affiliation:null` y `startedAt:null` son válidos. La petición es PENDING/COMPLETED. APPLIED acredita un comando y puede mantener exitStatus PENDING: se muestra «Solicitud registrada. La desvinculación sigue pendiente». La elegibilidad independiente es una dimensión distinta, exclusiva de administración en estas pantallas.

| Operación | Ruta relativa a /api/v1 | DTO / scope |
| --- | --- | --- |
| Contexto | GET /provider/drivers/:driverId/fleet-affiliation-context; GET /admin/drivers/:driverId/fleet-affiliation-context | providerId seleccionado en proveedor |
| START | POST /provider/fleet-affiliations/:affiliationId/exit-requests | Idempotency-Key UUID; expectedAffiliationRevision string, reasonCode PROVIDER_REMOVAL; query providerId |
| Listado/detalle | GET /{provider,admin}/fleet-exit-requests[/:exitId] | Listas: driverId/status/limit/pageToken, providerId según scope; 25 por defecto, máximo100 |
| RECHECK | POST /{provider,admin}/fleet-exit-requests/:exitId/recheck | Idempotency-Key UUID; expectedExitRevision string; providerId en proveedor |
| Avisos | GET /{provider,admin}/fleet-exit-notices | Esquema de filtros publicado; UI consulta por scope y cursor |
| Recuperar | GET /fleet-exit-attempts/:key | query operation/resourceType/resourceId, sin providerId |
| Cierre técnico | POST /fleet-exit-attempts/:key/close | mismo objeto en body, clave original en URL; sin nueva Idempotency-Key |

START usa START/AFFILIATION/affiliationId, aunque nunca se haya recibido exitId. RECHECK usa RECHECK/EXIT/exitId. Los recibos completos incluyen schemaVersion/receiptId/key/operation/resourceType/resourceId/appliedAt/status y exitId/exitRevision/exitStatus si APPLIED, o code/httpStatus si REJECTED. Un replay POST mínimo redacted:true/receipt:null es válido: se retiran paneles privados y no se reconstruye exitId. No se añaden requestId, force ni eventos socket.

Los pendientes económicos se muestran aparte de los bloqueos públicos; por sí solos no vetan la salida. Se conserva identidad, historial y responsabilidades. COMPLETED no liquida dinero, cancela servicios, aprueba perfiles, inicia recepción ni transfiere vehículo, documentación, créditos o zonas. Se enlaza asistencia por participación histórica, sin condicionar a Driver.providerId actual. El proveedor no consulta rutas administrativas ni dimensión independiente. Un 404 del contexto del exconductor no invalida el recibo: se consulta el exitId histórico autorizado. COMPLETED tiene ventana de consulta del proveedor de doce meses; no se interpreta como borrado.

## Recuperación y privacidad

Antes del primer POST se guarda operación, recurso, clave, ruta/query, body exacto, cuenta y entorno; ningún JWT. Fallo de almacenamiento impide enviar. Doble clic comparte la misma intención; otra pestaña no puede sobrescribirla. Recarga, timeout, 401/403/404 y logout no borran la intención. No hay reenvío al montar ni cambio automático de clave. Reconocer un resultado terminal elimina exclusivamente la intención de la misma clave mediante comprobación atómica.

UNKNOWN no significa ausencia de efectos: consulta, reenvío explícito con igual cuerpo/clave o cierre confirmado. PENDING técnico deshabilita consulta/cierre durante dos segundos y requiere nueva consulta manual, evitando polling ilimitado. APPLIED/REJECTED/CLOSED_NO_EFFECTS son terminales. Close no cancela salidas aplicadas. Un cierre UNKNOWN crea una barrera que rechaza un POST tardío con ATTEMPT_CLOSED.

La recuperación privada exige la misma identidad; con varios ámbitos guardados requiere selección. En cuenta restringida sólo ofrece GET de intentos propios existentes: sin START, RECHECK, replay ni cierre de UNKNOWN. La reautenticación real permanece en el cliente de sesión; esta UI no la suplanta. El cifrado protege el contenido en reposo, no sustituye la seguridad del origen frente a código malicioso ni garantiza recuperación si el usuario borra los datos del navegador.

Revisiones conflictivas y 503 conservan intención y refrescan contexto; no generan éxito ficticio. Se distinguen RESOURCE_NOT_FOUND y un 404 sin código contractual (ruta/recurso no disponible, disponibilidad no acreditada). 401 pide reautenticación; 403 y pérdida de membership retiran datos privados. Las respuestas de una pantalla desmontada no restauran capacidades. Los cursores ligados a actor/scope/filtros/autoridad se reinician explícitamente ante INVALID_CURSOR; asOf no congela estados. Avisos consultados al abrir/refocar y tras mutaciones, deduplicados por id; sin ACK, email ni socket.

## Fuentes y discrepancias resueltas

Consulta en sólo lectura del handoff, contrato, especificación técnica, implementación, matriz, `docs/checks/fleet-exit-implementation-verification.json`, OpenAPI/API_ACCESS, controller/DTO/schemas/service y suites contract/E2E backend. Los esquemas actuales resuelven dudas del diseño anterior: providerId también acompaña lecturas/comandos de proveedor; avisos usan querySchema; REJECTED incluye appliedAt; ACCOUNT_CLOSING conserva recuperación después de reauth. La habilitación de zonas utiliza las facultades existentes y permanece separada de la salida.

Backend local paquete1.13.0/migración65; 177 E2E, 765 unitarias y40 B2B son resultados previos del backend, no ejecuciones Web. Las fuentes runtime se contrastan Windows/WSL y recompilan en scratch; el reporte conserva huellas antes/después. No se usa OpenAPI como prueba de activación remota.

## Matriz de verificación y límites

| Riesgo | Prueba Web con dobles | HTTP local real |
| --- | --- | --- |
| OWNER/ADMIN, selección, roles y SUPER_ADMIN sin START | componentes/cliente | roles y memberships sintéticas, selección múltiple, RECHECK admin |
| Solicitud voluntaria sin veto, affiliation:null, fecha nullable | componentes y esquema | salida pendiente con servicio y COMPLETED sin servicio |
| APPLIED PENDING frente a completado | componentes | respuesta perdida tras commit, recarga, consulta por affiliationId |
| Persistencia, doble clic, dos pestañas | doble clic, fallo de almacenamiento, cifrado/correlación | IndexedDB real, dos pestañas, misma intención |
| UNKNOWN y cierre tardío | START/RECHECK, cierre del recurso original | START UNKNOWN, CLOSED_NO_EFFECTS, POST tardío409 |
| Redacción, membership, cuenta/proveedor | cliente, replay mínimo, desmontaje | membership revocada, resultado redactado, cambio de cuenta/proveedor |
| Cursor, avisos, revisiones | INVALID_CURSOR, deduplicación/refoco, strings grandes | lecturas/avisos reales durante comandos |
| 400/401/403/404/409/503 y API ausente | cliente/componentes | flag OFF, bloqueo y pérdida de autoridad; no se inyectan todos los códigos |
| ACCOUNT_CLOSING | superficie restringida sin nuevos comandos | no se ejecutó eliminación real de cuenta en este ensayo |
| FLEET/ejecución/independiente/asistencia | regresiones de los módulos existentes | servicio activo y ledger preservados; salida no crea perfil independiente |

No se acredita aquí resolución real de custodia, timeout del worker, vencimiento real de cinco minutos, todas las causas de bloqueo, eliminación de cuenta ni operación remota. Esas ramas se distinguen de la cobertura de componentes y de la evidencia backend previa. Los pendientes de la suite global se detallan en VERIFICATION, sin alterar asignaciones u otros productos para maquillar el resultado.

La evidencia y resultados finales se registran en [manifiesto](fleet-exit-web-evidence.json). No hay cambios de dependencias, versión, configuración, .env, backend ni mandaria-driver; sin Docker, datos operativos, commit, push o despliegue.

## Comandos y correcciones de verificación

- `npm run typecheck:test`, `npm run lint`, `npm run build`: PASS; lint focalizado repetido tras el último ajuste. Build avisa de chunk superior a500kB, sin error.
- `npx vitest run src/test/fleet-exit.test.tsx src/test/fleet-exit-api.test.ts`: **63 PASS** finales. La regresión añadida verifica COMPLETED seguido de404 del contexto: conserva recibo y enlace histórico, sin restaurar comandos.
- Pase focalizado de12 archivos: **325 PASS** (salida, asistencia, FLEET, independiente, ejecución, conductor y navegación). Incluye las62 pruebas de salida anteriores al último caso; no sumar ambos resultados como pruebas distintas.
- `npm test`: **1506 PASS/21 FAIL**, anterior al último ajuste. Deuda conocida:17 fallos UI de delivery-assignments y1 de etiquetas (RETURNED/TRANSFERRED ausentes en expectativa antigua). Los3 fallos restantes de despacho/finalización pasan en `npx vitest run src/test/dispatch.test.tsx src/test/delivery-completion.test.tsx` (**96/96**). No se cambió lógica de asignación para ocultarlos.
- `node scripts/verify-fleet-exit-http.mjs`: Chrome→Vite→Nest compilado desde fuentes vigentes→PostgreSQL scratch con65 migraciones. START habilitado sólo en ese proceso local. Salida explícita cierra navegador, Vite, Nest y PostgreSQL; compara huellas backend. Los fallos intermedios del harness (sincronización de navegación, expectativa201 de CREATE y montaje histórico incompatible con triggers) se corrigieron. La participación del conductor que sale se construye finalmente con TAKE/RELEASE reales sintéticos, sin deshabilitar triggers ni alterar fuentes backend.
- La prueba HTTP descubrió y corrigió la carrera entre recibo COMPLETED y404 del contexto del exconductor. Ese404 sólo puede conservar un recibo propio APPLIED/COMPLETED ya recibido. Un rechazo del detalle histórico o401/403 sigue retirando recibos completos; un resultado redactado no reconstruye referencias.
- Revisión visual: proveedor1280/320 y administración1280, sin desbordamiento horizontal a320. Artefactos de conciliación posterior y resultados HTTP en el manifiesto.

HTTP final: **12 comprobaciones PASS**. El exproveedor conserva movementContext autorizado, declara25.10MXN y disputa por movimiento después de COMPLETED; no se crean allocations, no cambia ledger ni se restablece Driver.providerId. El perfil independiente previo del conductor se conserva, sin aprobación o perfil nuevo. Las27 participaciones canceladas auxiliares y obligaciones económicas se montan como fixtures explícitos; no son entregas ni pagos reales. El segmento del conductor desvinculado proviene de TAKE/RELEASE HTTP sintéticos reales. Fuentes backend intactas y procesos cerrados, según report.json.

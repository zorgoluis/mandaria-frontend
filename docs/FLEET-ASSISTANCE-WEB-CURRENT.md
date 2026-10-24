> Actualización 2026-10-24: la proyección PROVIDER_ADMIN ya existe y está integrada. Consulte el [informe vigente](FLEET-ASSISTANCE-PROVIDER-MOVEMENTS-WEB.md). Este documento y su evidencia conservan el estado histórico del 23 de octubre.

# Asistencia Web — contraste con backend actual

2026-10-23, America/Mexico_City. Repositorio `C:/Users/zorgl/Documents/mandaria-frontend`, rama QA, HEAD `7488fc881fbe99f887c24948db2ee0d3e169b95f`, sin commit. Continúa la implementación existente y sustituye las conclusiones desactualizadas del [primer informe local](FLEET-ASSISTANCE-WEB.md). Se conserva su evidencia histórica.

## Cambios de esta continuación

- Proyecciones antiguas sin capabilities: lectura disponible, ningún permiso nuevo por omisión. Colecciones desconocidas rechazadas antes de HTTP y omitidas de la consola. movementContext adicional no concede operaciones al dueño; no se incorpora endpoint DRIVER ni una variante provider inventada.
- No se persisten bytes de imágenes privadas, ni siquiera dentro del registro cifrado. La intención conserva su operación/ruta/cuerpo/UUID/revisiones y huella original (MIME, tamaño, SHA-256); bytes sólo en memoria de la sesión. Tras reinicio primero se consulta el recibo. La reserva previa sólo se sustituye atómicamente al confirmar la siguiente intención; cancelar o recargar el borrador conserva el paso anterior. Si hay que continuar el upload, se pide seleccionar el mismo archivo y se comprueba su huella. Seleccionar no envía nada; reenviar exige confirmación y conserva cuerpo/clave/revisión. Un sellado APPLIED permite registrar evidencia sin volver a seleccionar o enviar bytes. No se guarda credencial ni URL pública.
- REGISTER_PARTY permite DRIVER/PROVIDER desde userId/providerId históricos expuestos por la colección administrativa parties, con selección explícita. No infiere afiliación actual. ORIGIN/RECIPIENT/EXTERNAL siguen bloqueados sin referencia STOP autorizada. Este registro por sí solo no verifica identidad.
- RECORD_OBLIGATION permite elegir participationId cuando ya aparece en obligaciones administrativas del caso. Si no hay obligaciones con esa referencia, se conserva el bloqueo: assignmentId nunca sustituye AssistanceParticipation.id. Este recorrido no resuelve el alta inicial del inventario sin referencias.
- Listado con filtro de estado, envío de un expediente visible y límite 25/50/100; administrador puede filtrar por proveedor con el selector autorizado existente y búsqueda/paginación. Cada cambio reinicia cursores. No se permite pegar UUID como formulario normal.
- El dueño no ve ni envía reversesMovementId. Se distinguen VALIDATION_ERROR, ROLE_FORBIDDEN y errores reales de almacenamiento/tipo/tamaño/duplicidad de evidencia. Comandos apagados no ocultan lecturas ni recuperación ni los formularios administrativos de excepción previstos por backend.

Los recorridos base por rol, el protocolo durable, money strings y propuestas congeladas se conservan. No se añadieron sockets de asistencia, reset de contraseña DRIVER, operaciones directas refund/release/deliver ni cambios de modo/modalidad. Se preservan FLEET 1.0.0 e independiente 1.1.0.

## Backend realmente ejecutado

Se consultaron contratos, especificación, implementación, matriz, prompt Web, handoff DRIVER, OpenAPI/API_ACCESS, evidencia participant y fuentes actuales de assistance. Paquete 1.13.0, migración 64. La ampliación movementContext ocurre sólo para DRIVER en `AssistanceService.read` y `/driver/fleet-assistance-cases/:id/movement-context`. `AssistanceService.page()` sigue eliminando contactSourceRef/objectId también para admin; participation sigue sin id propio. El DTO de comandos no cambió respecto al snapshot tipado anterior.

El harness compara por contenido los archivos de `src`, migraciones, schema Prisma, configuración TypeScript, package y fixture utilizados en WSL con el repositorio Windows. Compila las fuentes actuales mediante TypeScript hacia `scratch/dist` e importa ese runtime; no reutiliza el dist anterior. [Reporte HTTP](evidence/fleet-assistance-current-2026-10-23/report.json) incluye el manifiesto SHA-256 y `runtimeBuiltFromCurrentSources: true`.

Chrome → Vite 4238 → Nest 4237 → PostgreSQL 55484 aislado, 64 migraciones, identidades/datos sintéticos. Configuración temporal test y LOCAL_PRIVATE; sin .env compartidos ni bases operativas. Routing/mail simulados, red externa bloqueada. El throttler del fixture admite 10000/min para el volumen de la prueba; autenticación/autorización reales. Backend, DB y auxiliares propios cerrados al finalizar. Directorio sintético detenido: `/tmp/mandaria-assistance-web-BWwvnw/pgdata`.

## Resultados propios de Web

| Capa | Ejecución y resultado |
| --- | --- |
| Dobles y regresiones Web | `npx vitest run src/test/assistance.test.tsx src/test/assistance-api.test.ts src/test/api.test.ts src/test/fleet.test.tsx src/test/fleet-api.test.ts src/test/independent-drivers-api.test.ts`: **119 PASS, 6 archivos**. |
| Tipos | `npm run typecheck:test`: PASS. `tsc -b` incluido en build. |
| Lint | `npm run lint`: PASS; ESLint focalizado repetido tras la corrección final de transición de upload, PASS. |
| Build | `npm run build`: PASS; advertencia existente chunk >500 kB. |
| HTTP real | `node scripts/verify-assistance-http.mjs`: **14 comprobaciones PASS**, ejecución `1792814118167`, proceso cerrado. |
| Visual | Capturas nuevas dueño 1280/320 y admin 1280 revisadas: contenido legible, sin desbordamiento horizontal visible. No auditoría completa de accesibilidad ni verificación visual de cada formulario bloqueado. |

Las 14 comprobaciones conservan las once del pase anterior y añaden la recarga antes de confirmar el siguiente paso (la reserva anterior permanece recuperable), además de: reserva recuperada tras reinicio, archivo distinto rechazado y original comprobado antes de continuar; pérdida de respuesta después de SEAL_EVIDENCE aplicado, recarga y recuperación APPLIED sin bytes persistidos/reenvío. La nota de contacto sigue validando sourceRef.sha256 contra backend real. RETRACT_EVIDENCE comprueba identidad de votos y ausencia de llamadas operativas extra; no acredita entrega/conciliación completas ni las precondiciones de propuestas físicas de dos operadores.

Dobles adicionales: falta de capabilities, movementContext no aplicable al dueño, reversión propia ausente, allowlist de colecciones, persistencia sin bytes, reselección idéntica/hash incorrecto, revisión mayor que Number.MAX_SAFE_INTEGER, referencias históricas de partes/obligaciones, filtros que reinician cursor, excepciones WAIVER/COMPENSATION/LOSS con importe original congelado y corrección que conserva original/reemplazo en una sola propuesta. Estas pruebas de payload no acreditan ejecución financiera real.

Un primer intento de Vitest falló por ENOENT en archivos temporales del sandbox; ejecución local fuera de ese aislamiento pasó. Un test nuevo tenía una etiqueta incorrecta y se corrigió. El ensayo HTTP `1792813483950` terminó abruptamente (exit -1073740791) sin reporte final; no se cuenta como PASS. Se verificó que no dejó API/PG activos antes del nuevo ensayo. No se afirma haber diagnosticado la causa del cierre del proceso. El ensayo `1792814023661` falló porque la automatización intentaba seleccionar un archivo mientras la recuperación aún deshabilitaba el control; se corrigió para esperar APPLIED y el control habilitado. No se cuenta como PASS.

La suite global no se repitió y los fallos históricos no se declaran resueltos. Las 32 E2E, 109 regresiones y 756 unitarias citadas por backend son evidencia histórica de ese repositorio, no resultados Web. No se repitieron carreras multinstancia/sockets backend desde este cliente.

## Bloqueos exactos que persisten

| Rol / ruta de lectura | Referencia ausente | Consecuencia |
| --- | --- | --- |
| PROVIDER_ADMIN `GET /provider/fleet-assistance-cases/:id` | Partes, combinaciones autorizadas y movimientos propios; no movementContext | Declaración propia bloqueada; disputa sólo por obligationId presente en economics. Aportes sin partyId y consultas siguen disponibles. |
| SUPER_ADMIN `GET /admin/fleet-assistance-cases/:id/parties` | contactSourceRef se redacta | VERIFY_IDENTITY bloqueado. Se necesita referencia de canal registrada y autorizada, no derivarla de USER:id. |
| SUPER_ADMIN detalle y paradas consultables | STOP:id no proyectado | REGISTER_PARTY ORIGIN/RECIPIENT/EXTERNAL bloqueado; DRIVER/PROVIDER seleccionables desde partes históricas existentes. |
| SUPER_ADMIN detalle sin obligaciones previas | AssistanceParticipation.id | Primera obligación bloqueada. Cuando la colección obligations ya expone participationId, el selector sí permite usar esa referencia. |
| SUPER_ADMIN consultas autorizadas existentes | Nueva sesión del conductor, recibo de release original, fuente shipping original | ACCESS_RECOVERED y variantes EXISTING_RELEASE/SHIPPING_DECLARATION bloqueadas sin selectores. Login no prueba recuperación; no se usa reset customer. |
| SUPER_ADMIN proyecciones parciales | Representación canónica completa de EXISTING_INTERNAL_RECORD | No calcular sourceRef.sha256 desde una proyección incompleta; nota de contacto e imagen conservan flujo disponible. |
| SUPER_ADMIN `/admin/dispatches/:id/assignments` | Modo FLEET del assignment histórico | CREATE admin tiene cliente tipado pero falta selector acreditado. La UI de creación propia desde fleet-services sí funciona. |

No se acredita integración completa mientras falten estas proyecciones. El estado/fase actuales del servicio no se inventan desde el resumen de asistencia. Los bloqueos de datos son distintos de activación: para QA/PRODUCTION siguen pendientes almacenamiento privado productivo, conservación/borrado y acceso excepcional, operadores/canales aprobados y preparación operativa del backend. No se modificaron esas barreras ni se activaron servicios remotos.

## Archivos y evidencia

En esta continuación cambiaron attempts, commands, types, service, forms, form-model, pages, workbench y messages de `src/assistance`; pruebas assistance/assistance-api; ambos scripts HTTP y documentación. Se mantienen los cambios previos de App, AdminLayout, enlace fleet-services y transporte multipart/JPEG. El [manifiesto actual](fleet-assistance-web-evidence.json) contiene hashes finales, resultados y referencia a la evidencia anterior.

[Dueño escritorio](evidence/fleet-assistance-current-2026-10-23/owner-1280.png), [dueño móvil](evidence/fleet-assistance-current-2026-10-23/owner-320.png), [admin escritorio](evidence/fleet-assistance-current-2026-10-23/admin-1280.png). Sólo datos sintéticos; no se archivan JWT, credenciales, cuerpos de peticiones ni imágenes operativas.

Sin Docker, cambios backend/mandaria-driver, versiones, acceso a Coita Eats, mensajes a agentes, commit/push, publicación o despliegue.

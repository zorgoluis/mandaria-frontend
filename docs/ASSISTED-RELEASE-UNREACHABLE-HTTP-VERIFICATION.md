> Actualización 2026-10-26: revocación e invalidación material verificadas en una nueva ejecución. La expiración temporal carece de TTL implementado y queda bloqueada. Véase [ciclo de aprobaciones](ASSISTED-RELEASE-APPROVAL-LIFECYCLE-HTTP.md). El informe inferior conserva su ejecución histórica.

# ASSISTED_RELEASE / UNREACHABLE — HTTP local con doble aprobación

2026-10-25. Frontend QA sobre `f52b782`, Web 1.11.0 sin cambios. La prueba usa un caso nuevo con asignación ACTIVE y `proofSource=NEW_ACTION`: acredita una liberación efectiva, no sólo el selector de un recibo histórico.

## Runtime utilizado

Backend local QA `f2f942e046901551f4e4d144479d6b5bbeac0014`, paquete **1.13.3**, asistencia/conciliación 1.0.0, referencias schemaVersion1 y 65 migraciones. Se observó el avance ajeno del checkout durante la verificación. Las 379 huellas de las fuentes copiadas/compiladas coinciden con las actuales; las 15 fuentes `src/assistance` no cambiaron respecto de la ejecución anterior sobre 1.13.2. No se restauró ni modificó el checkout. El código de presentación FCM incorporado por ese trabajo ajeno no amplía el alcance Web y no se activa remotamente.

Comando: `node scripts/verify-admin-references-http.mjs`. Usa Nest compilado desde copia temporal de fuentes actuales y PostgreSQL desechable en WSL Mandaria-Postgres. No reutiliza dist antiguo, no lee `.env`, no usa Docker ni bases operativas. Autenticación, negocio y persistencia son reales; correo/routing son sustitutos locales y el harness bloquea red externa. Dependencias Linux preexistentes, sin instalaciones.

## Recorrido

1. El fixture obtiene una asignación nueva mediante FLEET TAKE real con el conductor sintético ya autorizado. La deja ACTIVE sin ejecutar Fleet RELEASE. Se abre un expediente nuevo sobre esa asignación.
2. Se registra ORIGIN desde una parada autorizada. Con contribución, nota canónica y evidencia del servidor se verifica el origen por su canal registrado. Se registran sus cuatro confirmaciones: NO_PICKUP, NO_COLLECTION, NO_ADVANCE y NO_OBLIGATIONS, con términos exactos de la asignación. No se fabrican confirmaciones del conductor no localizable.
3. Una propuesta de inventario revisada sin constancia DRIVER UNREACHABLE se rechaza con COUNTERPARTY_UNVERIFIED. Se registra la contribución sintética de intentos de contacto sin respuesta, su evidencia de la misma parte y verificación de resultado UNREACHABLE vigente. Se crea/revisa/aplica otra propuesta de inventario: SIN_OBLIGACIONES_VERIFICADAS. No se reemplazan referencias en la propuesta anterior.
4. Desde el navegador se prepara ASSISTED_RELEASE / NEW_ACTION / UNREACHABLE con ambas evidencias y las cuatro confirmaciones del origen. El servidor exige requiredApprovals=2.
5. Cero votos → APPLY rechaza APPROVALS_REQUIRED. Un administrador aprueba → effectiveApprovalCount=1, DRAFT, APPLY sigue rechazado. La segunda sesión de ese mismo administrador vuelve a aprobar con otro comando → sigue count=1, DRAFT y APPLY rechazado. Las lecturas de control siguen idénticas: asignación ACTIVE, dispatch CLAIMED, cero liberaciones Fleet/reembolsos/obligaciones/movimientos/cobro.
6. Otro SUPER_ADMIN distinto aprueba → count=2, READY. APPLY produce LIBERADO, una referencia de efecto ASSIGNMENT y una REFUND. La propuesta queda APPLIED; GET y refresco Web confirman LIBERADO.
7. La consulta de intento devuelve APPLIED y el mismo resolutionId. Repetir exactamente cuerpo y clave devuelve el mismo recibo; aplicar la propuesta con una nueva clave se rechaza PROPOSAL_STALE. La asignación termina CANCELLED, dispatch OPEN, un único reembolso y cero FleetCommand RELEASE: la liberación procede de la resolución de asistencia, sin duplicar el efecto mediante la ruta Fleet RELEASE.

Las verificaciones humanas y sus actas son sintéticas, no llamadas reales. La propuesta y la lectura final se ejercitan en Web; el inventario, revisiones, aplicación y consulta de recibos se ejercitan por HTTP. No se afirma navegación completa de todos esos formularios ni una prueba de UI Android.

## Cambios y fallos

Se añade `scripts/verify-unreachable-release-flow.mjs`, llamado por el harness existente; se amplía el fixture para dejar una asignación ACTIVE sin liberarla. No se modifican reglas o estados de asistencia directamente en base, ni código de producto Web.

El primer ensayo encontró HTTP429 al intentar un login adicional para probar una segunda sesión del mismo usuario. Se corrigió reutilizando las sesiones ya creadas por API y navegador, distintas y de la misma identidad. No se aumentó el límite de login, no se relajaron permisos ni tiempos. Los tokens sólo viven en memoria del harness y no se archivan. La ejecución fallida se cerró y su informe se conserva separado.

Regresiones NUEVAS: `npx vitest run src/test/admin-references.test.tsx src/test/admin-reference-access.test.tsx src/test/assistance.test.tsx src/test/assistance-api.test.ts`: **93/93 PASS, 4 archivos**,8.40s. Sintaxis Node de los tres scripts y Prettier focalizado PASS. Global1597 y tipos/lint/build anteriores siguen siendo históricos; no se reejecutaron para esta ampliación del harness.

## Resultado final

**16/16 comprobaciones HTTP PASS**, cero errores de navegador, expiración real del cursor y cierre confirmado. [Informe final](evidence/unreachable-release-2026-10-25/http-report.json), [log](evidence/unreachable-release-2026-10-25/http-run.txt). La asignación pasa ACTIVE→CANCELLED y dispatch CLAIMED→OPEN; reembolsos0→1, FleetCommand RELEASE permanece0. Cero obligaciones, movimientos y declaraciones de cobro antes/después.

## Evidencia y límites

Resultados finales, comandos y huellas: [manifiesto](unreachable-release-web-evidence.json). Se repiten ACCESS_RECOVERED y EXISTING_RELEASE/CONTACTABLE como regresiones del mismo harness. Este recorrido acredita UNREACHABLE con NEW_ACTION; no constituye una matriz exhaustiva de todos los proofSource, expiraciones/revocaciones de votos o combinaciones de custodia/economía. No acredita llamadas humanas, custodia física, UI Android ni servicio remoto.

Se preservan cambios ajenos backend BITACORA.md, docs/OFFER-FCM-DRIVER-AGENT-PROMPT.md y `nul`. Sin modificaciones backend/móvil, versión Web o dependencias/configuración; sin push, Docker, despliegue ni activación remota. La implementación inicial se realizó sin commit; la revisión posterior autoriza el commit local QA con su evidencia. Historial anterior conservado.

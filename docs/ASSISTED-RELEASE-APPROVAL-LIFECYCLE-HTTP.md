# ASSISTED_RELEASE: revocación e invalidación de aprobaciones

2026-10-26. Web QA base `8dc67e6`, versión 1.11.0. Ampliación del harness existente, sin cambios de producto, backend o móvil.

## Contrato contrastado y bloqueo temporal

Backend QA `f2f942e046901551f4e4d144479d6b5bbeac0014`, 1.13.3, consultado en sólo lectura. `docs/openapi.json`, ruta `POST /api/v1/admin/fleet-assistance-cases/{id}/proposals/{p}/reviews`, y `src/assistance/assistance.dto.ts` permiten `APPROVE`, `REJECT`, `REVOKE`; requieren revisión de caso/propuesta, snapshotHash y motivo. No admiten un plazo de aprobación.

`src/assistance/assistance.resolutions.ts`, función `votes`, cuenta la última decisión por operador: APPROVE, snapshot/revisión coincidentes y usuario activo SUPER_ADMIN. No evalúa edad ni vencimiento del voto. `AssistanceApproval` en la migración `20261023000300_fleet_assistance` tiene recordedAt, pero no expiresAt/validUntil; la barrera SQL también carece de TTL. Por ello **la expiración temporal de aprobaciones está bloqueada: no existe una regla implementada contra la cual acreditar ese recorrido**. No se envejecieron registros, alteraron relojes ni añadió un TTL ficticio. Tampoco se sustituyó por expiración de sesión, identidad o cursor.

La invalidación material sí existe: `src/assistance/assistance.service.ts` incrementa materialRevision y marca propuestas DRAFT/READY como STALE tras CONTRIBUTE (operación HTTP contributions). Es una pérdida de vigencia por cambio de datos, no caducidad por tiempo.

## Recorrido HTTP sintético

Se conserva el escenario NEW_ACTION/UNREACHABLE: FLEET TAKE real deja asignación ACTIVE, origen verificado con cuatro confirmaciones, constancia de conductor no localizable e inventario positivo. Primera propuesta preparada en navegador; revisiones y aplicación por HTTP.

1. Dos administradores distintos aprueban: READY y dos votos.
2. El segundo envía REVIEW/REVOKE: DRAFT y un voto. Replay exacto del cuerpo/clave devuelve el mismo recibo.
3. APPLY devuelve 409 APPROVALS_REQUIRED. Repetir APPROVE del administrador cuyo voto sigue vigente mantiene un voto y APPLY continúa bloqueado. Controles de asignación, dispatch, liberaciones, reembolsos y economía permanecen sin efectos.
4. Nueva aprobación explícita del administrador que revocó restablece READY.
5. Una contribución material por API invalida la propuesta. GET devuelve STALE y APPLY rechaza 409 PROPOSAL_STALE; controles de efectos siguen iguales.
6. Se crea por HTTP una nueva propuesta sobre el estado vigente. No hereda votos: cero y uno rechazan APPLY; dos votos nuevos permiten aplicar.
7. Aplicación LIBERADO, recibo recuperable y replay exacto sin duplicar efectos. Asignación CANCELLED, dispatch OPEN, un reembolso; cero Fleet RELEASE adicionales, obligaciones, movimientos y cobros.

Las actas humanas son sintéticas; no se acreditan llamadas reales. La propuesta inicial usa Web; la sustituta posterior al cambio material se crea por HTTP. No se atribuye esta secuencia a formularios Web completos ni a Android.

## Reproducción y evidencia

`node scripts/verify-admin-references-http.mjs`: Nest compilado desde copia temporal actual y PostgreSQL desechable en WSL Mandaria-Postgres. Sin Docker, .env, datos reales ni proveedores externos; correo/routing sustituidos localmente. El harness verifica huellas y cierra sus procesos. El informe conserva el grupo UNREACHABLE dentro de sus 16 comprobaciones: las aserciones adicionales aparecen en `unreachableRelease`, no como seis grupos nuevos.

Resultados y huellas de esta ejecución: [manifiesto](approval-lifecycle-web-evidence.json). Regresiones focalizadas de asistencia separadas de HTTP. Global/tipos/lint/build de la verificación conjunta anterior permanecen históricos, sin nuevas ejecuciones en esta tarea de harness.

Quedan fuera la caducidad temporal inexistente, la matriz exhaustiva de todos los proofSource, pérdida de rol/actividad de aprobadores, custodia/economía y UI Android. No se modifican los pendientes anteriores para presentarlos como cubiertos. Sin versión, commit/push ni despliegue; cambios ajenos del backend preservados.

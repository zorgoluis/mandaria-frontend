> Matriz histórica inicial. El cierre posterior incorpora calendario por expediente y detalle autorizado de excepciones: [contrato vigente y revisión de publicación](RETENTION-WEB-PUBLICATION-REVIEW.md).

# Conservación de imágenes a 30 días — matriz previa Web

Fecha: 2026-10-20. Worktree fleet-representative-web; feature/driver-verification; base 97850b8c447c71d6ae245bc8df3ce46413650da2. Checkout inicialmente limpio. No se encontró AGENTS.md ni una versión previa de esta propuesta en los checkouts Web consultados; este documento registra el contrato implementado, no reconstruye una propuesta histórica.

Backend leído: codex/fleet-representative-verification, HEAD 2c458fc955f699ce958dabf5fe89dcc58892a031, implementación de retención sin commit. Autoridad: DOCUMENTARY-IMAGE-RETENTION-IMPLEMENTATION.md, OpenAPI, DTO, controllers, servicio y image-retention.e2e-spec.ts. Sus 123 unitarias, 53 E2E y 33 B2B son evidencia histórica backend.

Todos los endpoints tienen prefijo /api/v1.

| Endpoint / método | Campos | Permisos | Estados | Errores | Recuperación | Pantalla |
| --- | --- | --- | --- | --- | --- | --- |
| GET /privacy/deletion-requests/:id; GET :id/receipt; POST /privacy/deletion-access/status | imageRetention: version, reason, caseId, anchorAt, noticeAt, dueAt, noticeAcceptedAt; estado vigente, incidentPending, H, pendientes | actor/titular o canal privado validado | IMAGE_RETENTION y estados de baja existentes | REQUEST_NOT_FOUND, RECEIPT_NOT_READY, PRIVACY_WORKFLOW_UNAVAILABLE | consulta sin mutación; constancia separada | Seguimiento / constancia |
| GET /admin/privacy/deletion-requests; :id/work-items; :id/tasks | calendario; clasificación/estado de objetos, revisión y tareas autorizadas | SUPER_ADMIN | inventario, conservación, comprobación, incidencias | AUTHORITY_NOT_VERIFIED | GET | Revisión administrativa y vínculo desde expediente |
| POST /admin/verification-cases/:id/final-rejection | expectedVersion, evidenceRef UUID; Idempotency-Key | SUPER_ADMIN | REJECTED y habilitación explícita | IMAGE_RETENTION_DISABLED, VERIFICATION_VERSION_CONFLICT, IMAGE_RETENTION_CASE_NOT_ELIGIBLE, DOCUMENT_DELETION_RESTRICTED | GET /verification-command-attempts/:key?operation=FINAL_REJECTION&target=:caseId; devuelve folio de baja, no expediente | Confirmación independiente de rechazo definitivo |
| POST /admin/privacy/deletion-requests/:id/retention-decisions | expectedRevision, IMAGE_ATTACHMENT + attachmentId/evidenceRef antes de inventario; OBJECT después; purpose,basis,ownerId,reviewAt,expiresAt opcional | SUPER_ADMIN | alcance acreditado y revisión vigente | INVALID_IMAGE_RETENTION_EXCEPTION, INVALID_RETENTION, SCOPE_VERSION_CONFLICT | GET :id/commands/by-key/:key | Excepción concreta |
| POST /admin/privacy/deletion-requests/:id/restore-policy | ownerId,deputyId,reviewAt,evidenceRef,horizonEndsAt opcional,copiesStillRequired (true por defecto) | SUPER_ADMIN | declaración administrativa, no escaneo de copias | INVALID_RESTORE_POLICY | GET :id/commands/by-key/:key | Responsabilidad de recuperación |

## Límites comprobados antes de implementar

- No existe GET titular de planes por expediente, ni folio/calendario en VerificationCase. Los titulares consultan el folio comunicado por correo o canal asistido; Web no inventa su fecha ni consulta listados administrativos con otra cuenta.
- No hay GET de excepciones con finalidad/fundamento/vigencia completos. Estado RETAINED y tareas son observaciones acotadas: no acreditan por sí solos que una excepción siga vigente. No se inventan botones de ampliación o levantamiento sin referencia disponible.
- No hay superficie GET de supresiones/horizonte completa; Web sólo presenta tareas autorizadas y captura la declaración disponible. Formato de restauración 4 es backend, no importación Web.
- Día 23: aceptación por proveedor dentro de [anchor+23 días, anchor+24 días); no entrega ni lectura. Día 30: previsto, no borrado demostrado. Web presenta fechas ISO UTC procedentes del backend; no fabrica vencimientos desde updatedAt.
- Rechazo ordinario no es definitivo. Confirmar exige evidencia de cierre de revisión/apelación, no texto jurídico inventado ni borrado inmediato.
- Ningún contacto, apelación o edición garantiza detener la eliminación. No se borra desde navegador ni se reabre un expediente depurado.

Implementación y evidencia: [DOCUMENTARY-RETENTION-30D-WEB.md](DOCUMENTARY-RETENTION-30D-WEB.md). Documento de propuesta creado porque el solicitado no estaba disponible; los límites de exposición deben resolverse mediante contrato backend, fuera de esta tarea.

## Cierre de implementación — 2026-10-20

A–F PASS en instancia aislada; 33 pruebas nuevas y 215 regresiones afectadas. [Informe final](DOCUMENTARY-RETENTION-30D-WEB.md) y [evidencia](retention-30d-web-evidence.json). Se conservan los límites de contrato y se distingue la corrección posterior de presentación de las capturas históricas. Sin commit, push o activación.

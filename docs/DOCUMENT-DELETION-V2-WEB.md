# Contrato operativo V2 consumido por Web

Actualización de presentación: [mensajes de revisión y Conductor](RESTRICTION-REVIEW-WEB.md). CANCELLED/BLOCKED tiene precedencia; otros motivos no implican revisión completada. Tarea, gate y última decisión se muestran separados, sin alterar formularios/permisos/recuperación.89 regresiones y revisión visual sintética aprobadas; no se reejecutó integración real.

Actualización posterior 2026-10-18: [recuperación CANCELLED integrada](CANCELLED-COMMAND-RECEIPT-WEB.md). El fix backend permite APPLIED con fotografía CANCELLED de RESOLVE. Web habilita asignación, KEEP/RELEASE individual y bloqueo global, conservando permisos y revisión. Cuatro recorridos reales después de commit/pérdida/recarga/GET: PASS; detectado defecto pendiente del mensaje vigente tras bloqueo global. Evidencia y versiones en [cancelled-receipt-web-evidence.json](cancelled-receipt-web-evidence.json). El texto de adaptación inicial que sigue conserva su historia; su bloqueo1 y las restricciones por falta de recibo quedaron superados por esta actualización. La integración restante V2 no se acredita por estos cuatro recorridos.

Preparación 2026-10-18, antes de editar producto. Web `feature/driver-verification`, base `a87081c6b6c91d8feef5598ec33db734ec7592e5`, árbol inicialmente limpio. Checkout principal vigente; worktrees detached 56c7bad/cb08e8c y codex/merge-main-qa efa7c9a conservados. AGENTS.md ausente en Web y ancestros consultados. Leídos README, BITACORA, VERIFICATION, contratos y evidencias anteriores.

Backend exclusivamente leído en checkout principal `feature/driver-verification`, HEAD `b300c250df9fcc4aea8bcd76a1d6ed7c93e04e9a`, con V2 sin commit. Worktrees registrados; el checkout principal contiene las fuentes V2 vigentes consultadas y no fue necesario cambiar de checkout. Mandan servicio, controller, DTO, proyección del recibo, OpenAPI y pruebas `operational-cleanup.e2e-spec.ts`; diseño apartado 23 y límites de recuperación consultados. Huellas en `deletion-v2-sources.json`.

## Matriz previa

Prefijo `/api/v1`. Las capacidades siguen limitadas a entorno local autorizado; 503 no acredita operación.

| Superficie | Endpoint | Campos V2 e historia | Permiso / acción | Errores y límites |
|---|---|---|---|---|
| Titular | GET `/privacy/deletion-requests/:id` | cleanupPolicy, authorizationState/Generation, incidentPending, complianceOverdue, currentMessage; lastReviewAt, nextReviewAt, surveillanceEndsAt; H=closedAt histórico, D=deadline | Actor/titular, también projection=session restringida | 401/403/404 no prueban cierre; no objetos administrativos |
| Canal privado | POST `/privacy/deletion-access/status` | Misma proyección y constancia cuando procede | Token sólo memoria, cuerpo; sin sesión general | AUTH_REQUIRED; sin persistencia ni polling que conserve token |
| Constancia actual | GET `/privacy/deletion-requests/:id/receipt` | Proyección actual + evidenceLevel/fullErasureAttested=false, subámbitos, respaldos NOT_ATTESTED | Actor/titular; sin descarga inventada | RECEIPT_NOT_READY; no constancia ajena por ser admin |
| Detalle admin | GET `/admin/privacy/deletion-requests` | view, sin fechas agregadas de progress | SUPER_ADMIN; máximo 100 | No asumir detalle ajeno GET autorizado |
| Revisiones/residuos/incidencias | GET admin `/:id/work-items` | baselineAt B, reviewStep, nextReviewAt, lastReviewedAt, finalVerifiedAt F, watchUntil W, incidentCode/At, status, attempts/errorCode | SUPER_ADMIN; lectura por objeto | No endpoint observations: no reconstruir tres fechas ni atribuir resultado de una inspección histórica desde estado actual |
| Restricciones | GET admin `/:id/tasks` | tarea kind (incluye objectId en revisión parcial), ownerId/deputyId/dueAt; restrictions id/kind/active/reviewReason/reviewedAt/reviewDueAt | SUPER_ADMIN, sólo asignado decide; ACKNOWLEDGE_TASK asigna responsables actuales distintos | No resourceId expuesto: alcance exacto parcial lo comprueba servidor; no inventar mapa gate→objeto |
| Bloquear autorización | POST admin `/:id/resolve` | BLOCK_CLEANUP_AUTHORIZATION, expectedRevision, evidenceRef, reason, objectId opcional | SUPER_ADMIN; global o un objeto existente, sin deshacer efectos | INVALID_AUTHORIZATION_REVIEW; no cambio de cuenta/otros gates |
| Revisar restricción | mismo resolve | REVIEW_RESTRICTION, gateId, RELEASE/KEEP, reason, evidenceRef, expectedRevision; objectId si tarea parcial; KEEP reviewAt futura <=30d | Responsable/suplente actual; selección y confirmación por gate | RESTRICTION_REVIEW_REQUIRED, RESTRICTION_STILL_REQUIRED, BOUNDED_REVIEW_REQUIRED; 409 refresca sin reenviar |
| Actuación puntual | mismo resolve | AUTHORIZE_POINT_CLEANUP, objectId, reason, evidenceRef, revisión | SUPER_ADMIN, V2 ACTIVE, objeto y saldo; inventario comprobado sólo en servidor | POINT_CLEANUP_NOT_AUTHORIZED; no ampliar inventario, reiniciar saldo ni ventana |
| Adopción V1 | mismo resolve | ADOPT_OPERATIONAL_POLICY, revisión, evidencia | Transición explícita, confirmada abierta antes D, sin objetos ejecutándose/finalizados | POLICY_TRANSITION_NOT_ALLOWED; no reinterpretar historia |
| Recuperación administrativa | GET admin `/:id/commands/by-key/:key` | APPLIED y fotografía histórica limitada (sin campos V2 ni incidencias actuales) | Sólo iniciador SUPER_ADMIN; marcador mínimo existente resolve | COMMAND_RECEIPT_UNAVAILABLE conserva incertidumbre, sin nuevo POST |

## Bloqueos comprobados en la adaptación inicial

1. `commandSnapshot` excluye CANCELLED. Un resolve posterior a cancelación retorna una fotografía CANCELLED que GET no puede proyectar: revisión/asignación/bloqueo nuevos en esa situación se muestran sólo en lectura. Requiere ampliar y probar contrato backend de recuperación; Web no inventa un recibo. Esto no bloquea consultar cancelación ni restricciones, ni decisiones recuperables en otras situaciones.
2. `work-items` no entrega observations, fechas previstas individuales, resultado de cada inspección, inventarioVerificado ni allowedActions. Se muestran únicamente B, contador reportado, última/próxima, F/W y pendientes. Una fecha pasada sólo indica retraso informativo, nunca ejecución. La decisión puntual sigue sujeta a comprobación backend.
3. No endpoint de historia de incidentes ni detalle de excepciones comunicables. Se conserva H y recibo histórico; resolución se ve en consulta actual, sin fabricar historia ni nueva fecha H. No hay PDF ni versión fechada de política distinta del identificador.
4. Gate no expone resourceId ni fundamento original; se muestran origen (folio/tarea), clase y motivo de revisión cuando existe. En revisión parcial sólo SUBJECT es candidato, con advertencia y validación servidor de pertenencia y otras partes legítimas.
5. Restore V2 es independiente: apertura limitada de estados cancelados/incidentados sigue sin definición; no hay acción Web para abrir cuarentena.

Constancias parciales; drenaje real de Spaces pendiente. Ninguna prueba Web acredita eliminación total o aptitud productiva. No backend, QA, commit, push ni despliegue.

## Implementación y decisiones de presentación

Seguimiento del titular, canal privado y constancia consumen una proyección explícita: sin objetos, responsables ni motivos administrativos. `currentMessage` no se imprime como texto arbitrario; sus casos se traducen a partir de `status`, `authorizationState`, `irreversibleStarted`, `incidentPending` y `blockingReason`, siguiendo `view()` real. La política desconocida conserva consulta segura y deshabilita acciones. No se recalcula D ni el calendario B+15m/1h/24h. B, paso, última/próxima revisión, F/W, incidencia y ocho ciclos sólo aparecen desde work-items administrativos.

La situación vigente aparece al inicio, antes de los campos históricos. Texto para H con incidencia: «Se completaron las comprobaciones operativas el [fecha]. Existe una incidencia actual que sigue en revisión; el cierre histórico no acredita su resolución.» No se atribuye fecha posterior específica porque el titular no recibe incidentAt. La administración sí recibe la fecha del objeto. Constancia: «Situación informada en esta constancia» y aviso de fotografía consultada, distinta del seguimiento; el recibo de comando conserva su sección histórica existente.

SUPER_ADMIN puede preparar cuatro acciones V2 reales: adopción explícita, bloqueo global/parcial, revisión individual RELEASE/KEEP y actuación puntual. No hay botón de reactivar todo, reconstruir manifiesto, ampliar inventario o reiniciar saldo. Los candidatos de actuación puntual no prueban inventario acreditado: esa condición sigue siendo exclusiva del servidor. RESUME antiguo no se ofrece para V2. La asignación utiliza ACKNOWLEDGE_TASK ya implementado, con responsable/suplente distintos y evidencia; PENDING también es tarea asignable. Una tarea visible no concede autoridad de revisión: exige asignación actual. Formulario, contenido capturado y confirmación específica; motivos sólo en memoria, nunca en marcadores.

El bloqueo de recuperación CANCELLED se aplica conservadoramente a los formularios administrativos de decisión de esa solicitud, incluso los anteriores: el lector GET no admite su fotografía de resolve. Se mantienen consultas y entrega asistida de canal privado. Pendiente backend antes de habilitar revisión de gates tras cancelación. Las acciones V2 en los demás estados usan el contrato RESOLVE existente; no se deduce el resultado puntual remoto de APPLIED. Un 409 refresca y bloquea la confirmación capturada si cambió la revisión; nunca reenvía. Una respuesta perdida conserva el marcador mínimo resolve original para GET, sin cuerpo/motivo ni clave nueva. 404 sigue sin demostrar ausencia de efectos.

Sondeo opt-in cada 30 s, sólo con datos reconocidos y pendientes/vigilancia comunicada; sin sondeo en segundo plano ni después de error, pérdida de permiso o desmontaje. Una lectura manual permite recuperar después del error. Las observaciones del worker pueden cambiar sin incrementar revision: por eso una actualización de work-items refresca el resumen administrativo. Se conserva la protección por revisión para fotografías y la cancelación de consultas antes de invalidar tras comandos. No se emplea un recibo como estado vigente. El canal privado mantiene token sólo en memoria y consulta explícita, sin polling que retenga su secreto. El reloj local sólo avisa retraso/fin de vigilancia, no concede autoridad ni acredita ejecución.

Corrección mínima relacionada: `list().map(snapshot)` pasaba el índice como `minimumRevision`; se cambia por un callback explícito para no rechazar folios legítimos posteriores del listado. Regresión con cinco solicitudes de revisión 1.

## Verificación y evidencia

Inventario de cambios Web (20 archivos, todos propios de esta tarea):

- Producto: `src/deletion/contract.ts`, `service.ts`, `hooks.ts`, `pages.tsx`, `review.tsx`; nuevos `operational-contract.ts`, `operational.tsx`, `operational-review.tsx`.
- Pruebas: `src/test/deletion-service.test.ts`, `deletion-pages.test.tsx`; nuevos `deletion-v2-fixtures.ts`, `deletion-v2.test.tsx`. Session-compatibility se ejecutó sin modificarlo.
- Arnés nuevo: `scripts/verify-deletion-v2-web.mjs`.
- Documentación: este handoff, `docs/DOCUMENT-DELETION-WEB.md`, `docs/DOCUMENT-DELETION-COMPATIBILITY-WEB.md`, `docs/deletion-v2-sources.json`, `docs/deletion-v2-web-evidence.json`, `BITACORA.md`, `VERIFICATION.md`.

Resultados finales exactos en VERIFICATION y `deletion-v2-web-evidence.json`. Fuentes backend verificadas al cierre: 11/11 huellas sin cambio. No se ejecutó backend, DB, Docker ni Spaces. Evidencia de navegador exclusivamente sintética, todos los endpoints interceptados en origen loopback, externos abortados; Vite ignora .env y configura API local propia. No equivale a integración HTTP/PostgreSQL.

El arnés cubre seguimiento, H con incidencia, constancia parcial, cancelación en lectura, revisiones/residuo, KEEP inválido, confirmación selectiva por teclado, conflicto de versión y retirada individual con otra restricción intacta en la fixture. Vistas 1280 y 320, sin desbordamiento horizontal. Primera ejecución con reporte falló por selector ambiguo entre dos mensajes correctos de conflicto; corrección de selector pasó. Se hizo una ejecución final después de subir la situación vigente y ajustar fechas sintéticas a T0+7 días. Se conservan todos los reportes; no hubo aborto nativo ni ejecución sin reporte. No se suman repeticiones como casos nuevos.

Entrega restringida y recibo depurado siguen siendo evidencia histórica. `ActiveService`, identidad/HTTP, marcadores, proyector de recibo y cuerpo del recuperador GET no cambiaron. Cambiaron las proyecciones V2, presentación y sondeo opt-in (desactivado para servicio comprometido). Las suites completas de compatibilidad/recuperación se ejecutaron de nuevo; no se volvió a entregar ni depurar una base. No se acredita la integración histórica como nueva validación V2.

## Plan de validación integrada registrado en la adaptación inicial

Avance posterior: el punto1 y el procedimiento aislado del punto2 quedaron comprobados en el handoff CANCELLED. Del punto4 se cubrieron asignación, KEEP/RELEASE, bloqueo global y pérdida/GET; conflicto409 permanece cubierto por la regresión sintética anterior. Bloqueo parcial y demás integración siguen pendientes. No se reejecutó el resto del plan.

1. Confirmar la misma versión/huellas backend y resolver el bloqueo de recibos CANCELLED con pruebas backend de ACKNOWLEDGE_TASK y REVIEW_RESTRICTION, tanto respuesta normal como pérdida/GET.
2. Crear una base nueva en un clúster aislado identificado por SQL antes de migrar/sembrar; correo capturado, almacenamiento con estado simulado y reloj inyectado. No usar Docker43000 ni base desconocida.
3. Registrar revisiones tardías/reales, residuo/error, H seguido de incidencia y resolución. Contrastar B/F/W/H/D y saldo en DB con las lecturas Web; comprobar que refrescos no renuevan fechas ni contadores.
4. Probar asignación, RELEASE/KEEP individual y bloqueos independientes; invalidación global/parcial, conflicto 409 y pérdida seguida de GET con clave original. Verificar servidor/DB; las fixtures Web sólo acreditan solicitud/presentación.
5. Reconfirmar las proyecciones propia/privada y constancias parciales sin datos administrativos. Revisiones completas/observaciones e historia de incidentes requieren contrato adicional si deben verse en Web.

No ejecutar limpieza real en Spaces con este procedimiento. Restauración/custodia, apertura limitada de cuarentena, responsables/cobertura y rollout coordinado permanecen fuera de la acreditación Web.

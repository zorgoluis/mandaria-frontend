# Presentación de revisión de restricciones

2026-10-18. Corrección Web de CANCELLED-CURRENT-MESSAGE y etiqueta DRIVER: **PASS en regresiones y navegador sintético**. No es una nueva integración HTTP/PostgreSQL. [Evidencia saneada](restriction-review-web-evidence.json) y [huellas iniciales](restriction-review-web-sources.json).

## Preparación y fuentes

Checkout principal `C:/Users/zorgl/Documents/mandaria-frontend`, rama `feature/driver-verification`, HEAD inicial/final `a87081c6b6c91d8feef5598ec33db734ec7592e5`. Los25 archivos pendientes anteriores y sus cambios se conservaron; no se cambió de rama, se hizo staging ni se alteraron otros worktrees. Worktrees adicionales: detached56c7bad, codex/merge-main-qa efa7c9a y detachedcb08e8c.

Leídos README, BITACORA, VERIFICATION y el análisis backend `docs/RESTRICTION-REVIEW-MESSAGE-ANALYSIS.md`. No hay AGENTS.md en Web o ancestros consultados; se leyó el disponible en backend sin escribir en ese repositorio. Se confirmaron rutas, consumidores y contrato antes de editar. `OperationalStatus` consume `operationalMessage`; `OperationalReview` recibe sólo los campos autorizados de tasks/gates. El mapeo global de User.role DRIVER no cambia.

Backend exclusivamente en lectura, checkout principal HEAD b300c250df9fcc4aea8bcd76a1d6ed7c93e04e9a más cambios locales. Al tomar las huellas, servicio fuente/compilado ya diferían de la evidencia histórica CANCELLED: contenían la corrección de mensajes realizada por separado. Durante esta tarea cambió además el documento de análisis para registrar esa corrección. Se guardan ambas huellas documentales; los otros15 archivos observados conservaron sus hashes desde la captura inicial. Las15 pruebas backend que ese informe declara son evidencia ajena, no ejecutada ni atribuida a esta tarea Web. No se compiló, modificó ni inició backend.

## Mensaje general

Sólo para `status=CANCELLED`, en este orden:

| Condición | Mensaje |
|---|---|
| authorizationState=BLOCKED, cualquiera que sea el motivo | Limpieza cancelada; autorización de limpieza bloqueada |
| Sin BLOCKED, motivo RESTRICTIONS_UNDER_REVIEW | Limpieza cancelada; restricciones en revisión |
| Cualquier otro motivo, incluido null/desconocido | Limpieza cancelada; consulta el estado de las restricciones |

No hay conclusión «revisión completada» por descarte. No se calcula habilitación de cuenta ni cierre global contando gates, usando RESOLVED o leyendo un recibo histórico. Los mensajes de otros estados permanecen iguales.

## Detalle administrativo

Se muestran en campos separados el estado de tarea administrativa, ámbito, estado activo/inactivo del gate, última decisión acreditada, fecha de revisión informada, motivo visible y próxima revisión informada. La tarea ACKNOWLEDGED se etiqueta «Responsabilidad registrada»; puede coexistir con KEEP y seguimiento pendiente. RESOLVED se muestra como estado informado, con aviso de que la tarea por sí sola no acredita la revisión de todas las restricciones. No se reabre ni se compensa una tarea desde Web.

- Activa, sin fecha/motivo/próxima revisión registrados: «Restricción activa; no consta una decisión de revisión».
- Fecha de revisión válida y no posterior al reloj local, motivo y fecha de próxima revisión posterior a la registrada, con gate activo: «Se mantiene esta restricción». La fecha puede haber vencido: eso conserva la decisión anterior y el gate activo.
- Fecha de revisión válida, motivo y gate inactivo, sin próxima revisión contradictoria: «Restricción retirada. Esto no habilita automáticamente la cuenta».
- Datos parciales o contradictorios: texto neutral «Los datos disponibles no permiten acreditar la última decisión de revisión». Un gate inactivo sin decisión registrada sólo indica que no consta decisión; no inventa RELEASE.

Las fechas ausentes se muestran como «No informada», las inválidas como no disponibles. Una fecha de gate vencida se etiqueta «Revisión programada vencida», con aviso de que el reloj local no acredita una nueva revisión ni cambia la restricción. No se fabrica calendario ni historial de observaciones. Se muestran únicamente los datos ya autorizados de esta solicitud; «Pueden existir otras restricciones» es advertencia general, no afirmación de causas externas concretas.

DRIVER se traduce **Conductor** sólo en el mapa de clases de restricciones. Se conservan el valor interno y la selección enviada. No se infiere Independiente/Flotilla, ni se cambian las etiquetas de roles de toda la aplicación. Clases desconocidas mantienen «Ámbito no reconocido».

## Archivos e invariantes

Producto: `src/deletion/operational-contract.ts` (precedencia y función de presentación por gate) y `src/deletion/operational-review.tsx` (campos y etiqueta). Sin cambios en CSS, endpoints, DTO, guards/capacidades, `contract.ts`, `service.ts`, `hooks.ts`, `pages.tsx`, `review.tsx`, `receipt.ts` o `pending.ts` respecto al comienzo de esta tarea.

Pruebas: `src/test/deletion-v2-fixtures.ts`, `deletion-v2.test.tsx` y `deletion-pages.test.tsx`. Arnés nuevo: `scripts/verify-restriction-review-web.mjs`. El arnés sintético V2 anterior sólo actualiza el selector de estado del gate a la nueva estructura; no se reejecuta. Documentación: este informe, fuentes/evidencia nuevas, enlaces de actualización en handoffs V2/CANCELLED/compatibilidad/baja y continuidad BITACORA/VERIFICATION.

Comparación con copia previa (normalizando sólo CRLF): cuerpo de permisos/disponibilidad de acciones de OperationalReview, formulario completo y llamadas de envío idénticos; validReviewAt y reviewResult idénticos. Hashes de recuperación, marcadores, HTTP/sesión y demás archivos protegidos conservados. No cambian KEEP/RELEASE, bloqueo global, cancelación, plazos, presupuestos, H ni retención. Motivos/decisiones sólo se presentan; no se escriben nuevas claves o cuerpos.

## Verificación nueva

- `npx vitest run src/test/deletion-v2.test.tsx src/test/deletion-pages.test.tsx`: **89/89**, archivos completos (57+32), primera ejecución.24 regresiones nuevas de presentación en V2; se conservan las33 anteriores. El caso de recibo histórico existente se refuerza con histórico4/actual6 y autorización BLOCKED vigente, sin sustituir el detalle ni reenviar POST.
- Incluye BLOCKED frente a todos los motivos, null/desconocido sin éxito, pendiente/KEEP/RELEASE, fecha vencida/ausente/inválida/futura incoherente, tarea separada, DRIVER/desconocido, otra restricción activa, permisos y formulario sin cambios. Las regresiones previas de otros estados y cuerpos de comandos también pasan.
- `npm run typecheck:test`, ESLint de los cinco archivos TS/TSX afectados y `npm run build`: PASS.2320 módulos; advertencia existente Root714.49kB>500kB conservada. Sintaxis de ambos arneses PASS. `git diff --check`: PASS; staged vacío.
- `node scripts/verify-restriction-review-web.mjs`: final PASS/exit0, reporte `test-results/restriction-review-1792381848860/report.json`.14 capturas1280/320: bloqueo, estado de tarea, conductor pendiente, KEEP futuro, RELEASE, KEEP vencido y foco. Sin overflow, errores de ejecución, llamadas inesperadas, POST, marcadores ni GET de recibo. Chromium/Vite propios cerrados.

La primera revisión visual `1792381752769` también pasó (12 capturas). Después se ajustó sólo la fixture del arnés para no comunicar fechas agregadas de objetos inexistentes y se añadieron capturas específicas de tarea; la ejecución final anterior incorpora esos ajustes. No hubo fallos ni abortos del runner; no se suman ejecuciones como casos nuevos. Inspección visual de capturas de escritorio/móvil: texto legible y foco visible, sin recortes horizontales.

Navegador real renderiza React con identidad SUPER_ADMIN sintética; todas las lecturas API se interceptan con fixtures fieles al contrato. Vite4198 ignora .env y cualquier origen externo/mutación se rechaza. Reloj fijo sólo para presentación. **No acredita integración real ni nuevas decisiones persistidas.** Las cuatro recuperaciones HTTP/PostgreSQL, entrega, depuración y restauración no se repitieron; la evidencia anterior se conserva sin reetiquetarla.

## Cierre y pendientes

Los dos hallazgos de presentación Web quedan corregidos. La imposibilidad backend de reabrir RESTRICTION_REVIEW ya RESOLVED sigue como pendiente independiente; no se modifica su lifecycle en esta tarea. Los avisos no acreditan revisión de un ciclo nuevo ni habilitación automática.

Se preservan cambios previos y temporales. Sin datos reales, .env, Docker43000, PostgreSQL, Spaces, backend/App/Landing, integración QA, commit, push o despliegue. Sólo se detuvieron Vite/Chromium propios; puerto4198 libre. Constancias pueden ser parciales, drenaje real de Spaces pendiente; no acredita eliminación total ni aptitud productiva.

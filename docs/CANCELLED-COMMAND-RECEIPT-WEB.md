# Recuperación de decisiones administrativas sobre CANCELLED

Actualización posterior: [corrección Web de presentación](RESTRICTION-REVIEW-WEB.md). CANCELLED-CURRENT-MESSAGE y la etiqueta DRIVER quedan corregidos mediante mensajes neutrales y detalle separado de tarea/gate/decisión. Validación nueva exclusivamente focalizada y sintética; los cuatro recorridos reales siguientes conservan su evidencia histórica y no se repitieron. El defecto backend de reapertura de tareas RESOLVED es independiente y sigue pendiente. Los hallazgos y resultados originales de este informe se conservan a continuación.

2026-10-18, America/Mexico_City. **Recuperación integrada PASS; defecto de presentación vigente pendiente.** No se acredita toda la operación V2 ni aptitud productiva. Evidencia: [cancelled-receipt-web-evidence.json](cancelled-receipt-web-evidence.json); fuentes previas: [cancelled-receipt-web-sources.json](cancelled-receipt-web-sources.json).

## Referencias y alcance

Web: checkout principal `C:/Users/zorgl/Documents/mandaria-frontend`, rama `feature/driver-verification`, HEAD inicial/final `a87081c6b6c91d8feef5598ec33db734ec7592e5`, origin `https://github.com/zorgoluis/mandaria-frontend.git`. Conservados los 20 archivos pendientes de la adaptación V2 anterior. Worktrees adicionales sin tocar: detached `56c7bad`, `codex/merge-main-qa` en `efa7c9a` y detached `cb08e8c`. Sin staging, commit, fetch, push, integración QA ni despliegue.

Backend leído y ejecutado desde el checkout principal `C:/Users/zorgl/Documents/mandaria-backend`, rama `feature/driver-verification`, HEAD `b300c250df9fcc4aea8bcd76a1d6ed7c93e04e9a` **más cambios locales**. El SHA solo no identifica la corrección: el manifiesto registra 15 huellas, incluidos servicio/proyector fuente y compilado, AppModule/setup compilados, OpenAPI, handoff, evidencia y pruebas del fix. Todas coinciden antes y después. No se compiló ni editó backend. Sus otros worktrees y cambios previos se conservaron.

AGENTS.md no existe en Web ni en los ancestros consultados; se leyó el disponible en backend, junto con README, BITACORA, VERIFICATION y los handoffs pertinentes. Las restricciones de esta solicitud mantienen backend exclusivamente en lectura, incluida su documentación.

## Contrato y cambios Web

El HTTP público no incorpora el sobre interno de persistencia. GET `/api/v1/admin/privacy/deletion-requests/:id/commands/by-key/:key` devuelve `status: APPLIED`, identidad de solicitud/clave, `recordedAt` y `result` histórico. `result.status: CANCELLED` describe la solicitud al aplicar la decisión, no el resultado del comando.

Backend guarda los nuevos resultados CANCELLED de RESOLVE con procedencia interna `receiptVersion: 1`, `operation: RESOLVE`; la proyección valida esa procedencia. El comando personal CANCEL y los resultados antiguos ambiguos siguen sin recibo administrativo recuperable. Web no deduce la operación a partir de CANCELLED ni admite ese sobre como formato HTTP alternativo.

- `src/deletion/receipt.ts`: lector único compartido por `deletion.commandReceipt` y `References`. Acepta la fotografía CANCELLED dentro de APPLIED válido, valida solicitud/clave/fecha/estado/alcance y conserva la proyección histórica limitada. Tipo explícito sin incorporar campos V2 actuales. Rechaza arrays, primitivas, formas desconocidas y sobres internos.
- `src/deletion/review.tsx`: retira el bloqueo general por CANCELLED y habilita ACKNOWLEDGE_TASK cuando existe tarea elegible. Mantiene SUPER_ADMIN, datos reconocidos, lecturas completas, revisión, responsables distintos, evidencia y confirmación. Restauración sigue ausente en CANCELLED.
- `src/deletion/operational-review.tsx`: habilita REVIEW_RESTRICTION para responsable/suplente actual y bloqueo global de autorización. Conserva revisión, gate exacto, motivo, evidencia, fecha KEEP futura acotada y confirmación. No habilita adopción V1 en CANCELLED ni actuación puntual con autorización terminada/bloqueada. El bloqueo parcial sigue sujeto a autorización ACTIVE y validación backend; no se acredita como decisión ejecutable después de cancelación.
- `src/deletion/pages.tsx`: explica explícitamente la diferencia APPLIED/CANCELLED. El recibo se conserva en su sección histórica; el recuperador existente invalida consultas, nunca instala el recibo como detalle actual.

No cambiaron sesión, cliente HTTP, almacén de marcadores ni mutaciones de entrega/restauración. La selección de acciones sigue dependiendo del estado vigente y permisos, nunca del recibo. Marcador exacto anterior a recuperación: `{actor,key,op:'resolve',id}`; tras GET únicamente añade `accepted:true`. Sin cuerpo, motivo, evidencia, contraseñas o recibo completo persistidos. Aislamiento existente por API/cuenta/operación.

404 COMMAND_RECEIPT_UNAVAILABLE conserva la clave y la incertidumbre. No prueba ausencia de mutación, no descarta el marcador, no genera otra clave ni reenvía POST. Regresión completa incluye además 401/403/500 y cambio de cuenta durante una consulta. El ensayo de depuración real anterior permanece histórico y no se repitió.

## Entorno y precondiciones reproducibles

Comandos desde Web, usando dependencias backend ya existentes:

```powershell
node C:/Users/zorgl/Documents/mandaria-backend/node_modules/tsx/dist/cli.mjs scripts/verify-cancelled-receipt-web.mjs --preflight-only
node C:/Users/zorgl/Documents/mandaria-backend/node_modules/tsx/dist/cli.mjs scripts/verify-cancelled-receipt-web.mjs
```

El arnés reutiliza `deletion-isolated-environment.mjs` y `deletion-isolated-browser.mjs` sin modificarlos. PostgreSQL 18 temporal propio en loopback55444, Nest4217 y Vite4218; exige puertos libres. Comprueba mediante SQL host, puerto, base y directorio antes de migrar y antes de sembrar. Aplica migraciones existentes mediante configuración efímera propia; ignora .env. JWT/contraseñas aleatorios sólo en memoria. Nest usa AppModule/setup compilados reales, almacenamiento doble en memoria, correo capturado, proveedor de rutas que rechaza logística y reloj fijo. Se desactiva sólo el timer del worker; no se ejecuta limpieza, mantenimiento ni finalización. Navegador bloquea orígenes externos; el proxy envía API real a4217. Ningún GET funcional se sustituye por fixtures.

Semilla directa únicamente de prerrequisitos: dos SUPER_ADMIN, dos titulares inicialmente inactivos, un proveedor FLEET/conductor/expediente sintéticos y metadatos de un adjunto con dos objetos del doble. Sin bytes documentales reales. Después se usan endpoints reales auxiliares para crear/confirmar ACCOUNT y cancelar la primera solicitud antes de efectos irreversibles, obteniendo CANCELLED/TERMINATED y tarea RESTRICTION_REVIEW; se confirma otra ACCOUNT de **otro titular**, con su restricción independiente. No se actualizan manualmente filas de solicitudes, gates, comandos/eventos, fechas o presupuestos para fabricar transiciones. La cancelación auxiliar sólo prepara el escenario, no constituye nueva validación del recorrido personal.

Preflight separado `1792379339151`: PASS, reporte, salud200 y login Web real; recursos cerrados. Primera ejecución completa `1792379401491`: FAIL con reporte en precondiciones, antes de cualquier decisión Web. Intentaba confirmar otra ACCOUNT del mismo titular y el backend respondió409 ACTIVE_REQUEST_EXISTS porque la cancelación conserva gates. Diagnóstico por código/reporte; se corrigió únicamente la preparación del arnés usando otro titular. Ejecución corregida `1792379629311`: PASS, exit0. No hubo aborto nativo ni ejecución sin reporte; no se suman intentos como casos nuevos.

## Resultados reales desde navegador

En cada fila se eligió la acción en Web, se completaron sus datos y se confirmó con teclado. La frontera de transporte intercepta la respuesta de `resolve` **después de retornar la transacción**, lee comando/evento desde una segunda conexión Prisma y sólo entonces corta el socket. Verifica sobre persistido RESOLVE y resultado CANCELLED. Web recibe502 del proxy; se recarga completamente y recupera por el GET real con la clave original.

| Decisión Web | Efectos adicionales | GET original | Revisión histórica | Resultado |
|---|---|---|---|---|
| Asignar responsable/suplente | 1 comando, 1 evento | 200 APPLIED / CANCELLED | 5 | PASS |
| Mantener gate USER con próxima revisión | 1 comando, 1 evento | 200 APPLIED / CANCELLED | 6 | PASS |
| Retirar sólo gate USER | 1 comando, 1 evento | 200 APPLIED / CANCELLED | 7 | PASS |
| Bloquear autorización global | 1 comando, 1 evento | 200 APPLIED / CANCELLED | 8 | PASS recuperación; mensaje vigente defectuoso, abajo |

Total bajo prueba: **4 POST Web, 4 comandos y 4 eventos nuevos**. Sin segundo POST, incluso tras consultas repetidas. Además de los cinco GET desde navegador (cuatro recuperaciones y una consulta histórica posterior), se hacen ocho GET repetidos del iniciador sin efectos y cuatro GET de otro administrador, todos404 COMMAND_RECEIPT_UNAVAILABLE. Los POST auxiliares de preparación no forman parte de estos cuatro.

La transición real KEEP aumenta revisión5→6. Al recuperar de nuevo la asignación, el recibo sigue en5 y el detalle vigente muestra6; DB idéntica antes/después de leer. Los demás escenarios mantienen recibo y situación vigente separados. Sesión SUPER_ADMIN válida tras recargar, sin nuevo login requerido.

Gates originales: USER, DRIVER y SUBJECT. Tras RELEASE sólo USER queda retirado; DRIVER/SUBJECT permanecen activos y sin cambios, además del gate de la otra solicitud. Cuenta inicialmente inactiva sigue inactiva; no se acredita aquí una desactivación nueva. Fechas T0/D y sustitución, H/auditoría/contacto, B/F/W y presupuestos se comparan antes/después de cada decisión y GET: intactos, dos objetos con0 intentos. KEEP modifica exclusivamente la fecha de revisión de su gate, como solicita la acción. Cero asignaciones de entrega.

18 capturas locales en1280/320, sin desbordamiento horizontal comprobado. Confirmaciones con foco dentro del modal, Space para aceptar y Enter para confirmar/recuperar. Inspección visual representativa de escritorio y móvil: formulario, confirmación y recibo legibles; detectó el defecto vigente descrito a continuación. Capturas con datos sintéticos, correo/contraseñas enmascarados, sin claves de canal ni URLs firmadas; no se incorporan perfiles, bases, logs o trazas al repositorio.

## Defecto pendiente y reproducción saneada

**CANCELLED-CURRENT-MESSAGE — FAIL de presentación, independiente del recibo.** Preparar CANCELLED con gates USER/DRIVER/SUBJECT; asignar revisión, KEEP y RELEASE sólo USER; ejecutar BLOCK_CLEANUP_AUTHORIZATION global. Estado final observado: CANCELLED, autorización BLOCKED, `errorCode=AUTHORIZATION_UNDER_REVIEW`, dos gates propios activos y uno independiente. La Web muestra «Limpieza cancelada; revisión de restricciones completada» junto con avisos de pendiente.

`DocumentDeletionService.view()` prioriza CANCELLED y sólo reconoce RESTRICTIONS_UNDER_REVIEW para escoger el mensaje pendiente; el nuevo bloqueo cambia el código a AUTHORIZATION_UNDER_REVIEW. `operationalMessage()` Web conserva esa misma traducción. Por tanto ese mensaje no acredita revisión completada. Evidencia visual: `block-authorization-recovered-1280.png`/`320.png`, estado final y huellas en JSON. Backend no corregido; solicitar contrato coherente para esta combinación y ajustar traducción/regresión Web de forma coordinada. La recuperación APPLIED correcta y los otros escenarios sí quedaron comprobados. No se presenta este hallazgo como un fallo de commit o de GET.

La clase de gate DRIVER se presenta como «Ámbito no reconocido» en el listado existente; es una carencia previa de etiqueta, no pérdida del gate ni permiso de reactivación. Se mantiene como pendiente de presentación sin ampliar esta tarea.

## Validación, versiones y límites

Primera ejecución conjunta de tres archivos completos: deletion-service22, deletion-pages31, deletion-v2 33, 86 PASS. Después se reforzó COMMAND_RECEIPT_UNAVAILABLE (misma clave/marcador, mensaje incierto, sin éxito falso), conservando los cuatro casos previos de restore-policy y añadiendo resolve404. Última ejecución completa de deletion-pages:32 PASS. Consolidado final: **87 casos únicos PASS** (22+32+33), sin sumar repeticiones. Tipos de tests, lint de los siete archivos de producto/tests afectados y build PASS; sintaxis de los dos arneses PASS. Tras el último ajuste sólo de test se repitieron tipos/lint pertinentes. Build conserva advertencia Root712.66kB>500kB. Sin cambios de producto posteriores al recorrido real.

La combinación comprobada es Web con estas huellas y backend V2 más fix CANCELLED con las 15 huellas registradas. Los resultados antiguos ambiguos pueden seguir dando404: no se migran ni se reparan desde Web. Antes de publicar Web, todos los lectores y escritores backend deben tener el fix compatible; el backend antiguo no sabe desenvolver el nuevo resultado persistido en replay. No se probaron despliegues mixtos, downgrade, clúster multinodo ni migración operativa de tráfico. Flags locales y política actual no equivalen a habilitación productiva.

Pendientes: defecto de mensaje vigente y etiqueta DRIVER; integración restante V2 de observaciones/residuos/incidencias, bloqueo parcial, restauración/custodia y rollout coordinado. Entrega restringida y recibo realmente depurado conservan su evidencia anterior, no se repitieron. Constancias pueden ser parciales; drenaje real de Spaces pendiente; no se acredita eliminación total ni aptitud productiva.

Al cierre se detuvieron únicamente PostgreSQL, Nest, Vite y Chromium creados por el arnés; backend fuente/compilado sin cambio. Puertos propios4217/4218/55444 verificados libres; git diff --check PASS y área staged vacía. Sin acceder a Docker43000, Spaces real o servicios ajenos, ni editar .env/backend/App/Landing. Los recursos y archivos temporales propios se conservan localmente como evidencia excluida de Git.

> **Informe histórico del primer pase.** El [informe vigente](FLEET-ASSISTANCE-WEB-CURRENT.md) actualiza el almacenamiento de imágenes, referencias disponibles, filtros y pruebas contra el backend actual. Este texto conserva el alcance y resultados anteriores.

# Asistencia y conciliación 1.0.0 — integración Web local

Fecha: 2026-10-23. Web: `C:/Users/zorgl/Documents/mandaria-frontend`, rama `QA`, base `7488fc881fbe99f887c24948db2ee0d3e169b95f`. Implementación sin commit. Backend de consulta: `C:/Users/zorgl/Documents/mandaria-backend`; ejecución existente en WSL `Mandaria-Postgres`, `/home/mandaria/backend-offers-20261023`, paquete 1.13.0 y 64 migraciones. FLEET 1.0.0 e independiente 1.1.0 se conservan.

## Resultado y alcance

UI separada PROVIDER_ADMIN (`/fleet-assistance`) y SUPER_ADMIN (`/admin/fleet-assistance`), cliente tipado a partir de OpenAPI y formularios por DTO. La integración disponible fue probada contra HTTP real local; **no está completa para todos los recorridos**, debido a las referencias ausentes indicadas abajo. No se acredita disponibilidad remota.

El dueño crea desde una participación histórica FLEET releída del servidor, consulta expediente/historial, aporta información sin inventar partyId y puede preparar disputa cuando existe una obligación visible. Declarar movimientos queda bloqueado si no hay partes autorizadas. Nunca consulta colecciones administrativas ni ejecuta operaciones del conductor.

Administración consulta colecciones paginadas, prepara comandos exactos de partes, contribuciones, verificaciones, confirmaciones, restricciones, sesiones, obligaciones, movimientos, disputas, evidencia, cierre/reapertura y las doce variantes de propuesta. Referencias técnicas provienen de selectores autorizados; variantes sin datos suficientes se bloquean. La propuesta conserva revisión y snapshotHash; revisión, cancelación y aplicación son comandos separados. Se muestran votos efectivos e identidad; dos sesiones de la misma persona no son dos operadores. LINK_CUSTODY_RESULT consulta resoluciones del procedimiento de custodia existente.

Estado OPEN/CLOSED, estado operativo asistido y economía se presentan por separado; el estado actual del servicio no se infiere si falta. Null/UNKNOWN no equivalen a cero; importes MXN son strings de dos decimales. Entrega acreditada con efectivo PENDIENTE/PARCIAL sigue mostrando la obligación, sin convertir dinero en créditos. El cliente no hace llamadas operativas adicionales al aplicar una propuesta.

## Intentos, seguridad y evidencia

Antes de cada envío se guarda atómicamente una intención con UUID, actor/entorno, caso, operación, ruta, cuerpo y revisión congelados. IndexedDB guarda el contenido cifrado AES-GCM y una CryptoKey no extraíble; esto evita cuerpos en claro en ese almacén, no pretende proteger frente a ejecución maliciosa en el mismo origen. El archivo original pendiente también está cifrado y se elimina al reconocer el recibo. No se persisten imágenes descargadas.

El envío usa apiOnce: no hay reenvío automático con otra intención ni cambio de cuerpo/clave. Doble clic y otra pestaña no reemplazan una intención pendiente. Reautenticación requiere la misma cuenta. GET `/fleet-assistance-attempts/:key` y POST `/:key/close` usan caseId/operation originales; el cierre técnico no añade una nueva clave. APPLIED, REJECTED, PENDING, UNKNOWN y CLOSED_NO_EFFECTS permanecen distintos. El cierre técnico no acredita dinero, libera servicio ni elimina restricciones.

Queries separadas por actor, rol, proveedor y filtros; cambio de contexto desmonta datos, las respuestas tardías no se reutilizan y pérdida de acceso oculta el expediente. Se conserva sólo la recuperación técnica permitida por backend. Listado/historial usan cursores firmados y reinicio explícito ante INVALID_CURSOR. La UI filtra por estado y ámbito de proveedor; el transporte admite también dispatchId/limit. Falta un selector administrativo de proveedor/envío para esos filtros adicionales.

Upload SUPER_ADMIN: reserva → acceso → multipart `file` + `expectedCaseRevision` → registro. JPEG/PNG hasta 5 MiB; backend produce sanitizedHash/sanitizedBytes. Cada paso conserva su operación, incluido SEAL_EVIDENCE. Descarga por proxy autenticado, URL Blob temporal revocada al desmontar. Imagen retraída/inaccesible no se ofrece como disponible.

Canonicalización: objetos ordenados recursivamente por localeCompare, arrays conservan orden, bigint como string, amount/expectedAmount normalizados a dos posiciones sin float; SHA-256. `economicTerms` usa el allowlist backend; NO_* fija conceptos y ausencias positivas; DELIVERY_RECEIVED ordena incidentIdsToResolve; excepción incorpora obligación, tipo, importe y autorización. snapshotHash siempre procede del servidor. Compatibilidad del sourceRef.sha256 de nota de contacto acreditada por HTTP; otros termsHash tienen pruebas con dobles, no acreditación de todos los comandos backend.

## Referencias que faltan (no inventar ni pedir UUID arbitrarios)

| Recorrido | Respuesta/campo ausente y mínimo requerido |
| --- | --- |
| VERIFY_IDENTITY | GET admin `/:id/parties`: `AssistanceService.page()` elimina contactSourceRef incluso para SUPER_ADMIN. Se necesita un selector autorizado de canal registrado o referencia opaca aceptada por el DTO. No reconstruir `USER:id`. Confirmado por HTTP real. |
| REGISTER_PARTY ORIGIN/RECIPIENT | El DTO necesita contactSourceRef `STOP:<id>`; las paradas consultables no exponen ese identificador. Se necesita referencia autorizada del contacto/parada. |
| RECORD_OBLIGATION | `participation` expone assignmentId, pero no AssistanceParticipation.id requerido por el DTO. Exponer la referencia de participación autorizada; assignmentId no la sustituye. |
| DECLARE_MOVEMENT dueño | Detalle propio no incluye partes/movimientos. Se necesitan selectores propios de entregante, receptor, beneficiario y movimiento original con permisos, sin recurrir a admin. |
| DISPUTE dueño sin economía visible | Falta obligationId autorizado; se permite aportar información, no fabricar una obligación. |
| ACCESS_RECOVERED | Falta selector de newSessionId vigente y autorizado del conductor histórico. No inferirlo de una sesión del operador. |
| ASSISTED_RELEASE / EXISTING_RELEASE | Falta selector autorizado de existingReceiptId; la variante NEW_ACTION conserva sus validaciones backend. |
| SHIPPING_DECLARATION | Falta referencia autorizada a la declaración original; otras fuentes disponibles mantienen DTO propio. |
| EXISTING_INTERNAL_RECORD | Las proyecciones parciales no son la representación canónica completa requerida para sourceRef.sha256. Se requiere representación autorizada o hash/referencia emitidos por servidor. Nota de contacto e imagen sí tienen flujo verificable. |
| CREATE administrativo | Cliente tipado disponible; falta selector que acredite modo FLEET del assignment histórico. GET `/admin/dispatches/:id/assignments` no proporciona mode. La creación UI implementada es la propia desde fleet-services. |

Estas carencias impiden acreditar el recorrido completo de identidad → inventario → conciliación/liberación/entrega desde Web. Los formularios no sustituyen proyecciones ni las capacidades por permisos adicionales.

## Verificación ejecutada

| Capa | Comando / resultado |
| --- | --- |
| Dobles Web y regresión focalizada | `npx vitest run src/test/assistance.test.tsx src/test/assistance-api.test.ts src/test/api.test.ts src/test/fleet.test.tsx src/test/fleet-api.test.ts` — 5 archivos, 95 PASS. |
| Tipos de pruebas | `npm run typecheck:test` — PASS. |
| Tipos de aplicación/build | `npm run build` (`tsc -b && vite build`) — PASS; advertencia existente de chunk >500 kB. |
| Lint | `npm run lint` — PASS. |
| HTTP real | `node scripts/verify-assistance-http.mjs` — 11 comprobaciones PASS; reporte archivado abajo. |
| Visual | Chrome real, dueño 1280/320 y admin 1280: capturas revisadas, formularios legibles y sin desbordamiento horizontal visible. No se acredita una auditoría de accesibilidad completa ni admin móvil. |

Los dobles cubren roles/deep links, proveedor, null, cursor/error/respuesta tardía, doble clic, fallo de persistencia, estados de intento, cierre/recuperación, conflictos y códigos, propuestas/votos, pérdida de acceso/logout, efectivo pendiente/parcial y disputa. La fixture no concede contactSourceRef al administrador. La suite global no fue repetida; los 20 fallos históricos documentados no se declaran resueltos. Las 26 E2E/109 regresiones/756 unitarias previas del backend no se cuentan como pruebas Web.

HTTP: Chrome → Vite 4238 → Nest 4237 → PostgreSQL temporal 55484, base `mandaria_assistance_web_test`, datos e identidades sintéticas. Se aplicaron 64 migraciones. Routing/mail externos simulados y red externa bloqueada. Flags de asistencia y LOCAL_PRIVATE sólo en el proceso test, sin leer ni editar .env compartidos. Throttler del fixture elevado a 10000/min para el volumen de pruebas, sin quitar autenticación/autorización. Configuración productiva y barreras QA/PRODUCTION conservadas.

Once comprobaciones: creación propia histórica; respuesta de contribución perdida después de commit con recuperación tras reinicio y conteo SQL único; ausencia de HTTP admin como dueño; nota de contacto/hash; bloqueo de identidad por canal redactado; upload/SEAL/registro/proxy; propuesta RETRACT_EVIDENCE, preview, misma persona un voto, dos identidades y aplicación sin operación extra; flag OFF con REJECTED durable; petición abortada antes del servidor con UNKNOWN y cierre CLOSED_NO_EFFECTS; intención original al volver a la cuenta; revocación real de membresía que devuelve 404 y oculta caso. RETRACT_EVIDENCE admite un voto requerido: usar dos identidades aquí no acredita las precondiciones físicas de una entrega administrativa de dos operadores.

Fallos encontrados y corregidos durante ensayos: fixture inicialmente concedía canal que el servidor redacta; formato/precisión datetime del harness; reconsultas redundantes de colecciones provocaban 429 (ahora se usa detalle actualizado y asOf para aislar páginas); expectativa incorrecta de UNKNOWN con flag apagado (backend persiste REJECTED). Los ensayos fallidos permanecen localmente en test-results y no se cuentan como PASS. UNKNOWN se prueba abortando antes del POST; respuesta perdida después de commit se verifica como APPLIED, sin duplicado.

## Evidencia y archivos

[Manifiesto](fleet-assistance-web-evidence.json) · [Reporte HTTP original](evidence/fleet-assistance-2026-10-23/report.json) · [Dueño escritorio](evidence/fleet-assistance-2026-10-23/owner-1280.png) · [Dueño móvil](evidence/fleet-assistance-2026-10-23/owner-320.png) · [Admin escritorio](evidence/fleet-assistance-2026-10-23/admin-1280.png).

Implementación: `src/assistance/{types,contract,service,hashes,attempts,command-context,commands,messages,form-model,forms,pages,workbench}`; integración de rutas/menú/enlace FLEET y soporte multipart/JPEG en `src/services/api.ts`. Tests: assistance-api, assistance, assistance-fixture; expectativas de menú en flows. Harness reproducible: scripts/assistance-http-wsl.mjs y scripts/verify-assistance-http.mjs. Continuidad: README, BITACORA, VERIFICATION y este informe/manifiesto/capturas.

El reporte confirma API/DB detenidas, proceso cerrado y 18 huellas de fuentes/runtime backend sin cambios. Se conserva el directorio sintético detenido `/tmp/mandaria-assistance-web-8mAGSB/pgdata`. No se usó Docker, base operativa, proveedor real, Coita Eats, cambio de versión, commit/push, despliegue ni publicación. No se modificó backend ni .env. Las capturas sólo contienen datos sintéticos.

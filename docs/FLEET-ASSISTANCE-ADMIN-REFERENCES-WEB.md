> Compatibilidad revalidada 2026-10-26 con backend1.13.3/f2f942e: schema administrativo idéntico, siete secciones ya integradas y movementContext conservado. Sin cambios funcionales ni nueva ejecución HTTP. [Sincronización y pruebas nuevas](BACKEND-1.13.3-WEB-SYNCHRONIZATION.md). Las cifras inferiores son históricas.

# Referencias administrativas de asistencia — integración Web local

Actualización posterior: [ASSISTED_RELEASE / UNREACHABLE / NEW_ACTION con doble aprobación completado por HTTP sintético](ASSISTED-RELEASE-UNREACHABLE-HTTP-VERIFICATION.md). Las menciones inferiores de ese pendiente se conservan como historia; no implica matriz exhaustiva de variantes.

Actualización posterior: [ACCESS_RECOVERED ya aplicado y verificado por HTTP local](ACCESS-RECOVERED-HTTP-VERIFICATION.md), con replay y servicio ACTIVE. Las menciones de ese pendiente inferiores se conservan como historia.

Actualización posterior al commit 9e4af36: **EXISTING_RELEASE / CONTACTABLE completado por HTTP sintético, 14/14 comprobaciones PASS**. Ver [recorrido y evidencia nuevos](EXISTING-RELEASE-HTTP-VERIFICATION.md). Las menciones de pendiente y cifras inferiores describen la etapa anterior y se conservan como historia.

2026-10-25. Web 1.11.0, QA sobre `b55f772` y `263a4b9`. Ampliación aditiva de asistencia/conciliación 1.0.0, schemaVersion 1. Fuentes backend locales consultadas: commit `204d4f7`, paquete **1.13.2** (el handoff indica pruebas originales sobre 1.13.1). Esto no acredita disponibilidad remota. Sin migración nueva: entorno sintético de 65 migraciones. No se modifica backend, móvil, versión, dependencias, configuración ni `.env`; sin commit en la etapa inicial, push o despliegue. Revisión posterior autorizada para commit local QA: 92/92 pruebas focalizadas PASS; evidencia global y HTTP anterior verificada por huellas, sin reejecutarla.

## Alcance y archivos

- `src/assistance/admin-references.ts`: tipos de las siete secciones, validación en ejecución, query estricta y paginación completa con deduplicación. `admin-reference-schema.json` es el schema de respuesta 200 extraído del OpenAPI local, sin datos de casos.
- `admin-reference-form.tsx`: consulta exclusivamente SUPER_ADMIN activo; caché transitoria segregada por actor/caso/revisión, abortada y eliminada al salir o cambiar autoridad. Ninguna fuente se persiste. Recarga explícita desde primera página tras errores/cursor inválido; no publica páginas parciales.
- `admin-reference-bindings.ts`: selección → cuerpo exacto; validación de parte, método, participación, sesión, recibo y fuente. No convierte dinero o revisiones a Number.
- `forms.tsx`, `form-model.ts`, `workbench.tsx`: selectores rotulados dentro del expediente existente, confirmación humana y protocolo de propuestas/revisiones/aplicación conservados. Consulta vacía no acredita ausencia de obligaciones. `commandsEnabled=false` bloquea nuevas acciones; lectura y recuperación técnica siguen disponibles.
- `attempts.ts`, `commands.tsx`, `command-context.ts`, `pages.tsx`: intención original en memoria; recuperación durable sin persistir referencias privadas; asociación comprobada entre acta y parte durante el recorrido actual.
- Pruebas: `src/test/admin-references.test.tsx`, `admin-reference-access.test.tsx`, fixture sintético; regresiones de asistencia y suite global completa. Harness reproducible: `node scripts/verify-admin-references-http.mjs`, con `scripts/admin-references-http-wsl.mjs`.

Se conservan portal B2B, paquete de integradores, zonas del independiente, desvinculación y movementContext del proveedor. La nueva ruta nunca se usa desde PROVIDER_ADMIN, DRIVER ni B2B. No se añaden sockets, FCM, resets de CUSTOMER o acciones de proveedores reales.

## Contrato exacto y recorridos

`GET /api/v1/admin/fleet-assistance-cases/{caseId}/administrative-references/{section}`. Sólo query `limit` (1–100, default 25) y `pageToken`. Sin providerId, dispatchId o status. Envelope: schemaVersion, caseId, caseRevision, materialRevision, section, commandsEnabled, asOf, items, nextPageToken. Transporte `cache:no-store`; revisiones strings y fechas ISO con zona. El cursor se consume hasta null; repetición o cambios de revisión/asOf/capacidad fallan de forma cerrada. `asOf` limita altas, no congela registros mutables.

| Sección | Uso en Web |
| --- | --- |
| parties | Identidades autorizadas; `partyId`, `contactSourceRef` exacto y sólo métodos ofrecidos en VERIFY_IDENTITY. Nullable o lista incompatible bloquea. |
| stops | Parada con contacto registrado y registrationKinds ofrecidos para ORIGIN/RECIPIENT/EXTERNAL. Copia contactSourceRef; nombre de referencia lo aporta el operador. No inventa contacto ni acredita identidad. |
| participations | `id` → participationId de RECORD_OBLIGATION, incluso sin obligaciones previas. assignmentId nunca lo sustituye. |
| recovery-sessions | `newSessionId` → payload ACCESS_RECOVERED; se filtran vencidas y revalida al revisar. La propuesta conserva evidencia, verificación, revisión y aplicación separadas. |
| release-receipts | `existingReceiptId` → payload ASSISTED_RELEASE/EXISTING_RELEASE. Es requestId Fleet original, distinto de id opaco y response.receiptId. No ejecuta RELEASE ni reembolso al seleccionar. |
| shipping-declarations | sourceRef, amount, currency, occurredAt y declaredConcepts originales; toPartyId entre los ofrecidos y otras partes del caso. `POST .../movement-declarations`; resultado DECLARED sin acreditación automática ni modificación del cobro original. |
| evidence-sources | Copia kind y sourceRef completos, incluido SHA256 del servidor. No recalcula huellas desde una proyección. Notas filtradas por partyId; COMMAND_RECEIPT identifica recibo de asistencia, no requestId Fleet. |

Contacto: contribución administrativa que documenta la comprobación humana → nota canónica de la misma parte → RECORD_EVIDENCE → recibo real → VERIFY_IDENTITY con canal y método ofrecidos. Una referencia por sí sola no prueba una llamada. Registrar una parte externa refresca el expediente y las referencias. Declarar un movimiento conserva su estado DECLARED; seleccionar una sesión o un recibo no aplica resolución alguna.

Las fuentes cambian: rechazo por hash/revisión/sesión exige consultar resultado, reconocerlo cuando sea terminal, recargar y revisar una nueva intención. No reemplaza silenciosamente valores en un intento anterior. Los errores de permiso retiran el expediente; una caché nunca otorga autoridad.

## Privacidad, incertidumbre y recuperación

No se persisten catálogos, sesiones candidatas ni fuentes en localStorage/sessionStorage/IndexedDB/service worker, telemetría o evidencia de prueba. Los cuerpos originales sensibles viven sólo en memoria. Antes de enviar se reserva atómicamente la identidad durable del intento por actor/entorno; conserva clave, operación, caso y ruta. Para VERIFY_IDENTITY, evidencia con sourceRef, registro con contactSourceRef, declaración SHIPPING_DECLARATION y propuestas ACCESS_RECOVERED/ASSISTED_RELEASE, el registro cifrado omite el cuerpo privado y marca `recoveryOnly`.

En la misma sesión, timeout/doble clic conserva cuerpo y clave. Tras recargar, sólo consulta o cierre técnico del intento: el botón de replay queda bloqueado y `sendIntent` también lo rechaza. No reconstruye el cuerpo desde catálogos nuevos. APPLIED se muestra únicamente tras recibo real; UNKNOWN/PENDING no significa ausencia de efectos. El flujo de imágenes existente sigue conservando sólo metadatos y no bytes.

**Correspondencia comprobada:** el serializador actual de colecciones (`AssistanceService.page`) omite `contactSourceRef` y `objectId`, pero conserva `AssistanceEvidence.sourceRef`. Para filtrar actas, Web cruza su `sourceRef.id` con `administrative-references/evidence-sources.items[].sourceRef.id` y comprueba el `partyId` autorizado. No usa el id opaco de la fuente como evidenceId. La asociación obtenida del recibo APPLIED se mantiene adicionalmente en memoria y se elimina al salir del caso. Si ninguna representación disponible permite comprobar la asociación, se bloquea su uso; no se infiere por posición, etiqueta o identidad actual. No se amplía ninguna proyección ni se modifica backend.


## Matriz de verificación y límites

| Escenario | Comprobación |
| --- | --- |
| Siete schemas, nullable, ISO, dinero/revisión string y respuesta malformada | Pruebas Web de contrato; datos inválidos no habilitan comandos. |
| Permisos, filtros extra, paginación/deduplicación, cursor ajeno/expirado | Unitarias y HTTP real; evidencia detallada en informe adjunto. |
| Cambio de actor/rol/caso y respuesta tardía | Componentes con promesas diferidas y cancelación/eliminación de caché. |
| Primera obligación y UNKNOWN≠cero | Selector de participación, sin obligación previa; null permitido sin exigir importe HTML. |
| Nota de otra parte, método ausente, fuente alterada/ajena | Unitarias y rechazo HTTP real; no hay hashes calculados por Web. |
| Sesión vencida/revocada y propuesta | Unitarias de vencimiento; HTTP candidato/propuesta se documenta por separado de aplicación. |
| Cobro original | Selector Web → DTO exacto → HTTP DECLARED y original inmutable. |
| Recibo histórico | Fixture explícito; selector usa requestId. No acredita por sí solo liberación completa. |
| Respuesta perdida, mismo intento y reinicio | HTTP recuperación/replay; cifrado y bloqueo de reconstrucción en pruebas Web. |
| Flag OFF, vacíos, teclado, 1280/320 px | HTTP/navegador y componentes, sin habilitación por caché. |

**EXISTING_RELEASE completo pendiente:** faltan en el fixture un inventario positivo verificado sin obligaciones/movimientos/cobro, confirmaciones de disponibilidad aplicables y la propuesta revisada/aprobada antes de aplicar. La lectura/selección de un recibo histórico no acredita esas condiciones. No se fabrica una liberación o reembolso para cerrar esta evidencia. Tampoco se acredita UI Android, operación remota, llamadas humanas reales, custodia física o proveedores reales.

La evidencia backend histórica (43 E2E/765 unit/40 B2B) no es una ejecución Web. Las nuevas ejecuciones, fallos intermedios y resultados finales se registran en `VERIFICATION.md` y el manifiesto de esta ampliación. La verificación conjunta inicial de los dos commits fue 1566/1566 en 77 archivos, tipos/lint/build PASS; precedió a esta implementación.

## Resultados nuevos archivados

HTTP NUEVO final: `node scripts/verify-admin-references-http.mjs` **12/12 comprobaciones PASS**, Nest/PostgreSQL sintéticos y65 migraciones. Incluye siete secciones/paginación, proveedor403 y cursores ajenos, fuente alterada/ajena/obsoleta, contribución→acta→identidad desde navegador, respuesta perdida/recibo/replay exacto, sesión→propuesta con barrera de revisión, primera obligación, parada→parte, cobro original→DECLARED sin modificar original, recibo histórico con requestId exacto,1280/320px/teclado/flagOFF y cursor expirado tras cinco minutos reales. Cierre Nest/PostgreSQL confirmado; fuentes backend verificadas sin cambio.0 errores de navegador. El recibo de liberación es fixture histórico; **no se acredita EXISTING_RELEASE completo**. Capturas revisadas sin referencias privadas, cuerpos o credenciales.

Suite global final: **1596/1596,79 archivos**,105.33s; tipos, lint, build y formato PASS. Advertencia de bundle>500kB conservada. Detalle verificable: [informe HTTP](evidence/qa-combined-admin-references-2026-10-25/http-report.json), [suite global](evidence/qa-combined-admin-references-2026-10-25/admin-references-global-final.txt), [manifiesto](admin-references-web-evidence.json). Reproducción: `npm test`, `npm run typecheck:test`, `npm run lint`, `npm run build`, `node scripts/verify-admin-references-http.mjs`. El harness requiere WSL Mandaria-Postgres, Node24/PostgreSQL18 y dependencias Linux locales; no instala ni descarga dependencias.

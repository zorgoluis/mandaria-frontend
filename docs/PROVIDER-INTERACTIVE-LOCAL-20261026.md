## 2026-10-26 — Revisión final y commit local QA de MDR-000001

Diff revisado sobre QA5173644: supervisor local de preparación, evidencia UI de reclamo/asignación, dos muestras GPS y continuidad. Sin cambios de producto, dependencias, configuración ni versión (Web1.11.0). Las menciones históricas «pendiente»/«sin commit» describen sus etapas originales; este commit incorpora el cierre posterior sin sobrescribirlas.

Revisión NUEVA: sintaxis Node, ESLint y Prettier del supervisor PASS; seis hashes históricos coinciden; seis copias GPS coinciden byte a byte con fuentes Driver/Coita; correlación de ambas muestras y los dos POST de negocio (claim200/assignment201) verificada. Capturas revisadas visualmente, registros sin credenciales/tokens. No se repitieron HTTP operativo, GPS, suite global, tipos ni build; sus cifras anteriores siguen históricas. Sin hallazgos nuevos de producto. Primera comparación nominal GPS indeterminada se conserva como limitación.

Evidencia GPS ahora autocontenida bajo docs/evidence/reserved-assignment-20261026/: coita-sample{1,2}-map.png, coita-sample{1,2}-observation.json y driver-sample{1,2}.jsonl. review-manifest.json registra origen, SHA256, correlaciones y alcance. Sólo datos sintéticos. Sin backend/móvil modificados, push o despliegue; no nuevas muestras ni hitos.

## Cierre coordinado — dos muestras observadas, 26/10/2026 22:54 México

Reclamo/asignación Web, PICKED_UP Driver y dos observaciones visuales Coita acreditados en entorno local sintético. Mismo pedido cb9609f4-c9b5-40a3-8dce-148f1aa9db2d, intento 4e86bc19-3bfa-4a6a-8502-62f2697aaa03, MQ-000001 (55 MXN), MDR-000001, dispatch 7e9272b5-10ca-4ceb-b1c1-3fbf78cbf632 y assignment 0aebcbc2-b8e1-45f2-b6c1-2c9c190f0ee9 ACTIVE de Ana/fleet1. La entrada inferior conserva ejecución Web y correlaciones verificadas antes de mutar.

Driver acredita UI de producto mediante instrumentación Android y HTTP/storage reales: TO_PICKUP revisión2 a04:44:56Z, AT_PICKUP revisión3 a04:46:09Z y PICKED_UP revisión4 confirmadoUI04:47:35.875834Z (comando04:47:28.325056Z). Horas UTC del27/10/2026, México restar6h. Dos intentos iniciales del harness se detuvieron ante el siguiente diálogo; su responsable corrigió instrumentación y reanudó el hito restante, sin repetir anteriores. No son tres recorridos completos.

| Muestra | Secuencia Driver | ACK UI Driver | capturedAt Coita | receivedAt Coita | locationVersion | Observación Coita |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 04:48:30.292Z | 04:48:16.343Z | 04:48:30.685Z | "11" | Marcador y tiles Google, RECENT |
| 2 | 2 | 04:52:02.477Z | 04:51:49.530Z | 04:52:03.342Z | "12" | Nuevo marcador y tiles Google, RECENT |

Ambas lecturas CUSTOMER: publicVersion="13", assignmentGeneration="4", ACTIVE/PICKED_UP. Stream Driver 1e75dd95-e8a1-44a0-a5f7-2f5834b90c35, revisión"6"; secuencias corroboradas por GET DRIVER posterior. ACK visual no distingue ACCEPTED de DUPLICATE: no se interceptó bodyPUT. Posiciones simuladas en AVD5582 mediante geo fix, capturadas/publicadas por LocationManager/FGS de producto; no movimiento físico ni PUT de script. GPS detenido por UI después de cada ACK, parada final04:52:02.777957Z. Coita confirmó readiness y observación de primera antes de segunda; ambas capturadas visualmente antes de caducar.

Límites: segunda coincide nominal dentro1m; comparación exacta de primera negativa y causa aún no acreditada. No atribuir automáticamente a precisión/redondeo. Primera lectura adicional Coita recibió429 y respetó retryAfterSeconds10. Lecturas posteriores STALE no contradicen capturas RECENT. Borrado UI al eraseAfter de muestra2 (05:01:49.530Z), escenarios disruptivos, replay y dispositivo físico no probados en este recorrido. Servicio queda PICKED_UP, no completado.

Versiones: Web1.11.0 / QA517364483b7960999321b8674cbab63c02208cee; Driver realDebug1.0.0/code112 APK SHA256 b4d81a8a205a96cc31da7dc0695319fc367600e702ab1eac3d52cff118d26e51; Coita debug2.2.0/code20200 APK SHA256 d80d00886df4f4e3cc1010816b9b2db59732fb227e2b4ca61684e77b1a985712. API Mandaria56597, Coita65397, Web5173. Resultados Android entregados por sus responsables, no pruebas ejecutadas desde Web.

Fuentes y evidencia:
- Web: docs/evidence/reserved-assignment-20261026/assigned.png y http-ui.json (sanitizado).
- Driver: C:/Users/zorgl/Documents/mandaria-driver/androidApp/GPS-COITA-LOCAL-20261026.md, checks/gps-coita-reserved-two-points-20261026.json y build/coita-reserved-gps/sample{1,2}.jsonl/capturas.
- Coita: C:/Users/zorgl/Documents/coitaeatsapp/docs/checkout-transfer-address-diagnosis.md y build/interactive-local-20261026/sample{1,2}-map.png / sample{1,2}-observation.json.

Sólo evidencia/continuidad Web modificadas en esta coordinación, cambios pendientes preservados. Sin nueva suite global Web (cifras inferiores históricas), cambios de producto/versiones, commit/push o despliegue. Sin reinicios, tercera muestra, cobro ni completion.

## Reclamo y asignación del pedido reservado — 26/10/2026 22:40 México

Autorización humana nueva: reclamar/asignar el pedido reservado a Ana/fleet1; Driver UI hasta PICKED_UP y dos muestras LocationManager/FGS coordinadas con Coita. Web ejecutó sólo reclamo/asignación, no hitos ni GPS.

Cadena comprobada antes de mutar por lecturas de responsables: checkout/externalReference a6764b7a-b75c-4578-ba82-562df3fe9001 → orderId cb9609f4-c9b5-40a3-8dce-148f1aa9db2d → intento vigente4e86bc19-3bfa-4a6a-8502-62f2697aaa03 → MDR-000001 / MQ-00000155MXN → dispatchId7e9272b5-10ca-4ceb-b1c1-3fbf78cbf632. Coita confirmó relaciones persistidas; Mandaria confirmó despacho/MDR/MQ por API. La referencia externa identifica checkout, no orderId. Una revisión automática inicial rechazó abrir reclamo por esa incertidumbre, sin ejecutarlo; sólo se reintentó tras obtener la cadena explícita.

Web UI local: ADMIN_DISPATCH revisión0, costo4créditos, comida PREPAID80MXN sin adelanto; envío55MXN RECIPIENT/CASH al entregar. POST claim200 a2026-10-27T04:40:07.525Z; POST assignment201 a04:40:33.972Z. Una acción exitosa de cada tipo. UI muestra MDR-000001, Asignado/Asignación vigente, Ana y FLEET1. Captura: docs/evidence/reserved-assignment-20261026/assigned.png. Tráfico sin tokens/cuerpos: http-ui.json; incluye NETWORK_ERROR de lecturas durante invalidaciones/refresco, seguidas de200; no se declara ausencia total de errores de lectura.

GET PROVIDER_ADMIN a04:41:27.806Z: assignmentId0aebcbc2-b8e1-45f2-b6c1-2c9c190f0ee9 ACTIVE, assignedAt04:40:33.900Z, Ana b22656db-ab07-4ccd-a939-adddebecb107 / fleet1 9fcb1868-8711-4626-9d7f-1ab1d33ffc49. DETAILED, revisión ejecución1, phase=null, NOT_COLLECTED, lastRecordedAt04:40:33.928Z. Lectura independiente DRIVER04:41:27.001Z confirmó esa misma asignación. No se infiere PICKED_UP de la asignación.

Coita App READY para muestra1, pantalla del pedido en emulator-5580 y polling15s. Driver recibió permiso operativo del usuario y correlaciones para avanzar por UI a PICKED_UP/publicar sólo muestra1, esperando acuse antes de muestra2. Versiones/timestamps GPS y aceptación visual de ambas aún PENDIENTES en este punto; se actualizarán con evidencia de sus responsables, sin confundir API/dobles con LocationManager.

Sin reinicios, cambios de flags/credenciales, cobro físico, entrega/completion, reasignación, GPS por script, versión, commit/push o despliegue. Evidencia e informes anteriores conservados como historia.

## Handoff reservado/GPS — 26/10/2026 21:31 México

Revisión de sólo lectura. No hay reclamo/asignación del pedido reservado acreditados por la evidencia Web disponible. Referencia/MDR, dispatchId, assignmentId, orderId Coita, fase y ACTIVE vigente: PENDIENTES. No se creó ni seleccionó otro servicio.

Comprobaciones nuevas: GET localhost:5173 →200; GET Mandaria56597/api/v1/health →404 (ruta no disponible, no acredita caída). mandaria-interactive.mjs status confirma ready/PID41072, mismos providerId/driverId/vehicleId, saldo100 y fcm=false. Coita65397/api/v1/health →ECONNREFUSED. El inventario del navegador de este chat no ofrece pestaña/sesión autenticada; sin login ni consulta privada nueva. El supervisor no acredita modalidad, asignación, fase o GPS habilitado.

Correlaciones conocidas: proveedorA 42c2e5f8-22ac-4812-8c0b-1d24a242220f; Ana b22656db-ab07-4ccd-a939-adddebecb107; fleet1 9fcb1868-8711-4626-9d7f-1ab1d33ffc49. ADMIN_DISPATCH revisión0, Ana desconectada, fleet1 sin asignar y listado vacío corresponden a la UI histórica inferior, no al estado vigente de esta revisión. Evidencia histórica: docs/evidence/provider-interactive-20261026/services.png. No hay captura de reclamo/asignación ejecutados.

Fuente Driver leída: C:/Users/zorgl/Documents/mandaria-driver/androidApp/GPS-COITA-LOCAL-20261026.md. A21:16 informó activeDeliveryAssignment=null,401 REAUTH_REQUIRED en fleet-operation-context tras login, tracking OFF según handoff y cero muestras. Ese diagnóstico no se reejecutó aquí. Dos muestras reales LocationManager/FGS: PENDIENTES; sin timestamps/secuencias/ACK reales para correlacionar. Pruebas API/dobles no las sustituyen.

Requisitos para reanudar, fuera de esta autorización de lectura:
1. Mandaria: snapshot compartido con contexto DRIVER válido y GPS local habilitado. La corrección probada en aislamiento no acredita aplicación a56597; cualquier intervención debe coordinarse, sin reinicio durante servicio ni FCM.
2. Coita: entorno compartido disponible y relación real orderId↔MPQ/MQ/MDR↔dispatchId de un envío aceptado, elegible y explícitamente reservado. No sustituirlo por pedidos PICKUP sin MDR o por otra instancia.
3. Con autorización operativa posterior, Web: revalidar modalidad/recursos, reclamar y asignar ese despacho exacto a Ana/fleet1, comprobar ACTIVE/fase y registrar IDs/evidencia UI. Esta petición no autoriza tales mutaciones.
4. Driver: comprobar asignación propia/canPublish y, con autorización de captura/fase, producir dos muestras mediante LocationManager/FGS con ACK y correlaciones sanitizadas. Coita muestra al destinatario desde PICKED_UP; no avanzar fase ni publicar por script para completar esta revisión.

Sin reinicios, flags/credenciales, pedidos, asignaciones, hitos, GPS, FCM, backend/App, versión, commit/push o despliegue. Evidencia previa y cambios pendientes preservados. La sección inferior conserva su ejecución histórica.

# Mandaria Web local: preparación de reclamo y asignación

Fecha: 2026-10-26. **Preparación PASS; reclamo y asignación PENDIENTES** por ausencia de un despacho OPEN destinado al ensayo. El usuario no dispone de dispatchId. No se eligió otro servicio ni se creó un despacho artificial.

## Entorno probado

- Web `http://localhost:5173`, API efectiva `http://127.0.0.1:56597/api/v1`.
- QA, HEAD `517364483b7960999321b8674cbab63c02208cee`, versión 1.11.0. Árbol inicial limpio; commits B2B/aprobaciones conservados.
- Proceso frontend propio PID 21788, listener `::1:5173` (loopback). Preview de build real, no servidor con respuestas mock. Sin Docker ni despliegue.
- SHA256 agregado del manifiesto del build: `5e57239437ee61a17fc2d94d275e3548bc3a6e742ecd286502ed0e6d35cee9ac`. Hashes de cada archivo en el [manifiesto](provider-interactive-local-evidence.json).
- Configuración exclusiva del harness: `envDir:false`, sin cargar .env; `VITE_API_URL=http://127.0.0.1:56597`. Ningún secreto de fixture se pasa al build. Un script de observación añadido sólo al HTML local registra método, origen/ruta y status de fetch, nunca bodies, headers, query, contraseñas o tokens. No sustituye respuestas ni endpoints.
- Navegador real IAB, dueño sintético PROVIDER_ADMIN leído por código del fixture autorizado y usado en el formulario de login. Sin publicar credenciales ni guardar HAR/storageState.

## Resultados actuales

| Comprobación | Evidencia / resultado |
| --- | --- |
| Mandaria disponible antes de trabajar | status ready, sin reiniciar ni detener |
| Login y contexto de proveedor | PASS, proveedor A / Propietario |
| Modalidad | ADMIN_DISPATCH, revisión 0 |
| Listado de disponibles | PASS lectura HTTP real; vacío |
| Conductor ana | Activo, Desconectado, sin vehículo actual; elegibilidad final pendiente |
| Motocicleta fleet1 | Activa, sin asignar |
| Créditos | 100, una recarga sintética +100 visible; sin cambios |
| Destino HTTP del navegador | 35 registros sanitizados, todos hacia 127.0.0.1:56597/api/v1, sin 4xx/5xx |
| Reclamo | PENDIENTE, ningún comando enviado |
| Asignación ACTIVE | PENDIENTE, ningún comando enviado |
| Doble clic, respuesta tardía, 409 y cargos | Pendientes contra servidor real; no confundir con regresiones con mocks |
| Presentación comida/envío/estado/cobro y límites del dueño | Pendiente sobre detalle del servicio real; no se intentó provider/deliver |

Regresiones NUEVAS con mocks: seis archivos dispatch/dispatch-api/delivery-assignments/delivery-assignments-api/credits/credits-api, **143 PASS**, cero fallos/omisiones. No son 143 llamadas de aceptación contra Mandaria y no se suman con pruebas históricas.

Tipos de producto `node node_modules/typescript/bin/tsc -b`, tipos de pruebas `node node_modules/typescript/bin/tsc --project tsconfig.test.json`, lint global `node node_modules/eslint/bin/eslint.js .`: PASS. Build Vite local usa el mismo plugin React del proyecto y configuración de API explícita; PASS, conserva aviso conocido chunk >500 kB. Sintaxis, formato y lint focal del supervisor PASS. No se ejecutó npm run build directamente porque cargaría el entorno habitual: se ejecutaron sus etapas tsc/Vite con envDir desactivado y salida aislada.

Sin defectos funcionales nuevos acreditados que requieran modificar producto. Sólo se añadió supervisor/evidencia/continuidad. Incidencias de herramientas: Git restringido dentro del sandbox (lectura elevada correcta); performance API no disponible en el navegador (se observó fetch mediante HTML del harness); escritura inicial de captura denegada fuera del workspace (guardada en ubicación autorizada y copiada). No se presentan como fallos de producto. La etiqueta visual histórica V1.10 del menú no cambia la versión 1.11.0 del paquete/build.

## Recursos y operación

Desde `C:\Users\zorgl\Documents\mandaria-frontend`:

```powershell
node scripts/provider-interactive-local.mjs status
node scripts/provider-interactive-local.mjs start
node scripts/provider-interactive-local.mjs stop
```

`start` reutiliza el preview propio si responde; puerto estricto5173, sin matar ocupantes. `stop` usa control autenticado propio y cierra sólo frontend. No detener Mandaria ni Coita. El estado privado de control y logs están en `test-results/provider-interactive-local`, ignorado por Git y ACL restringida al usuario/SYSTEM. No imprimir session.private.json.

Para reconstruir explícitamente (no durante un ensayo): detener sólo frontend, ejecutar `node node_modules/typescript/bin/tsc -b`, `node scripts/provider-interactive-local.mjs build`, y `start`. La reconstrucción cambia el artefacto; repetir aceptación y registrar nuevo hash. No requiere copiar credenciales ni .env. El proceso quedó disponible y la pestaña de servicios se conserva para continuar.

## Handoff pendiente a Coita y mandaria-driver

Solicitar al responsable Coita un despacho de esta sesión creado por **MPQ → conversión → consentimiento MQ → aceptación**, con `dispatchId` y correlaciones pedido/MPQ/MQ/MDR, explícitamente reservado a este ensayo. No hay dispatchId ni assignmentId para entregar todavía.

Actores observados:

- providerId: `42c2e5f8-22ac-4812-8c0b-1d24a242220f`
- driverId ana: `b22656db-ab07-4ccd-a939-adddebecb107`
- vehicleId fleet1: `9fcb1868-8711-4626-9d7f-1ab1d33ffc49`

Antes de reclamar, refrescar disponibilidad y revisar el servicio exacto. Ana figura Desconectado: que el responsable del conductor revise su disponibilidad mediante su interfaz/API autorizada; no se cambió aquí ni se afirma que sea elegible para asignación. No liberar recursos de otros ensayos.

Con el despacho confirmado: reclamar desde UI, verificar transición y cargo según política/respuesta (55 MXN no equivale a créditos); asignar desde UI sólo a recursos elegibles; validar ACTIVE, recarga, ausencia de duplicados y tratamiento409. Dejar asignación al conductor y entregar assignmentId. El conductor ejecuta hitos y completion; el dueño no debe cerrar el servicio detallado. Mantener comida PREPAID y envío RECIPIENT/CASH separados; DELIVERED no acredita cobro físico.

[Evidencia de listado vacío](evidence/provider-interactive-20261026/services.png), snapshots y tráfico sanitizado bajo `docs/evidence/provider-interactive-20261026/`. Backend sólo consultado con status/access; no bases, cambios de configuración, FCM, correo externo, QA, publicación, versión, commit/push ni modificaciones Coita/móvil.

### Acuse final Driver — 26/10/2026, posterior al cierre coordinado

El responsable Driver confirma informe/manifiesto actualizados y dos ACK/dos mapas. Coita reporta para muestra2 accuracy=5m y delta nominal=0.173m; dato atribuido a su responsable, no medición nueva Web. Para muestra1 no se conservaron coordenadas/accuracy, sólo comparación exacta negativa: precisión indeterminada, sin causa ni delta cuantificables y sin repetir capturas. GPS detenido y dumpsys servicios sin servicio activo; Driver cerró únicamente AVD propio5582 conservando app/datos. Coita5580, servidores y teléfono intactos. Servicio PICKED_UP revisión4, sin completion/cobro. Frescura completa, pérdidas y outcomes PUT específicos siguen sin acreditarse por estas dos muestras.

# Zonas propias del independiente — sincronización Web/backend 1.13.1

Fecha: 2026-10-25. Web 1.11.0, QA base 19d30bc. Implementación local sin versión, commit, push ni despliegue. Desvinculación 1.0.0, asistencia/movementContext y FLEET previos se conservan.

## Contrato y navegación

La ficha `/independent-drivers/:driverId` consulta el perfil real existente y pasa `profile.id` al panel `IndependentOfferZones`. Sólo SUPER_ADMIN lo monta. Un perfil ausente no dispara consultas de zonas ni una creación de perfil. Se reutilizan AuthContext, Confirm/Field, React Query, apiOnce y el catálogo administrativo `serviceZones.list({page,pageSize:25,status:'ACTIVE'})`. Autorizar cobertura no edita geometría.

| HTTP | Ruta efectiva | DTO |
| --- | --- | --- |
| GET | `/api/v1/admin/independent-drivers/:profileId/offer-zones` | `{revision,zoneIds}` |
| PUT | misma ruta | body `{requestId,expectedRevision,zoneIds,reason}`; respuesta `{revision,zoneIds,requestId}` |

`requestId` UUID va exclusivamente en body; no Idempotency-Key. Revisiones string exactas, aritmética de comprobación del recibo con BigInt. Lista de 0..100 UUID únicos; motivo explícito de 3..500 caracteres. El catálogo carga páginas sin perder selecciones. Las autorizaciones existentes aún fuera de la página se conservan y pueden retirarse; no se inventan referencias. La lista vacía exige confirmación titulada «Retirar todas las autorizaciones».

Fuentes backend consultadas en sólo lectura: CLIENT-SYNCHRONIZATION-REVIEW-2026-10-25, INDEPENDENT-OFFERS-CONTRACT, FLEET-EXIT-INDEPENDENT-TRANSITION-HANDOFF, OpenAPI y offers.controller/dto/service. Los schemas OfferZonesDto/OfferZonesResponse y OffersService.zones/mutate acreditan estas rutas actuales. No se utiliza el protocolo de salida para modificarlas.

## Intención, replay y concurrencia

Antes del PUT se guarda cuerpo completo, requestId, ruta, fecha y scope actor/entorno/perfil en IndexedDB con AES-GCM y clave no exportable, siguiendo el mecanismo durable de asistencia/salida en un almacén separado. Inserción atómica impide reemplazar una intención pendiente; Web Locks serializa acciones del mismo scope y BroadcastChannel invalida borradores de otras pestañas. Sin almacenamiento o bloqueo disponible no se envía. Busy ref impide doble clic. Desmontar/cambiar de actor impide incorporar respuestas tardías.

Flujo: lectura vigente → edición → revisión humana → persistencia → envío único. Timeout/error conserva la intención. Tras recargar se puede consultar estado y reenviar sólo el mismo body/requestId. Una lectura coincidente nunca identifica al autor ni borra la incertidumbre.

OffersService.mutate busca el recibo por usuario/requestId y verifica fingerprint ANTES de comprobar expectedRevision. Un replay exitoso devuelve el recibo histórico incluso si otro administrador modificó luego las zonas. Por ello se presenta el recibo separado y se refresca la proyección vigente; no se sobrescribe con ese recibo. Las mutaciones fallidas no guardan un recibo exitoso. REVISION_CONFLICT refresca; sólo con revisión vigente distinta permite reconocer expresamente el conflicto y volver a revisar una nueva intención. No hay rebase automático.

Tras confirmar recibo y lectura vigente, el usuario puede reconocerlo y liberar su intención. El límite documentado de retención de recibos es siete días: el cliente bloquea replay desde siete días de persistencia para evitar convertir un reenvío antiguo en escritura nueva. No hay endpoint de recuperación/cierre de zonas; no se usa `/fleet-exit-attempts`. ZONE_NOT_ALLOWED o IDEMPOTENCY_KEY_REUSED conservan intención y explican la incidencia. No se fabrica un cierre técnico; si no puede obtenerse recibo/conflicto concluyente queda pendiente revisión asistida.

## Permisos y efectos

Consultas aisladas por actor/perfil, gcTime 0, sin retry automático. 401 pide reautenticar la misma cuenta; 403/404 ocultan proyección/recibo y bloquean edición. FEATURE_DISABLED bloquea nuevos cambios; una lectura fallida nunca autoriza desde caché. Los errores de red conservan incertidumbre. Tras PUT se releen zonas y se invalidan proyecciones fleet-exit. No se agregan sockets ni notificaciones externas.

Autorizar zonas no aprueba un perfil, levanta restricciones, hereda cobertura FLEET, selecciona una zona ni inicia turno. DRIVER sigue usando sus mecanismos existentes de recepción. El proveedor no recibe acceso a esta administración ni a actividad independiente futura.

## Archivos

- `src/independent-zones/service.ts`: cliente tipado, validación del contrato y mensajes.
- `src/independent-zones/intent.ts`: intención cifrada, locks, replay y retención.
- `src/independent-zones/panel.tsx`: lectura, catálogo paginado, edición/confirmaciones y recuperación.
- `src/independent-drivers/pages.tsx`: inserción del panel con el profileId real.
- `src/test/independent-zones*.test.*`, `driver-portal.test.tsx`: nuevas pruebas y composición de ficha.
- `delivery-assignments*.test.*`, `vitest.config.ts`: estabilización verificada de suite global.
- `scripts/client-sync-http-wsl.mjs`, `verify-client-sync-http.mjs`: ensayo real aislado, conservando los scripts/evidencias históricos.

## Matriz de validación

| Caso | Evidencia actual |
| --- | --- |
| Roles no SUPER_ADMIN, perfil ausente, driverId != profileId | Vitest de componentes/composición; IDs distintos también HTTP |
| Motivo, duplicados, máximo 100, lista vacía, revisión >2^53 | Vitest cliente; vaciado confirmado también HTTP |
| Catálogo activo paginado y conservación de selección | Vitest + navegador HTTP con 26 zonas sintéticas adicionales |
| Persistencia previa, doble clic, cambio de cuenta/respuesta tardía | Vitest; cifrado y restauración también navegador HTTP |
| Respuesta perdida, reload y replay idéntico después de otro administrador | HTTP real, recibo histórico separado de proyección vigente |
| Conflicto, revisión humana y nueva intención; flag OFF | Vitest + HTTP real |
| 401, ZONE_NOT_ALLOWED, IDEMPOTENCY_KEY_REUSED, red | Vitest con servicios simulados; no se presentan como HTTP real |
| DRIVER allowedZones, selectedZoneId=null, shift=null | HTTP real; no acredita UI Android |
| Salida y movementContext previos | Suite global + 12 comprobaciones HTTP reejecutadas |
| ACCOUNT_CLOSING y reauth de dueño original | HTTP real: solicitud de eliminación por API existente, recuperación redactada sin comandos nuevos |
| Expiración de cursor | HTTP real tras esperar cinco minutos, 400 INVALID_CURSOR y reinicio autorizado |
| Custodia resuelta | HTTP de eventos/incident/resolve existentes y finalización de salida; no se acredita interacción UI de custodia |

## Estabilización y evidencia

La reproducción inicial Web ejecutó 1528 pruebas: 1508 PASS, 20 FAIL. Diecisiete fixtures de asignación omitían trackingMode (se hizo explícito LEGACY); una expectativa de etiquetas omitía RETURNED/TRANSFERRED. No se relajó código de permisos. Dos fallos de finalización/dispatch eran sensibles a carga con instancias jsdom concurrentes; se limitó maxWorkers a 4 conservando tests y deadlines. No se aumentó timeout ni se omitieron pruebas.

Primer pase global con zonas: 1553 PASS/2 FAIL. Ambos nuevos fallos provenían de la ficha de pruebas que ahora monta otro panel: faltaban mocks de su lectura/almacenamiento, creando alertas adicionales. Se completó la fixture del perfil y se añadieron pruebas de profileId/ausencia. Los servicios se simulan sólo en Vitest; HTTP utiliza Nest/PostgreSQL reales.

El primer intento del nuevo harness HTTP falló al crear zonas con geometrías superpuestas: rechazo correcto 409 del backend. Se separaron las geometrías sintéticas; no se cambió backend. Segundo intento: 18 comprobaciones PASS, `complete:true`, sin networkErrors inesperados; 65 migraciones, backend compilado desde fuentes verificadas, procesos cerrados y fuentes backend intactas. Reporte, requests sin headers/cuerpos/credenciales y capturas en `docs/evidence/client-sync-2026-10-25`.

Comandos: `npm test`; `npm run typecheck:test`; `npm run lint`; `npm run build`; `node scripts/verify-client-sync-http.mjs`. El harness usa WSL Mandaria-Postgres, Node24, PostgreSQL18 desechable en 55484, API4237 y Web4238. Flags sólo en proceso sintético; routing/mail simulados, FCM/socket desactivados. El manifiesto conserva huellas y resultados finales. Las cifras históricas backend y de informes previos no se suman a esta ejecución Web.

Pendiente externo: verificar UI/recepción Android siguiendo [handoff móvil](INDEPENDENT-OFFER-ZONES-MOBILE-HANDOFF.md). Retención de siete días y fallos de infraestructura se prueban con simulación; no se esperaron siete días reales. No hay bloqueo local de zonas por el futuro contexto administrativo de asistencia. Permanece advertencia de tamaño de chunk en build.

Durante el pase adicional de errores se detectó una carrera en el helper de pruebas de zonas: encontraba el botón Editar antes de que terminase la lectura inicial y pulsaba mientras estaba deshabilitado. Se añadió espera explícita de `toBeEnabled()` antes del clic, sin cambiar deadlines ni comportamiento de producto. El pase intermedio se conserva como `global-pass3.txt`.

Resultado final de esta ejecución: `npm test` **1563 PASS/0 FAIL, 77 archivos, 99.25s**; `npm run typecheck:test`, `npm run lint`, `npm run build` y formato focalizado PASS. Son 35 pruebas adicionales frente al baseline de esta tarea. La advertencia de chunk >500kB permanece. Véase `docs/client-sync-web-evidence.json` para huellas de fuentes y artefactos; no hubo incremento de versión ni commit.

## Revisión y commit local QA separado

Base263a4b9 (B2B ya separado). Revisión de roles/profileId, contrato PUT/revisiones exactas, persistencia/replay, concurrencia, conflictos y privacidad sin hallazgos bloqueantes. No se modifica código de producto en esta revisión. Ejecución nueva: `npx vitest run src/test/independent-zones-api.test.ts src/test/independent-zones.test.tsx src/test/driver-portal.test.tsx src/test/delivery-assignments-api.test.ts src/test/delivery-assignments.test.tsx`,107/107 PASS en5 archivos (15.18s).

Se verificaron34 huellas anteriores excluyendo los dos documentos compartidos de continuidad. Se conserva el ensayo HTTP18/18 PASS y su limpieza/backend intacto, sin reejecutarlo ni atribuirle fecha nueva. La suite global1563, tipos/lint/build previos son evidencia histórica. Se incluyen los pendientes Android/retención real ya documentados. Logs sólo normalizados en espacios finales/EOF, con huellas originales preservadas en el manifiesto. Versión1.11.0 intacta; commit local autorizado en QA sin push, publicación ni despliegue.

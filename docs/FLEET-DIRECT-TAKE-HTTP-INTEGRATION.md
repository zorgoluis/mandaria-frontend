# Integración HTTP FLEET local — 2026-10-23

Resultado: 10 escenarios completos PASS en `test-results/fleet-http-1792783122772/report.json`. Evidencia persistida con huellas en [fleet-direct-take-http-evidence.json](fleet-direct-take-http-evidence.json). Complementa la validación Web simulada anterior; no equivale a despliegue ni aprobación operativa.

## Entorno y reproducción

Web: `C:/Users/zorgl/Documents/mandaria-frontend`, QA, base `58f4d519eed500e96e0aa9586e93e47ba377dff7`. Backend existente, leído sin reconstruir: WSL `Mandaria-Postgres`, `/home/mandaria/backend-offers-20261023`. Node `/opt/mandaria-node/node-v24.15.0-linux-x64/bin/node`, PostgreSQL 18. Chrome instalado en la ruta declarada del arnés.

Ejecutar `node scripts/verify-fleet-http.mjs` desde el checkout Web. Requiere WSL y puertos loopback 4227 (API), 4228 (Vite) y 55483 (PostgreSQL) libres. El arnés `scripts/fleet-http-wsl.mjs` crea un clúster propio en `/tmp/mandaria-fleet-web-*`, verifica identidad/puerto, aplica las 63 migraciones existentes y prepara fixtures sintéticos. No usa el clúster habitual ni modifica backend o .env. En esta ejecución: `/tmp/mandaria-fleet-web-wZlKo5/pgdata`, base `mandaria_fleet_web_test`.

Nest conserva controladores, guards, servicios y autenticación reales. Se ignoran archivos de entorno; configuración sólo del proceso. FLEET se habilita únicamente en ese proceso desechable. Routing usa el doble del fixture backend, correo va a outbox local, conexiones externas bloqueadas. Credenciales efímeras circulan por pipe y memoria; los artefactos no guardan tokens, cuerpos ni cabeceras de autorización.

## Resultados observados

- Login real del dueño, contexto, historial y envelope privado sin contacto ni contenido del paquete sembrados.
- Enlace antiguo no solicita la proyección legacy. Ocho mutaciones operativas devuelven 403 real.
- Revocación de gasto: el servidor confirma PUT; el navegador pierde esa respuesta por inyección de fallo. Tras recargar se reenvían exactamente UUID y cuerpo. Operaciones SPENDING: 2 antes, 3 tras pérdida, 3 tras recuperación. Asignación ACTIVE: 1 antes y después. Ledger del despacho sin cambios.
- Escritura concurrente real cambia revisión; la Web exige revisar de nuevo y cierra confirmación obsoleta.
- PAUSED conserva observación y deniega operación. ADMIN_DISPATCH conserva lectura; DRAINING deniega claim.
- Cursor malformado llega al servidor: 409 ECONOMIC_CONTEXT_CHANGED. Se borran filas visibles y refrescar recupera el historial.
- Paginación real de listado y detalle: 27 segmentos, páginas 25 + 2; filtros reinician consulta y un despacho ajeno consultado bajo otro proveedor devuelve 404.
- Al retirar la membership sintética, actualizar contexto elimina contenido privado visible; consulta directa devuelve 403.
- Capturas de detalle real 1280/320 revisadas, sin overflow horizontal. El arnés espera el final de la transición del menú móvil antes de capturar.

Los 27 segmentos históricos se insertan como fixtures mediante Prisma, respetando transición ACTIVE → CANCELLED y triggers; no representan 27 entregas ejecutadas. La toma FLEET inicial sí usa HTTP real de conductor; las otras acciones administrativas de preparación son sólo del arnés.

## Corrección y controles

El parser compartido del backend devuelve ECONOMIC_CONTEXT_CHANGED para cursor malformado. `src/fleet/service.ts` traduce ese código únicamente en consultas con pageToken a un mensaje de refrescar historial, conservando status, code y requestId, sin reintento automático. No altera el tratamiento de conflictos económicos. Nuevo caso de transporte verifica mensaje y una sola petición.

Validación: 34/34 pruebas en fleet.test.tsx y fleet-api.test.ts; typecheck:test PASS; build PASS con aviso previo de chunk >500 kB; ESLint de src/fleet y fleet-api.test.ts PASS. Logs en test-results/fleet-http-{unit,types,build,lint}.log. Los 296 casos y la suite completa 1352 PASS/20 FAIL del informe Web son ejecuciones históricas; no se presenta una suite completa nueva como verde.

Cierre final: Nest, Vite, Chrome y PostgreSQL detenidos; processClosed y shutdown.stopped verdaderos. Huellas antes/después iguales en 10 archivos seleccionados backend (fuentes, dist, schema y migración). Comprobación posterior sin listeners WSL 4227/55483 ni auxiliares del arnés. Datos sintéticos y reportes quedan para inspección, detenidos.

Ensayos previos conservados: 1792782587407 falló al insertar directamente CANCELLED; 1792782660733 leyó métricas antes de completar el PUT; 1792782703598 esperaba 400 donde el servidor devuelve 409. Se corrigió preparación, espera y expectativa respectivamente. 1792782830208 y 1792782948265 completaron escenarios; el pase final añade espera de transición móvil. Tres auxiliares antiguos retenían timers tras cerrar API/DB; se verificó su comando exacto y se cerraron. El arnés ahora sale después del cierre confirmado. Ningún intento fallido se cuenta como PASS.

## Límites

No proveedores reales, entrega física, efectivo, servicios externos ni App de conductor validados. Nulos históricos mantienen cobertura simulada anterior. F6 y preparación operativa siguen pendientes antes de activación. Sin despliegue, commit/push, cambios Docker/.env ni modificaciones del backend. Esta evidencia autoriza únicamente afirmar integración local Web/HTTP/base real con datos sintéticos.

## Revisión para commit local en QA

Diff revisado: permisos por modo, aislamiento de caché, proyección privada, gasto con intención persistida e idempotencia, arneses aislados y correspondencia de huellas HTTP. Sin hallazgos bloqueantes. Se conservan las limitaciones y fallos históricos documentados; no se repiten ni se reclasifican las ejecuciones anteriores.

Evidencia final incluida en Git: [reporte](evidence/fleet-http-2026-10-23/report.json), [escritorio](evidence/fleet-http-2026-10-23/real-detail-1280.png) y [móvil](evidence/fleet-http-2026-10-23/real-detail-320.png). Son copias byte por byte del último ensayo, verificadas por SHA-256. Los logs y solicitudes locales permanecen en test-results. Sin cambios de lógica durante esta revisión. Commit local únicamente, sin push ni despliegue.

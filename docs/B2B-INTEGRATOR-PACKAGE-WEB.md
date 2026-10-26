# Portal y paquete B2B — revisión local 2026-10-25

Implementación Web local en QA base19d30bc; versión Web1.11.0 sin cambio. Contrato público backend1.13.1. El «1.12.0» del baseline es info.version de la copia pública antigua, no la versión npm Web. No se modificaron backend ni mandaria-driver, datos, .env o dependencias. No hubo Docker, migraciones, activaciones, commit/push, despliegue, publicación ni mensajes/envíos externos.

## Resultado y frontera

Se sincronizaron exactamente las cinco fuentes públicas por el script `scripts/sync-public-b2b.mjs`. OpenAPI, ejemplo JSON y verificador conservan contenido (sólo normalización CRLF). La lista de20 operaciones método+ruta se contrasta con la aprobación explícita del exportador backend y una frontera local congelada en `scripts/b2b-public-boundary.json`; no se deriva por prefijo. También se valida lista exacta de schemas y resolución de referencias. No se copia OpenAPI completo, API_ACCESS, handoffs, fixtures o documentación administrativa al portal/paquete.

Comparación reejecutada contra Git backend9af2185:1.13.0→1.13.1 sólo difiere info.version. La copia Web de HEAD tenía20 operaciones pero faltaban automaticDispatchSearch/DispatchSearchResponse/status.search. Se corrigió el atraso; no se anuncia búsqueda como función creada por1.13.1 ni se agregan eventos B2B de salida/asistencia.

Visor y ejemplos leen el asset descargable, sin copia embebida de schemas. Contador derivado de método+ruta. Nueva navegación «Búsqueda automática», semántica y compatibilidad legacy, origen documentado sin doble /api/v1 ni inferencia de despliegue. No hay consola de ejecución remota ni almacenamiento de secretos. La tabla de GPS ahora usa el contenedor desplazable existente para evitar overflow a320px.

### Referencias detectadas y resolución

| Referencia en guía backend pública | Frontera/problema | Sustitución pública |
| --- | --- | --- |
| V1.18-B2B.md | Handoff no acreditado como parte del paquete aprobado | Sección GPS V1.18 ya incluida en B2B-PUBLIC-GUIDE.md; visor dirige a /developers/location |
| AUTOMATIC-DISPATCH-SEARCH-HANDOFF.md | Contiene operación/configuración administrativa; no se publica | Sección «Búsqueda automática opcional después de aceptar» de la guía pública; visor /developers/search |
| PUBLIC-B2B-TRACKING.md | Archivo fuera de las cinco fuentes autorizadas y ausente del paquete | Sección «Fotografía pública versionada» de la guía; visor /developers/execution y resumen Web existente |

Sólo se sustituyen destinos Markdown, no schemas ni semántica/firma del webhook. El manifiesto del portal registra SHA256 fuente normalizada, SHA256 final y reemplazos explícitos. Se prueban archivos y anchors de todos los enlaces relativos del paquete. No se resuelven referencias publicando documentos internos. El enlace con acentos codificados se decodifica al seleccionar el destino React; su regresión pasa.

## Paquete revisable

Directorio local: `.tmp/b2b-integrator-package-2026-10-25`.
ZIP: `.tmp/b2b-integrator-package-2026-10-25.zip`.
SHA256: `e2744137f5e5395d87b644fbeb1f540753662ddb0aa477becd59ccff16ac00f0`.

Once archivos: README, las cinco fuentes públicas, CHANGELOG, AVAILABILITY, TEST-PLAN, COMMUNICATION y manifest.json. Rotulado «Borrador para revisión — no enviado/no publicado». Sin botón ni descarga pública del ZIP; fuera de public/dist e ignorado por Git. Fuentes editoriales en `docs/b2b-integrator-package/`, empaquetador `scripts/package-b2b-integrators.mjs`. ZIP STORE determinista con fecha fija y allowlist exacta; se extrae con Expand-Archive de Windows y se compara contenido/hashes, no sólo el directorio fuente. Dos regeneraciones producen los mismos bytes. El manifiesto contiene hashes de los diez archivos de contenido; el SHA del ZIP está en su sidecar y evidencia externa, evitando autorreferencia.

Regeneración desde raíz Web:

```powershell
node scripts/sync-public-b2b.mjs --check
node scripts/package-b2b-integrators.mjs
node --test scripts/b2b-integrator-package.test.mjs scripts/check-developers-entry.test.mjs
```

La copia sincronizada y empaquetada es la aprobada localmente; ante avance backend, revalidar contenido/frontera antes de volver a sincronizar. El empaquetador no borra archivos desconocidos: falla ante extras del directorio. No empaqueta repositorio, informes internos, credenciales, JWT, secretos, .env o datos operativos. El plan funcional y comunicación son borradores, no pruebas de un integrador externo.

## Pruebas nuevas y evidencia

Ejecutadas el25/10/2026 America/Mexico_City; timestamps de navegador26/10 UTC corresponden a la misma noche local. Logs y capturas en `docs/evidence/b2b-integrator-2026-10-25`; huellas en `docs/b2b-integrator-evidence.json`.

| Comando | Resultado de esta tarea |
| --- | --- |
| node scripts/sync-public-b2b.mjs --check | PASS: igualdad de fuentes con adaptación explícita de enlaces |
| npx vitest run src/test/developers.test.tsx | 25/25 PASS; schemas, navegación, permisos anónimos y ausencia de llamadas API |
| node --test scripts/b2b-integrator-package.test.mjs scripts/check-developers-entry.test.mjs | 10/10 PASS (7 paquete/contrato/firma/ZIP +3 rutas/MIME estáticos) |
| npm run typecheck:test | PASS |
| npm run lint | PASS global |
| npm run build | PASS; permanece advertencia conocida de chunk >500kB |
| npx prettier --check (siete archivos JS/TS modificados enumerados en log/comando de continuidad) | PASS |
| node scripts/verify-b2b-integrator-browser.mjs | PASS: build local en4176, escritorio1440 y móvil320;16 recorridos de sección y10 descargas (cinco fuentes por viewport), teclado, reload, schemas y MIME;0 errores/0 solicitudes externas o API |

El harness de navegador bloquea red externa y /api; usa sólo la Web estática. Verifica descarga real desde enlaces, bytes, JSON y Content-Type. Vite sirve Markdown como text/markdown y mjs como text/javascript; nginx interno tiene política text/plain para md/mjs y application/json para JSON, verificada estáticamente. No se arrancó nginx ni se acreditó su entorno remoto. Scripts cierran navegador/preview al finalizar.

Fallos encontrados/corregidos: (1) una prueba existente de enlaces detectó href con acentos codificados; se corrigió el mapeo, sin debilitar aserción; (2) el harness enviaba Tab antes de montar React: ahora espera encabezado visible; (3) overflow GPS real a320px corregido con table-scroll; (4) tres regresiones nginx buscaban `listen443 ssl` obsoleto: se ajustaron a `listen80` del servidor interno que delega TLS a mandaria-proxy, manteniendo comprobaciones exactas SPA/no fallback/MIME. Configuración nginx intacta. La primera extracción bajo sandbox no pudo ejecutar el archivo PowerShell; la prueba final usa Expand-Archive inline y pasó. Se conservan informes intermedios disponibles; no se atribuyen a fallos backend.

No se ejecutó suite global Vitest en esta tarea:1563/1563 y18 HTTP de zonas son evidencia histórica de la tarea previa, conservada. Los40 tests públicos backend también son históricos; no se suman a los resultados Web nuevos. Las huellas de implementación/evidencia de zonas se comprobaron intactas; las entradas de continuidad se amplían sin reescribir historia.

## Antes de distribuir

Falta confirmar destinatario, canal, entorno, soporte, fecha y capacidades realmente habilitadas; obtener autorización expresa de envío/publicación. Disponibilidad remota, pruebas funcionales servidor-a-servidor, recepción de un integrador y pruebas de rendimiento: por confirmar. No se consultó producción ni se crearon credenciales/cuentas para completar la matriz. El origen documentado no acredita servicio disponible. No hay bloqueo local pendiente del portal/paquete; distribución permanece fuera de esta autorización.

## Revisión para commit local QA

Revisión final sin hallazgos bloqueantes tras normalizar LF en las fuentes textuales del empaquetador: evita diferencias del ZIP causadas por checkout CRLF de Windows. Diez comprobaciones de paquete/rutas reejecutadas PASS; SHA256 del ZIP sin cambio. El commit incluye sólo B2B, fuentes regenerables y evidencia; el ZIP continúa local/ignorado, sin descarga pública. Zonas y su continuidad se preservan fuera del commit mediante selección parcial de los dos documentos compartidos. No se repiten ni atribuyen nuevas ejecuciones a los 25 tests de portal/build/navegador previos. Sin push/publicación/despliegue.

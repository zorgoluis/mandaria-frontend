# Categorías y salida voluntaria Web — 2026-10-28

## Alcance y entorno

Continuación sobre main/ffb07b1, Web 1.11.0 sin cambios de versión. Se conservan cambios pendientes anteriores. Backend consultado sólo en lectura: contratos de categorías y salida1.0.0, handoffs, E2E, OpenAPI y controladores pertinentes. La implementación documental/código existe; 1.13.4 no identifica por sí sola un servidor actualizado.

Comprobación nueva: `node C:/Users/zorgl/Documents/mandaria-backend/scripts/mandaria-interactive.mjs status` devolvió `state:offline`, `postgresRunning:false`. No se acredita URL API viva, build servido, migraciones aplicadas ni flags efectivos. No se reinician servicios compartidos. HTTP real actual: PENDIENTE. Los185 casos backend y los6 grupos HTTP Web del informe anterior son históricos, no ejecuciones de esta ampliación.

Se aplica la alternativa autorizada: pruebas independientes con dobles explícitos y prerrequisitos concretos. No SQL dual, guards desactivados, Docker, datos operativos, pedido Coita, FCM, cambios externos ni mensajes a agentes. El harness histórico prepare-category-http.mjs queda deshabilitado con error explícito para impedir reutilizar la creación de legado anterior.

## Implementación y archivos

- `src/app/App.tsx`, `src/driver-portal/pages.tsx`: rutas DRIVER propias `/driver/fleet-exits` y detalle, navegación accesible incluso cuando no puede tomar nuevos servicios.
- `src/fleet-exit/{types,service,attempts,pages,commands}`: superficie DRIVER, START VOLUNTARY_EXIT y validación por rol. Contexto propio sin driverId/providerId enviados. Proveedor conserva scope explícito y PROVIDER_REMOVAL; SUPER_ADMIN sin START.
- START conserva Idempotency-Key en header, body exacto expectedAffiliationRevision/reasonCode; RECHECK expectedExitRevision. Cifrado IndexedDB, cuenta/entorno/ruta/recurso/clave originales, bloqueo de doble envío y recuperación AFFILIATION sin exitId. No se añade otro almacén ni protocolo.
- Categoría canónica, pertenencia y aprobación se muestran separadas. APPLIED/PENDING no anuncia desvinculación; ENDED/COMPLETED no habilita independiente. Refresco al foco/reconexión e invalidación del portal/zonas tras resultado. Avisos HTTP existentes, sin eventos nuevos.
- `src/driver-category/components.tsx`: independiente→flotilla bloqueado expresamente por negocio, incluso suspendido/rechazado. Conserva el módulo de categorías/conciliación y cambios administrativos/zonas pendientes del informe anterior.
- `src/test/fleet-exit{,-api}.test.*`: DRIVER propio, motivos incompatibles, ausencia de query ajena, persistencia previa, doble clic y rechazo de enlaces por otros roles.
- `scripts/verify-category-exit-ui.mjs`: navegador Chromium real, Vite loopback4269 envDir:false, HTTP totalmente interceptado, orígenes externos bloqueados. No integración backend.

## Matriz de evidencia actual

| Caso | Resultado y alcance |
| --- | --- |
| DRIVER voluntario sin veto; proveedor OWNER/ADMIN; admin sin START | PASS componentes con dobles; DRIVER también navegador |
| ACTIVE, EXIT_PENDING/APPLIED, ENDED/COMPLETED, NONE | PASS navegador con dobles |
| Independiente suspendido sigue CURRENT y no convierte | PASS navegador con dobles; aprobado/rechazado y perfil histórico en unitarias de categoría |
| REVIEW_REQUIRED no se resuelve automáticamente | PASS navegador con dobles; conciliación administrativa en pruebas unitarias previas reejecutadas por global |
| Respuesta START perdida, recarga, IndexedDB, recuperación AFFILIATION, un solo POST | PASS navegador con dobles |
| Scope, múltiples memberships, privacidad, redacted, revocación | PASS suite componentes de salida; HTTP actual PENDIENTE |
| ACCOUNT_CLOSING, UNKNOWN, cierre técnico, respuesta tardía, cursor, avisos duplicados | PASS suite componentes de salida; HTTP actual PENDIENTE |
| Servicio activo/custodia/disputa sin cancelación ficticia | PASS presentación con dobles; resolución real PENDIENTE |
| Dos sesiones reales, TAKE atrasado, socket perdido, legado entregado por backend | PENDIENTE integración |
| Historial/asistencia/movementContext/declaraciones/disputas/ejecución | Regresión global local; no nueva aceptación HTTP |
| Primera habilitación independiente sin perfil | BLOQUEADA: lectura administrativa devuelve404 sin proyección canónica de candidato |
| Recuperación durable RELEASE independiente | PENDIENTE: Web usa variante histórica sin clave; no confundir con recuperación de salida |

## Evidencia visual y reproducción

`docs/evidence/driver-exit-ui-20261028/results.json`: cinco escenarios PASS, cero errores de página. Capturas01 ACTIVE;02 recuperación APPLIED/PENDING;03 ENDED/NONE;04 independiente suspendido;05 REVIEW_REQUIRED. Marcas temporales e IDs de los DTO son fixtures, no observaciones operativas. Se inspeccionaron visualmente02 y04: estado pendiente y bloqueo inverso explícitos, historial separado. Las restantes capturas se conservan junto con aserciones automatizadas.

Comando: `node scripts/verify-category-exit-ui.mjs`. Usa Chromium ya instalado; sandbox no tenía acceso a su ruta y se ejecutó con permiso local. Primer intento falló por selector del harness (Consultar resultado frente a Consultar intento), corregido. Vitest focal final68/68, dos archivos, cero omitidos; reportes intermedios fallidos conservados en test-results: expectativas antiguas/mocks y selector doble clic corregidos, sin relajar producto ni tiempos.

Build aislado: Vite configFile:false/envDir:false, plugin React, API explícita127.0.0.1:4269, outDir test-results/driver-exit-build;2420 módulos, advertencia conocida chunk>500kB. No reconstruye instancia compartida. Comandos y resumen final en verification.json de esta carpeta de evidencia.

## Prerrequisitos para responsable backend y continuación

1. Entregar URL loopback aislada autorizada y origin Web con CORS, identificación SHA/snapshot del build servido con contratos1.0.0, migraciones65/66 aplicadas y OpenAPI de ese proceso. No basta package1.13.4.
2. Confirmar flags locales efectivos FLEET_EXIT_REQUESTS_ENABLED, FLEET_OFFERS_ENABLED e INDEPENDENT_OFFERS_ENABLED según escenarios, sin activación remota ni proveedores externos. Entregar configuración pública saneada, nunca secretos en informes.
3. Identidades sintéticas DRIVER, proveedor OWNER/ADMIN con memberships múltiples y SUPER_ADMIN; fixtures FLEET ACTIVE/EXIT_PENDING, CURRENT aprobado/suspendido/rechazado, NONE, HISTORICAL y REVIEW_REQUIRED. El fixture legado debe proporcionarlo backend: Web no lo fabrica mediante SQL.
4. Servicios sintéticos dedicados con ejecución/custodia/claim y resolución por APIs existentes; sesiones revocables/ACCOUNT_CLOSING. Especificar propietario, setup/limpieza y límites. Excluir pedido Coita/MDR reservado y servicios compartidos.
5. Ejecutar matriz HTTP y navegador contra ese build; registrar tiempos reales, rutas, resultados y huellas sin credenciales. No reutilizar resultados de mocks como aceptación integrada.

Bloqueo de contrato administrativo: GET `/admin/drivers/:driverId/independent` sin perfil devuelve404; no acredita NONE y no autoriza alta a ciegas. Se conserva consulta por ID conocido y habilitación sólo con proyección compatible.

Límite RELEASE identificado en `src/driver-portal/service.ts`: POST `/driver/dispatches/:dispatchId/release` sin Idempotency-Key conserva DriverDispatchResponse histórico. El controller backend ofrece además IndependentCommandResponse con clave para DETAILED y recuperación original; esta variante aún no está integrada en Web. No se declara recuperación durable ni se inventa recibo desde GET de despacho. Requiere integración específica del protocolo independiente y pruebas de pérdida de acceso, distinta de fleet-exit-attempts. El refresco antiguo no constituye comprobante del resultado.

El portal no implementaba PUT /driver/offer-mode ni almacenaba intenciones MODE; no se añade selector ni replay inventado. Compatibilidad de recibos MODE de otros clientes permanece en backend y necesita matriz integrada propia.

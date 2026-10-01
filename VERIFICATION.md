## 2026-10-01 — Restricción reversible de Swagger público

Solicitud aprobada por propietario: bloquear documentación completa en nginx conservando posibilidad de reabrir. **Preparado localmente; no desplegado.** Sin backend modificado, Docker, commit ni push.

### Archivos y alcance

- `nginx.conf`: map único de `$uri` a `$block_public_swagger`; patrón insensible a mayúsculas `^/(?:api/v1/)?docs`, valor 1 bloquea y 0 habilita. Ambos servidores HTTP/HTTPS retornan 404 antes del proxy/fallback. Se conservan los bloques de proxy API/docs/health, SPA y archivos B2B. No se agrega autenticación por query/cookie/cabecera ni navegador.
- `scripts/check-swagger-policy.mjs`: comprobación estática del patrón, ambas guardas, rutas afectadas/no afectadas y presencia de proxies/fallback conservados. No es parser nginx ni simulación del normalizador HTTP.
- `README.md`: rutas reales, procedimientos bloquear/reabrir (nginx -t obligatorio antes de recargar), matriz posterior y túnel SSH con puertos/destinos a verificar.

Fuente consultada: setup.ts y swagger-module.js de la dependencia instalada del backend. UI /docs, /docs/, /docs/index.html; JSON /docs-json; YAML /docs-yaml; init JS, CSS/bundles/favicons y LICENSE bajo /docs/. Prefijo global no aplicado a Swagger. Se bloquean también subrutas anidadas y el alias defensivo /api/v1/docs; no se encontró otro montaje Swagger en setup.

### Verificaciones ejecutadas

- `node scripts/check-swagger-policy.mjs`: exit 0; **16 rutas Swagger y 9 rutas no afectadas**, interruptor 1, dos guardas y proxies conservados.
- `npx eslint scripts/check-swagger-policy.mjs`: exit 0.
- `git diff --check`: exit 0.
- Revisión del diff nginx: sólo map y dos guardas; no cambios a upstream, TLS, redirecciones ordinarias, portal ni descarga B2B.
- Comprobación de disponibilidad de nginx: no hay ejecutable en el entorno. **No ejecutados nginx -t, recarga ni pruebas HTTP reales**. No se repiten build/tests React porque no se modificó la aplicación.

### Exposición directa y soporte

Compose backend consultado: binding host `127.0.0.1:${PORT:-3000}:3000`; upstream nginx backend:3000; Nest escucha 0.0.0.0 dentro del entorno. No son pruebas de listeners/firewall del servidor desplegado. Puerto host, usuario y host SSH se documentan como valores a confirmar, sin inventarlos ni abrir acceso. Túnel local atado a 127.0.0.1 hacia listener backend privado confirmado; soporte usa /docs directamente por el túnel.

Si otro puerto backend o proxy público entrega Swagger, este bloqueo puede eludirse. Pendiente operación: verificar listeners/firewall y virtual hosts alternativos, nginx -t en entorno efectivo, recarga autorizada y matriz HTTP (incluye mayúsculas, escapes, barras repetidas, dot segments y parámetros). En restringido: 404 sin Swagger/fallback; entradas inválidas pueden ser 400. En habilitado: rutas reales UI/JSON/YAML/assets accesibles y resto sin regresión. La revisión estática no acredita esos resultados en despliegue.

Reversión: cambiar únicamente el valor del patrón 1→0, nginx -t y sólo tras éxito recargar; verificar UI/JSON/YAML/assets y portal/API/health. Restaurar restricción con 0→1 y el mismo procedimiento. No eliminar Swagger backend ni cambiar su contrato.

---

## 2026-10-01 — Preparación de publicación con origen confirmado

Propietario confirmó Web https://mandaria.com.mx, API https://mandaria.com.mx/api/v1 y portal /developers. Sin despliegue, Docker, backend modificado ni activación/envíos reales. Sin commit/push en esta tarea. Historial anterior conservado abajo.

### Cambios

- `src/config/env.ts`: exige origen sin pathname para prevenir /api/v1 duplicado. Transporte central añade prefijo a auth/login/me/refresh/logout, api, apiOnce y publicApi. Únicos consumidores VITE: cliente HTTP y portal; scripts E2E usan otra variable. `.env.example` documenta publicación sin sustituir desarrollo local ni escribir .env.
- `src/developers/pages.tsx`: destinos confirmados, ejemplo copiable server-to-server, servidor real del JSON y aviso condicional si no coincide con publicación.
- `nginx.conf`: assets de documentación con MIME explícito, 404 sin fallback y revalidación; JSON fuera de ese directorio devuelve 404. Rutas SPA y proxies API/Swagger/health permanecen intactos. Revisión del diff local, no validación nginx en ejecución.
- Artefactos generados: guía pública, OpenAPI y manifest actualizados exclusivamente mediante sincronización, después de que backend entregara dominio confirmado. Handoff interno no publicado.
- Tests de configuración/URLs/portal y README con comandos de build y comprobación posterior.

### Ejecutado

1. `node scripts/sync-public-b2b.mjs` y `node scripts/sync-public-b2b.mjs --check`: exit 0. Origen backend ya actualizado a https://mandaria.com.mx; copia coincide.
2. `npx vitest run src/test/api.test.ts src/test/developers.test.tsx src/test/webhooks-api.test.ts`: **31/31**, 3 archivos, exit 0. Cubre origen confirmado con prefijo único en todos los transportes y auth/refresh, rechazo de configuración con ruta, portal anónimo y referencia. Primera ejecución 30/31: selector de test ambiguo cuando servidor del artefacto y origen confirmado coinciden; se delimitó al párrafo del artefacto y la repetición pasó. No hubo petición real: fetch simulado.
3. `npm run typecheck:test`: exit 0.
4. `npm run lint`: exit 0.
5. `$env:VITE_API_URL='https://mandaria.com.mx'; npm run build`: exit 0, incluye TypeScript. Variable sólo del proceso; .env intacto. Advertencia de chunk Root ~541.15 kB / 147.13 kB gzip.
6. Verificación Node local del dist: cinco artefactos coinciden con public, JSON parseable y las 15 operaciones tienen exactamente un /api/v1 al unir server+ruta. No OpenAPI general añadido.

### Límites y pendientes

No hay nginx disponible en este entorno: no se ejecutó `nginx -t` ni se simula que Vite acredite reglas nginx. MIME efectivo, 404 sin fallback, acceso directo/recarga y conservación del proxy requieren comprobación en el hosting tras despliegue autorizado; pasos en README. La descarga/navegación visual local anteriores siguen documentadas, pero no acreditan la instalación real. Ya no falta dominio ni entrega backend actualizada. Persiste únicamente validación de hosting/integración y aviso de tamaño del bundle; no se cambia el acceso a Swagger.

---

## 2026-10-01 — Confirmación de la entrega revisada B2B

Continuación del mismo alcance, sin repetir la implementación ni la revisión visual ya completada. Releídos handoff, contrato administrativo y configuración. Los cinco artefactos públicos ya integrados coinciden exactamente con la entrega revisada; el handoff continúa sólo como referencia interna y no se publica.

- Contraste: GET/PUT endpoint, POST secret, GET summary, eventos/lista/detalle y salud coinciden con el handoff. Boolean enabled explícito; 404 sólo representa ausencia al consultar endpoint; estados PENDING/DELIVERED/EXHAUSTED/NO_DELIVERY y razones NO_ENDPOINT/BEFORE_BOUNDARY/NOT_YET_PICKED_UP correctos; failureKind y destino histórico correctos. No se incorporan rescue/deliver ni el listado antiguo limitado a 100.
- Ajuste encontrado: `src/services/errors.ts` descartaba requestId. Ahora conserva code/requestId como metadata sin incorporar mensajes internos a la UX. Prueba agregada en `src/test/webhooks-api.test.ts`.
- `node scripts/sync-public-b2b.mjs --check`: exit 0, entrega vigente idéntica.
- Casos negativos antes bloqueados: ejecutados mediante `node --input-type=module` con importaciones aisladas por URL en el mismo proceso y copias temporales, sin spawn. **3/3 aprobados**: coincidencia, rechazo de guía desactualizada y rechazo de operación no revisada. Esto resuelve la limitación EPERM documentada en la entrada anterior; el backend no fue escrito.
- `npx vitest run src/test/webhooks-api.test.ts src/test/api.test.ts`: **20/20**, 2 archivos, exit 0. Complementa las 90/90 anteriores; no se suman como pruebas únicas porque hay casos repetidos.
- `npm run typecheck:test`, `npm run lint`, `npm run build`: exit 0. Build incluye TypeScript; aviso de chunk Root 540.25 kB / 146.89 kB gzip, sin error.
- `git diff --check`: exit 0. Inventario de public/dist: sólo openapi-b2b.json; no OpenAPI general ni handoff interno.
- La descarga efectiva, rutas públicas anónimas y revisión visual escritorio/móvil/teclado de la entrada anterior siguen siendo aplicables: no hubo cambios visuales ni de artefactos. No se repitieron capturas.

Configuración revisada sin alterarla: .env local y .env.example usan http://localhost:3000. src/config/env.ts centraliza VITE_API_URL; Dockerfile lo recibe como argumento de build, sin ejecutar Docker. No existe en estos datos un origen confirmado de publicación. El portal muestra el origen configurado y advierte que el JSON mantiene https://api.mandaria.example como placeholder. Confirmar el origen real y MIME/fallback en el hosting corresponde a publicación, sin bloquear este desarrollo.

Persisten sólo las limitaciones de integración real/hosting y el aviso de tamaño descritos abajo. Las verificaciones backend son reportadas por BACKEND, no ejecutadas ni acreditadas por mocks frontend. Sin backend/nginx/Swagger/.env modificados, activaciones, envíos, commit, push o despliegue.

---

## 2026-10-01 — Webhooks administrativos y portal público

Validación frontend focalizada. Se conserva íntegro el historial inferior. Sin operaciones reales, backend editado, Docker, Coita, cambios de .env/nginx/versión/configuración, commit, push ni despliegue.

### Alcance y archivos

- `src/webhooks/{types,service,queries,format,settings,pages}`: APIs existentes, configuración/sincronización, secreto efímero, resumen/eventos/intententos, salud.
- `src/services/api.ts`: transporte de generación de secreto de un solo intento, sin refresh/repetición de la mutación.
- `src/integrations/pages.tsx`, `src/app/{App,Root}.tsx`: módulo SUPER_ADMIN y separación de rutas públicas respecto de AuthProvider.
- `src/developers/pages.tsx`, `src/index.css`, `public/developers/assets/`, `scripts/sync-public-b2b.mjs`: portal, guías y contrato B2B revisados, descarga y huellas. No se importó OpenAPI general.
- `src/test/{webhooks,webhooks-api,developers}.test.*` y fixture de servicios en `flows.test.tsx`. Dependencias Markdown en package/lock. README actualizado.

### Ejecuciones

- `npx tsc -b --pretty false`: exit 0.
- `npm run typecheck:test`: exit 0 después de declarar tipos Node para lectura de los artefactos en el test del portal.
- `npm run lint`: exit 0, sin advertencias después de corregir la limpieza del ref en el efecto.
- `npx vitest run src/test/webhooks.test.tsx src/test/webhooks-api.test.ts src/test/developers.test.tsx src/test/flows.test.tsx src/test/integration-credentials-api.test.ts`: **5 archivos, 90/90 pruebas**, exit 0. Primera ejecución: 89/90, por referencia de test a un input desmontado tras actualizar la revisión remota; se corrigió el test para consultar el input vigente.
- `npm run build`: exit 0; incluye TypeScript. Vite advierte un chunk Root de 540.15 kB (146.85 kB gzip), pendiente optimizar división de código si se prioriza rendimiento inicial.
- `node scripts/sync-public-b2b.mjs --check`: exit 0, artefactos y manifest coinciden con la entrega backend local.
- Intento adicional de comprobar casos negativos del sincronizador con copias temporales: bloqueado antes de ejecutar hijos por EPERM en spawnSync. Un diagnóstico confirmó status null / EPERM; no se reiteró. **Rechazo de fuente desactualizada/operación adicional no validado dinámicamente**; lista/rechazo revisados en código. No se escribió al backend.

Cobertura focalizada: roles SUPER_ADMIN/PROVIDER_ADMIN/DRIVER, logout y respuestas tardías, acceso anónimo sin restauración; configuración ausente vs 401/403/red, guardado y refetch, edición limpia/sucia y conflicto remoto; confirmación, doble clic, respuesta perdida, limpieza al cerrar/pagehide/desmontaje y ausencia del secreto en caché/almacenamiento; estados, filtros, paginación, cliente de evento y destinos; salud compartida/instancia; descarga y rutas directas de documentación, contrato de 15 operaciones; regresión de credenciales e integraciones.

### Revisión visual real de navegador, datos simulados

Servidor Vite local temporal en 127.0.0.1:5178, origen API de proceso no operativo (sin cambiar .env). Fixture de administración con servicios simulados y fetch de red bloqueado, usuario/URLs sintéticos; ningún secreto real. Artefactos públicos servidos por Vite.

- Escritorio 1366×900: detalle de integración, formulario webhook, confirmación de rotación, referencia pública.
- Móvil 390×844: guía webhook y detalle de evento con intento histórico en tabla adaptada. Sin desbordamiento horizontal medido.
- Teclado: salto a main, Tab desde URL a checkbox, Escape cierra confirmación y navegación a details.
- Descarga efectiva de `openapi-b2b.json` completada desde el enlace. Guía revisada renderizada; referencia muestra las 15 operaciones.
- Consola del portal y del fixture: sin errores ni warnings capturados.
- Capturas locales ignoradas por Git: `test-results/webhooks-preview/{webhooks-desktop,portal-desktop,portal-mobile,event-mobile}.jpg`. Fixture sólo en ese directorio ignorado; no pertenece al producto/build.

### Qué no acredita esta validación

Mocks frontend no prueban RBAC/SSRF/cifrado, comportamiento del worker, transporte, rotación efectiva ni aislamiento backend. No se generaron secretos reales ni se activaron envíos. No se probó recepción comercial, producción ni fallback de nginx. Se consultó el handoff revisado y código local; sus pruebas backend reportadas no se ejecutaron aquí. Pendientes: confirmar equivalencia desplegada, origen API definitivo y E2E autorizado en entorno de pruebas. No falta un endpoint backend para la UI implementada según la referencia local.

---

## 2026-09-29 — Continuación: pruebas de cuentas locales reales

Por instrucción del usuario se conservaron las dos cuentas como datos exclusivamente locales de desarrollo, con instrucciones de uso en el directorio ignorado `test-results/local-accounts/`. Sus contraseñas no forman parte de Git ni de seeds o despliegues.

Validación directa contra la API local: **24 comprobaciones correctas**, exit 0. Login, identidad/rol, refresh e identidad conservada, logout y rechazo del refresh revocado en ambas cuentas; membership del proveedor, listado vacío de servicios, rechazo de provider sin membership; driver/me sin asignación ni capacidad independiente; bloqueo de administración global para ambos roles. Una comprobación inicial esperaba erróneamente 403 al consultar ofertas independientes: el contrato local establece 409 / INDEPENDENT_NOT_APPROVED. Se confirmó en la política existente y se corrigió la expectativa; la ejecución posterior completa pasó. No hubo cambio de producto por este hallazgo ni ejecución de suites ajenas.

Estas pruebas usaron HTTP real, sin mocks, pero **no acreditan instrucciones de cobro reales ni transiciones de un servicio**: el proveedor y el driver siguen PENDING y no hay dispatches. La revisión visual anterior continúa siendo simulada. Sin activaciones, despachos/cobros, cambios de backend/configuración, commit, push o despliegue.

---

## 2026-09-29 — V1.13-D: instrucciones de cobro para ejecutores

Implementación frontend con validación focalizada y datos simulados. **No acredita integración real ni cobros.** Esta entrada conserva debajo el historial anterior; no constituye otro CHECK.

### Contrato y superficies

Referencia de sólo lectura: `mandaria-backend/docs/V1.13-D-EXECUTOR-COLLECTION-INSTRUCTIONS.md` (2026-09-29).

- Proveedor: `/services`, `/services/:id`, diálogo de tomar servicio y diálogos de asignar/reasignar. Se lee el campo raíz de dispatch; SUMMARY sigue sin mostrar detalles.
- Independiente: `/driver/services`, `/driver/services/:id`, diálogo de tomar y `/driver/my-service`.
- Repartidor asignado: `GET /driver/me` → `activeDeliveryAssignment.collectionInstructions`. La superficie existente de bloqueo de la capacidad independiente muestra las instrucciones asignadas sin habilitar dicha capacidad. Una asignación FLEET en una cuenta con ambas capacidades tampoco consulta el endpoint de dispatch independiente ni habilita entregar/liberar como independiente.
- Tipos ampliados: ProviderDispatch, DriverDispatch, DriverSelf.activeDeliveryAssignment y AssignmentWithPayment. El historial GET de asignaciones no incorpora el campo: no se reconstruyen instrucciones para sus filas.
- No existe en Web una acción de `PATCH /driver/availability`; no se agregó una. Su integración queda pendiente si se implementa esa superficie. No se creó una pantalla de ejecución de flotilla.

### Presentación y vigencia

Componente compartido en `src/collection-instructions/`: valida todos los valores soportados antes de indicar un cobro. OFFER sólo informa condiciones; CURRENT indica comida pagada, sin adelanto ni cobro de comida, y únicamente envío al destinatario en efectivo al entregar; HISTORICAL conserva referencia sin instrucción vigente. Importe decimal y moneda se imprimen desde el campo recibido, sin float, sumas ni inferencias desde mercancía/créditos/PREPAID. Datos incompletos o desconocidos muestran un aviso no operativo. Campo ausente conserva el bloque legacy.

Se reutilizan invalidaciones/refetch tras claim/take/release/entrega y asignación/reasignación/cancelación. La invalidación de asignaciones también alcanza la caché driver-portal; durante lecturas de estas superficies se oculta la instrucción almacenada y se muestra actualización. Los errores de autorización siguen los estados de error existentes. No se almacena la respuesta de una mutación como instrucción vigente; se vuelve a consultar la proyección autorizada. Cancelar una asignación no necesariamente termina el claim del proveedor: su detalle refleja la nueva lectura del backend, mientras el repartidor anterior pierde activeDeliveryAssignment.

La detección de cambios externos sigue dependiendo del refetch existente (navegación/foco/actualización); no hay garantía de tiempo real ni nuevos sockets. La entrega física no se presenta como confirmación de cobro.

### Archivos

- `src/collection-instructions/{types.ts,validation.ts,CollectionInstructionsBlock.tsx}`: contrato, validación y presentación comunes.
- `src/dispatch/{types.ts,components.tsx,pages.tsx}`: proveedor.
- `src/driver-portal/{types.ts,pages.tsx}`: independiente y repartidor asignado.
- `src/delivery-assignments/{types.ts,components.tsx,queries.ts}`: asignación y refresco.
- `src/index.css`: legibilidad y adaptación al ancho disponible.
- `src/test/{collection-fixture.ts,collection-instructions.test.tsx,dispatch.test.tsx,driver-portal.test.tsx}`: fixtures y pruebas focalizadas.

### Verificaciones ejecutadas

1. `npx tsc -b --pretty false`: exit 0; repetido tras el ajuste final.
2. `npm run typecheck:test`: exit 0; repetido tras el ajuste final.
3. `npm run lint`: exit 0; repetido tras el ajuste final.
4. `npx vitest run src/test/collection-instructions.test.tsx src/test/dispatch.test.tsx src/test/driver-portal.test.tsx src/test/delivery-assignments.test.tsx src/test/delivery-completion.test.tsx`: **134 pruebas, 5 archivos, exit 0**.
5. Tras añadir dos pruebas de rutas y ajustar validación/presentación: `npx vitest run src/test/collection-instructions.test.tsx src/test/dispatch.test.tsx src/test/driver-portal.test.tsx`: **90 pruebas, 3 archivos, exit 0**. Las dos suites de asignación/entrega no se repitieron. No se suman ejecuciones repetidas como casos nuevos.
6. Revisión visual con Chromium/Playwright sobre componentes reales en un montaje local de simulación: 1280×1000, 768×1024 y 390×844. OFFER, CURRENT, HISTORICAL, legacy, campo incompleto y repartidor de flotilla. Sin desbordamiento horizontal ni errores pageerror. Se inspeccionaron capturas; tras detectar texto pequeño se mejoró la legibilidad y se repitió la captura. Red externa bloqueada y Vite apuntando a un puerto inactivo sólo en el proceso, sin cambiar .env. Artefactos locales ignorados en `test-results/collection-instructions/`.
7. `git diff --check`: exit 0.

Cobertura nueva: estados de aplicabilidad, importe/moneda exactos incluso fuera del rango seguro de float, valores desconocidos/incompletos, ausencia y compatibilidad legacy, listado proveedor/independiente, proyección driver/me, desaparición al finalizar la asignación, y reemplazo de proyección mediante los helpers de refetch para cambios operativos. Los tests de caché simulan respuestas; no prueban una transacción real del backend.

No hubo aborto del runner ni diagnóstico adicional. No se ejecutó la suite completa, build de distribución, Docker ni scripts E2E operativos. No se accedió a Coita ni se realizaron despachos/cobros reales. Sin cambios de backend, .env, versión, configuración operativa, activación, commit, push o despliegue. Pendiente: integración real contra backend con V1.13-D desplegado y cuentas autorizadas, fuera de esta validación simulada.

### Seguimiento local — cuentas autorizadas por el usuario (2026-09-29)

Tras autorizar expresamente la creación/inserción de cuentas, se creó un proveedor sintético separado y dos identidades nuevas: PROVIDER_ADMIN con membership ADMIN y DRIVER con perfil asociado. Proveedor y perfil DRIVER permanecen PENDING; no se activaron capacidades ni se crearon servicios, asignaciones operativas o cobros. Usuarios insertados únicamente en la base local de desarrollo, con Argon2id; proveedor, membership y perfil creados mediante API existente. No se ejecutaron seeds generales ni se cambiaron cuentas previas.

Login real y GET /auth/me correctos para ambos roles; GET /provider/profiles devolvió el proveedor asociado y GET /driver/me confirmó que no hay asignación activa. Se cerraron las sesiones de comprobación. Las contraseñas aleatorias permanecen sólo en un archivo local ignorado por Git, restringido al usuario del sistema; no se incluyen en esta documentación.

Backend en ejecución: GET /health 200 y Swagger activo con collectionInstructions en las cuatro proyecciones esperadas. Esta comprobación acredita autenticación y lectura real de las cuentas, **no la visualización real de instrucciones**, porque las cuentas nuevas no tienen dispatches. Siguen pendientes los datos operativos sintéticos autorizados para esa validación. No se modificaron código/backend, .env ni configuración operativa.

---

# Estado actual — Mandaria Web V1.11-B (MVP Delivery Completion)

Fecha: 2026-09-23. Rama `v1.11-mvp_delivery_completion`. Backend real Mandaria 1.11.0 (`v1.11-mvp-delivery-completion`) con `ROUTING_PROVIDER=local_fake`. Detalle en [docs/V1.11-B.md](docs/V1.11-B.md).

| Comprobación                            | Resultado                                                             |
| --------------------------------------- | --------------------------------------------------------------------- |
| `tsc -b`, lint, `typecheck:test`, build | PASS                                                                  |
| `format:check`                          | PASS                                                                  |
| Vitest                                  | 484/484 en 23 archivos (460/22 antes de V1.11-B; 24 pruebas nuevas)   |
| Proveedor en navegador real             | Detalle → confirmar → `DELIVERED`, asignación `COMPLETED`: PASS       |
| Repartidor independiente en navegador   | Mi servicio → confirmar → queda libre y puede volver a tomar: PASS    |
| Cancelar el diálogo                     | 0 mutaciones, el servicio sigue `CLAIMED`: PASS                       |
| Doble clic                              | Exactamente 1 petición `POST .../deliver` sin body: PASS              |
| Estado terminal                         | Sin liberar, asignar, reasignar, cancelar, entregar ni deshacer: PASS |
| `DISPATCH_DELIVERED`                    | Reclamar y tomar un servicio entregado lo muestran traducido: PASS    |
| Créditos                                | Saldo y ledger idénticos antes y después; sin `SERVICE_REFUND`: PASS  |
| Aislamiento de roles                    | DRIVER, SUPER_ADMIN y PROVIDER_ADMIN cruzados: 401/403 reales: PASS   |
| Responsive                              | 375, 768 y escritorio sin overflow; acción del portal de 48 px: PASS  |

La confirmación de entrega no genera movimientos de créditos: el `SERVICE_AWARD` cobrado al reclamar o tomar el servicio permanece como movimiento histórico.

# Histórico — Mandaria Web V1.10-F (Credits & Monetization Administration)

Fecha: 2026-09-23. Rama `v1.10-credit-monetization`. Backend local real Mandaria 1.10.0 (rama `v1.10-credit-monetization`, OpenAPI 1.10.0) con `ROUTING_PROVIDER=local_fake`. No se modificó backend ni Coita Eats. No se hizo commit ni push. Detalle en [docs/V1.10-F.md](docs/V1.10-F.md).

| Comprobación                       | Resultado                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsc -b`, `lint`, `typecheck:test` | PASS                                                                                                                                        |
| `build`, `format:check`            | PASS                                                                                                                                        |
| Vitest                             | 460/460 en 22 archivos (414 de la línea base + 46 nuevas)                                                                                   |
| `npm run test:e2e:credits` (Edge)  | PASS 10/10 fases contra el backend real                                                                                                     |
| Recarga y ajuste reales            | Atómicos, con `Idempotency-Key`: repetición idempotente (200 + `Idempotent-Replayed: true`) y `CREDIT_IDEMPOTENCY_CONFLICT` con otro cuerpo |
| Ledger y políticas                 | Sin rutas de escritura: `PATCH`/`DELETE` de ledger y de políticas y `POST /credits/refund` responden 404                                    |
| Aislamiento por rol                | PROVIDER_ADMIN y DRIVER: 403 reales en rutas administrativas; 0 peticiones `/admin/` desde sus sesiones                                     |
| Créditos ≠ dinero                  | Ninguna superficie de créditos muestra `ni`MXN`; `creditCost: null` se muestra «Sin costo registrado»                                       |
| Responsive 1440/820/390            | Sin desbordamiento horizontal                                                                                                               |

Escenario real: proveedor `98a9056b…` (saldo 0) y repartidor independiente `58ad8d2e…`; política `LOCAL_DELIVERY/PROVIDER v1` → 5 créditos para 4 200 m. Movimientos escritos y compensados: +25/−25 por API y +10/−10 desde la interfaz; el saldo quedó como se encontró. Mutación que permanece: la habilitación independiente de ese repartidor, necesaria para que exista su cuenta de créditos.

Discrepancia documentada (no se modificó el backend): el ledger **no** expone `reversesEntryId` ni `refundReason` aunque V1.10-E los persiste; la web enlaza cargo y devolución sólo por el `referenceId` compartido. Ver [docs/API-CONTRACT.md](docs/API-CONTRACT.md).

# Histórico — Mandaria Web V1.9-C (Service Coverage Administration)

Fecha: 2026-09-21. Rama `v1.9-independent_driver`. Backend local real Mandaria 1.9.0 (`v1.9-independent_drivers`) con `ROUTING_PROVIDER=local_fake`. Detalle en [docs/V1.9-C.md](docs/V1.9-C.md).

| Comprobación                        | Resultado                                                       |
| ----------------------------------- | --------------------------------------------------------------- |
| `tsc -b`, lint, `typecheck:test`    | PASS                                                            |
| `format:check`, build               | PASS                                                            |
| Vitest                              | 414/414 en 20 archivos (386 de la línea base + 28 nuevas)       |
| A–D contra backend real y navegador | Crear, desactivar, 409 → reactivar por PATCH: PASS              |
| Regresión de Dispatch desde la Web  | D1 conserva candidatos, D2 sin el proveedor, D3 con él: PASS    |
| Proveedor en sólo lectura           | Refleja exactamente al SUPER_ADMIN; mutaciones directas 403/404 |
| Aislamiento de roles por API        | PROVIDER_ADMIN, DRIVER e IntegrationClient bloqueados: PASS     |
| Responsive 375/768/escritorio       | Sin desbordamiento; acciones de 44 px en pantallas pequeñas     |

La cobertura afecta a los nuevos Dispatches; los candidatos de los Dispatches existentes no se recalculan, y un proveedor con la cobertura desactivada ya no puede reclamarlos (`PROVIDER_NOT_ELIGIBLE`).

# Histórico — Mandaria Web V1.8-B y CHECK final V1.8

Fecha: 2026-09-19. Rama `v1.8-provider_driver_vehicle_assignment`. Backend local real Mandaria V1.8.0 (rama `QA`, idéntica a `origin/v1.8-provider_driver_vehicle_assignment` en todos los archivos consumidos) ejecutado con `ROUTING_PROVIDER=local_fake`: no se llamó a Google Routes. No se modificó backend ni Coita Eats. Detalle en [docs/V1.8-B.md](docs/V1.8-B.md).

## Calidad ejecutada

| Comprobación                    | Resultado                                              |
| ------------------------------- | ------------------------------------------------------ |
| Web `npm run build`             | PASS                                                   |
| Web `npm run lint`              | PASS                                                   |
| Web `npm run typecheck:test`    | PASS                                                   |
| Web `npm run format:check`      | PASS                                                   |
| Web `npm test`                  | PASS: **345 tests**, 16 archivos (311 antes de V1.8-B) |
| Backend `prisma validate`       | PASS                                                   |
| Backend `npm run build`         | PASS                                                   |
| Backend `npm run lint` (oxlint) | PASS                                                   |
| Backend `npm test`              | PASS: **91/91**, 12 archivos                           |
| Backend `npm run test:e2e`      | **146/150**; 1 fallo ajeno a V1.8 (ver Riesgos)        |

## CHECK final V1.8 — navegador y backend reales

`npm run test:e2e:assignment` (`scripts/verify-assignment.mjs`): **17 comprobaciones, dos corridas consecutivas en verde**, con escenario fresco sembrado entre ellas. El script aborta si el proveedor de rutas no es `local_fake`.

| Escenario                  | Evidencia                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| 1 Flujo principal          | `POST /assignment` → 201 desde la web; backend confirma 1 ACTIVE (Carlos + MOTO-03)          |
| 2 Mercancía prepagada      | Envío y mercancía separados; sin adelanto falso; sin total sumado                            |
| 3 Adelanto en efectivo     | Monto a entregar, aviso de efectivo y «Mandaria no conoce el saldo»; sin wallet              |
| 4 Repartidor ocupado       | `409 DRIVER_BUSY`; desaparece de `available-drivers`                                         |
| 5 Vehículo ocupado         | `409 VEHICLE_BUSY`; desaparece de `available-vehicles`                                       |
| 6 Reasignación             | Anterior a `REASSIGNED` con motivo; nueva `ACTIVE`; historial visible                        |
| 7 Protección de liberación | `409 DISPATCH_HAS_ACTIVE_ASSIGNMENT`; botón deshabilitado; tras cancelar libera y habilita   |
| 8 Aislamiento de proveedor | Otro proveedor sólo `SUMMARY` sin datos operativos; historial vacío; listas con 409          |
| 9 Concurrencia             | Dos reasignaciones simultáneas → **`200, 200`**; exactamente 1 ACTIVE por despacho y recurso |
| 10 Cancelación oficial     | Solicitud cancelada con asignación activa → despacho `CANCELLED`, 0 asignaciones activas     |
| 11 Historial               | Todos los intentos conservados, orden descendente, una sola vigente                          |
| 12 Deadline                | `assignmentDeadline` presente y distinto de `expiresAt`; UX de demora                        |

Además: visibilidad por rol (SUPER_ADMIN sólo audita), regresión de navegación V1.7, responsive a 390 px sin desbordes y auditoría de secretos (nada en `localStorage`, sólo `mandaria.refresh` en `sessionStorage`, ningún token en la URL).

## Regresión en navegador

| Script                        | Cobertura                                              | Resultado             |
| ----------------------------- | ------------------------------------------------------ | --------------------- |
| `npm run test:e2e`            | Auth, refresh, dashboard, integraciones, proveedores   | PASS: 17 fases        |
| `npm run test:e2e:pricing`    | Zonas, tarifas, cotizaciones, PROVIDER_ADMIN bloqueado | PASS: 14 fases        |
| `npm run test:e2e:assignment` | Dispatch, claim, release y asignación V1.8             | PASS: 17 × 2 corridas |

## Bugs encontrados y corregidos

Ninguno en el producto. Los siete fallos de la sesión fueron del propio script de verificación —importes fijos en vez de leídos del backend, re-ejecutabilidad, alcance y orden del reset de asignaciones, aserciones de aislamiento e historial demasiado estrictas— y todos quedaron corregidos.

## Riesgos y pendientes

1. **Backend, prueba inestable ajena a V1.8.** `test/delivery-quotes.e2e-spec.ts` → «20 concurrent quote calls» falla con `Test timed out in 5000ms` (el valor por omisión de vitest, sin `testTimeout` configurado). En tres corridas aisladas pasó una y falló dos, siempre por timeout y nunca por aserción. Es de V1.6 y no se tocó.
2. **Cobertura de servicio sin interfaz.** El proveedor necesita una `ProviderServiceCoverage` ACTIVA para recibir despachos; sin ella se abren con cero candidatos, y los candidatos se congelan al abrirlos. Es funcionalidad V1.7 que Mandaria Web no administra.
3. **Los Drivers nacen `PENDING`** y `available-drivers` sólo lista los `ACTIVE`; hay que activarlos por API antes de poder asignarlos.
4. **`assignmentDeadline`, `assignmentOverdue` y `assignment` no figuran en el `openapi.json`** del backend aunque sí se devuelven. Conviene regenerar el Swagger para que el contrato publicado coincida con el código.
5. No correr `npm test` a la vez que una regresión de Playwright: la competencia por CPU hace expirar temporizadores en jsdom y produce fallos que no son reales.

# Histórico — Mandaria Web V1.8-B (implementación)

Fecha: 2026-09-18. Rama `v1.8-provider_driver_vehicle_assignment`. Contrato verificado contra el backend V1.8.0: la rama `QA` del checkout local y `origin/v1.8-provider_driver_vehicle_assignment` son idénticas en todos los archivos consumidos y ambas publican OpenAPI 1.8.0. No se modificó backend ni Coita Eats. No se hizo commit ni push. Detalle en [docs/V1.8-B.md](docs/V1.8-B.md).

| Verificación             | Baseline antes de V1.8-B | Resultado final                  |
| ------------------------ | ------------------------ | -------------------------------- |
| `npm run build`          | PASS                     | PASS                             |
| `npm run lint`           | PASS                     | PASS                             |
| `npm run typecheck:test` | PASS                     | PASS                             |
| `npm run format:check`   | PASS                     | PASS                             |
| `npm test`               | PASS: 311 tests, 14      | PASS: **345 tests, 16 archivos** |

34 pruebas nuevas: 22 de UI (`delivery-assignments.test.tsx`) y 12 de contrato (`delivery-assignments-api.test.ts`). La única expectativa previa que cambió es la de V1.7 que afirmaba «la asignación de repartidor y vehículo llegará en una próxima etapa»: V1.8 la sustituyó por el panel real y el test ahora verifica el estado pendiente de asignación.

**Validación en navegador pendiente.** Requiere el backend V1.8 en ejecución con datos locales sembrados; no estaba levantado al cerrar esta entrega. Queda por confirmar en vivo un único punto deducido del código y no del Swagger: que `GET /provider/dispatches/:id` incluye `assignment`, `assignmentDeadline` y `assignmentOverdue`.

# Histórico — Mandaria Web V1.7-B

Fecha: 2026-09-16. Rama `v1.7-dispatch_engine`. Backend local real Mandaria V1.7.0 (OpenAPI 1.7.0) iniciado con `ROUTING_PROVIDER=local_fake`, `DISPATCH_TTL_MINUTES=3` y `MAIL_PROVIDER=local_outbox` por variables de proceso (`.env` intacto: no se llamó a Google Routes ni se enviaron correos). No se modificó backend ni Coita Eats. No se hizo commit ni push. Detalle en [docs/V1.7-B.md](docs/V1.7-B.md).

| Verificación                                    | Resultado                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `npm run build`                                 | PASS                                                                            |
| `npm run lint`                                  | PASS                                                                            |
| `npm run typecheck:test`                        | PASS                                                                            |
| `npm test`                                      | PASS: **311 tests**, 14 archivos (266 previos + 45 nuevos)                      |
| `npm run format:check`                          | PASS                                                                            |
| `npm run test:e2e:dispatch` (Edge)              | PASS: **10/10 fases** con Dispatches reales (Quote aceptada por la integración) |
| `test:e2e` · `provider-admin` · `logistics`     | PASS 17/17 · 14/14 · 9/9                                                        |
| `delivery-requests` · `pricing` · `invitations` | PASS 11/11 · 14/14 · 11/11                                                      |

Escenario real: MDR-000096 (COURIER_ADVANCE) y MDR-000097 (PREPAID) con Quote ACCEPTED → Dispatch OPEN y candidatos Rápidos de Coita (A) y Mandados del Centro (B). A tomó MDR-000096, B recibió "Este servicio ya fue tomado por otro proveedor." (409 real), A liberó con motivo y ya no puede retomarlo (409 `DISPATCH_RECLAIM_NOT_ALLOWED`), B lo tomó. MDR-000097 expiró en tiempo real: botón deshabilitado y 409 `DISPATCH_EXPIRED`. A no puede cambiar a B por query string (403) ni enviar `providerId` en el body del claim (400). SUPER_ADMIN audita sin acciones; un DRIVER creado por invitación real no tiene acceso (403).

Expectativas previas modificadas (cambio intencional del menú): listas exactas en `flows.test.tsx`, `verify-provider-admin.mjs` y `verify-logistics.mjs` incluyen `Servicios` (PROVIDER_ADMIN) y `Despachos` (SUPER_ADMIN, después de Zonas de servicio para conservar el orden validado de V1.6). Scripts de regresión: logout apuntado al disparador del menú de usuario, porque las invitaciones pendientes también tienen botones con correos en su nombre.

Datos locales creados: coberturas LOCAL_DELIVERY de A y B en `LOCAL_OCOZOCOAUTLA`, credenciales temporales de integración (revocadas), MDR-000095…098 con sus Quotes y Dispatches, MDR-000099…102 para la suite V1.5 y un DRIVER `web17-driver-*` en B. Auditoría de 111 artefactos contra 17 secretos (contraseñas del `.env` y tokens de activación): 0 coincidencias.

# Histórico — Verificación final E2E — Mandaria V1.6.1

Fecha: 2026-09-16. Web + Backend reales locales; backend con `MAIL_PROVIDER=local_outbox` y `USER_INVITATION_TTL_HOURS=1` por variables de proceso (`.env` intacto). Sin cambios manuales en BD, sin seeds nuevos y sin scripts manuales en el flujo persona → invitación → activación → contraseña → login → rol → relación Provider/Driver.

| Escenario                                                                                                     | Resultado |
| ------------------------------------------------------------------------------------------------------------- | --------- |
| 1 · SUPER_ADMIN invita PROVIDER_ADMIN a Provider A → activación → login → Mi proveedor A → B bloqueado        | PASS      |
| 2 · PROVIDER_ADMIN A invita DRIVER → activación → login real DRIVER → `/driver/me` en Provider A              | PASS      |
| 3 · A→B, PA→PROVIDER_ADMIN, PA→SUPER_ADMIN, Driver→invite, IntegrationClient→invite: bloqueados, sin User     | PASS      |
| 4 · PENDING, RESEND, token viejo inválido, nuevo válido, ACCEPTED, reuso inválido, REVOKE                     | PASS      |
| 4 · EXPIRED en tiempo real (TTL 1 h): 410, mensaje Web, "Expirada", reenvío la reabre                         | PASS      |
| 5 · Email ACTIVE, INVITED y variantes de mayúsculas/espacios: 409 correctos, User reutilizado, sin duplicados | PASS      |
| 6 · `test:e2e` 17/17 · `provider-admin` 14/14 · `logistics` 9/9 · `delivery-requests` 11/11 · `pricing` 14/14 | PASS      |

Backend: `prisma validate`, build, lint, 69 tests unitarios, 124 e2e y `docs:check` en PASS. Frontend: TypeScript, build, lint, 266 tests y formato en PASS. Auditoría de 99 artefactos generados contra 31 valores secretos (contraseñas del `.env`, tokens de activación): 0 coincidencias.

Bug real corregido: el detalle de cotización mostraba el código crudo `DELIVERY_REQUEST_CANCELLED` como motivo (V1.6; el test unitario lo esperaba así). Ahora se traduce y cualquier código desconocido usa un texto genérico. Scripts de regresión ajustados (no la app): `verify-logistics` limita las tablas a la de repartidores y reutiliza el proveedor INDEPENDENT que ya tiene a Luis; `verify-pricing` espera a que el menú se renderice antes de leerlo.

Mutaciones locales: cuentas `final161-*`, integración `FINAL161_*` con credencial revocada, Provider A `maxDrivers` 3 → 5 desde la Web (necesario para invitar un repartidor) y los datos habituales de las suites de regresión.

# Estado previo — Mandaria Web V1.6.1-B

Fecha: 2026-09-16. Rama `v1.6.1-creation_user`. Backend local real Mandaria V1.6.1 (OpenAPI 1.6.1) iniciado con `MAIL_PROVIDER=local_outbox` por variable de proceso (su `.env` no se modificó; no se enviaron correos reales). No se modificó backend ni Coita Eats. No se hizo commit ni push. Detalle en [docs/V1.6.1-B.md](docs/V1.6.1-B.md).

| Verificación                             | Resultado                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm run build`                          | PASS                                                                                  |
| `npm run lint`                           | PASS                                                                                  |
| `npm run typecheck:test`                 | PASS                                                                                  |
| `npm test`                               | PASS: **266 tests**, 12 archivos (208 previos + 58 nuevos)                            |
| `npm run format:check`                   | PASS                                                                                  |
| `npm run test:e2e:invitations` (Edge)    | PASS: **11/11 fases** sobre el código final                                           |
| `npm run test:e2e:provider-admin` (Edge) | PASS: **14/14** (A → A, B bloqueado, sin membership, refresh/expiración, SUPER_ADMIN) |

Expectativas previas modificadas: la lista exacta del menú SUPER_ADMIN en `flows.test.tsx` incluye `Invitaciones`; `flows.test.tsx` y `logistics.test.tsx` simulan el servicio de invitaciones para no llamar a la red.

Regresión PROVIDER_ADMIN: la primera corrida falló en su fase SUPER_ADMIN por un bug preexistente (aviso `beforeunload` sin ediciones en el login), corregido en esta versión. Dos corridas encadenadas inmediatamente después de la suite de invitaciones fallaron en fases distintas por `429` reales de `/auth/refresh` (confirmados en el log del backend); tras esperar la ventana de rate limit, la corrida aislada pasó 14/14.

Datos locales creados: cuentas `web161-pa-*`, `web161-driver-*` y `web161-revoked-*` en `LOCAL_MANDADOS_CENTRO` (una corrida completa y dos parciales mientras se ajustaba el script: cada una dejó un PROVIDER_ADMIN activado y una invitación DRIVER revocada; la completa además un DRIVER activado). No se cambiaron límites de proveedores. `LOCAL_RAPIDOS_COITA` estaba en capacidad (3/3) y se usó para verificar el 409 real `PROVIDER_DRIVER_LIMIT_REACHED` y el botón deshabilitado.

# Histórico — Mandaria Web V1.6-B

Fecha: 2026-09-15. Rama `v1.6-routing_service_plane`. Backend local real Mandaria V1.6.0 (OpenAPI 1.6.0). No se modificó backend ni Coita Eats. No se hizo commit ni push.

| Verificación                        | Resultado                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `npm run build`                     | PASS                                                                          |
| `npm run lint`                      | PASS                                                                          |
| `npm run typecheck:test`            | PASS                                                                          |
| `npm test`                          | PASS: **208 tests**, 10 archivos; 139 de V1.3–V1.5 sin cambios de expectativa |
| `npm run format:check`              | FAIL preexistente en todo el repo: copia Windows con CRLF, Prettier espera LF |
| `npm run test:e2e:pricing` (Edge)   | PASS: **14/14 fases** en dos corridas consecutivas sobre el código final      |
| `npm run test:e2e` (regresión V1.3) | PASS: 17/17 en dos corridas; la tercera seguida se detuvo en un 429 real      |

La única expectativa de test previa que cambió es la lista exacta del menú de SUPER_ADMIN en `flows.test.tsx`, que ahora incluye `Cotizaciones` y `Zonas de servicio`.

Escenario real de la validación de navegador: zona `LOCAL_OCOZOCOAUTLA` con tarifa LOCAL_DELIVERY de 5 bandas. Cada corrida clona la versión activa, edita bandas en kilómetros, provoca y traduce un hueco, restaura las bandas originales y activa la versión nueva, de modo que la tarifa efectiva no cambia (v1 → v2 → v3 con las mismas bandas). El backend local no tenía DeliveryRequests ni Quotes, así que esas dos fases se ejecutaron contra sus estados vacíos y el resto de cotizaciones está cubierto por los 27 tests de `quotes*.test.*`. El script no crea Quotes: hacerlo llamaría al proveedor de rutas configurado, un servicio externo de pago.

La tercera corrida consecutiva de `npm run test:e2e` se detuvo en el filtro de proveedores con el 429 real del backend (`Demasiados intentos. Espera un minuto antes de continuar.`), visible en `test-results/manual/failure-masked.png`. No es una regresión: confirma el manejo de 429 de la UI.

# Histórico — Mandaria Web V1.5-B

Fecha: 2026-09-15. Rama `v1.5-delivery_request`. Backend local real Mandaria V1.5.0 (OpenAPI 1.5.0). No se modificó backend ni Coita Eats. No se hizo commit ni push.

| Verificación                                | Resultado                                                            |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `npm run build`                             | PASS                                                                 |
| `npm run lint`                              | PASS                                                                 |
| `npm run typecheck:test`                    | PASS                                                                 |
| `npm test`                                  | PASS: **139 tests**, 6 archivos; incluye V1.3/V1.4                   |
| `prettier --check --end-of-line auto .`     | PASS (working copy Windows con CRLF; CI Linux usa LF)                |
| `npm run test:e2e:delivery-requests` (Edge) | PASS: 11/11 fases en dos corridas consecutivas sobre el código final |

Escenarios reales creados por la API B2B V1.5 (integración local `WEB_V15_VALIDATION`, credencial temporal revocada): por corrida una solicitud FOOD/PREPAID/CREATED, una FOOD+GROCERIES/COURIER_ADVANCE/CREATED, una PARCEL/CANCELLED por la integración y una DOCUMENT cancelada desde la UI. Corridas finales: MDR-000029…032 y MDR-000033…036; corridas previas fallidas por la validación dejaron MDR-000005…028 como historial local. Bugs corregidos: sincronización de filtros con la transición de URL y selects truncados en móvil (ver [docs/V1.5-B.md](docs/V1.5-B.md)).

# Histórico — Mandaria Web V1.4-B

Fecha: 2026-09-15. Proyecto existente `mandaria-web`, backend local real OpenAPI 1.4.0. Implementación y validación V1.4-B completadas dentro de su alcance. No se modificaron backend ni Coita Eats y no se implementaron funcionalidades V1.5. No se hizo commit ni push. Rama observada al finalizar: `1.4-vehiculo_condcutor_asignacion`.

## Calidad ejecutada

| Verificación                                          | Resultado                                              |
| ----------------------------------------------------- | ------------------------------------------------------ |
| `npm run build`                                       | PASS: TypeScript estricto y build Vite                 |
| `npm run lint`                                        | PASS                                                   |
| `npm run typecheck:test`                              | PASS                                                   |
| `npm test`                                            | PASS: **97 tests**, 4 archivos; incluye regresión V1.3 |
| `npm run format:check`                                | PASS                                                   |
| `node --check scripts/verify-logistics.mjs`           | PASS                                                   |
| `git diff --check`                                    | PASS                                                   |
| Revisión de secretos contra valores del entorno local | 50 archivos revisados, 0 coincidencias                 |
| CI / Docker                                           | Pendientes; no ejecutados en esta tarea                |

## Matriz real de navegador

Ejecutado `scripts/verify-logistics.mjs` en Chromium contra `http://localhost:5173` y Mandaria Backend `http://localhost:3000`. **9 grupos PASS, 0 fallos**. El login usa email/password reales; no se manipularon roles, localStorage ni respuestas.

| Flujo                                | Resultado y evidencia                                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SUPER_ADMIN                          | Login, Dashboard, Integrations, Providers y navegación PASS                                                                                                                |
| PROVIDER_ADMIN A                     | Login, dashboard propio, filtros de repartidor/vehículo, detalle, uso 3/3 y URL de alta bloqueada al límite PASS                                                           |
| Refresh / sesión                     | Recarga rota refresh real; revocar el refresh de la sesión de prueba provoca 401, limpieza y login; nuevo login/logout PASS                                                |
| Drivers y Vehicles por proveedor     | Datos reales de A y B, con comprobación de providerId de todos los registros recibidos PASS                                                                                |
| A→B / B→A                            | URL de proveedor ajeno 403 sin tabla; GET/POST del backend ajeno 403; ID ajeno bajo proveedor propio 404 seguro PASS                                                       |
| Integrations / administración global | Menús ausentes y URLs bloqueadas; endpoints administrativos rechazan al rol PROVIDER_ADMIN PASS                                                                            |
| Sin membership                       | Estado vacío en módulos y parámetros manipulados; APIs 403 sin seleccionar un proveedor arbitrario PASS                                                                    |
| Assign / unassign / reassign         | Operaciones desde UI con persistencia real e historial cerrado/actual PASS                                                                                                 |
| Asignaciones inválidas               | Inactivo, mantenimiento, suspendido, driver suspendido, ocupado, ya asignado y cross-provider rechazados PASS                                                              |
| Conflicto concurrente visible        | Vehicle pasa a MAINTENANCE después de abrir selector; POST devuelve 409 y el diálogo muestra mensaje español seguro PASS                                                   |
| INDEPENDENT                          | Alta real de Luis (User DRIVER ya existente), BICI-V14B sin placa, activación, detalle y asignación PASS                                                                   |
| Responsive                           | Listas drivers/vehicles en 1440×1000, 820×1180 y 390×844; sin desbordamiento de página, tabla desplazable y drawer móvil PASS                                              |
| Consola / URLs / almacenamiento      | Sin excepciones ni errores inesperados; localStorage e IndexedDB vacíos, sessionStorage sólo refresh durante sesión y vacío tras logout; sin secretos en URLs/consola PASS |

Se observaron **10 mensajes HTTP nativos esperados** de Chromium al provocar 401/403/404/409. No son excepciones de la aplicación. En esta tarea la expiración se probó mediante revocación real del refresh; no se volvió a esperar el vencimiento temporal del access token de 900 segundos. La prueba temporal completa sigue documentada en el checkpoint V1.3 y su script; los tests automatizados de 401/refresh continúan pasando.

Artefactos locales ignorados por Git: `test-results/logistics/report.json` y seis capturas de escritorio/tablet/móvil. El script conserva sólo reporte y capturas; nunca HAR, traces, tokens ni storageState. Las capturas de fallos de intentos intermedios no sustituyen el reporte final exitoso.

## Datos locales y bugs corregidos

- Quedaron **Carlos→MOTO-01, Pedro→MOTO-02 y José→BICI-01**, todos activos, con el historial real de la prueba conservado.
- Se crearon **Luis** y **BICI-V14B** en el proveedor INDEPENDENT de validación existente; quedaron asignados. No se crearon usuarios ni se cambiaron memberships. No hay DELETE logístico para retirar fixtures.
- Se corrigió el nombre accesible de los campos: `Field` separa etiqueta y ayuda para que Chromium no incluya las opciones del select en su nombre.
- Se corrigió la invalidación de caché al editar límites/estado de Provider: las nuevas tarjetas de capacidad se actualizan. Incluye prueba de regresión.
- El origen `127.0.0.1:5173` no estaba habilitado por CORS; la prueba utiliza `localhost:5173`, permitido por backend. No fue necesario cambiar archivos/configuración del backend.
- Un intento demasiado rápido alcanzó el límite real de refresh y mostró correctamente 429. El script ahora espacia recargas sin desactivar la protección.
- Se detectó que Mario ya tenía perfil en B. El backend rechazó duplicarlo y la UI informó correctamente el conflicto; el alta se validó con Luis, que no tenía perfil.

Arquitectura, endpoints, DTOs, decisiones, limitaciones y reproducción en [V1.4-B.md](docs/V1.4-B.md). No se inventaron listados globales ni agregados globales; tampoco selección administrativa de Users para PROVIDER_ADMIN o filtros de vehículos libres que el backend no expone. CI sigue pendiente localmente y fuera de Git por instrucción previa.

---

# Histórico: checkpoint PROVIDER_ADMIN de Mandaria Web V1.3

La validación real pendiente de **PROVIDER_ADMIN** se completó el 2026-09-15: cuentas A/B/sin membership, aislamiento UI y backend, expiración real, refresh, logout y regresión SUPER_ADMIN. Build, lint, tipos y 44 tests pasaron. No fueron necesarias correcciones al runtime de la aplicación.

Ver [reporte reproducible de PROVIDER_ADMIN](docs/PROVIDER-ADMIN-VALIDATION.md). El bloqueo Docker de la entrega original continúa fuera del alcance de esta validación; CI sigue pendiente localmente.

---

# Histórico: verificación de la implementación inicial V1.3

Fecha: 2026-09-15. Entorno: Windows, Node.js 24, Mandaria Backend V1.2 local y PostgreSQL existente. Repositorio de trabajo: `mandaria-frontend`; paquete independiente `mandaria-web`, rama QA.

## Estado de entrega

**No se declara V1.3 terminada.** La implementación está disponible, pero permanecen pendientes el Docker build y la validación real de PROVIDER_ADMIN/memberships. No se modificaron backend, Coita Eats, bases de datos ni cuentas directamente. Se ejecutaron operaciones de prueba autorizadas exclusivamente mediante la API de Mandaria.

## Verificaciones ejecutadas

| Verificación                                                                      | Resultado                                                                          |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| React/Vite/TypeScript strict, build producción                                    | PASS                                                                               |
| ESLint                                                                            | PASS                                                                               |
| Tipado de tests                                                                   | PASS                                                                               |
| Vitest + Testing Library                                                          | 35 PASS, 2 archivos                                                                |
| Login SUPER_ADMIN real                                                            | PASS                                                                               |
| Restauración al recargar y refresh rotatorio real                                 | PASS                                                                               |
| Logout real y acceso protegido posterior                                          | PASS                                                                               |
| Login incorrecto, expiración, refresh concurrente, 401/403                        | PASS en tests automatizados                                                        |
| Rutas y navegación por SUPER_ADMIN/PROVIDER_ADMIN                                 | PASS en tests automatizados                                                        |
| Dashboard con totales y datos reales                                              | PASS                                                                               |
| Integraciones: listado, crear, activar y suspender                                | PASS en navegador real                                                             |
| Coita Eats                                                                        | No aparece en el listado recibido; no se creó ni hardcodeó                         |
| Credenciales: crear, advertencia única, copiar, cerrar, rotar, revocar            | PASS en navegador real                                                             |
| Secreto no recuperable después de cerrar/recargar                                 | PASS                                                                               |
| Secreto ausente en localStorage/sessionStorage/IndexedDB y consola                | PASS en navegador real; caché QueryClient también probado en tests                 |
| Providers: crear FLEET/INDEPENDENT, defaults, detalle, límites, activar/suspender | PASS en navegador real                                                             |
| Búsqueda y filtros de tipo/estado                                                 | PASS en navegador real                                                             |
| Memberships: asociar y retirar sin borrar User                                    | PASS con servicios simulados; pendiente en backend real                            |
| PROVIDER_ADMIN real, perfil propio, 403 manual                                    | PENDIENTE: no hay cuenta local con ese rol; requiere aprovisionamiento del backend |
| Empty/error/network/403/404                                                       | Implementados; cubiertos por pruebas según el flujo                                |
| Responsive 1024, 768, 390 px                                                      | PASS en navegador; sin overflow horizontal de página; tablas desplazables          |
| Consola del navegador                                                             | Sin errores en la ejecución completa                                               |
| Docker build                                                                      | BLOQUEADO por motor Docker Desktop                                                 |
| GitHub Actions                                                                    | Configurado, no ejecutado remotamente                                              |

Prueba reproducible: `npm run test:e2e`, con cuentas locales configuradas como explica README. Reporte detallado y capturas en `test-results/manual/` (ignorados por Git). No se guardan tokens, secretos, HAR ni estados de autenticación.

## Bloqueos reales

### Docker

Se intentó `docker build --build-arg VITE_API_URL=http://localhost:3000 -t mandaria-web:v1.3 .`. Falló antes de construir: no existe el pipe `dockerDesktopLinuxEngine`. Se intentó iniciar Docker Desktop, también mediante `docker desktop start --timeout 45`, sin éxito. El log local muestra un fallo al inicializar Inference Manager y acceder al socket `dockerInference`. No se reseteó Docker ni se alteró su configuración/datos. Repetir el build con un motor funcional; Dockerfile y Nginx no se consideran validados por ejecución.

### Cuenta PROVIDER_ADMIN

`GET /users` devolvió cero cuentas PROVIDER_ADMIN. No existe endpoint de creación de User. Se solicitó preparar una cuenta mediante el backend y registrar sus credenciales sólo en `.env.e2e` ignorado. No se inventó un endpoint, no se cambió el rol de una cuenta existente y no se accedió a la base directamente. Tests verifican el aislamiento de rutas, perfil y asociaciones con dobles de servicio, pero eso no sustituye el login real exigido en el DoD.

## Registros de prueba y seguridad

Se crearon integraciones con nombre `Validación Web ...` y códigos `WEB_...`, y proveedores `WEB_FLEET_...` / `WEB_INDEPENDENT_...`. Permanecen en el backend porque no hay endpoint para eliminarlos. Las credenciales generadas en la ejecución completa fueron revocadas; también se revocaron expresamente las dos credenciales dejadas por ejecuciones interrumpidas. No se conservaron sus secretos.

Se corrigieron durante validación: selector de tipo mal formado, tipado de render de errores, restauración inicial con React, mock async de logout, etiqueta accesible del secreto y selector de prueba de búsqueda. Las pruebas fallidas no se cuentan como validaciones exitosas; se repitió la ejecución completa hasta pasar los flujos disponibles.

## Pendientes para cerrar V1.3

1. Aprovisionar una cuenta PROVIDER_ADMIN local y ejecutar el tramo real de asociación, login, perfil propio y rechazo de `/integrations`.
2. Ejecutar Docker build y comprobar SPA fallback/headers del contenedor con motor disponible.
3. Revisión humana de operación y aprobación del despliegue. Las pruebas de navegador realizadas fueron automatizadas, no una sesión manual del propietario.

V1.4 no se implementa aquí. Sus módulos de repartidores y vehículos podrán agregarse cuando existan contratos de API confirmados.

## Revisión final adicional

- Prettier format:check y git diff --check: PASS.
- Auditoría npm de dependencias de producción: 0 vulnerabilidades.
- Comparación de archivos publicables y assets compilados contra los secretos reales del backend: ninguna coincidencia, sin imprimir valores.
- Capturas responsive regeneradas después de completar las transiciones del drawer; cierre con Escape verificado.
- Prueba adicional de respuesta HTTP tardía tras logout: evita afectar sesiones posteriores.

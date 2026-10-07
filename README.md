# Mandaria Web — V1.11-B

## V1.17 Web — clientes directos y pagador (2026-10-06)

Interfaz local de identidad cliente, capacidades, MPQ/conversión/consentimiento final, seguimiento, política B2B SUPER_ADMIN y shippingPayment operativo. Conserva roles operativos y lectura de ejecución detallada; no incorpora cobro ni avances DRIVER web. Admisión no activada, sin disponibilidad productiva acreditada. Recuperación durable mínima, límites contractuales, rutas/archivos y procedimiento: [V1.17-WEB](docs/V1.17-WEB.md).

Validación frontend: 227 pruebas pertinentes, tipos, lint, build y recorrido visual con fixtures. Integración real A–E pendiente; no declarar V1.17 completa sólo por esta Web. Continuidad anterior preservada.

## Portal: seguimiento público B2B — 2026-10-04

Actualización editorial posterior: OpenAPI público resincronizado; la descripción de executionProgress ya indica ordenar fotografías de una misma solicitud mediante publicVersion. Queda cerrada la discrepancia editorial registrada inicialmente en VERIFICATION. revision interna y expectedRevision de concurrencia permanecen sin cambios. No implica despliegue.

`/developers/execution` documenta publicVersion (comparación BigInt por MDR), trackingMode, assignmentState, terminalOutcome persistente, identidad receptora tras transferencia y atención/cancelación bajo custodia. Consulta compartida desde el backend integrador: objetivo 15 segundos sujeto a límites agregados, backoff y parada al confirmar terminal. Se conserva delivery.completed; sin timeline, GPS ni nuevos webhooks. **Disponible en el checkout QA del backend, pendiente de despliegue; no se acredita producción.**

Actualizar con `node scripts/sync-public-b2b.mjs` y detectar diferencias con `node scripts/sync-public-b2b.mjs --check` (opcional `--backend <ruta>`). El mecanismo conserva la allowlist de cinco artefactos públicos y sus hashes; no copiar OpenAPI general ni documentos administrativos. Los ejemplos de seguimiento se leen del JSON público sincronizado. `src/developers/tracking.md` contiene la explicación pública revisada contra el handoff; al cambiarlo, revisar también este texto y ejecutar las pruebas del portal. No distribuir PUBLIC-B2B-TRACKING.md completo: contiene información interna de implementación/despliegue; su enlace público se dirige a `/developers/execution`.

Verificación local, evidencia visual y discrepancia editorial pendiente del contrato: [VERIFICATION.md](VERIFICATION.md). La sincronización no habilita ninguna capacidad ni ejecuta peticiones de seguimiento.

### Cierre contractual de ejecución (2026-10-04)

El cierre web exige trackingMode=LEGACY explícito y asignación activa propia. DETAILED es de consulta; null/campo ausente/error no habilitan entrega. Los avances históricos propios de PROVIDER_ADMIN se consultan o cierran técnicamente con la clave original y confirmación, sin reenviarlos ni recuperar permisos de avance. Marcador mínimo durable, timeout y permisos: [procedimiento actualizado](docs/EXECUTION-RECONCILIATION.md). Esta entrada sustituye las limitaciones de contrato documentadas anteriormente.


## Autoridad de ejecución — 2026-10-04

El repartidor registra hitos y entrega detallada desde la futura app compatible. Mandaria Web muestra progreso e historial en lectura para proveedor y DRIVER; conserva incidencias/asignaciones autorizadas, resoluciones SUPER_ADMIN y cierre legacy del proveedor/independiente. No usar avisos telefónicos para registrar nuevos hitos administrativos. PHONE_REPORT permanece en la historia y en incidencias recibidas. Recuperación anterior, límites contractuales y pendientes de la app: [docs/DETAILED-EXECUTION.md](docs/DETAILED-EXECUTION.md).


## Intentos de resolución — 2026-10-03

Cierre actual revisado: 79 pruebas focalizadas, TypeScript, lint, build y revisión visual local aprobados. Los cambios ya preparados se conservaron; se completaron mensajes y prueba de confirmación/timeout. Ver VERIFICATION para distinguir esta ejecución de las anteriores. Integración real backend todavía pendiente; función sin activar.

Integrada consulta durable y cierre explícito del intento propio. APPLIED exige auditoría coherente; PENDING_OR_UNKNOWN bloquea; CLOSED_NO_EFFECTS permite sólo preparar una nueva resolución cuando el contrato y el estado vigente lo permiten. Sin repetición automática ni reversión física. [Procedimiento vigente e historial](docs/EXECUTION-RECONCILIATION.md).
## Solicitudes de socio (Fase 1) — 2026-10-04

Bandeja SUPER_ADMIN en `/admin/partner-applications` (menú «Solicitudes de socio») para los leads que envía la landing. Una solicitud **no es una cuenta**: aprobarla no crea proveedores, invitaciones ni repartidores. Contrato: `mandaria-landing/docs/solicitudes-socio/CONTRATO.md`; fuente que manda: `mandaria-backend/docs/PARTNER-APPLICATIONS-HANDOFF.md`. Backend implementado localmente en `feat/solicitud-repartidor`, sin commit ni despliegue.

- Dominio `src/partner-applications/` (`types`, `service`, `queries`, `format`, `pages`). Clave `reference` (`SOC-NNNNNN`, sin distinguir mayúsculas); no existe `id` interno.
- Lista: filtros estado, tipo y `q` en la URL; paginación `page`/`pageSize` (20). Vista por defecto «Abiertas» (`status=RECEIVED,CONTACTED`; el backend acepta varios estados separados por comas); también cada estado por separado y «Todos los estados», que omite el filtro. `submissionCount` > 1 se resalta.
- Detalle: contacto (`tel:`, `https://wa.me/52<phone>`, `mailto:`), botones de estado sólo desde `allowedTransitions` (la máquina de estados no se duplica). `APPROVED`, `REJECTED` y `DISCARDED` piden nota (≤ 500) en un diálogo de confirmación; `APPROVED → REJECTED` nunca precarga la nota anterior. Un 409 de transición vuelve a leer la solicitud.
- «Alta en Mandaria» (sólo `APPROVED`): pasos guiados con enlaces a Proveedores, Repartidores e Independientes. Los vínculos se eligen de proveedores FLEET reales y de invitaciones enviadas exactamente al correo de la solicitud (FLEET: PROVIDER_ADMIN; INDIVIDUAL: DRIVER y sin proveedor). El proveedor que recibe a los independientes sigue pendiente del propietario y no se fija en código.
- Errores por `code`: `PARTNER_APPLICATION_NOT_FOUND`, `PARTNER_APPLICATION_INVALID_TRANSITION`, `PARTNER_APPLICATION_LINK_INVALID` (un solo código para varias causas; el mensaje las enumera y el formulario descarta antes las detectables: invitación de otro proveedor).
- Dashboard SUPER_ADMIN: contador de solicitudes `RECEIVED`.

Verificación real y límites: [VERIFICATION.md](VERIFICATION.md).

## Ejecución detallada — 2026-10-02

Interfaces preparadas sin activar la capacidad: cinco fases según permisos del servidor, historial paginado, incidencias reteniendo custodia, cola SUPER_ADMIN y resolución por devolución/transferencia. Integradas en los servicios existentes de proveedor/independiente y consulta de flotilla. Legacy conserva su flujo. El portal `/developers/execution` consume sólo la guía/OpenAPI B2B revisados.

Contrato, archivos, rutas, recuperación exacta de idempotencia y límites: [DETAILED-EXECUTION.md](docs/DETAILED-EXECUTION.md). Resultados focalizados y evidencia visual: [VERIFICATION.md](VERIFICATION.md). **Actualización 2026-10-03:** transferencias/devoluciones conservan un marcador mínimo tras recarga/cierre. La recuperación por lectura bloquea otra resolución cuando no puede determinarse el cierre. No se persiste el cuerpo privado ni se reconstruye un replay. Procedimiento y bloqueo exacto para Backend: [EXECUTION-RECONCILIATION.md](docs/EXECUTION-RECONCILIATION.md). No se modificó ni activó backend. El historial de versiones a continuación se conserva como continuidad.

Base administrativa independiente para Mandaria Backend V1.4. React + Vite + TypeScript estricto. Nombre de paquete: `mandaria-web`; se desarrolla en el repositorio existente `mandaria-frontend`, independiente de Coita Eats. No accede a PostgreSQL, Prisma ni servicios de Coita Eats.

**Estado:** V1.11-B cierra el MVP con la confirmación manual de entrega: el PROVIDER_ADMIN dueño del servicio lo marca como entregado cuando su repartidor le avisa (fuera de Mandaria) y el repartidor independiente confirma la suya desde su portal. El Dispatch pasa a `DELIVERED`, la asignación a `COMPLETED`, el repartidor y el vehículo quedan libres y no hay movimientos de créditos. `DELIVERED` es terminal: no se deshace. Sin prueba de entrega, seguimiento ni webhooks. Ver [V1.11-B](docs/V1.11-B.md). V1.10-F agrega la administración de créditos y monetización: SUPER_ADMIN consulta el saldo y el historial de créditos de cada proveedor y de cada repartidor independiente desde su propia ficha, registra recargas (pagos confirmados fuera de Mandaria) y ajustes administrativos, y administra las políticas de créditos versionadas con su calculadora; PROVIDER_ADMIN y DRIVER consultan su propio saldo en sólo lectura. Los créditos Mandaria son una unidad interna de consumo y nunca se muestran como dinero. No hay pasarela de pago, recargas automáticas ni devoluciones manuales. Ver [V1.10-F](docs/V1.10-F.md). V1.9-C agrega la administración de cobertura de servicio: SUPER_ADMIN decide desde el detalle del proveedor en qué zonas y tipos de servicio recibe servicios de flotilla (agregar, activar, desactivar; nunca borrar) y PROVIDER_ADMIN consulta «Mi cobertura» en sólo lectura. La cobertura afecta a los nuevos Dispatches; los candidatos de los ya abiertos no se recalculan. Ver [V1.9-C](docs/V1.9-C.md). V1.9-B agrega la administración de repartidores independientes y un portal web temporal para ellos: SUPER_ADMIN habilita, suspende y rechaza la capacidad independiente y administra sus vehículos propios; el repartidor habilitado consulta servicios disponibles, los toma con una sola operación atómica, ve su servicio actual y puede liberarlo. Sin Driver App, sin sockets y sin estados de ejecución. Ver [V1.9-B](docs/V1.9-B.md). V1.8-B agrega la asignación de repartidor y vehículo: el PROVIDER_ADMIN dueño de un servicio tomado asigna, reasigna y cancela la asignación, con el backend como única autoridad de cuál queda vigente. El Dispatch sigue siendo `CLAIMED`; que esté asignado se deriva de la `DeliveryAssignment` real. SUPER_ADMIN sólo audita el historial. Ver [V1.8-B](docs/V1.8-B.md). V1.7-B agrega visibilidad de despachos y toma de servicios: PROVIDER_ADMIN ve los servicios ofrecidos a su proveedor, los toma (el backend decide quién gana) y puede liberarlos; SUPER_ADMIN audita los despachos en sólo lectura. No asigna repartidor ni vehículo (V1.8) y no usa sockets. Ver [V1.7-B](docs/V1.7-B.md). V1.6.1-B agrega invitaciones y activación de cuentas: **production user provisioning no longer requires local seeds**. SUPER_ADMIN invita administradores de proveedor y repartidores; PROVIDER_ADMIN invita repartidores de sus proveedores; la persona invitada crea su contraseña en `/activate-account`. Los seeds locales quedan sólo como herramientas de desarrollo. Ver [V1.6.1-B](docs/V1.6.1-B.md). V1.6-B agrega zonas de servicio, tarifas versionadas y consulta de cotizaciones (sólo SUPER_ADMIN) sobre la administración V1.5 de Delivery Requests. Contrato y decisiones en [V1.6-B](docs/V1.6-B.md), [V1.5-B](docs/V1.5-B.md) y [V1.4-B](docs/V1.4-B.md). Resultados ejecutados en [VERIFICATION.md](VERIFICATION.md). CI y Docker permanecen pendientes; no forman parte de esta tarea.

## Entrada al portal detrás de nginx — 2026-10-01

Corrección preparada, no desplegada. El propietario reporta `/developers` → 301 a `/developers/` → 403, mientras `/developers/reference` y el JSON real responden 200. Existe `developers/` físico para assets; el `try_files $uri $uri/ /index.html` general puede elegir ese directorio en vez de la SPA.

En HTTPS, las ubicaciones **exactas** `/developers` y `/developers/` sirven `try_files /index.html =404;`: usan la entrada SPA sin consultar `$uri` ni `$uri/`. Si falta el build/index, responden 404; no intentan listar el directorio. Se conserva `expires -1`. HTTP mantiene su redirección existente a HTTPS.

Se mantienen archivos reales en `/developers/assets/` con 404 si faltan, JSON inexistente sin fallback HTML, rutas profundas con fallback SPA, interruptor reversible Swagger y proxies API/health.

Regresión estática reproducible (no arranca nginx):

```sh
node --test --test-isolation=none scripts/check-developers-entry.test.mjs
node scripts/check-swagger-policy.mjs
```

Validación real pendiente en el entorno nginx efectivo, sin ejecutar en esta tarea: `nginx -t` y, tras publicación autorizada, GET HTTPS **sin seguir redirects** a `/developers` y `/developers/`: ambos deben devolver 200 con HTML de la SPA, sin 301/403 ni cabecera Location. Repetir con query string y confirmar carga/navegación. Verificar `/developers/reference` 200, `/developers/assets/openapi-b2b.json` 200 JSON válido, `/developers/assets/no-existe.json` y `/developers/no-existe.json` 404 sin HTML SPA. Comprobar Swagger bloqueado y API/health intactos. Ninguna prueba de Vite sustituye esta validación de nginx.

## Swagger completo: restricción pública reversible — 2026-10-01

Configuración preparada, **no desplegada**. Se conserva Swagger en backend. `src/setup.ts` del backend registra `SwaggerModule.setup('docs', app, doc)` sin `useGlobalPrefix`. La dependencia instalada confirma UI `/docs`, `/docs/`, `/docs/index.html`, JSON `/docs-json`, YAML `/docs-yaml` y recursos `/docs/swagger-ui-init.js`, CSS, bundles, favicons y LICENSE bajo `/docs/`. También se cubre cualquier subruta anidada; no existe en el código consultado un montaje raíz `/swagger` alternativo.

### Interruptor central

Al inicio de `nginx.conf`, en contexto `http` (como se incluye actualmente en `/etc/nginx/conf.d/default.conf`), existe una sola política:

```nginx
map $uri $block_public_swagger {
    default 0;
    ~*^/(?:api/v1/)?docs 1;
}
```

**1 = bloqueado, 0 = público.** Cambiar únicamente el valor final de la línea del patrón; mantener `default 0`. Ambos servidores, HTTP y HTTPS, aplican `if ($block_public_swagger) { return 404; }` antes de elegir ubicación/proxy/fallback. `if` sólo ejecuta `return`, no reescribe ni redirige. El map trabaja sobre `$uri` normalizada, sin argumentos, y es insensible a mayúsculas. Abarca el prefijo completo `/docs` (incluye JSON/YAML) y `/api/v1/docs` defensivamente; no depende de cookies, cabeceras, parámetros ni JavaScript. No usar `?swagger=1` ni mecanismos equivalentes.

Los proxies existentes quedan presentes para facilitar reversión. `/developers`, sus archivos B2B, `/api/`, `/health`, certificados ACME y assets mantienen sus reglas. Este bloqueo no revoca copias del contrato descargadas anteriormente.

### Restringir públicamente

1. En el fichero de configuración efectivo, respaldar la configuración y establecer `~*^/(?:api/v1/)?docs 1;`. Mantener el mismo valor en el repositorio para futuras publicaciones.
2. En el **entorno nginx efectivo**, con sus certificados y resolución del upstream disponibles, ejecutar `nginx -t`. Si falla, no recargar: corregir o restaurar el respaldo.
3. Sólo después de éxito, ejecutar `nginx -s reload` en ese mismo entorno, o el procedimiento equivalente del servicio utilizado. No validar una instalación distinta de la que se recarga. El Dockerfile copia este fichero al construir: si se usa imagen inmutable, operación debe preparar la configuración por su procedimiento de publicación; editar el repositorio no altera un contenedor existente. No se ejecutó Docker aquí.
4. Comprobar sin sesión desde fuera de la red privada las rutas y variantes de la matriz inferior. Swagger debe devolver **404**, nunca 200 con UI/JSON/YAML ni HTML del fallback SPA. HTTP también devuelve 404 para esas rutas; no sólo una redirección a HTTPS.
5. Confirmar 200 y navegación directa de `/developers/reference`, 200 `application/json` y JSON válido en `/developers/assets/openapi-b2b.json`; comprobar `/health` y una lectura API autorizada sin operaciones reales.

### Volver a habilitar públicamente

1. Cambiar sólo `~*^/(?:api/v1/)?docs 1;` por `~*^/(?:api/v1/)?docs 0;`. Esto vuelve a exponer **todo** el contrato, no sólo la interfaz. Sin cambio backend, rebuild frontend ni controles de navegador.
2. Ejecutar `nginx -t` en el entorno efectivo. Si no pasa, no recargar.
3. Después de éxito, ejecutar `nginx -s reload` (o recarga del servicio equivalente).
4. Comprobar `/docs` y `/docs/` (UI, admitiendo redirección canónica), `/docs-json` (200 JSON parseable), `/docs-yaml` (200 YAML), `/docs/swagger-ui-init.js`, CSS y bundles (200). HTTP vuelve a redirigir por la regla existente. Las variantes defensivas `/api/v1/docs` no se convierten en nuevos endpoints al revertir: sólo las rutas reales deben servir Swagger.
5. Repetir comprobación de portal, descarga B2B, API y health. Para restringir otra vez, repetir el procedimiento anterior poniendo 1.

### Matriz HTTP posterior (no ejecutada aquí)

Usar `curl --path-as-is -i 'https://mandaria.com.mx/RUTA'` y repetir con HTTP cuando corresponda. En modo restringido, esperar 404 para:

- `/docs`, `/docs/`, `/docs/index.html`, `/docs-json`, `/docs-yaml`.
- `/docs/swagger-ui-init.js`, `/docs/swagger-ui.css`, `/docs/swagger-ui-bundle.js`, `/docs/swagger-ui-standalone-preset.js`, `/docs/favicon-32x32.png`, `/docs/LICENSE`, `/docs/docs/swagger-ui-init.js`.
- `/DOCS`, `/DOCS-JSON`, `//docs`, `/docs//swagger-ui.css`, `/%64ocs`, `/docs%2fswagger-ui.css`, `/x/../docs-json`, `/api/v1/../../docs-yaml`.
- `/api/v1/docs`, `/api/v1/docs-json`, `/api/v1/docs-yaml`, `/docs?public=1`, `/docs-json?download=1`.

Nginx normaliza escapes, barras y segmentos antes de aplicar ubicaciones; las entradas malformadas pueden recibir 400, lo que también deniega acceso. Las pruebas HTTP deben verificar que ninguna variante entrega Swagger o `index.html`. La comprobación Node local sólo revisa el patrón sobre rutas normalizadas y la presencia de reglas: **no sustituye al parser ni a la normalización real de nginx**. Repetir contra cualquier otro virtual host/puerto proxy de la instalación; el repositorio no acredita que no existan configuraciones adicionales en el servidor.

### Soporte mediante túnel SSH privado

Evidencia disponible de sólo lectura: `mandaria-backend/docker-compose.yml` publica el backend como `127.0.0.1:${PORT:-3000}:3000`; nginx apunta a `backend:3000` dentro de su red. El proceso Nest escucha `0.0.0.0` dentro de su entorno. **3000 es un valor por defecto del host, no un puerto desplegado confirmado**. No se consultó `.env` remoto, firewall ni listeners reales.

1. Acceder por SSH al host autorizado y comprobar el listener con `ss -lntp` y la configuración efectiva disponible, sin volcar secretos. Identificar el puerto backend ligado a loopback y comprobar privadamente `/health` y `/docs-json`. No asumir que el nombre de red `backend` resuelve desde el host.
2. Si existe ese listener privado, desde el equipo de soporte usar valores comprobados (los marcadores siguientes no son destinos reales):

```text
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:<PUERTO_LOCAL_LIBRE>:127.0.0.1:<PUERTO_BACKEND_VERIFICADO> <USUARIO_SSH>@<HOST_SSH_AUTORIZADO>
```

3. Abrir `http://127.0.0.1:<PUERTO_LOCAL_LIBRE>/docs` en ese equipo; JSON/YAML por el mismo túnel. Accede directamente al backend privado, sin pasar por el nginx público. Mantener ambos extremos locales a loopback; cerrar SSH al terminar. No hace falta desactivar el bloqueo público. Si no existe un listener privado alcanzable desde el host SSH, detenerse y pedir a operación un destino privado comprobado; no abrir ni publicar un puerto como solución.

**Posible bypass:** si el backend desplegado escucha directamente en una IP/puerto públicos y el firewall permite entrada, `/docs`, `/docs-json` y `/docs-yaml` seguirán accesibles por ese puerto: nginx no puede proteger tráfico que lo evita. El compose consultado limita el binding a loopback, pero no prueba la instalación real. Antes de declarar la restricción efectiva, operación debe comprobar listeners, reglas de red/firewall y ausencia de acceso directo desde fuera. No se modificó ni abrió ningún puerto.

## Publicación confirmada — 2026-10-01

- Web: `https://mandaria.com.mx`
- API: `https://mandaria.com.mx/api/v1`
- Portal: `https://mandaria.com.mx/developers`
- **Valor de build: `VITE_API_URL=https://mandaria.com.mx`**, sin `/api/v1`.

Todos los consumidores de la configuración fueron revisados: el transporte central de `src/services/api.ts` añade `/api/v1` para login, refresh, logout, API autenticada, operaciones públicas y generación única de secretos; el portal muestra el origen explícito. `parseEnv` rechaza rutas, incluido `/api/v1`, en vez de construir un prefijo duplicado. Los scripts E2E usan su variable separada `E2E_API_URL`, también sin prefijo; no se ejecutaron contra publicación. Se conserva `.env` local; `.env.example` documenta ambas opciones. Cambiar variables del contenedor después de compilar no cambia el JS estático: suministrar el valor al build.

Build de publicación local, sin desplegar ni Docker:

```powershell
$env:VITE_API_URL='https://mandaria.com.mx'
npm run build
```

En shell POSIX: `VITE_API_URL=https://mandaria.com.mx npm run build`. El Dockerfile existente recibe la misma variable mediante ARG si operación decide construir su imagen posteriormente; no se cambió ni ejecutó aquí.

El backend ya entregó `servers[0].url=https://mandaria.com.mx` y la guía con los destinos confirmados. Se sincronizaron mediante el script documentado abajo, incluyendo manifest; ninguna copia generada se editó a mano. Las rutas del OpenAPI llevan `/api/v1` y se concatenan al origen sin duplicarlo. La referencia muestra el servidor leído del JSON, y el ejemplo copiable usa `MANDARIA_API_BASE=https://mandaria.com.mx/api/v1` seguido de `/integrations/me`, sin ejecutar peticiones.

### Diff mínimo de hosting preparado

`nginx.conf` conserva TLS, redirect HTTP, proxy `/api/` (sin reescritura de URI), `/docs`, `/health`, `/assets/` y fallback SPA. Agrega únicamente:

- `/developers/assets/` con prioridad `^~`, `try_files $uri =404`, JSON como `application/json` y guías/ejemplo como texto. Revalidación con `expires -1` para no perpetuar documentación antigua. Un archivo ausente devuelve 404 de nginx, nunca `index.html`.
- JSON bajo `/developers/` fuera de assets devuelve 404 JSON. No se interpreta como ruta SPA.

`/developers`, `/developers/reference` y las demás páginas siguen usando el fallback existente `/index.html`. El acceso a Swagger completo no cambia. El diff está preparado localmente: no es confirmación de configuración instalada.

### Comprobaciones después del despliegue (no ejecutadas aquí)

En el entorno de hosting, validar `nginx -t` con su configuración/certificados/red reales antes de aplicar. Después de un despliegue autorizado:

```bash
curl -I https://mandaria.com.mx/developers
curl -I https://mandaria.com.mx/developers/reference
curl -D openapi-headers.txt -o openapi-b2b.json https://mandaria.com.mx/developers/assets/openapi-b2b.json
node -e "const s=JSON.parse(require('fs').readFileSync('openapi-b2b.json','utf8')); console.log(s.servers)"
curl -i https://mandaria.com.mx/developers/assets/missing.json
curl -i https://mandaria.com.mx/developers/missing.json
```

Esperados: páginas 200 HTML y navegación directa/recarga funcional sin sesión; contrato 200 `application/json`, JSON válido y origen confirmado; inexistentes 404 sin HTML de la aplicación. Comparar descarga con manifest normalizando CRLF a LF. Comprobar en navegador que las solicitudes autorizadas usen exactamente `/api/v1` y que proxy/rutas administrativas sigan funcionando, sin activar envíos de prueba. No se accedió a producción para estas comprobaciones.

## 2026-10-01 — Webhooks administrativos y portal B2B

Esta entrada amplía el estado histórico descrito arriba. Se agregó administración de webhooks para SUPER_ADMIN y documentación pública anónima; no habilita envíos ni acredita integración real.

- `/integrations/:id`: destino HTTPS, habilitación explícita, metadata del secreto de firma, deliverFrom, resumen y eventos paginados del cliente. Filtros: estado, solicitud, referencia externa exacta y fechas.
- `/integrations/:id/webhooks/:eventId`: intentos, HTTP, causa, duración y destino histórico separado del actual. Se comprueba el cliente antes de mostrar el evento.
- `/webhooks/health`: métricas compartidas separadas de `thisInstance`. Acceso desde el detalle de integración; sin rescate ni envío manual.
- `/developers` y subrutas `authentication`, `prequotes`, `webhooks`, `errors`, `reference`: acceso anónimo sin montar AuthProvider ni restaurar sesión administrativa. Guías revisadas, ejemplos copiables, referencia y descarga; sin consola de ejecución.

El secreto de firma es distinto de clientSecret B2B. Generación/rotación requiere confirmación y realiza un solo intento HTTP (sin repetición tras 401). El valor sólo vive en el componente, fuera de cachés y almacenamiento; se retira al cerrar, desmontar/navegar, cerrar sesión o salir de la página. Las respuestas tardías se descartan. Una respuesta perdida muestra incertidumbre explícita: el backend pudo rotarlo. No hay convivencia de secretos. Deshabilitar conserva pendientes y no garantiza detener peticiones en vuelo. HTTP 2xx/DELIVERED acredita aceptación por el receptor, no procesamiento comercial.

La configuración distingue GET 404 de errores de autorización/red. Refetch/foco actualiza datos limpios; si hay edición local y revisión remota diferente, se conserva la edición y se bloquea el guardado hasta resolver el conflicto. Las mutaciones invalidan las consultas de webhooks.

### Actualizar la documentación pública

Referencia de sólo lectura: `mandaria-backend/docs/B2B-FRONTEND-HANDOFF.md`. La entrega local revisada del 2026-10-01 ya existe; se copiaron únicamente cinco artefactos aprobados, nunca `docs/openapi.json` ni el handoff interno. `manifest.json` registra SHA-256 por archivo.

1. Solicitar al mantenedor backend una entrega revisada y su verificación `npm run docs:b2b:check`. El frontend no sustituye esa revisión ni ejecuta aquí comandos backend.
2. Revisar el diff de la entrega y actualizar explícitamente la lista de operaciones aprobadas si el contrato cambia.
3. Ejecutar desde frontend:

```bash
node scripts/sync-public-b2b.mjs --backend ../mandaria-backend
node scripts/sync-public-b2b.mjs --check --backend ../mandaria-backend
```

La primera orden copia exclusivamente los archivos públicos aprobados; `--check` no escribe y falla si las copias/huellas difieren del handoff disponible. La lista explícita admite las 15 operaciones revisadas; no publica automáticamente operaciones nuevas. El check necesita el checkout backend correcto y no demuestra por sí solo que su exportación esté actualizada frente al código backend.

El portal muestra el origen centralizado `VITE_API_URL`, sin inferirlo del host. La preparación posterior de publicación descrita arriba sustituye la advertencia inicial de dominio ficticio: el artefacto vigente ya usa el origen confirmado. La revisión visual previa sólo acreditó el servidor local Vite; hosting real sigue pendiente.

Dependencias nuevas: `react-markdown` y `remark-gfm` para representar directamente las guías revisadas y sus tablas, con HTML crudo deshabilitado y enlaces públicos controlados. No se ejecuta código de los ejemplos.

Implementación: `src/webhooks/`, `src/developers/`, integración en App/Root/detalle de integración y transporte `apiOnce` centralizado. Evidencia y límites en [VERIFICATION.md](VERIFICATION.md). No requiere cambios backend para este alcance según el contrato local consultado; despliegue equivalente y prueba E2E real quedan por confirmar; el origen definitivo ya está documentado arriba.

## Requisitos e instalación

- Node.js 24 o posterior compatible, npm 11.
- Mandaria Backend V1.6 con PostgreSQL operativo, migraciones y cuentas aprovisionadas por su procedimiento propio.
- Docker Desktop/motor Docker sólo para construir o ejecutar la imagen.

```bash
npm install
cp .env.example .env
npm run dev
```

PowerShell: `Copy-Item .env.example .env`. Para instalaciones reproducibles: `npm ci`.

## Variables

```env
VITE_API_URL=http://localhost:3000
```

`src/config/env.ts` es el único punto que lee `import.meta.env`. La URL representa la base del backend, sin `/api/v1`; el cliente añade ese prefijo. Debe ser HTTP(S), sin credenciales, query ni fragmentos. Configuración obligatoria validada al arrancar; un fallo muestra una página legible. Reinicia Vite tras cambiar `.env`.

No colocar clientSecret, claves de JWT, Integration Credentials ni credenciales de base de datos en Vite. _\*Todo VITE_* es público y se incorpora al build._* `.env`, `.env.e2e` y sus variantes están ignorados; `.env.example` no contiene secretos.

## Backend y CORS

Inicia Mandaria Backend con sus comandos documentados. El origen de Vite debe estar permitido en `CORS_ORIGINS` del backend. La validación V1.4 utiliza `http://localhost:5173`, permitido por la configuración local existente. `127.0.0.1` es un origen diferente y necesita su propia autorización CORS. No existe proxy hacia Coita Eats ni conexión directa a datos.

La web se autentica como **User** mediante email/password. No hay registro público. El alta de cuentas y los cambios de roles no están disponibles en la API actual.

## Comandos

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run typecheck:test
npm test
npm run test:watch
npm run format
npm run format:check
```

`build` ejecuta TypeScript y genera `dist/`. `test` ejecuta Vitest y Testing Library; `typecheck:test` verifica también los tipos de los tests. No requieren backend ni Docker. El workflow de GitHub Actions continúa pendiente localmente por instrucción del usuario.

### Prueba real de navegador

```bash
npx playwright install chromium
npm run test:e2e
```

Requiere backend y frontend iniciados. Configura localmente `.env.e2e`, **ignorado por Git**, con `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD`; opcionalmente `E2E_PROVIDER_EMAIL` y `E2E_PROVIDER_PASSWORD` de una cuenta PROVIDER_ADMIN existente. No agregues esas variables a Vite. El script de pruebas de Node las lee exclusivamente en memoria.

Alternativa local para una instalación que conserva credenciales bootstrap: define `MANDARIA_BACKEND_ENV` como ruta a su `.env`. El script sólo lo lee para obtener la cuenta de prueba; no imprime valores. `E2E_WEB_URL` puede cambiar el origen de prueba (default `http://localhost:5173`, el mismo host que publica Vite). `E2E_BROWSER_CHANNEL` permite usar un navegador ya instalado, por ejemplo `msedge`, cuando no se descargaron los de Playwright; lo aceptan todos los scripts `test:e2e*`.

El script **crea registros reales de prueba** con código `WEB_...`, genera/rota/revoca credenciales y modifica sus propios proveedores. No eliminará registros: la API carece de eliminación de cliente/proveedor. Una cuenta PROVIDER_ADMIN de prueba, si se configura, se asocia al proveedor creado. No usar cuentas productivas. Las capturas y el reporte quedan en `test-results/manual/`, ignorados por Git. No se capturan pantallas con secretos; capturas de fallo enmascaran inputs y textarea. No se guardan trazas de red, HAR, videos ni estados de autenticación.

### Validación real V1.10-F

`npm run test:e2e:credits` valida con navegador y backend reales: cuentas separadas de proveedor y de repartidor independiente, recarga y ajuste atómicos con `Idempotency-Key` (repetición idempotente y conflicto con otro cuerpo), historial inmutable sin rutas de escritura, políticas versionadas sin PATCH ni DELETE, cálculo del backend, aislamiento por rol (403 reales) y créditos nunca presentados como dinero. El script restaura el saldo que encontró. Ver [docs/V1.10-F.md](docs/V1.10-F.md).

### Validación real V1.7-B

`npm run test:e2e:dispatch` crea Quotes aceptadas reales y valida en navegador: A y B ven el servicio con dinero separado, A lo toma, B recibe el 409 claro, A libera con motivo y no vuelve a verlo, B lo toma, aislamiento por proveedor, expiración real, auditoría SUPER_ADMIN, bloqueo de DRIVER, responsive y auditoría de secretos. Requiere backend con `ROUTING_PROVIDER=local_fake` y `E2E_ROUTING_LOCAL_FAKE=1` (nunca llama a rutas de pago). Ver [docs/V1.7-B.md](docs/V1.7-B.md).

### Validación real V1.6.1-B

`npm run test:e2e:invitations` valida con navegador real invitación de PROVIDER_ADMIN y DRIVER, 409 de invitación duplicada, 429 de enfriamiento, reenvío con rotación de enlace, revocación, activación (inválida, revocada, contraseñas distintas, éxito, enlace reutilizado), login de las cuentas activadas, aislamiento entre proveedores, límite real de capacidad, responsive y auditoría de tokens/contraseñas. Requiere el backend con `MAIL_PROVIDER=local_outbox` y `E2E_MAIL_OUTBOX_DIR`; nunca envía correos reales. Ver [docs/V1.6.1-B.md](docs/V1.6.1-B.md).

### Validación real V1.6-B

`npm run test:e2e:pricing` valida con navegador real la navegación V1.6, el detalle de zona y su cobertura, el historial de versiones, la creación de una versión nueva, la edición de bandas en kilómetros guardadas en metros, la validación traducida, la activación, el histórico de sólo lectura, la superficie de cotizaciones, el detalle de solicitud con Cotizaciones, el responsive del editor y el bloqueo de PROVIDER_ADMIN. Su única mutación es una versión de tarifa clonada de la activa cuyas bandas se restauran antes de activar, de modo que la tarifa efectiva no cambia. Ver [docs/V1.6-B.md](docs/V1.6-B.md).

### Validación específica de PROVIDER_ADMIN

`npm run test:e2e:provider-admin` valida cuentas reales A/B/sin membership y la regresión SUPER_ADMIN. Sólo consulta recursos existentes y administra sus propias sesiones de autenticación; no crea fixtures de negocio. Requiere las cuatro cuentas preparadas por backend y espera el vencimiento real del access token. Configuración, alcance y resultados en [PROVIDER-ADMIN-VALIDATION.md](docs/PROVIDER-ADMIN-VALIDATION.md).

### Validación real V1.5-B

`npm run test:e2e:delivery-requests` valida con navegador real listado, filtros servidor, detalle, paquetes, contexto económico, cancelación, responsive, dashboard, PROVIDER_ADMIN bloqueado y regresión de navegación V1.4. Sólo cancela la solicitud indicada en `E2E_MDR_CANCEL`. Ver [docs/V1.5-B.md](docs/V1.5-B.md).

### Validación real V1.4-B

`npm run test:e2e:logistics` prueba login real, límites, altas, estados, asignaciones, aislamiento A/B, cuenta sin membership, responsive, almacenamiento y regresiones. Usa el backend local, conserva los registros e historial de validación y no modifica roles ni almacenamiento para simular identidades. Requisitos, datos y variables de prueba en [docs/V1.4-B.md](docs/V1.4-B.md).

## Arquitectura y carpetas

```text
src/
  app/             Composición, rutas, error boundary
  auth/            Contexto humano, login y ciclo de sesión
  components/      Formularios, tablas, modales, feedback y estados
  config/          Variables públicas centralizadas
  dashboard/       Resumen con datos paginados reales
  drivers/         Repartidores: listados, altas, estados y detalle
  vehicles/        Vehículos: listados, altas, estados y detalle
  assignments/     Asignar, desasignar e historial
  logistics/       Scope, filtros, capacidad, tipos y caché compartidos
  integrations/    Clientes B2B y credenciales
  layouts/         Sidebar, header, navegación responsive
  providers/       Catálogo, detalle, límites, membresías y perfil propio
  partner-applications/ Bandeja de solicitudes de socio (leads de la landing)
  services/        HTTP, normalizador de errores y QueryClient
  test/            Pruebas de flujos, permisos, HTTP y sesión
  types/           Tipos adaptados al contrato inspeccionado
  users/           Usuarios, perfil y configuración informativa
  utils/           Etiquetas y fechas es-MX
scripts/           Verificación en navegador real
```

Flujo: componente → servicio del dominio → cliente HTTP → Mandaria Backend. QueryClient mantiene únicamente consultas en memoria, sin persistencia. Mutaciones de credenciales se ejecutan directamente: sus respuestas nunca entran al caché de consultas o mutaciones.

## Dependencias y motivos

| Dependencia                      | Motivo                                                               |
| -------------------------------- | -------------------------------------------------------------------- |
| React Router                     | Navegación, parámetros y protección por rol                          |
| TanStack Query                   | Carga, errores, cancelación y actualización de consultas             |
| Lucide React                     | Iconos consistentes, sin assets externos                             |
| Vitest + Testing Library + jsdom | Pruebas de sesión, interacción, roles y flujos críticos              |
| Playwright                       | Verificación real de navegador, responsive, consola y almacenamiento |
| Prettier                         | Formato consistente                                                  |

Se usan formularios HTML nativos con validaciones y `ActionForm`; no se agrega librería de formularios/tablas innecesaria. `ActionForm` comparte loading, errores, bloqueo de doble submit y dirty state, y advierte ante cierre/recarga con cambios. La navegación interna no tiene bloqueo de descarte en esta versión.

## Rutas, pantallas y permisos

| Ruta                                                   | Acceso                                                   |
| ------------------------------------------------------ | -------------------------------------------------------- |
| /login                                                 | Público, sin registro                                    |
| /dashboard                                             | Usuario autenticado; contenido por rol                   |
| /integrations, /integrations/new, /integrations/:id    | SUPER_ADMIN                                              |
| /providers, /providers/new, /providers/:id             | SUPER_ADMIN; el detalle administra la cobertura          |
| /users                                                 | SUPER_ADMIN; cuentas, estado e invitar administrador     |
| /invitations                                           | SUPER_ADMIN; invitaciones, reenviar y revocar            |
| /admin/partner-applications, …/:reference              | SUPER_ADMIN; solicitudes de socio de la landing          |
| /activate-account                                      | Público; activación de cuenta invitada                   |
| /services, /services/:id                               | PROVIDER_ADMIN; servicios ofrecidos, tomar y liberar     |
| /dispatches, /dispatches/:id                           | SUPER_ADMIN; auditoría de despachos, sólo lectura        |
| /settings                                              | SUPER_ADMIN, información del entorno de trabajo          |
| /provider/profile                                      | PROVIDER_ADMIN; asociaciones y cobertura, sólo lectura   |
| /drivers, /drivers/new, /drivers/:id                   | SUPER_ADMIN o PROVIDER_ADMIN, según proveedor autorizado |
| /vehicles, /vehicles/new, /vehicles/:id                | SUPER_ADMIN o PROVIDER_ADMIN, según proveedor autorizado |
| /delivery-requests, /delivery-requests/:publicId       | SUPER_ADMIN; consulta y cancelación, sin edición         |
| /service-zones, /service-zones/new, /service-zones/:id | SUPER_ADMIN; cobertura y moneda de cada zona             |
| /rate-plans/:id                                        | SUPER_ADMIN; versiones de tarifa, sólo DRAFT editable    |
| /delivery-quotes, /delivery-quotes/:publicId           | SUPER_ADMIN; consulta, sin aceptación ni edición         |
| /profile                                               | Usuario autenticado                                      |
| /403 y rutas desconocidas                              | Estados 403 y 404                                        |

Sidebar y rutas usan el rol de `/auth/me`; escribir una URL prohibida muestra 403. El backend sigue siendo autoridad real en cada llamada. Roles futuros tienen perfil y un dashboard sin funciones globales. Un usuario PROVIDER_ADMIN puede elegir entre varias asociaciones propias y consultar proveedores suspendidos, tal como permite V1.2.

## Componentes y diseño

`AdminLayout`, `PageTitle`, `Table`, `Pagination`, `ActionForm`, `Field`, `Confirm`, `Modal`, `Badge` (con `label` opcional para el género de cada dominio), `InfoGrid`, `Loading`, `Empty`, `ErrorState`, `ErrorPage`, `FeedbackProvider` y `SecretDialog`. Diseño verde mineral, superficies claras, iconos lineales y marca inicial propia. Tokens de color, radio, spacing y tipografía en `src/index.css`; sin dependencia visual de Coita Eats. Tablas con desplazamiento horizontal; sidebar pasa a drawer en móvil. Modal nativo con foco, Escape y retorno de foco. Fechas centralizadas en `src/utils/format.ts`, idioma es-MX y zona del navegador.

## Sesión y seguridad

- Backend actual: access + refresh JWT en JSON, sin cookies HttpOnly. `credentials: omit` en fetch.
- Access token sólo en memoria. Refresh en `sessionStorage`, una única clave `mandaria.refresh`, para restaurar la misma pestaña tras recargar. No se usa localStorage. Cerrar la sesión borra el refresh local y llama al endpoint de revocación.
- Restauración: refresh rotatorio → `/auth/me`. Un 401 coordina un único refresh compartido entre peticiones concurrentes, luego reintenta una vez. Otro 401 borra sesión y caché; un 403 nunca intenta refresh.
- Error temporal de red conserva refresh para poder reintentar. Timeout HTTP de 20 segundos. Mutaciones no tienen retries automáticos. Logout limpia la sesión local aun si la revocación remota falla y lo comunica. El backend conserva la validez del access token hasta expirar: limitación de V1.0.
- `sessionStorage` es accesible a JavaScript: una vulnerabilidad XSS podría robar el refresh. Es el compromiso documentado para restauración compatible con este backend. El paso futuro recomendado es cookie HttpOnly/BFF con el correspondiente diseño CSRF; requiere cambio explícito de backend.
- Sin HTML dinámico peligroso, persistencia de caché, analytics ni logs de tokens. Errores del backend pasan por mensajes seguros permitidos; no se muestran SQL, trazas ni texto arbitrario.
- Client Secrets de integración **nunca se almacenan permanentemente en Mandaria Web**. Sólo viven en estado local del diálogo, se eliminan al cerrar/desmontar/cambiar detalle y nunca se incluyen en QueryClient. El portapapeles se usa sólo por acción explícita y pertenece al sistema del usuario.
- Rotar conserva la credencial anterior según backend: la UI lo advierte y requiere revocación explícita. Revocación y cambios de estado tienen confirmación.
- Invitaciones: la web nunca muestra ni persiste tokens de activación ni contraseñas. `/activate-account` retira el token de la URL al cargar, lo envía sólo en el body sin cabecera de sesión (`publicApi`) y declara `no-referrer`. Nadie define contraseñas ajenas.
- La web nunca llama a `/integrations/token` ni utiliza clientId/clientSecret para su propio login.
- Servir producción con HTTPS y origen CORS exacto. Nginx incluye CSP, anti-frame, no-sniff y referrer policy. `connect-src` permite HTTP/HTTPS para una imagen sin dominio fijo; restringirlo al origen real del backend al desplegar. No hay scripts ni fuentes remotos.

## Contrato y límites funcionales

Ver [docs/API-CONTRACT.md](docs/API-CONTRACT.md) para el contrato base, [docs/V1.4-B.md](docs/V1.4-B.md) para el contrato logístico y [docs/V1.6-B.md](docs/V1.6-B.md) para zonas, tarifas y cotizaciones. Las cotizaciones son de sólo lectura: la vigencia (`quoteValidityMinutes`) define hasta cuándo puede aceptarse un precio, **no** cuándo se realiza el servicio, y el valor de mercancía nunca se suma al costo de entrega. Integraciones y usuarios están limitados a 100 elementos por la API. El dashboard global recupera 5 proveedores recientes y dos páginas de 1 elemento para totales por tipo. El dashboard de proveedor muestra capacidad real, repartidores disponibles y vehículos activos mediante conteos del servidor. No calcula ingresos ni entregas.

## Docker / producción

```bash
docker build --build-arg VITE_API_URL=https://api.example.com -t mandaria-web:v1.4 .
docker run --rm -p 8080:80 mandaria-web:v1.4
```

`api.example.com` es un ejemplo: reemplázalo por el backend real. Dockerfile multietapa Node 24 → Nginx. El runtime sólo contiene frontend estático. SPA fallback en `nginx.conf`, assets con caché, HTML sin caché duradero. El API URL es variable **de build**, no cambia al pasar `-e` al contenedor ya construido. No se copian `.env`, fuentes del backend ni secretos a la imagen. El backend debe permitir el origen desde el que se sirve la web.

## Próximas versiones y deuda

V1.4-B administra quién puede transportar y con qué vehículo. V1.5-B administra y observa qué se solicitó transportar. V1.6-B administra dónde puede operar Mandaria y cuánto cuesta una entrega local. V1.6.1-B incorpora administradores y repartidores reales mediante invitación segura, sin acceso al servidor. V1.7-B abre la visibilidad de despachos y la toma de servicios, V1.8-B asigna repartidor y vehículo, V1.9 incorpora al repartidor independiente y su portal, y V1.10-F administra los créditos Mandaria que cuesta adjudicarse un servicio. No se implementaron pasarela de pago, compra de créditos, wallet en pesos, sockets, GPS, tracking, viajes intercity, fletes, scheduling ni aplicaciones Driver/Customer.

Pendientes: ejecución Docker en un motor funcional, eventual paginación servidor de integraciones/usuarios, gestión de cuentas cuando exista API y migración de refresh a cookies seguras. La validación real de PROVIDER_ADMIN y su membership ya está completada; Docker continúa pendiente para el cierre total de la entrega original.

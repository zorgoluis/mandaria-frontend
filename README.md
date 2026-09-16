# Mandaria Web — V1.6-B

Base administrativa independiente para Mandaria Backend V1.4. React + Vite + TypeScript estricto. Nombre de paquete: `mandaria-web`; se desarrolla en el repositorio existente `mandaria-frontend`, independiente de Coita Eats. No accede a PostgreSQL, Prisma ni servicios de Coita Eats.

**Estado:** V1.6-B agrega zonas de servicio, tarifas versionadas y consulta de cotizaciones (sólo SUPER_ADMIN) sobre la administración V1.5 de Delivery Requests. Contrato y decisiones en [V1.6-B](docs/V1.6-B.md), [V1.5-B](docs/V1.5-B.md) y [V1.4-B](docs/V1.4-B.md). Resultados ejecutados en [VERIFICATION.md](VERIFICATION.md). CI y Docker permanecen pendientes; no forman parte de esta tarea.

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
| /providers, /providers/new, /providers/:id             | SUPER_ADMIN                                              |
| /users                                                 | SUPER_ADMIN, consulta de usuarios                        |
| /settings                                              | SUPER_ADMIN, información del entorno de trabajo          |
| /provider/profile                                      | PROVIDER_ADMIN, sólo asociaciones propias                |
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

V1.4-B administra quién puede transportar y con qué vehículo. V1.5-B administra y observa qué se solicitó transportar. V1.6-B administra dónde puede operar Mandaria y cuánto cuesta una entrega local. Todavía **no** administra qué Provider, Driver o Vehicle realizará el servicio: eso corresponde a V1.7. No se implementaron dispatch, hunting, sockets, GPS, tracking, wallet, créditos, pagos, viajes intercity, fletes, scheduling ni aplicaciones Driver/Customer.

Pendientes: ejecución Docker en un motor funcional, eventual paginación servidor de integraciones/usuarios, gestión de cuentas cuando exista API y migración de refresh a cookies seguras. La validación real de PROVIDER_ADMIN y su membership ya está completada; Docker continúa pendiente para el cierre total de la entrega original.

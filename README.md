# Mandaria Web — V1.3

Base administrativa independiente para Mandaria Backend V1.0–V1.2. React + Vite + TypeScript estricto. Nombre de paquete: `mandaria-web`; se desarrolla en el repositorio existente `mandaria-frontend`, independiente de Coita Eats. No accede a PostgreSQL, Prisma ni servicios de Coita Eats.

**Estado:** implementación funcional; ver [VERIFICATION.md](VERIFICATION.md). No se declara V1.3 terminada: Docker build y la validación real de PROVIDER_ADMIN/memberships requieren resolver los bloqueos documentados.

## Requisitos e instalación

- Node.js 24 o posterior compatible, npm 11.
- Mandaria Backend V1.2 con PostgreSQL operativo, migraciones y cuentas aprovisionadas por su procedimiento propio.
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

Inicia Mandaria Backend con sus comandos documentados. El origen de Vite debe estar permitido en `CORS_ORIGINS` del backend, por ejemplo `http://localhost:5173,http://127.0.0.1:5173`. En esta validación se pasó CORS como variable del proceso, sin cambiar sus archivos. No existe proxy hacia Coita Eats ni conexión directa a datos.

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

`build` ejecuta TypeScript y genera `dist/`. `test` ejecuta Vitest y Testing Library; `typecheck:test` verifica también los tipos de los tests. No requieren backend ni Docker. GitHub Actions configura build, lint, tipos, tests, formato y construcción Docker; su ejecución remota no se ha validado en esta entrega.

### Prueba real de navegador

```bash
npx playwright install chromium
npm run test:e2e
```

Requiere backend y frontend iniciados. Configura localmente `.env.e2e`, **ignorado por Git**, con `E2E_ADMIN_EMAIL` y `E2E_ADMIN_PASSWORD`; opcionalmente `E2E_PROVIDER_EMAIL` y `E2E_PROVIDER_PASSWORD` de una cuenta PROVIDER_ADMIN existente. No agregues esas variables a Vite. El script de pruebas de Node las lee exclusivamente en memoria.

Alternativa local para una instalación que conserva credenciales bootstrap: define `MANDARIA_BACKEND_ENV` como ruta a su `.env`. El script sólo lo lee para obtener la cuenta de prueba; no imprime valores. `E2E_WEB_URL` puede cambiar el origen de prueba (default `http://127.0.0.1:5173`).

El script **crea registros reales de prueba** con código `WEB_...`, genera/rota/revoca credenciales y modifica sus propios proveedores. No eliminará registros: la API carece de eliminación de cliente/proveedor. Una cuenta PROVIDER_ADMIN de prueba, si se configura, se asocia al proveedor creado. No usar cuentas productivas. Las capturas y el reporte quedan en `test-results/manual/`, ignorados por Git. No se capturan pantallas con secretos; capturas de fallo enmascaran inputs y textarea. No se guardan trazas de red, HAR, videos ni estados de autenticación.

## Arquitectura y carpetas

```text
src/
  app/             Composición, rutas, error boundary
  auth/            Contexto humano, login y ciclo de sesión
  components/      Formularios, tablas, modales, feedback y estados
  config/          Variables públicas centralizadas
  dashboard/       Resumen con datos paginados reales
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

| Ruta                                                | Acceso                                          |
| --------------------------------------------------- | ----------------------------------------------- |
| /login                                              | Público, sin registro                           |
| /dashboard                                          | Usuario autenticado; contenido por rol          |
| /integrations, /integrations/new, /integrations/:id | SUPER_ADMIN                                     |
| /providers, /providers/new, /providers/:id          | SUPER_ADMIN                                     |
| /users                                              | SUPER_ADMIN, consulta de usuarios               |
| /settings                                           | SUPER_ADMIN, información del entorno de trabajo |
| /provider/profile                                   | PROVIDER_ADMIN, sólo asociaciones propias       |
| /profile                                            | Usuario autenticado                             |
| /403 y rutas desconocidas                           | Estados 403 y 404                               |

Sidebar y rutas usan el rol de `/auth/me`; escribir una URL prohibida muestra 403. El backend sigue siendo autoridad real en cada llamada. Roles futuros tienen perfil y un dashboard sin funciones globales. Un usuario PROVIDER_ADMIN puede elegir entre varias asociaciones propias y consultar proveedores suspendidos, tal como permite V1.2.

## Componentes y diseño

`AdminLayout`, `PageTitle`, `Table`, `Pagination`, `ActionForm`, `Field`, `Confirm`, `Modal`, `Badge`, `InfoGrid`, `Loading`, `Empty`, `ErrorState`, `ErrorPage`, `FeedbackProvider` y `SecretDialog`. Diseño verde mineral, superficies claras, iconos lineales y marca inicial propia. Tokens de color, radio, spacing y tipografía en `src/index.css`; sin dependencia visual de Coita Eats. Tablas con desplazamiento horizontal; sidebar pasa a drawer en móvil. Modal nativo con foco, Escape y retorno de foco. Fechas centralizadas en `src/utils/format.ts`, idioma es-MX y zona del navegador.

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

Ver [docs/API-CONTRACT.md](docs/API-CONTRACT.md) para los endpoints exactos, DTOs, errores y capacidades ausentes. Integraciones y usuarios están limitados a 100 elementos por la API; búsqueda/paginación local claramente identificadas. El dashboard recupera sólo 5 proveedores recientes y dos páginas de 1 elemento para totales por tipo. No calcula ingresos, entregas, repartidores existentes ni vehículos existentes.

## Docker / producción

```bash
docker build --build-arg VITE_API_URL=https://api.example.com -t mandaria-web:v1.3 .
docker run --rm -p 8080:80 mandaria-web:v1.3
```

`api.example.com` es un ejemplo: reemplázalo por el backend real. Dockerfile multietapa Node 24 → Nginx. El runtime sólo contiene frontend estático. SPA fallback en `nginx.conf`, assets con caché, HTML sin caché duradero. El API URL es variable **de build**, no cambia al pasar `-e` al contenedor ya construido. No se copian `.env`, fuentes del backend ni secretos a la imagen. El backend debe permitir el origen desde el que se sirve la web.

## Próximas versiones y deuda

No se implementaron drivers, vehicles, entregas, mapas, wallet, créditos, pagos ni módulos posteriores. Para V1.4 se pueden agregar features `drivers/` y `vehicles/` al layout y al grupo de rutas con sus permisos, una vez conocidos sus contratos.

Pendientes: ejecución Docker en un motor funcional, prueba real de PROVIDER_ADMIN/memberships con cuenta preparada, eventual paginación servidor de integraciones/usuarios, gestión de cuentas cuando exista API y migración de refresh a cookies seguras. No se declara V1.3 terminada hasta validar los elementos críticos pendientes.

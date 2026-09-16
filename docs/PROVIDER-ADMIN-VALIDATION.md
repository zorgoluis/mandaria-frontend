# Validación real PROVIDER_ADMIN — Mandaria Web V1.3

Fecha: 2026-09-15. Proyecto existente: `mandaria-web` (repositorio `mandaria-frontend`, rama QA). Resultado: **validación pendiente de PROVIDER_ADMIN completada**, con cuentas reales y backend local. No se inició V1.4.

## Alcance e inspección

Se inspeccionaron Login, AuthProvider/context, HTTP centralizado, refresh, `/auth/me`, Protected, grupos de rutas por rol, sidebar, dashboard, Providers, Mi proveedor, Integrations, errores 401/403 y almacenamiento. No fue necesario corregir lógica funcional ni reconstruir componentes.

Se agregaron el script `scripts/verify-provider-admin.mjs`, el comando `npm run test:e2e:provider-admin` y nueve pruebas complementarias. Ningún archivo de runtime del frontend, código del backend, configuración `.env`, rol o membership se modificó. CI permanece pendiente localmente por la instrucción anterior.

## Identidades y datos reales

- `provider-admin-a@mandaria.local`: rol recibido de `/auth/me` = PROVIDER_ADMIN, activo; membership propia en **Rápidos de Coita**.
- `provider-admin-b@mandaria.local`: PROVIDER_ADMIN con membership en **Mandados del Centro**.
- `provider-admin-sin-membership@mandaria.local`: PROVIDER_ADMIN con cero asociaciones.
- SUPER_ADMIN de desarrollo: autenticado con la cuenta bootstrap existente.

Todos los logins se realizaron escribiendo email/password en la pantalla real de Mandaria Web mediante Playwright/Chromium. No hubo mocks, JWT fabricados, edición de roles/almacenamiento ni acceso directo a Prisma/PostgreSQL en esta prueba real. Los IDs de proveedores se obtuvieron de `/provider/profiles` con la cuenta autorizada correspondiente; no se hardcodearon en frontend ni script.

## PROVIDER_ADMIN

| Verificación                                           | Resultado                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| Login y User real en `/auth/me`                        | ✅                                                         |
| Navegación y conservación de identidad                 | ✅                                                         |
| Reload y refresh rotatorio real                        | ✅                                                         |
| Mi proveedor: nombre, tipo y límites coinciden con API | ✅                                                         |
| Provider correcto por membership                       | ✅                                                         |
| Otro provider bloqueado                                | ✅ API 403 y UI `403 — Sin permisos`                       |
| Integrations bloqueado                                 | ✅ Menú ausente, ruta 403 y API 403 independiente          |
| Administración global bloqueada                        | ✅ Sin datos, controles ni llamadas privilegiadas de la UI |
| UX de 403 sin JSON crudo ni stack trace                | ✅                                                         |
| Access expirado → 401 → refresh 200 → reintento 200    | ✅                                                         |
| Refresh revocado → login y sesión local eliminada      | ✅                                                         |
| Logout explícito y posterior ruta protegida            | ✅                                                         |
| Cuenta sin membership                                  | ✅ Estado vacío; no selecciona un provider arbitrario      |

La navegación de proveedor contiene exactamente **Dashboard, Mi proveedor, Mi perfil**. El dashboard sólo consulta asociaciones/perfiles propios. Las rutas `/integrations`, `/integrations/new`, `/integrations/:id`, `/providers`, `/providers/new`, `/providers/:id`, `/users` y `/settings` se visitaron por URL. Se verificó que no se montaran tablas/formularios/globales brevemente ni se consultaran endpoints administrativos desde esas páginas bloqueadas.

Además del router, se enviaron GET autenticados de comprobación con el token real de A a `/admin/integrations`, metadata de credenciales, `/admin/providers`, detalle de B y `/users`. Todos devolvieron 403. Son consultas explícitas del test para comprobar los guards del backend; no son llamadas de la UI ni mutaciones. La cuenta sin membership también recibió 403 al consultar directamente el perfil de A.

## Sesión y vencimiento

El entorno normal mantiene access tokens de 900 segundos. Para validar el vencimiento real, el proceso local de backend se inició temporalmente con `JWT_ACCESS_EXPIRES_IN=60`, una opción ya soportada por el backend. No se modificaron `.env`, código ni la estrategia de sesión. Se esperó el `exp` del token real sin alterar relojes ni tokens, y se observó un 401 real, refresh exitoso y reintento autorizado conservando PROVIDER_ADMIN.

La invalidación de refresh se realizó con `/auth/logout` sobre la sesión creada por esta prueba, sin modificar el almacenamiento del navegador. Al recargar, el backend devolvió 401 en refresh, la web eliminó la sesión local y mostró login con mensaje de sesión expirada. Después se validó un nuevo login y logout explícito.

El proceso del backend se restauró al finalizar a su configuración normal. Las únicas mutaciones de esta ejecución fueron creación, rotación y revocación de **sesiones de autenticación de prueba**. No se crearon ni modificaron usuarios, proveedores, memberships, integraciones ni credenciales B2B.

## SUPER_ADMIN y calidad

| Verificación                                | Resultado                                   |
| ------------------------------------------- | ------------------------------------------- |
| Login SUPER_ADMIN                           | ✅                                          |
| Dashboard y proveedores recientes           | ✅                                          |
| Integrations                                | ✅                                          |
| Providers                                   | ✅                                          |
| Navegación completa y botón Nuevo proveedor | ✅                                          |
| Build                                       | ✅                                          |
| ESLint                                      | ✅                                          |
| Tipado de tests                             | ✅                                          |
| Vitest / Testing Library                    | ✅ 44 pruebas, 2 archivos                   |
| Matriz real de navegador                    | ✅ 14 grupos de comprobaciones, cero fallos |

## Consola y almacenamiento

- Cero excepciones de aplicación o errores inesperados de consola.
- Chromium registró 10 mensajes nativos esperados de recursos HTTP 401/403 durante las pruebas negativas. No se ocultaron ni se contabilizaron como errores de aplicación.
- localStorage e IndexedDB vacíos. sessionStorage sólo contiene `mandaria.refresh` durante una sesión activa y queda vacío tras logout/invalidación.
- No se encontraron passwords, clientSecrets, secretos JWT ni tokens en URLs o consola. El refresh se conserva sólo según la estrategia existente de V1.3.
- No se guardaron HAR, traces, videos, storageState ni respuestas de autenticación. Capturas únicamente de estados sin secretos; capturas de fallo enmascaran inputs y textarea.

## Reproducción

Con backend y frontend activos, Playwright/Chromium instalado y cuentas existentes:

```powershell
$env:MANDARIA_BACKEND_ENV = 'C:\ruta\mandaria-backend\.env'
npm run test:e2e:provider-admin
```

El archivo se lee sólo desde el proceso de pruebas Node, nunca desde Vite. Alternativamente usar `.env.e2e` ignorado con `E2E_PROVIDER_EMAIL/PASSWORD`, `E2E_PROVIDER_B_EMAIL/PASSWORD`, `E2E_UNASSIGNED_EMAIL/PASSWORD` y `E2E_ADMIN_EMAIL/PASSWORD`. Con el seed local existente, el script utiliza `LOCAL_PROVIDER_ADMIN_PASSWORD` y las cuentas locales documentadas. Orígenes opcionales: `E2E_WEB_URL` y `E2E_API_URL`.

El script **no cambia el tiempo de vida del backend**: espera la expiración real que éste configure. Una ejecución normal con 900 segundos tarda al menos 15 minutos. Para repetir la prueba corta, iniciar un proceso de backend local con su opción de expiración de 60 segundos y restaurarlo al terminar. No hacerlo en un backend compartido con sesiones productivas.

Resultados locales: `test-results/provider-admin/report.json` y capturas `provider-dashboard.png`, `provider-b-forbidden.png`, `no-membership.png`, `super-admin-regression.png`, todos ignorados por Git.

## Bugs y pendientes

No se encontraron bugs funcionales de V1.3 en esta matriz. Se corrigió un selector del nuevo test que confundía el documento HTML con una respuesta API; una ejecución intermedia no se contó como aprobación y se repitió la matriz hasta finalizar sin fallos.

Este cierre corresponde a **PROVIDER_ADMIN real**. El Docker build pendiente de la entrega anterior no se ejecutó ni se declara resuelto aquí. No se agregaron Drivers, Vehicles, assignments, availability ni navegación V1.4.

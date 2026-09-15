# Estado actual — Mandaria Web V1.4-B

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

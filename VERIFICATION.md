# Verificación — Mandaria Web V1.3

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

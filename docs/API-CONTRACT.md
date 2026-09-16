# Contrato Mandaria V1.3

Fuente: `C:/Users/zorgl/Documents/mandaria-backend/docs/openapi.json`, OpenAPI 3.0, backend V1.2.0. Inspección adicional de DTOs, controllers y servicios de auth, integraciones, providers, memberships y usuarios el 2026-09-15. No se modificó código ni esquema del backend.

Todos los endpoints consumidos usan el prefijo `/api/v1`. El frontend sólo se comunica por HTTP con Mandaria Backend.

| Método y ruta                                                 | Uso / contrato                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| POST /auth/login                                              | `{email,password}` → `{accessToken,refreshToken,tokenType,expiresIn}`                        |
| POST /auth/refresh                                            | `{refreshToken}` → nuevo par; revoca el refresh anterior                                     |
| POST /auth/logout                                             | `{refreshToken}` → 204                                                                       |
| GET /auth/me                                                  | Usuario público, rol y estado actual; sin hashes                                             |
| GET /users                                                    | SUPER_ADMIN; últimos 100 usuarios, arreglo sin paginación                                    |
| GET /admin/integrations                                       | Hasta 100 clientes, incluye hasta 100 credenciales metadata por cliente                      |
| POST /admin/integrations                                      | Sólo `{name,code}`; estado inicial ACTIVE                                                    |
| GET /admin/integrations/:id                                   | Información de cliente, sin credenciales                                                     |
| PATCH /admin/integrations/:id                                 | Sólo `{status}`; 204. ACTIVE/SUSPENDED reversibles; REVOKED terminal                         |
| GET /admin/integrations/:id/credentials                       | Metadata sin secretos; hasta 100                                                             |
| POST /admin/integrations/:id/credentials                      | `{scopes?,expiresAt?}` → `{clientId,integrationId,clientSecret}`                             |
| POST /admin/integrations/:id/credentials/:credentialId/rotate | Sin body; crea sustituta con mismos scopes/expiración; anterior sigue activa                 |
| POST /admin/integrations/:id/credentials/:credentialId/revoke | Sin body; 204; revoca la credencial exacta                                                   |
| GET /admin/providers                                          | `page,pageSize,type?,status?,search?`; respuesta `{items,total,totalPages,page,pageSize}`    |
| POST /admin/providers                                         | `{name,code,type,maxDrivers?,maxVehicles?}`; estado PENDING, defaults de límites del backend |
| GET /admin/providers/:id                                      | Proveedor con tipo, estado, límites y fechas                                                 |
| PATCH /admin/providers/:id                                    | `{name?,code?,maxDrivers?,maxVehicles?}`; no cambia tipo ni estado                           |
| POST /admin/providers/:id/activate                            | `{}`; PENDING/SUSPENDED → ACTIVE                                                             |
| POST /admin/providers/:id/suspend                             | `{}`; ACTIVE → SUSPENDED; PENDING no puede suspenderse                                       |
| GET /admin/providers/:providerId/members                      | Paginación; incluye usuario público y rol local                                              |
| POST /admin/providers/:providerId/members                     | `{userId,role}`; User activo PROVIDER_ADMIN; OWNER o ADMIN local                             |
| DELETE /admin/providers/:providerId/members/:membershipId     | 204; retira asociación, conserva User y Provider                                             |
| GET /provider/profiles                                        | PROVIDER_ADMIN; asociaciones propias paginadas                                               |
| GET /provider/profile?providerId=:id                          | Perfil y `limits:{maxDrivers,maxVehicles}`, `membershipRole`; 403 sin asociación             |

## Reglas verificadas

- Nombre: 1–100 caracteres. Código: `[A-Z][A-Z0-9_]{1,49}`; provider normaliza mayúsculas, integración exige mayúsculas.
- Límites: enteros 1–10000. Se omiten al crear si el usuario deja campos vacíos. No se replica ningún default de negocio.
- Paginación providers/members/perfiles: página desde 1 hasta 100000; tamaño 1–100, frontend 20. Búsqueda servidor por nombre/código; máximo 100 caracteres.
- Scopes pertenecen a credenciales: `quotes:create`, `deliveries:create`, `deliveries:read`, `deliveries:cancel`. Son permisos B2B existentes; no implementan entregas ni cotizaciones en esta web.
- Metadata `credential.id` es el clientId para intercambio B2B; `credential.clientId` es la relación con IntegrationClient. La UI muestra `id` como identificador público de autenticación.
- Error real: `{statusCode,code,message,errors,timestamp,path}`. Se traducen mensajes conocidos mediante lista permitida; errores de validación y errores internos tienen explicación genérica segura, nunca se refleja texto arbitrario.
- El backend tiene rate limiting y no soporta idempotency keys para crear/rotar. Las mutaciones no se reintentan automáticamente. Ante pérdida de conexión después de crear un secreto, comprobar metadata y revocar/regenerar si no se recibió la respuesta.

## Capacidades faltantes / limitaciones

1. No hay edición de nombre/código ni scopes a nivel de integración. Sólo estado; scopes en credenciales.
2. No hay creación, edición, cambio de rol, desactivación ni recuperación de contraseña de User vía API administrativa. Usuarios es consulta y memberships exige cuentas previamente aprovisionadas.
3. No hay paginación/búsqueda servidor en integraciones/usuarios ni paginación de credenciales. Se indica el límite de 100, sin presentar los resultados como total global.
4. No hay agregados dashboard. Tres consultas con pageSize 5/1/1 recuperan sólo totales y cinco proveedores recientes; no se escanea todo el catálogo.
5. No hay auditoría completa; se muestran createdAt/updatedAt y lastUsedAt/expiración de credenciales.
6. Auth no tiene cookies HttpOnly; devuelve refresh en JSON. CORS `credentials:false`. Para migrar a cookies seguras/BFF se necesita un cambio explícito de arquitectura/backend.
7. No hay eliminación de integración/proveedor. Los registros de validación permanecen identificados por prefijo `WEB_`; sus credenciales de prueba deben quedar revocadas.
8. No se usa `/integrations/token` ni ningún endpoint de autenticación B2B desde Mandaria Web.

Los schemas OpenAPI de Auth/Users no detallan completamente las respuestas; se corroboraron en `AuthService` y `publicUserSelect`. Los formatos de fecha nullable de credenciales figuran como object en OpenAPI; el servicio devuelve strings ISO o null.

# Extensión V1.4

El contrato logístico actual (repartidores, vehículos, asignaciones y capacidad) se documenta en [V1.4-B.md](V1.4-B.md), contrastado con OpenAPI 1.4.0 y controllers reales. El contenido siguiente conserva la inspección base V1.3; sus limitaciones históricas de conteos no sustituyen las nuevas capacidades documentadas.

# Extensión V1.5

Las solicitudes de entrega administrativas se documentan en [V1.5-B.md](V1.5-B.md), contrastadas con OpenAPI 1.5.0.

# Extensión V1.6

Zonas de servicio, tarifas versionadas y cotizaciones se documentan en [V1.6-B.md](V1.6-B.md), contrastadas con OpenAPI 1.6.0, DTOs, servicios y el filtro de errores reales. Ahí están las unidades (metros en la API, kilómetros en pantalla), los códigos `DomainException` traducidos y la regla `Quote TTL ≠ calendario del servicio`.

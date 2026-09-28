# Permisos de credenciales B2B — 2026-09-27

## Causa y corrección

El catálogo `scopes` de `src/types/api.ts` conservaba los cuatro permisos de V1.3. `CreateCredential` en `src/integrations/pages.tsx` genera sus checkboxes desde ese catálogo y `Scope` deriva su unión de tipos de la misma constante. Faltaban `quotes:read` y `quotes:accept`: no podían elegirse ni enviarse desde ese formulario.

Se añadieron únicamente esos dos valores al catálogo existente. No se duplicó la fuente, no se preseleccionaron permisos, no se alteraron credenciales existentes, ni cambió el servicio HTTP o el manejo del secreto. El formulario sigue enviando sólo `FormData.getAll('scopes')`; ninguna selección envía `scopes: []`.

La ausencia de `quotes:accept` es compatible con el 403 FORBIDDEN reportado al aceptar la cotización del pedido #85. No se inspeccionó el estado remoto del pedido ni su credencial: no se presenta esa hipótesis como diagnóstico comprobado del despliegue QA.

## Evidencia del backend local

Inspeccionados `docs/openapi.json` (versión 1.12.0), código fuente, esquema Prisma y clases compiladas locales de Mandaria Backend:

| Etapa         | Evidencia                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Catálogo      | `src/integrations/integration-scopes.ts`: `INTEGRATION_SCOPES` contiene los seis permisos                                                                                |
| DTO           | `CreateCredentialDto`: enum Swagger y `IsIn` usan el catálogo; admite hasta seis valores únicos                                                                          |
| Creación      | `IntegrationsService.createCredential` transmite `dto.scopes ?? []` a `issue`, que escribe esos mismos scopes sin ampliarlos                                             |
| Persistencia  | `IntegrationCredential.scopes` es `String[] @default([])`; no requiere migración para estos valores                                                                      |
| Token         | `IntegrationAuthService.token` firma `scopes: credential.scopes`, con `sub` igual al ID de la integración, no al ID de credencial                                        |
| Autenticación | El esquema de claims usa `INTEGRATION_SCOPES`; los permisos efectivos son la intersección del token y la credencial actual                                               |
| Autorización  | `IntegrationScopesGuard` exige todos los permisos del handler. Consulta de cotizaciones: `quotes:read`; `POST /api/v1/delivery-quotes/:publicId/accept`: `quotes:accept` |
| Rotación      | `rotate` conserva los scopes y expiración originales; no incorpora los permisos faltantes y no revoca automáticamente la credencial anterior                             |

## Verificación sin credenciales reales

`node scripts/verify-b2b-scope-contract.mjs` importa clases compiladas del backend adyacente; admite `MANDARIA_BACKEND_DIR` para otro directorio local. Requiere sus dependencias y `dist` ya existentes. No construye ni modifica el backend.

Compara los catálogos Web, fuente backend, backend compilado y OpenAPI. Ejecuta cinco casos (ninguno, read, accept, ambos, los seis) con DTO y servicios reales, JWT firmado/verificado con una clave efímera de prueba y almacenamiento **simulado en memoria**. Comprueba el payload de persistencia, identidad de la integración, scopes exactos del token y los guards reales de lectura/aceptación. Rechaza un scope desconocido y verifica que ampliar los permisos almacenados no amplía un token previamente emitido; retirarlos restringe el token.

No instancia Prisma, no carga `.env`, no conecta a bases de datos ni hace HTTP. No imprime secretos ni tokens. Esto verifica la lógica local y el payload de persistencia; no prueba escritura real en PostgreSQL ni el despliegue QA.

Pruebas frontend:

- `src/test/flows.test.tsx`: los seis checkboxes aparecen sin marcar; vacío, cada permiso nuevo, ambos y los seis envían exactamente la selección. No se crea otra IntegrationClient ni se rota/revoca. Continúa la prueba de secreto sólo en memoria, sin persistencia ni caché y eliminación al cerrar, ahora seleccionando ambos scopes nuevos.
- `src/test/integration-credentials-api.test.ts`: servicio y cliente HTTP reales con `fetch` simulado; POST al ID de integración existente y JSON exacto, sin permisos añadidos, para las mismas cinco selecciones.

## Despliegue: local frente a QA

Resultados ejecutados en esta tarea: `npm run build`, `npm run lint`, `npm run typecheck:test` y `npm test` PASS (**494 tests, 24 archivos**). Verificación offline de contrato PASS (cinco casos); Prettier sobre archivos modificados y `git diff --check` PASS. Se agregaron diez casos frontend (cinco UI y cinco HTTP), además de ampliar el caso existente de seguridad del secreto.

El backend **local** ya soporta el contrato completo. Para ese código basta publicar Web; no se necesita cambio backend ni migración. La corrección Web no amplía una credencial ni un token existente.

No se confirmó el código que está ejecutándose en QA. El OpenAPI del servidor local no estuvo disponible durante esta tarea; la evidencia corresponde a archivos y clases compiladas locales, no a un servidor en ejecución. Antes del despliegue operativo, comprobar que QA admite los seis scopes en `CreateCredentialDto`, los conserva, los reconoce al emitir/validar tokens y aplica los guards citados. Si QA comparte este contrato, sólo requiere Web. Si su backend está atrasado, también debe desplegarse una versión compatible de esos componentes; no hay un ajuste backend local pendiente en esta tarea.

## Crear posteriormente una credencial dentro de la misma Coita Eats

1. Con SUPER_ADMIN, abrir **Integraciones → Coita Eats**, verificando que sea el registro existente y conservando su ID. Entrar a **Crear credencial**, no a crear integración ni a rotar una credencial incompleta.
2. Marcar explícitamente los seis permisos:
   - `quotes:create`
   - `quotes:read`
   - `quotes:accept`
   - `deliveries:create`
   - `deliveries:read`
   - `deliveries:cancel`
3. Elegir expiración si corresponde y generar. Se utilizará `POST /api/v1/admin/integrations/:id/credentials` con el mismo ID padre. El nuevo `clientId` de autenticación identifica **la nueva credencial**; `integrationId` identifica **la misma integración**.
4. Guardar el secreto de una sola visualización en el gestor seguro de configuración del consumidor. Una operación posterior autorizada deberá configurar el nuevo par y obtener un access token nuevo; los tokens anteriores no adquieren permisos adicionales. No poner secretos en variables Vite, logs, documentación o URLs.
5. Validar posteriormente la identidad y los scopes con una consulta de lectura como `/integrations/me`, sin reintentar el despacho #85 como prueba. Mantener cualquier revocación de la credencial anterior como una decisión operativa separada y explícita.

Las solicitudes existentes siguen relacionadas con el mismo IntegrationClient. Crear una credencial hija no recrea la integración, no cambia su identidad, no mueve solicitudes ni modifica el webhook. No se realizó ninguna de estas operaciones en esta tarea.

## Alcance respetado

Sin creación/revocación de credenciales reales, sin cambios de webhook, sin reintentos del pedido #85, sin modificaciones de Coita Eats o backend, sin commit, push ni despliegue. No se ejecutaron los scripts E2E de negocio que generan credenciales reales.

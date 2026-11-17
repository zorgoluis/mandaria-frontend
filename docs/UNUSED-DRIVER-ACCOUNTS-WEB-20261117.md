# Independientes: cuentas sin servicios y baja lógica

Solicitud del 17-nov-2026: listar usuarios conductor sin actividad y permitir su baja lógica desde Independientes. El usuario confirmó el criterio **«Nunca han tomado ni realizado un servicio»**. Implementación coordinada entre agentes de Web, backend y revisión independiente. Posteriormente autorizó commit y push en las ramas actuales; la entrega Git se documenta al final. Sin incremento de versión, despliegue ni modificaciones de cuentas reales.

## Resultado y alcance

En `/independent-drivers`, la pestaña **Sin servicios** (`?view=unused`) consulta cuentas registradas con rol DRIVER, independientes o sin pertenencia, sin historial de servicios. Incluye registros incompletos y cuentas sin perfil. La pestaña Habilitaciones conserva su búsqueda, filtros y navegación; diferencia el acceso del usuario del estado documental/operativo del perfil.

La población la calcula el backend, sin límite por fecha ni conteo local: una participación histórica de cualquier estado o modalidad excluye la cuenta, aunque el servicio se haya liberado, cancelado, reasignado o transferido. También se consideran referencias legacy de toma/entrega. No se incluyen invitaciones sin activar, otros roles, flotilla actual ni pertenencias pendientes de resolver.

La vista ofrece búsqueda por nombre o correo, paginación de servidor y filtro **Con acceso activo / Dadas de baja / Todas las cuentas**. Una baja individual requiere motivo y confirmación. No hay baja automática ni masiva. El backend desactiva el acceso y revoca sesiones, pero conserva contraseña, documentos, perfil, vehículos, créditos e historial. No es una solicitud de eliminación documental ni una suspensión del perfil independiente.

## Contrato integrado

Fuente: [handoff backend](../../mandaria-backend/docs/UNUSED-DRIVER-ACCOUNTS-HANDOFF-20261117.md) y OpenAPI actualizado del backend. Se comprobaron las tres rutas nuevas frente al transporte Web; no se modifica el catálogo B2B.

Verificador documental backend: PASS. OpenAPI/API_ACCESS incorporan tres rutas y cuatro esquemas, sin cambios semánticos existentes. Se conserva el orden canónico generado por Swagger, requerido por su verificador textual.

Sólo SUPER_ADMIN activo; rutas relativas a `/api/v1`:

| Método | Ruta                                                            | Uso                                                                                                             |
| ------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| GET    | `/admin/independent-drivers/unused-accounts`                    | Lista paginada con `page`, `pageSize`, `search` y `accountStatus=ACTIVE\|DISABLED\|ALL`; predeterminado ACTIVE. |
| GET    | `/admin/independent-drivers/unused-accounts/:userId`            | Reconsulta de la cuenta original, incluso si perdió elegibilidad desde el listado.                              |
| POST   | `/admin/independent-drivers/unused-accounts/:userId/deactivate` | Baja con `{requestId, expectedUpdatedAt, reason}`; recibo `{userId, requestId, active:false, deactivatedAt}`.   |

La fila expone `userId`, correo/nombre, fechas, acceso, referencias de conductor/perfil opcionales, categoría, `hasServiceActivity`, `canDeactivate`, `blockReason` y fecha de baja. No expone credenciales. Los bloqueos de cuenta ya desactivada, cambio de estado, actividad nueva, otra pertenencia y baja documental en curso son explícitos.

La Web usa claves de caché por actor/filtros y bloquea acciones durante la reconsulta. Antes del POST repite GET, exige elegibilidad y la misma fecha de actualización que se revisó. El backend vuelve a comprobarlo dentro de su transacción: una lectura fresca del navegador nunca sustituye esa comprobación. Usa bloqueo compartido con TAKE/asignación, auditoría persistente e idempotencia por actor/intención/contenido.

El transporte usa `apiOnce` y valida el recibo. Si se pierde la respuesta, la pantalla conserva una fase incierta y ofrece **Consultar estado** por GET; no reenvía la baja automáticamente. Sólo muestra confirmación al recibir el recibo correcto o al consultar `active:false`. Se invalidan listado/detalle, usuarios, conductores y portal del conductor. Un backend sin las nuevas rutas muestra un aviso de actualización, sin inventar ausencia de cuentas ni usar otra ruta de baja.

## Verificación de esta tarea

Web: **102/102 pruebas focalizadas, cinco archivos**, y tipos de pruebas aprobados:

```powershell
npm run test -- src/test/unused-driver-accounts.test.tsx src/test/unused-driver-accounts-api.test.ts src/test/driver-portal.test.tsx src/test/independent-drivers-api.test.ts src/test/independent-detail-design.test.tsx --maxWorkers=2 --reporter=default --reporter=json --outputFile=test-results/unused-driver-accounts-web-tests.json
npm run typecheck:test
npm run lint
npm run build
node scripts/verify-unused-driver-accounts.mjs
```

Casos nuevos: autorización, registro sin perfil, búsqueda/paginación, backend anterior, campo de elegibilidad ausente, cambio tardío de actividad, 409, respuesta perdida/refetch, recibo ajeno o incompatible y ausencia de reenvío. No se cuentan las 1902 pruebas de la entrega 1.12.1 como verificaciones nuevas.

SHA-256 del reporte de las 102 pruebas: `f8fe5f1c5be6a8cc656137b40674fa7a581c727aca7e103e3b785b1bb322435e`.

Navegador con HTTP simulado: **18/18**, seis estados a 1440, 820 y 390 px. Incluye listado, confirmación con motivo, recibo exitoso, respuesta perdida, confirmación por GET y filtro de cuentas dadas de baja sin acción duplicada. Capturas inspeccionadas, estilos reales y sin desbordamiento horizontal; servidor y navegador propios cerrados. Evidencia: `test-results/unused-driver-accounts/1794899247071/report.json`. No acredita una prueba de Web contra backend real.

SHA-256 del reporte visual: `99e82fb9a24e3c3ae0fccc99c76c5aae75e3d6d05ff7d7519dd975f90d6ded25`.

`npm run lint` y `npm run build`: PASS; build incluye tipos de producto. Se conserva el aviso de bundles grandes (Root 1301,34 kB y heic-to 3224,41 kB). Logs: `test-results/unused-driver-accounts-lint.log` y `test-results/unused-driver-accounts-build.log`. Sintaxis del ejecutor visual comprobada; sin cambios en dependencias ni estilos globales.

La revisión independiente examinó población, bloqueo concurrente, autenticación, recibos y UI; su revisión de código no se presenta como prueba ejecutada. Detectó y se corrigieron el incremento de secuencia de recepción sin evento y la confusión entre acceso del usuario/estado del perfil.

Backend: **8/8 grupos E2E PASS**, Nest/HTTP y PostgreSQL 18 reales en una instancia sintética nueva WSL (`run-UQNC66`, Node 24.15.0). Generación de cliente, build, aplicación de migraciones y cierre del clúster: PASS. Lint focalizado y tipos de la nueva E2E/dependencias: PASS. Se ejecutaron ambas carreras con la ruta TAKE real: si TAKE gana, baja 409 y usuario activo; si baja gana, TAKE rechazado y cero asignaciones. También registro incompleto, filtros, permisos/validación, cambios tardíos, TAKE seguido de RELEASE, auditoría inmutable/recibo repetido y rechazo real de login/access/refresh tras la baja. La revocación de instalaciones se comprobó en base; no se acredita transporte socket/FCM ni dispositivo físico.

Evidencia backend: `../mandaria-backend/.tmp/mandaria-category-e2e-run-UQNC66/evidence.json`, SHA-256 `26e19393aedd8a0b193a7ee17c7e2b439acbbfb824c8b28c19b81160a2ae6588`, `complete:true` y paso `stop` con código 0. Los intentos anteriores se conservan: `run-eQdf19` y `run-kuA8T1` fallaron al preparar datos sintéticos por restricciones existentes; `run-lb1fWk` ejecutó 7/8 y falló por una expectativa numérica frente a bigint. Se corrigieron datos/expectativa del test y el pase final completó todos los casos, sin cambiar producto para saltar validaciones. Esas ejecuciones previas no se cuentan como PASS.

Las pruebas de navegador simulado y backend real se acreditan por separado: no se ejecutó un recorrido de esta pantalla contra ese servidor real. No se reutiliza la aceptación cX5fBG ni la suite global histórica como nueva evidencia.

## Incorporación pendiente

El backend añade la migración `20261117000100_unused_driver_accounts` con auditoría de bajas y el índice necesario para consultas legacy de entregas. Se debe incorporar el contrato y la migración antes de utilizar esta pantalla en un entorno compartido. No se ha aplicado a producción ni se ha desplegado esta tarea. El ensayo cX5fBG de la tarea anterior permanece cerrado.

Estado al cerrar la implementación, antes de la autorización Git: Web en `chore/release-1.12.0` / `4e27dc5`, versión 1.12.1; backend en `QA` / `dd95281`, versión 1.15.1; cambios locales sin preparar en el índice. La tarea preservó las entradas históricas y los cambios/archivos ajenos del backend (ACCOUNT-RECOVERY/B2C y `nul`). Comprobadores y entornos propios terminados.

## Entrega Git autorizada — 17-nov-2026

El usuario autorizó commit y push normal de esta función en las ramas actuales, sin desplegar. Web conserva `chore/release-1.12.0` y 1.12.1; backend conserva su rama actual y 1.15.1. No se crea tag ni release, no se hace force-push ni merge a otra rama. La revisión Git que incorpora esta sección identifica la entrega Web.

Selección explícita de los 13 archivos Web relacionados: componentes/transporte/tipos, corrección del aviso de Usuarios, pruebas y ejecutor, handoff y continuidad. No hay otros cambios pendientes en Web. Se excluyen build, capturas, resultados locales y credenciales. El backend prepara su selección propia y conserva los cambios ajenos sin incluirlos.

Comprobación previa en GitHub para Web: cero workflows, webhooks y registros de despliegue; sin hooks locales activos. La punta remota de `chore/release-1.12.0` coincide con la base `4e27dc59fe200bd6bd28804d6fd6eb4dba749c00`. No se detectó automatización de despliegue aplicable a esta rama y no se cambia ninguna configuración remota.

Las huellas de las cinco fuentes de producto y el ejecutor visual coinciden con la validación de esta tarea. Se conservan los PASS de lint/build/tipos y las 18 comprobaciones visuales; no se repiten ni se presentan como ejecuciones nuevas. Formato de archivos afectados y `git diff --check`: PASS.

Suite completa nueva previa al commit: **1936/1936 PASS, 97 archivos**, con `npm run test -- --maxWorkers=2 --reporter=default --reporter=json --outputFile=test-results/unused-driver-accounts-precommit-tests.json`. Reporte SHA-256 `ceb584aa818d7c333a3716098e31ddb7aef31578bb121299ae58f75973e216b7`; log separado con el mismo nombre base. No hubo fallos ni modificaciones de producto o pruebas para aprobarla. Las 102 pruebas focalizadas y 18 comprobaciones visuales anteriores se conservan como evidencia de su propia ejecución.

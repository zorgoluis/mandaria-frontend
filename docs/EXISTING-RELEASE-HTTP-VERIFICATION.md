# EXISTING_RELEASE — verificación Web/HTTP local

Actualización posterior: [ASSISTED_RELEASE / UNREACHABLE / NEW_ACTION con doble aprobación completado por HTTP sintético](ASSISTED-RELEASE-UNREACHABLE-HTTP-VERIFICATION.md). Las menciones inferiores de ese pendiente se conservan como historia; no implica matriz exhaustiva de variantes.

Actualización posterior: [ACCESS_RECOVERED ya aplicado y verificado por HTTP local](ACCESS-RECOVERED-HTTP-VERIFICATION.md), con replay y servicio ACTIVE. Las menciones de ese pendiente inferiores se conservan como historia.

2026-10-25. QA sobre `9e4af36`, Web 1.11.0, backend local `204d4f7` / 1.13.2. Esta ampliación de evidencia completa el pendiente documentado en la integración de referencias administrativas; los informes anteriores se conservan como historia.

## Recorrido reproducible

Comando: `node scripts/verify-admin-references-http.mjs`. Usa el harness WSL `scripts/admin-references-http-wsl.mjs`, Nest compilado desde una copia comprobada de las fuentes actuales y PostgreSQL desechable con 65 migraciones. Requiere la distribución Mandaria-Postgres y las dependencias Linux locales ya documentadas. No instala dependencias ni lee `.env`; tampoco utiliza Docker o activa proveedores externos. Routing y correo son sustitutos locales; las APIs de negocio, la base de datos y el navegador son reales.

1. El conductor sintético con pairing FLEET vigente realiza `fleet-take` y `fleet-release` por HTTP. Se conserva el `requestId` del RELEASE APPLIED; ya no se inserta un FleetCommand artificial para esta referencia. El caso se abre sobre la asignación CANCELLED resultante.
2. Se consulta la parada PICKUP autorizada y se registra ORIGIN. Para DRIVER y ORIGIN se registran contribuciones sintéticas, evidencia canónica del servidor y verificaciones por el método ofrecido `REGISTERED_CHANNEL_CALLBACK`.
3. Se registran ocho confirmaciones: NO_PICKUP, NO_COLLECTION, NO_ADVANCE y NO_OBLIGATIONS para cada parte, con evidencia y términos exactos de la asignación. Las declaraciones del operador simulan una comprobación humana: no acreditan llamadas reales.
4. Una propuesta de liberación aprobada antes del inventario se rechaza con `OBLIGATIONS_UNVERIFIED`. VERIFY_NO_OBLIGATIONS sin revisión se rechaza con `APPROVALS_REQUIRED`; tras la revisión de un segundo SUPER_ADMIN se aplica y produce SIN_OBLIGACIONES_VERIFICADAS. Una propuesta de liberación sin confirmaciones también se rechaza con `OBLIGATIONS_UNVERIFIED`.
5. Desde el navegador se prepara ASSISTED_RELEASE / CONTACTABLE / EXISTING_RELEASE, seleccionando el requestId original, las dos evidencias y las ocho confirmaciones. El id opaco del catálogo y response.receiptId no sustituyen al requestId.
6. La aplicación sin revisión se rechaza. Un segundo SUPER_ADMIN revisa por HTTP; se aplica con revisión/snapshot vigentes y se repite exactamente cuerpo y clave. Ambos recibos coinciden, la propuesta queda APPLIED y el expediente LIBERADO se confirma mediante GET y refresco de la Web.
7. Lecturas de control en la base sintética comparan antes/después: una liberación y un reembolso; misma asignación CANCELLED y fecha de actualización; dispatch OPEN; cero obligaciones, movimientos y declaraciones de cobro. La acreditación EXISTING_RELEASE no crea otra liberación o reembolso.

El inventario, identidades, confirmaciones, revisión y aplicación se crean mediante APIs existentes, sin actualizar directamente esos estados en la base ni modificar backend. La propuesta final se prepara en Web; la revisión del segundo administrador y la aplicación se ejercitan por HTTP, no se presentan como navegación completa de esos formularios.

## Correcciones y comprobaciones

- La ejecución detectó que Actualizar expediente podía mantener referencias/capacidades antiguas si cambiaba el flag sin cambiar la revisión del caso. `src/assistance/pages.tsx` ahora renueva el contenido tras una lectura exitosa, incluyendo `dataUpdatedAt` en su identidad. Se vuelven a consultar las referencias y se descarta la preparación anterior; el intento durable permanece en su contexto exterior. Regresión nueva en `src/test/assistance.test.tsx` para igual revisión y flag OFF.
- El harness normaliza datetime-local cuando los segundos son cero, evitando un rechazo de Playwright/Chrome al rellenar el campo. No se modifican validaciones de negocio ni se aumentan tiempos.
- Una ejecución se interrumpió antes de producir informe; se identificó y cerró exclusivamente su PostgreSQL sintético residual. No se cuenta como PASS. Otra ejecución global falló con ENOENT sobre temporales del sandbox antes de cargar tests; se repite el mismo comando fuera de ese aislamiento.
- Se conservan por separado los informes del fallo de permisos y del fallo de fecha. El informe final y sus huellas se enumeran en `existing-release-web-evidence.json`; la suite, tipos, lint y build anteriores al commit 9e4af36 no se atribuyen a esta ejecución.

## Resultado HTTP final

**14/14 comprobaciones PASS**, cero errores de navegador, cursor expirado tras cinco minutos reales, backend intacto y cierre Nest/PostgreSQL confirmado. [Informe final](evidence/existing-release-2026-10-25/http-report.json), [log](evidence/existing-release-2026-10-25/http-run.txt) y [manifiesto](existing-release-web-evidence.json). Incluye la repetición de las comprobaciones anteriores, no sólo el nuevo recorrido.

## Validación Web nueva

`npm test`: **1597/1597 PASS, 79 archivos**, 101.05s. `npm run typecheck:test`, `npm run lint`, `npm run build` y Prettier focalizado PASS. Regresión focalizada: 44/44 PASS, 5.98s. Build conserva el aviso previo de chunks mayores de 500 kB. No se omitieron tests, relajaron permisos o aumentaron tiempos.

## Límites preservados

Se acredita EXISTING_RELEASE con disponibilidad CONTACTABLE y datos sintéticos. No acredita UNREACHABLE/doble aprobación, aplicación completa de ACCESS_RECOVERED, llamadas humanas, UI Android, custodia física, disponibilidad remota ni operación productiva. Los otros escenarios históricos conservan sus límites. Sin cambios backend/móvil, dependencias, configuración o versión. La implementación inicial se realizó sin commit; la revisión posterior autoriza el commit local QA con su evidencia, sin push o despliegue. Se preservan los cambios ajenos del backend (BITACORA.md y `nul`).

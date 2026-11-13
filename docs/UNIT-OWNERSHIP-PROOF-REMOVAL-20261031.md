# Unidad: retirada de solicitud de comprobante de propiedad

## Actualización: integración de OWNED=null completada localmente

2026-10-31. Se consultaron en sólo lectura el handoff backend UNIT-OWNERSHIP-PROOF-REMOVAL-HANDOFF-20261031 y OpenAPI. Fuentes locales documentan paquete 1.13.5, sin despliegue. [Hashes de archivos](evidence/unit-ownership-null-20261031/backend-sources.json). Las secciones inferiores preservan la situación anterior; el bloqueo ya no aplica cuando el servidor devuelve el nuevo contrato válido.

Web acepta `vehicle.OWNED: null` explícito como ausencia de documento adicional. `unit-requirements.ts` centraliza categorías y bloqueo para selector, presentación y revisión: verifica modalidad, lista base con REGISTRATION_CARD y categoría de renta/préstamo. Sólo `registrationCardRequired === false` del expediente exime la tarjeta. Un campo ausente, vacío o malformado no equivale a null y bloquea; el contrato antiguo OWNERSHIP_PROOF sigue bloqueado sin pedir ese documento. La bicicleta OWNED no muestra formulario de carga vacío. Motocicleta requiere tarjeta; renta y préstamo conservan sus documentos.

Archivos de producto de esta integración: `src/verification/types.ts`, `unit-requirements.ts` (nuevo), `evidence.tsx`, `pages.tsx`, `format.ts`. Se conservan los cambios anteriores en formularios, identidad opcional, fechas y Mis vehículos. El tipo OWNED admite string|null para transición. No se cambian cuerpos, hashes, marcadores ni claves de recuperación.

`VERIFICATION_CATEGORY_RETIRED` muestra que el documento ya no se solicita. El rechazo definitivo no se reintenta automáticamente. CREATE_UPLOAD aplicado sin URL conserva su condición de operación registrada: no ejecuta PUT ni genera otra operación para obtener URL. Recuperación APPLIED consulta el expediente actual y mantiene recibos originales tanto de CREATE_UPLOAD como de COMPLETE_UPLOAD. Conflicto de revisión refresca; clave reutilizada conserva marcador para consulta explícita. Históricos VALIDATED mantienen consulta privada con limpieza de blobs y sin caché de imágenes; CREATED no ofrece completar y no bloquea por sí solo la presentación. Corrección crea un nuevo expediente sin modificar el rechazado ni copiar adjuntos; usa los mismos requisitos actuales. No se reabren aprobados ni se cambia la renovación existente.

### Verificación nueva

- `npx vitest run src/test/verification-pages.test.tsx src/test/verification-upload.test.tsx src/test/verification-recovery.test.ts src/test/verification-service.test.ts src/test/onboarding-production.test.tsx`: **158/158, cinco archivos, 9.85 s**. [Salida](evidence/unit-ownership-null-20261031/tests.txt). Servicios simulados/jsdom, no navegador real. Incluye presentación de bicicleta/moto, tarjeta faltante, renta/préstamo completos/incompletos, contrato inválido/antiguo, revisión SUPER_ADMIN, corrección, histórico CREATED, consulta privada, error retirado, recibos sin URL, idempotencia y regresiones de identidad/fechas/permisos. Dos intentos de la prueba nueva fallaron por selector ambiguo (mensaje y alerta duplicados en formulario/notificación), corregido consultando todas las coincidencias; sin aumentar timeouts ni omitir pruebas. [Fallo inicial](evidence/unit-ownership-null-20261031/tests-initial-selector-failure.txt).
- `npx tsc -b`, `npx tsc --project tsconfig.test.json`: PASS.
- `npm run lint`: PASS; lint focal repetido tras últimos ajustes de tests. [Salida global](evidence/unit-ownership-null-20261031/lint.txt).
- `npm run build`: PASS; aviso conocido de chunk Root 1210.19 kB. [Salida](evidence/unit-ownership-null-20261031/build.txt).
- `git diff --check`: PASS. No suite global en este turno; los resultados anteriores no son nuevas ejecuciones.

### HTTP y navegador real: bloqueados por disponibilidad

Se comprobó por GET de sólo lectura `http://127.0.0.1:37795/api/v1/verification-requirements`, instancia sintética documentada en INDEPENDENTS-JOINT-LOCAL-20261028. Primer intento restringido por sandbox; repetición fuera del sandbox: conexión rechazada por destino. No fue posible obtener contrato efectivo, status ni build de un proceso encendido. El manifiesto histórico b799308 no acredita ejecución de estos cambios. No se accedió a credenciales ni se mutaron fixtures, reinició, resembró o cambió de destino.

Pendiente aceptación HTTP/UI: disponer de instancia sintética autorizada encendida con este contrato, URL/build/manifest comprobables, cuentas específicas de conductor y SUPER_ADMIN y almacenamiento documental local funcional. Entonces realizar alta de bicicleta y motocicleta, captura y carga legítima de tarjeta, presentación, revisión y aprobación por UI, recargar y comprobar estados/ausencia de nueva OWNERSHIP_PROOF. No usar reservas ni expedientes de otros recorridos. Sin esas condiciones no se acreditan alta real, capturas nuevas ni aprobación HTTP. Los 71/36 resultados del handoff backend no se atribuyen a Web.

Sin cambios backend/Driver, versión, .env, commit/push, Docker, despliegue o activación remota.

## Historia: retirada inicial anterior al contrato null

Fecha: 2026-10-31. Web 1.11.0; cambios locales, sin publicación.

Por decisión del producto, Web deja de solicitar OWNERSHIP_PROOF: no aparece en categorías de carga, instrucciones ni checklist. La validación de envío rechaza categorías ajenas al selector. No se ofrece completar una carga histórica CREATED de ese tipo. Si no quedan categorías cargables, no se muestra el formulario de carga.

Los adjuntos históricos no se borran ni se modifican: se muestran como «Adjunto histórico (ya no solicitado)» y conservan consulta autorizada y retirada de referencia del borrador. No se alteran cuerpos ni claves de intentos anteriores. Tarjeta de circulación, contrato de renta y autorización de uso conservan sus reglas actuales; no sustituyen automáticamente el documento retirado.

## Bloqueo de contrato

Consulta de fuentes backend en sólo lectura: `src/verification/verification-rules.ts:106` todavía devuelve OWNERSHIP_PROOF para OWNED; `src/verification/verification.service.ts:1433` lo publica en requisitos. No se ha ejecutado HTTP nuevo ni modificado backend.

Mientras los requisitos de un expediente incluyan ese documento, Web deshabilita Presentar para revisión e informa que falta actualizar los requisitos del servidor, sin pedir documentos adicionales. Esto también aplica a borradores con adjuntos históricos ya validados. Guardar datos y otras evidencias sigue disponible con los permisos existentes.

Pendiente backend: retirar el requisito de OWNED y ajustar de forma coherente requisitos públicos, validación de presentación y admisión de nuevas cargas. Definir un contrato compatible para ausencia de categoría por modalidad y conservar expedientes/adjuntos históricos, recibos e idempotencia existentes. Web deberá adaptar y verificar ese contrato cuando exista; este cambio no acredita que el servidor ya permita presentar sin comprobante.

## Verificación local

`npx vitest run src/test/verification-pages.test.tsx src/test/verification-upload.test.tsx src/test/verification-recovery.test.ts src/test/verification-service.test.ts src/test/onboarding-production.test.tsx`: 137/137, cinco archivos, 10.14 s. [Salida](evidence/unit-ownership-removal-20261031/tests.txt). Pruebas unitarias con servicios simulados, no aceptación HTTP. Primer intento en sandbox falló ENOENT en temporales de Vitest sin ejecutar pruebas; repetición fuera del sandbox PASS.

Cobertura nueva: selector sin comprobante, ausencia de formulario vacío, conservación de adjuntos históricos y bloqueo de finalización de cargas CREATED, bloqueo de presentación por contrato sin solicitar el documento. El caso existente de error de documentos pendientes usa ahora RENTED/RENTAL_CONTRACT para mantener la prueba de respuesta del servidor sin atravesar el bloqueo deliberado de OWNED.

Se conservan cambios pendientes de Mis vehículos, fechas sin hora y campos opcionales de identidad. No se ejecuta suite global ni se atribuyen resultados históricos a esta verificación.

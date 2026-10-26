# ACCESS_RECOVERED — aplicación HTTP local

2026-10-25. Frontend QA sobre `79e938d`, Web 1.11.0. Backend local QA `204d4f712fb150f872e006a891595f8d64b6a2c7`, paquete 1.13.2, asistencia 1.0.0 y schemaVersion 1. Esta verificación completa el pendiente de aplicación de ACCESS_RECOVERED de los informes anteriores; no sustituye ni altera sus resultados históricos.

## Recorrido y controles

Reproducción: `node scripts/verify-admin-references-http.mjs`. Usa `scripts/admin-references-http-wsl.mjs`, compila las fuentes actuales comprobadas en una copia temporal y ejecuta Nest/PostgreSQL local desechable con 65 migraciones. Requiere WSL Mandaria-Postgres y dependencias Linux ya disponibles. No usa dist antiguo, Docker, `.env`, servicios remotos ni bases operativas. Routing y correo son sustitutos locales; negocio, autenticación y persistencia son reales.

1. El caso ACCESS_LOST está ligado a una asignación activa. Se conserva el recorrido Web de contribución → nota canónica → evidencia → verificación de identidad DRIVER por canal registrado, con datos humanos sintéticos.
2. Se inicia sesión mediante `/auth/login` después de abrir el caso. El selector obtiene la sesión candidata de `recovery-sessions` y usa `newSessionId` al preparar ACCESS_RECOVERED desde el navegador. No se usa un reset CUSTOMER ni se considera que seleccionar la sesión aplica la resolución.
3. La aplicación previa a revisión se rechaza con `APPROVALS_REQUIRED`. Un segundo SUPER_ADMIN consulta el caso y revisa la propuesta con su revisión y snapshot originales. El resultado debe ser READY.
4. Se aplica por HTTP con la revisión vigente del caso y la identidad original de la propuesta. El recibo devuelve ACCESO_RECUPERADO. Se consulta `/fleet-assistance-attempts/:key?caseId=...&operation=APPLY`: status APPLIED y el mismo resolutionId dentro de `receipt.result`.
5. Se repite exactamente el cuerpo y la Idempotency-Key de APPLY y se exige igualdad completa del recibo. GET de propuesta confirma APPLIED; GET del expediente y refresco del navegador confirman ACCESO_RECUPERADO.
6. Lecturas de control de la base sintética comprueban pertenencia de la sesión al conductor, vigencia, ausencia de revocación y refresh activo emitido desde la apertura del caso. `/driver/me` con el nuevo access token devuelve 200 antes y después. Sólo se archivan booleanos/conteos: los tokens viven en memoria del fixture, nunca en el informe.
7. Antes/después deben ser idénticos para estado y fecha de actualización de asignación, endedAt=null, estado de dispatch, fase/revisión de ejecución, número de liberaciones Fleet y reembolsos. La asignación permanece ACTIVE; el número de resoluciones ACCESS_RECOVERED pasa de cero a uno incluso tras replay. La prueba no simula la recuperación actualizando directamente estados de asistencia.

La propuesta y el refresco final se ejercitan en Web; la revisión del segundo administrador, aplicación y consulta del recibo se ejercitan por HTTP. No se presentan como navegación de todos esos formularios. La consulta del recibo prueba su recuperabilidad; no se simula pérdida de respuesta de este APPLY. El recorrido previo de evidencia sí conserva su prueba de respuesta perdida.

## Cambios y validación

Sólo se amplían los dos scripts del harness y la documentación/evidencia. No hay cambios nuevos de código de producto. La primera ejecución aplicó la resolución y luego falló una aserción del harness que buscaba `result` directamente en el envelope de intentos. Se corrigió a `receipt.result`, conforme a `AssistanceService.attempt`; el entorno fallido se cerró y se conserva su reporte separado. No se alteraron reglas backend, permisos o tiempos para resolverlo.

Regresión nueva: `npx vitest run src/test/admin-references.test.tsx src/test/admin-reference-access.test.tsx src/test/assistance.test.tsx src/test/assistance-api.test.ts`: **93/93 PASS, 4 archivos**, 5.43s. `node --check` de ambos scripts y Prettier focalizado PASS. La suite global1597/1597 y tipos/lint/build anteriores siguen siendo evidencia histórica del producto sin cambios; no se reejecutaron en esta ampliación del harness.

El informe HTTP final y las huellas están en [access-recovered-web-evidence.json](access-recovered-web-evidence.json). Los cambios ajenos del backend —BITACORA.md, VERIFICATION.md, documentos OFFER-FCM y `nul`— se conservan; no forman parte de este encargo ni se ejecutan. La comprobación del runtime cubre las fuentes y migraciones utilizadas, no atribuye esos documentos a la Web.

## Resultado HTTP final

**15/15 comprobaciones PASS**, cero errores de navegador, expiración real del cursor y cierre del entorno confirmado. [Informe final](evidence/access-recovered-2026-10-25/http-report.json) y [log](evidence/access-recovered-2026-10-25/http-run.txt). ACCESS_RECOVERED termina aplicado; una sola resolución tras consulta/replay, sesión válida y servicio ACTIVE sin efectos físicos/económicos nuevos. Se vuelven a ejecutar los otros catorce controles del harness, incluido EXISTING_RELEASE.

## Límites

Se acredita aplicación local ACCESS_RECOVERED con sesión vigente del conductor, identidad verificada y aprobación exigida. No acredita llamadas humanas reales, interfaz Android, recuperación de contraseña DRIVER, disponibilidad remota ni operación productiva. EXISTING_RELEASE/CONTACTABLE se vuelve a ejercitar como regresión; UNREACHABLE/doble aprobación permanece fuera de esta evidencia nueva. No se demuestra aquí la revocación de todas las sesiones anteriores ni un recorrido exhaustivo de sesiones vencidas/revocadas.

Sin modificaciones backend/móvil, versión, dependencias o configuración; sin Docker, push, despliegue o activación remota. La implementación inicial se realizó sin commit; la revisión posterior autoriza el commit local QA con su evidencia. Se preserva el historial de continuidad.

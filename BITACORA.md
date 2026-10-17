# Bitácora — Mandaria Web

## 2026-10-13 — Verificación documental local desde main

Creada esta continuidad en el worktree nuevo porque main no tenía BITACORA.md. Se conserva íntegro el historial de README/VERIFICATION y se trae únicamente el análisis documental previo con una actualización que distingue su fotografía histórica del working tree implementado actual. No se copiaron módulos QA.

- Rama feature/driver-verification; base/HEAD main `06d976619322d9811b5325fc73cd16d15e00d829`.
- Backend read-only HEAD `90b72433f8a5476ece5fda4437dc15a0a6a314f2` más implementación sin commit, huellas en [informe](docs/DRIVER-VERIFICATION-WEB.md).
- Registro/correo/login seguro, términos personales/FLEET separados, identidad/licencia, unidades propias/rentadas/prestadas, evidencias privadas, presentación/retiro/corrección y decisión SUPER_ADMIN, notificaciones y recuperación implementadas.
- Marcador mínimo por origen/actor, cuerpo no persistido, ABSENT no significa fracaso, cierre explícito y estado vigente separado del recibo. No replay automático.
- Tipos provider nullable, continuidad de servicio independiente comprometido y traducción de rechazos de nueva asignación. Onboarding sin APIs QA; recuperación operativa histórica no se descarta ni se invoca contra main.
- Validación focalizada y capturas sintéticas documentadas en [VERIFICATION](VERIFICATION.md). Fallos ordinarios de fixtures/expectativas y tipos detectados durante desarrollo corregidos; no se acreditan ejecuciones fallidas ni se duplican conteos.
- Integración real pendiente: el backend reportó su cluster temporal detenido; no se usó base desconocida ni se iniciaron Docker, correo o almacenamiento externos. Sin datos/documentos reales, activación, modificaciones backend/App/Landing, commit, push o despliegue.

## Contexto conservado fuera de esta rama

QA del checkout principal en `e3037397ecb6c6b086fd70c4d78f69f9a9a13cfe`, modificaciones anteriores de README/BITACORA/VERIFICATION y análisis sin alterar. Sus versiones y pruebas no se atribuyen a esta rama main.


## 2026-10-13 — Corrección W-01 de carga documental

En feature/driver-verification HEAD06d9766 se reprodujo la limpieza de B al terminar A antes de cambiar producto: tres casos fallaron por selección vacía y uno por error no identificado. Form ahora limpia por generación de selección y atribuye mensajes al archivo enviado; Evidence remonta estado por actor/expediente e interrupciones no anuncian éxito. Conserva selección editable, un solo envío, JPEG/PNG, contrato y recuperación.

35/35 pruebas focalizadas (8 nuevas +27 previas), tipos, lint y build aprobados; cinco checks de Chromium con respuestas controladas y capturas revisadas escritorio/móvil, teclado. Son mocks; backend y almacenamiento reales no ejecutados. No hubo aborto. Historial, evidencia detallada, comandos, límites y handoff para repetición integrada: [VERIFICATION](VERIFICATION.md#2026-10-13--w-01-selección-posterior-durante-carga-documental). Cambios previos preservados; sin backend, QA, commit/push/despliegue.

## 2026-10-16 — Baja documental Web

Rama vigente feature/driver-verification, base/HEAD 56c7bad0524cbbf05b45fa687a8ec625694a6ca0;
árbol inicialmente limpio con W-01. Backend consultado sólo en lectura en
b300c250df9fcc4aea8bcd76a1d6ed7c93e04e9a más cambios sin commit; 12 huellas guardadas
y verificadas al cierre. Matriz previa, solicitud/confirmación, seguimiento propio,
consulta privada, constancias backend parciales y decisiones administrativas
implementados. No se simulan drenaje, H, facultades, eliminación de backups ni
recuperación ausente del contrato.

Marcadores mínimos por cuenta/API/operación; cuerpo sólo en memoria para replay
administrativo explícito. 404 no descarta incertidumbre; logout no borra intentos.
Limitaciones de `/auth/me`, listado propio, recibos administrativos y catálogos
documentadas en [informe](docs/DOCUMENT-DELETION-WEB.md). Validación completa y
evidencia sintética en [VERIFICATION](VERIFICATION.md); integración real pendiente.
Sin backend/PostgreSQL/Spaces real, QA, commit, push ni despliegue.

## 2026-10-17 — Compatibilidad de sesión y recibos administrativos

Se conservaron los cambios locales de baja en feature/driver-verification (HEAD
Web56c7bad). Adaptación al backend b300c250 más correcciones sin commit confirmadas
por fuentes, OpenAPI, artefactos compilados y respuestas HTTP reales. Identidad
STANDARD/DELETION_RESTRICTED separada, contexto/caché actualizados, navegación mínima
y canal privado no bloqueado por bootstrap. GET de recibo para resolve/retención/
restore con intención mínima persistida; sin replay automático ni almacenamiento
paralelo de recibos. Historial anterior conservado, bloqueo de cancelación intacto.

152 pruebas focalizadas aprobadas en 7 archivos completos, tipos y lint aprobados.
Recorridos A/B en Chromium/Nest/PostgreSQL reales: identidad restringida sin logout
por403; un comando/evento tras commit y pérdida de respuesta; recuperación GET tras
recarga, otro administrador404, revisión histórica2 separada de actual3. Base
sintética nueva con esquema existente, datos preservados; servicios propios detenidos.
13 huellas backend sin cambios. Recibo depurado sólo simulado; servicio comprometido
real y Spaces pendientes. No se repitieron suites backend ni generales, ni se
modificaron migraciones/.env/permisos reales/QA. Sin commit/push/despliegue/activación.
[Informe y reproducción](docs/DOCUMENT-DELETION-COMPATIBILITY-WEB.md),
[evidencia saneada](docs/deletion-compatibility-evidence.json), [validación](VERIFICATION.md).

## 2026-10-17 — Validación pendiente C1/C2: BLOCKED

Solicitud: recibo realmente depurado y entrega LEGACY restringida desde navegador. Smoke inicial y único diagnóstico terminaron exit 1 con reporte. Chromium y navegación acreditados en diagnóstico, login sin completar por timeout. Inspección encontró omisión de VITE_API_URL en configuración efímera del arnés. No es defecto de producto acreditado; se respetó el límite de intentos.

Sin backend/PostgreSQL iniciados, fixtures ni mutaciones: ambos recorridos BLOCKED, efectos/estados finales no comprobados. Vite/Chromium propios cerrados y 4208 libre; Docker 43000 informado por usuario no utilizado. Cambios sólo utilidad, evidencia y documentación; producto y backend intactos. node --check PASS; no suites/build nuevos ni capturas funcionales. Temporales e historia conservados; sin QA, commit/push/despliegue. [Informe](docs/DOCUMENT-DELETION-COMPATIBILITY-WEB.md) y [evidencia](docs/deletion-browser-final-evidence.json).


## 2026-10-17 — Reejecución autorizada: smoke PASS, aislamiento BLOCKED

Corregido VITE_API_URL en el arnés, mediante configuración efímera sin .env. Nueva ejecución completa de node scripts/verify-deletion-browser-smoke.mjs: exit 0, Chromium y login real PASS; captura revisada en test-results/deletion-browser-rerun/smoke-login.png. Reportes anteriores conservados en deletion-browser-final. Sintaxis PASS; formato aplicado después sin cambios funcionales. No pruebas de producto/build por ausencia de cambios de producto.

Inspección Docker autorizada y sólo lectura: backend mandaria-backend-1 publica 127.0.0.1:43000; apunta a postgres:5432/mandaria, con volumen persistente mandaria_postgres_data. MAIL_PROVIDER=resend; DOCUMENT_DELETION_LOCAL_ENABLED no está presente en el entorno del contenedor. No se acreditaron base exclusiva sintética, correo capturado ni almacenamiento simulado. No se consultaron datos ni ejecutaron mutaciones contra esta instancia. El acceso inicial al daemon falló por permisos del sandbox; la inspección elevada posterior sí terminó correctamente.

C1 recibo depurado y C2 entrega LEGACY: **BLOCKED por aislamiento**, no ejecutados funcionalmente; sin conteos nuevos ni estados finales acreditados. No es fallo de producto/backend ni persiste el bloqueo anterior de render. Pendiente ejecutar ambos en instancia exclusiva con datos sintéticos, correo/storage simulados y reloj inyectable del arnés aprobado; no basta con usar el puerto existente. No se alteraron contenedores, backend, .env, QA o datos. Vite/Chromium propios cerrados y puerto4208 libre. Sin commit/push.

Huellas, inspección saneada y resultados: [evidencia de reejecución](docs/deletion-browser-rerun-evidence.json).

## 2026-10-17 — Instancia aislada y recorridos C1/C2

Nueva instancia real, PostgreSQL exclusivo55444/base *_test y42 migraciones existentes; identidad verificada antes de migrar. Web4218/API4217, correo capturado, storage/routing simulados y reloj documental inyectado. Docker43000 y backend intactos.

C1 PASS: decisión administrativa desde UI, pérdida de respuesta después de commit verificado, depuración por mantenimiento real, recarga y GET404. Un POST, marcador/sesión conservados, mensaje de incertidumbre; comandos1→0, PURGED, cuenta inactiva/gate durable. Desktop/móvil y teclado comprobados.

C2 BLOCKED: abrió servicio y confirmó ACCOUNT desde Web (202, proyección200); diagnóstico falló al exigir login. Sin entrega: lectura posterior acredita ACTIVE/CLAIMED,0 eventos de finalización,1 award,0 refunds, H null. No defecto producto/backend acreditado. Abortó un intento anterior por ruta/espera del arnés; único diagnóstico adicional completado y límite respetado, sin repetir navegador. Historia conservada.

Cuatro utilidades nuevas con sintaxis PASS; inspección de lectura completa PASS después de corregir nombre de campo. Sin producto, suites/build nuevos, backend, QA, commit/push/despliegue. Recursos propios cerrados y bases sintéticas conservadas. [Detalle](docs/DOCUMENT-DELETION-COMPATIBILITY-WEB.md) y [evidencia nueva](docs/deletion-isolated-evidence.json).

## 2026-10-17 — C2 entrega restringida retomada: PASS

Arnés corregido para continuar con200 DELETION_RESTRICTED; login adicional sólo ante401. Cuatro pruebas deterministas completas PASS, incluidas403/STANDARD rechazadas. Sin producto Web/backend modificado.

Retomada base exclusiva deletion_final_1792223093288_test tras verificar identidad. Un POST LEGACY de entrega desde UI200: DELIVERED/COMPLETED,1 evento DELIVERY_COMPLETED, ledger idéntico con1 award/0 refunds. Sesión restringida tras recarga, gates/deadline idénticos y H null. Prohibiciones auxiliares403; seguimiento UI verificado. Desktop/móvil/foco/teclado aprobados. UI tras recarga informa que no hay resolución activa, sin constancia histórica explícita de entrega; el estado final está acreditado por respuesta y SQL.

C1 no repetido, ninguna nueva baja/asignación/migración. Fixture de contraseña sintética temporal restaurado. Ejecución integrada completa exit0; sintaxis PASS, sin suites/build de producto.14 hashes backend/7 Web sin cambios. Recursos propios detenidos y temporales conservados; Docker43000 intacto, sin QA/commit/push/despliegue. [Detalle y límites](docs/DOCUMENT-DELETION-COMPATIBILITY-WEB.md) · [Evidencia nueva](docs/deletion-delivery-resume-evidence.json). Los fallos anteriores permanecen históricos, no se borraron ni se sumaron como éxitos.

## 2026-10-17 — Recibo depurado, ejecución exclusiva: PASS

Nuevo clúster/base sintéticos1792223822827, identidad SQL del destino comprobada antes de migrar/sembrar, API4217/Web4218. Smoke y reporte PASS. Decisión IDENTITY_AND_AUTHORITY_VERIFIED realizada desde UI; pérdida de respuesta sólo tras comprobar commit. Un comando/una aplicación de restricciones; mantenimiento real con DELETION_CLOCK depura1→0, sin borrar filas o ajustar fechas por SQL.

Tras recarga: GET con contexto/clave originales devuelve404 COMMAND_RECEIPT_UNAVAILABLE. POST antes/después1/1, marcador y sesión conservados, sin falsa recuperación ni cancelación. Gate/cuenta/estado PURGED durables sin cambios por consulta. Capturas desktop/móvil revisadas, sin overflow; foco/Enter/Tab PASS.

Una ejecución completa del arnés exclusivo exit0; sin aborto. Sintaxis PASS; no producto, suites ajenas ni build.14 hashes backend/7 Web intactos. Recursos propios detenidos, temporales conservados. No entrega, Docker43000, backend, QA, commit/push/despliegue. [Informe](docs/DOCUMENT-DELETION-COMPATIBILITY-WEB.md) · [Evidencia nueva](docs/deletion-receipt-only-evidence.json). Historial conservado, sin sumar cifras anteriores.

## 2026-10-17 — Revisión y preparación de publicación de la feature

Checkout vigente C:/Users/zorgl/Documents/mandaria-frontend, feature/driver-verification, HEAD56c7bad0524cbbf05b45fa687a8ec625694a6ca0. Origin https://github.com/zorgoluis/mandaria-frontend.git; fetch dirigido y comparación inicial0/0. W-01 y verificación documental ya publicados en56c7bad; no se duplican. Revisados diff de producto/pruebas, archivos nuevos, arneses, JSON y continuidad; cambios pendientes propios de baja/seguimiento. Sin hunks ajenos identificados. Worktrees y temporales ajenos conservados; AGENTS.md ausente en este checkout.

Huellas históricas contrastadas: entrega,7/7 fuentes Web y4/4 archivos de arnés; recibo depurado,7/7 fuentes Web y4/4 arneses. Coinciden íntegramente, sin cambios funcionales posteriores relevantes; ninguno de esos recorridos se repitió. El helper de entorno incorporó posteriormente una comprobación adicional de identidad de destino, acreditada en la ejecución del recibo; no cambia la entrega retomada. Evidencia histórica reutilizada expresamente, no contada como nueva.

Verificación nueva para el snapshot a publicar: siete archivos focalizados completos152/152 PASS (api, invitations-api, verification-service, deletion-service, deletion-pages, session-compatibility y flows); cuatro pruebas completas del arnés de sesión PASS; tipos de pruebas PASS; lint pertinente PASS; build incluye tsc -b y Vite PASS. Se repitió esta validación local porque los reportes anteriores de tipos/build/pruebas no aportaban un manifiesto completo de huellas del snapshot actual. No suite general ni backend. Advertencia de chunk Root695.31kB >500kB conservada, no silenciada.

Revisión de inclusión: sin .env, JWT reales, credenciales, claves privadas, URLs firmadas, datos de negocio reales, node_modules, dist, perfiles o trazas/logs crudos. Fixtures de credenciales son literales sintéticos o valores aleatorios sólo en memoria. Evidencia JSON saneada y metadatos de entornos locales; capturas y bases sintéticas siguen locales e ignoradas, no se añaden al commit. Sintaxis de todos los arneses candidatos y parseo JSON PASS. git diff --check PASS; índice explícito por archivos, sin git add general.

Reproducción: verify-deletion-receipt-only crea clúster/base nuevos con dependencias backend locales existentes y nunca entrega servicios. verify-deletion-delivery-resume requiere el clúster sintético documentado y una asignación ACTIVE pendiente; no es un comando para repetir una entrega ya completada. Rutas locales de los arneses reflejan el entorno acreditado. verify-deletion-isolated y scripts anteriores preservan historia de diagnóstico; no se presentan como ejecuciones integrales aprobadas de su contenido actual. No reejecutarlos indiscriminadamente ni usar una base desconocida.

Se preparan dos commits coherentes: producto/pruebas de baja y sesión; arneses/documentación/evidencia. Se verificará de nuevo la referencia remota inmediatamente antes del push normal, con refspec exclusivo de feature/driver-verification. Esta entrada registra revisión previa, no anticipa éxito del push. No merge, rebase, QA, main, cambios/publicación backend, App/Landing o despliegue.

Límites vigentes: constancias parciales; drenaje real en Spaces pendiente, sin eliminación total ni aptitud productiva. Tras entregar, UI informa que no hay resolución activa, sin constancia histórica explícita de entrega. Revisión y manifiesto de huellas: [deletion-publication-review.json](docs/deletion-publication-review.json).

Revisión final del índice: diff --cached --check detectó líneas vacías sobrantes al final de deletion-isolated-browser.mjs. Se retiraron únicamente esas líneas; contenido ejecutable idéntico. Huellas original/publicable reconciliadas en deletion-publication-review.json, sin reescribir evidencia histórica. Sintaxis y cuatro pruebas del helper comprobadas; no repetición de entrega/recibo por ausencia de cambio funcional.

# Alta e historial de unidades inactivas — Web, 2026-11-16

> Este documento conserva la implementación y validación inicial sobre Web 1.12.0. La entrega autorizada posterior es [Web 1.12.1](ONBOARDING-INACTIVE-WEB-1.12.1.md); separa sus verificaciones nuevas de este historial. La [aceptación real cX5fBG](ONBOARDING-JOINT-WEB-20261116.md) ya terminó y el entorno está cerrado.

Implementación local sobre `chore/release-1.12.0`, HEAD `e47fb8b`, Web 1.12.0 sin incremento. No se ha hecho commit, push ni despliegue de estos cambios. El push anterior a la coordinación respondió `Everything up-to-date`; no publicó esta implementación.

## Contrato y resultado

Leídos `AGENTS.md`, `docs/DESIGN-SYSTEM.md`, continuidad Web y, sólo en lectura, `../mandaria-backend/docs/DRIVER-ONBOARDING-INACTIVE-VEHICLES-20261116.md` y `../mandaria-backend/docs/openapi.json`. El contrato backend es el cambio local sobre QA `bb2b58f`, versión 1.15.0, todavía sin publicar. Su historial de pruebas no se presenta como ejecución Web.

La consulta predeterminada del nuevo backend devuelve `CONNECTION` y excluye de `subjects` las unidades INACTIVE, incluidas las recién creadas. Web pide ahora `GET /api/v1/driver/onboarding?view=DOCUMENTARY` para conservar los expedientes de alta e historial. Sigue usando los UUID y revisiones del servidor para guardar y presentar. No filtra los sujetos ni convierte estados documentales en permisos operativos.

| Archivo                                     | Cambio                                                                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/verification/types.ts`                 | `OnboardingView` con CONNECTION y DOCUMENTARY; `Onboarding.view` aditivo.                                                          |
| `src/verification/service.ts`               | La vista es un argumento obligatorio y se envía como query. Se conserva AbortSignal. Una respuesta con `view` distinto se rechaza. |
| `src/verification/onboarding-query.ts`      | Opciones compartidas: clave `['verification', actor, 'onboarding', view]` ligada a la misma vista de la petición.                  |
| `src/verification/pages.tsx`                | Alta, borrador y resumen documental usan DOCUMENTARY.                                                                              |
| `src/verification/registration-journey.tsx` | Ambas consultas antes/durante el guardado usan DOCUMENTARY, para continuar identidad y unidad existentes.                          |
| `src/verification/account-progress.tsx`     | Mi cuenta conserva el progreso de las unidades inactivas, incluido el borrador guardado.                                           |
| `src/layouts/AdminLayout.tsx`               | El observador deshabilitado del diseño guiado comparte la clave documental; no añade consultas.                                    |
| `src/verification/pending.ts`               | La recuperación de CREATE_VEHICLE comprueba el UUID contra el catálogo documental sin repetir el comando.                          |
| `src/deletion/pages.tsx`                    | Consulta explícita documental para ámbitos/catálogo de baja, con clave propia. No cambia permisos.                                 |

`CaseList` y `CaseDetail` siguen consultando las rutas autorizadas de historial y detalle por UUID. El parámetro Web `?view=details` sigue siendo navegación de pantalla y no se envía como vista de la API. Se revisaron todos los usos reales de `verification.onboarding`: ninguno queda sin vista explícita. También se actualizó el matcher del harness histórico `scripts/verify-account-registration.mjs` para la URL nueva; sólo se comprobó su sintaxis, sin atribuirle una nueva aceptación completa.

La recepción Web no consume onboarding: usa `driver/offer-reception` y `driver/me`; la disponibilidad se solicita explícitamente a `driver/availability`. No se añadió una consulta CONNECTION a ese flujo ni se cambió su autorización. La capacidad de tomar continúa dependiendo de la respuesta de recepción. Identidad/licencia, unidad elegida ACTIVE, términos y zona se siguen validando en backend. El catálogo completo nunca se usa para deducir elegibilidad. No hay conexión, TAKE ni aprobación automática.

## Compatibilidad y publicación pendiente

El campo `view` es opcional sólo para conservar la respuesta histórica completa de backends anteriores que acepten la consulta y omitan ese campo. Un `view` presente diferente, desconocido o null produce error. HTTP 400/403/503 se conserva como error: no se reintenta sin parámetro, no se usa CONNECTION como alternativa y no se habilitan acciones por falta de datos.

El backend compatible debe publicarse junto con una Web adaptada a DOCUMENTARY; este informe no autoriza esa publicación. Un backend antiguo con validación estricta que rechace `view` impedirá la consulta hasta actualizarlo. No se afirma compatibilidad con cualquier servidor que ignore o altere arbitrariamente el contrato.

## Validación nueva

Datos sintéticos, HTTP simulado y componentes reales de Web. No se ejecutó HTTP contra Nest/PostgreSQL ni se arrancó el clúster detenido. Tampoco se ejecutó APK, dispositivo físico, carga real de archivos, correo, conexión o entrega real.

```powershell
npm run test -- src/test/onboarding-views.test.tsx src/test/verification-service.test.ts src/test/verification-recovery.test.ts src/test/reception-design.test.tsx src/test/deletion-pages.test.tsx src/test/verification-pages.test.tsx src/test/verification-upload.test.tsx src/test/documentary-availability.test.tsx src/test/onboarding-production.test.tsx --maxWorkers=2 --reporter=default --reporter=json --outputFile=test-results/onboarding-documentary-tests.json
npm run typecheck:test
npm run lint
npm run build
node scripts/verify-onboarding-documentary.mjs
node --check scripts/verify-account-registration.mjs
git diff --check
```

| Pruebas focalizadas      | Resultado                                          |
| ------------------------ | -------------------------------------------------- |
| onboarding-views         | 13/13                                              |
| verification-service     | 29/29                                              |
| verification-recovery    | 19/19                                              |
| reception-design         | 5/5                                                |
| deletion-pages           | 32/32                                              |
| verification-pages       | 101/101                                            |
| verification-upload      | 25/25                                              |
| documentary-availability | 31/31                                              |
| onboarding-production    | 32/32                                              |
| Total                    | **287/287 PASS**, nueve archivos; sin suite global |

`npm run typecheck:test`, `npm run lint` y `npm run build`: **PASS**. El build conserva el aviso de chunks grandes (Root 1291,44 kB y heic-to 3224,41 kB); no se modifica el empaquetado. Comprobación de sintaxis de ambos scripts, formato de los archivos nuevos y `git diff --check`: PASS.

Incluye 22 pruebas nuevas: unidad INACTIVE/DRAFT, creación única y continuidad por ID, guardado/reentrada, envío con revisiones actuales y refetch de SUBMITTED, historial REJECTED/WITHDRAWN/APPROVED, activa aprobada más inactiva rechazada, separación de caché por vista/clave anterior, respuesta CONNECTION tardía, bloqueo durante refetch documental, errores sin fallback, respuesta legacy sin campo y recuperación de creación sin replay. La restricción por otra ACTIVE pendiente se comprueba en Web con una respuesta simulada `DOCUMENTARY_REQUIREMENTS` y rechazo de disponibilidad: no certifica nuevamente la regla backend.

Chrome con API interceptada pasó **18/18** comprobaciones en 1440, 820 y 390 px: borrador, progreso guardado, presentación/revisión y tres resultados históricos por tamaño; también guardar, reentrar y refetch demorado antes de enviar. Sin desbordamiento horizontal ni excepciones de página. Usa `index.css` y `redesign.css` reales. Se inspeccionaron capturas de escritorio, tableta y móvil. El navegador no contacta el backend; el script inicia únicamente un Vite propio con puerto efímero y lo cierra al terminar.

Artefactos locales reproducibles:

- `docs/onboarding-documentary-web-evidence.json`: resumen y huellas de fuentes/resultados.
- `test-results/onboarding-documentary-tests.json`: resultado de las 287 pruebas.
- `test-results/onboarding-documentary/1794889712069/report.json`: 18 comprobaciones, peticiones interceptadas y cero errores.
- Capturas en ese mismo directorio, prefijadas `1440-`, `820-` y `390-`.

La primera ejecución del navegador fue bloqueada por el permiso de red local (`ERR_NETWORK_ACCESS_DENIED`); la ejecución autorizada posterior pasó. En desarrollo se corrigieron expectativas del harness (prefijo del motivo, remonte del layout y navegación en jsdom); la navegación por enlaces sí se comprobó en Chrome. El tiempo de espera de la nueva suite contempla el remonte real del layout; no se cambian los límites de las suites existentes.

No hay cambios de backend, Driver, Coita, datos reales, variables, versión ni reglas financieras. Una futura comprobación HTTP real requiere una instancia sintética autorizada del backend con este contrato y credenciales/datos de prueba propios; esta tarea no usa ni reinicia la instancia compartida.

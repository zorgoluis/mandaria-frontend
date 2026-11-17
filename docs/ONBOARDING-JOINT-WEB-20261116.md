# Prueba conjunta real de onboarding — Web, 2026-11-16

> Evidencia histórica de aceptación con Web 1.12.0. La autorización posterior de versión/commit/push se documenta en [Web 1.12.1](ONBOARDING-INACTIVE-WEB-1.12.1.md). No reabre la sesión cX5fBG ni convierte las corridas interrumpidas en PASS. Backend y Web del ensayo ya están cerrados.

Estado: **PASS — aceptación Web terminada y servidor propio cerrado**. Ejecución 2026-11-17 05:23–05:29 UTC (16-nov CDMX), sesión nueva `ONBOARDING-INACTIVE-JOINT-20261116`. El coordinador recibió los resultados y se ocupa del cierre de Nest/PostgreSQL. No se hicieron más llamadas backend después de su instrucción de cierre.

Producto conservado en `chore/release-1.12.0`, HEAD `e47fb8b`, Web 1.12.0. Las 17 huellas de fuentes/pruebas/scripts del manifiesto documental anterior siguen idénticas. Esta continuación sólo modifica el harness conjunto y documentación propia; sin `.env`, backend, Driver, Coita, versión, commit/push ni despliegue.

## Entorno y alcance real

Se recibió READY explícito y se leyeron los IDs de `ready.json`/`fixture.json` del handoff backend, sin elegir unidades por posición. API Windows `http://127.0.0.1:39043/api/v1`; Web propio `http://127.0.0.1:43591`. WSL aislado del coordinador: sesión `session-cX5fBG`, Nest/guards/Prisma/PostgreSQL reales, 74 migraciones; sin producción, Docker, FCM, pedidos, TAKE, GPS, entregas ni aprobaciones extras.

`verify-onboarding-joint-web.mjs` compiló la aplicación actual desde `index.html`/`src/main.tsx`, con `configFile: false`, `envDir: false` y origen local suministrado únicamente a esa compilación. Preview de puerto estricto, sin reemplazar procesos ajenos. Hash del índice del build: `5b42c781dc99dff5a2efcf7c45660e415a411a31b40f844c3fddc6a1320b43f8`.

Chrome utilizó login/logout, formularios y navegación reales. Sin interceptación de API, mocks, fulfillment, inyección de usuario/token ni acceso directo a base. Se observaron pasivamente método/ruta/status. El almacenamiento del backend es el adaptador sintético local con archivos/HTTP reales del coordinador; esto no acredita Spaces ni teléfono físico.

## Resultados

| Comprobación Web           | Resultado                                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Onboarding documental real | Todas las lecturas exitosas pidieron y recibieron DOCUMENTARY.                                                                                                        |
| Continuación y guardado    | Dos PATCH a los expedientes originales; mismo conductor y unidad INACTIVE. Sin CREATE_CASE ni CREATE_VEHICLE.                                                         |
| Reentrada                  | Logout por UI, contexto nuevo y login real: mismos UUID, revisiones, datos guardados y adjuntos.                                                                      |
| Fotos                      | Cinco adjuntos previos conservados; imágenes consultadas por el proxy autenticado real. **Cero fotos nuevas cargadas por Web**, porque el fixture ya estaba completo. |
| Presentación               | Un único POST a `/driver/onboarding/submit`, HTTP 200, disparado por «Enviar mi solicitud». Ambos expedientes SUBMITTED.                                              |
| Confirmación posterior     | Nuevos logins de sólo lectura confirmaron los dos SUBMITTED, la misma unidad INACTIVE y conductor OFFLINE; sin repetir submit.                                        |
| Cuenta mixta               | Catálogo exacto del fixture: 1 ACTIVE + 2 INACTIVE. Identidad/unidad activa aprobadas; histórico INACTIVE REJECTED, WITHDRAWN y APPROVED por sus UUID originales.     |
| Recepción READY            | 05:24:32Z: `/driver/me` AVAILABLE y `/driver/offer-reception` READY/ELIGIBLE. CONNECT fue realizado por Driver.                                                       |
| Recepción final            | 05:29:24Z: OFFLINE y OFF/RECEPTION_DISABLED tras DISCONNECT de Driver; UI mostró revisión 3.                                                                          |
| Operaciones Web en mixed   | Sólo consultas y acceso autenticado a imágenes; cero cambios de disponibilidad, unidad, recepción o documentos.                                                       |
| Cierre                     | Logout confirmado en los tres contextos finales, navegadores cerrados y servidor Web propio CLOSED (PID 10632 terminó con código 0). Backend no detenido por Web.     |

Identidad `6243450d-dee3-474b-ac92-c45ea18063c8`: DRAFT revisión 10 → guardado 11 → SUBMITTED 12. Unidad expediente `995de89a-5600-4f16-8feb-fbc8f612ed0d`: DRAFT revisión 4 → guardado 5 → SUBMITTED 6. Vehículo conservado `1283b615-623c-4436-a872-ab4b0fa08159`. El coordinador confirmó asimismo hash histórico intacto y cero servicios; es su comprobación backend, no una consulta de base hecha por Web.

Las consultas de imágenes pueden añadir eventos de auditoría de acceso. No se alteraron decisiones, revisiones, datos ni adjuntos históricos. Las comparaciones de Web preservan estos campos y distinguen las transiciones de disponibilidad realizadas por Driver.

Capturas finales a 1440, 820 y 390 px, sin desbordamiento horizontal. Se inspeccionaron pantallas de revisión enviada, historia y recepción. No se capturó el formulario de login. Se añadió máscara explícita del menú de cuenta y se descartaron capturas preliminares cuyo recorte podía incluir la cabecera flotante; las capturas finales se repitieron únicamente con lecturas. Los reportes JSON se comprobaron contra los valores privados de acceso: sin correo/password de acceso, tokens ni headers. No hay HAR ni trazas con credenciales. No se crearon copias privadas propias; los archivos de acceso backend siguen bajo responsabilidad del coordinador.

## Incidencias preservadas

1. `1794893038601-observe`: la observación inicial OFFLINE quedó fuera de ventana; Driver ya había conectado. Se conserva FAIL por la expectativa temporal. No se reprodujo CONNECT para recrear ese estado. La evidencia OFFLINE inicial pertenece a backend/Driver; Web acredita READY y OFFLINE final.
2. `1794893093308-documentary`: guardado, reentrada, fotos y submit real terminaron, pero el control final del harness clasificó erróneamente POST `/attachments/:id/access` como modificación. Se corrigió únicamente el harness. `review.json` verifica la evidencia original con la clasificación correcta (`PASS_REVIEWED_WITHOUT_REPLAY`); `report.json` FAIL original se conserva. Luego se confirmó SUBMITTED en nuevos recorridos de sólo lectura. No se repitió ni revirtió la presentación.
3. La generación inicial de evidencia visual se ajustó para enmascarar la cuenta también cuando la cabecera flotante invade el recorte. Es una corrección de captura del harness, sin cambio de UI/producto.

## Evidencia local

Todos los directorios siguientes están bajo `test-results/onboarding-joint-web/`:

| Directorio                           | Artefacto/alcance                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `1794893018971-serve`                | Build real, reporte CLOSED y solicitud de cierre coordinado.                                                          |
| `1794893038601-observe`              | FAIL inicial fuera de ventana, preservado.                                                                            |
| `1794893070652-observe`              | READY PASS, observaciones HTTP con hora.                                                                              |
| `1794893093308-documentary`          | Recorrido mutable único, snapshots inicial/guardado/completo/enviado; FAIL del control y revisión offline sin replay. |
| `1794893215068-documentary-readback` | Primera confirmación real posterior, PASS.                                                                            |
| `1794893214211-mixed`                | Primera consulta histórica real, PASS.                                                                                |
| `1794893364476-documentary-readback` | Confirmación final, capturas protegidas y logout, PASS.                                                               |
| `1794893360688-mixed`                | Historial final, capturas protegidas y logout, PASS.                                                                  |
| `1794893362863-observe`              | OFFLINE final, capturas protegidas y logout, PASS.                                                                    |

`docs/onboarding-joint-web-status.json` resume resultado, cierre, rutas y huellas. `test-results/onboarding-joint-web/server-current.json` registra CLOSED. Las capturas finales se conservan en los tres últimos directorios; las preliminares se eliminaron, manteniendo íntegros los reportes JSON de sus ejecuciones.

## Reproducción y límites

El ejecutor ahora admite el formato real de `ready.json` separado del acceso privado: `--ready-file`, `--access-file`, `--session-id`, `--ready`. Verifica estado READY, sesión, antigüedad de metadatos, origen loopback y coincidencia de IDs entre acceso y fixture público. No imprime credenciales ni lee `.env`.

Modos ejecutados: `serve`; `observe --expected-state=READY`; `documentary`; `documentary-readback`; `mixed`; `observe --expected-state=OFFLINE`. Los modos de aceptación usaron `--existing-web` para compartir sólo el servidor Web propio, con contextos de navegador separados. Tras autorización de cierre se escribió `stop.request` únicamente en el directorio verificado del proceso propio. No usar esta reserva cerrada para una ejecución nueva: requerirá nuevo READY/fixtures; el modo documental exige DRAFT y no puede reutilizar los ya enviados.

Comprobaciones nuevas del harness: `node --check`, Prettier, guards de preparación y revisión de evidencia; `git diff --check`. Build real y aceptación UI/HTTP descritos arriba. No se repitieron las 287 pruebas focalizadas ni lint/tipos globales de producto porque sus fuentes no cambiaron; sus resultados anteriores conservan fecha y alcance. Las 80 E2E/962 unitarias históricas del backend tampoco se cuentan como pruebas nuevas de Web.

La certificación APK, CONNECT/DISCONNECT, auditoría final y cierre Nest/PostgreSQL pertenecen al coordinador/Driver. Web no las sustituye ni declara despliegue o aceptación de un dispositivo físico. El coordinador confirmó posteriormente el backend apagado.

### Cierre de continuidad

El manifiesto conjunto queda en `WEB_ACCEPTANCE_PASS_CLOSED`, con rutas y SHA-256 de los reportes conservados. Tras la petición de commit/push se iniciaron lint, build, tipos de pruebas y suite global; la coordinación ordenó detener esa preparación. Build y tipos de pruebas ya habían terminado correctamente; lint y la suite global se interrumpieron y **no se declaran aprobados**. No se reanudaron ni se hicieron llamadas backend. El log parcial queda en `test-results/onboarding-precommit-tests.log`.

No hubo `git add`, commit, push, cambio de rama ni otra escritura Git. HEAD antes y después: `e47fb8b7af25fcc5267cfe5bf4c5e9be71cd3a27`; rama `chore/release-1.12.0`. Cambios locales conservados y sin despliegue.

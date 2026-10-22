# Alta documental: adaptación Web al contrato productivo

## Avisos y bloqueos vigentes — 2026-10-19

Se ajustó la disponibilidad al contrato actual, sin reabrir diseño ni cambiar permisos: [informe de estados y validación](DOCUMENTARY-AVAILABILITY-WEB.md), [huellas y evidencia sintética](documentary-availability-evidence.json). LOCAL_TEST, alta desactivada, política ausente, PRODUCTION con requisitos y errores de consulta se distinguen explícitamente; `productionReady` y capabilities no deciden el modo. 129/129 casos únicos de seis archivos completos, tipos, lint, build y revisión visual 1280/320 PASS. Backend leído sin modificar. Esta tarea cambia diez huellas Web de A–H, cubiertas con fixtures; no representa otra integración real. Los resultados siguientes conservan su carácter histórico. Cambios actuales locales, sin commit/push/despliegue/activación.

## Revisión de publicación — 2026-10-19

Se revisan los cambios propios pendientes para commits y push exclusivamente a `feature/driver-verification`; [inventario y correspondencia](onboarding-production-publication-review.json). Base local y remota consultada: `fcc81e98e23b569723c78304caa6098e64b01963`, sin divergencia. Las 27 huellas Web y 23 backend del ensayo siguen correspondiendo; no se repiten A–H ni las 98 pruebas. Los registros inferiores conservan su estado histórico anterior a esta publicación.

El commit final backend compatible no se ha confirmado en esta revisión. Se mantienen como autoridad el handoff `DOCUMENTARY-ONBOARDING-PRODUCTION-PREPARATION.md`, la migración `20261019000100_documentary_production`, el contrato de publicación/aceptación/recuperación y las huellas fuente/runtime del ensayo, ejecutado sobre el SHA base backend más cambios locales. No se declara una nueva pareja de commits probada conjuntamente ni aptitud productiva por publicar Web. La futura reproducción debe registrar el HEAD efectivo de ambos checkouts además de las huellas: el campo `webHead` del arnés actual conserva la base histórica de su inventario.

## Cierre integrado — 2026-10-19, 02:04 America/Mexico_City

**PASS en A–H**, mediante una sola ejecución autorizada del arnés existente, salida 0, del 2026-10-19 08:04:32 al 08:04:58 UTC. [Evidencia integrada saneada y huellas](onboarding-production-integration-evidence.json), [diagnóstico previo](onboarding-integration-preflight.json). El resultado nuevo cierra el recorrido mínimo solicitado; las secciones de implementación e intentos anteriores se conservan más abajo como historial.

Web continúa en `feature/driver-verification`, HEAD `fcc81e98e23b569723c78304caa6098e64b01963`, con la implementación previa sin commit e índice vacío. No se cambió producto durante esta validación. De las 27 huellas Web de entrada, 24 permanecen iguales y sólo cambian los tres archivos del arnés; las 23 referencias backend de fuente/runtime conservan sus huellas. Las 27 huellas Web y 23 backend del ensayo siguen coincidiendo al cierre. No se repitieron las 98 pruebas con fixtures, tipos, lint, build ni los recorridos de baja/entrega/CANCELLED: sus resultados anteriores permanecen históricos.

### Diagnóstico y ejecución autorizada

El reporte y los logs del intento `1792395222480` demostraban un selector desactualizado: buscaba «Este expediente es histórico» donde Web mostraba «Expediente histórico o sin procedencia». El selector ya estaba corregido al iniciar esta continuación; no se encontró evidencia de un defecto de producto. Se conservó aquel FAIL y el rechazo posterior del control por límite de diagnóstico. Este nuevo encargo pidió una ejecución por el mecanismo normal: se solicitó una vez con `require_escalated`, fue permitida y se ejecutó una vez. No se cambió de herramienta para eludir el control ni hubo lanzamientos adicionales.

Se ajustaron únicamente `scripts/verify-onboarding-production-web.mjs`, `scripts/onboarding-isolated-backend.mjs` y `scripts/onboarding-isolated-environment.mjs`: reporte incremental antes/después de cada punto, dependencias y fallos acotados, pérdida de respuesta después del commit real, conteos durables de recuperación, identidad **y unidad** desde Web, bytes JPEG además de PNG y entorno libpq limpio para ambas consultas de identidad. Sintaxis de los tres archivos: PASS. No se modificó ni compiló backend.

### Matriz del recorrido mínimo

| Punto | Estado | Ejecución y comprobación |
| --- | --- | --- |
| A · Publicación | PASS | SUPER_ADMIN completó y confirmó desde Web una publicación DRIVER sintética. POST real 201 y comando APPLIED comprobados antes de perder deliberadamente la respuesta. |
| B · Recuperación | PASS | Recarga y «Consultar intento» desde Web; GET real con la clave original y `PUBLISH_TERMS/POLICY`, APPLIED 200. Marcador retirado tras recuperar y consultar el estado actual. Un solo POST, cero efectos duplicados. |
| C · Registro | PASS | Registro público, confirmación usando el correo capturado e inicio de sesión por Web. Independiente sin proveedor, conductor/perfil PENDING; confirmar correo no inició sesión automáticamente. |
| D · Aceptación | PASS | Texto íntegro del servidor, tres casillas inicialmente desmarcadas. Términos y aviso solos no permitían aceptar; se requirió la finalidad separada. Una aceptación personal DRIVER confirmada por el servidor. |
| E · Documentos | PASS | Identidad y unidad BICYCLE creadas y editadas desde Web, cinco archivos JPEG/PNG cargados, completados y validados por el servidor; ambos expedientes presentados desde Web. |
| F · Revisión | PASS | SUPER_ADMIN abrió las cinco evidencias por acceso privado autenticado y decidió explícitamente sobre ambos checklists. Identidad y unidad quedaron APPROVED, PRODUCTION y DOCUMENTARY-1. |
| G · Aceptar no habilita | PASS | Inmediatamente después de aceptar y antes de crear expedientes: conductor PENDING/OFFLINE, perfil PENDING, cero expedientes y control de admisión desactivado. Comprobación de estado persistido y mensaje Web. |
| H · Historia LOCAL_TEST | PASS | Detalle histórico visible, sin edición ni presentación productiva. Al terminar, la fila histórica conservaba todos sus valores, el actor histórico tenía cero nuevas aceptaciones y la admisión seguía desactivada. |

Los 12 puntos internos (`SETUP`, A, B, C, D, G, dos de E, dos de F y dos de H) terminaron PASS; no quedaron FAIL ni BLOCKED en este recorrido.

| Efecto persistido de publicación | Antes | Tras commit/respuesta perdida | Tras GET |
| --- | ---: | ---: | ---: |
| Versiones publicadas | 0 | 1 | 1 |
| Comandos | 0 | 1 | 1 |
| Eventos | 0 | 1 | 1 |
| Revisión de política | 1 | 2 | 2 |
| Control de admisión | false | false | false |

Otros conteos: una aceptación, cinco PUT de archivos, 15 llamadas del SDK de almacenamiento (lectura, normalización/escritura y previsualización) y un correo de registro capturado. No se acredita entrega real a buzón ni entrega de correos de decisión. Identidad: rostro PNG, INE frente JPEG y reverso PNG. Unidad: tarjeta de circulación y comprobante de propiedad JPEG. Todos se normalizaron a PNG y alcanzaron VALIDATED antes de la revisión.

### Preparación y aislamiento

**Seed preparatorio explícito:** cuenta SUPER_ADMIN con correo confirmado; cuenta histórica DRIVER PENDING/OFFLINE, perfil independiente PENDING, sujeto y expediente LOCAL_TEST/DRAFT. Se generaron imágenes sintéticas en memoria. No se sembraron la nueva política, el nuevo conductor, su aceptación, unidad, expedientes, cargas, presentación o decisiones: esas acciones se realizaron desde la interfaz. Las lecturas Prisma sólo comprobaron precondiciones y efectos después del seed.

Se usaron Web y AppModule/backend reales, Prisma, guardias, controllers y validación reales, `dist` preexistente y PostgreSQL temporal. Identidad de clúster y base objetivo comprobada **antes de migrar y sembrar**: loopback `127.0.0.1:55459`, base `onboarding_web_1792397072142_test`, directorio propio `test-results/onboarding-production-isolated/1792397072142/pgdata`. API4227 y Web4228; puertos comprobados libres sin detener procesos ajenos. Configuración efímera, archivos `.env` ignorados. Correo y transporte SDK/PUT de almacenamiento simulados; no respuestas funcionales sustituidas por fixtures. La única pérdida inducida fue la respuesta de publicación, después del commit real, con `maxRetries:0`.

Artefactos locales excluidos en `test-results/onboarding-production-isolated/1792397072142/`: `report.json` incremental, identidad del entorno y logs. Sus huellas se conservan en el JSON saneado; no se incorporan logs crudos ni claves/credenciales/URLs firmadas. El reporte terminó PASS y registró browser, Vite, backend y PostgreSQL propios STOPPED. Al cierre no existía `postmaster.pid` y el log confirmaba el apagado del clúster propio. No Docker, base principal, Spaces/correo reales ni activación.

Se capturaron ocho imágenes del recorrido real a 1280×900; se inspeccionaron publicación recuperada, aceptación, historia y ambos historiales de decisión. Se conservan tres capturas necesarias, sintéticas y con identificación de cuenta enmascarada: [publicación recuperada](onboarding-integration-visual/publication-recovered.png), [aceptación personal](onboarding-integration-visual/personal-acceptance.png) e [historia preservada](onboarding-integration-visual/historical-local-test.png). Las comprobaciones anteriores de 320 px, teclado/foco y textos largos siguen siendo evidencia visual con fixtures, no una ejecución móvil integrada nueva.

### Compatibilidad, reproducción y pendientes vigentes

La combinación probada es el contenido Web con las huellas del nuevo JSON y backend base `06457dedd9b2f533862a0477b04b36b69e1990f0` **más sus cambios locales de alta productiva**, incluida la migración `20261019000100_documentary_production` y el runtime registrado. El SHA base aislado no contiene todo el contrato. Esto sí es una ejecución conjunta nueva de esos contenidos; no acredita dos commits limpios, versiones mezcladas ni un despliegue.

Para reproducir manualmente en este checkout, con Node/dependencias/Chromium instalados y PostgreSQL18 en la ruta del helper, comprobar primero las huellas, los tres puertos libres y la sintaxis mediante `node --check` de cada uno de los tres scripts. Desde la raíz Web, ejecutar **una sola vez** `node scripts/verify-onboarding-production-web.mjs`, pasando por la aprobación normal si aplica. No proporcionar `.env` ni credenciales reales. El arnés crea un directorio nuevo, comprueba identidad antes de migrar, persiste cada punto y detiene sólo sus procesos. Revisar `report.json`, `environment.json` y `cleanup`; un aborto o falta de reporte completo no acredita PASS. No relanzar automáticamente ni continuar sobre efectos del mismo intento sin diagnóstico.

No quedan bloqueos del recorrido A–H solicitado. Siguen pendientes antes de un uso real:

1. Disponer del backend/migración/runtime compatibles y coordinar la futura publicación de Web; los cambios siguen locales, sin commit ni push.
2. Textos DRIVER/FLEET, privacidad y finalidades aprobados jurídicamente, autorización de publicación y preparación de revisión/soporte. Los textos e imágenes del ensayo carecen de validez legal y documental.
3. Configuración y validación autorizada del entorno real, HTTPS/CORS, correo y almacenamiento. No se acredita aptitud productiva general ni activación.

La aceptación FLEET del representante y la pérdida de respuesta de aceptación no se ejecutaron en este recorrido mínimo; conservan su cobertura histórica con fixtures, sin convertirla en integración nueva. No se reabren baja, entrega ni CANCELLED. Limpieza V2 real en Spaces, tareas RESOLVED y Android/GPS permanecen fuera de este cierre. Sin cambios backend, producto, QA, commit, push, merge o despliegue. Se conservó todo el trabajo local anterior y la nueva documentación queda sin commit.

Comprobaciones documentales finales: cuatro JSON válidos, 148 enlaces relativos existentes en informe/README/BITACORA/VERIFICATION, tres huellas de capturas coincidentes e historial anterior íntegro. `git diff --check`: PASS. Las huellas de fuente/runtime y la sintaxis del arnés siguen correspondiendo a la única ejecución acreditada.

---

## Historial de implementación y validación inicial

**Todo el registro siguiente corresponde al cierre anterior**, incluido su pendiente de integración y el rechazo del lanzamiento. No describe el estado actual A–H, acreditado arriba. Se conserva íntegro para trazabilidad.

Fecha: 2026-10-19. Implementación local en `feature/driver-verification`, HEAD base y final `fcc81e98e23b569723c78304caa6098e64b01963`. El checkout comenzó limpio. Cambios sin commit, push, QA, despliegue ni activación. No se modificó backend.

Web consume la publicación vigente del servidor, separa aceptación personal, lectura de privacidad y consentimientos específicos, y añade publicación inmutable exclusiva de SUPER_ADMIN. Se conservan componentes, layout y estilos vigentes; sólo se permite envolver los botones documentales largos para evitar desbordamiento a 320 px.

## Fuentes y compatibilidad

Fuente: `mandaria-backend/docs/DOCUMENTARY-ONBOARDING-PRODUCTION-PREPARATION.md`, contrastada con OpenAPI, DTO, controllers, servicio, guardias y pruebas actuales. Backend local `06457dedd9b2f533862a0477b04b36b69e1990f0` **más implementación sin commit**. El SHA por sí solo no contiene el contrato requerido: se necesitan los cambios de alta productiva y la migración `20261019000100_documentary_production`.

[Inventario inicial y huellas backend](onboarding-production-web-sources.json) y [resultados y huellas finales Web](onboarding-production-web-evidence.json). Las 14 fuentes backend observadas no cambiaron durante la tarea. Las 31 huellas de `docs/checks/documentary-onboarding-production.json` coinciden con sus fuentes actuales; sus 122 unitarias y 38 E2E son evidencia **histórica backend**, no una nueva ejecución conjunta con Web. Se registran por separado nueve huellas del `dist` preexistente usado en la integración parcial; no se compiló ni escribió backend.

## Pantallas y contrato

| Ruta Web | Comportamiento |
| --- | --- |
| `/driver/register`, `/driver/verify` | Registro independiente sin proveedor. Confirmar correo no inicia sesión ni aprueba; si el desafío pertenece a otro entorno se solicita uno nuevo. |
| `/driver/onboarding` | Política personal completa, requisitos pendientes, procedencia e historial; no habilita expediente sin aceptación vigente informada por backend. |
| `/provider/verification` | Aceptación FLEET del representante vigente, ligada al proveedor seleccionado; nunca firma la aceptación personal DRIVER de otro usuario. |
| `/admin/verification-publications` | Nueva ruta SUPER_ADMIN, enlazada desde revisión documental: consulta de política, borrador vacío y confirmación de textos exactos/ámbito antes de publicar. |
| `/verification/cases/:id` | Procedencia y checklist del servidor; historial, cargas, presentación y revisión siguen separados. |
| `/verification/acceptances/:id` | Recibo histórico con texto, aviso y consentimientos efectivamente registrados; nunca reemplaza la política actual. |

Todos los endpoints usan el prefijo existente `/api/v1`, añadido una sola vez por el cliente:

| Endpoint | Permiso / finalidad |
| --- | --- |
| `GET /verification-terms?scope=DRIVER\|FLEET&providerId=…` | Identidad autenticada y autoridad del ámbito, impuestas por backend; DRIVER personal o representante FLEET autorizado. |
| `POST /verification-terms/accept` | Aceptación explícita con clave UUID, versión/hash exactos, método existente y, en PRODUCTION, aviso y cada consentimiento. |
| `GET /verification-terms/acceptances/:id` | Recibo propio/autorizado, también usado para reconciliar la aceptación. |
| `GET /verification-requirements` | Entorno runtime, checklist, JPEG/PNG y límites actuales. El entorno del corte en la política puede seguir siendo LOCAL_TEST. |
| `GET /admin/verification-policy` | SUPER_ADMIN: revisión, punteros y estado de admisión de sólo lectura. |
| `POST /admin/verification-terms/publications` | SUPER_ADMIN, función habilitada y runtime PRODUCTION: versión inmutable, revisión esperada y autorización explícita. No activa el corte. |
| `GET /verification-command-attempts/:key?operation=PUBLISH_TERMS&target=POLICY` | Recuperación del intento del mismo actor y clave. Es el contrato documental, no los recibos de baja. |
| `POST /verification-command-attempts/:key/close` | Cierre técnico explícito con `{operation,target}`; nunca se interpreta ABSENT como fracaso. |

Registro, confirmación de correo, onboarding, expedientes, unidades, uploads y decisiones conservan sus rutas y DTO existentes. La decisión usa `requirements.policyVersion`, no una versión hardcodeada. La Web no llama a `POST /admin/verification-policy` ni inventa edición, retirada o borrado de publicaciones.

## Aceptación y publicación

El texto íntegro se muestra en regiones desplazables por teclado. Versión, ámbito y procedencia provienen del servidor. Las casillas comienzan desmarcadas: términos, consulta del aviso y cada finalidad específica. Consultar privacidad no equivale a consentir todos los tratamientos. Una publicación incompleta o de procedencia desconocida no se acepta.

El formulario se reinicia al cambiar actor, ámbito/proveedor, versión/hash, aviso o consentimientos. Ante `TERMS_VERSION_CONFLICT` se consulta de nuevo y se requiere otra aceptación explícita; no hay reenvío automático. Sólo se comunica aceptación confirmada después de recibir un recibo completo o recuperar el resultado. `productionApplicable:true` no aprueba expediente ni autoriza operar; `contractuallyEffective:false` es un campo legado, no un dictamen jurídico Web.

La publicación parte de campos vacíos. Valida tamaños/patrones, textos no vacíos, versiones sin LOCAL_TEST, consentimiento con identificadores únicos y referencia no secreta de autorización. Un diálogo presenta exactamente el ámbito, versión, textos y referencia que se enviarán. El permiso técnico SUPER_ADMIN se distingue de la aprobación jurídica. Conflictos de revisión, versión existente o reutilización incompatible de privacidad se explican sin sobrescribir versiones ni reintentar automáticamente. Los textos sintéticos del arnés **no son documentos legales autorizados para producción**.

## Transición LOCAL_TEST y recuperación

Los recibos y expedientes anteriores permanecen visibles cuando backend autoriza su lectura. Los metadatos faltantes no se rellenan ni se deduce procedencia productiva. Un expediente de otro entorno/checklist no admite nuevas cargas, presentación o decisión desde esta Web; la retirada autorizada de un borrador/presentado histórico permanece disponible sin borrar su contenido. La transición exige nuevas aceptaciones, expediente, archivos y revisión. No se copian aprobaciones, aceptaciones ni archivos antiguos.

Se conservan JPEG/PNG, límites, controles W-01 de selección/carga, validación del servidor y revisión humana. Aceptar, cargar, presentar y aprobar son pasos distintos. Las restricciones independientes y servicios comprometidos no se alteran; la Web mantiene el enlace a su continuidad autorizada.

Marcadores persistidos: sólo `{actor,key,operation,target}`, bajo el origen de API. Sin textos, cuerpos, claves privadas, credenciales, documentos ni URLs firmadas. Un intento incierto bloquea nuevas intenciones; cambiar de cuenta no permite eludirlo. La caché separa actor, ámbito y proveedor; el formulario incorpora la versión de publicación. Invalidación y consulta activa preceden a retirar el marcador.

`PUBLISH_TERMS` tiene recibo propio, sin `id/status` de expediente: versión, hash, ámbito, entorno, fecha, revisión y estado histórico del corte. La recuperación valida ese recibo y lee la política vigente; un puntero posterior no invalida el recibo histórico ni se reemplaza con él. `ABSENT` o recibo incompleto mantienen el bloqueo. El cierre `CLOSED_NO_EFFECTS` sólo permite preparar una nueva intención explícita. No se identificó ausencia contractual de recuperación segura de las nuevas mutaciones; su integración completa desde navegador sigue pendiente por el límite de ejecución descrito abajo.

## Validación nueva

**98 casos únicos aprobados en cinco archivos completos**, sin sumar repeticiones: onboarding productivo 27, páginas documentales 27, servicio 22, recuperación 14 y carga 8. Se consolidan los últimos resultados por archivo: 54/54 páginas/onboarding y 44/44 de servicio/recuperación/carga. Cubren política ausente, procedencia incompleta, versión obsoleta/409, consentimientos separados, FLEET personal distinto, publicación SUPER_ADMIN, conflictos, respuesta perdida, ausencia de recuperación, actor distinto, LOCAL_TEST, checklist y carga W-01.

TypeScript de aplicación y pruebas, lint y build: PASS. Build de 2323 módulos; aviso existente de chunk Root mayor de 500 kB (aproximadamente 729 kB), sin cambiar división de bundles. `git diff --check`, sintaxis de los arneses, JSON y enlaces documentales revisados.

Revisión visual sintética: `node scripts/verify-onboarding-production-visual.mjs`, PASS/exit0, ocho capturas a 1280/320 px, cero overflow final, errores de render, solicitudes inesperadas o mutaciones. Comprueba textos largos íntegros, scroll por teclado y foco visible, casillas independientes, diálogo con fondo inerte, Escape/retorno de foco, política ausente e historial. La captura de diálogo usa viewport para no distorsionar la capa nativa con fullPage. [Publicación a 320 px](onboarding-production-visual/publication-preview-320.png), [publicación en escritorio](onboarding-production-visual/publication-preview-1280.png), [política y foco a 320 px](onboarding-production-visual/policy-long-text-focus-320.png), [historial LOCAL_TEST](onboarding-production-visual/historical-local-test-320.png). No equivale a integración real.

Incidencias conservadas: carga inicial de Vitest falló por ENOENT en su directorio temporal del sandbox; se usó TEMP/TMP propio bajo `test-results`. Se corrigieron expectativas antiguas de textos LOCAL_TEST y forma de llamadas del mock; la aserción del alt de imagen requirió repetir completo sólo su archivo. Lint detectó helpers exportados junto a componentes; se separaron. La revisión visual encontró overflow de botones y se corrigió; la comprobación del diálogo se ajustó a la semántica nativa (no exigir que Tab nunca pase por la barra del navegador). No se atribuyen PASS a lotes incompletos ni se suman ejecuciones anteriores.

## Integración real: parcial, no acreditada de extremo a extremo

Arnés preparado: `node scripts/verify-onboarding-production-web.mjs`, con helpers de entorno/backend propios de Web. Artefactos y base sólo bajo `test-results/onboarding-production-isolated`. PostgreSQL propio en loopback55459, API4227 y Web4228. La identidad `data_directory`, base, dirección y puerto se verifica **antes** de migrar/sembrar. Prisma/AppModule/guardias/SDK Spaces/Resend reales, configuración sintética con `.env` ignorado, almacenamiento en memoria y correo capturado. No Docker ni destino de datos desconocido.

El último intento ejecutado (`1792395222480`) comprobó composición real aislada y bloqueo real por publicación ausente. Falló después al buscar un texto distinto al presente en el aviso de expediente histórico. Se corrigió el selector del arnés, pero **no se volvió a ejecutar la integración**. No acredita publicación, registro completo, aceptaciones, recuperación, uploads ni revisión integrada. Tampoco convierte la evidencia backend histórica en una nueva prueba conjunta.

Antes hubo dos paradas por conexión psql denegada en sandbox (segunda sólo diagnóstico), y una parada preparatoria por una ruta inexistente en el inventario de `dist`, ya corregida. Los cuatro clústeres propios quedaron apagados; los dos primeros no llegaron a migrar. No hubo aborto nativo del runner. La revisión automática rechazó el siguiente lanzamiento por interpretar que excedía el límite de diagnóstico adicional; ese comando no se ejecutó. Ante la respuesta del usuario de tomar la mejor opción se mantuvo pendiente, sin eludir el control. Es un bloqueo de autorización de ejecución del arnés, no evidencia de rechazo del contrato ni defecto backend. La revisión visual independiente posterior no usa backend o base y no reintenta ese recorrido.

No se repiten baja, entrega restringida ni recibos CANCELLED: sus implementaciones, sesión y cliente HTTP conservan las huellas previas. El cambio compartido de rutas sólo añade la pantalla de publicaciones; no altera las rutas de baja.

## Pendientes concretos

1. Completar, con autorización adicional de ejecución, el arnés integrado corregido: publicación y recuperación propias, registro/correo capturado, aceptación recuperada, nueva carga/presentación/revisión. Lo posterior al selector fallido no ha sido acreditado; registrar cualquier nueva incidencia sin reintentos ilimitados.
2. Disponer del backend con los cambios aún sin commit, migración y contrato compatibles antes de cualquier futura publicación/despliegue Web. No basta el SHA base ni se valida una combinación de instancias antiguas y nuevas.
3. Para producción: textos DRIVER/FLEET, privacidad y finalidades aprobados por responsables competentes; autorización de publicación; configuración y validación del destino real, HTTPS/CORS, correo, revisión/soporte y preparación operativa. No se probó carga remota real, entrega a buzón ni Spaces real.

No hay activación o aptitud productiva general acreditada. Las constancias de baja siguen siendo de alcance acreditado, no garantía de eliminación total; limpieza V2 real en Spaces y tareas RESOLVED continúan separadas. Android/GPS fuera de alcance. Todos los archivos de esta tarea permanecen locales y sin commit.

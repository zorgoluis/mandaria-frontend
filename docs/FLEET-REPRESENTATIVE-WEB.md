# Expediente privado de representación legal — Web

## 2026-10-19 — Revisión para publicar el expediente del representante

Revisión autorizada exclusivamente en `feature/driver-verification`, worktree `C:/Users/zorgl/.codex/worktrees/fleet-representative-web/mandaria-frontend`. HEAD inicial y origin tras fetch acotado: `e657e715cadb1d6727fbde55a9202b6deaa2fdb9`; 0 commits por delante y 0 por detrás, índice inicialmente vacío. Origin confirmado: https://github.com/zorgoluis/mandaria-frontend.git. Se revisan 36 archivos propios más el registro de publicación; no hay hunks ajenos detectados en este checkout. Los otros worktrees y los cuatro documentos pendientes del checkout principal se conservan.

Correspondencia comprobada: 33/33 huellas Web/arnés, 26/26 backend, 7/7 capturas, los seis reportes de segmentos y los dos reportes finales de pruebas. A–F sigue PASS consolidado con reanudaciones y fallos preservados; recuperación 0→1→1, un POST, selección A/B sin envío automático. Se reutilizan las 40 pruebas focalizadas (29+11), tipos app/test, lint, build y visual 1280/320/teclado. Las 130 anteriores siguen históricas; ninguna suite ni recorrido se ejecutó de nuevo para publicar. Navegador acreditado: Chrome **155.0.8059.82**; causa original de `spawn UNKNOWN` aún sin determinar.

Backend consultado sólo en lectura: rama `codex/fleet-representative-verification`, HEAD base `0fd7e2d058ba2c73c30f5edc21e229c11eefabdd` y cambios pertinentes todavía sin commit. Requiere contrato `FLEET-REPRESENTATIVE-PRIVATE-DOCUMENTS-IMPLEMENTATION.md`, migración `20261019000200_fleet_representative_verification`, recuperación formato 3 y las huellas probadas. SHA final backend pendiente; no se atribuye el ensayo a una pareja de SHA base ni se acredita un despliegue mixto.

Verificaciones nuevas de publicación: revisión del diff y archivos nuevos, 3 JSON de evidencia, 51 enlaces locales de informes y 141 imports relativos, sintaxis de seis scripts, siete capturas inspeccionadas, patrones de secretos y `git diff --check` PASS. No cambió producto. Git usa autocrlf: el inventario conserva SHA-256 de bytes locales y de texto normalizado LF para contrastar el índice sin confundir finales de línea con cambios funcionales.

Sólo evidencia sintética saneada: se excluyen .env, secretos operativos, URLs firmadas, documentos reales, perfiles, bases, node_modules, dist, logs/trazas y temporales; no se borran. Las credenciales literales del arnés son fixtures sintéticos de la base aislada, no credenciales operativas. Pendientes: backend compatible, textos y declaración aprobados para el tratamiento, publicación jurídica autorizada, almacenamiento privado/CORS/custodia y preparación operativa reales. Recuperación tras revocación limitada; constancias parciales no garantizan eliminación total. V2 real en Spaces, RESOLVED y Android/GPS permanecen separados. Sin cambios backend/App/Landing, QA, merge, rebase, despliegue, recepción real ni activación.

[Inventario y revisión previa al commit](fleet-representative-publication-review.json). El registro de Git y la consulta remota posterior determinarán los SHA publicados. Los apartados inferiores conservan expresamente el estado histórico de implementación y ensayo; sus referencias a «sin commit/push» no describen un resultado posterior.

Implementación local del 2026-10-19. **A–F integrados y revisión visual completados en ensayo reanudado; recepción real y admisión no activadas.** No hay commit, push, merge, QA ni despliegue. [Evidencia integrada actual](fleet-representative-integration-evidence.json). La [evidencia del primer cierre](fleet-representative-web-evidence.json) y sus fallos se conservan como antecedentes.

## Cierre integrado autorizado — 2026-10-19

Web permanece en `feature/driver-verification`, HEAD `e657e715cadb1d6727fbde55a9202b6deaa2fdb9`, con implementación sin commit en este worktree. Al iniciar coincidían las 27 huellas de fuentes/pruebas Web y las 26 de backend con el cierre anterior; las cuatro huellas del arnés anterior también coincidían. No se repitieron las 130 pruebas completas por defecto. El checkout principal y sus cuatro cambios documentales anteriores permanecen intactos. AGENTS.md sigue sin localizarse en checkout/ascendientes; README y continuidad leídos.

### Launcher: solución comprobada y límite del diagnóstico

El ejecutable anterior existe: Chromium `153.0.8010.12`, 4 508 160 bytes, bajo la instalación local de Playwright. Su `spawn UNKNOWN` anterior sigue sin causa raíz demostrada. No se lo volvió a lanzar a ciegas ni se atribuye a Windows, producto o rechazo de aprobación.

La alternativa autorizada fue **Google Chrome `155.0.8059.82`**, `C:/Program Files/Google/Chrome/Application/chrome.exe`, Node `v24.15.0` win32/x64, headless, `chromiumSandbox:true`, perfil y temporales exclusivos del ensayo. La prueba mínima `1792438743097` abrió una página HTTP loopback, comprobó texto/foco por teclado y cerró navegador/servidor sin backend/base. PASS con el mecanismo normal de aprobación. La combinación de ejecutable y temporales funciona; no se afirma haber aislado cuál diferencia explica el fallo original. No hubo instalación global, actualización de dependencias, modificación de perfil personal ni desactivación de protecciones.

### Matriz de integración A–F

Una misma base sintética: `representative_web_1792438944140_test`, `127.0.0.1:55469`, cluster propio `test-results/representative-isolated/1792438944140/pgdata`. API 4237, Web 4238. Identidad de base/host/puerto/data_directory comprobada antes de migrar/sembrar y en cada reanudación; no Docker, .env, VM, puerto 43000, correo o Spaces reales.

| Recorrido | Resultado | Evidencia y límites |
| --- | --- | --- |
| A. Expediente | PASS | Privacidad visible antes de datos/archivos; confirmación personal; creación, PATCH, JPEG/PNG, confirmación, orden de páginas y presentación mediante Web. Segmento `9224118`. |
| B. Revisión | PASS | SUPER_ADMIN abrió las tres evidencias, confirmó el checklist real y decidió por Web en `9402312`; consulta del resultado y del expediente del representante en `9557453`. Una sola decisión; conductor/unidad/admisión no se aprobaron. |
| C. FLEET | PASS | Acción separada por el representante acreditado, casillas desmarcadas, recibo histórico visible. `9557453`; una aceptación FLEET, cero aceptación DRIVER, historia LOCAL_TEST intacta, admisión false. |
| D. Respuesta perdida | PASS | `9224118`: respuesta descartada después del commit real; recarga y GET con actor/clave/operación/target originales. Comandos y aceptaciones personales **0→1→1**, un solo POST, sin clave nueva ni replay. Recibo y estado actual separados. |
| E. Aislamiento | PASS | `9224118`: cuenta de otra flotilla y coordinador de la misma, ambos sin acceso al vínculo/caso/bytes ni campos privados. HTTP 404 antes de restricción pese a membership ADMIN. |
| F. Restricciones y contexto | PASS | Solicitud preparatoria por API autenticada real, no declarada recorrido Web de baja. Reutilizada sin POST adicional. Lectura, carga y confirmación: **409 DELETION_RESTRICTED**. Cambio de expediente antes de solicitar y cambio de cuenta final sin imágenes/datos anteriores; cierre `9761412`. |

La precedencia contractual está comprobada en `verification.service.ts`: `authorize` ejecuta `assertSubjectOpen` antes de titularidad. Por eso una cuenta ajena recibe 404 antes del bloqueo y 409 DELETION_RESTRICTED después; se valida el código exacto, no un error genérico. No se restauraron permisos ni se confundió una constancia histórica con resolución actual.

A/B integrado: al terminar A, B seguía seleccionada; un PUT/un adjunto. B sólo salió mediante un nuevo clic explícito; dos PUT/dos adjuntos. Tras la tercera evidencia hubo tres adjuntos validados. No se repitieron carga, confirmación, presentación, aceptación o decisión para superar fallos de aserción. Al retomar se reconstruyó únicamente el transporte de almacenamiento en memoria con los mismos tres fixtures; sus hashes de origen y normalizados coincidieron con SQL, sin volver a escribir expedientes ni sustituir respuestas funcionales.

Preparación declarada: cuentas sintéticas confirmadas, flotillas/memberships de coordinador y cuenta ajena, caso histórico LOCAL_TEST y publicación FLEET sintética por servicio backend real. No es prueba nueva de registro/correo ni publicación por Web, y los textos no son documentos jurídicos autorizados. A–E se hicieron por interfaz salvo consultas de control y la pérdida intencional de respuesta. La restricción F se preparó por API real para probar sus efectos en Web.

### Fallos conservados y reanudaciones sin repetir efectos

No fue una única ejecución ininterrumpida verde. El recurso `1792438944140` conserva seis reportes, todos con cierre de procesos propios:

| Segmento (prefijo `resume-179243` salvo inicial) | Resultado del proceso | Corrección/continuación |
| --- | --- | --- |
| Inicial `1792438944140` | FAIL | SETUP/vínculo Web PASS. Aserción inmediata de scroll tras PageDown; se sustituyó por espera condicionada al desplazamiento real. Sin aceptación ni archivos todavía. |
| `9224118` | FAIL | A/D/E PASS. La enumeración sin espera del formulario administrativo produjo checklist incompleto. Se esperó encabezado, número real de checks y tres evidencias; no se debilitó el checklist. |
| `9402312` | FAIL | Decisión aplicada; la sesión reanudada del representante estaba en dashboard. Se abrió explícitamente el caso y se recuperó el comando aplicado por GET; no otro POST. |
| `9557453` | FAIL | B/C PASS. La aserción de restricción venció a 5 s, frente al sondeo de 10 s; el reporte registró 409 y el mensaje. Se conserva ese fallo, sin acreditar retrospectivamente la transición dentro de los 5 s. |
| `9661306` | FAIL | Denegaciones 409 y visual PASS; última aserción del cambio de cuenta esperaba el 404 previo al bloqueo. Se contrastó la precedencia real antes de corregirla. |
| `9761412` | PASS | F completo; A–E y visual reutilizados desde sus segmentos válidos. No se repitieron sus mutaciones. |

El antiguo aborto de Chromium `1792437444597` también permanece en el historial inferior. Las incidencias nuevas fueron aserciones del arnés con reportes y cierre normal, no nuevos abortos del navegador ni rechazos del servicio de aprobación.

### Corrección Web y validación focalizada nueva

Una regresión nueva demostró que refrescar privacidad desmontaba el selector de archivo, aunque la versión confirmada siguiera igual. Cambio mínimo en `src/verification/representatives.tsx`: separar confirmación vigente de consulta en curso; conservar formulario/selección durante esa consulta y mantener el envío deshabilitado. Un cambio de versión/hash, error o pérdida de autoridad sigue retirando la captura. No amplía permisos ni convierte aceptación en aprobación.

`src/test/representatives.test.tsx` completo **29/29** y `verification-upload.test.tsx` completo **11/11**: **40 casos únicos ejecutados en esta tarea**, una regresión añadida. El primer resultado de esa regresión fue FAIL antes del fix y se conserva. Se corrigió además el tipo de un selector de prueba (`exact` era de Playwright, no Testing Library); el archivo completo volvió a pasar. Tipos app/test, lint afectado y build PASS, sin .env; aviso de Root 758.88 kB >500 kB. Las 130 pruebas del cierre anterior son historia; 91 casos de archivos no afectados se reutilizan, no se suman como nuevas ejecuciones. No A–H, baja/recibos ni suites backend repetidos.

Visual: diez estados a 1280 y 320 px sin desbordamiento horizontal; aviso largo desplazable con teclado, foco en confirmación, menú móvil/Escape/devolución de foco, errores/restricción, aprobación y contrato separados. Las primeras capturas móviles pueden mostrar la transición del menú; se conservan localmente. Las móviles seleccionadas al cierre esperan posición final del sidebar y desactivan sólo animaciones finitas de captura. No hay cambio de diseño ni CSS.

Siete capturas sintéticas inspeccionadas, copiadas sin modificar bytes: [borrador escritorio](images/fleet-representative/dossier-desktop.png), [recuperación pendiente](images/fleet-representative/recovery-desktop.png), [revisión administrativa](images/fleet-representative/review-desktop.png), [aprobado móvil](images/fleet-representative/approved-mobile.png), [FLEET móvil](images/fleet-representative/fleet-mobile.png), [recibo móvil](images/fleet-representative/receipt-mobile.png), [restricción móvil](images/fleet-representative/restricted-mobile.png). Identidades, UUID y textos son inventados; no tokens, URLs firmadas ni documentos reales. Reportes, perfiles, builds y base temporal quedan excluidos.

### Identidad probada, reproducción y pendientes reales

Backend en lectura: `codex/fleet-representative-verification`, base `0fd7e2d058ba2c73c30f5edc21e229c11eefabdd` más cambios sin commit. **26/26 huellas iguales** antes/después de cada segmento y frente al antecedente. Web/runtime/arnés: 33 huellas por segmento; sin cambios durante su ejecución. El JSON actual identifica contenido exacto; los SHA base solos no son la combinación integrada. Dos fuentes Web difieren del cierre anterior y están cubiertas por las 40 pruebas nuevas y el ensayo. No se modificó backend/App/Landing.

Prueba mínima reproducible: `node scripts/verify-representative-browser.mjs`. Ensayo nuevo reproducible: `node scripts/verify-representative-web.mjs`, con backend compatible construido, PostgreSQL 18 y Chrome local, mediante aprobación normal. `REPRESENTATIVE_BROWSER_EXE` permite señalar explícitamente otra instalación compatible sin alterar perfiles. Los auxiliares admiten reanudar exclusivamente un recurso propio identificado (`REPRESENTATIVE_RESUME_RUN` y `REPRESENTATIVE_RESUME_FROM`), verificando estado/huellas y deteniéndose ante efectos incompatibles; no son una receta para repetir comandos inciertos. No hace falta volver a ejecutar lo ya acreditado.

Recursos cerrados: navegador, Vite, backend y PostgreSQL propios. Comprobación independiente final: `pg_ctl status` = `no server running`, cero listeners en 55469/4237/4238. Tres JSON, 16 enlaces de documentación actual, 33 huellas Web/arnés, 26 backend y siete capturas comprobados; `git diff --check` PASS. Base sintética identificada conservada; no limpieza destructiva ni intervención en otros procesos. Índice vacío; documentos y cambios quedan locales sin commit/push. Archivos de esta continuación: dos fuentes Web/prueba citadas, tres arneses existentes, dos nuevos auxiliares de navegador, este informe/README/BITACORA/VERIFICATION, JSON integrado y siete capturas.

No quedan recorridos A–F pendientes en este alcance local. Persisten: backend compatible y migración/formato 3; revisión/publicación jurídica del aviso para identidad/facultades; almacenamiento privado/CORS/custodia y preparación operativa reales. Recuperación después de revocar el vínculo sigue limitada por contrato. No aptitud productiva, despliegue ni activación; constancias parciales, limpieza V2 real en Spaces, tareas RESOLVED y Android/GPS mantienen su alcance separado.

## Antecedentes del primer cierre local

Los apartados siguientes conservan el estado inicial, previo a la autorización y ensayo reanudado descritos arriba; sus pendientes de navegador quedaron superados por Chrome instalado.

## Base, aislamiento del trabajo y fuentes

El checkout principal estaba en `main`, HEAD `763b7f5397320b1872fbbfc32ffd37a91b5411ec`, con cambios documentales previos en BITACORA, README, VERIFICATION y `docs/FLEET-REPRESENTATIVE-WEB-PROPOSAL.md`. Se preservan allí íntegros. No se cambió de rama sobre ellos: se creó el worktree `C:/Users/zorgl/.codex/worktrees/fleet-representative-web/mandaria-frontend`, rama `feature/driver-verification`, HEAD `e657e715cadb1d6727fbde55a9202b6deaa2fdb9`, inicialmente limpio. La propuesta anterior se copia como antecedente, sin reinterpretar sus observaciones históricas como contrato final. Los otros worktrees permanecen intactos. AGENTS.md no localizado en checkout/ascendientes; README y continuidad leídos. Dependencias locales existentes mediante junction, sin instalación o actualización.

Backend consultado exclusivamente en lectura en `C:/Users/zorgl/Documents/mandaria-backend`: rama confirmada `codex/fleet-representative-verification`, SHA base `0fd7e2d058ba2c73c30f5edc21e229c11eefabdd` **más implementación sin commit**. La autoridad de este cliente es `docs/FLEET-REPRESENTATIVE-PRIVATE-DOCUMENTS-IMPLEMENTATION.md`, contrastada con OpenAPI, DTO, controller, servicio, reglas, esquema/migración y pruebas actuales. Diseño y apartado H se conservan como procedimiento/diseño, no como API. [Huellas de entrada](fleet-representative-contract-before.json) identifica 26 archivos fuente, documentación, pruebas y runtime. No se afirma que los SHA base solos representen la combinación probada.

Los 64 E2E, 38 unitarios y 33 B2B reportados por backend son **evidencia histórica ajena a esta ejecución Web**, no nuevas validaciones de esta tarea. No se ejecutaron sus suites ni se compiló/modificó backend.

## Rutas y comportamiento Web

- `/verification/representatives`: vínculos de la cuenta autenticada DRIVER o PROVIDER_ADMIN. Se puede llegar desde navegación o desde una flotilla autorizada con filtro `providerId`; el filtro sólo reduce la lista propia y no concede acceso.
- `/verification/representatives/:subjectId`: cuenta/flotilla explícitas, privacidad personal, creación y seguimiento propios. El listado backend expone identificadores; no se inventan nombres de persona representada antes de su declaración ni una consulta administrativa de vínculos ausente.
- `/verification/cases/:id`: detalle existente ampliado con expediente REPRESENTATIVE. Formulario y selección de archivos sólo después de confirmar privacidad vigente. SELF identifica a la misma persona física sin sociedad/poder/licencia ficticios; APPOINTMENT/POWER separan titular/representante, fechas, límites, firma conjunta y orden explícito de páginas. Guardar no presenta; presentar requiere confirmación. Un rechazo permite nuevo expediente mediante el vínculo, sin editar un caso terminal.
- `/admin/verification-cases`: bandeja existente y revisión separada en el detalle. Checklist real de `requirements.representative`, motivo obligatorio y confirmación sobre revisión esperada; firma conjunta pendiente no admite aprobación individual. No aprueba conductor/unidad ni acepta FLEET.
- `/admin/fleet-representatives`: vinculación y revocación SUPER_ADMIN por referencias identificadas, con confirmación. Revocación irreversible del vínculo; no supone eliminación ni cancela servicios. No se inventa listado administrativo de vínculos ni se deduce su revisión desde la del caso.
- Aceptación FLEET en el vínculo, únicamente con `canAcceptFleet`, LINKED y sin restricción; vuelve a validarla backend. El formulario operativo de flotilla conserva consulta de textos, pero no autoriza al coordinador a aceptar. `/verification/acceptances/:id` distingue acreditación histórica de autoridad vigente.

No se convierte LOCAL_TEST en productivo. Se mantienen versiones/hash, casillas separadas/desmarcadas, privacidad antes de datos/archivos y aceptación contractual después de acreditar. Falta de publicación aplicable bloquea el paso dependiente; no se usa un borrador legal como sustituto. El aviso final para identidad/facultades requiere revisión y publicación autorizada fuera de esta tarea.

## Matriz contractual utilizada

Prefijo `/api/v1`. Las mutaciones documentales llevan UUID `Idempotency-Key`; nunca se repiten automáticamente. DTO nombrados son los reales del backend inspeccionado.

| Método y endpoint | Entrada / respuesta relevante | Autoridad, estado y consumidor Web |
| --- | --- | --- |
| GET `/fleet-representatives/mine` | RepresentativeListResponse: items con id/providerId, LINKED/REVOKED, revision, restricted, cases, approvedCaseId, canAcceptFleet, environment | Lista propia; no herencia por membership. Entrada y permisos actuales del detalle. |
| POST `/admin/fleet-representatives` | LinkRepresentativeDto: userId/providerId → RepresentativeLinkResponse | SUPER_ADMIN; solicitante activo DRIVER/PROVIDER_ADMIN, correo confirmado. LINK_REPRESENTATIVE, target=userId. |
| POST `/admin/fleet-representatives/{id}/revoke` | RevokeRepresentativeDto: expectedVersion/reason → vínculo REVOKED | SUPER_ADMIN. REVOKE_REPRESENTATIVE, target=vínculo. |
| GET `/fleet-representatives/{id}/privacy` | RepresentativePrivacyResponse: ámbito REPRESENTATIVE_PRIVACY, versión/aviso/hash/consentimientos, acceptsFleetContract:false | Titular vinculado no restringido. Antes de información y archivos. |
| POST `/fleet-representatives/{id}/privacy/acknowledge` | RepresentativePrivacyDto: versión/hash exactos, privacyAcknowledged y consentimientos separados → RepresentativePrivacyReceiptResponse | Titular. REPRESENTATIVE_PRIVACY, target=vínculo. ACKNOWLEDGED no acepta FLEET. |
| POST `/fleet-representatives/{id}/cases` | Sin cuerpo → ReceiptDto id/DRAFT/revision | Titular con privacidad vigente. CREATE_CASE, target=vínculo; no caso abierto paralelo. |
| GET/PATCH `/verification-cases/{id}` | VerificationCaseResponse / UpdateCaseDto expectedVersion+data estricta | GET titular o SUPER_ADMIN; PATCH titular, DRAFT. UPDATE_CASE target=caso. |
| POST `/verification-cases/{id}/uploads` | UploadDto expectedVersion/category → intención, PUT temporal y caducidad | Titular DRAFT. CREATE_UPLOAD target=caso; sólo categorías efectivas de representante. |
| POST `/verification-cases/{id}/uploads/{uploadId}/complete` | RevisionDto → adjunto validado | Titular, restricciones revalidadas. COMPLETE_UPLOAD target=caso. PUT no confirma ni aprueba. |
| DELETE `/verification-cases/{id}/attachments/{attachmentId}` | RevisionDto → referencia retirada | DRAFT titular; REMOVE_ATTACHMENT target=caso. No declara borrado físico ni libera cuota. |
| POST `/verification-cases/{id}/attachments/{attachmentId}/access` | Sin cuerpo → bytes autenticados no-store | Titular o SUPER_ADMIN autorizado; nunca URL pública de lectura. |
| POST `/verification-cases/{id}/submit` o `/withdraw` | RevisionDto → ReceiptDto | Titular; SUBMIT/ WITHDRAW, target=caso. Congelación/retiro según estado real. |
| GET `/admin/verification-cases` | VerificationListDto → página de casos | SUPER_ADMIN; bandeja existente. No se inventa filtro de sujeto ausente. |
| POST `/admin/verification-cases/{id}/decision` | DecisionDto: expectedVersion, decision, checklistVersion, passedChecks, motivo y nota permitida | SUPER_ADMIN, SUBMITTED vigente. DECIDE target=caso; confirmación explícita. |
| GET `/verification-requirements`, GET `/verification-terms?scope=FLEET&providerId=...` | Requisitos/versiones/entorno y TermsQueryDto → textos completos | Requisitos de carga/checklist y disponibilidad; consultar términos no acredita facultades. |
| POST `/verification-terms/accept` | AcceptTermsDto FLEET → recibo, referencia de acreditación histórica | Acreditado vigente; ACCEPT_TERMS target=FLEET:providerId. Separado de revisión y admisión. |
| GET `/verification-command-attempts/{key}?operation=...&target=...`, POST `.../{key}/close` | AttemptDto; APPLIED/ABSENT/CLOSED_NO_EFFECTS | Actor iniciador y autoridad actual; cierre explícito según backend, sin repetir efecto. |
| GET `/verification-terms/acceptances/{id}` | Recibo contractual o proyección personal de privacidad | GET de privacidad **no devuelve status ni subjectId**: se contrasta id/version/hash/ámbito con el resultado APPLIED que sí contiene esos campos. No se amplía el DTO por suposición. |

Errores propios traducidos: solicitante inválido, vínculo existente/revocado, privacidad no disponible, falta de acreditación, orden de páginas, motivo obligatorio, firma conjunta, facultades aún no vigentes y vencimiento. Se preservan política ausente/desactivada, versión obsoleta, 401/403/404, red e idempotencia sin inferir modo o cerrar sesión indiscriminadamente. DELETION_RESTRICTED bloquea documentación y remite a seguimiento limitado.

## Recuperación, privacidad y eliminación

El almacenamiento durable Web sigue limitado a `actor/key/operation/target` por origen API; no documentos, nombres, formularios, URLs privadas, bearer, contraseñas o cuerpos. Privacidad confirmada se conserva sólo en memoria de consulta, por cuenta/vínculo/versión/hash; no otorga permiso contractual. Ante respuesta perdida se consulta GET original, valida el recibo y refresca aparte el estado actual. ABSENT/no disponible/403/404 no son confirmación de fracaso; marcador pendiente conservado. Sin replay automático ni nueva clave.

Límite concreto backend: la consulta de privacidad/creación de caso comprueba autoridad vigente antes de recuperar el comando. Si el vínculo se revoca entre commit y GET, no hay canal mínimo acreditado para ese intento. Web conserva incertidumbre y marcador; no fuerza otra cuenta, borra el intento ni inventa recuperación. La recuperación administrativa de vínculo/revocación obtiene recibo histórico; no hay GET administrativo que certifique el vínculo actual, por lo que el mensaje no lo afirma.

Carga reutiliza autorización/PUT/confirmación W-01: A no elimina ni envía B seleccionada después. JPEG/PNG, cuota/bytes/píxeles del servidor, páginas ordenadas y sin categorías de conductor/unidad. Previews sólo object URLs en memoria, revocadas al desmontar/cambiar contexto; lecturas y vistas privadas se retiran al perder acceso. Consultas separadas por actor, vínculo y caso; respuestas tardías no rellenan otro contexto. No PDF, OCR, biometría, certificado de autenticidad ni promesa de antimalware.

Eliminación V2 sigue siendo backend: Web respeta denegación de acceso/carga/completado y muestra mínimo autorizado. Constancias parciales, incidente actual y H histórico son dimensiones distintas; no elimina objetos, ejecuta retención/restauración, levanta gates o altera servicios/créditos/entregas. Sustituto sin imágenes ni consentimientos heredados. Sesión restringida conserva únicamente los destinos ya autorizados, sin ampliarlos a lectura documental.

## Verificación y reproducción

**130 casos únicos PASS**, contando el último resultado completo de cada archivo: `representatives.test.tsx` 28, `verification-upload.test.tsx` 11, `verification-pages.test.tsx` 27, `verification-recovery.test.ts` 14 y `onboarding-production.test.tsx` 28 y `verification-service.test.ts` 22. El último lote de interfaz fue 55/55 (representantes y páginas), después del mensaje de restricción por alcance y su regresión. La revisión final añadió 22/22 regresiones del servicio de comandos sin repetir los 108 anteriores. No se suman repeticiones. Los otros tres archivos completos se ejecutaron en esta tarea; sus resultados no son sólo evidencia histórica. Un selector inicial ambiguo por mensaje duplicado en toast/formulario se corrigió; no fue fallo de producto ni aborto nativo.

Cobertura: representante/coordinador/otra flotilla/SUPER_ADMIN; privacidad previa, aviso ausente y versión obsoleta; consentimientos separados; capacidad SELF y orden de páginas; cambios de contexto, respuesta tardía y revocación; carga válida/inválida y A/B en las tres categorías nuevas; revisión obsoleta, motivo/confirmación, firma conjunta; aprobación distinta de aceptación/admisión; recuperación GET con marcador original, recibo ajeno rechazado y vínculo histórico sin atribuir vigencia; restricción por alcance; historia LOCAL_TEST. Son pruebas con fixtures fieles, **no una ejecución integrada**.

Tipos app/test, ESLint de fuentes/pruebas afectadas y build PASS después del último cambio funcional. Build con `configFile:false`, `envDir:false`, plugin React y API loopback sintética: sin lectura de .env. Se conserva el aviso de chunk Root mayor de 500 kB. Sintaxis de los cuatro scripts, dos JSON, 50 enlaces de documentación nueva y diff comprobados al cierre; historial de README/BITACORA/VERIFICATION conservado. El comprobador documental corrigió una extensión de prueba y un paréntesis en su propio script; no se ejecutó nuevamente ningún recorrido integrado por ello. No se repitieron A–H, recorridos de baja/CANCELLED ni suites completas. Su evidencia previa permanece histórica y no acredita estas pantallas.

### Único intento integrado y límite de diagnóstico

Ensayo `1792437444597`, del 2026-10-19 19:17:24–19:17:37 UTC. PostgreSQL temporal identificado antes de migrar/sembrar, migración, composición del backend real, fixtures preparatorios y Vite arrancaron. El checkpoint SETUP falló al abrir el navegador: **`browserType.launch: spawn UNKNOWN`**. No hubo navegación, carga de documentos ni aceptación desde Web. Un único diagnóstico adicional, sólo Chromium instalado y sin API/base, reprodujo `spawn UNKNOWN`. La causa no está determinada; no se atribuye a producto ni a rechazo del servicio de aprobación. Ambos lanzamientos fueron autorizados por el mecanismo normal. No se hicieron más intentos ni se cambió de herramienta para sortear el límite.

| Recorrido | Estado acreditado |
| --- | --- |
| Preparación de PostgreSQL aislado y migración | PASS; identidad exacta en evidencia saneada |
| SETUP completo, incluido navegador | FAIL: Chromium no arrancó |
| Vinculación y expediente: privacidad, evidencias, presentación | BLOCKED; no se ejecutó interfaz |
| Revisión SUPER_ADMIN y consulta del representante | BLOCKED |
| Aceptación FLEET separada | BLOCKED |
| Pérdida de respuesta y recuperación sin duplicados | BLOCKED; 0 POST de privacidad, sin conteos de efecto acreditados |
| Denegación a otra cuenta | BLOCKED |
| Restricción documental | BLOCKED |
| Escritorio, 320 px, teclado, foco y textos largos | BLOCKED; ninguna captura ni comprobación de overflow |

El arnés conserva el reporte incremental local excluido; sólo su resumen saneado y huella se incluyen en documentación. Las 26 huellas backend de entrada coinciden antes/después del intento y al cierre. Los recursos propios se cerraron: navegador no iniciado, Vite/backend cerrados y PostgreSQL detenido; lectura final `pg_ctl status` = `no server running`, ningún listener en 55469/4237/4238. Los archivos temporales quedan excluidos y no se borran para aparentar limpieza. El arnés de cierre recibió formato después del intento; su huella actual identifica la versión comprobada sintácticamente, no una nueva ejecución exitosa.

### Procedimiento reproducible preparado, sin nuevo lanzamiento en esta tarea

Arnés: `node scripts/verify-representative-web.mjs`, desde este worktree, mediante aprobación normal cuando se autorice resolver el bloqueo. Requiere Node 24, las dependencias locales Web/backend, runtime backend construido compatible, PostgreSQL 18 y Chromium instalado (ruta explícita mediante `REPRESENTATIVE_CHROMIUM` si corresponde a la instalación del propietario). No descarga componentes. Usa puertos propios 55469 (PostgreSQL), 4237 (API), 4238 (Web), bind loopback, comprobación de `data_directory`/host/puerto/base antes de migrar y sembrar. Si están ocupados se detiene; nunca usa 43000. No copiar variables ni credenciales de una instalación real.

Configuración sólo de proceso y archivos efímeros bajo `test-results/representative-isolated/<run>`; Vite y Nest no leen .env. AppModule/runtime backend locales reales, PostgreSQL nuevo, adaptador documental real con transporte SDK/PUT en memoria, correo capturado y guard contra red externa. Se reutiliza el doble de eliminación backend en lectura; se detiene el worker propio para no ejecutar una campaña de borrado. No Docker, base principal, Spaces ni correo real. Publicación sintética preparatoria por servicio real, **no prueba de publicación mediante Web ni documento legal autorizado**. Cuentas/flotilla/membresía del coordinador y fixture histórico del helper son preparación declarada; ninguna aprobación documental se siembra.

El procedimiento programado distingue interfaz de preparación: vínculo/privacidad/creación/carga/envío/revisión/FLEET mediante navegador; restricción preparada mediante API real autenticada y después comprobada en Web y endpoints privados. La aserción de recuperación preparada descarta una respuesta sólo después del resultado real de backend y exige conteos 0→1→1; **no se alcanzó ni se acredita**. No sustituye respuestas funcionales. Revisión prevista de escritorio/320 px, foco/teclado y texto largo; capturas sólo sintéticas, sin trazas crudas publicables. Cada ejecución cierra únicamente sus recursos y conserva su informe, incluso si falla. Consultar `report.json` y `environment.json` bajo el nuevo directorio de ejecución; no acreditar PASS sin checkpoints completos y cleanup satisfactorio.

## Inventario y estado final local

Rama/HEAD del worktree de implementación sin cambio: `feature/driver-verification` / `e657e715cadb1d6727fbde55a9202b6deaa2fdb9`; índice vacío. El checkout principal sigue en main con sus cuatro cambios anteriores conservados. No hubo consulta remota nueva ni publicación.

- Rutas/navegación: `src/app/App.tsx`, `src/layouts/AdminLayout.tsx`.
- Formularios y flujo nuevos: `src/verification/representatives.tsx`, `representative-form.tsx`.
- Adaptación de contrato/UI compartida: `src/verification/{types,service,pending,common,evidence,format,pages,terms}`.
- Pruebas: `src/test/representatives.test.tsx`, `representative-fixtures.ts`, ampliación de `verification-upload.test.tsx`.
- Arnés: `scripts/verify-representative-web.mjs`, `representative-isolated-environment.mjs`, `representative-isolated-backend.mjs`, `representative-contract-snapshot.mjs`.
- Documentación: este informe, antecedente de propuesta (sólo enlaces backend reubicados para el worktree), dos JSON de huellas/evidencia, README, BITACORA y VERIFICATION. Todo local y sin commit.

## Pendientes externos a esta implementación

Contrato/backend compatible con la migración `20261019000200_fleet_representative_verification` y recuperación formato 3, junto con las huellas comprobadas; no basta un SHA base. Revisión/publicación autorizada del aviso y términos para este tratamiento, preparación operativa/custodia y verificación del destino privado/CORS reales siguen pendientes. Ninguna aptitud productiva general, recepción real o activación acreditada. Limpieza V2 real en Spaces, retención de expedientes abandonados, tareas RESOLVED y Android/GPS mantienen su alcance separado. No se contactó a otros agentes.

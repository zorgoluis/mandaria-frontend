# Disponibilidad del alta documental: avisos y bloqueos Web

## Revisión previa a publicación — 2026-10-19

Publicación autorizada únicamente en `feature/driver-verification`, remoto `origin` = `https://github.com/zorgoluis/mandaria-frontend.git`. Fetch limitado a esa rama: base local/remota `1d4486e1b0c6fbd987ad846213de7bfdb05e8c1d`, 0/0 commits exclusivos. Se revisan exactamente 25 archivos propios: avisos/bloqueos, pruebas, arnés, cuatro capturas sintéticas y documentación. No se detectaron cambios ajenos en el inventario ni contenido previamente staged; otros worktrees y artefactos excluidos se conservan.

Las 16 huellas de fuentes/arnés, nueve fuentes protegidas, 27 entradas del inventario histórico contrastado, cuatro capturas y cinco reportes locales siguen coincidiendo con la última evidencia. Se reutilizan 129 pruebas PASS, tipos, lint, build y visual 1280/320; **no hay suites o integración nuevas**. Revisión estática de JSON, enlaces, sintaxis, secretos y diff satisfactoria. El índice se preparará con rutas explícitas y se contrastarán sus blobs con los archivos revisados, admitiendo sólo CRLF/LF. El commit y push posteriores se verificarán contra el remoto; este registro previo no anticipa su resultado.

Se mantiene la dependencia del backend compatible identificado por contrato y huellas, sin atribuir una nueva pareja de SHA integrada. La evidencia JSON y las entradas inferiores conservan el estado de la implementación anterior a esta publicación. Publicar la rama no despliega ni activa Web.

## Cierre de implementación anterior a la publicación

2026-10-19. Rama `feature/driver-verification`, HEAD inicial y final `1d4486e1b0c6fbd987ad846213de7bfdb05e8c1d`. Checkout inicialmente limpio e índice vacío; cambios de esta tarea **locales, sin commit ni push**. Se conservaron los otros tres worktrees y los artefactos excluidos. Se leyeron README, BITACORA, VERIFICATION y continuidad de alta; no existe AGENTS.md en este checkout ni en los directorios ascendentes consultados.

## Contrato y autoridad

Se contrastó en lectura `mandaria-backend/docs/DOCUMENTARY-REAL-ENABLEMENT-REQUIREMENTS.md` con OpenAPI, controller, DTO, servicio, política, selección de términos y pruebas de publicación actuales. El handoff reporta backend `6e16e548e26850c25adbafd3a8ff15c5e7947657` más cambios locales. La consulta `git -C ... rev-parse HEAD` no estuvo disponible por `Permission denied` del sandbox: esa referencia es reportada, no una confirmación Git nueva. Las nueve fuentes leídas conservaron sus huellas durante esta tarea; están registradas en la [evidencia saneada](documentary-availability-evidence.json). Backend no se modificó ni ejecutó.

La autoridad del modo es exclusivamente `GET /api/v1/verification-requirements` para DRIVER, PROVIDER_ADMIN y SUPER_ADMIN autenticados. `productionReady:false`, capabilities de sesión y `VerificationPolicy.environment` no certifican disponibilidad ni sustituyen el entorno runtime. Los textos aplicables siguen viniendo de `GET /api/v1/verification-terms?scope=DRIVER` o `scope=FLEET&providerId=…`; el onboarding puede comunicar `terms.blockingReason`. No se añadieron endpoints, facultades ni mutaciones.

## Estados y textos

Mapeo único en [availability.ts](../src/verification/availability.ts), consumido por el aviso y los pasos dependientes:

| Respuesta actual | Texto principal | Comportamiento |
| --- | --- | --- |
| 200, `LOCAL_TEST` | «Modo de prueba. Usa exclusivamente datos e imágenes sintéticos. No habilita operaciones reales.» | Conserva el flujo de prueba y sus permisos/requisitos. |
| 503, `VERIFICATION_LOCAL_DISABLED` | «El alta documental no está disponible en este momento. Puedes volver a consultar más tarde.» | Bloquea preparación y mutaciones documentales dependientes; no lo llama prueba local. Permite volver a consultar. |
| 200, `PRODUCTION`, política ausente | «Falta publicar la política aplicable a este ámbito. Puedes consultar tu historial; la aceptación y las nuevas evidencias deben esperar.» | Bloquea aceptación, preparación de expedientes/unidades, edición, nueva carga/completado y presentación. No bloquea por este motivo la consulta histórica ni retirar un expediente o su referencia mediante la acción ya autorizada. |
| 200, `PRODUCTION`, requisitos y política disponibles | Sin aviso LOCAL_TEST. Mantiene «Aceptar términos o cargar archivos no aprueba el expediente ni habilita operaciones.» | Permite el flujo real sujeto a aceptación vigente y controles existentes. No declara habilitación general ni activa admisión. |
| Red | «No se pudo conectar para consultar los requisitos. Vuelve a intentarlo.» | Disponibilidad desconocida; no permite preparar nuevas evidencias. |
| 401 | «No se pudo verificar tu sesión para esta consulta. Revisa tu acceso antes de continuar.» | No deduce modo. No añade llamadas a logout; conserva el manejo HTTP de autenticación existente. |
| 403 | «No tienes permiso para esta consulta.» | No deduce modo ni cambia permisos. |
| Otros errores, modo desconocido o consulta pendiente | Mensaje de consulta fallida, modo sin confirmar o consulta en curso, según corresponda. | No reutiliza datos anteriores como autorización para continuar. |

Sólo la combinación **503 + código exacto** clasifica desactivación o política ausente. Un 503 genérico o un código de desactivación con otro status no establece ese estado. Los errores no muestran configuración interna. Si los requisitos identifican el modo y falla después la consulta de términos, el modo proviene de aquellos requisitos, nunca del error.

El registro público mantiene un aviso neutral: no puede llamar anónimamente al endpoint protegido para adivinar el modo. Ante 503 explícito de registro/confirmación muestra el motivo y bloquea ese envío en el formulario actual; una nueva visita permite volver a intentarlo. No se agregó una consulta pública, reenvío automático ni almacenamiento de datos personales. La publicación del aviso de privacidad final previo al registro sigue siendo una dependencia operativa.

## Bloqueos y preservación

- [use-availability.ts](../src/verification/use-availability.ts) centraliza consultas con claves por actor, ámbito, proveedor y entorno. Consume AbortSignal y evita activar términos mientras los requisitos estén pendientes o fallen. Las respuestas canceladas o de otra cuenta/ámbito/entorno no reemplazan el estado reciente.
- [pages.tsx](../src/verification/pages.tsx), [terms.tsx](../src/verification/terms.tsx), [forms.tsx](../src/verification/forms.tsx) y [evidence.tsx](../src/verification/evidence.tsx) bloquean sólo los pasos dependientes. Una aceptación anterior no habilita preparar identidad ni unidad cuando cambia la versión vigente; su enlace se identifica como comprobante anterior. No cambia la aprobación documental ni la continuidad autorizada de servicios.
- [common.tsx](../src/verification/common.tsx) muestra el aviso según requisitos; conserva recuperación y la advertencia de constancias limitadas. [identity.tsx](../src/verification/identity.tsx) trata las respuestas explícitas de registro sin inventar un modo.
- [publications.tsx](../src/verification/publications.tsx) mantiene SUPER_ADMIN y publicación inmutable. La falta de términos no bloquea esa acción administrativa por sí misma. El catálogo de prueba no se convierte en productivo. El borrador permanece durante una consulta fallida cuando ya estaba cargado, y sus botones dependen del estado vigente.
- [format.ts](../src/verification/format.ts) explica 400 `VERIFICATION_PUBLICATION_INVALID`: revisar versiones/textos/consentimientos/autorización y corregir notas o marcadores de borrador en la copia. No elimina marcas automáticamente ni reenvía/publica políticas para desbloquear la interfaz.
- [deletion/contract.ts](../src/deletion/contract.ts) cambia únicamente el texto de `PRIVACY_WORKFLOW_UNAVAILABLE`: «La baja documental no está disponible en este momento. Conserva el folio y los intentos pendientes para consultar más tarde.» No cambia `incidentPending`, estado actual, cierre histórico, recuperación ni constancias parciales.

Se preservan aceptación por versión/hash, aviso y consentimientos separados y desmarcados, permisos, rechazo del servidor, JPEG/PNG y límites, selección de archivos, recuperación por clave, marcadores mínimos, restricciones y servicios comprometidos. SUPER_ADMIN no consulta términos personales bajo facultades que no posee; las precondiciones de sus decisiones siguen siendo validadas por backend.

## Validación ejecutada

**129/129 casos únicos PASS**, tomando el último resultado completo de cada archivo; no se suman repeticiones:

| Archivo completo | Casos PASS |
| --- | ---: |
| [documentary-availability.test.tsx](../src/test/documentary-availability.test.tsx) | 29 |
| [onboarding-production.test.tsx](../src/test/onboarding-production.test.tsx) | 28 |
| [verification-pages.test.tsx](../src/test/verification-pages.test.tsx) | 27 |
| [verification-upload.test.tsx](../src/test/verification-upload.test.tsx) | 8 |
| [verification-recovery.test.ts](../src/test/verification-recovery.test.ts) | 14 |
| [deletion-service.test.ts](../src/test/deletion-service.test.ts) | 23 |

Cobertura nueva: matriz completa y status exacto; PRODUCTION con `productionReady:false`; política ausente sin perder historia/servicios; aceptación obsoleta; desactivado → producción; LOCAL_TEST → PRODUCTION con términos tardíos; respuesta anterior cancelada; aislamiento entre actores y flotillas; marcadores conservados; error público sin GET protegido; rechazo editorial con texto intacto y sin publicación automática. Se mantienen regresiones de carga W-01, recuperación y separación de recibo/estado actual.

Primer lote: 126/128; dos pruebas pulsaban antes de terminar la nueva consulta. Se añadió espera explícita de botón habilitado sin quitar comprobaciones de mutación; se añadió después el caso de transición de modo. Lotes completos finales de disponibilidad/páginas/carga: 64/64; onboarding/recuperación/baja conservan 65/65 del lote anterior. Dos errores iniciales de tipado en las pruebas nuevas también se corrigieron. No hubo aborto nativo del runner.

TypeScript de aplicación (`tsc -b`) y pruebas (`tsc --project tsconfig.test.json`), ESLint completo y build Vite: **PASS**. Build con configuración efímera equivalente, `configFile:false`, `envDir:false`, plugin React y URL loopback sintética; no lee/modifica `.env`. Advertencia conservada: chunk Root 732.80 kB, superior a 500 kB. Sintaxis del arnés, JSON, enlaces y `git diff --check`: PASS.

## Revisión visual sintética

[Arnés reproducible](../scripts/verify-documentary-availability-visual.mjs): `node scripts/verify-documentary-availability-visual.mjs` desde Web, Chromium instalado; si el sandbox requiere autorización para loopback, solicitarla por el mecanismo normal. El arnés usa Vite 4239, configuración efímera, cuenta/textos sintéticos e intercepta HTTP con fixtures; impide conexiones externas y mutaciones. No inicia backend, PostgreSQL, Docker, Spaces o correo.

Resultado completo `1792428589474`: **PASS**, seis estados en 1280 y 320 px, 12 capturas, siete comprobaciones, cero overflow/errores de render/solicitudes inesperadas/mutaciones. Texto largo íntegro, scroll con teclado, foco visible, Space/Tab y tres casillas separadas. No se pulsa la aceptación. Se inspeccionaron y conservan cuatro capturas: [prueba a 320](documentary-availability-visual/local-320.png), [desactivado en escritorio](documentary-availability-visual/disabled-1280.png), [política ausente a 320](documentary-availability-visual/missing-320.png), [producción a 320](documentary-availability-visual/production-320.png).

Intentos incompletos conservados en artefactos locales excluidos: ruta de Chromium no resuelta por el sandbox, denegación de acceso a loopback y dos selectores del arnés (enlace duplicado y título de historial incorrecto). Se utilizó el Chromium ya instalado, se pasó por aprobación normal para loopback y se corrigieron los selectores contra la UI existente. No se atribuyen esos fallos a producto ni se acredita PASS antes del reporte final. El helper local de recopilación documental tuvo una llave faltante, corregida antes de generar el JSON; no ejecuta producto.

## Evidencia histórica y pendientes

Del [ensayo A–H](onboarding-production-integration-evidence.json), 17/27 huellas Web siguen iguales; diez cambian por estos avisos/bloqueos y sus pruebas. Las nueve fuentes protegidas de transporte, sesión, términos, comandos/recuperación y baja conservan la huella de entrada. Las dos fuentes backend que cambiaron desde A–H (`verification.service.ts`, `verification-terms.ts`) corresponden a validación editorial posterior documentada por backend; no se atribuyen al ensayo antiguo. Se registran ambas huellas, sin inventar una pareja de SHA probada conjuntamente.

No se repitieron A–H ni ensayos integrados de baja: no cambia su lógica de mutación, recuperación o eliminación. La cobertura nueva es **con fixtures**, no integración real de este contenido. Se requiere backend compatible con runtime, errores y rechazo editorial actuales antes de una futura publicación Web.

Pendientes reales: textos/URLs de privacidad y consentimientos finales aprobados, autorización jurídica de publicación, configuración y operación del destino, validación sintética autorizada de la combinación a desplegar. No se acreditan despliegue, activación ni aptitud productiva general. Constancias de alcance acreditado no garantizan eliminación total; limpieza V2 real en Spaces, tareas RESOLVED y Android/GPS no se resuelven ni se reejecutan aquí. Sin cambios backend, `.env`, QA, VM o políticas; sin commit, push, merge ni despliegue.

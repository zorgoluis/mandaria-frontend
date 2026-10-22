# Representación legal de flotilla: propuesta Web y handoff

**Propuesta documental Web, 19 de octubre de 2026. No implementada en Web ni habilitada aquí para recibir documentos.** Los nombres de pantallas, campos y acciones siguientes son diseño de interacción condicionado al contrato final. El backend cambia en paralelo: se distingue su código candidato observado del contrato final. No se crean rutas, endpoints, estados persistidos, fixtures ni permisos.

## 1. Base de trabajo, referencias e inventario actual

Checkout Web: `C:/Users/zorgl/Documents/mandaria-frontend`, rama **main**, HEAD `763b7f5397320b1872fbbfc32ffd37a91b5411ec`, inicialmente limpio e índice vacío. Es la rama encontrada al iniciar este encargo; no se cambió de rama ni se hizo integración. Otros worktrees conservados: `driver-verification-web/mandaria-frontend` en `56c7bad` separado de rama, `f1fe/mandaria-frontend` en `efa7c9a` (`codex/merge-main-qa`) y `mandaria-estela-qa/mandaria-frontend` en `cb08e8c` separado de rama. No se encontró AGENTS.md en este checkout ni en sus ascendientes. Se leyeron README, BITACORA y VERIFICATION y la continuidad documental pertinente.

### Qué autoridad tiene cada referencia

| Referencia leída | Versión real observada | Alcance de su autoridad |
| --- | --- | --- |
| [Diseño privado de representante](../../mandaria-backend/docs/FLEET-REPRESENTATIVE-PRIVATE-DOCUMENTS-DESIGN.md) | Diseño del 2026-10-19; archivo modificado 18:02:08 UTC; huella B1 abajo. | Canal técnico propuesto. Su declaración de no implementación corresponde a ese documento; después se observó código en curso. No acredita publicación ni activación. |
| [Revisión del propietario, apartado H](../../mandaria-backend/docs/DOCUMENTARY-TEXTS-OWNER-REVIEW-2026-10-19.md) | Actualización del 2026-10-19; archivo modificado 18:02:33 UTC; huella B2. | Procedimiento manual aprobado: identidad, facultades, vigencia, límites y revisión. El paquete sigue siendo borrador editorial; no autoriza publicar textos ni fija el contrato API. |
| [OpenAPI local](../../mandaria-backend/docs/openapi.json) | `info.version = 1.12.0`; huella B3, igual en ambas lecturas. | A las 18:18:32 UTC no contiene rutas `fleet-representatives`; CreateCaseDto sólo enumera DRIVER_IDENTITY/VEHICLE y UploadDto no incluye las categorías de representación. No está alineado con el código candidato posterior. |
| Controller, DTO, servicio, reglas, baja y esquema | Lectura inicial B4–B10 y corte posterior del 2026-10-19 **18:18:32 UTC**, con B11/B12 nuevos; anexo. | Seis fuentes cambiaron durante la tarea. La segunda lectura sí encuentra implementación candidata de vínculo, privacidad, expediente y acreditación FLEET. Comprobación **estática**, sin compilar, ejecutar ni atribuir publicación. |
| Informe de implementación del representante | No localizado en `docs` hasta el corte indicado; sí existe ya código candidato. | Pendiente de handoff final con OpenAPI, migración y evidencia concordantes. No se da por concluido el trabajo backend en curso. |
| Frontend y sus archivos enlazados abajo | Contenido del HEAD Web indicado, sin cambios locales previos. | Base reutilizable existente; no hay flujo Web específico de acreditación del representante. |

La consulta Git del backend no fue posible (`git -C ... rev-parse HEAD`: `Permission denied` del sandbox). No se atribuye un SHA backend ni condición de publicado a estos archivos; se identifica exactamente el contenido leído por SHA-256. No se consultó remoto ni entorno productivo. Los enlaces al backend requieren el checkout hermano `mandaria-backend`; no incorporan sus documentos a Web.

**Corte de análisis, no congelación del backend:** la tabla contractual usa la segunda lectura. Se conservan las huellas iniciales para explicar el cambio concurrente, no como descripción vigente del código nuevo. Cualquier modificación posterior al corte requiere contraste al implementar; no se persigue ni se declara estable un desarrollo externo en curso.

### Inventario Web y reutilización

| Archivo / área actual | Qué se reutilizaría | Adaptación necesaria; qué no se hereda |
| --- | --- | --- |
| [App.tsx](../src/app/App.tsx), [AdminLayout](../src/layouts/AdminLayout.tsx) | Sesión, navegación, errores de acceso y encuadre compartido. | Añadir en el futuro la entrada y la navegación autorizadas por el contrato. Las guardas actuales son generales; una sesión restringida sólo tiene los destinos de baja/servicio previstos hoy. No habilitan seguimiento de representación. |
| [ActivateAccount](../src/auth/ActivateAccount.tsx), [invitaciones](../src/invitations/service.ts), [tipos de invitación](../src/invitations/types.ts) | Activación personal, correo, presentación del vínculo y errores sin exponer tokens. | Invitación de cuenta, membresía OWNER/ADMIN y rol PROVIDER_ADMIN no acreditan representación. El vínculo preparatorio nuevo debe identificarse expresamente y no conceder asignación por inferencia. La recuperación de invitaciones actual no equivale a recuperación idempotente de nuevos comandos. |
| [ProviderScope](../src/logistics/components.tsx), [proveedores](../src/providers/service.ts) | Presentación de una flotilla autorizada y cambio de contexto. | El selector consulta proveedores/membresías operativas. No usar su lista, un `providerId` de URL o el rol como autorización para documentos. Se necesita la consulta específica del vínculo de representación. |
| [ui.tsx](../src/components/ui.tsx), [Feedback](../src/components/Feedback.tsx), [estilos](../src/index.css) | PageTitle, Field, Modal/Confirm, Loading, Empty, ErrorState, Badge, Table, paginación, feedback y estilos existentes. | Reutilización visual sin rediseño. Estados con texto además de color; no inventar componentes existentes llamados de otra manera. El progreso propuesto es orientación de lectura, no una nueva máquina de estados. |
| [common.tsx](../src/verification/common.tsx), [forms.tsx](../src/verification/forms.tsx) | Formulario con bloqueo de doble envío, errores, confirmación y manejo de selección posterior. | CaseForm y NewUnit contienen datos de conductor/unidad; no sirven como formulario de poderes. Diseñar campos nuevos sólo tras conocer DTO y permisos. |
| [evidence.tsx](../src/verification/evidence.tsx), [service.ts](../src/verification/service.ts) | Selección JPEG/PNG, PUT a destino emitido por backend, confirmación explícita, consulta privada, cancelación local y limpieza de object URLs. | Tipos, categorías, rutas y comprobaciones `canWrite` actuales son de conductor/unidad. Adaptarlos no es pasar un `providerId` ni reutilizar sus adjuntos. Orden de páginas y permisos de sustitución necesitan contrato. |
| [terms.tsx](../src/verification/terms.tsx), [terms-contract.ts](../src/verification/terms-contract.ts) | Texto íntegro, versión/hash, casillas separadas, desmarcadas y reinicio al cambiar el documento. | Separar privacidad personal previa a carga de aceptación contractual FLEET posterior. El formulario FLEET actual no constituye un mecanismo de acreditación. No usarlo para desbloquear archivos antes de comprobar facultades. |
| [pages.tsx](../src/verification/pages.tsx), [types.ts](../src/verification/types.ts) | Resumen, historial, motivo comunicable, revisión esperada y separación entre comprobante y estado vigente. | Sujetos actuales: DRIVER_IDENTITY y VEHICLE. Revisión SUPER_ADMIN actual es documental de conductor/unidad; no identifica límites de representación ni firma conjunta. |
| [pending.ts](../src/verification/pending.ts), [hooks.ts](../src/verification/hooks.ts) | Marcadores mínimos, consulta por clave, bloqueo de otra mutación e invalidación tras resultado. | Lista de operaciones, targets y autoridad actuales cerrada. No incorporar operaciones candidatas ni copiar indiscriminadamente la clasificación de errores 4xx; tras revocación pueden impedir consultar un efecto ya aplicado. |
| [availability.ts](../src/verification/availability.ts), [use-availability.ts](../src/verification/use-availability.ts) | Distinción entre LOCAL_TEST, desactivado, política ausente y error; aislamiento de consultas. | Requisitos actuales no acreditan acceso a poderes. `productionReady`, entorno productivo y capabilities de sesión no prueban facultades. |
| [sesión mínima](../src/auth/session.ts), [baja](../src/deletion/pages.tsx), [recibos de baja](../src/deletion/receipt.ts), [marcadores de baja](../src/deletion/pending.ts) | Separación de identidad restringida, seguimiento, estado actual y constancias parciales. | No reutilizar claves, endpoint privado, resultados CANCELLED ni facultades de baja como contrato de representación. Su alcance REPRESENTATIVE existente no acredita INE/poderes. |

Rutas Web que existen hoy: `/activate-account`, `/provider/verification`, `/admin/verification-cases`, `/verification/cases/:id`, `/verification/acceptances/:id`, `/admin/verification-publications`, `/privacy/deletion` y `/privacy/deletion-access`. **Ninguna es hoy una ruta de alta de poderes.** A–F son identificadores de pantallas en este documento, no URLs propuestas como disponibles.

## 2. Recorrido y wireframes textuales

Secuencia propuesta: acceso personal y vínculo concreto → **A Entrada** → **B Preparación** (privacidad personal antes de archivos) → **C Resumen/envío y seguimiento** → **D Revisión SUPER_ADMIN** → **E Aceptación FLEET**. **F Sustitución/baja** conserva seguimiento autorizado y puede iniciar un nuevo recorrido independiente. Volver a una pantalla no adelanta estados ni repite comandos.

Se mantienen separadas cuatro decisiones: información/consentimiento personal, acreditación de representación, aceptación FLEET y admisión operativa. La aprobación de conductores/unidades es otra decisión separada. No se pide aceptar por la flotilla antes de recibir la evidencia necesaria para acreditar facultades.

Todos los botones de los wireframes son candidatos. En la implementación futura sólo aparecerán habilitados si la respuesta vigente permite esa acción para esa cuenta y vínculo. Si falta el contrato, no se construye un botón que envíe a una ruta supuesta.

### A. Entrada «Representación legal»

```text
Flotilla [nombre/código autorizado]
REPRESENTACIÓN LEGAL
Persona representada: [nombre de titular / razón social]
Tu cuenta: [identidad autenticada] · Vínculo: [descripción autorizada]

[Qué falta, informado por el servidor]
[Continuar mi expediente]                 ← acción principal cuando proceda
Ver seguimiento / Volver a la flotilla    ← navegación secundaria autorizada
```

**Contenido:** distinguir nombre comercial de la flotilla y persona representada. Mostrar la cuenta solicitante y el alcance concreto; no presentar una cuenta invitada como representante acreditado. El nombre/ID de otra flotilla introducido en la URL nunca amplía acceso. No precargar documentos ni expedientes del anterior representante.

**Variantes:** solicitante vinculado ve sólo su preparación; representante acreditado ve el resultado vigente y la aceptación pendiente si procede; coordinador no recibe expediente, INE, poderes, motivos personales o botones contractuales. Si backend autoriza un resumen operativo mínimo para coordinadores, mostrar únicamente ese resumen. Una misma persona con varias funciones debe tener cada autorización explícita.

**Sin vínculo:** «Tu cuenta no tiene una solicitud de representación disponible. Solicita a la administración que revise el vínculo con la flotilla.» Sin formulario para autoasignarse facultades, sin aceptar un providerId arbitrario y sin enlace de carga. Orientación mediante el canal ya autorizado, sin adjuntar archivos por correo/WhatsApp. Invitación vencida o revocada no se interpreta como rechazo documental; el mensaje específico dependerá de su contrato.

**Acceso:** inicio de sesión y correo confirmado cuando corresponda; regreso a un destino interno autorizado, nunca a una URL arbitraria. Una invitación nueva no atribuye facultades ni permisos operativos. Si el contrato no permite descubrir vínculos preparatorios para una cuenta sin membresía operativa, A queda bloqueada; no se concede una membresía falsa para sortearlo.

### B. Preparación del expediente

```text
Representación legal · [flotilla/persona representada]
PREPARAR EXPEDIENTE
1. Quién comparece   2. Privacidad personal   3. Documentos

Actuación: [titular persona física por derecho propio / representación]
Persona representada: [dato autorizado]
Solicitante: [cuenta personal; datos mínimos permitidos]

Aviso personal [texto completo, versión y ámbito del solicitante]
[ ] Reconocimiento del aviso según texto aprobado
[ ] Consentimiento específico [cada finalidad aplicable, por separado]
[Confirmar actuación personal de privacidad]  ← antes de habilitar archivos

Identidad: INE frente | INE reverso
Facultades: [nombramiento/acta/escritura o poder; según caso]
Página [n] [tipo/orden] [estado de transferencia y validación]
[Seleccionar imagen] [Cargar página seleccionada]
[Continuar al resumen]                       ← cuando esté autorizado
```

**Campos candidatos, sin nombres de DTO inventados:** tipo de persona representada y actuación; nombre del titular/razón social y nombre del solicitante; identificación del documento de facultades sólo en la medida mínima que permita backend; categoría y orden de cada página. Vínculo y flotilla deben proceder de contexto autorizado. Un dato incorrecto de la persona representada requiere corregir el vínculo mediante la acción permitida, no elegir otra flotilla dentro de una carga. No añadir CURP, RFC, número de INE, domicilio, teléfono, licencia o fotografía nueva por conveniencia del formulario.

La segunda lectura de [representative-rules.ts](../../mandaria-backend/src/verification/representative-rules.ts) concreta candidatos reales: `fullName`, `representedName`, `capacity` (SELF/APPOINTMENT/POWER), `representedPersonType` (NATURAL_PERSON/LEGAL_PERSON), `declarationCurrent`, `identityValidUntil`, `authorityValidFrom`, `authorityValidUntil` opcional, `limits`, `jointSignatureRequired` y `authorityPages` (IDs ordenados, hasta ocho). No se implementa ese esquema aquí. Para SELF, exige la misma persona física, sin firma conjunta ni páginas de poderes. Confirmar con el handoff final la captura de fechas en SELF, la procedencia de nombres y el texto/versionado de la declaración; un booleano no inventa un texto jurídico aprobado.

**Titular persona física:** presentar «Actúas por derecho propio» cuando esté declarado y validado por el contrato. No exigir razón social, cargo societario ni poder a quien acredita su propia identidad. La documentación adicional aplicable a titularidad se definirá con backend; Web no la inventa. Si otra persona comparece por el titular, se revisan facultades suficientes.

**Privacidad:** el aviso y catálogo personal aplicables deben poder consultarse y registrarse antes de crear cualquier intención de carga. El texto exacto será aprobado y servido por el mecanismo final; no se copia el borrador del repositorio. Casillas desmarcadas; reconocimiento del aviso no equivale a consentir todas las finalidades. Confirmar sólo tras respuesta recuperada o recibida. Si el catálogo/versionado cambia, volver a consultar y requerir acción sobre el vigente. La aceptación personal DRIVER tampoco sustituye esta actuación por el solo hecho de usar la misma cuenta.

El código candidato separa `REPRESENTATIVE_PRIVACY` y devuelve `acceptsFleetContract:false`; toma aviso y consentimientos de la publicación FLEET aplicable y comprueba versión/hash. Esto evita exigir aceptación contractual previa al expediente. Confirmar que las finalidades de esa fuente son las aprobadas para recibir evidencia personal; no se da aprobación jurídica por reutilizar una publicación.

**Documentos:** INE vigente; páginas suficientes de nombramiento/acta/escritura **o** poder. No pedir otro poder si el nombramiento basta. Orden legible mediante número de página y botones «Subir página»/«Bajar página» con alternativa de teclado; guardar orden sólo si existe mutación autorizada y recuperable. No asignar orden durable a partir de hora de llegada o nombre del archivo. Conservar contexto, límites y firmas sin exigir copias indiscriminadas de terceros.

**Estados de presentación, no enums nuevos:** borrador editable, archivo seleccionado sin enviar, transferencia en curso, confirmación/validación pendiente, archivo validado por servidor o error. «Carga confirmada» significa archivo recibido/validado según respuesta, **no representación acreditada**. Los valores persistidos, categorías y transiciones deben mapear los del contrato final.

**Límites propuestos a confirmar:** JPEG/PNG, 10 MiB por archivo, 20 millones de píxeles y diez archivos totales incluyendo ambos lados de INE. No PDF, OCR, biometría ni promesa de antimalware. «Las páginas indispensables no caben en este expediente. Solicita orientación antes de continuar; no omitas páginas ni reduzcas su legibilidad.» Si sólo se dispone de PDF, indicar formato no admitido y orientar; no prometer conversión con conservación de firmas ni recibirlo por otro canal improvisado. Retirar una referencia no se presenta como borrado del almacenamiento ni permite eludir cuotas.

### C. Resumen, envío y seguimiento

```text
REVISAR ANTES DE ENVIAR
Flotilla · Persona representada · Cuenta solicitante
Datos declarados [resumen mínimo]
Documentos [categoría, página, estado confirmado; sin URLs privadas]
Pendientes [requisitos comunicables del servidor]

Declaración de vigencia [texto final aprobado; variante según actuación]
[ ] He realizado la declaración aplicable                 ← sin preselección
[Enviar a revisión]

Diálogo: [resumen del conjunto y revisión consultada]
Enviar no acredita facultades ni acepta términos FLEET.
[Confirmar envío] [Volver a revisar]
```

La declaración cubre la vigencia de las facultades y comunicar sustitución/revocación/limitación según el texto aprobado; no sustituye el documento ni prueba ausencia de revocación. La variante del titular por derecho propio no le hace declarar un poder inexistente. No generar un texto legal definitivo en Web. Backend debe definir cómo se conserva la declaración y a qué revisión/conjunto queda ligada.

Sólo incluir adjuntos confirmados y vigentes; una transferencia o PUT exitoso no basta para enviar. El envío requiere revisión esperada y confirmación explícita. Mientras se resuelve, bloquear duplicados. Congelar en lectura el material presentado según contrato; no editar una revisión ya decidida. No solicitar de nuevo archivos confirmados por una respuesta perdida.

**Seguimiento:** encabezado «Seguimiento de representación», folio autorizado, fecha/revisión, estado actual del servidor, resultado/motivo público y próxima acción permitida. Historial y comprobantes en sección aparte. Mensajes candidatos: «La documentación está pendiente de revisión»; «Revisa la aclaración indicada antes de continuar»; «No se acreditaron facultades para este alcance»; «Representación acreditada para el alcance indicado». Mostrar cada uno sólo cuando la respuesta lo sostenga. No crear estados persistidos llamados «aclaración», «firma conjunta» o «acreditado» por deducción del cliente.

Si hay omisión o duda, mostrar la aclaración comunicable y la acción que backend permita: responder, completar un borrador autorizado o preparar una nueva revisión. **No transformar un REJECTED de conductor en un ciclo de aclaración de representación.** Firma conjunta o facultades insuficientes: «Se necesita resolver el alcance o la firma conjunta antes de aceptar por la flotilla». Sin aprobación ficticia ni aceptación individual; si no existe una acción segura de aclaración, sólo seguimiento/orientación, registrando el bloqueo contractual.

### D. Revisión SUPER_ADMIN

```text
REVISAR REPRESENTACIÓN · [folio / revisión]
Flotilla y persona representada | Solicitante y actuación declarada

IDENTIDAD          INE frente/reverso · consulta privada explícita
FACULTADES         nombramiento/poder · páginas ordenadas
LÍMITES            alcance, vigencia, firma individual/conjunta, dudas
DECLARACIÓN        versión/conjunto declarado · fecha confirmada

[Resultado permitido por servidor]
Motivo público [comunicable al solicitante]
Nota interna [sólo si el contrato separa y autoriza este dato]
Límites / próxima revisión [sólo campos admitidos]
[Revisar decisión] → confirmación con revisión esperada
```

Bandeja y detalle separados de identidad de conductor y unidad; filtros sólo por atributos expuestos y permitidos. La lectura de cada imagen pasa por backend autenticado y deja la auditoría que éste implemente. No cargar de antemano todos los archivos de todos los expedientes ni ofrecer descargas públicas.

Revisar identidad, persona representada, suficiencia, límites y vigencia de la actuación, y firmas requeridas. No autocompletar checklist ni aprobar por el número de archivos. Un nombramiento suficiente no genera requisito de poder adicional. La UI no certifica autenticidad, vigencia jurídica o suficiencia por OCR, hashes o extensión.

Decisión motivada y explícita con revisión esperada; motivo público separado de información interna. Resultados, campos obligatorios, próxima revisión y acciones de aclaración sólo según contrato. Si firma conjunta no está soportada, no ofrecer un atajo de aprobación individual. La acreditación **no** aprueba conductor/unidad, publica o acepta términos, activa admisión ni concede permisos de asignación automáticamente.

### E. Aceptación FLEET por representante acreditado

```text
ACEPTAR POR LA FLOTILLA
Cuenta firmante [autenticada] · Flotilla [concreta]
Persona representada y alcance vigente [autorizado]

Términos FLEET [texto completo, versión/hash del servidor]
Aviso de privacidad [texto completo y versión correspondiente]
Consentimientos específicos [texto de cada finalidad]
[ ] Aceptación contractual expresa
[ ] Reconocimiento del aviso, separado
[ ] Cada consentimiento aplicable, separado
[Aceptar por esta flotilla]

Comprobante histórico [sólo después de confirmarlo/recuperarlo]
Estado vigente de representación [consulta independiente]
```

Acceso condicionado a acreditación vigente suficiente para esa cuenta/flotilla, no a PROVIDER_ADMIN, OWNER, membresía o `productionApplicable:true`. No permitir que SUPER_ADMIN o un coordinador marquen casillas por el representante. Cada conductor conserva su aceptación personal independiente.

Revalidar estado/versiones y autoridad al enviar y en backend. Si requiere firma conjunta, no presentar esta aceptación individual como suficiente; el mecanismo conjunto queda pendiente de contrato y el botón individual permanece bloqueado. No añadir otro firmante como texto libre para aparentar cumplimiento.

La actuación personal de privacidad anterior a archivos y la aceptación contractual posterior tienen comprobantes/finalidades distintos. Backend debe decidir si se reutiliza una evidencia personal todavía válida y cómo se acredita; Web no copia consentimientos ni casillas automáticamente entre etapas, cuentas, flotillas o versiones. Recibos antiguos no cambian el estado vigente y no se reescriben. Cambiar la versión exige leerla y una nueva acción conforme al contrato.

### F. Sustitución, baja y restricciones

```text
REPRESENTACIÓN Y SEGUIMIENTO
Vínculo vigente [descripción autorizada] · Restricciones actuales [resumen]
Historial propio / comprobantes permitidos

[Acción de sustitución o revocación]        ← sólo con facultad específica
Efecto informado por servidor [alcance, sin inferencias]
[Confirmación explícita, si existe contrato recuperable]

Seguimiento mínimo [sin imágenes ni documentos del anterior representante]
Servicios comprometidos [navegación operativa ya autorizada, por separado]
```

El sustituto inicia su propia acreditación y aceptación; no hereda imágenes, poderes o marcadores privados. Tampoco se trasladan documentos a otra flotilla. El anterior representante conserva exclusivamente el canal de derechos/recibos/recuperación permitido por contrato; la pérdida del vínculo no justifica mostrarle archivos restringidos ni borrar automáticamente todo su historial.

La UI no cancela servicios comprometidos, modifica créditos, bloquea asignaciones, levanta restricciones ni activa admisión por inferencia del cambio. Usa las restricciones y acciones vigentes comunicadas por servidor. Baja del representante, de la flotilla y de la cuenta personal son alcances distintos; no se borran documentos ajenos. Estado actual e incidencias posteriores permanecen separados del cierre o constancia histórica. No se promete eliminación total, inmediata ni de copias desconocidas.

En la primera lectura, `REPLACE_REPRESENTATIVE` en baja modificaba membresía. En el corte posterior crea un vínculo documental para el sustituto sin conceder membresía ni acceso al anterior; conserva sus precondiciones administrativas y exige al sustituto PROVIDER_ADMIN con correo confirmado. Sigue sin acreditar facultades. No enlazar esa acción como «aprobar nuevo representante». Confirmar la diferencia de roles con la vinculación directa candidata, que admite solicitantes activos con correo confirmado distintos de SUPER_ADMIN. Una revocación/sustitución sin recuperación suficiente queda bloqueada para implementación aunque su wireframe esté diseñado.

## 3. Matriz de actores, datos y acciones

Matriz de **diseño aprobado/pendiente de autorización técnica**, no de permisos ya expuestos. Cada lectura y mutación necesita comprobación backend actual; esconder un botón no es control de acceso.

| Actor/contexto | Datos visibles | Acciones propuestas condicionadas | Excluido |
| --- | --- | --- | --- |
| Sin sesión / cuenta sin vínculo | Orientación y acceso; ningún expediente o dato de otra flotilla. | Autenticarse o activar invitación válida por el flujo existente; solicitar revisión del vínculo. | Cargar, elegir providerId para entrar, aceptar FLEET o consultar imágenes. |
| Solicitante con vínculo preparatorio vigente | Su cuenta, persona representada y expediente propio autorizado, aviso/consentimientos y motivos públicos. | Preparar, declarar, cargar y enviar si lo autoriza el contrato; consultar/recuperar sus intentos. | Autoacreditación, operación logística por la invitación, expedientes de otros. |
| Representante acreditado vigente | Su acreditación, límites y textos aplicables; historial propio permitido. | Aceptar FLEET dentro del alcance y de la regla de firmas; seguimiento y acciones explícitas. | Aceptar por conductores, publicar políticas o activar admisión. |
| Titular persona física por derecho propio | Igual protección de su expediente propio, identificado sin sociedad ficticia. | Acreditar identidad/actuación según contrato y aceptar sólo cuando esté autorizado. | Exigirle un poder de sí mismo o atribuir automáticamente representación de terceros. |
| Coordinador operativo, aunque PROVIDER_ADMIN/OWNER/ADMIN | Sólo información operativa mínima que backend autorice. | Asignaciones/servicios según sus permisos existentes, fuera de este flujo. | INE, poderes, causas personales, preparar/aceptar por otro o revisar facultades. |
| SUPER_ADMIN autorizado para revisar | Datos/evidencias necesarios y notas internas autorizadas del caso. | Abrir vínculo si el contrato lo permite; consultar evidencia y decidir motivadamente. | Firmar aceptación por el solicitante, aprobar con una casilla por todos o conceder firmas conjuntas ficticias. |
| Sustituto | Su propio vínculo y expediente; contexto mínimo de la flotilla. | Nuevo recorrido de acreditación y aceptación. | Imágenes/identificadores documentales del anterior representante. |
| Representante revocado / sesión restringida | Sólo seguimiento/recibos mínimos expresamente autorizados. | Consulta o recuperación por el canal contractual; cierre sólo autorizado. | Nuevas cargas/confirmaciones/lecturas privadas o autoridad contractual por recibo antiguo. |
| Conductores, clientes, otras flotillas | Ningún expediente de representación. | Sus recorridos propios independientes. | Reutilizar sus documentos para poderes o acceder por IDs conocidos. |

Responsable/suplente humano de atención no recibe acceso técnico por su designación; necesita la facultad específica del sistema. No hay cuentas compartidas.

## 4. Tabla de contratos y bloqueos de implementación

Prefijo observado: `/api/v1`. «Comprobado» significa inspección estática del archivo indicado, **no ejecución**. Las rutas nuevas siguientes se transcriben del controller candidato, no se inventan ni se presentan como publicadas. OpenAPI sigue describiendo la base anterior al corte. No hay payload JSON ni contrato simulado en este handoff.

| Área | Comprobado por lectura / base existente | Candidato observado en segunda lectura | Pendiente / bloqueo para implementar |
| --- | --- | --- | --- |
| Acceso y vínculo | Activación e invitaciones existentes son de cuenta/membresía, no poderes. | `POST /admin/fleet-representatives` y `POST /admin/fleet-representatives/{id}/revoke`, sólo SUPER_ADMIN; `GET /fleet-representatives/mine`. Vinculación por userId/providerId sin crear membresía; revocación con expectedVersion/motivo. | Confirmar contrato final, identidad visible de persona representada/flotilla, roles e invitación de cuenta nueva. El listado devuelve IDs, LINKED/REVOKED, revisión, restricción y approvedCaseId; esto no basta para deducir facultad vigente. |
| Requisitos/modo | `GET /verification-requirements`; modo no prueba facultades. | Agrega categorías/checklist de representante, privacidad previa y acreditación antes de FLEET. | Alinear OpenAPI y respuestas; permisos actuales por acción, sin inferirlos de productionReady o approvedCaseId. |
| Privacidad personal | DRIVER/FLEET y recibos documentales existentes. | `GET /fleet-representatives/{id}/privacy`, `POST /fleet-representatives/{id}/privacy/acknowledge`; ámbito REPRESENTATIVE_PRIVACY, versión/hash, consentimientos y acceptsFleetContract:false. Usa publicación FLEET aplicable. | Fuente aprobada para esas finalidades; comportamiento si cambia aviso/catálogo; recuperación postrevocación. No dar por aceptados todos los consentimientos al consultar el aviso. |
| Expediente | OpenAPI aún limita sujetos a DRIVER_IDENTITY/VEHICLE. | DTO/código/esquema agregan REPRESENTATIVE y vínculo propio; `POST /fleet-representatives/{id}/cases`. Reglas reales candidatas descritas en B; exige privacidad personal, no aceptación FLEET. | Contrato concordante, estados/transiciones definitivos, texto declarativo, campos SELF y corrección permitida. No usar conductor/unidad como almacenamiento provisional. |
| Archivos | Transporte JPEG/PNG, 10 MiB, 20M píxeles, diez adjuntos y lectura privada existentes. | Reglas/DTO agregan REPRESENTATIVE_INE_FRONT, REPRESENTATIVE_INE_BACK y REPRESENTATION_AUTHORITY_PAGE. Dos lados de INE y authorityPages con hasta ocho IDs; separación de categorías y prefijo privado de representante. | Confirmar límites finales, orden/update recuperable, retiro/cuota y concurrencia de revocación con PUT/completado. OpenAPI no enumera aún esas categorías. |
| Envío y revisión | expectedVersion y operaciones de caso existentes. | Misma infraestructura con validación propia; checklist de identidad/facultades/límites; motivo público obligatorio; rechaza aprobación con firma conjunta o facultad futura; vigencia limitada por INE/facultades. | Aclaraciones/revisiones permitidas, próxima revisión y evidencia de permisos/carreras. Sin crear un enum de «aclaración» o prometer firma múltiple. |
| Aceptación FLEET | `POST /verification-terms/accept`, recibo `GET /verification-terms/acceptances/{id}`. | `fleetAuthority` exige vínculo no revocado, caso APPROVED vigente del entorno, snapshot material actual y firma individual suficiente. Guarda representationCaseId y distingue ACCREDITED_AT_ACCEPTANCE/HISTORICAL_UNACCREDITED. | Alinear respuestas y exponer autoridad vigente sin deducirla del historial. `termsAuthority` aún permite lectura por membresía; eso no autoriza aceptar. Confirmar transición y efecto operativo por separado. |
| Recuperación | `GET /verification-command-attempts/{key}` y cierre explícito; ABSENT/APPLIED/CLOSED_NO_EFFECTS. | Operaciones LINK_REPRESENTATIVE (target solicitante), REVOKE_REPRESENTATIVE y REPRESENTATIVE_PRIVACY (target vínculo); CREATE_CASE resuelve representante. Operaciones de caso reutilizan target caso. | Catálogo definitivo, semántica de recibo depurado/no disponible y acceso mínimo tras revocación; hay un bloqueo concreto abajo. No transportar códigos de baja por analogía. |
| Baja/sustitución | Alcance REPRESENTATIVE y REPLACE_REPRESENTATIVE anteriores. | Baja incorpora sujetos propios, identidad/autoridad en inventario y crea vínculo del sustituto sin membresía; no acredita ni hereda imágenes. | Acreditar inventario completo, retención/minimización/restauración y canal mínimo; precisar la diferencia de roles con vinculación directa. Código observado no equivale a ensayo ni limpieza real. |
| Seguimiento restringido | projection=session, canal y constancias de baja ya existentes. | No se acreditó un canal mínimo específico de representación tras revocación. | **Bloquea F y recuperación afectada:** definir identidad, consulta de intentos/recibos y datos mínimos permitidos sin reabrir acceso a documentos. |

**Escenario contractual pendiente comprobable en código candidato:** `attempt()` comprueba `attemptAuthority()` antes de leer el comando persistido. REPRESENTATIVE_PRIVACY y CREATE_CASE de representante vuelven a autorizar el vínculo; `authorize()` rechaza al titular con vínculo revocado. La consulta del recibo personal también exige ese vínculo. Por tanto, una actuación aplicada con respuesta perdida y revocación antes del GET no tiene recuperación mínima acreditada por estas fuentes. FLEET puede conservar lectura por membresía en algunos casos, pero sin vínculo ni membresía tampoco demuestra recuperación. Se necesita una respuesta autorizada que distinga efecto histórico de acceso actual, sin documentos privados; no se declara un fallo ejecutado ni se modifica backend. Los comandos administrativos usan autoridad SUPER_ADMIN y deben comprobarse por separado.

El DTO candidato anuncia `canAcceptFleet` opcional, pero el listado inspeccionado no lo devuelve: `approvedCaseId` por sí solo no comprueba todas las condiciones de `fleetAuthority`. Confirmar la respuesta final para E. El informe final debe resolver estas diferencias y aportar estados, respuestas, migración y pruebas antes de convertir propuestas en cliente ejecutable.

## 5. Carga, errores, concurrencia y recuperación

### Patrón de estado de la interfaz

Carga inicial: indicador de consulta, sin mostrar expediente previo de otra cuenta/flotilla. Vacío confirmado: orientación específica; error/red/401/403 no equivale a vacío, revocación ni modo LOCAL_TEST. Error conocido: texto comunicable, relación con campo cuando exista y acción permitida. Error desconocido: «No se pudo confirmar la operación. Conserva el intento y consulta su estado» para una mutación incierta; no mostrar trazas, configuración ni datos privados. Un resultado de otra revisión/cuenta/vínculo no reemplaza la fotografía reciente.

### Escenarios que el contrato debe soportar

| Situación | Interacción y preservación propuestas | Dependencia contractual |
| --- | --- | --- |
| Respuesta perdida después de commit | Guardar marcador mínimo antes de enviar; mostrar «Resultado pendiente de confirmar»; consultar por GET con la misma clave. No repetir POST, bytes o decisión con clave nueva. | Recibo durable de **cada** mutación nueva, incluido vínculo, privacidad, orden, envío, decisión y revocación cuando existan. |
| Recarga con marcador pendiente | Identificar el intento de la cuenta iniciadora; bloquear otra mutación incompatible; «Consultar intento». No reconstruir formulario/documentos desde almacenamiento. | Operación/target admitidos y autoridad de consulta. No borrar marcador porque no cargó la pantalla. |
| Recibo aplicado | Mostrar resultado histórico identificado; consultar aparte el expediente, vínculo y restricciones vigentes. Un recibo de aprobación no autoriza carga/aceptación tras revocación. | DTO del recibo y consulta actual que permitan reconciliar sin pérdida de autoridad mínima. |
| Ausente, depurado o no disponible | Mantener incertidumbre. 404, ABSENT o un error genérico no prueban que no hubo efectos ni que puedan repetirse. No traducir automáticamente un código de baja al nuevo dominio. | Respuesta exacta y política de conservación; mecanismo seguro de comprobación o cierre si existe. |
| Cierre explícito | Sólo ofrecerlo cuando backend demuestre que puede cerrarse sin efectos tardíos; confirmación con clave original. No es retirar expediente ni borrar archivos. | Cierre atómico y operaciones autorizadas del nuevo dominio. Sin contrato, queda bloqueado. |
| Revisión obsoleta / dos pestañas | No reenviar sobre revisión nueva; conservar captura sólo en memoria mientras siga autorizada, consultar y pedir revisión humana de diferencias. | Versión esperada y error inequívoco; reglas de congelación/revisión. |
| Vínculo revocado con respuesta perdida | Parar nuevas acciones, retirar datos privados de pantalla/cache y mantener sólo referencia mínima del intento. No dar por rechazado ni olvidar un comando únicamente por 403/404 posterior. | Consulta mínima postrevocación; el código candidato revisa el vínculo antes de recuperar privacidad/creación del caso, como se detalla en §4. |
| Cambio de cuenta/flotilla | Cancelar consultas locales, vaciar previews/campos privados y no renderizar respuestas tardías. Mantener marcador aislado del iniciador; no revelar detalles a la nueva cuenta ni trasladar consentimiento. | Identidad estable del vínculo/target y consultas por actor/ámbito. |
| Carga A en curso, selección B posterior | El envío toma A; al terminar sólo limpia esa selección si sigue siendo la misma. Conservar B seleccionada y anunciar que no se envió. No subir B automáticamente. | Adaptación del patrón W-01 y cuota/revisión posterior a A. |
| PUT finalizado, confirmación incierta | No llamar al archivo «validado» por PUT; recuperar intención/completado y consultar adjunto. No volver a emitir un PUT por un error de confirmación. | IDs, vencimiento, estados y recuperación propios del adjunto. |
| Baja/revocación durante PUT | Cancelar transporte local cuando corresponda; no prometer cancelación remota o revocación instantánea de URL ya emitida. Conservar referencia de intento; explicar que no está presentado ni aprobado. | Revalidación de vínculo, permisos durables e inventario/reconciliación backend. |
| Baja/revocación durante confirmación o lectura | No reabrir preview con respuesta tardía; revocar object URL local y limpiar cache privada. Resolver sólo por consulta autorizada; no forzar login operativo ni nueva carga. | Revalidación al completar/acceder y canal mínimo posterior. |
| Falta de privacidad o cambio de versión | Deshabilitar nuevas cargas; conservar historial autorizado, consultar texto vigente y exigir acción expresa. | Versionado y resultado recuperable de la actuación personal; ninguna aceptación contractual anticipada. |
| Firma conjunta / duda pendiente | Mostrar bloqueo específico y próxima acción autorizada; no fabricar una segunda firma, aprobación o aceptación suficiente. | Modelo de firmas/alcance y resolución de dudas. |

### Marcadores, caché y archivos

El marcador actual de verificación permite exclusivamente `actor`, `key`, `operation`, `target`, en un almacenamiento separado por origen API; las operaciones y targets están validados. **Es un antecedente, no el formato final aprobado para representación.** Se propone conservar sólo esos conceptos mínimos si el contrato nuevo permite recuperar unívocamente la cuenta, vínculo y comando a partir de ellos. Si no puede, backend debe definir la referencia opaca adicional mínima y su autorización antes de implementar. No escribir hoy un nuevo formato ni reutilizar el namespace de baja.

Prohibido persistir formularios completos, nombres de archivo, textos de documentos, imágenes, números de identidad, contraseñas, tokens o URLs firmadas en localStorage, analytics, logs o marcadores. Las claves de idempotencia se tratan como referencias de recuperación, no como credenciales ni facultades. Preview temporal en memoria con revocación de object URL al cerrar, cambiar contexto o perder autorización; no cache persistente ni listado público. Lectura privada por backend; el POST de acceso actual devuelve bytes, no un enlace público GET a Spaces.

Consultas futuras separadas por actor, vínculo/flotilla autorizada, expediente, revisión y versión de texto según contrato. Invalidar sólo los contextos afectados por un resultado confirmado; no usar un recibo histórico como nueva entrada de estado vigente. Mantener el bloqueo del intento si refrescar o comprobar el estado mínimo falla. La lógica logística y los recibos administrativos de baja no aportan recuperación de representación por analogía.

## 6. Aceptaciones antiguas y continuidad de servicios

Las aceptaciones FLEET almacenadas prueban una actuación de esa cuenta/ámbito/versión según el contrato anterior; **no prueban facultades jurídicas actuales**. No eliminarlas, reescribirlas, atribuirlas al sustituto ni etiquetarlas como acreditación retroactiva. Presentar «Comprobante histórico de aceptación» y, por separado, el estado vigente de representación cuando el nuevo contrato lo proporcione.

El código candidato ya distingue ACCREDITED_AT_ACCEPTANCE de HISTORICAL_UNACCREDITED por la referencia del recibo; ninguna de las dos etiquetas prueba facultades vigentes. Backend debe finalizar la transición: cuentas obligadas a acreditar, revisión aplicable, necesidad de nueva aceptación y efecto concreto sobre acciones futuras. Hasta entonces no imponer desde Web un corte nuevo a servicios, créditos o asignaciones existentes. Tampoco presentar una cuenta como facultada por conservar acceso operativo. Un representante aprobado debe aceptar explícitamente; publicar textos no acepta por nadie ni activa admisión.

Historia LOCAL_TEST se identifica como tal y no se transforma automáticamente en acreditación productiva. Ni documentos ni consentimientos se copian entre entornos o representantes. Conservar historia autorizada, pedir nuevo recorrido sólo como indique el contrato y mantener servicio comprometido/restricciones según las respuestas actuales. Restricción, incidencia y cierre/constancia histórica son dimensiones diferentes.

## 7. Accesibilidad y móvil de 320 px — especificación futura

- Un h1 por pantalla, contexto de cuenta/flotilla legible y estructura de secciones consistente. Pasos nombrados y etapa actual textual; no depender sólo de color o iconos.
- Todos los controles alcanzables por teclado y foco visible. Orden de páginas con botones accesibles, no sólo arrastre; anunciar número/posición después del cambio confirmado. No mover foco por cada actualización de progreso.
- Errores asociados al campo y resumen enfocable al fallar envío; distinguir error local de resultado remoto incierto. Loading/progreso en región de estado sin repetir datos sensibles; errores bloqueantes anunciados una vez. No anunciar nombres/documentos privados en mensajes globales.
- Dialogo con título y descripción, foco inicial razonable, fondo inerte, recorrido de foco contenido y retorno al invocador. Cerrar el diálogo no cancela una mutación ya enviada ni borra su marcador. Evitar confirmación accidental por Enter durante edición.
- Avisos y textos largos íntegros, encabezados, versión y ámbito; región desplazable accesible con teclado y foco visible. No exigir desplazar hasta el final como prueba de lectura. Casillas con etiqueta completa y finalidad separada.
- A 320 px: una columna, acciones con texto envolvente y sin superposición; lista de páginas legible, controles de orden y estados sin scroll horizontal. Tablas administrativas con presentación equivalente que conserve asociaciones de encabezados. Vista privada con zoom/consulta accesible sin enlazar Spaces públicamente.
- Archivo seleccionado B se anuncia como pendiente tras terminar A. Mantener accesible cancelar transferencia local sin prometer deshacer servidor. Alternativa textual de contexto de imagen (categoría/página) sin OCR ni volcar contenido sensible en `alt`.

Estas son condiciones de aceptación del diseño, **no resultados visuales comprobados aquí**. No se abrió navegador ni se produjeron mockups ejecutables.

## 8. Casos de prueba futuros — no ejecutados

| Grupo | Caso y resultado esperado a implementar cuando haya contrato |
| --- | --- |
| Acceso | Solicitante vinculado entra sólo a su expediente; providerId alterado, otra flotilla, coordinador PROVIDER_ADMIN/OWNER/ADMIN, conductor y sustituto no acceden a documentos ajenos. |
| Invitación | Vínculo válido/vencido/revocado, cuenta nueva/existente y correo pendiente; activación no acredita facultades ni concede operación. Cambio de cuenta no conserva datos privados. |
| Persona representada | Titular persona física por sí mismo, representación de persona física y sociedad; sin sociedad/poder inventados, sin datos mínimos omitidos del contrato. |
| Privacidad previa | Aviso ausente, vigente/cambiado, consentimientos separados y desmarcados; carga bloqueada hasta confirmar/recuperar la actuación personal, sin aceptación FLEET anticipada. |
| Evidencia | JPEG/PNG reales sintéticos, límites de bytes/píxeles/cuota, MIME falso, inválido/PDF, orden de páginas, dos lados INE, nombramiento suficiente sin poder adicional y límite sin omitir páginas. |
| Carga/concurrencia | W-01 A/B, cancelación local, expiración de URL, respuesta perdida en creación/completado, revocación/baja concurrente, preview tardío y cambio de contexto; sin reenvío automático ni pérdida de B. |
| Envío | Sólo material confirmado, declaración aplicable desmarcada, resumen exacto, doble clic, revisión obsoleta y congelación; una carga no acredita representación. |
| Revisión | SUPER_ADMIN autorizado, lectura privada, identidad/facultades/límites separados, motivo público/interno, firma conjunta/duda sin aprobación individual, resultado permitido y recuperación de decisión. |
| FLEET | Sólo acreditado vigente y suficiente acepta por cuenta/flotilla/versiones exactas; coordinador y SUPER_ADMIN no aceptan por él. Aprobar no acepta ni activa; representante no acepta términos DRIVER de terceros. |
| Recibos | Commit seguido de respuesta perdida para cada mutación; GET original con un solo efecto, recarga, ausencia/depuración, resultado histórico distinto del estado actual, cierre permitido/no permitido y revocación posterior. |
| Transición/baja | Antiguas aceptaciones intactas, sustituto sin imágenes heredadas, LOCAL_TEST sin promoción, seguimiento mínimo y servicios/restricciones existentes sin cambios inferidos. Inventario y supresiones incluyen nuevos documentos antes de archivos reales. |
| Privacidad | Sin tokens/URLs firmadas/formularios en almacenamiento, logs o analytics; sin bucket/key/URL arbitrarios; acceso individual autenticado, no-store y cache de contexto aislada. |
| Accesibilidad | Teclado completo, foco de diálogo y retorno, lector de errores, textos extensos, progreso y layout a 320 px; ningún control esencial sólo por arrastre o color. |

No se crean archivos de prueba ni fixtures en esta tarea. La campaña futura deberá usar cuentas/textos/imágenes sintéticas y contratos finales; no llamar integración real a un render con fixtures ni reutilizar A–H como validación del representante.

## 9. Preguntas contractuales concretas para backend

1. **Vínculo inicial:** confirmar las rutas candidatas de alta/revocación/listado, el alta de una cuenta nueva y los roles sin membresía. ¿Qué consulta autorizada aporta nombre de flotilla/persona representada, ya que el listado devuelve IDs? ¿Existe expiración de invitación distinta de revocar vínculo? No se propone una acción nueva si no existe.
2. **Modelo y permisos:** consolidar DTO/reglas de representación y acciones permitidas. ¿Qué resumen mínimo, si alguno, ve un coordinador? ¿Qué respuesta acredita autoridad actual para E, dado que `canAcceptFleet` aparece opcional en DTO pero no en el listado y `approvedCaseId` no cubre todas las condiciones?
3. **Privacidad sin circularidad:** confirmar lectura/registro REPRESENTATIVE_PRIVACY y la idoneidad del aviso/catálogo procedente de FLEET. Precisar finalidades exigibles/voluntarias y cambio de versión; el código candidato exige todos los consentimientos de ese catálogo. ¿Qué comprobante y recuperación se permiten tras revocación?
4. **Archivos:** confirmar tres categorías candidatas, diez archivos totales, 10 MiB/20M píxeles y authorityPages; cuota de retirados, corrección/orden mediante revisión recuperable. ¿Qué orientación se ofrece cuando no caben las páginas indispensables? No inventar un comando exclusivo de orden.
5. **Declaración y revisión:** aportar texto/fuente/versionado de `declarationCurrent`, captura de fechas de autoridad para SELF, estados/transiciones, motivo público y próxima revisión. ¿Existe aclaración sobre el mismo borrador o una nueva revisión? El checklist candidato no define por sí solo ese recorrido.
6. **Firma conjunta y aceptación:** confirmar que `REPRESENTATIVE_JOINT_SIGNATURE_UNRESOLVED` bloquea sin mecanismo de firma múltiple, y cuál es la acción de orientación permitida. Consolidar `fleetAuthority`, la referencia `representationCaseId` y la regla de vigencia/snapshot; no dar por facultado al que sólo puede consultar términos por membresía.
7. **Recuperación por acción:** finalizar catálogo operación/target y recibos, incluido lo observado para LINK_REPRESENTATIVE, REVOKE_REPRESENTATIVE, REPRESENTATIVE_PRIVACY y CREATE_CASE. Precisar ausencia/depuración/no disponibilidad, cierre atómico y cuándo un rechazo demuestra ausencia de efectos.
8. **Revocación durante recuperación:** resolver el escenario de §4: privacidad o creación aplicada, respuesta perdida, vínculo revocado y GET que exige autorización previa a leer el comando. ¿Qué identidad/canal mínimo devuelve sólo el resultado histórico? Incluir FLEET sin vínculo/membresía; no basta ofrecer el mismo GET sin cambiar su alcance contractual.
9. **Transición histórica:** confirmar significado de ACCREDITED_AT_ACCEPTANCE/HISTORICAL_UNACCREDITED, nueva aceptación exigible y restricciones actuales. Ninguna etiqueta del recibo demuestra facultad vigente; preservar servicios comprometidos sin introducir un bloqueo UI retroactivo.
10. **Baja/restauración:** acreditar cobertura completa del inventario/minimización añadidos, cuarentenas/residuos y restauración; precisar seguimiento y conservación. ¿Es intencional que REPLACE_REPRESENTATIVE exija PROVIDER_ADMIN mientras la vinculación directa admite otros solicitantes? Sin herencia de documentos o permisos operativos.
11. **Handoff final verificable:** aportar informe, OpenAPI actualizado, DTO/controller/servicio, migración y pruebas concordantes; indicar commit o base más huellas locales, qué está probado y qué no desplegado. Resolver la diferencia concreta entre OpenAPI 1.12.0 y código candidato antes de construir el cliente.

Las preguntas distinguen lo ya observado de lo que falta confirmar en el contrato final; no se enviaron mensajes a backend ni a otros agentes.

## 10. Prompt preparado para implementación futura

> Implementa en Mandaria Web el flujo de representación legal de flotilla descrito en `docs/FLEET-REPRESENTATIVE-WEB-PROPOSAL.md`, exclusivamente contra el handoff backend final recibido. Antes de editar, lee AGENTS y continuidad, confirma rama/HEAD/worktrees/cambios y conserva trabajo ajeno. Contrasta informe, OpenAPI, DTO, controllers, servicio y pruebas; registra SHA o huellas reales. El diseño de pantallas no es un contrato publicado.
>
> No inventes endpoints, enums, permisos, DTO o recuperación. Si siguen faltando vínculo preparatorio, privacidad personal previa, sujeto/archivos propios, estados/acciones, autoridad de aceptación FLEET, recuperación tras revocación o inventario de eliminación/restauración, identifica por operación el bloqueo y continúa sólo lo independiente que tenga contrato suficiente. No uses conductor/unidad ficticios ni roles generales como acreditación.
>
> Reutiliza presentación, carga W-01, textos íntegros y patrón de recuperación existentes con las diferencias de permisos y almacenamiento indicadas. Implementa A–F sólo en su alcance autorizado: identidad y facultades, actuación propia de persona física, consentimiento antes de archivos, revisión SUPER_ADMIN, límites/firma conjunta, aceptación FLEET posterior y seguimiento mínimo. No transfieras documentos/aceptaciones al sustituto ni bloquees servicios comprometidos por inferencia.
>
> Todas las mutaciones nuevas necesitan clave, recuperación contractual y revisión esperada cuando aplique; marcador mínimo, sin imágenes/textos/tokens/URLs ni formularios persistidos. Ante respuesta perdida, consultar GET original; no nuevo POST automático ni falsa confirmación. Cierre sólo si el servidor lo admite. Separar comprobantes históricos del estado vigente y limpiar datos privados al cambiar cuenta/flotilla o perder autorización.
>
> Añade y ejecuta completos los archivos de pruebas afectados, tipos/lint/build pertinentes y revisión de 320 px/teclado/foco/textos largos. Usa fixtures fieles sólo después de confirmar contrato; distingue esos resultados de una integración real. Integración aislada únicamente con autorización explícita, identidad de entorno comprobada y datos/transportes sintéticos; nunca documentos reales. No repitas recorridos ajenos sin cambios relevantes. Actualiza informe y continuidad con resultados exactos, huellas y pendientes.
>
> Sin modificar backend, Landing, Android/GPS, créditos, facturación, asignaciones, entrega, refunds o búsqueda automática; sin QA, commit, push, merge, despliegue, publicación de textos ni activación salvo otro encargo explícito. No amplíes permisos ni reabras diseño por conveniencia de implementación.

## Anexo. Huellas y validación de esta propuesta

SHA-256 de la **primera lectura** backend; estos archivos no se editaron. Se conservan como antecedente del cambio concurrente detectado durante la validación documental. No representan la implementación candidata posterior de §4 ni acreditan commit/despliegue.

| ID | Referencia backend | SHA-256 |
| --- | --- | --- |
| B1 | `docs/FLEET-REPRESENTATIVE-PRIVATE-DOCUMENTS-DESIGN.md` | `7e17ea71a8072bc8fba9791c8917db1369aa6e1c112869525f982a64ea7f2b35` |
| B2 | `docs/DOCUMENTARY-TEXTS-OWNER-REVIEW-2026-10-19.md` | `1050757715177ed6ba693eb3e92a84ab99c88906ed9d78b51d83f792145b4054` |
| B3 | `docs/openapi.json` | `fdc3d1c351e09b8fbe4ee31d2530e8e2606d0015c9257e7a7d9bfd14baee7300` |
| B4 | [Controller](../../mandaria-backend/src/verification/verification.controller.ts) | `51ac76773207bcae51e6408311eb5be1ea6c3c068eae758d4ab1d5129438bf95` |
| B5 | [DTO](../../mandaria-backend/src/verification/verification.dto.ts) | `700379108f850b2bba3a5603705dba030be9e92c6cf52f1038d6db210c5e675f` |
| B6 | [Servicio documental](../../mandaria-backend/src/verification/verification.service.ts) | `11bd3f4028ef19db011eef6d23760da37b6ebffd14463ea758a56b86c06e522e` |
| B7 | [Categorías/reglas](../../mandaria-backend/src/verification/verification-rules.ts) | `d26f0ffe3fa8bd21b2679be546daaa7daf7f4e3a8cc633da05172245d16d1ccf` |
| B8 | [Almacenamiento](../../mandaria-backend/src/verification/verification-storage.ts) | `d52a88ede8973cbec0d159b43df443ac0cb2a88fd4f3352bb2d1e1702aa4ee5f` |
| B9 | [Servicio de baja](../../mandaria-backend/src/verification/deletion.service.ts) | `2bb04a83fabb1cfb38c11e261eb580e7cf64ca656fa4869a6a06218b09f627af` |
| B10 | [Esquema](../../mandaria-backend/prisma/schema.prisma) | `ead6f6bb27f0de89d132467ed006dc7784a2792cff082f92098154c2b47d565b` |

**Segunda lectura / corte 2026-10-19T18:18:32.817Z.** B1, B2, B3 y B8 mantienen las huellas anteriores. Seis referencias cambiaron y se inspeccionaron dos archivos candidatos adicionales; ésta es la base del contraste de §4. No se exige inmovilidad posterior a un backend en desarrollo: al implementar se volverá a contrastar su handoff final.

| ID | Referencia | SHA-256 del corte posterior |
| --- | --- | --- |
| B4 | Controller | `c8c63ee3591fbbae9bbbd076020b2eef21ed5961f43a3f5c3819f95e3c1c52be` |
| B5 | DTO | `d594042b201444cc678a2f16847a24c3ab3c9b0e2bf72c1fbda7ad94acfacd4c` |
| B6 | Servicio documental | `5d25f5a4cc155c0303b2aa1d2961ff3dfb30b4a52fff104d19c87e2d10fe1e1b` |
| B7 | Categorías/reglas | `c7a394d9f94f3cae8d03b641d9d0036c6e0920abbc18c3c68ae2cf136fc3368f` |
| B9 | Servicio de baja | `5695cfca0b0375bafc9a500bde1154d7df6680848ad700aa4caa215114ac65f5` |
| B10 | Esquema | `60878216ef1b244303cffd2c41db4c31db28f4410579a11327b7c06da505dcaf` |
| B11 | [DTO de representante](../../mandaria-backend/src/verification/representative.dto.ts) | `18a11e85a8fd2aef66c7962d014a1d54bd5bb70f25c7dc46322a4615da350f87` |
| B12 | [Reglas de representante](../../mandaria-backend/src/verification/representative-rules.ts) | `5e0a24b8d7c632035b935cd7e2b3d546a988f580af8ad42c991fb1d2e5a747f2` |

Validación de este encargo: diez secciones comprobadas; **190 enlaces locales resuelven**, incluidos los que requieren el checkout backend hermano; historial previo de los tres documentos de continuidad conservado. `git diff --check` PASS; documento nuevo contrastado con `/dev/null` sin diagnósticos de espacios (el diff sin índice devuelve 1 por la adición). Rama/HEAD sin cambios, índice vacío y sólo los cuatro documentos solicitados modificados. No se ejecutan suites, builds, navegador, backend, Docker, PostgreSQL, cuentas, Spaces ni correo. La [evidencia previa de avisos](DOCUMENTARY-AVAILABILITY-WEB.md) y el [A–H histórico](DOCUMENTARY-ONBOARDING-PRODUCTION-WEB.md) no prueban el representante. Documentación local sin commit, push, merge, publicación o activación; no se modificaron producto, backend, Landing ni Android.

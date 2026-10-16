# Auditoría de diseño y UX de Mandaria Web

Fecha: 16 de octubre de 2026. Alcance: frontend de este repositorio, sin modificaciones de código.

La aplicación tiene una base funcional compartida: navegación por rol, formularios, tablas, diálogos y estados de consulta. Su principal deuda visual es sistémica: los tokens y componentes actuales no representan el lenguaje de Mandaria definido en [AGENTS.md](../AGENTS.md). No conviene rediseñar cada pantalla de forma independiente.

## Método y límites

- Inventario de rutas contrastado con `src/app/Root.tsx`, `src/app/App.tsx` y `src/developers/pages.tsx`; revisión estática de páginas, componentes, estilos y estados de los módulos del inventario.
- Aplicadas las skills `redesign-existing-projects` y `design-taste-frontend` como herramientas de diagnóstico. La instrucción de auditar sin modificar código excluye su fase de corrección. AGENTS.md prevalece sobre sus sugerencias genéricas: conservar familia grotesca, líneas de 1px, eyebrows, palabras verdes y bandas sólidas; no introducir nuevas paletas, gradientes, sombras, glassmorphism ni fotos o movimiento por cuota.
- Inspección real de `/developers` a 1440, 768 y 390 px mediante `inspect.mjs`, con revisión de las tres capturas del primer viewport. No se iniciaron sesiones ni se ejecutaron mutaciones de negocio. Las pantallas autenticadas y el resto de rutas públicas se auditaron por código, no mediante recorridos visuales completos.
- Vite y Chrome requirieron ejecución fuera del sandbox por `spawn EPERM`. Capturas y reporte del inspector quedaron en la carpeta temporal `mandaria-design-audit-developers`, fuera del repositorio.
- No se ejecutaron pruebas de negocio ni se afirma conformidad completa de accesibilidad. Se distinguen hechos comprobados en código, mediciones del portal y riesgos pendientes de reproducción.
- Prioridades: **P1** afecta acceso, navegación, comprensión operativa o controles fundamentales; **P2** afecta consistencia, eficiencia o claridad; **P3** mejora secundaria. No se dispone de analítica de uso: la priorización se basa en dependencia funcional e impacto previsto.

## 1. Pantallas, rutas y propósito

Roles: **SA** = `SUPER_ADMIN`; **PA** = `PROVIDER_ADMIN`; **D** = `DRIVER`; **sesión** = cualquier usuario autenticado. Los permisos que se indican son los del router; los servicios pueden aplicar restricciones adicionales.

### Acceso y rutas generales

| Ruta | Acceso | Pantalla y propósito | Implementación |
| --- | --- | --- | --- |
| `/login` | Público | Iniciar sesión, mostrar expiración de sesión y enlace de registro. `?next=onboarding` cambia el destino. | `src/auth/Login.tsx` |
| `/activate-account` | Público | Activar invitación mediante token y nueva contraseña; estados de éxito, token ausente, vencido o revocado. | `src/auth/ActivateAccount.tsx` |
| `/driver/register` | Público | Solicitar o reenviar correo de registro independiente de prueba. | `src/verification/identity.tsx` |
| `/driver/verify` | Público | Confirmar código, nombre y contraseña; continuar al login. | `src/verification/identity.tsx` |
| `/` | Sesión | Redirige a `/dashboard`; no es una landing comercial. | `src/app/App.tsx` |
| `/dashboard` | Sesión | SA: indicadores y proveedores recientes. PA: bienvenida y ficha propia. D y demás roles: mensaje genérico sin módulos. | `src/dashboard/Dashboard.tsx` |
| `/profile` | Sesión | Consultar identidad, rol, estado y fecha de creación; sin edición. | `src/users/pages.tsx` |
| `/settings` | SA | Información del entorno, idioma y zona horaria; sin ajustes editables. | `src/users/pages.tsx` |
| `/403` | Sesión | Acceso denegado con regreso al dashboard. | `src/components/ui.tsx` |
| `/*` no coincidente | Sesión | 404 propio con regreso al dashboard. Sin sesión, el guard conduce al login. | `src/app/App.tsx`, `src/components/ui.tsx` |

### Operación, solicitudes y despacho

| Ruta | Acceso | Propósito | Implementación |
| --- | --- | --- | --- |
| `/delivery-requests` | SA | Listar y filtrar solicitudes de entrega. | `src/delivery-requests/pages.tsx` |
| `/delivery-requests/:publicId` | SA | Recogida, entrega, paquetes, contexto económico, cotizaciones, asignaciones y cancelación. | Mismo archivo |
| `/delivery-quotes` | SA | Consultar cotizaciones por integración, zona, solicitud, estado y fecha. | `src/quotes/pages.tsx` |
| `/delivery-quotes/:publicId` | SA | Consultar condiciones y detalle de una cotización. | Mismo archivo |
| `/dispatches` | SA | Supervisar despachos y estados de adjudicación. | `src/dispatch/admin.tsx` |
| `/dispatches/:id` | SA | Revisar despacho, búsqueda, participantes, adjudicación e historial. | Mismo archivo |
| `/services` | PA | Servicios disponibles, tomados y otras vistas por pestaña del proveedor. | `src/dispatch/pages.tsx` |
| `/services/:id` | PA | Consultar servicio y ejecutar acciones permitidas de toma, asignación, liberación o cierre. | Mismo archivo |
| `/custody-incidents` | SA | Aviso de indisponibilidad de ejecución detallada en el backend main; no monta el listado de incidencias. | Texto en `src/app/App.tsx` |
| `/custody-incidents/:dispatchId/:incidentId` | SA | Aviso de indisponibilidad de una incidencia; no monta el detalle de incidencias. | Texto en `src/app/App.tsx` |

### Proveedores, equipo y vehículos

| Ruta | Acceso | Propósito | Implementación |
| --- | --- | --- | --- |
| `/providers` | SA | Buscar y filtrar proveedores. | `src/providers/pages.tsx` |
| `/providers/new` | SA | Crear proveedor. | Mismo archivo |
| `/providers/:id` | SA | Ficha, estado, límites, equipo, cobertura y créditos del proveedor. | Mismo archivo y paneles de dominio |
| `/provider/profile` | PA | Consultar proveedor propio y su contexto operativo. | `MyProvider`, mismo archivo |
| `/drivers` | SA, PA | Listar repartidores del ámbito seleccionado y gestionar invitaciones. | `src/drivers/pages.tsx` |
| `/drivers/new` | SA, PA | Crear repartidor vinculado a un usuario existente, sujeto a capacidad. | Mismo archivo |
| `/drivers/:id` | SA, PA | Ficha, estado, vehículo e historial de asignaciones del repartidor. | Mismo archivo |
| `/vehicles` | SA, PA | Listar y filtrar vehículos del proveedor. | `src/vehicles/pages.tsx` |
| `/vehicles/new` | SA, PA | Crear vehículo sujeto a capacidad. | Mismo archivo |
| `/vehicles/:id` | SA, PA | Ficha, edición, estado y asignaciones del vehículo. | Mismo archivo |
| `/independent-drivers` | SA | Listar y habilitar capacidades de repartidores independientes. | `src/independent-drivers/pages.tsx` |
| `/independent-drivers/:driverId` | SA | Revisar y administrar perfil independiente, cobertura y créditos. | Mismo archivo |
| `/users` | SA | Consultar cuentas e invitar administradores. | `src/users/pages.tsx` |
| `/invitations` | SA | Consultar invitaciones y realizar acciones de invitación, reenvío y revocación. | `src/invitations/pages.tsx`, `components.tsx` |
| `/admin/partner-applications` | SA | Filtrar solicitudes de socios recibidas desde la landing. | `src/partner-applications/pages.tsx` |
| `/admin/partner-applications/:reference` | SA | Revisar contacto, estado, notas y vínculos con proveedor e invitación. | Mismo archivo |

### Portal de conductor

| Ruta | Acceso | Propósito | Implementación |
| --- | --- | --- | --- |
| `/driver` | D | Redirigir a `/driver/services`. | `src/app/App.tsx` |
| `/driver/services` | D | Consultar servicios disponibles y requisitos de elegibilidad. | `src/driver-portal/pages.tsx` |
| `/driver/services/:id` | D | Consultar servicio, importes, condiciones y toma según capacidad. | Mismo archivo |
| `/driver/my-service` | D | Servicio en curso, instrucciones, liberación y confirmación de entrega. | Mismo archivo |
| `/driver/vehicles` | D | Consultar vehículos disponibles para la cuenta. | Mismo archivo |
| `/driver/credits` | D | Saldo e historial de créditos cuando corresponde al perfil independiente. | `src/credits/pages.tsx` |

### Cobertura, precios y créditos

| Ruta | Acceso | Propósito | Implementación |
| --- | --- | --- | --- |
| `/service-zones` | SA | Listar zonas y estado de tarifas. | `src/pricing/zones.tsx` |
| `/service-zones/new` | SA | Crear zona con código, moneda y cobertura GeoJSON. | Mismo archivo |
| `/service-zones/:id` | SA | Consultar/editar zona, activar/desactivar y gestionar versiones de tarifas. | Mismo archivo |
| `/rate-plans/:id` | SA | Detalle de versión tarifaria, bandas y acciones de versionado/estado. | `src/pricing/rate-plans.tsx` |
| `/credit-policies` | SA | Listar políticas y consultar calculadora de créditos. | `src/credit-policies/pages.tsx` |
| `/credit-policies/new` | SA | Crear política de consumo de créditos. | Mismo archivo |
| `/credit-policies/:id` | SA | Detalle, rangos, estado, versiones e historial de una política. | Mismo archivo |
| `/provider/credits` | PA | Consultar saldo y movimientos propios, sin recarga administrativa. | `src/credits/pages.tsx` |

### Integraciones y webhooks

| Ruta | Acceso | Propósito | Implementación |
| --- | --- | --- | --- |
| `/integrations` | SA | Listar integraciones B2B. | `src/integrations/pages.tsx` |
| `/integrations/new` | SA | Crear integración. | Mismo archivo |
| `/integrations/:id` | SA | Ficha, credenciales, secretos y configuración/eventos webhook. | Mismo archivo; `src/webhooks/pages.tsx`, `settings.tsx` |
| `/integrations/:id/webhooks/:eventId` | SA | Consultar evento, intentos y acciones de entrega. | `src/webhooks/pages.tsx` |
| `/webhooks/health` | SA | Supervisar salud de webhooks. | Mismo archivo |

### Verificación documental

| Ruta | Acceso | Propósito | Implementación |
| --- | --- | --- | --- |
| `/verification-entry` | Sesión | Redirección por rol al onboarding, verificación de proveedor o revisión administrativa. | `src/app/App.tsx` |
| `/driver/onboarding` | D | Correo, términos, requisitos y expedientes del conductor. | `src/verification/pages.tsx` e `identity.tsx` |
| `/provider/verification` | PA | Expedientes y verificación de recursos del proveedor. | `src/verification/pages.tsx` |
| `/admin/verification-cases` | SA | Listado y filtros de expedientes para revisión. | Mismo archivo |
| `/verification/cases/:id` | Sesión | Expediente, requisitos, evidencias y acciones según ámbito y permisos del servidor. | Mismo archivo, `forms.tsx`, `evidence.tsx` |
| `/verification/acceptances/:id` | Sesión | Consultar comprobante de aceptación. | `ReceiptPage`, mismo archivo |

### Documentación pública B2B

Estas rutas se montan fuera de `AuthProvider` en `RootRoutes`; no restauran la sesión administrativa.

| Ruta | Propósito | Implementación |
| --- | --- | --- |
| `/developers` | Introducción, accesos a guías y ejemplo de conexión. | `src/developers/pages.tsx` |
| `/developers/authentication` | Autenticación y scopes. | `Guide` |
| `/developers/prequotes` | Precotización, conversión y aceptación. | `Guide` |
| `/developers/execution` | Progreso y resultado versionados, con aviso de disponibilidad en QA. | `Guide` y `src/developers/tracking.md` |
| `/developers/webhooks` | Contrato de webhooks. | `Guide` |
| `/developers/errors` | Errores e idempotencia. | `Guide` |
| `/developers/reference` | Referencia OpenAPI y operaciones. | `Reference` |
| `/developers/*` no coincidente | 404 público con vuelta a documentación. | `DeveloperPortal` |

Los JSON, Markdown y ejemplos en `/developers/assets/` son recursos descargables, no pantallas adicionales. No hay landing comercial de mandados/fletes/viajes/mudanzas en este checkout.

### Vistas incrustadas y código que no equivale a una ruta

- Coberturas (`src/service-coverage/pages.tsx`): panel administrativo y consulta propia dentro de proveedores; no existe una ruta independiente `/service-coverage`.
- Asignaciones de vehículo (`src/assignments/components.tsx`) y de servicio (`src/delivery-assignments/*`): paneles, historial y diálogos dentro de fichas y servicios. Son dominios distintos; no deben fusionarse por tener nombres parecidos.
- Créditos administrativos (`src/credits/components.tsx`): saldo, movimientos, recarga y ajuste en las fichas de sus titulares. No existe una ruta global `/credits`.
- Tarifas: altas/versiones se abren desde la zona o la tarifa; no hay `/rate-plans` ni `/rate-plans/new` registrados.
- Verificación: formularios de identidad/unidad, términos, evidencias, recuperación y decisiones incrustados en las rutas del módulo.
- `src/execution/incidents.tsx` exporta `IncidentsPage` e `IncidentPage`, pero el router actual muestra avisos estáticos en sus rutas. La existencia del código no acredita disponibilidad del flujo detallado.
- Diálogos de credenciales, invitaciones, cambios de estado, cobertura, toma/liberación/asignación y cierre son estados de las pantallas anteriores, no rutas nuevas.

## 2. Cómo se manejan los estilos hoy

| Capa | Situación observada | Consecuencia |
| --- | --- | --- |
| Aplicación | React 19, TypeScript, Vite 8 y React Router 7 según `package.json`. | SPA con layouts y permisos centralizados. |
| Datos | TanStack React Query 5 y servicios por dominio. | Carga/error se deciden mayormente en cada página o panel. |
| CSS | `src/main.tsx` importa `src/index.css`, una hoja global de unas 2.770 líneas. `verification/pages.tsx` importa `verification.css`. | La cascada global afecta administración, login y Developers. |
| Librerías visuales | No hay Tailwind, Bootstrap, MUI, shadcn ni CSS-in-JS en las dependencias. Iconos de `lucide-react`. | La migración puede mantenerse en CSS y React existentes. No requiere cambiar librería. |
| Tokens | Variables en `:root`: marca, tinta, texto secundario, línea, superficie, radio, espaciado, peligro y sombra. | Buena base, pero valores incorrectos y abundantes colores/radios literales por módulo. Cambiar solo tokens no basta. |
| Componentes base | `Badge`, `PageTitle`, `Loading`, `Empty`, `ErrorState`, `ErrorPage`, `Modal`, `ActionForm`, `Confirm`, `Field`, `Table`, `Pagination`, `InfoGrid` en `src/components/ui.tsx`; notificaciones en `Feedback.tsx`. | Existe reutilización real; conviene ampliarla, no sustituir toda la app. |
| Botones/paneles | No hay componente React universal de botón o panel: se repite JSX con `.button`, `.panel`, `.panel-toolbar`, `.form-actions`. | Varían flechas, iconos, tamaños, acciones y composición. |
| Tipografía | Stack `Inter, Segoe UI, Arial, sans-serif`; sin `@font-face` ni carga de fuente encontrada en el código revisado. | La familia efectiva depende del equipo. El inspector reporta el stack Inter, pero eso por sí solo no demuestra un archivo Inter cargado. |
| Documentación | `react-markdown` y `remark-gfm`; reglas `.developer-*`, código y tablas. | Necesita una variante editorial de documentación dentro de la misma marca. |
| Responsive | Media queries a 1500, 1200, 1024, 850, 760, 720, 640 y 600 px; grid/flex, tablas con scroll y variante `stacked`. | Hay adaptación implementada, pero varios umbrales y comportamientos por dominio. |
| Movimiento | Spinner, transiciones de controles y desplazamiento del sidebar; regla global `prefers-reduced-motion`. | Base sobria y respeto por movimiento reducido; falta trasladar el motivo de ruta a los estados operativos. |

Los selectores genéricos `main`, `h1`, `h2`, `table`, `td`, `th`, `dialog` y controles de formulario conviven con reglas específicas. Ejemplo visible: el `main` de Developers conserva padding global adicional dentro de `.developer-layout`; a 390 px el título queda más adentro que la navegación. Conviene delimitar estilos por layout antes de ampliar el sistema.

## 3. Repetición y divergencia de componentes

| Patrón | Variantes/evidencia | Diferencia y recomendación |
| --- | --- | --- |
| Tarjetas de servicio | `ServiceCard` en `src/dispatch/components.tsx`; tarjetas de `src/driver-portal/pages.tsx`; `.service-card` y `.driver-service-card` en CSS. | Mismo núcleo: ruta, estado, precio, condiciones y acción; cambia jerarquía, tipografía y composición. Compartir estructura visual con variantes por rol, conservando acciones y permisos. |
| Contexto económico | `MoneyBlock` (`dispatch/components.tsx:81`), `PaymentContextBlock` (`delivery-assignments/components.tsx:61`), `PaymentBlock` (`driver-portal/pages.tsx:163`). | `.money-*`, `.payment-*` y `.driver-payment/.driver-advance` repiten bloques con fondos, tamaños y espaciado distintos. Ya delegan determinados casos en `DetailedPayment`: extender esa convergencia sin mezclar honorario, mercancía, adelanto y créditos. |
| Estados y badges | `Badge` (`components/ui.tsx:22`), `StatusBadge` (`invitations/components.tsx:41`), `DispatchBadge`, `AssignmentBadge`, `.tag`, `.credit-chip`. | `StatusBadge` duplica markup; otros wrappers reutilizan correctamente `Badge`. La divergencia está en mapeo de tonos, radios y CSS por estado. Centralizar presentación; mantener etiquetas de dominio. |
| Formularios | `ActionForm` (`components/ui.tsx:166`) y `Form` (`verification/common.tsx:24`). | El primero incluye fieldset bloqueado, aviso de cambios y error estilizado; el segundo maneja cargas/evidencias y usa párrafos simples. Compartir apariencia y contrato de mensajes, preservando bloqueo, recuperación y selección de archivos. |
| Carga/error/vacío | Componentes base frente a `<p role="alert">`, botones sin `.button` y texto simple en verificación y Developers. | El mismo fallo aparece como bloque con icono, texto plano o una opción de select. Unificar contexto, reintento y semántica, sin exigir un bloque grande para cada caso. |
| Filtros | `.filters`, `.delivery-filters`, `.webhook-filters`, `ResourceFilters`, filtros de cotizaciones y verificación. | Mezcla aplicación inmediata con botón Aplicar; errores de catálogos y limpieza no son uniformes. Definir una convención por tipo de filtro. |
| Tablas y listas | `Table` con/sin `stacked`; listas `.verification-files`, `.driver-vehicle-list` e historial `.assignment-entry`. | Adaptación móvil distinta y densidad variable. Reutilizar datos/semántica de columna sin convertir todo en tarjetas. |
| Cabeceras y marca | `PageTitle`; títulos manuales en login, activación, verificación y Developers; marca de sidebar/login/activación y marca textual pública. | Pesos, tamaños y espaciado distintos. Crear variantes explícitas de cabecera y marca con una sola escala. |
| Avisos | `.notice`, `.warning`, `.inline-error`, toast, avisos de adelanto y `SearchStatus`. | Rojo/ámbar/verde/azul, radios y tamaños heterogéneos. Compartir un aviso con título, consecuencia, acción y gravedad textual. |
| Progreso | `.route-art`, `.execution-phases`, `.onboarding-steps`, `SearchStatus`. | Hay representaciones separadas; ninguna constituye por sí sola el motivo completo origen hueco → destino sólido + vehículo. Definir una base común de progreso con adaptaciones accesibles. |

## 4. Inconsistencias con el lenguaje visual de Mandaria

### Colores y superficies — P1 sistémico

Valores en `src/index.css:1`:

| Rol | Actual | Mandaria |
| --- | --- | --- |
| Fondo | `#F5F7F7` | `#F2F2F0` |
| Superficie | `#FFF` | `#F2F2F0` o bandas sólidas permitidas |
| Texto principal | `#192B2D` | `#1E1C1A` |
| Acento | `#12796A`; variante `#0D5C51` | `#137A6A` |
| Texto secundario | `#718082` | `#5A5854` |
| Bordes | `#E4EAEA`, `#D8E1DF` y otros | `#1E1C1A`, 1px |
| Avisos suaves | `#F0F7F4`, `#EAF6EF` y otros | `#E6F1EE` |

- Blanco puro en sidebar, login, botones secundarios, paneles y tarjetas. El blanco del texto de botón primario sí está expresamente permitido por AGENTS.md; no confundirlo con fondo blanco.
- `.badge.independent` usa fondo `#F2EEF9` y texto `#8C72AE`; `.badge.fleet` y `.badge.contacted` usan azules. Estados pendientes, rechazados, advertencias y adelantos agregan amarillos, rojos y marrones (`index.css:619` en adelante y reglas de dominio posteriores).
- La información de estado ya suele incluir texto: conservar esa redundancia y sustituir color por jerarquía, etiqueta e icono dentro de la paleta autorizada. No inventar un segundo acento para errores.
- `--logistics-muted: #64748B`, `.developer-code: #132D30`, verdes de login y numerosas superficies literales evitan los tokens centrales. Se necesita inventario de valores literales además de corregir `:root`.

### Esquinas, sombras y divisores — P1 sistémico

- `--radius: 14px`; `.button` con 8px e inputs con 7px, paneles con el radio global, tarjetas de conductor con 14px, bloques económicos con 10–12px, `.credit-chip` con 999px. Contradicen esquinas rectas en controles y superficies.
- Sombras en `.panel` (`index.css:375`), dropdown (`:326`), `dialog` (`:716`), toast (`:799`), arte del banner (`:871`) y activación (`:1719`). AGENTS.md prohíbe sombras difusas también cuando una skill genérica permitiría overlays.
- `dialog::backdrop` aplica `backdrop-filter: blur(...)` (`index.css:726`): retirar el desenfoque en la futura migración.
- Las líneas finas ya existen, pero con tonos demasiado claros. Mantenerlas y corregir color/consistencia; no eliminarlas por los avisos genéricos del linter.
- No se encontraron gradientes CSS en las hojas auditadas. No se detectó un sistema de emojis ni ilustraciones 3D en estas pantallas; no son problemas actuales a corregir.

### Tipografía, composición y tono — P2

- `h1` global de 30px y line-height 1.2; hero de login con peso 550 y line-height 1.13 (`index.css:998`); cabecera pública con peso heredado 700 y line-height 1.18. Falta una escala de títulos extra bold con tracking negativo y leading cerrado, diferenciada entre app y público.
- Mantener la grotesca existente y asegurar su carga consistente. No sustituir Inter por una fuente nueva solo por recomendación de la skill.
- Etiquetas y metadatos operativos de 9–11px en navegación, badges, tablas y tarjetas. Una app densa no exige texto tan pequeño. Los eyebrows son válidos, pero deben ser legibles y usar el verde exacto.
- `.geojson-input` y `.geojson-view` fuerzan una familia monoespaciada (`index.css:1615`, `:1629`), y los ejemplos de Developers usan `<code>`. Son contenido técnico, no una nueva tipografía de marca; bajo la regla estricta de una familia, deben revisarse explícitamente sin extender monospace a etiquetas o cifras de negocio. Ya hay `tabular-nums` en contadores y movimientos, una base útil.
- `.button` y `ActionForm` no incluyen una flecha → de forma consistente. Los secundarios tienen fondo blanco y borde gris claro. Alinear ambos con los contratos de AGENTS.md sin agregar flechas a cada control auxiliar.
- Dashboard y Developers se apoyan en grupos de tarjetas; el portal público muestra cuatro cajas redondeadas blancas. Migrar a columnas editoriales con línea superior y separación clara. No imponer la composición de landing a tablas o formularios.
- Login usa dos nodos cuadrados redondeados, línea discontinua e iconos (`Login.tsx:39`, `index.css:1021`); no el origen hueco, destino sólido y vehículo. Los servicios muestran origen/destino como texto, sin continuidad visual compartida con onboarding y seguimiento.
- No hay bandas de marca a todo ancho equivalentes al lenguaje indicado en las superficies públicas revisadas. El panel verde pálido del login y el banner redondeado del dashboard no cumplen esa función.
- Textos como “Bienvenido a tu operación”, “Una operación conectada. La base de lo que viene” y “Construye una operación que siga avanzando” ocupan espacio sin indicar una tarea. Priorizar acciones y estado. Los avisos técnicos indispensables de verificación deben conservar su significado, pero pueden presentarse en niveles de detalle.

## 5. Problemas de UX, accesibilidad y responsive

### Qué ya está resuelto y debe preservarse

- `Loading` anuncia estado; `ErrorState` tiene `role="alert"` y admite reintento; `Empty` admite texto y acción. Se usan ampliamente: no es correcto diagnosticar ausencia global de estados.
- `ActionForm` bloquea controles al enviar, evita envíos mientras está ocupado, muestra errores y cambios sin guardar. Hay validaciones HTML (`required`, `type`, `pattern`, límites) y validaciones de dominio en formatos/servicios.
- `Field` vincula nombres y ayuda a controles hijos directos. `Modal` usa `<dialog>`, título accesible, Escape y restitución de foco. Existen foco visible global y navegación activa con `NavLink`.
- `ActivateAccount` diferencia estados terminales de la invitación y ofrece regreso al login. Créditos distingue cuenta inexistente de saldo cero (`MissingAccount`); invitaciones distingue registro exitoso de correo no enviado.
- Cobertura tiene vacío con CTA; servicios y portal del conductor tienen estados de elegibilidad y vacíos específicos. Verificación conserva referencias de operaciones inciertas y feedback de carga. No simplificar estas salvaguardas durante una migración visual.
- Hay favicon, `lang="es-MX"`, viewport, descripción y 404 propio. Developers ya tiene enlace para saltar al contenido. El CSS contempla movimiento reducido y el portal del conductor eleva acciones principales a 48px.

### Hallazgos priorizados

| ID | Prioridad | Evidencia y problema | Recomendación |
| --- | --- | --- | --- |
| UX-01 | P1 | `Login.tsx:10` conduce normalmente a `/dashboard`; `Dashboard.tsx:26` deja al conductor con “Tu rol todavía no tiene módulos administrativos habilitados”, pese a las rutas `/driver/*`. | Entrada por rol hacia servicio actual/disponibles o un dashboard útil. Evitar negar capacidades existentes. |
| UX-02 | P1 | Sidebar móvil oculto solo con `transform: translateX(-100%)` (`index.css:1243`). `AdminLayout.tsx` no aplica `inert`/`hidden` al menú cerrado. | Sus enlaces permanecen potencialmente tabulables fuera de pantalla. Retirar interacción cuando está cerrado y verificar foco con teclado al abrir/cerrar. |
| UX-03 | P1 | Sidebar fijo con numerosos enlaces SA, sin `overflow-y:auto` propio (`index.css:169`, `AdminLayout.tsx:77`). | Riesgo de destinos inferiores inaccesibles en ventanas bajas; pendiente de reproducción autenticada. Habilitar scroll interno y verificar 768px de alto, móvil horizontal y zoom. |
| UX-04 | P1 | Contraste medido en `/developers`: etiqueta “Developers” y footer aproximadamente 3.8:1 para texto pequeño, frente a 4.5:1 esperado por el inspector. | Usar texto secundario Mandaria y verificar contraste sobre cada superficie. Revisar también metadatos y badges de la app; no extrapolar la medición a todas las combinaciones. |
| UX-05 | P1 | `EnableDialog` de independientes (`independent-drivers/pages.tsx:230–320`) no diferencia `providerList.isError`/`driverList.isError`; una consulta fallida puede acabar en “no tiene repartidores activos”. Filtros de cotizaciones (`quotes/pages.tsx:289–397`) omiten error de integraciones y zonas. | Mostrar fallo del catálogo con reintento; separar carga, vacío real y error, conservar filtros seleccionados. |
| UX-06 | P1 | `Field` no tiene contrato de error por campo; `ActionForm` muestra un único mensaje al pie (`components/ui.tsx`). No se encontró `aria-invalid` en el código de UI revisado. | Asociar errores con cada campo, marcar invalidez y enfocar el primer error. Mantener resumen general para fallos de servidor. |
| UX-07 | P2 | `ActionForm` solo protege cambios con `beforeunload`; no bloquea navegación interna ni cierre de modal por Escape/X. | Prevenir pérdida de edición también al cambiar de ruta/cerrar, según riesgo. No aplicar bloqueo a formularios sin cambios. |
| UX-08 | P2 | `Loading` siempre ocupa un bloque genérico; indicadores del dashboard usan “…” sin anuncio específico (`Dashboard.tsx`). | Estado de carga contextual y estable: filas/esqueleto cuando ayude, o texto de estado junto a métricas. No sustituir contenido útil por un spinner en cada refresco. |
| UX-09 | P2 | `Notices` en verificación (`verification/pages.tsx:377`) tiene error textual sin reintento; `CaseList` sí ofrece “Consultar expedientes”. `pricing/zones.tsx:211` reduce error de tarifa a “No disponible”. | Reintentos locales y mensajes que diferencien ausencia de datos de indisponibilidad. |
| UX-10 | P2 | Detalles como proveedores, integraciones, repartidores, vehículos y políticas retornan `Loading`/`ErrorState` antes de `PageTitle`. Solicitudes y cotizaciones conservan cabecera y regreso. | Mantener título y ruta de regreso también durante carga/error. No dejar que el contexto desaparezca al fallar la consulta. |
| UX-11 | P2 | Vacío por defecto de `Table` no ofrece acción y usa texto genérico. Coberturas y varios servicios sí dan orientación específica. | Diferenciar “sin registros”, “sin resultados del filtro” y “sin permisos/capacidad”; ofrecer crear o limpiar filtros donde corresponda. |
| UX-12 | P2 | `AdminLayout` tiene `<main id="main-content">` pero no enlace “Saltar al contenido”; Developers sí lo tiene. | Agregar el mecanismo al layout autenticado y asegurar foco del destino. |
| UX-13 | P2 | Menú de usuario solo alterna `menu`; no hay gestión explícita de Escape, clic exterior o foco al cerrarlo (`AdminLayout.tsx`). | Completar patrón de disclosure accesible y probar teclado. El drawer móvil ya tiene Escape y ciclo de foco: no eliminarlo. |
| UX-14 | P2 | `.button.small` tiene min-height 34px; `.icon-button` no fija mínimo táctil; `.table-action` mide 11px. Solo algunas áreas garantizan 44/48px. | Unificar objetivos táctiles de 44px como criterio del proyecto en teléfonos. Medir también separación y nombre accesible; tamaño por sí solo no demuestra incumplimiento normativo. |
| UX-15 | P2 | Tablas anteriores, p. ej. `AssignmentHistory` y recientes de dashboard, no usan `stacked`; módulos nuevos sí. `.table-scroll` desplaza horizontalmente y las celdas usan nowrap. | Elegir por tabla columnas esenciales, apilado o scroll explícito; probar identificadores y acciones largos. No declarar desbordamiento real de toda la app sin render autenticado. |
| UX-16 | P2 | `SearchStatus.tsx` introduce el contador cambiante dentro de `role="status"`. | Riesgo de anuncios repetidos cada segundo. Anunciar transiciones de búsqueda y dejar el contador fuera de la región viva. Verificar con lector de pantalla. |
| UX-17 | P2 | `RegistrationConfirm` (`verification/identity.tsx:50`) aconseja iniciar sesión si se perdió la respuesta, pero no incluye enlace al login ni regreso dentro de esa vista. | Convertir la salida recomendada en acción accesible. |
| UX-18 | P2 | Rutas de incidencias solo renderizan un párrafo técnico (`App.tsx`), sin título ni regreso contextual. | Estado de capacidad no disponible con título, explicación y retorno; no reactivar funciones que el backend no soporta. |
| UX-19 | P2 | `FeedbackProvider` retira cualquier toast a los 7 segundos, sin pausa al foco/hover ni persistencia para textos largos. | Mantener resultados críticos junto a la operación; permitir lectura/recuperación de avisos largos. Conservar roles status/alert. |
| UX-20 | P2 | Registrar repartidor exige UUID manual (`drivers/pages.tsx:243`); zonas requieren pegar GeoJSON (`pricing/zones.tsx:295`). Hay validación, pero la tarea exige conocimiento técnico. | Priorizar invitación/selector autorizado y una vista comprensible de cobertura; mantener edición técnica para quien la necesite. |
| UX-21 | P2 | `SettingsPage` anuncia V1.3, sidebar V1.10 y paquete 1.10.0; encabezado/footer dicen “administrativo/Administración” también para D. | Unificar versión y contexto por rol. Revisar el texto del login que dice “cuenta administrativa” junto al registro de conductor. |
| UX-22 | P3 | `index.html` fija el título administrativo para todas las rutas; no se encontró actualización de título por página. | Títulos específicos para documentación, autenticación y contexto operativo. |

### Formularios: precisión del diagnóstico

No faltan todas las validaciones. Activación comprueba longitud y coincidencia de contraseñas; vehículos valida identificador y año; zonas valida código/moneda/GeoJSON; webhooks comprueba HTTPS sin credenciales ni fragmentos; evidencia valida tipo/tamaño y conserva estados inciertos. La deuda transversal es **localizar y explicar el error**, no agregar `required` indiscriminadamente.

Otras mejoras concretas: indicar de forma consistente campos obligatorios/opcionales; mostrar requisitos antes del envío; conservar borrador cuando falla una consulta; permitir reintentar catálogos sin salir del formulario. En solicitudes de socio ya hay mensajes de fallo dentro de selects (`partner-applications/pages.tsx:843`), pero no un reintento local equivalente al de `ErrorState`.

### Responsive y revisión visual realizada

En `/developers` no hubo aviso de overflow horizontal del inspector en los tres anchos. La navegación móvil se transforma en dos columnas y el título cabe en dos líneas a 768 y 390 px. Eso no acredita el comportamiento de tablas, diálogos o vistas privadas.

- **1440 px:** la cabecera resulta clara, pero las cuatro tarjetas blancas redondeadas dominan la composición. El inspector calcula un párrafo de hasta unas 113 letras por línea. Limitar prosa, conservar ancho útil para código/tablas y adoptar columnas con divisores Mandaria.
- **768 px:** permanece el sidebar de 240px y el contenido pasa a una sola columna estrecha de tarjetas. La lectura funciona, pero alarga considerablemente el recorrido. Revisar el umbral de navegación lateral.
- **390 px:** navegación de siete enlaces ocupa gran parte del primer viewport; el título comienza después de ella y el contenido tiene un margen adicional respecto de la cabecera. Revisar navegación compacta y padding acumulado; conservar acceso a todas las guías.
- **App, pendiente de reproducción:** el drawer empieza solo bajo 640px; a 768px se reserva sidebar de 195px. Revisar el espacio restante de filtros/tablas, alturas reducidas y zoom 200%. `.workspace` aún usa `100vh`; login y activación ya usan `100dvh`.

### Resultado de las herramientas de diseño

Comando estático ejecutado:

```text
node .agents/skills/design-taste-frontend/scripts/lint.mjs src/index.css src/auth src/developers src/verification/verification.css
```

Resultado: 7 archivos, 23 FAIL y 39 WARN. Los FAIL se agrupan en 9 líneas/divisores, 6 sombras, 6 eyebrows y 2 declaraciones monospace. Los WARN: 37 cajas con borde, 1 uso de `100vh` y 1 blur. Es un barrido de patrones de esos archivos, no un puntaje de todo el frontend. Líneas y eyebrows son intencionales según AGENTS.md; monospace corresponde a GeoJSON y requiere la decisión tipográfica ya señalada. Sombras y blur sí son incompatibilidades de marca.

Inspector de `/developers`: 6 categorías FAIL y 5 WARN. Señala eyebrow, líneas, cajas delineadas, falta de imágenes, foco visual y ausencia de movimiento; advierte etiquetas pequeñas, contraste, ausencia de video, ancho de prosa y texto pequeño. **No se recomienda cumplir mecánicamente sus cuotas de imágenes/video/movimiento**, propias de páginas promocionales. Para documentación, se retienen contraste, legibilidad, composición y geometría de marca; se conservan las líneas/eyebrows exigidos.

Crítica visual adaptada, una ronda sin cambios:

| Criterio | Observación |
| --- | --- |
| Primera impresión | Portal técnico legible, con navegación reconocible; las cajas redondeadas le dan una apariencia ajena al lenguaje editorial de Mandaria. |
| Idea | Conectar precio, servicio y resultado; hoy se expresa en texto y accesos, poco en el motivo de ruta. |
| Interacción útil | Navegar guías y copiar un ejemplo; suficiente para este tipo de página. |
| Composición | Cabecera / navegación lateral o en dos columnas / título / tarjetas / explicación / ejemplo. |
| Tres problemas más visibles | Tarjetas y colores fuera de marca en los tres anchos; sidebar que estrecha la columna a 768px; navegación y padding que retrasan el contenido a 390px. |
| Puntuación | No se asigna nota Awwwards: sus cuotas promocionales contradicen el propósito documental y las instrucciones de marca. |

## 6. Orden recomendado de migración

La secuencia mantiene contratos, permisos y capacidades actuales. “Migrar” aquí significa adoptar el lenguaje visual y resolver UX dentro del stack existente, no cambiar framework ni habilitar funciones de backend.

| Orden | Pantallas/capa | Motivo y alcance |
| --- | --- | --- |
| 0 — base previa | Tokens, `ui.tsx`, `Feedback`, `AdminLayout`, estilos globales y estados 403/404/error fatal. | Máximo alcance transversal. Paleta exacta, radios cero, sin sombras/blur, escala tipográfica, botones, divisores, errores por campo, foco y sidebar accesible. Verificar cada cambio global en una pantalla pública, una tabla y un formulario. |
| 1 | `/login`, `/activate-account`, `/driver/register`, `/driver/verify`, `/verification-entry`, `/driver` y redirecciones iniciales. | Son la puerta de entrada. Corregir destino por rol, claridad de cuenta, errores de activación y salidas de recuperación. |
| 2 | `/driver/my-service`, `/driver/services/:id`, `/driver/services`, `/services/:id`, `/services`. | Operación inmediata y uso móvil. Jerarquizar tarea actual, ruta, condiciones económicas, tiempo y CTA; preservar confirmaciones, idempotencia y recuperación. |
| 3 | `/delivery-requests/:publicId`, `/dispatches/:id`, sus listados y rutas de incidencias no disponibles. | Supervisión y resolución de operaciones. Unificar progreso, asignación, estados, regresos y mensajes de capacidad. |
| 4 | `/driver/onboarding`, `/provider/verification`, `/admin/verification-cases`, `/verification/cases/:id`, `/verification/acceptances/:id`. | Habilitación y corrección documental. Dar jerarquía a requisitos, pendiente/rechazado y siguiente acción; preservar avisos de prueba y comprobantes. |
| 5 | `/dashboard` para cada rol. | Entrada frecuente: reemplazar bienvenida genérica por prioridades reales; corregir el caso del conductor. La corrección de destino debe adelantarse en el paso 1. |
| 6 | `/providers`, `/providers/new`, `/providers/:id`, `/provider/profile`, `/drivers*`, `/vehicles*`, `/independent-drivers*`, `/driver/vehicles`; paneles de cobertura y asignaciones de vehículo. | Recursos necesarios para operar. Unificar fichas, formularios, catálogos, estados de capacidad y comportamiento móvil. |
| 7 | `/provider/credits`, `/driver/credits`, paneles administrativos de créditos y `/credit-policies*`. | Comprensión de saldo y bloqueos de operación. Mantener créditos separados de dinero, movimientos auditables y consecuencias claras de ajustes. |
| 8 | `/delivery-quotes*`, `/service-zones*`, `/rate-plans/:id`. | Configuración y trazabilidad de precios. Resolver fallos de selectores, legibilidad de bandas/versiones y entrada técnica de cobertura. |
| 9 | `/users`, `/invitations`, `/admin/partner-applications*`. | Incorporación de equipo y socios. Unificar seguimiento, estados de correo, vínculos y formularios. |
| 10 | `/integrations*`, `/webhooks/health`, detalle de evento y configuración webhook. | Operación técnica especializada. Conservar manejo de secretos, conflictos y reintentos; reducir ruido visual. |
| 11 | Todas las rutas `/developers*`. | Documentación externa: alinear con marca y corregir contraste, ancho de texto y navegación intermedia. La corrección de contraste puede entrar desde los tokens del paso 0. |
| 12 | `/profile`, `/settings`, metadatos y textos de versión. | Vistas de consulta con baja complejidad; cerrar consistencia del sistema. |

### Criterios de cierre para cada grupo

- Usar exclusivamente la paleta de AGENTS.md y conservar una grotesca consistente. Botones/tarjetas/inputs rectos, divisores de 1px, sin sombras difusas ni blur.
- Verificar carga inicial, refresco, vacío, filtro sin resultados, error de red/permisos y mutación pendiente/fallida cuando apliquen; mantener datos e instrucciones de recuperación.
- Recorrer con teclado y comprobar foco, retorno de diálogos, menú oculto, nombres de controles y errores asociados; revisar anuncios dinámicos.
- Revisar a 390, 768 y 1440 px, además de 320px, ventana baja y zoom 200% en flujos operativos. Medir contraste y tamaños táctiles; no limitarse a ausencia de scroll horizontal.
- Ejecutar pruebas existentes pertinentes al grupo cuando haya implementación. Esta auditoría no cambió comportamiento ni ejecutó operaciones contra el backend.

La primera implementación recomendada es consolidar los componentes compartidos y corregir entrada/navegación por rol. Eso permite trasladar el lenguaje de Mandaria a toda la operación con menos divergencias entre pantallas.

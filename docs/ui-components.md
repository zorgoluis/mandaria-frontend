# Componentes de Mandaria

Importar desde `src/components/ui.tsx`. Los valores visuales se definen en
`src/styles/tokens.css` y los componentes en `src/styles/components.css`.
Se conserva la familia Inter y la paleta de AGENTS.md; controles rectos, sin sombras.

| Componente | Uso |
| --- | --- |
| `Button` | `variant="primary"`, `secondary` o `ghost`; `loading`, `loadingLabel`, `disabled`. Por defecto `type="button"`; enviar formularios requiere `type="submit"`. La flecha primaria es decorativa. |
| `ButtonLink` | Acción de navegación con `to` y las mismas variantes visuales. |
| `Input`, `Select`, `Textarea`, `Checkbox` | Props nativas, `ref`, `label`, `help`, `error`. Conservan validación HTML, nombres y valores para FormData. |
| `Field` | Alternativa para envolver controles existentes, incluso dentro de un contenedor de contraseña. Vincula etiqueta, ayuda y error mediante identificadores y ARIA. |
| `Table` | `rows`, `columns` (`label`, `render`), `caption`, `loading`, `error`, `retry`, `emptyAction`. Conserva la opción responsive existente. |
| `Badge` | `value`, `label` opcional, `tone` opcional. Los estados se distinguen con texto además del color. |
| `Modal` | `title`, `onClose`, `busy`. Diálogo nativo, ciclo de foco, Escape y restitución del foco. `busy` bloquea el cierre. |
| `Toast` | `message`, `danger`, `onDismiss`, `duration`. Éxito: siete segundos; error: persiste. Pausa al recibir foco o hover. Se integra con `useFeedback`. |
| `EmptyState`, `Skeleton` | Estado vacío con título, descripción y acción; carga con etiqueta accesible y movimiento reducido. |
| `PageHeader` | `eyebrow`, `title`, `description`, `action`, `back`. |
| `RouteProgress` | `steps`: `id`, `label`, `description`, `state` (`pending`, `current`, `complete`, `blocked`). No deduce hechos operativos: el consumidor proporciona el estado confirmado. |

`PageTitle` y `Empty` permanecen como alias de compatibilidad. Las pantallas usan
los nombres nuevos. Se sustituyeron controles nativos repetidos, botones de carga,
badges de invitaciones, notificaciones y pasos de onboarding, búsqueda y ejecución.
Las rutas, llamadas al servidor y condiciones de autorización se conservan.

## Validación

- Nueve pruebas de componentes: semántica, ayuda/error, formularios, tablas,
  carga, modal, toast y progreso.
- Revisión en Chrome a 1440, 768 y 390 px: sin overflow horizontal ni errores de
  ejecución; Tab, Escape, restitución del foco y movimiento reducido verificados.
- La suite completa mostró 19 fallos. La comparación con `353d221` reprodujo
  18 en asignaciones. El caso adicional de entrega pasó al ejecutar su archivo
  de forma aislada (41/41); la suite completa no queda declarada como aprobada.
- Se ejecutaron lint e inspector de design-taste-frontend. Sus reglas de landing
  sobre imágenes, hero, densidad y animación no se aplican a esta muestra de
  controles. Eyebrows y divisores proceden de AGENTS.md. El linter marca también
  `box-shadow: var(--shadow-none)` y la marca textual de checkbox; no representan
  sombras ni iconos emoji decorativos.

Las capturas y la muestra local están en `test-results/` (ignorado por Git).

## Layout compartido

`AdminLayout` utiliza `Button`, `ButtonLink` y `Modal`. La navegación se agrupa
en Operación, Red logística, Administración y Cuenta conservando los accesos de
cada rol. El header muestra el espacio de trabajo y la sección activa; el footer
usa la firma de Mandaria. Los estilos están acotados en `src/layouts/layout.css`.

- Más de 1024 px: sidebar fija con navegación desplazable y header sticky.
- Hasta 1024 px: navegación en diálogo lateral; foco contenido, Escape, cierre al
  navegar y bloqueo de scroll. Se cierra al cambiar a escritorio.
- Hasta 640 px: cuenta compacta y footer apilado. El correo completo permanece
  disponible en las opciones de cuenta.
- Enlace para saltar al contenido, estado activo mediante `aria-current` y
  controles con nombre accesible. Las opciones de cuenta se cierran con Escape,
  al salir con el foco o al pulsar fuera.

Validación del layout: cinco pruebas de roles e interacción, además de las nueve
de componentes. Chrome a 320, 390, 768, 1024 y 1440 px, incluyendo navegación con
teclado y cambio de tamaño con el diálogo abierto. Capturas en
`test-results/layout-*.png`. El linter de la skill no encontró patrones prohibidos;
las recomendaciones de composición de landing del inspector no se aplican al
contenedor operativo.

## Login

`/login` compone `PageHeader`, `Input`, `Field`, `Button`, `ButtonLink`,
`ActionForm` y `RouteProgress`. `src/auth/login.css` solo organiza esos componentes
con los tokens existentes. Mantiene la familia y los colores de AGENTS.md.

La única acción primaria es iniciar sesión. El estado inicial explica qué correo
usar y cómo activar una cuenta invitada; el registro independiente de prueba
conserva su ruta y su carácter secundario. No hay una colección de datos que
requiera un estado vacío artificial.

La validación conserva las restricciones HTML originales, presenta errores en
español junto al campo y enfoca el primero inválido. No cambia las credenciales
enviadas ni las llamadas o destinos de autenticación. Carga bloquea los controles;
el error permite corregir y reintentar sin borrar los datos. Se conserva el aviso
de sesión expirada y el control para mostrar u ocultar contraseña.

`ActionForm` acepta `loadingLabel`, `trackChanges`, `onInvalidCapture` y
`getErrorMessage`; sus valores por defecto mantienen el comportamiento anterior.
Login usa «Iniciando sesión…» y no trata las credenciales como cambios de edición
pendientes de guardar.

Validación: seis pruebas específicas de campos, carga, error, visibilidad y
destinos. Revisión en Chrome de 320 a 1440 px con respuesta 401 interceptada, sin
enviar credenciales al backend; capturas `test-results/login-*.png`.

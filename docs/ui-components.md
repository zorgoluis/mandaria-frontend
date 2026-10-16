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

# Sistema de diseño de Mandaria Web

Guía obligatoria para cualquier pantalla nueva o modificada, la escriba una
persona o un agente. El objetivo es que toda la app (admin, cliente y
repartidor) se vea como un solo producto sin duplicar estilos.

## Dónde vive

| Qué                                                        | Archivo                            |
| ---------------------------------------------------------- | ---------------------------------- |
| Tokens (colores, radios, sombras)                          | `src/index.css`, bloque `:root`    |
| Capa visual global y patrones                              | `src/styles/redesign.css`          |
| Componentes base (tabla, campo, modal, paginación, badge)  | `src/components/ui.tsx`            |
| Componentes de patrón (panel, indicador, colas, resúmenes) | `src/components/design.tsx`        |
| Menú lateral y barra superior                              | `src/layouts/AdminLayout.tsx`      |
| Fuente Figtree                                             | `public/fonts/figtree/Figtree.ttf` |

## Reglas

1. **Nunca escribas colores en hexadecimal.** Usa las variables de `:root`.
   Si falta un color, agrégalo como token en `:root` con un nombre de rol,
   no de tono (`--warn-soft`, no `--amarillo-claro`).
2. **No uses `style={{}}` para dar aspecto.** Solo se permite para valores
   dinámicos (un ancho calculado, una posición de mapa).
3. **Reutiliza antes de crear.** Busca primero en `design.tsx` y `ui.tsx`.
   Si un patrón aparece en dos pantallas, conviértelo en componente.
4. **No cambies textos legales ni avisos** (`Warning`, términos, baja y
   privacidad) para que quepan en el diseño: ajusta el diseño.
5. **Toda pantalla funciona a 390px.** Revisa celular antes de dar por
   terminada una pantalla.
6. **CSS de módulo solo para lo propio del módulo.** Si una regla sirve a
   más de una pantalla, va en `redesign.css`.

## Tokens

### Color

| Token                                                        | Uso                                                               |
| ------------------------------------------------------------ | ----------------------------------------------------------------- |
| `--brand` `#156b5c`                                          | Acción principal, enlaces, estado activo                          |
| `--brand-dark`                                               | Hover de la acción principal                                      |
| `--brand-deep`                                               | Texto sobre verde claro, toasts                                   |
| `--brand-accent`                                             | Punto del logo, indicador "en línea"                              |
| `--brand-soft` / `--brand-soft-ink`                          | Fondo y texto de avisos informativos, menú activo, badge positivo |
| `--brand-on-dark`                                            | Texto secundario sobre fondo `--brand`                            |
| `--ink`                                                      | Texto principal                                                   |
| `--ink-2`                                                    | Texto de cuerpo en tarjetas                                       |
| `--muted`                                                    | Descripciones y subtítulos                                        |
| `--faint`                                                    | Etiquetas, metadatos, encabezados de tabla                        |
| `--placeholder`                                              | Placeholder de campos                                             |
| `--line` / `--line-soft` / `--line-strong`                   | Bordes de campo / separadores / bordes de botón secundario        |
| `--page`                                                     | Fondo de página                                                   |
| `--surface`                                                  | Tarjetas                                                          |
| `--surface-2` / `--surface-3`                                | Bloques internos / chips y badges neutros                         |
| `--hover`                                                    | Hover de filas y enlaces de menú                                  |
| `--danger` `--danger-strong` `--danger-soft` `--danger-line` | Rechazo, suspensión, errores                                      |
| `--warn` `--warn-ink` `--warn-dot` `--warn-soft`             | Pendiente, por vencer, avisos de cuidado                          |
| `--info` `--info-soft`                                       | Ofrecido, tomado, flotilla                                        |

### Forma y elevación

| Token             | Valor | Uso                                          |
| ----------------- | ----- | -------------------------------------------- |
| `--radius`        | 24px  | Tarjetas y paneles                           |
| `--radius-md`     | 18px  | Bloques internos, avisos, tarjetas de enlace |
| `--radius-sm`     | 14px  | Filas de menú, elementos compactos           |
| `--pill`          | 999px | Botones, campos, badges, chips, pestañas     |
| `--shadow`        | —     | Tarjetas de la columna principal             |
| `--shadow-raised` | —     | Tarjetas de la columna lateral, login        |
| `--shadow-pop`    | —     | Modales, menús desplegables, toasts          |

### Tipografía (Figtree)

| Elemento                 | Tamaño / peso                                                           |
| ------------------------ | ----------------------------------------------------------------------- |
| `h1` de página           | 40px / 800, `letter-spacing: -0.03em` (30px en tablet, 28px en celular) |
| `h2` de tarjeta          | 19px / 700 (16px en columna lateral)                                    |
| Cuerpo                   | 14–15px / 400                                                           |
| Etiqueta de campo o dato | 12px / 600, color `--faint`                                             |
| Valor de dato            | 14.5px / 600, color `--ink`                                             |
| Eyebrow                  | 12px / 700, mayúsculas, `letter-spacing: 0.12em`                        |
| Número de indicador      | 36px / 800 (48px en panel de colas)                                     |

## Estructura de una pantalla

```
PageTitle (eyebrow? · back? · h1 · descripción · acciones a la derecha)
Avisos de la pantalla (Notice / .notice)
Indicadores (stat-grid)            ← opcional
TwoColumn
  ├─ principal: Panel, Panel, …    ← datos, tablas, formularios
  └─ lateral (340–360px, sticky):  ← resumen, decisión, accesos
```

- Listados: `PageTitle` + `Panel` con filtros (chips o `select`) + `Table` +
  `Pagination`.
- Detalle: `PageTitle` con `back` + indicadores de estado + `TwoColumn`. La
  columna lateral lleva el resumen (`SummaryList`) y las acciones que
  deciden (aprobar, rechazar, suspender) junto a su motivo.
- Formulario largo: un `Panel` por sección; acciones al final de cada uno.
- Debajo de 1100px `TwoColumn` pasa a una columna; la lateral queda al final.

## Componentes

### `components/design.tsx`

| Componente    | Para qué                                                |
| ------------- | ------------------------------------------------------- |
| `Panel`       | Tarjeta con título, descripción y acciones opcionales   |
| `TwoColumn`   | Contenido principal + columna lateral fija              |
| `StatCard`    | Indicador numérico con enlace (estructura `.stat-card`) |
| `QueueCard`   | Cola de pendientes sobre el bloque verde `.queue-panel` |
| `LinkCard`    | Acceso destacado con ícono (rejilla `.link-card-grid`)  |
| `LinkRow`     | Acceso compacto para la columna lateral                 |
| `SummaryList` | Lista clave/valor del resumen lateral                   |
| `Notice`      | Aviso con tono `info`, `warning` o `danger`             |

### `components/ui.tsx`

`PageTitle` (acepta `eyebrow`), `Badge`, `Table` (usa `stacked` para que en
celular se vuelva tarjetas), `Pagination`, `Field`, `InfoGrid`, `Modal`,
`Confirm`, `ActionForm`, `Loading`, `Empty`, `ErrorState`.

### Clases CSS disponibles

| Clase                                                              | Uso                                                                      |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `.button` · `.button.secondary` · `.button.small` · `.button.full` | Botones. Destructivo: `.button.danger` o `.button.secondary.destructive` |
| `.panel` · `.panel-toolbar` · `.panel-body` · `.panel-note`        | Tarjeta y sus partes                                                     |
| `.badge.<estado>`                                                  | Estado. Se colorea por familia (ver abajo)                               |
| `.notice` · `.notice.warning` · `.inline-error`                    | Avisos de una línea                                                      |
| `.info-grid`                                                       | Datos clave/valor en dos columnas                                        |
| `.stat-grid` · `.stat-card`                                        | Indicadores                                                              |
| `.tab-list` · `.tab.active`                                        | Pestañas en píldora                                                      |
| `.search` · `.filters`                                             | Búsqueda y filtros de listados                                           |
| `.eyebrow` · `.page-eyebrow`                                       | Texto superior en mayúsculas                                             |
| `.tag`                                                             | Chip neutro                                                              |

### Familias de estado (`Badge`)

| Familia     | Estados                                                                                        | Color |
| ----------- | ---------------------------------------------------------------------------------------------- | ----- |
| Positivo    | `active` `available` `approved` `accepted` `completed` `delivered` `created` `open` `received` | Verde |
| Pendiente   | `pending` `maintenance` `expired` `busy` `contacted`                                           | Ámbar |
| Negativo    | `rejected` `suspended` `revoked` `cancelled` `discarded`                                       | Rojo  |
| Informativo | `offered` `claimed` `fleet`                                                                    | Azul  |
| Neutro      | `draft` `inactive` `released` `reassigned` `offline`                                           | Gris  |

Un estado nuevo se agrega a su familia en `redesign.css`; no se le da un color
propio.

## Responsivo

| Ancho    | Comportamiento                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------- |
| > 1200px | Menú lateral de 240px, dos columnas                                                                  |
| ≤ 1100px | `TwoColumn` y el dashboard pasan a una columna                                                       |
| ≤ 850px  | Menú lateral angosto, títulos de 30px, paneles con 22px de relleno                                   |
| ≤ 640px  | Menú lateral oculto (botón ☰), una columna, tablas `stacked`, botones a todo el ancho donde aplique |

## Antes de entregar una pantalla

- [ ] Sin hexadecimales nuevos ni `style={{}}` decorativos.
- [ ] Usa `PageTitle`, `Panel` y los componentes existentes.
- [ ] Estados con `Badge`, no con texto de color.
- [ ] Carga, vacío y error cubiertos (`Loading`, `Empty`, `ErrorState`).
- [ ] Revisada a 1440px, 820px y 390px.
- [ ] `npm run lint`, `npm run build` y `npm run test` pasan.

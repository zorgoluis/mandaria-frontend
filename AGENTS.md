# Instrucciones para agentes

## Diseño

Toda pantalla nueva o modificada sigue el sistema de diseño de Mandaria:
**lee `docs/DESIGN-SYSTEM.md` antes de escribir UI.**

Resumen de lo indispensable:

- Colores solo con variables de `:root` (`src/index.css`); nunca hexadecimal.
- Sin `style={{}}` para dar aspecto; usa clases de `src/styles/redesign.css`.
- Reutiliza `src/components/design.tsx` (`Panel`, `TwoColumn`, `StatCard`,
  `QueueCard`, `LinkCard`, `LinkRow`, `SummaryList`, `Notice`) y
  `src/components/ui.tsx` (`PageTitle`, `Badge`, `Table`, `Pagination`,
  `Field`, `Modal`…).
- Detalle = `PageTitle` con `back` + `TwoColumn`; la columna lateral lleva el
  resumen y las acciones que deciden.
- Estados con `Badge` y su familia de color; no inventes colores por estado.
- No cambies textos legales ni avisos para que quepan en el diseño.
- Revisa la pantalla a 1440px, 820px y 390px.

## Verificación

`npm run lint`, `npm run build` y `npm run test` deben pasar antes de un
commit.

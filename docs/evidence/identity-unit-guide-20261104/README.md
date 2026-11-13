# Guía de Identidad y Unidad del repartidor

Revisión del 4 de noviembre de 2026 sobre `main`, base `83b50eb`, Web 1.11.0. La guía usa los datos guardados del expediente, la política vigente y los estados de los adjuntos. Una imagen recibida cuenta para su categoría aunque siga pendiente la decisión sobre el expediente. El aviso de que se puede enviar comparte la condición del botón de presentación.

| Verificación local | Evidencia |
|---|---|
| Suite global con `npm test` | [Vitest](vitest.txt) |
| Tipos de pruebas con `npm run typecheck:test` | [TypeScript](typecheck-test.txt) |
| Lint del repositorio con `npm run lint` | [ESLint](lint.txt) |
| Tipos de producto y compilación con `npm run build` | [Vite y TypeScript](build.txt) |
| Identidad en Chromium con `node scripts/verify-identity-redesign.mjs` | [320 px](identity-draft-320.png) · [1280 px](identity-draft-1280.png) |
| Unidad en Chromium con `node scripts/verify-unit-redesign.mjs` | [320 px](unit-draft-320.png) · [1280 px](unit-draft-1280.png) |

Los recorridos de navegador usan respuestas HTTP simuladas y datos sintéticos. Comprueban el borrador, la selección de imágenes, el rechazo de archivos inválidos y el expediente ya presentado. El escenario visual de Unidad declara `OWNED: null` para representar la política vigente de una unidad propia y comprueba que se indique un documento pendiente. La regresión conserva un caso separado con requisitos antiguos que bloquean el envío.

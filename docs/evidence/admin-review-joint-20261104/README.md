# Verificación conjunta de Revisión documental

El 4 de noviembre de 2026 se verificó Web 1.11.0 sobre `main`, con el árbol de trabajo limpio en `8b4812679394ea97e89a21ee25ba249abca1898e`. Este snapshot incluye el rediseño SUPER_ADMIN (`9e74505`) y la compatibilidad con el listado básico (`d4b583f`). Entorno local Windows con Node 24.15.0 y npm 11.12.1.

| Comando | Cobertura | Evidencia |
|---|---|---|
| `npm test` | Suite global de Vitest | [Salida](vitest.txt) |
| `npm run typecheck:test` | Tipos de pruebas | [Salida](typecheck-test.txt) |
| `npm run lint` | ESLint del repositorio | [Salida](lint.txt) |
| `npm run build` | Tipos de producto y compilación Vite | [Salida](build.txt) |
| `node scripts/verify-admin-review.mjs` | Chromium, API ampliada de Nest y PostgreSQL local aislado | [Registro del recorrido](admin-review.json) |

La ejecución final de la suite global pasó **1.753/1.753 pruebas en 86/86 archivos** en 103,20 s. Tipos, lint, build y el recorrido en Chromium finalizaron con código 0. Vite mantuvo el aviso de tamaño del chunk Root de 1.229,64 kB.

Las pruebas de compatibilidad en `documentary-availability.test.tsx` usan respuestas simuladas. Con una página autorizada sin metadatos del resumen, Web conserva el enlace al expediente, muestra la fecha de creación y aplica el filtro de estado. Con HTTP 403 muestra el error de permisos y hace una sola petición.

En el recorrido de navegador, SUPER_ADMIN consultó 24 expedientes sintéticos de dos proveedores, navegó a la segunda página, buscó por revisión y nota, y combinó filtros de estado y proveedor. Se comprobaron los totales globales, el orden por última actualización, el destino del enlace al pendiente más antiguo y la cola vacía. La API administrativa respondió 403 a DRIVER. [Escritorio](review-desktop.png) · [Móvil](review-mobile.png).

La primera corrida de Vitest terminó con código 1. El proceso de `delivery-requests.test.tsx` salió inesperadamente con código 3221226505. Se registraron 85/86 archivos y 1.736/1.753 pruebas aprobadas. Se repitió `npm test` por separado con los mismos cuatro workers y los mismos límites de tiempo. [Salida de la primera corrida](vitest-initial.txt).

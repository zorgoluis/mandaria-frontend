# Mensaje de documentos requeridos — 2026-10-21

Se corrige el diálogo de presentación sin alterar el contrato ni las mutaciones. El código backend VERIFICATION_DOCUMENTS_PENDING ya existía y el aviso documental lo traducía; Confirm utilizaba el normalizador general que caía al 409 genérico.

Producto: src/services/errors.ts y src/verification/format.ts. Pruebas: src/test/verification-pages.test.tsx. El mensaje común es: «Faltan documentos requeridos con formato validado. Revisa las categorías del expediente y completa las cargas pendientes.» Aplica por código exacto, sin inferir tarjeta, licencia o propiedad faltante. Los conflictos desconocidos mantienen su tratamiento previo.

Regresión demostrada antes: dos casos fallan porque el modal contiene el mensaje genérico. Después: 51/51 en páginas (37) y recuperación (14), archivos completos. Prueba de identidad/unidad verifica modal, ausencia de datos crudos, una llamada, revisión 3 y cancelación sin otro comando. Caso adicional conserva fallback desconocido.

Comandos: npx vitest run src/test/verification-pages.test.tsx src/test/verification-recovery.test.ts --reporter=dot; npm run typecheck:test; npx eslint src/services/errors.ts src/verification/format.ts src/test/verification-pages.test.tsx; npm run build. Salida 0; advertencia de chunk grande preexistente. git diff --check sin errores.

Sin ejecución nueva en navegador ni VM; fixtures de servicio, no HTTP/PostgreSQL real. El ensayo previo de motocicleta sólo mostró conflicto genérico y no capturó su código: esta corrección no atribuye retrospectivamente ese error a un documento concreto.

Sin publicación de términos, admisión, commit, push o despliegue. Propuestas editoriales V2 separadas en el repositorio backend; V1 publicadas conservadas.
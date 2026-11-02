# Catálogo administrativo CASH/PICKUP

2026-11-02. Web 1.11.0 sin cambio de versión, sobre main/e6c3fb6. Cambio local no publicado.

## Contrato y cambio

Se consultaron en sólo lectura integration-scopes.ts, integrations.dto.ts, admin-integrations.controller.ts, integrations.service.ts y OpenAPI del backend local. Catálogo Web comparado con la constante backend independiente: doce entradas exactas, en el mismo orden. [Comparación y hashes de fuentes](evidence/cash-pickup-scopes-20261102/catalog-comparison.json). No se copió OpenAPI administrativo al portal público.

Único cambio de producto: `src/types/api.ts` añade `deliveries:pickup-reference:write` a `scopes`; `Scope` deriva de esa constante. El selector de `src/integrations/pages.tsx` ya usa `scopes.map`, todos desmarcados; mantiene identificadores exactos, sin un sistema de etiquetas que requiera ampliar. El listado representa `row.scopes` sin filtrarlos. No hay edición de permisos en esta pantalla ni endpoint de catálogo inventado. `src/integrations/service.ts` ya transmite exactamente la selección y expiración. No requiere modificación.

Administración bajo sesión humana SUPER_ADMIN. Creación POST `/api/v1/admin/integrations/:id/credentials`: scopes explícitos, únicos; selección vacía conserva `scopes: []`; expiración opcional intacta. Rotación POST `.../credentials/:credentialId/rotate` no envía nuevos scopes: backend conserva permisos/expiración y la credencial anterior permanece activa. Cambiar permisos requiere crear otra credencial explícitamente, entregar el secreto de una sola visualización y revocar la anterior explícitamente después de transición. El clientId autenticable es el identificador de credencial; no se intercambia con integrationId.

PICKUP_REFERENCE_WRITE_ENABLED no controla el catálogo ni concede scopes. Esta corrección no otorga permisos a credenciales ni tokens existentes; debe obtenerse un token nuevo con una credencial apropiada. No se creó, rotó o revocó ninguna credencial real.

## Verificación local

- `npm test -- src/test/flows.test.tsx src/test/integration-credentials-api.test.ts`: **66/66, dos archivos, 21.80 s**. [Salida](evidence/cash-pickup-scopes-20261102/tests.txt). Transporte/servicios simulados, sin HTTP real ni navegador remoto.
- Cobertura: doce opciones exactas y únicas, inicialmente desmarcadas; PICKUP aislado y seis CASH sin extras; deselección, vacío y expiración; permisos recibidos visibles sin mutaciones al cargar; restricciones SUPER_ADMIN existentes y acceso anónimo; errores 400/401/403 sin éxito; rotación sin ampliación ni revocación automática; secreto fuera de storage/caché persistente. Listas esperadas explícitas independientes del catálogo de producto.
- Primer intento: 62/66; cuatro fallos de los tests nuevos (Response consumida reutilizada y selector de alertas ambiguo). Corregidos dobles/selector, sin modificar permisos, lógica de producto ni timeouts. Resumen preservado aquí; log inicial local en test-results/cash-pickup-initial.txt.
- `npx tsc --project tsconfig.test.json`, `npm run lint`, `npm run build` (incluye `tsc -b`): PASS. Lint focal y tipos repetidos tras corregir tests. [Build](evidence/cash-pickup-scopes-20261102/build.txt), [lint](evidence/cash-pickup-scopes-20261102/lint.txt). Aviso conocido: chunk Root 1210.22 kB.
- No suite global nueva: los 1681 resultados del 31 de octubre son históricos.

## Candidato y discrepancia de VM

[Manifiesto del candidato local con SHA256](evidence/cash-pickup-scopes-20261102/candidate.json): index.html referencia `index-B6NUcQI_.js`; chunk principal `Root-DxG0CmoV.js`. Incluye hashes de ambos assets, HTML y catálogo fuente. La versión 1.11.0 por sí sola no identifica el bundle servido. No se leyeron .env ni secretos.

VM no inspeccionada ni desplegada en este encargo. Para disponer de la corrección requiere publicación posterior autorizada de este build o uno equivalente. Si un build ya publicado contiene el nuevo scope pero la interfaz sigue antigua, comprobar HTML/assets realmente servidos y cachés mediante sus hashes antes de atribuirlo sólo al navegador. Para los otros cinco CASH, que ya existían en Web, verificar además ruta `/integrations/:id`, sesión SUPER_ADMIN y modal Crear credencial: el cambio de PICKUP no explica su ausencia. No afirmar que recargar assets resuelve un servidor que todavía entrega un bundle antiguo.

Sin backend/Driver/Coita, .env/flags, migraciones, datos reales, versión, commit/push, despliegue ni mensajes externos.

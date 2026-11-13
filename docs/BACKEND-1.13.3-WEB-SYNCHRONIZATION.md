# Sincronización Web con backend 1.13.3 — 2026-10-26

Frontend QA `8dc67e6`, Web 1.11.0. Backend local QA `f2f942e046901551f4e4d144479d6b5bbeac0014`, paquete 1.13.3, coincide con la entrega Git QA indicada por el propietario. No se consultó el servicio remoto ni se acredita despliegue. AGENTS.md no existe en el repositorio; continuidad y fuentes indicadas revisadas.

## Diferencias y cambios

La copia pública tenía info.version 1.13.1. Comparación estructural completa excluyendo únicamente info.version: idéntica a backend 1.13.3. Comparados también los OpenAPI interno y público del commit backend 204d4f7 (1.13.2) contra el checkout actual: idénticos salvo esa versión. Resultado canónico en [comparison.json](evidence/backend-1133-sync-2026-10-26/comparison.json).

`node scripts/sync-public-b2b.mjs` conserva la allowlist de cinco fuentes. Sólo cambia la versión de public/developers/assets/openapi-b2b.json y sus hashes/versión en manifest.json. Las otras cuatro fuentes siguen iguales. Se mantienen 20 operaciones, 50 schemas, seguridad integration-bearer y origen https://mandaria.com.mx con rutas /api/v1. Sin rutas humanas, referencias administrativas o metadatos FCM en el contrato público.

Se actualizan README, CHANGELOG y COMMUNICATION del paquete para describir 1.13.3 sin anunciar APIs nuevas ni disponibilidad remota. El generador existente cambia únicamente la fecha fija a 2026-10-26, separando esta salida de la histórica. No se modifica el generador funcional ni se reconstruye otro mecanismo. El contrato administrativo de las siete secciones coincide exactamente con src/assistance/admin-reference-schema.json; no se regeneran código, tipos ni formularios.

La presentación FCM 1.13.3 corresponde a Android; no se incorpora Firebase, service worker, notificationTag ni presentationVersion a Web. Se conservan SUPER_ADMIN exclusivo, movementContext PROVIDER_ADMIN, referencias privadas en memoria, intenciones durables sin cuerpos sensibles, permisos, paginación e idempotencia.

## Paquete real revisado

- Directorio: `.tmp/b2b-integrator-package-2026-10-26`.
- ZIP: `.tmp/b2b-integrator-package-2026-10-26.zip`.
- SHA256: `a914ace0310c2afa17afde9974ec731f2d75a9fc7e1b4d299be281a2ec6e69c4`.
- Once archivos exactos de allowlist; manifiesto con diez hashes de contenido, versión contractual 1.13.3 y Web 1.11.0. Regeneración determinista comprobada.

El test existente extrae el ZIP real con Expand-Archive y contrasta nombres, bytes, hashes y contrato; comprueba enlaces relativos/anchors y ausencia de secretos o fuentes privadas. No incluye API_ACCESS, OpenAPI interno, informes, logs, .env ni documentación administrativa. Paquete local ignorado por Git y fuera de public/dist; no publicado ni enviado. El paquete antiguo y su evidencia se preservan.

## Ejecuciones nuevas

| Comando | Resultado |
| --- | --- |
| Comparación estructural Node de contratos y schema administrativo | PASS; sólo info.version difiere, schema administrativo idéntico |
| node scripts/sync-public-b2b.mjs --check | PASS |
| node scripts/package-b2b-integrators.mjs | 11 archivos, 1.13.3 |
| node --test scripts/b2b-integrator-package.test.mjs scripts/check-developers-entry.test.mjs | 10/10 PASS, incluida extracción ZIP real |
| npx vitest run src/test/developers.test.tsx src/test/admin-references.test.tsx src/test/admin-reference-access.test.tsx src/test/assistance.test.tsx src/test/assistance-api.test.ts | 118/118 PASS, 5 archivos, 10.61 s: 25 portal + 93 asistencia |
| npm run typecheck:test | PASS |
| npm run lint | PASS |
| npm run build | PASS; aviso conocido de chunk >500 kB |
| node scripts/verify-b2b-integrator-browser.mjs | PASS: 16 recorridos escritorio/móvil, 10 descargas, cero errores y cero peticiones externas/API |
| npx prettier --check scripts/package-b2b-integrators.mjs public/developers/assets/manifest.json | PASS |
| git diff --check | PASS |

Los tests Vitest de asistencia usan mocks. El navegador prueba el build local y bloquea API/red externa; no acredita negocio Nest/PostgreSQL ni aceptación de integradores. El harness cierra navegador/preview. Logs y capturas nuevos en [evidencia](evidence/backend-1133-sync-2026-10-26/); huellas en [manifiesto](backend-1133-sync-evidence.json).

Prettier del OpenAPI generado falla por formato, reproducido también en la copia HEAD 1.13.1. Se conservan ambos logs. No es una regresión de la sincronización: se respeta el formato exacto de la fuente autorizada, sin reescribir masivamente el contrato ni modificar backend. El cambio público sólo afecta info.version. No hubo otros fallos nuevos que corregir.

## Continuidad y límites

Las nueve huellas de la evidencia de aprobaciones pendiente coinciden; sus archivos y el harness se conservan sin cambios en esta tarea. EXISTING_RELEASE, ACCESS_RECOVERED y UNREACHABLE ya están verificados: sus informes históricos no se convierten en pendientes. La revocación de aprobaciones e invalidación material están probadas; no existe TTL temporal de votos en el contrato backend. La expiración del cursor es otra condición.

No se repite HTTP de asistencia ni la suite global: no cambian servicios, schemas funcionales, formularios, permisos o recuperación. Global1597 y HTTP16 anteriores son históricos; las 93 focalizadas aquí sí forman parte de una ejecución nueva de 118. Los resultados backend y Android no se atribuyen a Web. Distribución, disponibilidad remota, aceptación externa, UI Android, TTL temporal y matrices exhaustivas de custodia/economía permanecen fuera de este encargo.

Backend y App sólo lectura; cambios ajenos backend BITACORA.md, docs/OFFER-FCM-DRIVER-AGENT-PROMPT.md y nul preservados. Sin cambios de versión Web, dependencias, configuración, secretos, .env o flags. Sin Docker, commit/push, publicación, envío ni despliegue.

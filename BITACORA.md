# Bitácora Mandaria Web

## 2026-10-13 — Presentación del cierre de ejecución

Checkout: `C:/Users/zorgl/Documents/mandaria-frontend`, rama `QA`, base `2e595048cf62cce4d8ed47ca6ac69140f2012fc8`; limpio al iniciar. AGENTS.md no existe en este checkout. Se revisaron BITACORA, README y VERIFICATION.

- Causa: ExecutionProgress identificaba el paso actual sólo por phase, aun con custodia terminal. Ahora DELIVERED/RETURNED trasladan el resaltado y aria-current="step" al cierre; AT_DROPOFF conserva su significado de último hito y todos los hitos siguen visibles. RETURNED mantiene el texto diferenciado de devolución. Sin cierre, la fase continúa siendo actual incluso sin asignación/acciones: no se infiere entrega.
- Archivos: src/execution/components.tsx, src/test/execution.test.tsx, scripts/verify-execution-terminal.mjs, BITACORA.md y VERIFICATION.md. Se reutiliza el CSS existente. Revisión estática de consumidores: dispatch/pages.tsx (proveedor), dispatch/admin.tsx (administración), driver-portal/pages.tsx (repartidor/independiente), execution/incidents.tsx (incidencias), directamente o mediante ExecutionPanel. Sin cambios de permisos, operaciones, historial ni contratos.
- `npx vitest run src/test/execution.test.tsx`: archivo completo, 40/40 aprobadas (tres casos nuevos: entregado, devuelto y transición desde destino sin entrega).
- `npx eslint src/execution/components.tsx src/test/execution.test.tsx scripts/verify-execution-terminal.mjs`: aprobado.
- `npm run typecheck:test`: aprobado. `npm run build`: TypeScript y Vite aprobados; advertencia de chunk mayor de 500 kB, existente.
- `node scripts/verify-execution-terminal.mjs`: Chromium con fixtures del componente, 1440 y 390 px. Un único aria-current coherente por estado, sin errores de render ni desbordamiento. Capturas revisadas: test-results/execution-terminal/1440.png y 390.png. Lista semántica conservada; no se añadieron controles ni tabulaciones artificiales.
- Límites: evidencia nueva frontend sintética, separada de las verificaciones históricas siguientes. No acredita integración backend, pantallas completas con sesión, lector de pantalla, móvil físico ni VM. No se consultó ni entregó MDR-000002; no se modificaron servicios reales. Servidor visual temporal detenido. Sin backend, configuración, commit, push o despliegue.

## Estado actual — 2026-10-12

Checkout principal `C:/Users/zorgl/Documents/mandaria-frontend`, **QA** sobre `a5fe19a6c0375207e552f1b04580ba7bbe04b3e7`. Aprobación manual de cuenta Negocio implementada localmente contra el contrato backend publicado `9ad39b9`. Índice sin cambios preparados. Sin commit/push/despliegue.

### Solicitud

Implementar y validar el contrato comercial aprobado, manteniendo los cambios anteriores del logo/diseño/documentación y la continuidad logística V1.17/V1.18.

### Cambios

Nuevo módulo interno customer-business, solicitud e historial propios, decisión/acceso administrativo SUPER_ADMIN, registro/anexión Personal, orientación de token REGISTER antiguo y descenso por Receipt. Recuperación comercial separada de logística, marcadores mínimos, sesiones aisladas, exact replay sólo con cuerpo original, GET/close y refresco de estado actual. Nuevas rutas y CTA `/customer/business`.

### Verificaciones y resultado

155 pruebas frontend distintas en 11 archivos focalizados, TypeScript, lint pertinente y build aprobados; revisión Chromium con API sintética a 1440/390 y registro/perfil a 1440/1000/390, teclado y capturas locales. Resultados y comandos en [VERIFICATION](VERIFICATION.md). No prueba real de backend/DB/VM; 69/69 backend se conserva sólo como antecedente publicado.

### Pendientes y límites

Responsables del entorno deben comprobar backend compatible/migración46 y despliegue; ninguna activación realizada aquí. Aviso de tamaño de chunk Root (~763 kB) conservado. No hay cambio backend solicitado o incompatibilidad bloqueante demostrada por la revisión estática. Protección de marcadores limitada al navegador/origen, autoridad final backend.

### Continuidad preservada

BITACORA no existía en la raíz al comenzar; el historial anterior permanece en README, VERIFICATION, docs/V1.17-WEB y la propuesta comercial, ahora rotulada como histórica. Procedimiento y archivos en [implementación](docs/BUSINESS-APPROVAL-WEB-PROPOSAL.md).

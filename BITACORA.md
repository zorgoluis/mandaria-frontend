# Bitácora Mandaria Web

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

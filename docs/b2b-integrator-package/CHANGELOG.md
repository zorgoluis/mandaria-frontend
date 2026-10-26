# Borrador para revisión — no enviado/no publicado

## Cambios y compatibilidad — 2026-10-25

Dos comparaciones diferentes:

1. El portal local tenía OpenAPI 1.12.0 con las mismas 20 operaciones, pero faltaban IntegrationMeResponse.automaticDispatchSearch, DispatchSearchResponse y DeliveryStatusResponse.search. Se sincroniza con el contrato público vigente y su guía. Esto corrige atraso documental; no crea una capacidad nueva.
2. Según la revisión de contrato backend 1.13.0 → 1.13.1, sólo cambió info.version. Salida de flotilla y asistencia no agregaron APIs B2B. La búsqueda automática no nació en 1.13.1. No hay eventos nuevos de desvinculación o conciliación; delivery.completed conserva su contrato y no comunica anuncios de versiones.

### Acción del integrador

Revisar los schemas descargados y conservar aceptación separada de asignación. automaticDispatchSearch es política de admisión por integración, no garantía para cada MDR. Cuando search existe, SEARCHING/RETRY_PENDING mantiene status OPEN y la misma MDR. Consultar esa referencia; no crear reemplazos por timeout o contador local. Hasta cinco rondas; agotamiento EXPIRED/EXHAUSTED según política vigente. MQ, precio, vencimiento y consentimiento no se renuevan automáticamente. Ausencia de search conserva comportamiento legacy.

Conservar autenticación servidor a servidor, permisos explícitos, idempotencia estable y MPQ → MDR/MQ → consentimiento → aceptación. Revisar REQUESTER/RECIPIENT y hashes exactos de términos; declaración de efectivo no es liquidación verificada. Ubicación no acredita custodia ni entrega. No hay nueva garantía de precio, capacidad, plazo o activación. Verificar entorno y scopes acordados antes de probar.

Las únicas adaptaciones editoriales de las cinco fuentes son destinos de enlaces relativos hacia secciones públicas existentes. Los schemas, cuerpos de ejemplos y código del verificador no se alteran. Se corrigen enlaces sin distribuir documentación interna.

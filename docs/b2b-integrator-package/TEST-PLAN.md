# Borrador para revisión — no enviado/no publicado

## Plan de integración con datos sintéticos

Plan pendiente de ejecución funcional en un entorno acordado. Las comprobaciones locales del paquete son documentales/UI y criptográficas en memoria; no sustituyen estos recorridos. Provisionar credenciales por separado, confirmar entorno/scopes y generar datos ficticios específicos. Nunca ejecutar fechas/contactos/IDs del ejemplo tal cual. No llamar producción automáticamente.

| Caso | Preparación y resultado esperado |
| --- | --- |
| Token/scopes | Emitir token servidor a servidor con credencial de prueba; confirmar expiración/renovación por nueva emisión, ausencia de refresh token B2B, rechazo de scope faltante, token expirado y credencial revocada. No registrar secretos. |
| Ownership | Una MDR de otro cliente no se revela; no usar JWT humano ni APIs administrativas para completar datos. |
| MPQ → conversión | Congelar condiciones físicas, persistir key/cuerpo por operación, convertir vigente a una MDR/MQ, conservar precio y expiración; confirmar que externalReference no garantiza unicidad. |
| Consentimiento/aceptación | Obtener consentimiento sobre MQ exacta. REQUESTER requiere términos/hash de MDR y autorización v2; RECIPIENT mantiene reglas vigentes. Aceptación no acredita asignación ni cobro. |
| Respuesta perdida/idempotencia | Simular pérdida después del efecto; reenviar misma key/cuerpo, recuperar vínculos y estado. No cambiar authorizedAt ni generar otro pedido. Probar key con contenido incompatible y concurrencia. |
| Vencimiento/recuperación | Reconciliar MDR/MQ; confirmar cancelación y ausencia de entrega antes de reemplazo comercial autorizado. No recotizar ni renovar consentimiento automáticamente. |
| Búsqueda | Integración habilitada: SEARCHING/RETRY_PENDING con OPEN sobre la misma MDR, hasta cinco rondas, EXPIRED/EXHAUSTED al agotarse. Probar detención/cancelación, errores y retrasos; el contador local no decide. Integración legacy: ausencia de search. |
| Webhook/firma | Capturar Buffer original antes del parser, validar timestamp/firma y sobre/cabeceras. Rechazar tamper, reserialización, clave errónea y timestamp fuera de ventana elegida por receptor. No es receptor completo. |
| Webhook/durabilidad | Persistir eventId único y recepción durable antes de 2xx, procesar idempotentemente, probar duplicados concurrentes/rollback y pérdida de respuesta posterior al commit. 2xx no acredita procesamiento comercial; no prometer exactamente una vez. |
| Webhook/reintentos | Ver guía: máximo cinco intentos automáticos, esperas mínimas 1min/5min/15min/1h; timeout/red/408/425/429/5xx reintentables, 409 y redirects terminales. Reconciliar por GET status; conservar publicVersion, no ordenar por llegada. |
| GPS/tracking | Confirmar ownership y scopes adicionales. Probar ausencia de señal/legacy, caducidad y eliminación local de posición, versiones separadas, emisión única de URL, replay sin secreto y consulta de intento con actor/clave/revisión originales. Sin logs de URL/token; no envío externo automático. |
| Presupuesto de consulta | Compartir polling desde backend, backoff/jitter, 429/Retry-After, detener en terminal confirmado y no fabricar capacidad/SLA. |

Registrar por caso versión/entorno acordado, datos sintéticos, resultado y correlación sanitizada. No adjuntar cuerpos con personas, tokens ni expedientes. Entrega física, GPS, declaración de efectivo y liquidación son hechos distintos. Bloqueos y disponibilidad remota permanecen por confirmar hasta prueba autorizada.

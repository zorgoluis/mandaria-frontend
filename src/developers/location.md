## GPS y enlaces temporales — implementación local, sin disponibilidad productiva acreditada

La API base confirmada es https://mandaria.com.mx/api/v1. Los paths del JSON descargable ya incluyen /api/v1; su servers.url es el origen sin ese prefijo.

Desde tu backend, con ownership de la IntegrationClient:

| Operación (sufijo de /delivery-requests/{publicId}) | Scopes requeridos                                  |
| --------------------------------------------------- | -------------------------------------------------- |
| GET /location                                       | deliveries:read + deliveries:location:read         |
| GET /tracking-link                                  | deliveries:read + deliveries:tracking-links:manage |
| POST /tracking-link                                 | mismos permisos de gestión                         |
| POST /tracking-link/revoke                          | mismos permisos de gestión                         |
| GET /tracking-link/attempt                          | mismos permisos de gestión                         |

Los scopes son explícitos; nunca se conceden automáticamente. No enviar credenciales B2B al navegador.

La fotografía contiene progress, location y observation. Comparar publicVersion, locationVersion y assignmentGeneration como BigInt, por solicitud y audiencia. No mezclar fotografías. La generación es opaca, no cuenta asignaciones. Sólo usar sample con availability=AVAILABLE y antes de eraseAfter. Hasta freshUntil es reciente; después, desactualizada. Retirar posición al caducar, transferir, abrir incidencia, perder autorización o confirmar terminal; legacy y ausencia de señal no fabrican ubicación. El titular ve desde TO_PICKUP; el destinatario desde PICKED_UP. No se ofrecen rutas, ETA ni historial GPS.

### Enlace y recuperación

POST /tracking-link y /tracking-link/revoke requieren Idempotency-Key UUID y un cuerpo con expectedLinkRevision decimal de la metadata vigente. La primera emisión responde201 con URL; replay200 sin secreto. No guardar token/URL en logs, cachés ni almacenamiento persistente. Copiar/compartir sólo por decisión explícita.

Tras respuesta perdida, conservar actor de credencial, MDR, operación ISSUE/REVOKE, clave y revisión originales. Consultar GET /tracking-link/attempt con la clave original en cabecera y query operation y expectedLinkRevision. Nunca emitir automáticamente.

- APPLIED_SECRET_UNAVAILABLE: emisión acreditada, secreto irrecuperable.
- APPLIED_REVOKED: revocación histórica acreditada.
- PENDING_OR_UNKNOWN: mantener bloqueo.
- SUPERSEDED: el POST con revisión original ya no puede aplicar después; no acredita ausencia histórica de efectos ni revocación actual.

Siempre consultar metadata vigente tras reconciliar. Otra credencial del mismo cliente no puede acreditar el recibo de la anterior. El cierre técnico es POST /tracking-link/revoke con revisión actual, nueva UUID y confirmación. No existe /close. Un409 requiere consultar y decidir nuevamente; no forzar una revocación sobre un enlace posterior. Un timeout mantiene incertidumbre. Revocar no modifica entrega ni pagos.

### Consulta responsable

Objetivo15s, sujeto a cuotas agregadas: compartir resultados en tu backend, evitar solapamiento, aplicar backoff/jitter y respetar Retry-After. Pausar entregas no observadas; detener al confirmar terminal y retirar coordenadas localmente aunque no llegue otra respuesta. No se acredita capacidad simultánea medida. Conservar delivery.completed y reconciliar por consulta: no hay nuevos webhooks GPS.

Usar el OpenAPI público descargable revisado. No se publican operaciones humanas, Driver, shared o administrativas. APP DRIVER y condiciones operativas continúan pendientes.

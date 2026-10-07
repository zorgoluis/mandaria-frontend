## Consulta autorizada desde tu servidor

`GET https://mandaria.com.mx/api/v1/delivery-requests/{publicId}/status` requiere Integration Bearer y `deliveries:read`. Sólo permite consultar MDR propias; una ajena o inexistente responde 404. La respuesta usa `Cache-Control: private, no-store`. El origen publicado en el contrato no acredita que esta ampliación esté desplegada: está disponible en el checkout QA, pendiente de despliegue.

Conserva en tu backend la relación pedido ↔ MDR y la última fotografía/version. `externalReference` no es única. Comparte únicamente la proyección pública con tus usuarios autorizados, nunca tokens B2B, secretos ni el detalle MDR con contactos. No consultes endpoints internos para completarla.

## Campos y presentación

| Campo             | Contrato e interpretación                                                                                                                                                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `publicVersion`   | String decimal positivo, patrón `^[1-9][0-9]*$`. Durable y monotónico por MDR; admite saltos.                                                                                                                                                  |
| `trackingMode`    | `LEGACY`: tuvo asignación sin ejecución detallada. `DETAILED`: ejecución detallada persistida. `null`: nunca tuvo asignación. Conserva la clasificación al finalizar.                                                                          |
| `assignmentState` | `NONE`: nunca asignado. `ACTIVE`: asignación vigente. `ENDED`: hubo asignación y ninguna está vigente.                                                                                                                                         |
| `terminalOutcome` | `null` antes del final; después `{type, occurredAt}`. `type`: `DELIVERED`, `RETURNED_TO_ORIGIN`, `CANCELLED` o `EXPIRED`. `occurredAt`: ISO8601 o `null` si falta evidencia histórica. El resultado permanece disponible después de finalizar. |

Campos ausentes, carga o errores no significan LEGACY ni autorizan inventar una versión. Ante un servidor antiguo, informa que el contrato versionado no está disponible y reconcilia tras su actualización coordinada. No borres la última fotografía válida.

En DETAILED, `executionProgress` contiene `phase`, `revision`, `registeredAt`, `attentionRequired`. Las cinco fases son `TO_PICKUP` (En camino a recoger), `AT_PICKUP` (En recogida), `PICKED_UP` (Pedido recogido), `TO_DROPOFF` (En camino al destino), `AT_DROPOFF` (En destino); `phase` puede ser `null` antes del primer hito. Al terminar, `executionProgress=null`. En legacy se omiten progreso y resultado detallados: no inventes hitos ni fechas.

`ASSIGNED` también puede representar proveedor a cargo sin repartidor (`trackingMode=null`, `assignmentState=NONE`). `driver=null` puede significar identidad no publicada, no ausencia de asignación. Con `assignmentState=ENDED`, el último progreso no representa a un repartidor vigente en movimiento.

## Descartar respuestas atrasadas

Compara **publicVersion con BigInt**, nunca con Number, float, orden lexicográfico, fecha de recepción ni `executionProgress.revision`. Una versión menor se descarta; igual representa la misma fotografía JSON (sin importar el orden de claves) y no repite efectos; mayor reemplaza la fotografía completa. La fase puede reiniciarse legítimamente por reasignación con una versión mayor.

Este ejemplo JavaScript es sólo para el backend del integrador, después de validar la respuesta completa contra el contrato. No envía peticiones ni ejecuta acciones comerciales:

```javascript
function shouldReplace(previous, incoming) {
  const validVersion = (value) =>
    typeof value === 'string' && /^[1-9][0-9]*$/.test(value)
  if (!validVersion(incoming.publicVersion)) return false
  if (!previous) return true
  if (previous.publicId !== incoming.publicId) return false
  if (!validVersion(previous.publicVersion)) return false
  return BigInt(incoming.publicVersion) > BigInt(previous.publicVersion)
}
```

Serializa lectura, comparación y persistencia por MDR en tu servidor; el ejemplo aislado no proporciona bloqueo distribuido. No compares versiones entre MDR distintas ni tras una restauración que perdió historia. Una restauración requiere reconciliación operativa, no aceptar silenciosamente versiones menores.

## Ejecutor e incidencias

`execution` conserva `mode` (`PROVIDER` o `INDEPENDENT`) y `provider`/`driver`, cada uno con `{displayName}` autorizado o `null`. Son nombres de presentación, no identificadores únicos. Durante ASSIGNED se muestra el ejecutor vigente: una transferencia sustituye la identidad por la receptora. No implica otra recogida ni otro cargo.

Al retirar la asignación se retira la identidad vigente del repartidor; puede permanecer el proveedor. Tras release, `execution=null`. DELIVERED conserva la identidad pública congelada al cierre. CANCELLED/RETURNED ocultan nombres y pueden conservar modo; OPEN/EXPIRED no presentan ejecutor. No se publican teléfonos, vehículo, IDs internos, actores, motivos privados ni confirmaciones administrativas.

`attentionRequired=true` significa «Requiere atención operativa»; la custodia continúa. No detengas el seguimiento por una incidencia. La devolución confirmada se presenta como **Devuelto al origen**: `status=CANCELLED`, `deliveredAt=null`, `executionProgress=null`, `executionOutcome` y `terminalOutcome` con `RETURNED_TO_ORIGIN`; `assignmentState=ENDED`, `trackingMode=DETAILED`. La fecha física `occurredAt` puede diferir del registro `cancelledAt`.

`POST /api/v1/delivery-requests/{publicId}/cancel` (`deliveries:cancel`) puede rechazar con 409 `CUSTODY_OPERATION_FORBIDDEN` o `CUSTODY_INCIDENT_OPEN`. Conserva la misma MDR, consulta su estado y escala al operador por el canal acordado. No libera custodia ni permite crear automáticamente otro envío. Ante timeout, consulta esa misma MDR/status y el detalle cuando corresponda: no inventes éxito. Una cancelación administrativa no niega una entrega física que continúa DELIVERED; aplica el protocolo de cancelación definitiva antes de reemplazar un servicio convertido.

Entrega, devolución, transferencia y cancelación no acreditan cobro ni reembolsos automáticos.

## Consulta compartida, frecuencia y errores

Mantén una sola petición en vuelo por MDR en el backend del integrador, compartida entre usuarios. Objetivo de **15 segundos** para entregas activas observadas; REQUESTED/OPEN o segundo plano pueden usar 60 segundos. Añade jitter y un presupuesto agregado: no abras un sondeo por pantalla.

No es tiempo real, SLA ni capacidad garantizada. El límite implementado es 100 consultas/minuto por manejador/IP, compartido entre MDR y posiblemente integraciones detrás del mismo proxy, con almacenamiento en memoria; no es una cuota distribuida por cliente. A 15 segundos cada MDR usa 4 consultas/minuto; 25 activas consumen 100 sin margen. Ajusta frecuencia y concurrencia al tráfico real, sin asumir capacidad para todas a ese intervalo.

| Resultado                         | Tratamiento                                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 401                               | Renovación coordinada del token B2B una vez; si persiste, escalar. No hay refresh token B2B.                                  |
| 403 / 404                         | Revisar permisos o MDR; no interpretarlo como cancelación.                                                                    |
| 429                               | Respetar `Retry-After` si viene y reducir presión agregada.                                                                   |
| Red / timeout / 5xx, incluido 503 | Backoff 15 → 30 → 60 → 120 segundos con jitter. Conservar última fotografía y mostrar falta de frescura.                      |
| Otros errores                     | Conservar `code`, `statusCode`, `requestId`/`X-Request-Id` para diagnóstico sin secretos; revisar causa, no repetir a ciegas. |

Ningún error de consulta ordena reenviar operaciones físicas. Detén el sondeo periódico al confirmar `terminalOutcome` no nulo en una fotografía válida y aceptada por versión. Conserva resultado y versión; se permite consulta explícita posterior. No pares por timeout, incidencia o respuesta incompleta. EXPIRED corresponde al servicio OPEN vencido, no a la MPQ/MQ; una cancelación posterior puede cambiarlo a CANCELLED con versión mayor sin reabrir el reparto.

## delivery.completed continúa igual

Se conserva `delivery.completed`, su sobre, firma y payload congelado; **no incluye los cuatro campos nuevos**. Deduplica `eventId` duraderamente y consulta `/status` para reconciliar. No compares `eventId` ni la fecha del webhook con `publicVersion`; un webhook atrasado no debe degradar la fotografía. Una devolución no se anuncia como entrega.

No se agregan timeline, GPS ni webhooks de progreso. Consulta la [guía de firma y recepción](B2B-WEBHOOKS.md) y el [contrato público descargable](openapi-b2b.json).

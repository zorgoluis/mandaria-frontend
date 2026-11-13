# Borrador para revisión — no enviado/no publicado

## Matriz de disponibilidad

«Comprobada localmente» en este paquete significa validación de contrato, portal y artefactos con red externa bloqueada; no implica ejecutar operaciones B2B contra un servicio. Ninguna celda se completa por inferencia a partir del dominio documentado.

| Capacidad | Documentada | Comprobada localmente en esta entrega | Habilitada por integración | Entorno remoto |
| --- | --- | --- | --- | --- |
| Token y scopes B2B | Sí | Contrato/visor; servicio no ejercitado | Por confirmar; credencial y scopes vigentes | Por confirmar |
| MPQ/conversión/consentimiento/aceptación | Sí | Ejemplos JSON y contrato; flujo HTTP no ejercitado | Por confirmar; capacidades separadas | Por confirmar |
| Búsqueda automática/search | Sí, opcional hasta cinco rondas | Schemas, textos y compatibilidad legacy | Por confirmar; admisión y opt-in explícitos | Por confirmar |
| Estado versionado/recuperación | Sí | Referencia y ejemplos locales | Por confirmar; ownership y deliveries:read | Por confirmar |
| Pagador/términos de envío | Sí | Contrato público y guía | Por confirmar; política configurada, sin override por pedido | Por confirmar |
| delivery.completed | Sí | Guía y firma sintética en memoria | Por confirmar; destino y secreto independientes | Por confirmar |
| GPS/enlace temporal | Sí | Scopes, contrato y guía; no GPS real | Por confirmar; scopes explícitos y capacidades habilitadas | Por confirmar |

Entorno de acceso, destinatario, soporte, canal y fecha de disponibilidad: por confirmar. No se inspeccionó producción ni se crearon cuentas o activaron flags para llenar esta matriz. Las cifras de suites históricas backend no representan nuevas pruebas Web ni pruebas de un receptor externo.

# Borrador para revisión — no enviado/no publicado

## Comunicación propuesta a integradores existentes

Destinatario, canal, entorno, soporte y fecha de disponibilidad: por confirmar.

Preparamos una sincronización de documentación Mandaria B2B: contrato público, guía, ejemplos y verificación de firma. El portal local estaba atrasado en la representación de búsqueda automática opcional; la búsqueda no es una novedad creada por el paquete backend 1.13.1. Entre los contratos backend revisados 1.13.0 y 1.13.1 sólo cambió info.version.

Para integraciones habilitadas, consulten la misma MDR mientras search indique SEARCHING/RETRY_PENDING y status permanezca OPEN. No creen reemplazos por timeout o contador local; precio, MQ y consentimiento no se renuevan automáticamente. Si search está ausente, conserven el comportamiento legacy. Revisen los schemas y validen con datos sintéticos en el entorno que se acuerde.

Salida de flotilla/asistencia no agregaron APIs públicas ni eventos B2B. delivery.completed conserva su propósito y firma. El documento no activa capacidades ni acredita despliegue; confirmaremos permisos y disponibilidad antes de pruebas funcionales. Credenciales se provisionan separadamente, nunca en este paquete.

## Orientación para integradores nuevos

Comenzar por README y matriz de disponibilidad; acordar entorno, contacto de soporte y scopes antes de recibir credenciales por el procedimiento autorizado. Implementar sólo servidor a servidor y seguir MPQ → MDR/MQ → consentimiento → aceptación. Completar el plan sintético y la recepción durable/deduplicada de webhooks. El verificador de firma es ilustrativo, no un receptor completo. No ejecutar los ejemplos fechados ni compartir secretos en navegador, mensajes o repositorios.

## Pendiente antes de distribuir

Revisión del propietario, destinatario/canal, entorno y capacidades habilitadas, soporte, fecha de disponibilidad, política de acceso/pruebas y autorización explícita para publicar o enviar. Preparar este texto no autoriza email, mensajes, webhook de anuncio ni descarga pública del ZIP.

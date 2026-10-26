# Borrador para revisión — no enviado/no publicado

## Inicio e índice

Contrato público Mandaria B2B 1.13.3. Actualización documental del paquete backend; sin nuevas operaciones HTTP B2B. Esta versión del paquete backend no sustituye las versiones funcionales de consentimiento, términos, GPS o seguimiento; la versión Web no se modifica. El servidor documentado es https://mandaria.com.mx y las rutas OpenAPI ya contienen /api/v1. No concatenar dos veces el prefijo ni usar el origen del portal como API. No acredita despliegue ni autoriza peticiones remotas.

- [OpenAPI público](openapi-b2b.json): importar sin ejecutar solicitudes automáticas.
- [Guía pública](B2B-PUBLIC-GUIDE.md): autenticación, MPQ → MDR/MQ → consentimiento → aceptación y recuperación.
- [Webhooks](B2B-WEBHOOKS.md): firma, recepción durable, duplicados y reconciliación.
- [Ejemplo de flujo](examples/b2b-flow.json): datos ilustrativos; no reutilizar fechas, IDs o contactos automáticamente.
- [Verificador de firma](examples/verify-mandaria-webhook.mjs): verifica bytes originales, no es un receptor completo.
- [Cambios](CHANGELOG.md), [disponibilidad](AVAILABILITY.md), [pruebas](TEST-PLAN.md) y [comunicación propuesta](COMMUNICATION.md).
- [Manifiesto y SHA256](manifest.json): comprobar archivos antes de revisión/distribución.

Credenciales de integración y firma se provisionan por separado mediante el procedimiento autorizado. No se generan ni entregan aquí. No guardar clientSecret, tokens B2B ni secretos webhook en navegador o App. Destinatario, canal, soporte, entorno y fecha de disponibilidad: por confirmar.

Las referencias documentales cuyo contenido completo no está aprobado para distribución se resuelven a resúmenes ya presentes en la guía pública. No se incluyen handoffs, OpenAPI humano/administrativo, fixtures, bitácoras ni informes internos. La presentación local fue comprobada; disponibilidad funcional remota y aceptación de un integrador externo siguen por confirmar.

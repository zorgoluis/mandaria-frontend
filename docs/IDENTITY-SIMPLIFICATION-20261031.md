> Actualización31/10/2026: bloqueo resuelto en fuentes backend locales; integración Web completada. Se conservan debajo el diagnóstico y la solicitud originales. Ver BITACORA/VERIFICATION y docs/evidence/identity-optional-web-20261031.

# Simplificación de identidad — bloqueo de contrato

El usuario solicita retirar ciudad de operación (la cobertura se autoriza por zonas) y, si no es necesario, emisor de licencia. También solicita vencimiento sólo como fecha.

## Implementado en Web

- Licencia solicita `date`; fecha nueva se convierte a 23:59:59.999 local del navegador y luego UTC. Si no cambia la fecha, se conserva el instante guardado.
- Ayuda de emisor: autoridad que expidió la licencia según el documento.

## Pendiente de backend

Consulta de sólo lectura de `mandaria-backend/src/verification/verification-rules.ts`: `identityData` exige `operatingCity: short` y, al declarar licencia, `license.issuer: short`. `short` requiere texto no vacío. `parseData` rechaza la omisión con HTTP400 `VERIFICATION_DATA_INVALID`. `verification.responses.ts` y `verification.dto.ts` también describen el contrato actual.

No se retiraron esos inputs para evitar romper el guardado ni introducir valores inventados. La zona autorizada no se convierte automáticamente en una ciudad declarada, ni identifica a la autoridad emisora.

Se necesita un contrato compatible que permita omitir ciudad y una decisión de dominio sobre emisor. Debe conservar los expedientes históricos, permitir edición de nuevos borradores sin los campos retirados, y actualizar schemas/DTO/OpenAPI y pruebas. Web podrá entonces retirar inputs, ajustar `IdentityData` y el checklist que actualmente exige ciudad, sin borrar datos históricos. No se modificó backend ni se enviaron mensajes externos.

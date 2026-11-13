# Contraseñas nuevas de 8–128 caracteres

2026-11-03. Web 1.11.0; cambios locales sobre main/171c851. Backend consultado en sólo lectura: política común y DTO de login, invitaciones, registro independiente y CUSTOMER. [Huellas de fuentes](evidence/password-policy-20261103/backend-sources.json). No se modifican hashes, usuarios existentes, Argon2id, tokens, límites de intentos ni revocación de sesiones.

## Implementación

`src/auth/password-policy.ts` centraliza mínimo8/máximo128, ayuda y validación de nuevas contraseñas sin reglas de composición. Cuenta puntos de código Unicode y conserva el string exacto, sin trim ni normalización. HTML cuenta unidades UTF-16: permite hasta256 unidades para admitir128 caracteres suplementarios; antes de cualquier API se exige el rango de8–128 caracteres. El límite HTML no sustituye la validación. El error local tipado se muestra en los formularios genéricos y documentales sin exponer errores backend arbitrarios.

Consumidores: `auth/ActivateAccount.tsx`, `verification/identity.tsx` y `customer/identity.tsx` (REGISTER/RESET). `invitations/types.ts` reexporta los límites para compatibilidad. `verification/format.ts` reconoce únicamente el error local de política. Activación conserva confirmación exacta. Los flujos que no tenían segundo campo no incorporan uno nuevo. Login y comprobación de contraseña actual no usan el mínimo nuevo. No cambian APIs ni almacenamiento de secretos.

Actualizado el selector de etiqueta en `scripts/verify-independent-live.mjs`; no se ejecutó ese harness contra el entorno compartido. No quedan referencias activas de16–128 en src/scripts; documentación histórica conserva su contexto.

## Evidencia nueva

`npm test -- src/test/invitations.test.tsx src/test/verification-pages.test.tsx src/test/customer.test.tsx src/test/customer-contact.test.tsx src/test/flows.test.tsx`: **232/232, cinco archivos,29.70 s**. [Salida](evidence/password-policy-20261103/tests.txt). Pruebas con dobles de servicio y jsdom; no HTTP real ni navegador remoto.

Casos de longitud7/8/15/16/128/129 en activación, independiente, confirmación CUSTOMER y RESET. Letras solas, ceros, símbolos, espacios preservados y Unicode; rechazo previo a API fuera de rango. Login histórico de menos de8 conserva espacios/ceros. Regresiones de confirmación, errores backend, invitación inválida/reutilizada/expirada/revocada, acceso CUSTOMER rechazado, privacidad de secretos y cierre de sesión tras RESET. Nuevos casos compartidos en `password-policy-fixtures.ts`; no secretos reales.

Primera corrida223/230: siete fallos porque los formularios genéricos ocultaban el Error local; segunda226/230: cuatro fallos porque el formateador documental ocultaba ApiError local. Resuelto con PasswordPolicyError explícito y presentación controlada. No cambios de timeouts, pruebas omitidas ni permisos. Log inicial local: test-results/password-policy-initial.txt. Última corrida íntegra PASS.

Comprobaciones: `npx tsc --project tsconfig.test.json`, `npm run lint`, `npm run build` (incluye `tsc -b`) y `git diff --check`. Salidas en [directorio de evidencia](evidence/password-policy-20261103). No se ejecutó suite global; resultados anteriores no se atribuyen a esta entrega.

## HTTP pendiente

GET de sólo lectura a la instancia sintética documentada `http://127.0.0.1:37795/api/v1/verification-requirements`: conexión rechazada por destino. No se obtuvo contrato/build efectivo ni se operaron cuentas. No se reinició, resembró ni sustituyó el entorno. Para acreditar HTTP requiere una instancia sintética autorizada disponible con la política8–128 y correo/outbox local; verificar activación, confirmaciones y recuperación con identidades dedicadas. Una instancia anterior puede seguir exigiendo16 hasta publicar el backend actualizado.

Las20 unitarias backend y resultado parcial22/24 WSL del handoff son evidencia ajena, no ejecuciones Web ni PASS global. Sin backend/Driver, datos reales, .env, versión, commit/push, despliegue ni mensajes externos.

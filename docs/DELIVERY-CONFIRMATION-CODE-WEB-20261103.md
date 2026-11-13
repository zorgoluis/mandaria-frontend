# Código de entrega: integración Web local

2026-11-03. Web1.11.0, base c7c1e8f. Contrato backend1.0.0 consultado en sólo lectura junto con handoff, verificación y OpenAPI; [hashes de fuentes](evidence/delivery-confirmation-web-20261103/backend-sources.json). No acredita disponibilidad en una instancia ni despliegue.

## Implementación

- CUSTOMER titular: `customer/DeliveryCode.tsx`, `delivery-code.css`, `service.ts`, `contract.ts`, `pages.tsx`. Sección dentro del detalle; consulta explícita a GET `/api/v1/customer/delivery-requests/:publicId/delivery-code`. String sin convertir, conserva ceros. Instrucciones de compartir al recibir y de comunicarlo al destinatario cuando sea otra persona. No se integra lectura B2B ni se amplían roles/scopes.
- Sólo memoria del componente, sin React Query para el secreto, sin storage, URL, logs ni analytics. Transporte existente `apiOnce` usa no-store, AbortSignal y recuperación de sesión existente. Se oculta al salir, cambiar cuenta/solicitud, expirar sesión, perder autorización, recibir terminalidad o desenfocar la ventana. Abort y sessionFence impiden mostrar respuestas tardías. Las consultas autorizadas de detalle/estado conservan su polling existente; terminalidad se conoce al recibir esa proyección, no por un evento inventado.
- Errores404/401/403 y409 NOT_REQUIRED/UNAVAILABLE no exponen detalle interno ni inventan/regeneran código. Ausencia de metadato muestra «Confirmación no informada», sin habilitar cierre por inferencia.
- `execution/delivery-confirmation.ts`, `types.ts`, `components.tsx`: metadatos opcionales para lectura histórica, validación y presentación separada de REQUIRED/NOT_REQUIRED y CODE_VERIFIED/ADMIN_ASSISTED. Asistencia nunca se representa como código verificado. Se conserva el tipo numérico contractual de expectedRevision.
- `driver-portal/execution.tsx`: campo string dentro del diálogo después de AT_DROPOFF y con DELIVER permitido. Exactamente seis dígitos ASCII; no trim, conversión, relleno ni validación remota previa. NOT_REQUIRED omite deliveryCode. Antes del POST se vuelve a consultar ejecución y verificar asignación, revisión, fase, permisos y política. Se conservan hitos, custodia y condiciones de cobro. `components/ui.tsx` permite contenido opcional dentro de Confirm para que el campo sea accesible dentro del modal.
- Campo temporal aislado por actor, servicio, asignación, revisión y metadatos; desaparece al cambiar contexto/cerrar sesión. Se vacía al confirmar/cancelar. Marcador durable conserva sólo actor, dispatchId, assignmentId, operación y UUID. No se conserva cuerpo/código para replay ni se reconstruye otro cuerpo con la clave previa.
- Ante respuesta incierta o rechazo se recupera el marcador por GET/POST close del intento DELIVER con la misma Idempotency-Key. REJECTED no aplica entrega, no se convierte en CLOSED_NO_EFFECTS y sólo permite reconocer/liberar el marcador si `canStartNewAttempt=true` y `retryAfter=0` después de refrescar. La corrección posterior crea otra intención/clave. Si hay pausa, se informa espera y se exige consulta explícita; el reloj no envía ni desbloquea otra mutación automáticamente. El backend sigue siendo autoridad del contador global y de los cinco errores/cinco minutos.
- Manejo de REQUIRED/INVALID_FORMAT/VALIDATION_ERROR, MISMATCH, ATTEMPTS_BLOCKED con Retry-After, clave reutilizada y conflictos existentes. APPLIED refresca estado sin segundo POST ni inferir método en recibos históricos. La respuesta OpenAPI DriverAttemptResponse no incluye cuerpo del recibo de cierre: no se inventa ese campo ni se reemplaza la proyección vigente por un resultado histórico.
- `execution/commands.ts` reconoce también REJECTED en recuperación de comandos Driver anteriores. `driver-portal/pages.tsx` conserva cierre legacy sólo con NOT_REQUIRED explícito y comprueba nuevamente modalidad/propiedad/asignación antes del envío. No se habilita legacy REQUIRED ni se añaden atajos al menú Driver.
- `driver-portal/attempt-api.ts` revisado: corresponde exclusivamente a TAKE/RELEASE y usa `canPrepareNewAttempt`. No se amplía con REJECTED porque este contrato aplica a ejecución DELIVER, con `canStartNewAttempt`. Resoluciones administrativas y otros tipos quedan intactos.

## Pruebas nuevas y regresión

Comando final:

```text
npx vitest run src/test/delivery-confirmation.test.tsx src/test/delivery-code-api.test.ts src/test/driver-portal.test.tsx src/test/execution.test.tsx src/test/customer.test.tsx src/test/customer-reconciliation.test.tsx src/test/customer-tracking.test.ts src/test/independent-operations.test.ts src/test/execution-attempt-service.test.ts
```

**188/188 pruebas, nueve archivos,18.58 s**. [Salida](evidence/delivery-confirmation-web-20261103/tests.txt). Todas con transporte/servicios simulados. Las pasadas previas163/167 no se suman ni representan nuevas pruebas HTTP. No suite global en este encargo.

| Área | Cobertura local |
|---|---|
| Lectura privada | CUSTOMER, roles excluidos, ceros,404,401,403,terminal/histórico, no-store, aborto y URL sin secreto |
| Ciclo de vida | Cambio cuenta/solicitud, expiración sesión, respuesta tardía, código fuera de storage y caché |
| Cierre | REQUIRED/NOT_REQUIRED/ausente, longitudes5/7, espacios, dígitos no ASCII, envío exacto, revisión/asignación/fase/permiso actualizados |
| Rechazos | Mismatch, pausa/Retry-After sin autoenvío, REJECTED tras remount/recarga del marcador, nueva clave al corregir, clave reutilizada sin otro cierre |
| Recuperación | Respuesta perdida/APPLIED histórico sin segundo POST; close puede devolver REJECTED y conserva el rechazo; canStartNewAttempt=false bloquea |
| Compatibilidad | Pago/hitos/permisos y consultas históricas mediante suites completas de ejecución, Driver, CUSTOMER, tracking e intentos independientes |

`npx tsc --project tsconfig.test.json`, `npm run lint`, `npm run build` (incluye `tsc -b`) y revisión `git diff --check`: resultados en el directorio de evidencia. Las pruebas backend127 HTTP/E2E y52 unitarias del handoff son históricas y ajenas a Web.

## Evidencia visual

`node scripts/verify-delivery-code-ui.mjs`: Chromium local, HTTP interceptado con fixtures, cero mutaciones; no autenticación/HTTP real contra Nest. Pantalla CUSTOMER y diálogo Driver a1280/390px; código siempre enmascarado en las cuatro capturas. Se comprobó ocultar/cancelar y acceso al input dentro del modal. [Informe visual](evidence/delivery-confirmation-web-20261103/visual.json), [CUSTOMER móvil](evidence/delivery-confirmation-web-20261103/customer-390.png), [Driver móvil](evidence/delivery-confirmation-web-20261103/driver-390.png). No se copian HTML, trazas, cuerpos ni código a artefactos de evidencia.

## Situación inicial antes de disponer de la reserva

No se dispuso de instancia sintética autorizada con **build de este contrato, flag, clave privada configurada y fixtures dedicados confirmados**. El informe backend declara su cluster de prueba detenido; no autoriza reutilizarlo ni reiniciar una instancia compartida. La anterior API de contraseñas tampoco acredita esas condiciones. No se intentó crear servicios, configurar claves/flags, reiniciar ni resembrar. Por tanto, aceptación B2C→Driver por HTTP real y cinco errores efectivos/pausa global no acreditadas por Web.

Prerrequisitos: responsable del entorno debe entregar URL/build/manifiesto, confirmación de flag y clave (nunca su valor), identidades CUSTOMER titular/ajeno y Driver autorizadas, solicitud sintética dedicada REQUIRED con referencia auténtica y asignación vigente, cobro/hitos permitidos y un histórico NOT_REQUIRED. Con esa preparación: leer como titular, comprobar ajeno, llegar a AT_DROPOFF y completar con código comunicado, revisar un único efecto terminal, recuperación/rechazo/pausa y asistencia diferenciada cuando esté autorizada. Evidencia sin secretos. No es prueba Android/Coita ni aceptación productiva.

Sin modificación backend, Driver nativo o Coita; sin datos reales, .env, Docker, activación remota, versión, commit/push, despliegue ni mensajes externos.

## Aceptación real posterior — CUSTOMER observa entrega de MDR-000001

La sección anterior describe el bloqueo inicial. Posteriormente el responsable habilitó la reserva sintética DELIVERY-CODE-B2C-A09B99DCF2 en API http://127.0.0.1:42929/api/v1, backend1.13.7 (fuentes77470f837abb86ed32fb79bf466afeafe515f63f más cambios locales), documentada en backend docs/DELIVERY-CODE-INTERACTIVE-20261103.md y docs/checks/delivery-code-reserved-20261103.json. Supervisor status comprobado READY antes de iniciar sesión; no reinicio/resembrado. Web local4270 iniciada con envDir:false y API explícita, sin .env. Login titular real y consulta de código desde UI comprobados en el turno previo; valor ocultado, nunca incluido en evidencia.

Correlación: MDR-000001/MQ-000001; dispatch82770d25-8a2e-4adc-83bd-e6a253138785; assignment01e2f07c-1794-4449-94be-76a291e3b01d. Hitos/cobro/cierre corresponden al recorrido de Driver; Web no los ejecutó. Envío privado autorizado de código obtenido como CUSTOMER: una escritura al named pipe a2026-11-04T05:30:27.823Z; lectura HTTP200/no-store, sin persistir valor. Primer acceso desde sandbox fue EPERM antes de conectar/enviar. Envío desde proceso autorizado cerró sin ACCEPTED_FOR_UI confirmado; no hubo reenvío. No inferir del estado posterior que se recibió ese acuse.

Comprobación nueva a2026-11-04T05:32:18.085Z mediante login CUSTOMER y dos GET reales (sin mocks): detalle200 conserva status CREATED; /status200 devuelve DELIVERED, terminalOutcome.type DELIVERED, occurredAt/deliveredAt2026-11-04T05:30:40.031Z y deliveryConfirmation REQUIRED/CODE_VERIFIED. Se conserva la diferencia entre estado del recurso y proyección logística. [JSON sanitizado](evidence/delivery-confirmation-web-20261103/customer-terminal-http.json). No se consultó /delivery-code ni se abrió el pipe ni se ejecutó cierre en esta comprobación.

UI CUSTOMER existente recargada: estado y resultado Entregada, Código de entrega verificado, Servicio finalizado. GPS retirado. Sin output privado ni botón Consultar código. [Captura real sin secretos](evidence/delivery-confirmation-web-20261103/customer-terminal.png). Conserva cobro declarado60 MXN a23:24:54 CDMX, no pago verificado. El aviso de enlace temporal no disponible persiste con tracking compartido apagado en la reserva; no bloquea la proyección terminal ni habilita cambios.

Alcance: lectura terminal HTTP/UI de Web acreditada; cierre y operación Android no ejecutados ni auditados aquí. Conteo único de eventos, estado de asignación interno, ledger/reembolsos, pruebas de ajeno/histórico, cinco errores/pausa y asistencia siguen fuera de esta observación. No afirmar aceptación completa ni producción. Suites previas188/188, tipos/lint/build y visual simulado no se repitieron por esta actualización documental. Versión1.11.0 y cambios pendientes conservados; sin commit/push/despliegue. Backend compartido intacto, Web4270 y pestaña CUSTOMER conservados para revisión.

## Revisión para publicación del 4 de noviembre

Sobre `dd39ff3`, se corrigió la comprobación de montaje que protege las respuestas tardías al confirmar o recuperar un intento Driver. La prueba de respuesta perdida ahora ejecuta el ciclo de efectos de React Strict Mode y comprueba que la recuperación reconoce el recibo con un solo POST simulado. Las nueve suites focalizadas pasaron con 188 pruebas en 58,96 s. También pasaron los tipos de pruebas y la compilación. Se cotejaron las huellas SHA-256 de la captura y el JSON terminal con el [registro de observación](evidence/delivery-confirmation-web-20261103/customer-terminal-observation.json). La entrega sintética corresponde al recorrido ya registrado el 3 de noviembre.

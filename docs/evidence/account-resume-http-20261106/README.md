# Reanudar el registro desde Mi cuenta — HTTP/UI real, 2026-11-06

**PASS** sobre Web QA `e8e1886`, versión 1.11.0. Recorrido nuevo con Chrome, Nest y PostgreSQL 18 aislados, sin interceptar HTTP ni sustituir respuestas. [Manifiesto y peticiones sanitizadas](http.json).

Corrida final: 2026-11-06T18:45:06.997Z–18:46:15.217Z (12:45–12:46 Ciudad de México). API local propia 4227, Web propia 4228, PostgreSQL propio 55459; todos detenidos al finalizar. No son servicios disponibles para continuar después.

Backend efectivo: **1.14.1**, leído de los fuentes presentes y compilado en una copia temporal de frontend. Este trabajo no cambió su versión ni archivos. SHA256 de fuentes `bf6c168d340b2159f1cbefd1cc3e0d94ba873fce3171c76eb029c2405451221a`; build `334082a25d8943e9cb6fc611d88c0731160e178b52cfb1fc413e101f91bf5fb4`. La copia incluye Prisma generado localmente sin tocar node_modules backend. Identidad de base/directorio/puerto verificada antes de migrar; puertos ocupados abortan, sin cerrar procesos ajenos.

## Recorrido comprobado

1. Base inicialmente sin usuarios. Alta pública por UI, código de correo sintético capturado sólo en memoria y contraseña efímera. No se sembraron cuenta, vehículo ni expedientes.
2. Aceptación de términos por UI. Salida a Mi cuenta, cierre de sesión, cierre completo del contexto de navegador y login en uno nuevo sin almacenamiento compartido. «Continuar mi registro» vuelve a datos con las aceptaciones guardadas.
3. El teléfono vacío bloquea el formulario sin petición de guardado. Se completan por UI teléfono sintético, vehículo, licencia y serie; quedan un vehículo y dos expedientes borrador.
4. Mi cuenta muestra ambos borradores guardados. Tras otro logout y login limpio, «Continuar mi registro» vuelve a fotos. La lectura posterior conserva exactamente IDs, revisiones, datos y vehículo. «Revisar mis datos» recupera teléfono, placa y serie. Se sale sin volver a guardar.
5. Se cargan por UI dos imágenes sintéticas (rostro e INE frente). Otra sesión de navegador nueva recupera las dos VALIDATED, muestra tres pendientes y mantiene deshabilitado el envío. Se compara el estado persistido antes/después: ninguna pérdida ni duplicación.
6. Se cargan las tres fotos restantes y se envía por UI una sola vez. Mi cuenta cambia a «Ver estado de mi solicitud». Un nuevo logout/login retorna a la solicitud en revisión. Mismos dos expedientes y mismo vehículo; cinco adjuntos validados; un evento SUBMIT por expediente.

Resultado final: Identidad `a05b6ddc-dac5-4668-8849-404314ebf867`, SUBMITTED/revisión 11, cuatro adjuntos; Unidad `cdfff984-0b76-4d22-8d4c-3b9c24ff4462`, SUBMITTED/revisión 5, un adjunto. Estos IDs pertenecen exclusivamente a la base sintética desechable.

## Evidencia visual

- Mi cuenta con borradores: [escritorio](account-drafts-1280.png) · [móvil](account-drafts-390.png).
- Dos fotos recuperadas y tres pendientes: [escritorio](resumed-photos-1280.png) · [móvil](resumed-photos-390.png).
- Mi cuenta tras enviar: [escritorio](account-submitted-1280.png) · [móvil](account-submitted-390.png).

Sin contraseñas, códigos, tokens, teléfonos o cuerpos privados en el reporte. Las imágenes contienen sólo identidad ficticia y evidencias sintéticas sin validez; el harness enmascara el campo de teléfono si aparece. Los campos se comparan en memoria, sin exportarlos a evidencia.

## Comandos y correcciones

Desde frontend:

```powershell
node scripts/verify-account-resume-http.mjs
node --check scripts/backend-readonly-snapshot.mjs
node --check scripts/verify-account-resume-http.mjs
npm run lint
```

Corrida final, sintaxis y lint: código 0. No se encontró un fallo de producto. Se añadió el harness de reanudación y un helper para compilar los fuentes backend en sólo lectura. El primer intento (`1793990593893`) pasó las reanudaciones, pero la captura esperaba un menú lateral inexistente en la pantalla guiada. Se corrigió el harness para comprobar primero si existe; sin ampliar timeouts. Todos sus procesos se cerraron. Repetición final (`1793990706996`) PASS y cleanup completo confirmado: navegador, Web, Nest, almacenamiento local y PostgreSQL.

## Límites

Las interrupciones usan logout y contextos de navegador nuevos; **no se esperaron días ni se alteró el reloj**, por lo que no acredita políticas de retención o caducidad tras periodos largos. Se comprueba la persistencia del avance guardado; no se promete recuperar texto que nunca se guardó.

Correo y almacenamiento usan adaptadores locales sintéticos: no acredita entrega externa de correo, objetos remotos, Android ni producción. El resto de Nest, sesiones, contratos, validaciones, transacciones, migraciones y HTTP se ejecutó realmente. No hubo escritura SQL de fixtures para sustituir los pasos del usuario: Prisma se usa para las comprobaciones finales en la base propia; registro, aceptaciones, datos, adjuntos y envío se realizan por UI/API.

No se repitieron suite global, tipos ni build Web porque sólo cambiaron scripts de verificación y documentos. Las 1815 pruebas del commit anterior son históricas. Backend/Driver, versión Web, .env y entornos compartidos intactos. Sin commit/push ni despliegue.

## Revisión para entrega Git — 2026-11-06

Sobre QA 8909761 se revisaron los scripts completos y se contrastó http.json con el manifiesto original de test-results/onboarding-production-isolated/1793990706996/account-resume.json: coincidencia exacta. Comprobadas las dos presentaciones únicas, cinco adjuntos y cleanup. La captura móvil de fotos recuperadas conserva dos guardadas, tres pendientes y envío deshabilitado.

Comprobaciones nuevas: `node --check scripts/backend-readonly-snapshot.mjs`, `node --check scripts/verify-account-resume-http.mjs` y `npx eslint scripts/backend-readonly-snapshot.mjs scripts/verify-account-resume-http.mjs`, todas con código 0. No se arrancó backend ni se repitió el recorrido; resultados HTTP y hashes anteriores son históricos. El hash de fuentes refleja la lectura del árbol backend durante aquella corrida, no garantiza una instantánea atómica frente a modificaciones simultáneas.

Entrega separada autorizada a QA con helper, harness, evidencia y continuidad; se excluyen estilos y layout concurrentes. Sin modificar versión, backend/Driver ni desplegar.

# Bitácora — Mandaria Web

## 2026-10-13 — Verificación documental local desde main

Creada esta continuidad en el worktree nuevo porque main no tenía BITACORA.md. Se conserva íntegro el historial de README/VERIFICATION y se trae únicamente el análisis documental previo con una actualización que distingue su fotografía histórica del working tree implementado actual. No se copiaron módulos QA.

- Rama feature/driver-verification; base/HEAD main `06d976619322d9811b5325fc73cd16d15e00d829`.
- Backend read-only HEAD `90b72433f8a5476ece5fda4437dc15a0a6a314f2` más implementación sin commit, huellas en [informe](docs/DRIVER-VERIFICATION-WEB.md).
- Registro/correo/login seguro, términos personales/FLEET separados, identidad/licencia, unidades propias/rentadas/prestadas, evidencias privadas, presentación/retiro/corrección y decisión SUPER_ADMIN, notificaciones y recuperación implementadas.
- Marcador mínimo por origen/actor, cuerpo no persistido, ABSENT no significa fracaso, cierre explícito y estado vigente separado del recibo. No replay automático.
- Tipos provider nullable, continuidad de servicio independiente comprometido y traducción de rechazos de nueva asignación. Onboarding sin APIs QA; recuperación operativa histórica no se descarta ni se invoca contra main.
- Validación focalizada y capturas sintéticas documentadas en [VERIFICATION](VERIFICATION.md). Fallos ordinarios de fixtures/expectativas y tipos detectados durante desarrollo corregidos; no se acreditan ejecuciones fallidas ni se duplican conteos.
- Integración real pendiente: el backend reportó su cluster temporal detenido; no se usó base desconocida ni se iniciaron Docker, correo o almacenamiento externos. Sin datos/documentos reales, activación, modificaciones backend/App/Landing, commit, push o despliegue.

## Contexto conservado fuera de esta rama

QA del checkout principal en `e3037397ecb6c6b086fd70c4d78f69f9a9a13cfe`, modificaciones anteriores de README/BITACORA/VERIFICATION y análisis sin alterar. Sus versiones y pruebas no se atribuyen a esta rama main.


## 2026-10-13 — Corrección W-01 de carga documental

En feature/driver-verification HEAD06d9766 se reprodujo la limpieza de B al terminar A antes de cambiar producto: tres casos fallaron por selección vacía y uno por error no identificado. Form ahora limpia por generación de selección y atribuye mensajes al archivo enviado; Evidence remonta estado por actor/expediente e interrupciones no anuncian éxito. Conserva selección editable, un solo envío, JPEG/PNG, contrato y recuperación.

35/35 pruebas focalizadas (8 nuevas +27 previas), tipos, lint y build aprobados; cinco checks de Chromium con respuestas controladas y capturas revisadas escritorio/móvil, teclado. Son mocks; backend y almacenamiento reales no ejecutados. No hubo aborto. Historial, evidencia detallada, comandos, límites y handoff para repetición integrada: [VERIFICATION](VERIFICATION.md#2026-10-13--w-01-selección-posterior-durante-carga-documental). Cambios previos preservados; sin backend, QA, commit/push/despliegue.

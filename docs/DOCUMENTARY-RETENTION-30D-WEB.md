## Cierre conjunto vigente — 2026-10-20

Las limitaciones inferiores sobre falta de calendario por expediente y detalle de excepciones quedan resueltas por el nuevo contrato. El seguimiento mínimo conserva la autoridad del folio; no abre documentos/gates ni expone datos ajenos. Se distinguen NO_RELIABLE_ANCHOR y NOT_DISCLOSED, aviso, excepciones/revisión y planes depurados. 183 pruebas únicas Web y seis escenarios integrados consolidados; detalles y diferencias respecto de A–F en [matriz canónica](RETENTION-WEB-PUBLICATION-REVIEW.md). Textos D/Landing sincronizados en borrador. Sin nueva etapa local pendiente, publicación ni activación.

# Conservación documental a 30 días — implementación Web

Cierre local: 2026-10-20. Rama **feature/driver-verification**, HEAD **97850b8c447c71d6ae245bc8df3ce46413650da2**. Worktree: C:/Users/zorgl/.codex/worktrees/fleet-representative-web/mandaria-frontend. Inicialmente limpio; los cambios quedan **sin commit ni push**. Otros worktrees y su documentación previa conservados. No se encontró AGENTS.md ni la propuesta solicitada en los checkouts Web consultados; se creó la [matriz previa](DOCUMENTARY-RETENTION-30D-WEB-PROPOSAL.md) desde el contrato implementado.

## Resultado

A–F **PASS** en una ejecución integrada completa, después de un fallo de preparación del arnés. Web, Nest y PostgreSQL reales; almacenamiento simulado y correo capturado. No se sustituyeron respuestas funcionales HTTP por fixtures. **33 pruebas nuevas y 215 regresiones afectadas**, 248 casos distintos cubiertos. Tipos producto/pruebas, lint y build finales PASS. No acredita aptitud productiva general.

[Evidencia saneada y huellas](retention-30d-web-evidence.json) · [Inventario de fuentes](retention-web-files.json).

## Pantallas y contrato

Prefijo /api/v1. La [matriz contractual](DOCUMENTARY-RETENTION-30D-WEB-PROPOSAL.md) detalla campos, permisos, estados, errores y recuperación.

| Pantalla | Endpoint / comportamiento |
| --- | --- |
| /verification/cases/:id | Aviso común para identidad independiente/flotilla, unidad y representación, dentro de permisos existentes. SUPER_ADMIN consulta GET /admin/privacy/deletion-requests y correlaciona imageRetention.caseId. No concede acceso a coordinadores. |
| Confirmación SUPER_ADMIN | POST /admin/verification-cases/:id/final-rejection con Idempotency-Key, expectedVersion y evidenceRef UUID. Sólo REJECTED, revisión exacta y confirmación explícita de cierre de revisión/apelación. No convierte rechazo ordinario en definitivo ni ordena borrado inmediato. |
| Recuperación de rechazo | GET /verification-command-attempts/:key?operation=FINAL_REJECTION&target=:caseId. Su recibo identifica un plan, no el expediente. Consulta después el plan vigente por GET administrativo, sin repetir POST. |
| /privacy/deletion/:id, canal privado y constancia | GET /privacy/deletion-requests/:id y /:id/receipt; POST /privacy/deletion-access/status existente. Proyección explícita del calendario, estado actual, H histórico y límites de constancia. |
| /admin/privacy/deletion/:id | GET de objetos/tareas. POST /:id/retention-decisions admite IMAGE_ATTACHMENT antes de inventario, con adjunto, evidencia, finalidad, fundamento, responsable, revisión y vencimiento opcional; OBJECT después según contrato existente. Recuperación GET /:id/commands/by-key/:key. |
| Responsabilidad de restauración | POST /:id/restore-policy añade copiesStillRequired, true por defecto conservador. Declaración administrativa con responsables/evidencia/horizonte; mismo GET de recibo. No escanea respaldos ni elimina supresiones desde Web. |

IMAGE_RETENTION se reconoce para lectura, **no** se añadió al formulario de creación de bajas ni se ofrece cancelación general no soportada. No cambia calendarios previos, ocho intentos de eliminación, cinco logísticos, admisión, créditos o servicios.

El marcador de rechazo conserva sólo actor, operación, target y clave. No persiste formularios, evidencias, archivos o credenciales. Se consulta la clave original tras respuesta perdida y se separa recibo histórico de estado vigente. Caché por cuenta/expediente e invalidación de consultas documentales y de baja. La selección A/B y durante reconsulta de privacidad permanece intacta.

## Estados, fechas y exposición

- Aviso programado, aceptación por proveedor y eliminación prevista usan fechas del backend. Aceptación no acredita entrega ni lectura. Ausencia de noticeAcceptedAt no se interpreta automáticamente como fallo: el bloqueo usa IMAGE_NOTICE_NOT_ACCEPTED_IN_WINDOW.
- Origen/días 23 y 30 en UTC; se identifica la zona de las demás fechas del seguimiento. No se calcula abandono desde updatedAt ni se deduce borrado por reloj o archivo ausente.
- En curso, parcial, intervención, alcance comprobado e incidencia posterior a H se distinguen. Un calendario INVENTORY sin confirmedAt dice «Calendario registrado; inventario todavía pendiente».
- No hay GET titular que descubra calendario por expediente ni folio/calendario en VerificationCase. Se informa el límite y se permite consultar el folio comunicado por canal autorizado, sin acceder al listado SUPER_ADMIN.
- No hay GET de excepciones con fundamento, vencimiento y vigencia completos. RETAINED y RETENTION_REVIEW son observaciones acotadas; no se inventan motivo privado, vigencia ni acciones de ampliación/levantamiento. Fechas de revisión futuras, vencidas o ausentes no sustituyen esa proyección.
- No existe consulta completa autorizada de supresiones/horizonte para una nueva pantalla. Se etiqueta SUPPRESSION_PURGE_OVERDUE cuando se comunica como tarea; sin inventarios/keys privados. Formato de restauración 4 y depuración desde horizonte/+24 h siguen en backend.
- Contactar, apelar o editar no garantiza detener eliminación. Imágenes eliminadas no equivalen a cuenta cerrada, pérdida de saldo o eliminación total. Servicios comprometidos y restricciones son independientes. No hay reapertura ficticia de un expediente depurado.

## Integración A–F

Ensayo completo **1792525812779**. PostgreSQL retention_web_1792525812779_test, puerto 55470; API 4239 y Web 4240. Identidad SQL de nombre, host loopback, puerto y data_directory comprobada **antes** de migrar/sembrar. Configuración efímera sin .env, Docker, 43000, VM, base principal, Spaces ni Resend reales. Guardias de red y transportes simulados; DELETION_CLOCK inyectado sólo en ese proceso, sin cambiar reloj del sistema.

Preparación por fixture, no acreditada como interfaz: cuatro usuarios/conductores/subjects, expedientes y objetos sintéticos privados; tres calendarios DRAFT mediante scheduleImages real bajo lock; caso REJECTED preparado mediante DRAFT → SUBMITTED → REJECTED con revisión/revisor; cuenta técnica e historia LOCAL_TEST del bootstrap. No registro, aceptación, carga ni revisión ordinaria por UI en este ensayo. No se publicaron políticas ni se tocaron textos B/C/D/I.

| Recorrido | Estado | Evidencia |
| --- | --- | --- |
| A | PASS | Navegador consulta folio real y fechas 23/30 procedentes del backend. Sin cancelación general. |
| B | PASS | Aviso aceptado por proveedor simulado; worker real admite día 30 y completa V2. Dos objetos sin versiones ni multipart en simulador; H/subámbito en SQL/Web, expediente y cuenta activa conservados. |
| C | PASS | Cinco intentos de aviso fallidos controlados; bloqueo visible, cero borrados y fechas intactas. |
| D | PASS | SUPER_ADMIN registra excepción por Web: una decisión, dos objetos conservados y cero borrados. No se inventa detalle de vigencia ausente del GET. |
| E | PASS | Confirmación por Web, respuesta perdida **después del commit real**, recarga/GET con clave original. Un POST; comandos y planes **0→1→1**. |
| F | PASS | Vista de expediente minimizado/restringido sin reapertura; cuenta ajena denegada, sin calendario. Conteo de expedientes intacto y cuenta titular activa. |

Primer intento **1792525715228**: FAIL SETUP, VERIFICATION_CASE_MUST_START_DRAFT. Insertaba REJECTED directamente. Ningún A–F ni borrado acreditado. Un único diagnóstico adicional contrastó trigger/fixture backend; sólo se corrigió preparación y se hizo un lanzamiento adicional, completo. No fue defecto demostrado de producto ni rechazo de seguridad. No más lanzamientos.

Ambas bases y reportes permanecen en test-results/retention-isolated/<id>/. Navegador, Vite, Nest y PostgreSQL propios detenidos; temporales ajenos conservados.

## Visual y diferencia posterior

Chrome **155.0.8059.85**, headless/sandbox/perfil temporal. 155.0.8059.82 y el spawn UNKNOWN original pertenecen a la etapa anterior; no se atribuye una causa nueva. Escritorio 1365 y móvil 320 px: 14 capturas locales sin desbordamiento, teclado, foco dentro del modal, errores y motivo sintético largo. Se conservan seis inspeccionadas:

- [Calendario móvil](retention-30d/calendar-320.png).
- [Confirmación móvil](retention-30d/final-confirmation-320.png).
- [Recuperación en escritorio](retention-30d/final-recovered-1365.png).
- [Aviso bloqueado](retention-30d/notice-blocked-320.png).
- [Alcance comprobado](retention-30d/verified-scope-320.png).
- [Excepción administrativa](retention-30d/exception-320.png).

La revisión visual detectó «Restricciones aplicadas» en un calendario aún sin confirmar. **Después de A–F**, sólo src/deletion/pages.tsx cambió ese texto y explicitó la zona horaria; se añadió regresión. No cambiaron endpoints, permisos, recuperación o efectos. Las capturas de calendario aún contienen el rótulo anterior: no se acreditan como imagen del texto final. El JSON conserva las huellas integradas/actuales y los dos archivos distintos (pantalla y prueba). Archivo nuevo final completo: 33 PASS; deletion-pages: 32 PASS tras corregir el rótulo. No se repitió A–F.

## Pruebas y huellas

33 nuevas cubren UTC/límites 23/30 sin autoridad del reloj, correo, bloqueo/fechas, excepción con datos insuficientes, H/incidencia/parcial, permisos/revisión obsoleta, respuesta tardía entre cuentas, recuperación y texto sin restricciones prematuras.

215 regresiones en archivos completos: verification-recovery 14, verification-service 22, verification-pages 27, verification-upload 11, representatives 29, deletion-service 23, deletion-pages 32 y deletion-v2 57. Incluyen A/B, reconsulta de privacidad, identidad restringida y continuidad autorizada. No sumar repeticiones ni 130/40 históricos como nuevos.

Registro inicial completo: 215 regresiones PASS y un selector nuevo fallido; comando global exit 1 y error adicional de posprocesamiento del wrapper result(). **No se acredita globalmente como PASS**. Selector/wrapper corregidos; reportes finales completos PASS. Tipos de test inicialmente detectaron emailVerifiedAt faltante en el fixture; corregido/verificado. Tipos producto/pruebas, ESLint y build finales PASS, sin .env. Advertencia de chunk >500 kB; no se amplió a rediseño/carga diferida.

Backend local **2c458fc955f699ce958dabf5fe89dcc58892a031 + cambios de retención sin commit**. 27 huellas de contrato/fuentes/migración/pruebas/dist iguales antes, después y al cierre; 16 coinciden también con el informe histórico backend. Sus 123 unitarias, 53 E2E y 33 B2B no son nuevas.

Se requiere ese contenido, migración **20261020000100_document_image_retention** y formato 4; el HEAD anterior por sí solo no contiene esta funcionalidad. Se probaron bytes locales registrados, no una pareja de SHA publicados ni despliegue mixto.

## Reproducción acotada

Desde este worktree, dependencias instaladas, PostgreSQL 18 y Chrome disponible:

~~~~powershell
node --check scripts/verify-retention-web.mjs
node scripts/verify-retention-web.mjs
~~~~

Crea un cluster nuevo propio y reporta checkpoints/cleanup. No definir RETENTION_RESUME_RUN: los seeds de escenario no son una reanudación idempotente. No usar backend/base existentes. La reproducción futura debe respetar aprobación y límite de diagnóstico; no ordena relanzar esta tarea. Huellas: scripts/retention-contract-snapshot.mjs; launcher reutilizado: scripts/representative-browser.mjs.

## Pendientes reales

1. Para calendario automático por expediente titular o detalle de vigencia/motivo de excepciones hace falta proyección backend autorizada. Lo disponible por folio y revisión administrativa está implementado.
2. Publicación/coordinación futura de backend compatible/migración, textos autorizados y preparación operativa antes de habilitar. Handoff editorial B/C/D/I: elegibilidad, aceptación de proveedor en día 23, fecha 30 condicionada, excepciones, canales, historia y alcance limitado; sin promesa de borrado garantizado. Textos sin modificar ni publicar.
3. **Luis Fernando Salgado Gonzalez** y suplente **Carlos Bryan Corado Suarez** ya están designados. Falta acreditar cuentas/acceso/capacidad/procedimiento/evidencia/revisión/horizonte, no su nombramiento.
4. Operación real de avisos, limpieza V2 en Spaces, historia sin fechas, respaldo/supresiones y horizonte verificado pendientes. Constancias parciales no garantizan eliminación total, entrega/lectura o preparación productiva.
5. RESOLVED es pendiente backend separado; Android/GPS fuera. Sin backend/Landing/App, .env, QA, merge, commit, push, despliegue, recepción real o activación.

Continuidad: [representante](FLEET-REPRESENTATIVE-WEB.md), [eliminación V2](DOCUMENT-DELETION-V2-WEB.md), [alta documental](DOCUMENTARY-ONBOARDING-PRODUCTION-WEB.md).

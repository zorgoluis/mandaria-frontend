> Revisión posterior del 2026-10-24: commit local en QA autorizado y preparado con este informe y sus artefactos. Las cifras y el manifiesto siguientes corresponden al pase previo al commit; fuentes sin cambios desde ese pase. Sin push ni despliegue.

# Asistencia Web: movimientos del proveedor

2026-10-24, America/Mexico_City. Web: `C:/Users/zorgl/Documents/mandaria-frontend`, rama QA, base `1ec1a8307e77f2aba1102f6ef9729f513d6a6a13`. Implementación local sin commit, push ni despliegue. Este informe sustituye el bloqueo general del proveedor descrito en el [informe histórico](FLEET-ASSISTANCE-WEB-CURRENT.md); conserva los demás límites administrativos allí documentados.

## Contrato e implementación

Se contrastaron handoff WEB-MOVEMENTS, prompt Web, contrato, especificación, implementación, matriz, OpenAPI/API_ACCESS, verificación provider y fuentes/runtime actuales del backend. Paquete backend 1.13.0, asistencia 1.0.0, migración 64. La proyección PROVIDER_ADMIN ya existe: detalle opcional `movementContext` y `GET /provider/fleet-assistance-cases/:id/movement-context`. No se usan rutas DRIVER ni colecciones administrativas como alternativa.

- `types.ts`, `service.ts`, `movement-model.ts`: adaptador tipado y validación runtime, esquema 1, revisiones string, etiquetas null, motivos/capacidades y cursor opaco. Contexto ausente o incompatible no concede permisos.
- `movements.tsx`, `pages.tsx`: combinación completa autorizada, un solo concepto por intención, importe decimal exacto y fecha UTC dentro del segmento conocido y no futura. No hay selectores libres de IDs ni reparto inventado. Se normaliza coma/punto sin float, redondeos o separadores de miles; máximo `999999999999.99`, mayor que cero.
- La selección usa rol y pertenencia histórica autorizados. No publica `label`, reconstruye nombres desde perfiles ni muestra UUID como formulario. Si dos partes/opciones resultan indistinguibles, bloquea la declaración y remite a aportación/revisión del expediente. Esta condición concreta no equivale al antiguo bloqueo general por falta de proyección.
- DECLARE_MOVEMENT envía únicamente revisión congelada, UUID físico, `sourceKind: DECLARATION`, triple autorizado, concepto, amount, MXN y occurredAt. No envía obligationId, sourceRef, evidenceIds ni reversesMovementId. La UI muestra declaración pendiente de acreditación; no simula asignaciones, pago, crédito ni entrega.
- DISPUTE parte de `movement.id`, conserva revisión y motivo y no añade obligationId. RETRACTED puede disputarse cuando la proyección lo permite. Continúa la disputa por obligación existente. No hay reversión autónoma.
- Continuación por la ruta dedicada con el cursor inicial, límite 25 y el mismo proveedor; cliente admite filtros compartidos. Páginas deduplicadas por id y capacidades/opciones de la última respuesta. Mutaciones refrescan las proyecciones; cursor inválido oculta páginas anteriores y permite reiniciar desde la primera. Claves de consulta incluyen cuenta/proveedor/caso/revisión; 401/403/404 retiran datos privados y conservan recuperación técnica.
- `attempts.ts`, `commands.tsx`, `messages.ts`: intención durable cifrada, revisión/cuerpo/ruta/clave/physicalMovementId estables y comprobación adicional del proveedor antes de reenviar. APPLIED, REJECTED, PENDING, UNKNOWN y CLOSED_NO_EFFECTS comparten recuperación sin reenvío automático. Los conflictos/duplicados no generan otra clave o identificador físico. El segundo administrador lee hechos autorizados sin heredar intentos privados del primero.

Persistencia: IndexedDB con AES-GCM y clave WebCrypto no exportable por cuenta/entorno. No se persisten tokens ni bytes de archivos en el intento. La protección no sustituye la seguridad del origen: código ejecutado en el mismo origen puede usar sus capacidades; borrar datos del navegador elimina la recuperación local. Un fallo de almacenamiento impide enviar antes de guardar la intención.

## Verificación propia de Web

Comandos ejecutados:

```text
npm run typecheck:test
npm run lint
npm run build
npx eslint src/assistance src/test/provider-movements.test.tsx src/test/assistance.test.tsx src/test/assistance-api.test.ts
npx vitest run src/test/provider-movements.test.tsx src/test/assistance.test.tsx src/test/assistance-api.test.ts src/test/fleet.test.tsx src/test/fleet-api.test.ts src/test/api.test.ts src/test/independent-drivers-api.test.ts
node scripts/verify-assistance-http.mjs
```

Tipos, lint global/focalizado y build PASS; build mantiene aviso de tamaño de chunk. Vitest: **158/158, siete archivos**, con dobles de servicio y fixtures separadas por rol. Incluye validación/null/ausencia, opciones arbitrarias/ambiguas, dinero/fechas, capacidades, disputa DECLARED/RETRACTED, paginación/cursor/permisos, claves cifradas estables, diez combinaciones de operación/estado de recuperación y regresiones administrativas/FLEET/independiente. La suite global histórica no se volvió a ejecutar ni se declaran resueltos sus fallos previos. Las 146 E2E y 756 unitarias históricas del backend no son resultados de esta tarea.

## Integración HTTP y revisión visual

El harness compara las fuentes actuales Windows/WSL por SHA-256 y recompila el backend en scratch. Chrome → Vite 4238 → Nest 4237 → PostgreSQL 55484, datos e identidades sintéticos, Node/PostgreSQL en WSL, sin Docker. Routing/mail simulados, red externa bloqueada, configuración temporal del proceso y sin modificar `.env` ni repositorio backend/driver. La autenticación, autorización, DTO, transacciones, recibos y lecturas son reales.

La fixture prepara una obligación REFUND y 26 movimientos históricos sintéticos para probar opciones y paginación. Esta preparación no acredita que la consola administrativa haya dado de alta esas referencias. La declaración de 25.10 y su disputa sí se envían desde la Web por HTTP. Se comprueba una única fila DECLARED, physicalMovementId original, cero asignaciones y ausencia de cambios en ledger, entrega y estado operativo. La respuesta perdida se recupera tras recarga. Otro administrador vigente del proveedor lee el hecho sin el intento privado. Una declaración descartada antes de llegar al servidor pasa por UNKNOWN → CLOSED_NO_EFFECTS; el envío original tardío obtiene ATTEMPT_CLOSED.

Resultado final: **20/20 comprobaciones HTTP PASS**, reporte `complete: true`, sin errores de red inesperados. Se conservan aportación, evidencia privada, propuesta/votos, comandos OFF y revocación de membresía. La revocación se verifica desde la ruta movement-context y elimina el expediente privado. [Reporte y manifiesto de fuentes backend](evidence/fleet-assistance-provider-movements-2026-10-24/report.json), [peticiones sin cuerpos ni credenciales](evidence/fleet-assistance-provider-movements-2026-10-24/requests.json), [manifiesto Web](fleet-assistance-provider-movements-evidence.json).

Capturas: dueño 1280/320, administrador 1280, vista previa y movimiento declarado. Navegador comprueba ausencia de desbordamiento horizontal a 320/1280; se revisaron estado pendiente, selección completa, dinero exacto y formulario de disputa. La lista de 26 movimientos hace largas las capturas completas; los detalles de vista previa/movimiento permiten inspección legible. Clúster propio detenido: `/tmp/mandaria-assistance-web-c0FAEp/pgdata`; backend sin cambios y runtime recompilado desde fuentes actuales. No quedan servicios de este ensayo escuchando en 4237/4238/55484.

Dos ensayos preliminares se detuvieron por HTTP 429 al superar el límite real de autenticación. El harness ahora espera la ventana y respeta Retry-After sin cambiar el controlador. Los pases incompletos no se presentan como éxito. Durante el desarrollo se corrigieron dos expectativas de pruebas (texto histórico y firma de recuperación) y un literal numérico inseguro de fixture.

## Límites y activación

El recorrido nuevo está disponible cuando el contexto ofrece combinaciones inequívocas y capacidades vigentes. Contexto antiguo/ausente, falta de opciones, ambigüedad, cierre, comandos OFF y pérdida de permiso tienen salidas distintas. UNKNOWN no prueba ausencia de efectos; cierre técnico no concilia dinero. La activación QA remota/producción sigue pendiente por separado: valores predeterminados `ASSISTANCE_COMMANDS_ENABLED=false` y `ASSISTANCE_STORAGE_MODE=DISABLED` intactos. No se activaron proveedores reales ni se accedió a bases operativas o Coita Eats.

Los bloqueos administrativos históricos de contactSourceRef redactado y alta inicial sin participationId autorizado no se resuelven inventando referencias; no impiden las nuevas opciones provider que sí proyecta el backend. FLEET 1.0.0, independiente 1.1.0, consola SUPER_ADMIN, revisiones de modo/modalidad y restricciones personales TAKE se conservan.

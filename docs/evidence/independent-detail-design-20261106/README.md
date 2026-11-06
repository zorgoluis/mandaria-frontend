# Detalle de independiente — rediseño administrativo

2026-11-06. QA, base e8e1886, Web 1.11.0. Cambio exclusivo del contenido del detalle SUPER_ADMIN; menú y barra superior intactos. Se preservan los cambios pendientes de aceptación HTTP de reanudación del registro.

## Implementación

- Encabezado con iniciales, nombre y estados reales; indicadores de pertenencia canónica, aprobación, habilitación y saldo. Revisión string exacta. Disponibilidad del servidor, sin inferir conexión socket. No se inventa saldo cero ante error/ausencia de cuenta.
- Dos columnas: habilitación, créditos y vehículos a la izquierda; contacto, zonas y decisión a la derecha. Una columna en pantallas menores de 1100 px, decisión al final. Tarjetas y estilos limitados a `.independent-detail`.
- Identificadores copiables con confirmación y mensaje si el navegador rechaza el portapapeles. Teléfono conserva la consulta privada, permisos, limpieza de sesión y ausencia del caché compartido; no se reformatea ni interpreta como teléfono verificado.
- Motivo en la tarjeta, botones de suspensión/rechazo deshabilitados si está vacío. Se precarga la confirmación existente y se conserva la validación de 3–500 caracteres, la respuesta del backend y el rechazo por servicio activo. Error también visible en la tarjeta al cerrar el diálogo. Sin cambio optimista.
- Componentes existentes de créditos y zonas reutilizados, con sus permisos, paginación, intenciones durables, errores y confirmaciones. Vehículos en tarjetas con las acciones existentes. No endpoints, dependencias, configuración, credenciales ni backend nuevos.

## Comprobaciones nuevas

`npm test -- src/test/driver-portal.test.tsx src/test/independent-contact.test.tsx src/test/independent-zones.test.tsx src/test/credits.test.tsx src/test/independent-drivers-api.test.ts src/test/independent-zones-api.test.ts src/test/credits-api.test.ts src/test/independent-detail-design.test.tsx`

175/175 pruebas en 8 archivos, 16,29 s. [Salida](tests.txt). La primera corrida de 122 pruebas detectó un selector global ambiguo de «40 créditos», ahora presente tanto en indicador como en panel; corregido para comprobar el panel de créditos. Sin omitir pruebas ni aumentar tiempos.

`npm run typecheck:test`, `npm run lint`, `npm run build`: resultados en [checks.json](checks.json), [tipos](types.txt), [lint](lint.txt), [build](build.txt). Build mantiene el aviso conocido de chunk mayor de 500 kB.

`node scripts/verify-independent-detail-design.mjs`: PASS con Chrome y API **simulada**, datos sintéticos. Comprueba copia exacta del Driver ID, revisión mayor que Number.MAX_SAFE_INTEGER intacta, motivo obligatorio, confirmación precargada, una sola petición sintética de suspensión y conflicto 409 visible en diálogo/tarjeta. Sin desbordamiento horizontal a 1440, 1000 y 390 px. [Informe](browser.json).

Capturas: [escritorio](detail-1440.png), [intermedia](detail-1000.png), [móvil](detail-390.png). Inspección visual de escritorio y móvil; procesos propios de navegador/Vite detenidos.

No nueva suite global ni aceptación HTTP real en este turno. Las pruebas HTTP previas de contacto y reanudación son evidencia histórica separada. Pendiente comprobar el rediseño contra un backend de destino y en producción; no se consultaron datos operativos. Sin cambio de versión, commit, push o despliegue.

## Revisión final y entrega a QA — 2026-11-06

Diff revisado sobre e8e1886. La rama de trabajo encontrada fue feature/rediseno; QA y origin/QA tenían la misma base. Se cambió a QA sin perder modificaciones. Sin correcciones adicionales de producto necesarias.

- Primera suite global: 1818/1818 en 89 archivos, 103,49 s ([salida](tests-global.txt)). Durante el trabajo aparecieron cambios ajenos de estilos/layout, excluidos de la entrega.
- Verificación decisiva en copia aislada: git archive de HEAD más los siete archivos de implementación/harness/pruebas del rediseño, comparados byte a byte con el conjunto preparado. Dependencias instaladas reutilizadas mediante junction; sin nuevos paquetes. No incluye los cambios simultáneos ni los harness de reanudación.
- Suite global aislada: **1818/1818 en 89 archivos, 107,37 s**, código 0 ([salida](tests-global-isolated.txt)). Sin omitir pruebas ni ampliar tiempos.
- Tipos, lint y build aislados: **PASS**, códigos 0 ([manifiesto](checks-global.json), [tipos](types-global.txt), [lint](lint-global.txt), [build](build-global.txt)). Aviso conocido de chunk Root 1265,13 kB.

La ruta temporal fue test-results/detail-design-qa-final/work. No se repitieron navegador ni HTTP real: las capturas simuladas anteriores conservan su alcance. Autorizado commit/push de este rediseño y evidencia a QA, sin force, cambio de versión o despliegue. Se dejan fuera los scripts/evidencia y entrada de continuidad de reanudar registro, además de los cambios concurrentes de index.css, main.tsx, AdminLayout y styles.

# Revisión para publicar conservación documental Web

Fecha: 2026-10-20. Rama: **feature/driver-verification**. Base revisada: **97850b8c447c71d6ae245bc8df3ce46413650da2**. Remoto confirmado: https://github.com/zorgoluis/mandaria-frontend.git. Fetch inicial satisfactorio: 0 commits por delante y 0 por detrás. Esta revisión prepara el commit; no acredita anticipadamente el push ni un despliegue.

## Alcance y evidencia conservada

Se incluyen avisos de conservación a 30 días, calendario del servidor, confirmación explícita de rechazo definitivo SUPER_ADMIN, excepciones y declaración de restauración, recuperación original sin duplicar POST, seguimiento limitado por expediente, historia e incidencia actual separadas, pruebas, cinco arneses/helpers y seis capturas sintéticas. Los cambios posteriores del cierre conjunto pertenecen a esta misma funcionalidad. No se modifica producto durante la revisión de publicación.

Las **33 huellas Web combinadas** coinciden con los cierres registrados antes de los ajustes documentales de esta revisión; las **16 huellas del cierre backend** también coinciden. El [extracto portable de evidencia](retention-closure-evidence.json) conserva fuentes backend, resultados, huellas y matriz sin depender del acceso al checkout del autor. La fuente canónica original es mandaria-backend/docs/checks/retention-cross-project-closure.json, SHA-256 7d1dfc694beca436be311a2a125a146e62d7d6775b63481022568c0c21c08c41.

No se repitieron suites ni recorridos. Se contrastaron reportes locales por SHA-256, las seis capturas y la sintaxis de los cinco scripts. Las verificaciones históricas siguen siendo históricas: tipos de producto/pruebas, lint y build PASS; advertencia conocida de chunk mayor de 500 kB.

| Evidencia histórica | Resultado y límites |
| --- | --- |
| A–F, 1792525812779 | PASS completo; Web/backend/PostgreSQL reales aislados, correo y almacenamiento simulados. Recuperación con un POST y comandos/planes 0→1→1. Fuentes de recuperación coincidentes; no se declara que toda la aplicación posterior sea idéntica. |
| Cierre de proyecciones | 183 casos únicos en seis archivos completos: 36 conservación, 8 proyección, 27 pantallas verificación, 32 pantallas baja, 23 servicio baja y 57 V2. Se corrige la espera de refetch; el primer reporte fallido no se acredita globalmente PASS. |
| CALENDAR / UNKNOWN / NOTICE / INCIDENT / PERMISSIONS | PASS en 1792530245564. Ese intento fue incompleto por EXCEPTION; no se oculta el fallo. |
| EXCEPTION | PASS en 1792530337220; sólo se repitió el escenario afectado por el sexto login limitado, sin relajar controles. |
| Correcciones posteriores a integración | NOT_DISCLOSED, historia depurada y rótulo H cubiertos por 44 pruebas completas en retention-closure-final.json. Las capturas previas no acreditan esos rótulos finales. |

Chrome 155.0.8059.85; escritorio y 320 px. A–F acredita teclado/foco/confirmación y textos largos según su reporte. Los fixtures preparan cuentas, expedientes, adjuntos sintéticos y calendarios; no se presentan como registro o carga realizados por interfaz. Reportes crudos, perfiles y bases preservados localmente, fuera del commit.

## Backend requerido

HEAD backend observado en lectura: **2c458fc955f699ce958dabf5fe89dcc58892a031**, con la implementación de retención y proyecciones **todavía sin commit**. Ese SHA por sí solo no contiene la dependencia. Se conserva la correspondencia de fuentes locales por SHA-256; no se inventa una pareja de commits publicados probados conjuntamente.

Se requiere la migración **20261020000100_document_image_retention**, restauración formato **4**, implementación de retención y proyecciones compatibles. El cierre posterior no añade otra migración. Prefijo /api/v1:

| Contrato | Uso y autorización |
| --- | --- |
| GET /verification-cases/:id | retention.executionEnabled, eligibility, plans y historyTruncated, bajo autorización vigente del expediente. Distingue ausencia de hito, historia y plan no accesible. |
| GET /privacy/deletion-requests/by-case/:caseId | Seguimiento mínimo propio o SUPER_ADMIN; 404 indistinguible ante ausencia/no autorizado. No desbloquea expediente, imágenes ni gates. |
| Consultas de seguimiento/constancia/canal privado | retentionDetails con estado del aviso, alcance/motivo publicable, estado y revisión de excepciones e historia limitada. Fundamento libre sólo en proyección administrativa. |
| POST /admin/verification-cases/:id/final-rejection | SUPER_ADMIN, REJECTED, versión exacta, evidencia y confirmación. Recuperación GET /verification-command-attempts/:key con operación/target originales; después estado vigente separado. |
| retention-decisions / restore-policy | Acciones administrativas existentes, evidencia/responsables/revisión y recibos originales; no amplían permisos ni ejecutan borrado desde Web. |

La [matriz inicial](DOCUMENTARY-RETENTION-30D-WEB-PROPOSAL.md) y el [informe histórico](DOCUMENTARY-RETENTION-30D-WEB.md) conservan cronología. Sus antiguos límites de falta de calendario por expediente y detalle de excepciones están resueltos por las proyecciones anteriores; no se reabren como pendientes.

## Exclusiones y pendientes

Sólo Web en esta rama. Se preservan otros worktrees y documentación ajena; no se incluyen backend, Landing, App, .env, credenciales, URLs firmadas, documentos personales, builds, perfiles, bases ni trazas crudas. Los valores de configuración de los arneses son sintéticos y están limitados al entorno aislado.

Los enlaces nuevos del informe apuntan a archivos incluidos. Se conservan 12 enlaces históricos de VERIFICATION a capturas/reportes test-results no disponibles en este checkout: no son evidencia nueva ni se incorporan trazas para hacerlos funcionar. Las referencias al checkout backend original son procedencia local, no un requisito para leer este extracto.

Pendientes reales: publicar/coordinar el contenido backend compatible antes de habilitar Web; configuración y operación real autorizadas, aviso por correo y limpieza V2 real en Spaces, inventario/custodia de copias y horizonte de restauración comprobado, acceso y cobertura efectiva de los responsables ya designados, decisiones sobre saldo/devoluciones y autorización jurídica/editorial final. La sincronización editorial D/Landing del cierre conjunto sigue siendo borrador y no se publica desde esta tarea.

Constancias limitadas al alcance acreditado, sin garantía de eliminación total. Sin despliegue, activación ni aptitud productiva general acreditados. RESOLVED y Android/GPS quedan fuera. El resultado del commit y la consulta del SHA remoto se verifican al finalizar la publicación; no cambian estas limitaciones.

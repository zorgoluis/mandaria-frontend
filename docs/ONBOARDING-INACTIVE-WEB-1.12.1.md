# Web 1.12.1 — continuidad documental de unidades inactivas

Entrega autorizada el 16-nov-2026 para commit y push normal en la rama actual `chore/release-1.12.0`, sin cambiar de rama, tag, release ni despliegue. Base: `e47fb8b7af25fcc5267cfe5bf4c5e9be71cd3a27`. El commit que contiene este documento identifica la entrega; no se atribuye un SHA futuro a la aceptación histórica.

## Cambio y contrato

Las consultas de alta, continuación, avance documental, recuperación de creación y catálogo de baja piden `view=DOCUMENTARY`. Así conservan el expediente y los UUID originales de una unidad INACTIVE, aunque la proyección CONNECTION la excluya de sus sujetos. Las claves de caché incluyen la vista; una respuesta que declara otra vista falla sin fallback. Se mantiene la respuesta histórica completa sin campo `view`.

Recepción y disponibilidad mantienen sus rutas y autorización. El catálogo documental no habilita conexión, TAKE ni aprobación. El cambio no altera reglas financieras ni genera vehículos o expedientes duplicados durante la recuperación.

Web pasa de 1.12.0 a **1.12.1** en `package.json`, ambas entradas propias de `package-lock.json` y la etiqueta visible. No cambia dependencias. El backend compatible se coordina como **1.15.1** con el contrato DOCUMENTARY/CONNECTION; este documento no acredita su commit o publicación remota. El despliegue coordinado sigue fuera de alcance.

## Evidencia histórica, conservada

- [Implementación y contrato inicial](ONBOARDING-DOCUMENTARY-WEB-20261116.md): 287 pruebas focalizadas y 18 comprobaciones de navegador con HTTP simulado en Web 1.12.0.
- [Aceptación real](ONBOARDING-JOINT-WEB-20261116.md): sesión cX5fBG de Nest/PostgreSQL aislados, ya cerrada por el coordinador. Guardado, reentrada, cinco fotos existentes conservadas y envío único: identidad SUBMITTED revisión 12 y unidad SUBMITTED revisión 6. Cero fotos nuevas subidas por Web. Catálogo mixto e historial íntegros; Web observó READY y OFFLINE final tras las acciones de Driver.
- Los fallos del observador inicial fuera de ventana y del control de acceso a imágenes del harness se conservan en sus reportes originales, con auditoría sin repetir el envío y confirmación posterior real.
- `onboarding-documentary-web-evidence.json` y `onboarding-joint-web-status.json` son instantáneas anteriores al incremento/commit. Sus versiones, hashes y campos Git describen esa fase. La única variación posterior de las 17 fuentes inventariadas es el texto de versión en `AdminLayout.tsx`; sus cambios funcionales son los aceptados.
- La preparación Git anterior fue detenida por coordinación: lint y suite global interrumpidos **no cuentan como PASS**. No se sobrescribe su log parcial.

No se reabren backend, WSL, base ni cuentas del ensayo. No hay Docker, configuración real, datos productivos ni nueva aceptación de dispositivo físico.

## Verificaciones nuevas de 1.12.1

Ejecutadas después del incremento a 1.12.1. Los archivos de salida usan el prefijo `test-results/onboarding-1.12.1-`, separado de la aceptación histórica y de la corrida interrumpida.

| Verificación                                                                                                               | Resultado nuevo                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`                                                                                                             | PASS.                                                                                                                                                        |
| `npm run build`                                                                                                            | PASS, incluidos tipos de producto. Se conserva el aviso previo de chunks grandes (Root 1291,44 kB y heic-to 3224,41 kB).                                     |
| `npm run typecheck:test`                                                                                                   | PASS.                                                                                                                                                        |
| `npm run test -- --maxWorkers=2 --reporter=default --reporter=json --outputFile=test-results/onboarding-1.12.1-tests.json` | **1902/1902 PASS, 95 archivos**, suite completa requerida antes del commit. Incluye las 287 pruebas focalizadas del cambio; no se suman como otra ejecución. |
| `node scripts/verify-onboarding-documentary.mjs`                                                                           | **18/18 PASS** con HTTP simulado; capturas de 1440/820/390 px, guardado/reentrada, envío único, refetch tardío e historial.                                  |
| Sintaxis de los tres ejecutores afectados y `--help` del ejecutor conjunto                                                 | PASS, sin API ni lectura de accesos privados.                                                                                                                |
| Formato de fuentes afectadas y `git diff --check`                                                                          | PASS; se corrigió sólo formato del ejecutor conjunto.                                                                                                        |

Reporte de pruebas: `test-results/onboarding-1.12.1-tests.json`, SHA-256 `8466c490042b73a580dc503bc0e1ba1540601d8dc3477c29166c5ae265eec925`. Logs de lint/build/tipos/pruebas bajo el mismo prefijo. No se alteraron las pruebas para superar esta ejecución.

Reporte visual nuevo: `test-results/onboarding-documentary/1794894385194/report.json`, SHA-256 `4f100d7f02dcf014da3a96e442a64448dbb622a1882e299b807e039b6ba4ba37`. Capturas revisadas: borrador a 1440, progreso guardado a 820 (incluida etiqueta V1.12.1) y revisión enviada a 390. Sin desbordamiento horizontal ni errores de página. El intento anterior `1794894308565` falló antes de ejecutar casos por `ERR_NETWORK_ACCESS_DENIED`; se conserva y el reintento autorizado con acceso local completó las 18 comprobaciones. El servidor y navegador propios se cerraron al finalizar. No se inició el backend.

## Revisión previa al push

Revisión local: sin workflows versionados ni hooks Git activos; el Dockerfile sólo define la construcción y no contiene automatización de push. Consultas de GitHub: `actions/workflows` devuelve 0; `hooks` devuelve lista vacía; `deployments` devuelve lista vacía. No se detectó automatización de despliegue aplicable a esta rama. No se cambia configuración remota ni se ejecuta comando de despliegue. Antes del commit, API de GitHub y `git ls-remote` confirmaron la punta remota `e47fb8b7af25fcc5267cfe5bf4c5e9be71cd3a27`, coincidente con la base local. Una consulta Git inicial falló por conectividad y el reintento funcionó sin cambios de configuración.

Selección explícita de archivos de producto DOCUMENTARY/CONNECTION, pruebas, ejecutores, handoffs, versión y secciones relacionadas de continuidad. Las entradas históricas previas de BITACORA/VERIFICATION/README se conservan. Al iniciar esta entrega no había cambios de otras tareas ni archivos ya preparados en el índice. Se excluyen `.env`, accesos privados, capturas, `test-results`, build y dependencias instaladas; no se usa `git add -A`.

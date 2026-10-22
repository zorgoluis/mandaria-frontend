# Visor privado: correccion local

## 2026-10-20 — Visor privado: CSP blob y errores de renderizado

Solicitud: corregir visor para conductor/SUPER_ADMIN sin activar admision ni desplegar. Base main 0e290ed180afd3aa3be08189bc20786d5d47cbd6, checkout inicialmente limpio. nginx img-src omitia blob:, utilizado por Evidence tras recuperar el archivo autenticado. Se permite blob: solo en img-src; no cambia acceso, proxy, caché, permisos ni otras directivas. Evidence confirma visualizacion solo tras onLoad; onError informa fallo y revoca URL. Cierre/desmontaje conservan revocacion.

Verificacion nueva: 40/40 en archivos completos verification-pages y verification-upload (incluye dos regresiones por rol), build, typecheck:test y ESLint focalizado PASS. Build mantiene advertencia de chunk >500 kB. Navegador local con componente compilado y CSP extraida de nginx: politica antigua reproduce fallo; corregida renderiza PNG sintetico 800x500 para DRIVER y SUPER_ADMIN; cierre elimina vista. Transporte simulado, sin backend/VM/Spaces ni prueba nueva de permisos HTTP. Capturas viewer-fixed-driver.png y viewer-fixed-admin.png en visualizaciones/documentary-synthetic. Arnes reproducible scripts/serve-evidence-csp.mjs recibe ruta PNG sintetica. No utilizar documentos reales.

Incidencias del desarrollo: primer script de edicion fallo por encoding y solo ejecuto 38 pruebas anteriores; corregido con UTF-8 y repetidos archivos completos: 40. Primer arranque de arnes sin VITE_API_URL mostro error; corregido con URL loopback explicita, sin leer .env. Ambos resultados incompletos excluidos de validacion final.

Pendiente: tras despliegue autorizado comprobar cabecera efectiva, visor con cuentas reales de prueba y capas proxy que puedan imponer otra CSP. No se ejecuta nginx/Docker. No cambia estado documental ni admision, sin commit/push/despliegue. Ver docs/EVIDENCE-VIEWER-CSP-FIX.md.

## Reproduccion

1. `node scripts/serve-evidence-csp.mjs <ruta-absoluta-PNG-sintetico>`.
2. Abrir `http://127.0.0.1:4207/?role=DRIVER&old=1`, pulsar Ver evidencia: error controlado por CSP anterior.
3. Abrir `http://127.0.0.1:4207/?role=DRIVER`, Ver evidencia: imagen visible.
4. Repetir con `?role=SUPER_ADMIN`; comprobar dimensiones naturales y cerrar evidencia.
5. Detener el servidor propio. Arnes no requiere cuentas reales, .env ni servicios externos.

## Archivos

- nginx.conf: blob limitado a img-src.
- src/verification/evidence.tsx: estados carga/exito/error y revocacion.
- src/test/verification-pages.test.tsx: fallo de decode y limpieza para ambos roles.
- scripts/serve-evidence-csp.mjs: componente real compilado bajo CSP de nginx con transporte sintetico.

No se cambia contrato backend ni autorizacion. La CSP anterior observada en la VM coincide con la configuracion que reproduce el fallo local; la correccion no esta desplegada.

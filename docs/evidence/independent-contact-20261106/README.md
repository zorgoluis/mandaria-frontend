# Contacto declarado del independiente — Web, 2026-11-06

Implementación local en QA, Web 1.11.0. Conserva los cambios pendientes de información del usuario. Sin commit, push ni despliegue.

## Contrato y comportamiento

Fuente documental consultada en sólo lectura: `mandaria-backend/docs/ADMIN-INDEPENDENT-CONTACT-HANDOFF-20261106.md` y `docs/openapi.json`, esquema `AdminIndependentDriverDetailResponse`. GET `/api/v1/admin/drivers/{driverId}/independent`, siempre Driver.id. Se consume únicamente `declaredContact` de raíz y su procedencia constante `DRIVER_IDENTITY_DECLARATION`.

La ficha muestra «Teléfono de contacto declarado». AVAILABLE exige string no vacío y procedencia válida, preserva exactamente el valor y lo renderiza como texto React. NOT_RECORDED con null muestra «No registrado»; UNAVAILABLE con null, respuesta antigua o estructura incompatible muestran «No disponible». Combinaciones contradictorias descartan el teléfono. No hay inferencia de OTP, aprobación ni causa de restricción. Carga y errores tienen textos propios.

`contact-contract.ts` separa el contrato de detalle de `IndependentDriverProfile` compartido. `independentDrivers.get` elimina declaredContact antes de entregar la respuesta a consumidores/caché. `DeclaredPhone` realiza una lectura independiente del mismo endpoint (una solicitud adicional al abrir, al recuperar foco y cada 15 segundos), sólo bajo SUPER_ADMIN activo, sin sesión expirada ni carga de autenticación. Este aislamiento evita introducir el teléfono en QueryClient y mantiene las invalidaciones existentes del perfil. No modifica listados ni mutaciones.

El componente conserva sólo el texto temporal necesario. Antes de releer retira el valor. AbortController, desmontaje, clave actor/conductor y sessionFence descartan respuestas de peticiones sustituidas o sesiones anteriores. La salida/reentrada crea una lectura nueva. La autorización o el error del perfil desmontan el contenido; los errores de la lectura privada también retiran el valor. El transporte existente usa cache:no-store, gestión vigente de sesión y ningún almacenamiento del cuerpo. No se encontraron service workers ni persistencia de consultas en src/public; AuthProvider ya limpia QueryClient al cambiar autoridad. No se agregaron logs, telemetría, almacenamiento o URL con el dato.

## Comprobaciones nuevas

- `npm test -- src/test/independent-contact.test.tsx src/test/driver-portal.test.tsx src/test/independent-drivers-api.test.ts`: 93/93 PASS en 3 archivos, 15,05 s antes de la separación del validador por lint; repetición final tras la corrección: 93/93 PASS, 12,24 s.
- `npm test`: 1806/1806 PASS, 88 archivos, 99,00 s. API simulada/dobles, no HTTP Nest.
- `npm run typecheck:test`: PASS.
- `npm run lint`: PASS tras mover el validador a contact-contract.ts. La primera ejecución detectó react-refresh/only-export-components; no se deshabilitó la regla.
- `npm run build`: PASS. Aviso conocido de chunk Root de 1256,74 kB.
- `node scripts/verify-independent-contact.mjs`: PASS con Chrome instalado y respuestas HTTP interceptadas. Cinco GET al detalle sintético; AVAILABLE, estados sin dato, salida/reentrada y ausencia de web storage. Vista aislada del componente integrado con InfoGrid y estilos reales a 1280/390 px, sin desbordamiento; no acredita el recorrido completo autenticado ni backend real.
- Capturas inspeccionadas y enmascaradas: [escritorio](desktop-masked.png), [móvil](mobile-masked.png). [Reporte sintético](browser.json). Sin teléfonos legibles ni cuerpos HTTP en las evidencias.

Pruebas nuevas cubren validación, estados, 401/403/404/503, Driver.id distinto de cuenta/perfil, respuestas tardías A/B y entre relecturas, cierre/cambio de sesión/rol, expiración, salida/reentrada, denegación a otros roles y eliminación de la proyección antes de devolver un perfil compartido. Las regresiones cubren nombre, cuenta, acciones y vehículos existentes.

## Pendiente HTTP real

No se proporcionó instancia local activa autorizada, URL/build efectivo ni fixtures dedicados para esta ampliación. El handoff acredita ejecuciones históricas del backend, no disponibilidad actual ni pruebas Web. Se requiere esa referencia de entorno y cuentas sintéticas autorizadas para probar HTTP real sin crear datos ni modificar restricciones compartidas. No se buscó una instancia en puertos históricos ni se arrancó/reinició backend. Producción y VM no verificadas.

Cero consultas alternativas de expedientes, cero cambios de datos del conductor. Backend, Driver y Coita intactos. Sin versión, .env, Docker ni mensajes externos.

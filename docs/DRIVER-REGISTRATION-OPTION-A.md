# Registro de conductores — opción A

Implementación local del 5 de noviembre de 2026 en Web QA y backend QA. El usuario eligió simplificar el registro con correo y dejar el acceso por celular para una etapa posterior.

## Experiencia

1. `/driver/register`: correo → código de seis dígitos, nombre completo y contraseña.
2. La Web inicia sesión con las credenciales recién elegidas y abre `/driver/onboarding`. Si la creación se confirmó pero el login falla, ofrece entrar con la cuenta creada, sin repetir la creación.
3. Aceptaciones personales vigentes → datos y vehículo → fotos por documento y un envío conjunto. El nombre se precarga y el identificador del vehículo se genera internamente.
4. La pantalla vuelve al avance guardado al recargar. La solicitud permanece en revisión; no activa conductor ni vehículo.

El asistente corresponde a independientes PENDING con hasta una unidad. El detalle sigue disponible en `/driver/onboarding?view=details` para expedientes anteriores, estados mixtos, correcciones y gestión avanzada; flotillas y perfiles existentes conservan sus superficies. Tipo y placa se fijan al dar de alta la unidad; este alcance no agrega un editor operativo de vehículos para DRIVER.

Los códigos largos anteriores siguen confirmándose en `/driver/verify`. No se cambia el acceso por correo/contraseña de cuentas existentes. La landing puede conservar su enlace `/driver/register`.

## Diseño de las vistas

La revisión visual del 5 de noviembre unifica las seis pantallas con verde profundo, fondos claros y tarjetas adaptadas al celular. En escritorio, el registro presenta una introducción al recorrido; en móvil prioriza el formulario. Los pasos distinguen completado/actual/pendiente, los datos se agrupan en persona/vehículo/licencia y cada documento muestra una indicación y su estado de carga. La confirmación explica qué se recibió y qué sigue. No cambia el contrato ni agrega pasos.

Capturas: [inicio móvil](evidence/driver-registration-design-20261105/signup-mobile.png), [inicio escritorio](evidence/driver-registration-design-20261105/signup-desktop.png), [código](evidence/driver-registration-design-20261105/code-mobile.png), [términos](evidence/driver-registration-design-20261105/terms-mobile.png), [datos](evidence/driver-registration-design-20261105/data-desktop.png), [fotos](evidence/driver-registration-design-20261105/photos-desktop.png), [confirmación](evidence/driver-registration-design-20261105/submitted-mobile.png). [Recorrido final y limpieza del entorno](evidence/driver-registration-design-20261105/verification.json).

Validación de esta revisión: 165 pruebas relacionadas, tipos, lint y build PASS; recorrido real de registro en Chrome con servicios locales y datos sintéticos PASS. Sin desbordamientos a 320, 390, 768 y 1280 px. Las capturas de términos corresponden al entorno de prueba; no acreditan los textos publicados en producción.

## Contrato nuevo

| Método y ruta (prefijo `/api/v1`)                 | Entrada                                                                                                   | Resultado                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| POST `/independent-driver-registrations/start`    | `{ email }`                                                                                               | 202 `{ status: "CHECK_EMAIL", challengeId, resendAfterSeconds: 60, expiresInSeconds: 600 }` |
| POST `/independent-driver-registrations/complete` | `{ challengeId, code, name, password }`                                                                   | 200 `{ status: "CREATED_LOGIN_REQUIRED", email }`; después la Web llama al login existente  |
| POST `/driver/onboarding/submit`                  | `{ identityCaseId, identityRevision, vehicleCaseId, vehicleRevision }`, sesión DRIVER e `Idempotency-Key` | 200 `{ id: identityCaseId, status: "SUBMITTED", caseIds: [identityCaseId, vehicleCaseId] }` |

`GET /driver/onboarding` añade `guidedRegistration: true`, `driver.name` y `plate` en las unidades. Crear un expediente de identidad precarga el nombre del conductor. El nuevo comando `SUBMIT_ONBOARDING`, destino `SELF`, se consulta/cierra mediante los endpoints existentes de intentos documentales.

El código es string, conserva ceros iniciales y queda ligado a un challenge UUID. Se guarda únicamente un HMAC con separación de propósito y la clave JWT existente; ni el código ni la contraseña aparecen en URLs, almacenamiento de registro o logs. Cada challenge admite cinco intentos y diez minutos; los fallos se confirman en la transacción. Reenvío tras 60 segundos invalida el código anterior. Las respuestas a solicitudes de correo son genéricas, incluidas cuentas existentes y fallos de transporte. El límite HTTP es cinco solicitudes por minuto por ruta/IP.

El envío conjunto comprueba propiedad, ámbito independiente, versiones, términos, archivos, placa y licencia vigente compatible con el tipo motorizado. Actualiza ambos expedientes, historiales y planes de retención en una transacción. Un fallo no presenta sólo uno. Replay con la misma clave devuelve el recibo sin repetir efectos. No aprueba identidad, unidad, perfil ni operaciones.

## Publicación

Aplicar primero la migración backend `20261105010000_driver_signup_code`, generar Prisma y publicar el backend que contiene estos endpoints; después publicar Web. Utilizar los procedimientos existentes del entorno de destino. Se reutilizan correo y almacenamiento privados existentes; no se agrega proveedor de SMS ni otra clave de configuración.

La migración se probó únicamente en PostgreSQL temporal. La implementación y revisión visual no desplegaron, aplicaron migraciones en la base operativa ni enviaron correos a personas reales. El propietario autorizó posteriormente commit y push a QA; la publicación Git no actualiza por sí misma la VM.

## Actualización en VM

Procedimiento derivado de los Dockerfiles, entrypoint y configuración del repositorio; no se ha inspeccionado la instalación de la VM ni ejecutado Docker. Conservar los archivos Compose, configuración y valores de build propios del despliegue.

1. Identificar rama/SHA que ejecuta la VM en ambos repositorios. Esta entrega va a `QA`; si la VM sigue `main`, integrar primero los commits mediante el procedimiento habitual o elegir expresamente la revisión QA para el despliegue. Un pull de main no incorpora automáticamente QA.
2. Tener un respaldo de la base y registrar las revisiones/imágenes actuales. Consultar las migraciones pendientes del entorno: Prisma aplica todas las pendientes, no solamente la nueva de esta tarea.
3. Actualizar y reconstruir el backend. La migración `20261105010000_driver_signup_code` crea `DriverSignupChallenge` y su índice; no modifica cuentas existentes. El Dockerfile genera Prisma durante `npm ci`; el entrypoint ejecuta `npx prisma migrate deploy` antes de arrancar. Fuera de Docker, usar el procedimiento Node existente: dependencias, `npm run prisma:generate`, build, `npm run db:deploy` y reinicio del servicio. Con una sola instancia, su recreación puede interrumpir solicitudes brevemente.
4. Confirmar salud del backend (`/health`) y migración aplicada antes de actualizar la Web. Para registro real deben estar operativos el correo, la publicación DRIVER de términos/privacidad, `DRIVER_VERIFICATION_LOCAL_ENABLED=true` (nombre histórico que también aplica en producción) y las variables `VERIFICATION_SPACES_*`. Esta mejora no agrega claves ni proveedores; comprobar la configuración existente, sin sustituirla por la de pruebas. Conservar las claves JWT actuales; rotar `JWT_ACCESS_SECRET` invalida códigos pendientes.
5. Reconstruir y publicar la Web con su origen API de producción. El origen documentado es `VITE_API_URL=https://mandaria.com.mx`, sin `/api/v1`, y se incorpora al compilar. Conservar también los demás argumentos existentes, incluida la clave pública de Maps si se utiliza. Reiniciar un contenedor con archivos estáticos antiguos no incorpora el rediseño.
6. Comprobar `/driver/register`: recepción real del código, creación y acceso automático, aceptaciones, guardado de datos, cargas y envío único. Verificar que identidad y vehículo queden en revisión y el conductor pendiente. El ensayo local previo no acredita entrega real del proveedor de correo.

La landing conserva su enlace `/driver/register`. No se requiere SMS ni un servicio adicional. Si fuera necesario revertir esta entrega, restaurar primero la Web anterior y después el backend anterior; la tabla nueva puede permanecer para conservar la información. La revisión de otras migraciones pendientes y de la instalación real determina el procedimiento definitivo de reversión.

## Verificación nueva

- Web: 1.773/1.773 pruebas en 87 archivos, tipos de pruebas, lint y build aprobados. Se mantiene el aviso de tamaño del chunk de Vite.
- Backend: 936/936 pruebas en 63 archivos, build y lint aprobados; lint conserva una advertencia previa en un script ajeno.
- `node scripts/verify-simple-driver-registration.mjs`: PASS con Chrome, Nest real, PostgreSQL temporal, correo capturado y almacenamiento privado local. Nueve grupos de comprobaciones incluyen límite de intentos, vencimiento, entorno, reenvío, concurrencia, formato de correo, registro por UI, acceso automático, reanudación, cargas, autorización y envío atómico.
- Se provocó la pérdida de la respuesta después del commit de presentación: consultar el intento desde la UI recuperó el envío. Dos expedientes SUBMITTED, un evento SUBMIT por expediente y conductor PENDING, incluso tras replay y recarga.
- Revisión visual de 390 y 1280 px; sin desbordamiento horizontal móvil en el ensayo. Capturas e informe en [evidencia](evidence/driver-registration-option-a-20261105/).

Las ejecuciones iniciales detectaron etiquetas de pruebas antiguas, una etiqueta accesible de contraseña, la ausencia de Chromium descargado y ajustes del arnés de correo/recuperación. Se corrigieron y se usó Chrome instalado. No se presentan como aprobadas esas corridas iniciales. El ensayo final aprobado se conserva con su fecha y cierre de PostgreSQL confirmado.

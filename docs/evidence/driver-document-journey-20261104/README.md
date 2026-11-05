# Mi cuenta → Identidad y Unidad en revisión

El 4 de noviembre de 2026 un repartidor independiente presentó ambos expedientes desde Chromium en la misma sesión. Se usó Web 1.11.0 sobre `505ae52` con las dos correcciones locales indicadas abajo, Nest del checkout backend local (paquete 1.13.9), PostgreSQL 18 y almacenamiento privado local. El [registro HTTP](journey.json) contiene las rutas, respuestas, IDs, revisiones, horas UTC y la huella del módulo documental ejecutado.

| Expediente | Imágenes validadas por el backend | Relectura como titular | Hora CDMX |
|---|---|---|---|
| [Identidad](DRIVER_IDENTITY.png) | Rostro, frente y reverso de INE, licencia para motocicleta | SUBMITTED, revisión 11 | 18:03:54 |
| [Unidad](VEHICLE.png) | Tarjeta de circulación de la motocicleta propia | SUBMITTED, revisión 5 | 18:03:58 |

**Preparación.** El arnés creó una base nueva tras comprobar el directorio y el puerto del clúster, aplicó las migraciones y preparó una cuenta DRIVER con correo confirmado y perfil independiente pendiente. La base partió sin expedientes. Las imágenes son rótulos de prueba. El adaptador local del backend atendió los PUT firmados por HTTP en loopback y el servicio documental validó los archivos.

**Acciones en Web.** El repartidor inició sesión, abrió Mi cuenta, siguió «Ver mi siguiente paso», aceptó los términos y creó Identidad. Guardó sus datos y licencia, seleccionó cada categoría y cargó las cuatro imágenes. Cuando la guía indicó «Listo para enviar a revisión», presentó y confirmó. Volvió a Mi cuenta, siguió el paso de vehículos, registró la motocicleta, creó su expediente y guardó los datos de unidad propia. La pantalla ofreció una sola categoría de imagen. Tras cargarla, el repartidor presentó y confirmó Unidad.

**Comprobación.** Las cinco cargas completaron creación HTTP 201, PUT 200 y confirmación 200. Ambos POST de presentación respondieron 200. Al salir del detalle y volver a abrirlo, el GET autenticado devolvió un evento SUBMIT por expediente y el conjunto exacto de adjuntos VALIDATED. La pantalla indicó «Expediente enviado» y «En revisión». El ensayo terminó ahí y cerró sus propios procesos.

**Correcciones.** Chromium usa el modo Unicode `v` para validar el patrón HTML del identificador. Se escapó el guion del patrón y se comprobó que el navegador detectara `WEB/PRUEBA` como inválido y permitiera registrar `WEB-PRUEBA`. En el resumen de expedientes ya enviados se sustituyeron «Enviar expediente» y «Datos del borrador» por el estado y los datos presentados.

**Reproducción.** Desde el repositorio Web con las dependencias de ambos proyectos, el build local de backend, Chromium de Playwright y PostgreSQL 18 para Windows, ejecutar `node scripts/verify-driver-document-journey.mjs`. Requiere los puertos libres 4227, 4228 y 55459. Cada ejecución crea su propia base y entrega un informe bajo `test-results/onboarding-production-isolated/<ejecución>/`. La configuración efectiva del recorrido es LOCAL_TEST. Se conservan en esta carpeta únicamente el informe sanitizado y las capturas de la ejecución final.

Durante el ajuste del arnés se corrigieron un selector ambiguo de categoría y una carrera al leer una respuesta durante navegación. Un intento anterior agotó la espera antes de observar el alta del vehículo. El recorrido final espera a que el formulario sea válido y esté habilitado. Adicionalmente pasaron 101 pruebas en los archivos completos `verification-pages` y `verification-upload`, tipos de pruebas, lint y build. Vite mantuvo el aviso de tamaño del chunk Root.

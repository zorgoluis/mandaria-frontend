# Teléfono declarado — aceptación HTTP/UI local, 2026-11-06

**PASS en entorno desechable autorizado.** Web QA sobre `85be7a3`, versión 1.11.0 sin cambios. Backend 1.13.9 compilado desde sus fuentes actuales en una copia temporal dentro de frontend; la versión no se usó como prueba de disponibilidad. No se modificó producto Web, backend ni Driver.

Corrida final: **2026-11-06T16:45:26.035Z–16:46:08.408Z** (10:45–10:46, Ciudad de México). [Informe HTTP sanitizado y manifiesto](http.json). API propia `http://127.0.0.1:4227`, Web temporal `http://127.0.0.1:4228`, PostgreSQL 18 aislado en 55459. Todos detenidos al finalizar. No son una instancia disponible para uso posterior.

- Fuentes backend SHA256: `463e59d6628a9d1c2bb8ee1425deed751ba19e83bf25b72ebf6d82b8fb0a1e41` (comprobadas antes y después).
- Build temporal SHA256: `701438e8b1a6c05d54dab9f588347fd6beeefb3f9758b21cf5d823740bcebbc2`.
- Antes de migrar, el harness comprueba host, puerto, nombre y directorio del clúster desechable. Puertos libres requeridos: si están ocupados, aborta sin detener procesos ajenos.
- Configuración temporal con `ignoreEnvFile`, secretos aleatorios en memoria, correo local y FCM apagado. Sin credenciales reales ni .env operativo.

## Resultado ejecutado

| Comprobación | Resultado |
| --- | --- |
| Login HTTP real de SUPER_ADMIN | PASS |
| AVAILABLE y coincidencia exacta del valor sintético, sin guardarlo en evidencia | PASS |
| NOT_RECORDED y UNAVAILABLE, ambos con phone=null | PASS |
| Procedencia contractual y cabecera `Cache-Control: private, no-store` | PASS |
| Driver.id, User.id y perfil distintos; IDs incorrectos en ruta → 404 | PASS |
| DRIVER, CUSTOMER, PROVIDER_ADMIN → 403; sin token → 401 | PASS |
| Listado compartido sin declaredContact ni teléfono | PASS |
| Chrome: ficha completa real con los tres estados, correo y nombre | PASS |
| Salida/reentrada a la ficha y ausencia del valor en almacenamiento Web | PASS |
| AVAILABLE → NOT_RECORDED → UNAVAILABLE, mediante cambios exclusivos del fixture | PASS |
| Guard de recuperación real → 503 y retirada del teléfono en UI | PASS |
| Logout por UI → login, sin componente privado | PASS |
| Cierre de Chrome, Vite, Nest y PostgreSQL propios | PASS |

Hay cinco grupos de comprobaciones en el informe, no cinco pruebas unitarias. Las peticiones de navegador no están interceptadas: cero page.route/mocks. El reporte registra métodos, rutas, estados y correlaciones HTTP cuando están disponibles; no tokens, contraseñas, teléfonos ni cuerpos. Los 404 de créditos y los 503 de zonas de la ficha son esperados: perfiles PENDING sin cuenta de crédito, flag de ofertas apagado. Se distinguen del 404 de identidad incorrecta y del 503 de recuperación probados explícitamente. El dato declarado visible con perfil PENDING confirma que Web no inventa una aprobación adicional.

## Preparación y límites

Los usuarios, perfiles y expedientes DRAFT/WITHDRAWN se preparan mediante Prisma exclusivamente en la base desechable antes de consultar. La prueba no acredita registro/onboarding por UI. Durante la prueba, se retira el teléfono del expediente sintético y luego se pasa a WITHDRAWN con revisiones sucesivas para comprobar las transiciones; no son acciones administrativas de producto. La marca de recuperación se crea y elimina sólo en esa misma base para provocar el guard 503. No se consultan expedientes como alternativa desde Web. No se modifica información de ningún conductor operativo.

Esta corrida no vuelve a acreditar toda la matriz histórica backend de retención, restricciones concurrentes, selección entre expedientes, expiración de tokens o respuestas tardías de red. Las pruebas simuladas de respuestas tardías, cambio de cuenta y compatibilidad con servidores antiguos se conservan en la evidencia anterior. No hay validación en producción, VM, Android o Coita.

## Reproducción y correcciones del harness

Desde frontend, con PostgreSQL 18 y Chrome locales instalados:

```powershell
node scripts/verify-independent-contact-http.mjs
node --check scripts/verify-independent-contact-http.mjs
npm run lint
```

Los tres comandos terminaron con código 0. No se repitieron suite global, tipos ni build Web: no cambió código de producto. Las 1806 pruebas globales y 93 focalizadas anteriores son históricas.

Intentos conservados en `test-results/onboarding-production-isolated`:

1. `1793983201769`: compilación bloqueada por cliente Prisma backend desactualizado. No se arrancó PostgreSQL. Corrección: copiar fuentes/configuración y generar Prisma sólo en el runtime temporal, sin escribir en backend.
2. `1793983260283`: HTTP y estados UI pasaron; aserción errónea exigía desmontar el componente en 503. Se corrigió para exigir retirada del dato, permitiendo el mensaje de error. Clúster detenido.
3. `1793983341660`: falló el harness al abrir el menú antes de restaurarse la sesión. Se añadió espera por visibilidad real, sin aumentar timeouts. Clúster detenido.
4. `1793983433856`: recorrido completo PASS; captura móvil tomada durante la animación del menú.
5. `1793983526034`: repetición final PASS, captura tras ocultarse el menú y limpieza de todos los procesos registrada. No sumar repeticiones como cobertura nueva.

Capturas finales revisadas, con teléfono enmascarado: [escritorio](desktop-masked.png) · [móvil](mobile-masked.png).

La autorización posterior para arrancar una instancia desechable supera el bloqueo de disponibilidad registrado previamente. Sin cambios de versión, commit/push, despliegue, Docker ni procesos compartidos.

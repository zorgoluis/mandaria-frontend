# Handoff de verificación móvil — zonas propias, backend 1.13.1

2026-10-25. No se modificó ni ejecutó mandaria-driver/Android. La lectura DRIVER por HTTP acredita el contrato, no la interfaz ni refresco móvil. Este documento no envía mensajes a otros agentes.

## Reproducir el resultado Web/HTTP

Desde `C:\Users\zorgl\Documents\mandaria-frontend`, ejecutar `node scripts/verify-client-sync-http.mjs`. Requiere la distribución WSL `Mandaria-Postgres`, Node `/opt/mandaria-node/node-v24.15.0-linux-x64/bin/node`, PostgreSQL18 y dependencias ya instaladas del checkout sintético `/home/mandaria/backend-offers-20261023`. El script compara sus fuentes con el backend Windows y falla ante divergencia; compila en scratch, sin tocar ambos repositorios backend. No usar Docker ni .env.

Mantener libres API4237, Web4238 y PostgreSQL55484; no detener servicios ajenos para obtenerlos. La ejecución crea datos/identidades sintéticos, comprueba 18 escenarios y cierra sus procesos. No sirve como servidor persistente después del reporte. Los informes guardan métodos/rutas, resultados de aserciones HTTP, huellas y capturas; nunca tokens, contraseñas ni cuerpos.

## Sesión sintética para observación Android (pendiente)

Para una sesión controlada, iniciar sólo el fixture en una terminal local con stdin abierto:

```powershell
wsl.exe -d Mandaria-Postgres -- /opt/mandaria-node/node-v24.15.0-linux-x64/bin/node /mnt/c/Users/zorgl/Documents/mandaria-frontend/scripts/client-sync-http-wsl.mjs
```

Esperar el mensaje JSON `stage:ready`. Sus credenciales son efímeras; consumirlas sólo localmente y no guardarlas en evidencia. `credentials.adminEmail`/`password` permiten SUPER_ADMIN; `credentials.email` es dueño de A y `ids.drivers.pedro` es el conductor de prueba. Para login DRIVER, la fixture backend actual define `mail(n) = n + '-' + run + '@independent.test'`: el correo de Pedro se obtiene sustituyendo únicamente el prefijo `sa-` de `credentials.adminEmail` por `pedro-`, conservando el sufijo exacto de esa ejecución y la misma contraseña sintética. Contrastar antes con `test/fleet-direct-take.e2e-spec.ts` si la fixture cambia; nunca usar cuentas operativas.

Enviar por stdin una línea JSON `{"id":1,"action":"zoneProfile"}`. Crea por APIs administrativas 26 zonas activas de geometrías separadas y devuelve profileId real/driverId. No confundirlos. La API escucha en localhost4237. Ejercitar los GET/PUT documentados mediante un cliente HTTP autenticado. Para usar Web, reproducir el servidor Vite programático del harness: configFile/envDir false, VITE_API_URL definido como origen `http://127.0.0.1:4238` (sin /api/v1), host 127.0.0.1, puerto4238 estricto y proxy `/api` a `http://127.0.0.1:4237`. Esto evita CORS sin alterar backend. No guardar variables en .env ni activar proveedores reales.

En emulador/dispositivo usar únicamente el mecanismo local de URL/debug ya admitido por la App; si admite localhost con ADB reverse, el agente móvil podrá usar `adb reverse tcp:4237 tcp:4237` y retirarlo al terminar. No modificar App para fingir compatibilidad. Si la build no admite ese servidor, registrar el bloqueo de configuración/build en lugar de declarar verificada la UI.

1. Iniciar sesión DRIVER Pedro y consultar recepción actual por su mecanismo existente. Registrar `allowedZones`, `selectedZoneId` y `shift` sin tokens. La fixture inicial tiene afiliación FLEET; no habilitar selección independiente mediante caché.
2. SUPER_ADMIN abre la ficha por driverId, obtiene el perfil existente y consulta zonas por profileId. Autoriza una zona ACTIVA del catálogo con revisión exacta y motivo; confirmar el PUT.
3. Refrescar recepción móvil con su mecanismo existente. Debe aparecer esa zona en las autorizadas; la autorización sola no selecciona zona, inicia turno, aprueba perfil ni transfiere cobertura FLEET. El fixture también expone `{"id":2,"action":"zoneRead"}` para comparar la lectura HTTP DRIVER real.
4. Para verificar operación independiente posterior, completar primero la salida por START/RECHECK y resolver bloqueos reales mediante recorridos existentes; el servicio histórico de Pedro ya está liberado. Verificar elegibilidad separada. Elegir modo/zona y comenzar recepción sólo con acciones explícitas del conductor y sus precondiciones vigentes. No fabricar vehículos/documentos/ubicaciones elegibles ni eludir restricciones. Esta parte no se acredita con las pruebas Web.
5. SUPER_ADMIN retira todas las zonas, confirma lista vacía. Refrescar App y comprobar que no conserva autorizaciones obsoletas. Si hay recepción activa, observar la reconciliación que el backend realmente devuelve; no asumir que el estado será idéntico al escenario inicial sin turno.
6. Repetir cambio de cuenta, reentrada, flag OFF y respuesta perdida usando el contrato de la App. Separar resultados Android de los HTTP ya existentes.

Cerrar siempre el fixture enviando `{"id":99,"action":"stop"}` por stdin; verificar `stopped:true` y `backendUnchanged:true`. EOF también ejecuta finally de limpieza. Cerrar sólo la Web/forwarding de esta sesión. Flags temporales pertenecen al proceso sintético; no persisten remotamente.

## Resultado acreditado y límites

La ejecución Web final observó `allowedZones` actualizado en GET `/api/v1/driver/offer-reception`, `selectedZoneId:null` y `shift:null` tanto al autorizar como tras concurrencia/vaciado. UI Android, recepción push/socket, selección explícita e inicio de turno móvil quedan pendientes. Los proveedores externos de routing/mail se simularon y FCM/socket estuvieron desactivados. Anotar build/App, comandos, datos sintéticos, resultados por paso y bloqueos en la evidencia móvil propia; no copiar las cifras históricas backend como ejecución móvil.

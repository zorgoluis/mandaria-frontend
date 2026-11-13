# Verificación conjunta del recorrido documental del repartidor

El 4 de noviembre de 2026 se verificó Web 1.11.0 en Windows con Node 24.15.0 y npm 11.12.1. El árbol de trabajo inicial estaba limpio en `main`. El commit `b3591a7a9089c99246bd2b9fc0d673b934901389` incluye la guía de `505ae5227cca8e9a6ee782191db9630b653c4c69` y las correcciones de la validación del identificador de unidad y del resumen tras enviar.

| Comando | Alcance | Evidencia |
|---|---|---|
| `npm test` | Suite completa configurada de Vitest | [Salida](vitest.txt) |
| `npm run typecheck:test` | Tipos de pruebas | [Salida](typecheck-test.txt) |
| `npm run lint` | ESLint del repositorio | [Salida](lint.txt) |
| `npm run build` | Tipos de producto y compilación Vite | [Salida](build.txt) |
| `node scripts/verify-driver-document-journey.mjs` | Recorrido del titular en Chromium con HTTP real y PostgreSQL aislado | [Registro HTTP](journey.json) |

Los cinco comandos terminaron con código 0. La suite global pasó **1.751 de 1.751 pruebas en 86 archivos**, en 125,44 s. Vite emitió su aviso de tamaño para el chunk Root de 1.222,48 kB.

Desde Mi cuenta, el repartidor sintético aceptó los términos, preparó su identidad con licencia y registró una motocicleta propia. El navegador realizó cinco cargas privadas con HTTP 200. La presentación de cada expediente respondió 200. Al volver a abrirlos, ambos tenían estado `SUBMITTED` y un único evento `SUBMIT`.

| Expediente | Hora CDMX | Revisión | Imágenes validadas |
|---|---|---|---|
| [Identidad](DRIVER_IDENTITY.png) | 18:08:32 | 11 | Rostro, frente y reverso de INE, licencia |
| [Unidad](VEHICLE.png) | 18:08:36 | 5 | Tarjeta de circulación |

Esta ejecución utilizó una base nueva en modo LOCAL_TEST, el paquete backend 1.13.9 y almacenamiento local. PostgreSQL se detuvo al terminar. El [recorrido anterior](../driver-document-journey-20261104/README.md) conserva sus propias referencias.

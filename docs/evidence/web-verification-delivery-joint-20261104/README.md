# Mi verificación documental y código de entrega en main

El 4 de noviembre de 2026 se verificó Web 1.11.0 en Windows, con Node 24.15.0 y npm 11.12.1. La ejecución partió de un árbol limpio en `9fa1c0691ae7c610b8045e5e7e2f2f0382e09b47`, que incluye `dd39ff361e7b8438fbb44245a39c4d680e119c0a`.

La [primera ejecución de npm test](vitest-initial-summary.txt) recorrió los 86 archivos y detectó seis fallos entre 1.748 pruebas. Los seis esperaban el botón de cierre del repartidor sobre el mismo fixture de servicio LEGACY. El fixture omitía la política de confirmación. El contrato exige `NOT_REQUIRED` explícito para ofrecer esa acción.

Se corrigió el fixture en `src/test/delivery-completion.test.tsx` y se añadieron dos casos con política ausente o `REQUIRED`. Ambos esperan a que cargue el detalle y comprueban que el botón esté ausente y que el servicio de cierre reciba cero llamadas.

| Comando | Alcance | Salida |
|---|---|---|
| `npm test` | Suite global de Vitest con la configuración del repositorio | [Ejecución final](vitest.txt) |
| `npm run typecheck:test` | TypeScript de pruebas | [Tipos](typecheck-test.txt) |
| `npm run lint` | ESLint del repositorio | [Lint](lint.txt) |
| `npm run build` | Tipos de producto y compilación Vite | [Build](build.txt) |

Los cuatro comandos terminaron con código 0 en la validación final. Vitest pasó 1.750 de 1.750 pruebas en 86 de 86 archivos en 94,84 s. Vite emitió el aviso de tamaño para el chunk Root de 1.219,12 kB.

Como antecedente de integración se cotejaron los SHA-256 del JSON HTTP y de la captura terminal con el [registro de MDR-000001](../delivery-confirmation-web-20261103/customer-terminal-observation.json). La observación HTTP de `DELIVERED` con `CODE_VERIFIED` corresponde al recorrido del 3 de noviembre.

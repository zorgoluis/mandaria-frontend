# Publicación administrativa independiente del alta

Cambio local autorizado en main, sin commit, push ni despliegue. PublicationPage ya no llama useRequirements ni deriva disponibilidad de alta: usa GET admin/verification-policy.runtimeEnvironment. Sólo PRODUCTION habilita formulario; LOCAL_TEST o campo ausente bloquean. environment durable puede seguir LOCAL_TEST con runtime PRODUCTION y admisión desactivada. Backend compatible necesario; no se asume habilitación por punteros o flags de sesión.

Se conservan revisión previa, confirmación, permisos, clave/cuerpo y recuperación. No se modificaron hooks, marcadores ni comandos de activación. Otros flujos documentales siguen dependiendo de sus controles originales. Tipado opcional del campo representa compatibilidad con backend antiguo, que queda bloqueado para publicar.

Verificación nueva: 30/30 pruebas en src/test/onboarding-production.test.tsx completo, incluidos permisos, conflictos y recuperación existentes y dos nuevos casos de alta desactivada y metadata ausente. Build, tipos de pruebas, ESLint focalizado y diff PASS. Advertencia de chunk >500kB persiste. Componentes en jsdom con respuestas controladas: no es navegador integrado con servidor.

Backend validó aparte 27 unitarias y 17 E2E HTTP/PostgreSQL aislados; evidencia en C:/Users/zorgl/Documents/mandaria-backend/docs/checks/publication-without-intake.json. Clúster propio detenido. [Huellas Web](publication-without-intake-evidence.json). Ningún texto real publicado, .env cambiado o admisión activada. Producto Landing intacto. Requiere despliegue coordinado posterior autorizado antes de usarlo en VM.

## Corrección final del layout

VerificationLayout montaba Warning y su consulta requirements; el refresco de publicación podía fallar. Se sustituye por aviso estático sólo para SUPER_ADMIN en /admin/verification-publications. Recovery y Outlet conservados. Pruebas finales bajo layout real: publicación/recuperación con alta deshabilitada, sin consultar requirements. **57/57 únicos** en onboarding-production.test.tsx y verification-pages.test.tsx completos; sustituyen las 30 anteriores sin sumarlas. Build, tipos y lint posteriores PASS. Sin navegador real.

El control final de tipos detectó un import Recovery sin uso tras mover la prueba al layout. Se retiró y se repitieron tipos y lint: PASS. No se alteró lógica ni se sumaron pruebas adicionales.

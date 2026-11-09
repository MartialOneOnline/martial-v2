# Auditoría del proyecto — primera pasada prioritaria

> Informe de Codex Project Audit, copiado al repo por Claude el 2026-11-09. Se omiten los logs en bruto de lint (0 errores / 216 avisos) y Vitest (1216 pasan / 55 fallan / 1 todo, 12 archivos); el resumen está en la sección 4.

**Veredicto global: RECHAZADO.**

Commit auditado: `605e021f9d6a7f65b2ae3f7e6ccd71ab253ff2f1` (`origin/main`). Ejecución: 9 de noviembre de 2026. No se modificó código funcional, schema, migraciones ni datos; no se llamaron proveedores reales.

Primera pasada: se priorizaron los módulos 1, 6, 7, 14 y 17. Los demás quedan pendientes salvo hallazgos parciales documentados.

## 1. Resumen ejecutivo

Hallazgos confirmados: **P0: 0, P1: 6, P2: 7, P3: 1**.

Prioridad: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, AUTH-01, AUTH-02, CRON-01, MAIL-01.

Las reproducciones de handlers usan código real con autenticación/persistencia/proveedores simulados. La firma de Stripe sí se verificó con el SDK real y secreto sintético.

## 2. Módulos y cobertura

|Módulo|Veredicto|P0|P1|P2|P3|Tests|Navegador|
|---|---|---:|---:|---:|---:|---|---|
|1. Auth y acceso|RECHAZADO|0|0|3|1|Media|Sí: login simulado 375/1280|
|2. Dashboard home|PENDIENTE|0|0|0|0|Media|No|
|3. Users|RECHAZADO (parcial)|0|2|0|0|Media|No|
|4. Memberships|PENDIENTE|0|0|0|0|Media|No|
|5. Classes y reservas|PENDIENTE|0|0|0|0|Media|No|
|6. Payments|RECHAZADO|0|1|0|0|Media|No|
|7. Webhooks y cron|RECHAZADO|0|1|1|0|Media|No|
|8. Reports|RECHAZADO (parcial)|0|1|0|0|Media|No|
|9. School|PENDIENTE|0|0|0|0|Media|No|
|10. Campaigns, notificaciones, soporte y billing|RECHAZADO (parcial)|0|0|1|0|Media|No|
|11. Settings|PENDIENTE|0|0|0|0|Media|No|
|12. Portal /my|PENDIENTE|0|0|0|0|Media|No|
|13. Público y marketing|PENDIENTE|0|0|0|0|Baja|No|
|14. Superadmin|APROBADO CON PENDIENTES (estático)|0|0|1|0|Media|No|
|15. Emails|PENDIENTE|0|0|0|0|Media|No|
|16. Otras apps y packages|PENDIENTE|0|0|0|0|Baja|No|
|17. Seguridad transversal|RECHAZADO|0|1|1|0|Media|Parcial: login|

## 3. Hallazgos

### [P1] SEC-01 — Webhook Stripe pierde la escuela cuya firma se verificó
- **Archivo:** `apps/web/app/api/webhooks/stripe/route.ts:180; :699; :706`
- **Reproducción:** Conocer un stripeSubId de B y disponer del secreto de webhook de A. Firmar `customer.subscription.deleted` con el secreto de A, `metadata.schoolId=A` e `id=sub_B`.
- **Evidencia:** HMAC real de Stripe y persistencia simulada: 200, `updateMany` por `stripeSubId=sub_B` sin schoolId y sincronización de school-B.
- **Impacto:** Un administrador con su propio secreto puede cambiar membresías de otra escuela si conoce el identificador.
- **Criterio de aceptación:** Propagar la escuela verificada al procesador y restringir todas las lecturas/escrituras relacionadas. Una firma de A nunca modifica objetos de B, incluidos eventos y órdenes; regresión cruzada y entrega legítima.

### [P1] SEC-02 — Crear un movimiento permite enlazar y revelar un usuario ajeno
- **Archivo:** `apps/web/app/api/dashboard/transactions/route.ts:173; :186; :195`
- **Reproducción:** Como gestor de pagos de A, POST con `userId` de alguien que solo pertenece a B.
- **Evidencia:** 201, movimiento schoolId=A/userId=B y respuesta con nombre/email de B. Sin comprobación de SchoolMember.
- **Criterio de aceptación:** Validar pertenencia del destinatario a la escuela autorizada antes de escribir; rechazar ids ajenos sin devolver PII. Cubrir movimientos anónimos.

### [P1] SEC-03 — La ficha incluye pagos del alumno en otras escuelas
- **Archivo:** `apps/web/app/dashboard/users/[id]/page.tsx:60; :152`
- **Reproducción:** Usuario en A y B; abrir su ficha desde A con un pago solo en B.
- **Criterio de aceptación:** Añadir schoolId autorizado al filtro de transacciones; ninguna fila de B llega al cliente de A.

### [P1] SEC-04 — Instructor puede abrir ficha completa sin permiso de alumnos
- **Archivo:** `apps/web/app/dashboard/users/[id]/page.tsx:25; :138; apps/web/lib/auth/permissions.ts:100`
- **Evidencia:** La página admite OWNER/ADMIN/INSTRUCTOR por nombre de rol y serializa emergencyContact, medicalNotes, contacto y movimientos; INSTRUCTOR no tiene `school.members.view`.
- **Criterio de aceptación:** Autorizar con el permiso correspondiente y limitar campos sensibles; pruebas para INSTRUCTOR, CUSTOM y roles autorizados.

### [P1] SEC-05 — Informes operativos omiten el permiso de analítica del menú
- **Archivo:** `apps/web/app/api/dashboard/reports/{bookings,users,absents,grading-readiness}/route.ts`
- **Evidencia:** bookings con INSTRUCTOR sin `school.analytics.view` → 200. Pagos y Balance sí exigen permiso.
- **Criterio de aceptación:** Permiso efectivo en servidor por informe, coherente con menú y CUSTOM.

### [P1] SEC-06 — Next fijado a una versión con avisos de seguridad pendientes
- **Archivo:** `apps/web/package.json:31; package-lock.json`
- **Evidencia:** `npm audit`: 163 entradas (4 critical / 133 high / 22 moderate / 4 low); next 16.2.0 directo. Avisos: GHSA-q4gf-8mx6-v5v3, GHSA-492v-c6pp-mqqv, GHSA-267c-6grr-h53f, GHSA-vcvr-r3jv-pc5j.
- **Criterio de aceptación:** Actualizar a versiones que resuelvan los avisos aplicables; repetir auth/proxy/SSR/OG, build y audit.

### [P2] AUTH-01 — safeRedirect permite salir del origen con barra inversa
- **Archivo:** `apps/web/lib/safeRedirect.ts:4; apps/web/app/login/page.tsx:93`
- **Evidencia:** acepta `/\external.example` → resuelve `https://external.example`.
- **Criterio de aceptación:** Rechazar barras inversas y controles; comprobar mismo origen; variantes codificadas y `//`.

### [P2] AUTH-02 — El login con contraseña queda bloqueado al fallar la red
- **Archivo:** `apps/web/app/login/page.tsx:322; :328; :297`
- **Evidencia:** Chromium 375/1280 con red caída: botón deshabilitado, sin alerta, `Failed to fetch` sin gestionar.
- **Criterio de aceptación:** Petición acotada, errores capturados, controles restaurados en finally; error traducido; prueba también para Google.

### [P2] ROLE-01 — CUSTOM con permisos sigue fuera de entradas al dashboard
- **Archivo:** `apps/web/lib/auth/contexts.ts:86; apps/web/app/dashboard/layout.tsx; apps/web/lib/auth/customRoles.ts`
- **Criterio de aceptación:** Acceso por pertenencia activa y permisos efectivos, matriz consistente layout/API/enlaces.

### [P2] CRON-01 — Cron acepta `Bearer undefined` cuando falta configuración
- **Archivo:** `apps/web/app/api/cron/*/route.ts`
- **Criterio de aceptación:** Fallar cerrado si el secreto falta; pruebas de los cinco cron.

### [P2] MAIL-01 — Dos procesadores pueden enviar dos veces la misma campaña
- **Archivo:** `apps/web/lib/services/campaigns.ts:36; :60; :70`
- **Criterio de aceptación:** Claim atómico con recuperación y clave de idempotencia en el proveedor.

### [P2] ADMIN-01 — Interruptores generales guardan valores que no se aplican
- **Archivo:** `apps/web/app/admin/settings/SettingsClient.tsx:163; apps/web/app/api/admin/settings/general/route.ts:37; apps/web/app/api/auth/register/route.ts:97`
- **Criterio de aceptación:** Aplicar cada política en servidor o retirar los controles.

### [P2] QA-01 — La suite principal mantiene 55 fallos
- 1216 pasan / 55 fallan / 1 todo; 12 archivos. Mocks sin modelos como `classCancellation`, `notification`, `transaction`.
- **Criterio de aceptación:** Base verde sin desactivar tests.

### [P3] I18N-01 — Textos visibles de acceso fuera del diccionario
- **Archivo:** `apps/web/app/login/page.tsx:342; :572; :676`; también FAQ de `/my/help`.

## 4. Verificaciones globales

|Comprobación|Resultado|
|---|---|
|`npm run check-types` raíz|Falla en apps/api: falta `generated/prisma/client.js` (entorno).|
|`check-types` apps/web|Pasa.|
|`npm run lint` raíz|Pasa; web 0 errores, 216 avisos.|
|`npx vitest run` web|1216 pasan / 55 fallan / 1 todo.|
|`npm audit`|163 entradas: 4 critical / 133 high / 22 moderate / 4 low.|
|Prisma historia|56 migraciones; 29 de 71 cambios de schema sin migración en el mismo commit (histórico).|
|Prisma migrate diff|No completado (403 descargando engine).|
|Secretos|Sin hallazgos por patrones en archivos rastreados.|

Otros: faltan `GOOGLE_CLIENT_SECRET` y `NEXT_PUBLIC_GOOGLE_CLIENT_ID` en `.env.example`; `apps/api` conserva `/db-test` público.

Reproducciones sintéticas:

```text
AUTH_REDIRECT {"input":"/\\external.example","accepted":"/\\external.example","resolvedOrigin":"https://external.example"}
PAYMENTS_CROSS_SCHOOL_USER status 201, schoolId=A, userId=user-only-school-B, respuesta con name/email de B
WEBHOOK_A_SIGNATURE_B_MEMBERSHIP status 200, membershipWrite.where={stripeSubId:"sub_B"}, sync schoolId=school-B
CRON_SECRET_MISSING {"status":200,"serviceCalls":2}
PROFILE_TRANSACTIONS_OTHER_SCHOOL where={userId,deletedAt:null} → serializa tx-school-B
CONCURRENT_CAMPAIGN_SEND {"syntheticSends":2}
REPORT_WITHOUT_ANALYTICS_PERMISSION {"role":"INSTRUCTOR","analyticsPermission":false,"status":200}
REGISTRATION_SETTING_UNUSED {"status":200,"queriedPlatform":false,"syntheticUserCreated":true}
ADMIN_GUARD_MATRIX null→401, STUDENT/OWNER/INSTRUCTOR/CUSTOM→403, SUPERADMIN→200
LOGIN_NETWORK_FAILURE 375 y 1280: botón deshabilitado, 0 alertas, "Failed to fetch"
```

## 5. Lotes propuestos

1. **Aislamiento financiero:** SEC-01/02/03.
2. **Permisos efectivos:** SEC-04/05 y ROLE-01.
3. **Dependencias:** SEC-06.
4. **Acceso recuperable:** AUTH-01/02 + I18N-01.
5. **Efectos externos:** CRON-01 + MAIL-01.
6. **Controles honestos de admin:** ADMIN-01.
7. **Base verificable:** QA-01, cliente de apps/api, Prisma diff; después módulos pendientes.

## 6. Continuación necesaria

Pendientes los recorridos integrales de módulos 2–5, 8–13, 15–16 y las comprobaciones de infraestructura de 1/6/7/14/17.

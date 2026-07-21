# Project Audit — Claude desarrolla, Codex audita

Este documento es la fuente de verdad del circuito de entrega entre agentes.

## Responsabilidades

### Claude — desarrollo

1. Lee `AGENTS.md`, `CONTEXT.md` y este documento.
2. Comprueba rama, worktrees y cambios ajenos antes de tocar archivos.
3. Implementa el lote acordado con cambios mínimos.
4. Añade o actualiza tests de regresión.
5. Ejecuta type-check, tests y lint proporcional al alcance.
6. Prueba en navegador los recorridos visibles cuando sea posible.
7. Actualiza `CONTEXT.md`.
8. Entrega a Codex el commit/diff y evidencia; no da la auditoría por cerrada por sí mismo.

### Codex — Project Audit

1. Trabaja en modo lectura/revisión sobre el lote entregado.
2. Contrasta la afirmación de cierre con el código, tests y comportamiento observable.
3. No implementa el arreglo durante la auditoría.
4. Clasifica hallazgos:
   - `P0`: pérdida de datos, seguridad crítica o producción inutilizable.
   - `P1`: flujo principal roto, acción engañosa o autorización incorrecta.
   - `P2`: caso relevante incompleto, regresión probable o cobertura insuficiente.
   - `P3`: mantenibilidad, documentación o detalle menor.
5. Devuelve cada hallazgo con reproducción, evidencia, impacto y criterio de aceptación.
6. Emite uno de estos veredictos:
   - `APROBADO`: sin hallazgos bloqueantes y criterios cubiertos.
   - `APROBADO CON PENDIENTES`: funciona, pero quedan límites explícitos aceptables.
   - `RECHAZADO`: existe al menos un P0/P1 o falta evidencia esencial.

## Ciclo por lote

1. Usuario prioriza el siguiente lote.
2. Claude implementa en su rama/worktree.
3. Claude entrega:
   - objetivo y criterios de aceptación;
   - commit(s) y archivos cambiados;
   - comandos ejecutados y resultados;
   - pruebas de navegador realizadas/no realizadas;
   - riesgos o partes no verificables;
   - confirmación de que cambios ajenos siguen intactos.
4. Codex audita de forma independiente.
5. Si se rechaza, Claude corrige exactamente los hallazgos y vuelve a entregar.
6. Codex reaudita solo el delta más los recorridos afectados.
7. Tras aprobación, Claude hace el cierre operativo acordado (push/PR/merge) y actualiza `CONTEXT.md`.

## Reglas de evidencia

- “Type-check pasa” no equivale a recorrido end-to-end probado.
- “El handler existe” no demuestra que el endpoint persista el resultado correcto.
- Cada CTA visible debe ser real, estar deshabilitado con explicación honesta o no mostrarse.
- Un flujo autenticado no se marca end-to-end si no se recorrió con sesión real.
- Un proveedor externo no se marca completo sin callback, error/cancelación y entorno final verificados.
- No se mezclan bugs nuevos con un lote auditado salvo que bloqueen su funcionamiento o seguridad.

## Estado actual — 2026-07-21

### Lote A — `/my`

- Estado: `APROBADO CON PENDIENTES` a nivel de código/tests.
- Confirmado: rutas, handlers y endpoints reales revisados; suite automatizada verde.
- Pendiente: recorrido completo con sesión de alumno real.

### Lote B — CTA público de reserva

- Estado: `APROBADO CON PENDIENTES`.
- Confirmado: caso Roger Gracie Málaga sin trial, selector real, clase con `schedule: null` y modal no autenticado.
- Fixes ya publicados: `bf60cf8`, `e23bb58`.
- Pendiente: escuela real con `hasFreeTrialCls: true`, viewport móvil y reserva autenticada completada.

### Lote C — registro/login

- Estado: `ENTREGADO PARA AUDITORÍA` — corrige el `RECHAZADO` original (botones SSO placebo). Claude revisó el delta local (no lo asumió correcto por existir), lo verificó y lo entrega a continuación; el veredicto (`APROBADO` / `APROBADO CON PENDIENTES` / `RECHAZADO`) lo emite Codex, no Claude.
- Cambios: se retiró la pantalla SSO decorativa y `/login` entra directamente por el formulario de email; se extrajo la lógica de reserva pública a `apps/web/lib/trialBooking.ts` (`selectCtaClasses`, `buildBookingSession`) y se añadieron 4 tests de regresión en `apps/web/__tests__/trialBooking.test.ts`.
- Verificado por Claude antes de entregar: `check-types` ✅, suite completa (693 passing/1 todo) ✅, `eslint` sobre los 5 archivos ✅, `git diff --check` ✅, y navegador: `/login` desktop+móvil, Forgot Password→Back, RGM en móvil, CTA sticky móvil→selector→clase con horario→modal no autenticado, clase sin horario sin crash. Sin errores de consola/servidor.
- Pendiente end-to-end (fuera de este lote, requiere sesión/correo real que Claude no puede generar por reglas de seguridad — no debe introducir contraseñas): registro → email → confirmación → login → redirección → reserva autenticada.

### Lote D — social login para dominio final

- Estado: `PLANIFICADO`, no implementar todavía como botones decorativos.
- Proveedores confirmados: Google, Apple y Microsoft; Facebook descartado.
- Momento: migración de V2 a `martialapp.com`.
- Criterio futuro: configuración Supabase/proveedor, callback de dominio final, login/cancelación/error, vinculación de cuenta existente y prueba end-to-end por proveedor.

## Próxima entrega de Claude

Lote C entregado (ver arriba). Pendiente de veredicto de Codex Project Audit. Si `RECHAZADO`, Claude corrige exactamente los hallazgos devueltos y vuelve a entregar solo el delta. Si `APROBADO` / `APROBADO CON PENDIENTES`, el siguiente lote priorizado por el usuario decide si se ataca la rama `hasFreeTrialCls: true`, la reserva autenticada real, o el ciclo de registro con correo real.

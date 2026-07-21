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

- Estado: `APROBADO CON PENDIENTES`, con una corrección aplicada tras el rechazo del Lote C (ver abajo) porque tocaba el mismo componente: las clases con `schedule: null`/`[]` (p. ej. "Graduación", "Open Mat") ahora se renderizan `disabled` en el selector, en vez de ser un botón clicable que no hacía nada — ver detalle en Lote C.
- Confirmado: caso Roger Gracie Málaga sin trial, selector real, clase con horario real abre el modal, clase sin horario visible y correctamente no-interactiva (probado pulsándola, no solo mostrándola), modal no autenticado, desktop y móvil.
- Fixes publicados: `bf60cf8`, `e23bb58`, `56ea29e` (parte de Lote C).
- Pendiente: escuela real con `hasFreeTrialCls: true`, reserva autenticada completada.

### Lote C — registro/login

- Estado: `EN CORRECCIÓN → REENTREGADO`. Codex rechazó el commit `56ea29e` (`RECHAZADO`, P1): las filas de clases sin horario en el selector del CTA (`TrialBookingCTA.tsx`) tenían el mismo aspecto y `onClick` que las reservables, pero `selectClass()` → `buildBookingSession()` devolvía `null` y el clic no producía ninguna respuesta visible — un affordance muerto, no un crash. La verificación anterior de Claude había probado que esas filas se *mostraban* sin romper la página, pero nunca las había *pulsado*.
- Corrección (delta correctivo, mismo lote): `lib/trialBooking.ts` añade `hasBookableSchedule()` y `selectBookingSession(classes, classId)`; `TrialBookingCTA.tsx` renderiza las filas sin horario como `disabled`, sin `ChevronRight`, con el texto "No online schedule — contact us"; `handleClick()` ya no intenta abrir el modal en falso cuando la única clase disponible no es reservable.
- Cambios previos que se mantienen: se retiró la pantalla SSO decorativa y `/login` entra directamente por el formulario de email.
- Tests: 8 nuevos — `hasBookableSchedule` (`null`/`[]`/slot real), `buildBookingSession` con `schedule: []` (antes solo `null`), `selectBookingSession` sobre lista mixta reservable/no-reservable incluyendo selección explícita de la no reservable.
- Verificado por Claude antes de reentregar: `check-types` ✅, suite completa (**701 passing/1 todo**, sube de 693 por los 8 tests nuevos) ✅, `eslint` sobre los archivos tocados ✅, `git diff --check` ✅.
- Navegador (repetido, pulsando esta vez las filas específicas que Codex señaló): `/login` desktop+móvil, Forgot Password→Back, RGM en móvil → CTA sticky → selector → **"Graduación" pulsada: sin respuesta, correcto** → **"Open Mat" pulsada: sin respuesta, correcto** → "Jiu Jitsu Iniciación" (clase distinta a la probada en el intento anterior) → modal correcto pidiendo login/registro. Sin errores de consola/servidor.
- Contradicción documental corregida: esta sección y `CONTEXT.md` (Sesión 75) decían "sin crash" dando a entender que el recorrido de clic estaba probado end-to-end; ahora ambos documentos distinguen explícitamente "se muestra sin crashear" (lo único verificado antes) de "se pulsa y responde correctamente" (verificado ahora).
- Pendiente end-to-end (fuera de este lote, requiere sesión/correo real que Claude no puede generar por reglas de seguridad — no debe introducir contraseñas): registro → email → confirmación → login → redirección → reserva autenticada.

### Lote D — social login para dominio final

- Estado: `PLANIFICADO`, no implementar todavía como botones decorativos.
- Proveedores confirmados: Google, Apple y Microsoft; Facebook descartado.
- Momento: migración de V2 a `martialapp.com`.
- Criterio futuro: configuración Supabase/proveedor, callback de dominio final, login/cancelación/error, vinculación de cuenta existente y prueba end-to-end por proveedor.

## Próxima entrega de Claude

Lote C reentregado con el delta correctivo del hallazgo P1 (ver arriba). Pendiente de veredicto de Codex Project Audit. Si `RECHAZADO` de nuevo, Claude corrige exactamente los hallazgos devueltos y vuelve a entregar solo el delta. Si `APROBADO` / `APROBADO CON PENDIENTES`, el siguiente lote priorizado por el usuario decide si se ataca la rama `hasFreeTrialCls: true`, la reserva autenticada real, o el ciclo de registro con correo real.

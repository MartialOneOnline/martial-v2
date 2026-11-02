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

- Estado: **`APROBADO CON PENDIENTES`** (veredicto de Codex Project Audit sobre `e29e496`). Historial: Codex rechazó primero el commit `56ea29e` (`RECHAZADO`, P1) porque las filas de clases sin horario en el selector del CTA (`TrialBookingCTA.tsx`) tenían el mismo aspecto y `onClick` que las reservables, pero `selectClass()` → `buildBookingSession()` devolvía `null` y el clic no producía ninguna respuesta visible — un affordance muerto, no un crash. La verificación anterior de Claude había probado que esas filas se *mostraban* sin romper la página, pero nunca las había *pulsado*.
- Corrección aplicada y confirmada independientemente por Codex en `e29e496`: `lib/trialBooking.ts` añade `hasBookableSchedule()` y `selectBookingSession(classes, classId)`; `TrialBookingCTA.tsx` renderiza las filas sin horario como `disabled`, sin `ChevronRight`, con el texto "No online schedule — contact us"; `handleClick()` ya no intenta abrir el modal en falso cuando la única clase disponible no es reservable. Codex confirmó: sin hover engañoso/chevron/handler activo en filas no reservables, clases reservables siguen abriendo el modal, listas mixtas cubiertas, type-check/Vitest (701 passing/1 todo)/lint/`git diff --check` correctos, rama sincronizada, `claim/` intacto.
- Cambios previos que se mantienen: se retiró la pantalla SSO decorativa y `/login` entra directamente por el formulario de email.
- Único hallazgo restante: **P3 documental** — pendientes explícitos que no se pueden cerrar dentro de este lote. Codex indicó que no requiere otra auditoría funcional, solo dejarlos declarados con claridad (hecho en esta misma entrada):
  - Escuela real con `hasFreeTrialCls: true` y clases `isTrial` reales — código de esa rama sin tocar en Lote B/C, sin escuela de prueba disponible en esta sesión.
  - Reserva completa con sesión autenticada real (`confirmBooking()` → `POST /api/bookings`) — Claude no puede generar una sesión autenticada por sus propias reglas de seguridad (no introduce contraseñas en ningún formulario).
  - Registro y confirmación mediante correo real (registro → email → clic en el link de confirmación → login) — requiere una bandeja de correo real a la que Claude no tiene acceso.

### Lote D — social login para dominio final

- Estado: `PLANIFICADO`, no implementar todavía como botones decorativos.
- Proveedores confirmados: Google, Apple y Microsoft; Facebook descartado.
- Momento: migración de V2 a `martialapp.com`.
- Criterio futuro: configuración Supabase/proveedor, callback de dominio final, login/cancelación/error, vinculación de cuenta existente y prueba end-to-end por proveedor.

### Lote E — Grading readiness / tarjeta de asistencia (PR #33)

- Estado: **`APROBADO CON PENDIENTES`** (Codex sobre `9dd32a5`).
- Historial: `RECHAZADO` sobre `83d6045` (P1 meses desde `joinedAt`, P1 huecos en `classesByDegree`, P2 `TOP_RANK` sin clases, P2 sección del report desaparecía con error) → corregido en `67710f9`. Reauditoría `RECHAZADO` (P1 cinturón homónimo de otro sistema, P2 grado sin `fromBelt` como cambio de cinturón) → corregido en `9dd32a5`.
- Confirmado por Codex: 32/32 tests del lote + 4 pruebas propias del cargador, TypeScript/ESLint/`git diff --check`, suite 821 pasan / 55 preexistentes idénticos, UI del report validada en Chromium con API simulada (error → reintento, graduar → fallo de refresco → aviso).
- Pendiente: recorrido autenticado con persistencia real en BD (graduar desde perfil/report y comprobar el registro `Grading`). La migración `20261026120000_belt_rank_classes_by_degree` ya está aplicada en la BD compartida — mergear pronto para evitar drift.

### Lote F — Reglas de graduación por grado (rama `claude/grading-step-rules`)

- Estado: `RECHAZADO` sobre `268b9d2` (P1 fecha de inicio tomada de otro sistema; P2 ventana mensual días 29–31; P2 tope en UTC; P2 informe sin motivos) → corregido en `bfd58ce` → **`APROBADO CON PENDIENTES`** (Codex). Migración `20261101120000_belt_rank_step_rules` aplicada en la BD (2026-11-01). Pendiente: recorrido autenticado con persistencia real.
- Objetivo: cada escuela puede exigir, por grado, clases, meses mínimos desde la graduación anterior y edad mínima; y por cinturón una frecuencia mínima (bloquea) y máxima (tope de clases que cuentan).
- Criterios: reglas en blanco no aplican; tiempo con fecha desconocida no se cumple (nunca `joinedAt` salvo primer grado del sistema); tope por semana (lunes) o mes natural; validación API mín./máx./periodo; textos en EN/ES/PT/FR.
- No verificado: navegador y recorrido autenticado; migración `20261101120000_belt_rank_step_rules` sin aplicar en la BD.

### Lote G — Plantillas de graduación del super admin (rama `claude/grading-templates`, PR #39)

- Estado: `APROBADO CON PENDIENTES` sobre `0ef8f2a` (P2 guardado admin pierde cambios; P2 dos sistemas por defecto en concurrencia; P2 selector reabierto permite duplicar; P3 admin en idioma mixto) → corregido en `6afcbe9` → **`APROBADO CON PENDIENTES`** (Codex). Migración `20261101180000_grading_templates` aplicada en la BD (2026-11-01). Pendiente: comprobar persistencia con sesión real.
- Objetivo: el super admin crea plantillas de sistemas de cinturones (IBJJF, judo, karate…) con todas las reglas por cinturón/graduación; las escuelas ven solo las publicadas y crean su propia copia editable.
- Criterios: solo super admin en `/api/admin/grading-templates/**`; no publicar sin cinturones; validación de cinturones igual que la API de ranks; la escuela solo copia plantillas publicadas y necesita `school.gradings.manage`; la copia es independiente (editar/borrar la plantilla no la toca; `templateId` → null al borrar); `classTypeIds` no se copia; textos de escuela en EN/ES/PT/FR.
- No verificado: navegador y recorrido autenticado; migración `20261101180000_grading_templates` sin aplicar (bloquea también Ajustes → Graduaciones si se despliega sin ella).

### Lote H — Informe de graduaciones atrasadas (rama `claude/overdue-gradings`, PR #40)

- Estado: `RECHAZADO` sobre `89115a2` (P1 atraso anterior al grado actual; P2 fechas de fin de mes/29-feb; P2 chips sin filtro de cinturón; P3 texto del umbral) → corregido en `23d92d4` → **`APROBADO CON PENDIENTES`** (Codex). Pendiente: recorrido autenticado con datos reales.
- Objetivo: ver a quién le tocaba un grado y no se le ha dado, desde cuándo, con los alumnos nuevos (< 6 meses) primero, y sacar la lista para el día de graduación.
- Criterios: `dueSince` = cuándo se cumplió la última regla del primer paso debido (clase N tras el tope, meses, edad), nunca futuro ni anterior al paso previo; atrasado = ≥14 días; orden nuevos → días → pasos; chips y contadores coinciden con la lista; CSV con el orden del informe y el formato del idioma; textos EN/ES/PT/FR.
- No verificado: navegador y datos reales.

### Lote I — Filtro por cinturón en el informe de alumnos (rama `claude/report-belt-filter`)

- Estado: **`APROBADO CON PENDIENTES` sobre `f62b7f8`**. Antes fue `APROBADO CON PENDIENTES` sobre `fe771a2` (5 P2 + 1 P3); en la reauditoría quedaron todos cerrados y no hay hallazgos nuevos. Chromium (API simulada): gráfico, panel, URL y recarga, varios filtros con grados, CSV y "Seleccionar todos". Suite: 990 pasan / 55 fallos idénticos a main. Único pendiente: recorrido autenticado con datos reales.
- Objetivo: en Reports → Users, listar a los alumnos de uno o varios cinturones (y grados), también desde el gráfico, sin que tildes o idiomas del texto libre dejen a nadie fuera.
- Criterios: "Marrón"/"Marron"/"Brown Belt" son el mismo cinturón; opciones = catálogo de la escuela + nombres fuera de catálogo + "sin cinturón", con recuentos; varios cinturones = O, cinturón + grado = Y; la lista, la paginación, el CSV y "Seleccionar todos" respetan el filtro; el gráfico filtra y muestra activos; la URL conserva el filtro; enlaces viejos `?belt=Marrón` siguen funcionando; cambiar el cinturón como texto no deja `beltRankId` viejo; textos EN/ES/PT/FR.
- Correcciones de la re-entrega: borrar el cinturón desenlaza el rango; el gráfico quita grados, búsqueda y rango Custom; el editor de Users conserva el valor guardado exacto; los enlaces antiguos adoptan la clave resuelta; la preparación para graduación usa `resolveBeltRank` como el informe, y el PATCH guarda el enlace que resuelve el texto; mock `gradingSystem` en `dashboardReportAuthGuards.test.ts`. Nuevo `memberBeltLink.test.ts`.
- No verificado: navegador y recorrido autenticado.

### Lote I — Informe de Leads (rama `claude/leads-report`, PR #43)

- Estado: `RECHAZADO` sobre `0fd0d00` (P1 actividad anterior al lead; P2 asistencia/conversión sin evidencia; P2 reserva cancelada = sin contactar; P2 prueba próxima incompleta; P2 ficha 403 con permiso de lectura; P2 CSV de otro periodo) → `APROBADO CON PENDIENTES` sobre `674b1ac` (los 6 cerrados; P2 nuevo: un error tardío de otra ficha borraba la ficha actual) → corregido (carga cancelable `lib/leads/detailLoad.ts`) → **`APROBADO CON PENDIENTES` sobre `d1aa1a3`** (sin hallazgos P0–P3; P2 de la ficha cerrado). Pendiente operativo aceptado por Codex: sesión autenticada y datos reales; botones de gestión visibles para lectores (deuda previa del CRM).
- Objetivo: ver hasta dónde llega cada interesado (contactado → reservó prueba → vino → se apuntó) y a quién darle un empujón, con contacto directo.
- Criterios: etapas por evidencia (email/convertedUserId → reservas y pagos de cuota de esta escuela, nunca de otra); LOST fuera de las listas; 48 h para "sin contactar"; invitaciones del equipo fuera por defecto; permiso `school.leads.view`; respuestas fuera de orden descartadas; textos EN/ES/PT/FR.
- No verificado: navegador y datos reales.
- Mergeado a `main` el 2026-11-01 (431ac9e) con el OK del usuario.

### Lote J — Frecuencia de graduación semana a semana (rama `claude/grading-weekly-count`)

- Estado: `APROBADO CON PENDIENTES` sobre `d8582b7` (P3: los avisos decían "semanas" con mínimo mensual y "1 clases") → corregido → **`APROBADO CON PENDIENTES` sobre `c06bd82`** (sin hallazgos P0–P3; pendiente operativo: sesión autenticada con datos reales). Sin migración.
- Decisión del usuario (2026-11-01, caso Rafa en RGM): "aquí no hay media de nada, son contabilidad de clases". El mínimo por semana/mes ya no es una media que bloquea: una semana con menos clases que el mínimo suma 0; una que lo alcanza suma como mucho el máximo. Con mín. 2 / máx. 2, 8 clases = 4 semanas completas de 2.
- Criterios: semanas lunes–domingo en la zona horaria del colegio; la semana en curso por debajo del mínimo queda "pendiente" (no perdida); una clase cuenta desde el día en que su semana alcanza el mínimo (afecta a `earnedAt`/"le toca desde"); ya no existe el bloqueo `FREQUENCY`; avisos en ficha e informe (máximo, semanas por debajo, semana en curso) en EN/ES/PT/FR.
- No verificado: navegador y datos reales.

### Lote K — Módulo "Cinturones y graduaciones" (rama `claude/grading-module`)

- Estado: `APROBADO CON PENDIENTES` en `4770d80` (4 P2) → `APROBADO CON PENDIENTES` en `24c3312` (los 4 corregidos; 1 P2 nuevo) → `APROBADO CON PENDIENTES` en `efcee36` (cerrado; 1 P2 de regresión) → `APROBADO CON PENDIENTES` en `6194d1a` (cerrado; 1 P2 de recuperación) → **`APROBADO CON PENDIENTES`** en `e993442`, sin hallazgos P0–P3 abiertos. Único pendiente operativo: recorrido con sesión autenticada y datos reales. Sin migración (vive en `School.modules`).
- Pedido del usuario (2026-11-01): una escuela de boxeo no tiene cinturones, y una de BJJ puede no querer usarlos. Antes el portal /my ya lo respetaba (sin sistema → sin "Progreso"), pero el dashboard mostraba cinturones y graduaciones siempre.
- Criterios: interruptor en Settings → Modules; valor inicial = activado si la escuela ya tiene un sistema de grados activo (RGM no nota nada), desactivado si no; un guardado que no envía `grading` no lo apaga (`mergeSchoolModules`); con el módulo apagado desaparece todo lo de cinturones del dashboard y de /my, sin borrar datos; enlaces directos a páginas de graduación muestran un estado "desactivado" con enlace a Módulos; el formulario de staff ya no exige cinturón si el módulo está apagado; textos nuevos en EN/ES/PT/FR.
- Superficies: menú (School → Gradings, Reports → Gradings), Settings (pestaña Grading + interruptor), ficha del alumno (insignia, Belt & Progress, Attendance & grading, editor), lista de alumnos (columna, filtro, alta, importación, CSV), informe de alumnos (gráfico, filtro, columna, CSV), pagos y suscripciones (filtro, insignia, CSV), staff (campo y columna), calendario/horario (cinturón de asistentes), campañas (tipo "Belt progress"), /my (tarjeta y estadística de cinturón, perfil, asistentes de clase vía API).
- No verificado: navegador y datos reales.
- Hallazgos de Codex en `4770d80` y corrección:
  1. P2 — fallo de `/api/auth/me` tras guardar dejaba "Saving…" para siempre. `refresh()` ya no lanza (devuelve true/false); `save()` con `try/finally`; si el PATCH falla → "No se pudo guardar…"; si guarda pero el contexto no se refresca → aviso "Guardado. El menú aún no se ha actualizado" con botón Reintentar (4 idiomas).
  2. P2 — superficies olvidadas: "Cambiar cinturón" del menú de fila (UsersClient), cinturón en Settings → Staff, e historial global de /my/progress. Las dos primeras se condicionan; `/api/my` filtra `gradings` en el servidor a escuelas con módulo encendido y sistema activo (pide 50, devuelve 10, sin exponer `modules`).
  3. P2 — `?belt=` antiguo con el módulo apagado: la API del informe ignora belt/degree y devuelve el filtro vacío; la página ya no pasa el filtro inicial; el cliente vacía filtros y URL solo cuando el módulo está confirmado apagado (nunca con `null`).
  4. P2 — estado desconocido tratado como apagado: Users e informe de alumnos reciben `gradingEnabled` resuelto en el servidor (`lib/grading/moduleServer.ts`) y lo reparten con `GradingEnabledProvider` (lo lee `useGradingEnabled()` antes que el contexto), así tabla y CSV no cambian de forma; si aun así no se conoce, los botones de exportar quedan deshabilitados.
- Tests nuevos: `myGradingsModuleFilter` (2). Suite 1036 pasan / 55 preexistentes; tsc 0; eslint 0 errores.
- Hallazgo de Codex en `24c3312` y corrección:
  5. P2 — el valor del servidor (props) se imponía al contexto ya actualizado: tras apagar el módulo, volver a Users con props cacheadas devolvía la columna y el CSV de cinturón. Nuevo `resolveGradingEnabled(context, server)` en `lib/school-modules.ts`: el contexto, una vez cargado, manda (en los dos sentidos); el valor del servidor solo cubre el arranque mientras el contexto carga. Lo usan `useGradingEnabled()`, UsersClient y UsersReportClient. Tests: 4 casos en `schoolModulesGrading` (arranque, apagado después, encendido después, desconocido). Suite 1040 / 55 preexistentes.
- Hallazgo de Codex en `efcee36` y corrección:
  6. P2 (regresión) — un fallo de `/api/auth/me` terminaba la carga sin `currentSchool` y se leía como `false`, imponiéndose al `true` del servidor (columnas y CSV sin cinturón, filtro borrado de la URL). Nuevo `gradingFromSchoolContext()`: solo un contexto cargado con escuela resuelta da true/false; cargando o fallido → `null`. Así un fallo conserva el valor del servidor, y sin ninguno queda `null` (exportaciones bloqueadas). Tests: 2 casos más en `schoolModulesGrading`. Suite 1042 / 55.
- Hallazgo de Codex en `6194d1a` y corrección:
  7. P2 — sin valor del servidor, un fallo de `/api/auth/me` dejaba el gate de Graduaciones vacío y Settings → Grading en "Loading…" sin salida. `useSchoolContext()` expone `failed` (se limpia con un `refresh()` correcto); `schoolContextFailed()` (puro) + `useSchoolContextFailure()` en DashboardShell; nuevo `GradingLoadError` (error traducido + Reintentar que llama a `refresh()`) en el gate y en Settings → Grading. El contenido sigue oculto hasta conocer el módulo. Tests: 1 caso más. Suite 1043 / 55.

### Lote L — Rediseño de Settings → Grading (rama `claude/grading-settings`)

- Estado: `RECHAZADO` en `d514b3c` (1 P1, 3 P2) → `APROBADO CON PENDIENTES` en `137ff8c` (cerrados; 1 P3) → P3 corregido, **pendiente de confirmar**. Sin migración. Pendiente operativo: sesión autenticada con persistencia real.
- Pedido del usuario (2026-11-01/02): Settings → Grading más fácil, con opción de expandir; quitar "Classes per grading (default)"; elegir qué clases cuentan (p. ej. solo Gi); frecuencia mín. 2 / máx. 2 para todos sin repetirla por cinturón. Maqueta aprobada ("Construirlo así").
- Criterios: frecuencia y clases que cuentan se editan una vez para el sistema y se escriben en cada `BeltRank` sin frecuencia propia; un cinturón puede tener frecuencia propia; pasos de clases explícitos (lo que se ve es lo que cuenta el motor); un solo Guardar atómico (`PATCH …/ranks`), con descartar y aviso al salir; resumen en lenguaje claro y tiempo aproximado por cinturón; requisitos del siguiente cinturón (edad, tiempo mínimo, examen, competición) editados desde el cinturón actual; añadir/eliminar cinturón inmediato; 4 idiomas; móvil.
- A revisar: que guardar sin tocar nada no cambie el comportamiento del motor para ninguna escuela (pasos resueltos = fallback actual); que `classTypeIds` no acepte clases de otra escuela; que no aparezcan "cambios sin guardar" fantasma; que cambiar un cinturón no pise cambios de otro.
- No verificado: navegador y datos reales.
- Hallazgos de Codex en `d514b3c` y corrección:
  1. P1 — guardar escribía las clases comunes en todos los cinturones (Blue No-Gi pasaba a Gi y de READY a NOT_READY). Ahora un cinturón cuyas clases ya difieren conserva las suyas (`hasOwnClassTypes`, 4º parámetro de `buildSavePayload`); aviso "Con clases propias: … · Usar para todos" para aplicarlas a todos solo si el usuario lo decide.
  2. P2 — ediciones durante el guardado se perdían. Todo el editor va en un `<fieldset disabled>` mientras guarda; añadir/eliminar y guardar se excluyen entre sí.
  3. P2 — añadir un cinturón dejaba sin cifra el nuevo paso del anterior. `withNextStep()` lo inicia con el `totalClassesRequired` que contaba el motor (en el borrador y en la base guardada).
  4. P2 — crear sistema o aplicar plantilla cambiaba de sistema sin confirmar. `confirmLeave()` en GradingTab para selector, crear y plantilla. Además (pendiente que estaba declarado): cambiar de pestaña de Settings y los enlaces internos (barra lateral) piden confirmación con cambios sin guardar.
- Tests: 2 casos de regresión más en `gradingSettingsDraft` (P1 con el caso White/Blue/Black y P2 de añadir cinturón). Suite 1060 / 55 preexistentes; tsc 0; eslint sin avisos nuevos.
- Hallazgo de Codex en `137ff8c` y corrección:
  5. P3 — la confirmación de salida interceptaba `mailto:` y enlaces externos. `isInAppLeave()`: solo pregunta en navegación http(s) del mismo origen a otra ruta o query; `mailto:`/`tel:`, otros sitios (salida real → `beforeunload`) y anclas pasan sin preguntar. Test: 1 caso más. Suite 1061 / 55.

### Lote M — Pruebas gratis y conversión de leads (rama `claude/trial-fixes`)

- Estado: `RECHAZADO` en `104c2bf` (2 P1, 2 P2, 1 P3) → `RECHAZADO` en `6a364e7` (1 P1, 1 P2) → **`APROBADO CON PENDIENTES`** en `c0f1103` (cerrados; 1 P3 de SQL rehacible → corregido: `ADD COLUMN IF NOT EXISTS` y backfill solo donde el valor no está fijado). Migración `20261102120000_membership_trial_assignment`: aplicar en producción **antes** de desplegar el cliente nuevo, solo con OK explícito del usuario. Pendiente: revisión de la lista de RGM por el usuario y recorrido con sesión real. No mergear hasta que el usuario revise la lista de pruebas de RGM que caducarían.
- Pedido del usuario: una prueba gratis no debe perder al alumno que no pudo venir a tiempo; la prueba de un día no "se renueva"; un lead que acaba pagando debe convertirse. Decisiones: días desde la primera clase; caduca ese día sin bloquear; revisar la lista antes.
- Criterios: TRIAL nace sin endDate y se ancla en la primera clase asistida (desde la asignación − 24 h); sin margen de 30 días para TRIAL (los de pago lo conservan); prueba sin usar no caduca; ningún bloqueo de entrada; aviso en check-in y ficha ("Caducada" + "Asignar plan"); conversión de lead esperada y solo en pagos, también en renovaciones en efectivo y pagos marcados a mano; 4 idiomas.
- A revisar: que ningún plan de pago cambie su expiración; idempotencia del anclaje; que el dry run no escriba; que marcar asistencia no falle si falla el anclaje; carrera entre anclaje y barrido nocturno; efectos de `endDate: null` en /my, informes y KPIs.
- No verificado: navegador y datos reales.
- Hallazgos de Codex en `104c2bf` y corrección:
  1. P1 — anclaje no idempotente (usaba `startDate`, que él mismo movía). Ahora la referencia es `Membership.createdAt` (− 24 h), que nunca cambia; repetir la sincronización o el barrido no desplaza la ventana.
  2. P1 — pruebas que vencían antes de la primera clase. Una prueba sin usar y con fecha calculada pierde su `endDate` al sincronizar (sin fecha hasta la primera clase); `syncTrials()` se llama antes de comprobar reservas (`POST /api/bookings`, `GET /api/my/school-classes`) y tras marcar asistencia. La prueba pública (`/api/memberships/trial`, sin plan, `PUBLIC_TRIAL_NAME`, 7 días) nace sin `endDate` y entra en el mismo tratamiento (`TRIAL_MEMBERSHIP_WHERE` / `NON_TRIAL_MEMBERSHIP_WHERE`); la activación manual de un plan TRIAL también nace sin `endDate`.
  3. P2 — la fecha manual de efectivo se sobrescribía. `isManualTrialEnd()`: una fecha que no es inicio + validez (± 2 h por DST) es manual y nunca se mueve; la prueba termina en ella (aunque no se haya usado).
  4. P2 — renovaciones Stripe sin conversión. `invoice.payment_succeeded` convierte tras un cobro reclamado (idempotente con `stripeInvoiceId`), pasando el importe: 0 € no convierte.
  5. P3 — /my decía "Renueva" en pruebas. `/api/my` devuelve `plan.planType`; "Termina" para pruebas y bonos, "Renueva" (y "/ mes") solo para suscripciones, "Gratis" a 0 €, y "Empieza con tu primera clase" si no hay fecha.
- Tests: `trialLifecycle` reescrito con las reproducciones (idempotencia 31-oct/1-nov, prueba antigua sin usar, override 30-nov, dry run, prueba pública); 2 casos en `stripeWebhookLifecycleSync` (conversión una sola vez en renovación; 0 €). Suite 1078 / 55 preexistentes; tsc 0; ESLint sin avisos nuevos.
- Lista RGM recalculada con las reglas corregidas (lectura): 43 pruebas activas; 36 sin usar (perderán su fecha caducada y podrán reservar su primera clase); 1 con fecha manual a un año (se respeta); 3 usadas caducarían en el primer barrido.
- Hallazgos de Codex en `6a364e7` y corrección (sin heurísticas: el dato se guarda):
  6. P1 — una prueba importada o retrodatada (`createdAt` posterior a su asignación real) volvía a parecer sin usar y perdía su `endDate`. Nuevo `Membership.assignedAt` (cuándo se dio el plan): lo fijan `assignPlan` (= inicio, histórico si es retrodatado), la prueba pública, la activación manual y el importador `seed-rgm-payments`; la migración lo rellena en las pruebas existentes con `LEAST(createdAt, startDate)`; si falta, el código usa ese mismo valor y lo guarda una vez (idempotente).
  7. P2 — la heurística de fecha manual fallaba con una fecha igual al cálculo o dentro de la tolerancia. Nuevo `Membership.endDateManual`: `true` con el override de efectivo en `assignPlan` y cuando el staff cambia la fecha (`updateDates`); `false` si la borra o en una activación. La migración lo rellena una sola vez en las pruebas existentes con la regla anterior; desde entonces es explícito. Se elimina `isManualTrialEnd()`.
- Tests: 5 reproducciones nuevas en `trialLifecycle` (importada 2-nov/1-oct, fila sin `assignedAt` que lo fija una vez, fecha manual igual al cálculo sin usar, edición manual de 1 h, referencia histórica). Suite 1082 / 55 preexistentes; tsc 0; ESLint sin errores.

### Lote N — Informe de Ausencias: quién ha dejado de venir (rama `claude/absences-report`)

- Estado: `APROBADO CON PENDIENTES` en `9b5ee75` (5 P2, 1 P3) → **`APROBADO CON PENDIENTES`** en `0c0c5b6` (cerrados; 1 P3: día sin medianoche → `zonedStartOfDay` usa `startOfCivilDayUtc`, test São Paulo 2018-11-04). Sin migración. Pendiente: sesión autenticada y rendimiento real.
- Pedido del usuario: informes operativos; el de Ausencias solo contaba cancelaciones y no presentados, cuando el problema real son los alumnos activos que dejan de venir. Propuesta aprobada.
- Criterios: listas calculadas con asistencias (check-in o reserva); grupos 7–13 / 14–29 / 30+ días en la zona horaria del colegio; "nunca han venido" tras 7 días de alta; FROZEN y staff excluidos; los que pagan primero; frecuencia previa (8 semanas); contacto directo y CSV; no presentados incluyen reservas pasadas sin marcar; periodo solo para la sección de reservas; 4 idiomas; móvil.
- A revisar: cálculo de días y DST; rendimiento con escuelas grandes (historial de 1 año + `groupBy`); que el CSV no exporte datos de un periodo en carga; accesibilidad de tarjetas y pestañas; permisos (cualquier staff con acceso al dashboard, como antes).
- No verificado: navegador y datos reales.
- Hallazgos de Codex en `9b5ee75` y corrección:
  1. P2 — "Reservó y no vino" incluía staff y FROZEN: las consultas de no presentados y cancelaciones usan el mismo roster que las listas (`userId in` alumnos ACTIVE sin staff); contadores y filas coinciden.
  2. P2 — "Sin marcar" contaba desde el inicio: `isUnmarked()` = fin de la clase (`Class.duration`, 120 min si falta) + 3 h.
  3. P2 — filas del periodo anterior bajo el nuevo: la respuesta trae `period.key`; mientras el periodo mostrado no es el pedido, la pestaña "Reservó y no vino" no muestra filas (Cargando / error), el contador es 0, y la sección Reservas se atenúa con "mostrando {periodo}".
  4. P2 — sin `joinedAt` entraba en "Nunca han venido": la ruta usa `joinedAt ?? createdAt` del SchoolMember; la lógica pura no lista a nadie con fecha desconocida.
  5. P2 — límites en la zona del servidor: nuevo `lib/absences/periods.ts` (`absencePeriod`, `zonedStartOfDay`) en la zona del colegio; 30 días = diez tramos de 3 días contiguos (antes solo un día de cada tres); 90 días / 12 meses = meses naturales locales. No cambia `lib/reportPeriods.ts` (Pagos y Reservas intactos). Etiquetas de la gráfica formateadas en el cliente con el idioma.
  6. P3 — teléfono "NULL": `cleanPhone()` en ambas listas; sin número no hay enlace.
- Tests: 4 casos más en `absencesStopped` (fin de clase, sin alta, zona horaria 1-sep 00:30, tramos de 30 días con DST) y 1 en `absencesReportRoute` (roster). Suite 1096 / 55 preexistentes; tsc 0; ESLint limpio.

### Lote O — Informe de Pagos: dinero por cobrar (rama `claude/payments-report`)

- Estado: `RECHAZADO` en `b7899f8` (1 P1, 3 P2, 1 P3) → `APROBADO CON PENDIENTES` en `b346ca6` (3 P2, 1 P3) → **`APROBADO CON PENDIENTES`** en `10dec27`: reconciliación y contadores cerrados; queda 1 P2 compartido y previo: el layout del dashboard (`hasDashboardAccess`) no admite roles CUSTOM, así que un CUSTOM con permiso usa la API pero no la página. En producción hay 0 roles CUSTOM (lectura 2026-11-02): se propone como tarea aparte (acceso al dashboard para roles personalizados, con permisos por página). Sin migración.
- Pedido del usuario: informes operativos; Pagos debe decir quién debe dinero y quién entrena sin pagar. Propuesta aprobada.
- Criterios: por cobrar = plan de pago activo (no prueba) vencido antes de hoy (zona del colegio) sin cancelación programada, con los que siguen entrenando primero; entrenan sin pagar (30 días); cobros fallidos (Stripe PAST_DUE/UNPAID + FAILED 90 días); pendientes > 60 días solo para revisar (no se cambia nada); previsto mensual solo de suscripciones; monedas nunca sumadas; staff excluido; contacto, ficha y CSV; Revolut; 4 idiomas; móvil.
- A revisar: definición de "vencido" frente a renovaciones en efectivo con pago pendiente ya registrado; Stripe con `endDate` pasado (¿falso positivo por webhook?); importes con varias membresías del mismo alumno; rendimiento; coherencia con `/api/dashboard/stats`.
- No verificado: navegador y datos reales.
- Hallazgos de Codex en `b7899f8` y corrección:
  1. P1 — la API solo exigía acceso al dashboard: ahora también `school.analytics.view` (el permiso del menú) vía `memberHasPermission`; SUPERADMIN (sin fila de miembro) pasa; INSTRUCTOR → 403.
  2. P2 — staff en pendientes antiguos y cifras: filtro `notStaff` (`userId` nulo o fuera del staff) en fallidos, pendientes antiguos, cobrado y pendiente del mes y 12 meses; los pagos anónimos se mantienen.
  3. P2 — fecha vencida con pago ya hecho: se buscan pagos PAID de cuota del alumno (o de esa membresía) desde 7 días antes del vencimiento, o con `periodEnd` posterior; esas filas salen "Pagado el {fecha}: revisa las fechas del plan", al final de la lista y fuera del total y del contador.
  4. P2 — total de pendientes antiguos sin monedas secundarias: el pie muestra todas las monedas, la principal primero, sin sumarlas.
  5. P3 — redondeo acumulado: `sumByCurrency` suma primero y redondea una vez.
- Tests: +4 en `paymentsReportRoute` (permiso INSTRUCTOR/SUPERADMIN, exclusión de staff en consultas, fila "a revisar" fuera del total) y +1 en `paymentsCollect` (3 × 100 € trimestral = 100 €). Suite 1109 / 55 preexistentes; tsc 0; ESLint limpio.
- Hallazgos de Codex en `b346ca6` y corrección:
  6. P2 — un pago de otro plan ocultaba la deuda: un movimiento con `membershipId` solo cubre esa membresía; el fallback por alumno es solo para movimientos sin vínculo.
  7. P2 — pagos adelantados con periodo que cubre el vencimiento se descartaban: la consulta trae también `periodEnd > vencimiento` (OR con la ventana de 7 días).
  8. P2 — rol CUSTOM con permiso recibía 403: si `requireDashboardAccess` rechaza, se admite un miembro ACTIVE con rol CUSTOM y se evalúan sus permisos; STUDENT sigue en 403. Solo en esta ruta (el `DASHBOARD_ROLES` compartido no cambia).
  9. P3 — contador de la pestaña: cuenta deudas; las filas a revisar se muestran como "+N" aparte (listadas, paginadas y exportadas).
- Tests: +3 en `paymentsReportRoute` (otro plan no oculta la deuda; pago adelantado con periodo; CUSTOM con y sin permiso, STUDENT). Suite 1112 / 55; tsc 0; ESLint limpio.

### Lote P — Roles personalizados (CUSTOM) en el dashboard (rama `claude/custom-role-dashboard`, PR #51, apilada sobre PR #49)

- Estado: pendiente de Project Audit. Sin migración. Cierra el P2 compartido del Lote O (8.).
- Pedido: que un miembro con rol CUSTOM (`customRoleId` → `StaffRole.permissions`) use el dashboard según sus permisos — exactamente lo que activan sus toggles, nada más; STUDENT, inactivos y miembros de otra escuela fuera.
- Criterios: `hasDashboardAccess` / `requireDashboardAccess` admiten CUSTOM ACTIVE de la escuela actual; cada página y cada ruta `/api/dashboard/**` comprueba su permiso con un helper que resuelve CUSTOM (`staffCan`), no con `hasPermission(role)`; menú con los mismos permisos; se quita el parche de Pagos; tests de CUSTOM con/sin permiso (analytics, members, settings), STUDENT, inactivo, otra escuela y redirect del layout.
- Diseño: roles base conservan su comportamiento exacto en las APIs (listas históricas pasadas como `legacyBaseRoles`); CUSTOM siempre por permiso; STUDENT nunca. `requireDashboardAccess` sin permiso nombrado rechaza CUSTOM (falla cerrado).
- Cambios de comportamiento deliberados: STUDENT → 403 en `GET /api/dashboard/classes` y en el roster de reservas de una clase (antes 200 por la matriz); páginas y pestañas de Settings filtradas por permiso también para roles base (solo UI).
- A revisar: el mapa ruta → permiso (tabla en la PR); que ninguna ruta `/api/dashboard/**` quede con lista de roles sin `staffCan`; `STAFF_MEMBER_WHERE` en login/selector de perfil; upload abierto a todo staff; páginas con `RequirePermission` frente al menú; textos `t.access`.
- No verificado: navegador con un rol CUSTOM real.
- Tests: +25 en `customRoleDashboardAccess`; 6 archivos ajustados. Suite 1137 / 55 preexistentes (los mismos); tsc 0; ESLint sin avisos nuevos.

## Próxima entrega de Claude

Lotes A, B y C en `APROBADO CON PENDIENTES`. Ningún hallazgo bloqueante abierto. El siguiente lote lo prioriza el usuario entre: la rama real `hasFreeTrialCls: true`, la reserva autenticada real, o el ciclo de registro con correo real — los tres pendientes explícitos listados en Lote C.
